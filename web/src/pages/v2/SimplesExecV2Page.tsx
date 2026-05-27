import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import toast from 'react-hot-toast'
import {
  ArrowLeft, LogOut, Plus, X, Camera, Send, Loader2,
  AlertTriangle, Star, Library,
} from 'lucide-react'
import MicDictar from '../../components/MicDictar'
import clsx from 'clsx'
import { TIPOS } from './SimplesV2Page'
import GeoGate from '../../components/GeoGate'
import { api } from '../../api/client'
import { obterLocalizacao } from '../../lib/geo'
import { compactarImagem } from '../../lib/compactarImagem'

const TIPO_API: Record<string, string> = {
  'foto-descricao': 'foto_descricao',
  'checklist': 'checklist',
  'pergunta-resposta': 'pergunta_resposta',
  'conformidade': 'conformidade',
  'antes-depois': 'antes_depois',
  'avaliacao': 'avaliacao',
}

type Foto = { id: string; url: string; nome: string }

interface ItemBase {
  id: string
  // Fotos adicionais (opcional)
  fotosExtras?: Foto[]
  // Ocorrência (sempre opcional)
  ocFoto?: Foto | null
  ocDescricao?: string
}

interface FotoDescItem extends ItemBase { foto: Foto | null; descricao: string }
interface ChecklistItem extends ItemBase { nome: string; problemaAberto: boolean; problemaFoto: Foto | null; problemaDesc: string }
interface PerguntaRespItem extends ItemBase { pergunta: string; resposta: string; foto: Foto | null }
interface ConformidadeItem extends ItemBase { item: string; conforme: 'sim' | 'nao' | null }
interface AntesDepoisItem extends ItemBase { antes: Foto | null; depois: Foto | null; descricao: string }
interface AvaliacaoItem extends ItemBase { item: string; nota: number }

const uid = () => Math.random().toString(36).slice(2, 10)

async function uploadFoto(file: File): Promise<Foto> {
  const compactado = await compactarImagem(file)
  const fd = new FormData()
  fd.append('file', compactado, compactado.name)
  const res: any = await api.post('/upload/avulso', fd)
  return { id: uid(), url: res.url, nome: compactado.name }
}

function lerGeoSessao(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem('xv-geo-inicio')
    if (!raw) return null
    const d = JSON.parse(raw)
    if (typeof d?.lat !== 'number' || typeof d?.lng !== 'number') return null
    if (Date.now() - (d.ts || 0) > 10 * 60 * 1000) return null
    return { lat: d.lat, lng: d.lng }
  } catch { return null }
}

export default function SimplesExecV2Page() {
  const { tipo } = useParams<{ tipo: string }>()
  const navigate = useNavigate()
  const def = TIPOS.find((t) => t.key === tipo)

  if (!def) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Tipo desconhecido. <button onClick={() => navigate('/x-vistoria/simples')} className="ml-2 text-brand-green underline">Voltar</button>
      </div>
    )
  }

  const geoCache = lerGeoSessao()
  if (geoCache) return <ExecConteudo tipo={tipo!} def={def} geoInicio={geoCache} />

  return (
    <GeoGate voltarPara="/x-vistoria/simples">
      {(geo) => <ExecConteudo tipo={tipo!} def={def} geoInicio={geo} />}
    </GeoGate>
  )
}

function ExecConteudo({ tipo, def, geoInicio }: { tipo: string; def: any; geoInicio: { lat: number; lng: number } }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [itens, setItens] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [iniciadaEm] = useState(() => new Date().toISOString())
  const [condominioNome, setCondominioNome] = useState(() => {
    try { return localStorage.getItem(`xv-cond-${tipo}`) || '' } catch { return '' }
  })
  const [endereco, setEndereco] = useState(() => {
    try { return localStorage.getItem(`xv-end-${tipo}`) || '' } catch { return '' }
  })
  const sair = () => { logout(); navigate('/login') }

  // Restaura rascunho desta vistoria + aplica imports da biblioteca (append)
  useEffect(() => {
    const rascunhoKey = `xv-rascunho-${tipo}`
    const importKey = `xv-import-${tipo}`
    let base: any[] = []
    try {
      const raw = localStorage.getItem(rascunhoKey)
      if (raw) base = JSON.parse(raw) ?? []
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(importKey)
      if (raw) {
        const importados = JSON.parse(raw)
        if (Array.isArray(importados) && importados.length > 0) {
          base = [...base, ...importados]
          localStorage.removeItem(importKey)
          toast.success(`${importados.length} item(ns) importados da biblioteca`)
        }
      }
    } catch { /* ignore */ }
    if (base.length > 0) setItens(base)
  }, [tipo])

  // Auto-save do rascunho a cada mudança
  useEffect(() => {
    try { localStorage.setItem(`xv-rascunho-${tipo}`, JSON.stringify(itens)) }
    catch { /* ignore */ }
  }, [tipo, itens])

  useEffect(() => { try { localStorage.setItem(`xv-cond-${tipo}`, condominioNome) } catch {} }, [tipo, condominioNome])
  useEffect(() => { try { localStorage.setItem(`xv-end-${tipo}`, endereco) } catch {} }, [tipo, endereco])

  const abrirBiblioteca = () => navigate(`/x-vistoria/biblioteca?from=${tipo}`)

  const adicionar = () => {
    const base = { id: uid() }
    let novo: any
    switch (tipo) {
      case 'foto-descricao':   novo = { ...base, foto: null, descricao: '' } as FotoDescItem; break
      case 'checklist':        novo = { ...base, nome: '', problemaAberto: false, problemaFoto: null, problemaDesc: '' } as ChecklistItem; break
      case 'pergunta-resposta':novo = { ...base, pergunta: '', resposta: '', foto: null } as PerguntaRespItem; break
      case 'conformidade':     novo = { ...base, item: '', conforme: null } as ConformidadeItem; break
      case 'antes-depois':     novo = { ...base, antes: null, depois: null, descricao: '' } as AntesDepoisItem; break
      case 'avaliacao':        novo = { ...base, item: '', nota: 0 } as AvaliacaoItem; break
      case 'personalizada':    novo = { ...base, pergunta: '', itens: {}, foto: null, descricao: '', status: '', conservacao: '', limpeza: '', localExato: '', prazo: '', validade: '', problema: '', resposta: '', notificacao: false, assinatura: '' } as any; break
      default: return
    }
    setItens((prev) => [...prev, novo])
  }

  const atualizar = (id: string, patch: any) =>
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const remover = (id: string) => setItens((prev) => prev.filter((it) => it.id !== id))

  const enviar = async () => {
    if (itens.length === 0) return toast.error('Adicione pelo menos um item')
    setSalvando(true)
    try {
      const geoFim = await obterLocalizacao()
      if (!geoFim) {
        toast.error('Localização obrigatória para enviar. Autorize e tente de novo.')
        return
      }
      const payload = {
        tipo: TIPO_API[tipo] || tipo,
        itens,
        iniciada_em: iniciadaEm,
        finalizada_em: new Date().toISOString(),
        lat_inicio: geoInicio.lat, lng_inicio: geoInicio.lng,
        lat_fim: geoFim.lat, lng_fim: geoFim.lng,
        condominio_nome: condominioNome.trim() || undefined,
        endereco: endereco.trim() || undefined,
      }
      const res: any = await api.post('/vistoria-simples', payload)
      localStorage.removeItem(`xv-rascunho-${tipo}`)
      localStorage.removeItem(`xv-cond-${tipo}`)
      localStorage.removeItem(`xv-end-${tipo}`)
      try { sessionStorage.removeItem('xv-geo-inicio') } catch {}
      toast.success(`Vistoria enviada! Protocolo #${res.protocolo}`)
      navigate('/x-vistoria/historico')
    } catch (err: any) {
      toast.error(err?.erro || 'Erro ao enviar vistoria')
    } finally { setSalvando(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria/simples')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="font-bold text-base leading-tight">{def.titulo}</div>
            <div className="text-white/60 text-[11px]">Olá, {user?.nome?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-2xl space-y-3">
          <div className="card p-3 space-y-2">
            <input
              type="text"
              placeholder="Condomínio (opcional)"
              value={condominioNome}
              onChange={(e) => setCondominioNome(e.target.value)}
              className="input text-sm"
            />
            <input
              type="text"
              placeholder="Endereço (opcional)"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="input text-sm"
            />
          </div>

          {itens.length === 0 && (
            <div className="card p-8 text-center text-sm text-gray-500">
              Nenhum item ainda. Toque em <strong>+ Adicionar</strong> abaixo.
            </div>
          )}

          {itens.map((it, idx) => (
            <ItemCard
              key={it.id}
              tipo={tipo!}
              item={it}
              idx={idx}
              onPatch={(patch) => atualizar(it.id, patch)}
              onRemove={() => remover(it.id)}
            />
          ))}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={adicionar}
              className="py-4 rounded-2xl border-2 border-dashed border-brand-green text-brand-green text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-95"
            >
              <Plus size={18} /> Adicionar
            </button>
            <button
              type="button"
              onClick={abrirBiblioteca}
              className="py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95"
            >
              <Library size={18} /> Da biblioteca
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-xs text-gray-500">{itens.length} item(ns)</div>
          <button
            onClick={enviar}
            disabled={salvando || itens.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-brand-green text-white active:scale-95 disabled:opacity-50"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Salvar e enviar
          </button>
        </div>
      </div>
    </div>
  )
}

function FotoInput({ value, onChange, label = 'Foto' }: { value: Foto | null; onChange: (f: Foto | null) => void; label?: string }) {
  const [enviando, setEnviando] = useState(false)
  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img src={value.url} alt="" className="w-24 h-24 object-cover rounded-lg" />
          <button onClick={() => onChange(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className={clsx(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500 text-xs font-medium hover:bg-gray-100',
          enviando ? 'opacity-60 cursor-wait' : 'cursor-pointer',
        )}>
          {enviando ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {enviando ? 'Enviando…' : label}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={enviando}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setEnviando(true)
              try { onChange(await uploadFoto(f)) }
              catch (err: any) { toast.error(err?.erro || 'Falha no upload da foto') }
              finally { setEnviando(false) }
            }}
          />
        </label>
      )}
    </div>
  )
}

function MultiFotoAdd({ value, onChange }: { value: Foto[]; onChange: (fs: Foto[]) => void }) {
  const [enviando, setEnviando] = useState(false)
  return (
    <div className="flex flex-wrap items-start gap-2">
      {value.map((f) => (
        <div key={f.id} className="relative inline-block">
          <img src={f.url} alt="" className="w-24 h-24 object-cover rounded-lg" />
          <button
            onClick={() => onChange(value.filter((x) => x.id !== f.id))}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
            aria-label="Remover foto"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <label className={clsx(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500 text-xs font-medium hover:bg-gray-100',
        enviando ? 'opacity-60 cursor-wait' : 'cursor-pointer',
      )}>
        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {enviando ? 'Enviando…' : 'Mais imagens'}
        <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={enviando}
          onChange={async (e) => {
            const files = Array.from(e.target.files || [])
            e.target.value = ''
            if (files.length === 0) return
            setEnviando(true)
            try {
              const novos: Foto[] = []
              for (const f of files) novos.push(await uploadFoto(f))
              onChange([...value, ...novos])
            } catch (err: any) { toast.error(err?.erro || 'Falha no upload') }
            finally { setEnviando(false) }
          }}
        />
      </label>
    </div>
  )
}

function OcorrenciaToggle({ item, onPatch }: { item: ItemBase; onPatch: (p: Partial<ItemBase>) => void }) {
  const [aberto, setAberto] = useState(false)
  const temOcorrencia = !!item.ocFoto || !!(item.ocDescricao && item.ocDescricao.trim())
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95',
          temOcorrencia
            ? 'bg-red-700 text-white shadow-red-500/40 ring-2 ring-red-300'
            : 'bg-red-600 text-white shadow-red-500/30 hover:bg-red-700',
        )}
      >
        <AlertTriangle size={14} /> {temOcorrencia ? 'Ocorrência registrada' : 'Reportar ocorrência'}
      </button>
      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                <h3 className="text-base font-bold text-gray-800">Ocorrência</h3>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <FotoInput value={item.ocFoto ?? null} onChange={(f) => onPatch({ ocFoto: f })} label="Foto da ocorrência" />
            <div className="flex items-start gap-2">
              <textarea
                placeholder="Descrição da ocorrência"
                value={item.ocDescricao || ''}
                onChange={(e) => onPatch({ ocDescricao: e.target.value })}
                className="input text-sm resize-none flex-1" rows={4}
              />
              <MicDictar onTexto={(t) => onPatch({ ocDescricao: ((item.ocDescricao || '') ? item.ocDescricao + ' ' : '') + t })} contexto={{ categoria: 'ocorrencia' }} />
            </div>
            <div className="flex gap-2 justify-end">
              {temOcorrencia && (
                <button
                  type="button"
                  onClick={() => { onPatch({ ocFoto: null, ocDescricao: '' }); setAberto(false) }}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-bold active:scale-95"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const ITENS_PERSONALIZADA = [
  'Foto', 'Descrição', 'Campo de resposta', 'Local exato', 'Problema',
  'Conservação', 'Limpeza', 'Status', 'Prazo para resolver', 'Validade',
  'Notificação', 'Ocorrência', 'Assinatura',
] as const

function PersonalizadaItem({ item, onPatch }: { item: any; onPatch: (p: any) => void }) {
  const has = (it: string) => !!item.itens?.[it]
  const toggle = (it: string) => onPatch({ itens: { ...(item.itens || {}), [it]: !has(it) } })
  const Pill = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: any }) => (
    <button type="button" onClick={onClick} className={clsx('px-3 py-2 rounded-lg text-xs font-bold border-2 active:scale-95', ativo ? 'bg-brand-green border-brand-green text-white' : 'bg-white border-gray-200 text-gray-700')}>{children}</button>
  )
  return (
    <>
      <div className="flex items-center gap-2">
        <input type="text" placeholder="Pergunta" value={item.pergunta || ''}
          onChange={(e) => onPatch({ pergunta: e.target.value })} className="input text-sm flex-1" />
        <MicDictar onTexto={(t) => onPatch({ pergunta: (item.pergunta ? item.pergunta + ' ' : '') + t })} contexto={{ categoria: 'personalizada-pergunta' }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {ITENS_PERSONALIZADA.map((it) => (
          <label key={it} className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs', has(it) ? 'border-brand-green bg-emerald-50' : 'border-gray-200 bg-white')}>
            <input type="checkbox" checked={has(it)} onChange={() => toggle(it)} className="h-4 w-4 rounded border-gray-300 text-brand-green" />
            <span className="font-medium text-gray-800">{it}</span>
          </label>
        ))}
      </div>

      {has('Foto') && <FotoInput value={item.foto} onChange={(f) => onPatch({ foto: f })} />}

      {has('Descrição') && (
        <div className="flex items-start gap-2">
          <textarea placeholder="Descrição" rows={2} value={item.descricao || ''} onChange={(e) => onPatch({ descricao: e.target.value })} className="input text-sm resize-none flex-1" />
          <MicDictar onTexto={(t) => onPatch({ descricao: (item.descricao ? item.descricao + ' ' : '') + t })} contexto={{ pergunta: item.pergunta, categoria: 'personalizada-descricao' }} />
        </div>
      )}

      {has('Campo de resposta') && (
        <div className="flex items-start gap-2">
          <textarea placeholder="Resposta" rows={2} value={item.resposta || ''} onChange={(e) => onPatch({ resposta: e.target.value })} className="input text-sm resize-none flex-1" />
          <MicDictar onTexto={(t) => onPatch({ resposta: (item.resposta ? item.resposta + ' ' : '') + t })} contexto={{ pergunta: item.pergunta, categoria: 'personalizada-resposta' }} />
        </div>
      )}

      {has('Local exato') && (
        <input type="text" placeholder="Local exato" value={item.localExato || ''} onChange={(e) => onPatch({ localExato: e.target.value })} className="input text-sm" />
      )}

      {has('Problema') && (
        <div className="flex items-start gap-2">
          <textarea placeholder="Descreva o problema" rows={2} value={item.problema || ''} onChange={(e) => onPatch({ problema: e.target.value })} className="input text-sm resize-none flex-1" />
          <MicDictar onTexto={(t) => onPatch({ problema: (item.problema ? item.problema + ' ' : '') + t })} contexto={{ pergunta: item.pergunta, categoria: 'personalizada-problema' }} />
        </div>
      )}

      {has('Conservação') && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">Conservação</div>
          <div className="flex flex-wrap gap-1.5">
            {['Ruim','Regular','Bom','Ótimo'].map((v) => <Pill key={v} ativo={item.conservacao === v} onClick={() => onPatch({ conservacao: item.conservacao === v ? '' : v })}>{v}</Pill>)}
          </div>
        </div>
      )}

      {has('Limpeza') && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">Limpeza</div>
          <div className="flex flex-wrap gap-1.5">
            {['Ruim','Regular','Boa','Ótima'].map((v) => <Pill key={v} ativo={item.limpeza === v} onClick={() => onPatch({ limpeza: item.limpeza === v ? '' : v })}>{v}</Pill>)}
          </div>
        </div>
      )}

      {has('Status') && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {['Aberto','Em execução','Finalizado'].map((v) => <Pill key={v} ativo={item.status === v} onClick={() => onPatch({ status: item.status === v ? '' : v })}>{v}</Pill>)}
          </div>
        </div>
      )}

      {has('Prazo para resolver') && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">Prazo para resolver</div>
          <input type="date" value={item.prazo || ''} onChange={(e) => onPatch({ prazo: e.target.value })} className="input text-sm" />
        </div>
      )}

      {has('Validade') && (
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">Validade</div>
          <input type="date" value={item.validade || ''} onChange={(e) => onPatch({ validade: e.target.value })} className="input text-sm" />
        </div>
      )}

      {has('Notificação') && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!item.notificacao} onChange={(e) => onPatch({ notificacao: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-green" />
          Enviar notificação ao morador depois
        </label>
      )}

      {has('Assinatura') && (
        <input type="text" placeholder="Nome de quem assina" value={item.assinatura || ''} onChange={(e) => onPatch({ assinatura: e.target.value })} className="input text-sm" />
      )}

      {has('Ocorrência') && (
        <div className="flex flex-wrap items-start gap-2">
          <OcorrenciaToggle item={item} onPatch={onPatch} />
        </div>
      )}
    </>
  )
}

function ItemCard({ tipo, item, idx, onPatch, onRemove }: {
  tipo: string; item: any; idx: number; onPatch: (p: any) => void; onRemove: () => void
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-gray-400">#{idx + 1}</div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1" aria-label="Remover"><X size={16} /></button>
      </div>

      {/* Conteúdo principal por tipo */}
      {tipo === 'foto-descricao' && (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <FotoInput value={item.foto} onChange={(f) => onPatch({ foto: f })} />
            <OcorrenciaToggle item={item} onPatch={onPatch} />
          </div>
          <MultiFotoAdd value={item.fotosExtras || []} onChange={(fs) => onPatch({ fotosExtras: fs })} />
          <div className="flex items-start gap-2">
            <textarea placeholder="Descrição" rows={2}
              value={item.descricao} onChange={(e) => onPatch({ descricao: e.target.value })}
              className="input text-sm resize-none flex-1" />
            <MicDictar onTexto={(t) => onPatch({ descricao: (item.descricao ? item.descricao + ' ' : '') + t })} contexto={{ categoria: 'foto-descricao' }} />
          </div>
        </>
      )}

      {tipo === 'checklist' && (
        <>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Item do checklist"
              value={item.nome} onChange={(e) => onPatch({ nome: e.target.value })}
              className="input text-sm flex-1" />
            <button
              type="button"
              onClick={() => onPatch({ problemaAberto: !item.problemaAberto })}
              className={clsx('p-2 rounded-lg',
                item.problemaAberto || item.problemaFoto || item.problemaDesc
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-400 hover:text-orange-500')}
              aria-label="Marcar problema"
            >
              <AlertTriangle size={18} />
            </button>
          </div>
          {item.problemaAberto && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 space-y-2">
              <div className="text-[11px] font-bold text-orange-700">Problema identificado</div>
              <FotoInput value={item.problemaFoto} onChange={(f) => onPatch({ problemaFoto: f })} />
              <div className="flex items-start gap-2">
                <textarea placeholder="Descrever problema" rows={2}
                  value={item.problemaDesc} onChange={(e) => onPatch({ problemaDesc: e.target.value })}
                  className="input text-sm resize-none flex-1" />
                <MicDictar onTexto={(t) => onPatch({ problemaDesc: (item.problemaDesc ? item.problemaDesc + ' ' : '') + t })} contexto={{ categoria: 'checklist-problema', pergunta: item.nome }} />
              </div>
            </div>
          )}
        </>
      )}

      {tipo === 'pergunta-resposta' && (
        <>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Pergunta"
              value={item.pergunta} onChange={(e) => onPatch({ pergunta: e.target.value })}
              className="input text-sm flex-1" />
            <MicDictar onTexto={(t) => onPatch({ pergunta: (item.pergunta ? item.pergunta + ' ' : '') + t })} contexto={{ categoria: 'pergunta-resposta-pergunta' }} />
          </div>
          <div className="flex items-start gap-2">
            <textarea placeholder="Resposta" rows={2}
              value={item.resposta} onChange={(e) => onPatch({ resposta: e.target.value })}
              className="input text-sm resize-none flex-1" />
            <MicDictar onTexto={(t) => onPatch({ resposta: (item.resposta ? item.resposta + ' ' : '') + t })} contexto={{ categoria: 'pergunta-resposta-resposta', pergunta: item.pergunta }} />
          </div>
          <FotoInput value={item.foto} onChange={(f) => onPatch({ foto: f })} label="Foto (opcional)" />
        </>
      )}

      {tipo === 'conformidade' && (
        <>
          <input type="text" placeholder="Item a verificar"
            value={item.item} onChange={(e) => onPatch({ item: e.target.value })}
            className="input text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPatch({ conforme: 'sim' })}
              className={clsx('py-3 rounded-xl text-sm font-bold',
                item.conforme === 'sim' ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-600')}
            >
              ✓ Conforme
            </button>
            <button
              type="button"
              onClick={() => onPatch({ conforme: 'nao' })}
              className={clsx('py-3 rounded-xl text-sm font-bold',
                item.conforme === 'nao' ? 'bg-red-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-600')}
            >
              ✗ Não conforme
            </button>
          </div>
        </>
      )}

      {tipo === 'antes-depois' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] font-bold text-gray-500 mb-1">Antes</div>
              <FotoInput value={item.antes} onChange={(f) => onPatch({ antes: f })} label="Antes" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-500 mb-1">Depois</div>
              <FotoInput value={item.depois} onChange={(f) => onPatch({ depois: f })} label="Depois" />
            </div>
          </div>
          <textarea placeholder="Descrição" rows={2}
            value={item.descricao} onChange={(e) => onPatch({ descricao: e.target.value })}
            className="input text-sm resize-none" />
        </>
      )}

      {tipo === 'avaliacao' && (
        <>
          <input type="text" placeholder="Item avaliado"
            value={item.item} onChange={(e) => onPatch({ item: e.target.value })}
            className="input text-sm" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => onPatch({ nota: item.nota === n ? 0 : n })} className="p-1">
                <Star size={28} className={item.nota >= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
              </button>
            ))}
          </div>
        </>
      )}

      {tipo === 'personalizada' && (
        <PersonalizadaItem item={item} onPatch={onPatch} />
      )}

      {tipo !== 'foto-descricao' && tipo !== 'personalizada' && (
        <div className="flex flex-wrap items-start gap-2">
          <OcorrenciaToggle item={item} onPatch={onPatch} />
        </div>
      )}
    </div>
  )
}
