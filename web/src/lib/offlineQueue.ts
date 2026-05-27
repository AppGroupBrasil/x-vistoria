import { openDB, type IDBPDatabase } from 'idb'
import { api } from '../api/client'

const DB_NAME = 'xv-offline'
const DB_VERSION = 1
const STORE_FOTOS = 'fotos_pendentes'
const STORE_VISTORIAS = 'vistorias_pendentes'

type FotoPendente = {
  id: string            // uid temporário (mesmo usado como blob:url tag)
  blobUrl: string       // URL local pra preview
  blob: Blob
  nome: string
  criadoEm: number
}

type VistoriaPendente = {
  id: string
  payload: any
  fotosLocais: string[] // ids de fotos pendentes; resolvidas antes do envio
  endpoint: string      // ex: /vistoria-simples
  criadoEm: number
}

let _db: Promise<IDBPDatabase> | null = null
function db() {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE_FOTOS)) d.createObjectStore(STORE_FOTOS, { keyPath: 'id' })
        if (!d.objectStoreNames.contains(STORE_VISTORIAS)) d.createObjectStore(STORE_VISTORIAS, { keyPath: 'id' })
      },
    })
  }
  return _db
}

const uid = () => Math.random().toString(36).slice(2, 12)

// ---- Fotos ----
export async function adicionarFotoOffline(blob: Blob, nome: string): Promise<{ id: string; url: string }> {
  const id = uid()
  const blobUrl = URL.createObjectURL(blob)
  const reg: FotoPendente = { id, blobUrl, blob, nome, criadoEm: Date.now() }
  const d = await db()
  await d.put(STORE_FOTOS, reg)
  // url retornada é uma blob: URL — funciona em <img src>. id começa com "off_" pra marcar como pendente.
  return { id: `off_${id}`, url: blobUrl }
}

export async function obterFotoBlob(id: string): Promise<Blob | null> {
  const d = await db()
  const r: FotoPendente | undefined = await d.get(STORE_FOTOS, id)
  return r?.blob || null
}

export async function listarFotosPendentes(): Promise<FotoPendente[]> {
  const d = await db()
  return d.getAll(STORE_FOTOS)
}

async function enviarFoto(reg: FotoPendente): Promise<string> {
  const fd = new FormData()
  fd.append('file', reg.blob, reg.nome)
  const res: any = await api.post('/upload/avulso', fd)
  return res.url
}

// ---- Vistorias ----
export async function enfileirarVistoria(endpoint: string, payload: any, fotosLocais: string[] = []): Promise<string> {
  const id = uid()
  const reg: VistoriaPendente = { id, endpoint, payload, fotosLocais, criadoEm: Date.now() }
  const d = await db()
  await d.put(STORE_VISTORIAS, reg)
  return id
}

export async function listarVistoriasPendentes(): Promise<VistoriaPendente[]> {
  const d = await db()
  return d.getAll(STORE_VISTORIAS)
}

// Substitui no payload todo objeto Foto cujo id começa com "off_" pela URL real após upload
function substituirReferencias(payload: any, mapa: Record<string, string>): any {
  if (Array.isArray(payload)) return payload.map((x) => substituirReferencias(x, mapa))
  if (payload && typeof payload === 'object') {
    if (typeof payload.id === 'string' && payload.id.startsWith('off_') && typeof payload.url === 'string') {
      const realId = payload.id.slice(4)
      if (mapa[realId]) return { ...payload, url: mapa[realId] }
    }
    const out: any = {}
    for (const k of Object.keys(payload)) out[k] = substituirReferencias(payload[k], mapa)
    return out
  }
  return payload
}

let _sincronizando = false

export type StatusSync = {
  fotosPendentes: number
  vistoriasPendentes: number
  sincronizando: boolean
  ultimaTentativa: number | null
  ultimoErro: string | null
}

let _ultimaTentativa: number | null = null
let _ultimoErro: string | null = null
const listeners = new Set<(s: StatusSync) => void>()

export function aoMudarStatus(cb: (s: StatusSync) => void) {
  listeners.add(cb)
  obterStatus().then(cb)
  return () => listeners.delete(cb)
}

export async function obterStatus(): Promise<StatusSync> {
  const [fotos, vistorias] = await Promise.all([listarFotosPendentes(), listarVistoriasPendentes()])
  return {
    fotosPendentes: fotos.length,
    vistoriasPendentes: vistorias.length,
    sincronizando: _sincronizando,
    ultimaTentativa: _ultimaTentativa,
    ultimoErro: _ultimoErro,
  }
}

async function notificar() {
  const s = await obterStatus()
  listeners.forEach((cb) => cb(s))
}

export async function sincronizar(): Promise<{ ok: number; falhas: number }> {
  if (_sincronizando) return { ok: 0, falhas: 0 }
  if (!navigator.onLine) return { ok: 0, falhas: 0 }
  _sincronizando = true
  _ultimoErro = null
  _ultimaTentativa = Date.now()
  notificar()
  let ok = 0, falhas = 0
  try {
    const fotos = await listarFotosPendentes()
    const mapa: Record<string, string> = {}
    for (const f of fotos) {
      try {
        const url = await enviarFoto(f)
        mapa[f.id] = url
        const d = await db()
        await d.delete(STORE_FOTOS, f.id)
        URL.revokeObjectURL(f.blobUrl)
        ok++
      } catch (e: any) {
        falhas++
        _ultimoErro = e?.erro || e?.message || 'Falha ao enviar foto'
      }
    }

    const vistorias = await listarVistoriasPendentes()
    for (const v of vistorias) {
      const semFotosPendentes = v.fotosLocais.every((id) => mapa[id])
      if (!semFotosPendentes && v.fotosLocais.length > 0) continue
      try {
        const payloadFinal = substituirReferencias(v.payload, mapa)
        await api.post(v.endpoint, payloadFinal)
        const d = await db()
        await d.delete(STORE_VISTORIAS, v.id)
        ok++
      } catch (e: any) {
        falhas++
        _ultimoErro = e?.erro || e?.message || 'Falha ao enviar vistoria'
      }
    }
  } finally {
    _sincronizando = false
    notificar()
  }
  return { ok, falhas }
}

// Auto-sync ao voltar online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { sincronizar().catch(() => {}) })
  // tenta a cada 30s caso esteja online
  setInterval(() => { if (navigator.onLine) sincronizar().catch(() => {}) }, 30000)
}
