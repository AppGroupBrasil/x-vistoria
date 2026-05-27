import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, LogOut, Loader2, Printer, MapPin, Clock, CheckCircle, User, Star } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  foto_descricao: 'Foto e descrição',
  checklist: 'Checklist',
  pergunta_resposta: 'Pergunta e Resposta',
  conformidade: 'Conformidade',
  antes_depois: 'Antes e Depois',
  avaliacao: 'Avaliação',
}

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function duracao(ini?: string, fim?: string) {
  if (!ini || !fim) return '—'
  const ms = new Date(fim).getTime() - new Date(ini).getTime()
  const min = Math.floor(ms / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}
function mapsLink(lat?: number, lng?: number) {
  if (lat == null || lng == null) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export default function SimplesDetailV2Page() {
  const { id } = useParams<{ id: string }>()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [v, setV] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/vistoria-simples/${id}`)
      .then((r: any) => setV(r))
      .catch((e: any) => toast.error(e?.erro || 'Erro ao carregar'))
      .finally(() => setCarregando(false))
  }, [id])

  const sair = () => { logout(); navigate('/login') }
  const publicURL = `${window.location.origin}/v/simples/${id}`

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
  }
  if (!v) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria/historico')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div className="font-bold text-base">X <span className="text-brand-green">Vistoria</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-brand-green hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95">
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="py-8 print:py-0 flex justify-center">
        <article className="bg-white shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-10 print:p-8 text-gray-800 a4-page">
          <div className="border-b-4 border-brand-green pb-5 mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="" className="w-12 h-12 rounded-lg" />
                <div>
                  <div className="font-extrabold text-2xl text-brand-navy leading-none">X <span className="text-brand-green">Vistoria</span></div>
                  <div className="text-[10px] tracking-widest uppercase text-gray-500">Vistoria</div>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mt-3">{v.condominio_nome || TIPO_LABEL[v.tipo] || v.tipo}</h1>
              <div className="text-sm text-gray-500 mt-1">{TIPO_LABEL[v.tipo] || v.tipo}{v.endereco ? ` · ${v.endereco}` : ''}</div>
            </div>
            <div className="text-right">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wide">Protocolo</div>
                <div className="font-mono text-lg font-bold text-brand-navy">#{v.protocolo}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <Info icon={<User size={14} />} label="Vistoriador" value={v.vistoriador_nome} />
            <Info icon={<Clock size={14} />} label="Duração" value={duracao(v.iniciada_em, v.finalizada_em)} />
            <Info icon={<Clock size={14} />} label="Início" value={fmt(v.iniciada_em)} />
            <Info icon={<CheckCircle size={14} />} label="Fim" value={fmt(v.finalizada_em)} />
            {mapsLink(v.lat_inicio, v.lng_inicio) && (
              <Info icon={<MapPin size={14} />} label="Local início" value={
                <a href={mapsLink(v.lat_inicio, v.lng_inicio)!} target="_blank" rel="noreferrer" className="text-brand-green underline">
                  {v.lat_inicio?.toFixed(5)}, {v.lng_inicio?.toFixed(5)}
                </a>
              } />
            )}
            {mapsLink(v.lat_fim, v.lng_fim) && (
              <Info icon={<MapPin size={14} />} label="Local fim" value={
                <a href={mapsLink(v.lat_fim, v.lng_fim)!} target="_blank" rel="noreferrer" className="text-brand-green underline">
                  {v.lat_fim?.toFixed(5)}, {v.lng_fim?.toFixed(5)}
                </a>
              } />
            )}
          </div>

          <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-navy mb-3 border-b border-gray-200 pb-1">Itens</h2>
          <div className="space-y-3">
            {(v.itens || []).map((it: any, idx: number) => (
              <ItemView key={it.id ?? idx} idx={idx} tipo={v.tipo} item={it} />
            ))}
          </div>

          <footer className="mt-10 pt-5 border-t-2 border-gray-200 flex items-end justify-between">
            <div className="text-[10px] text-gray-500">
              <div>Gerado em {fmt(new Date().toISOString())}</div>
              <div className="mt-0.5">X Vistoria · Sistema de vistoria condominial</div>
              <div className="mt-2 text-gray-700 text-xs">Escaneie o QR ao lado para abrir esta vistoria.</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-2 border border-gray-200 rounded-lg">
                <QRCodeSVG value={publicURL} size={96} level="M" />
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">{publicURL.replace(/^https?:\/\//, '')}</div>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}

function Info({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5">{icon}</span>
      <div className="text-xs">
        <div className="text-gray-500 font-bold uppercase tracking-wide text-[9px]">{label}</div>
        <div className="text-gray-800">{value}</div>
      </div>
    </div>
  )
}

function Foto({ f }: { f: { url: string } | null }) {
  if (!f) return null
  return <img src={f.url} alt="" className="w-24 h-24 object-cover rounded border border-gray-200" />
}

function Ocorrencia({ it }: { it: any }) {
  if (!it.ocFoto && !it.ocDescricao) return null
  return (
    <div className="mt-2 p-2 rounded border-l-4 border-orange-400 bg-orange-50">
      <div className="text-[10px] font-bold uppercase text-orange-700 mb-1">Ocorrência</div>
      {it.ocFoto && <Foto f={it.ocFoto} />}
      {it.ocDescricao && <div className="text-xs text-gray-700 mt-1">{it.ocDescricao}</div>}
    </div>
  )
}

function ItemView({ idx, tipo, item }: { idx: number; tipo: string; item: any }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 break-inside-avoid">
      <div className="text-[10px] font-bold text-gray-400 mb-1">#{idx + 1}</div>

      {tipo === 'foto_descricao' && (
        <div className="space-y-2">
          {item.foto && <Foto f={item.foto} />}
          {item.descricao && <div className="text-sm">{item.descricao}</div>}
        </div>
      )}

      {tipo === 'checklist' && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">{item.nome}</div>
          {(item.problemaFoto || item.problemaDesc) && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded">
              <div className="text-[10px] font-bold uppercase text-orange-700 mb-1">Problema</div>
              {item.problemaFoto && <Foto f={item.problemaFoto} />}
              {item.problemaDesc && <div className="text-xs text-gray-700 mt-1">{item.problemaDesc}</div>}
            </div>
          )}
        </div>
      )}

      {tipo === 'pergunta_resposta' && (
        <div className="space-y-1">
          <div className="text-sm font-semibold">{item.pergunta}</div>
          <div className="text-sm text-gray-700">{item.resposta}</div>
          {item.foto && <Foto f={item.foto} />}
        </div>
      )}

      {tipo === 'conformidade' && (
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{item.item}</div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.conforme === 'sim' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {item.conforme === 'sim' ? '✓ Conforme' : '✗ Não conforme'}
          </span>
        </div>
      )}

      {tipo === 'antes_depois' && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-bold text-gray-500 mb-1">Antes</div>
              <Foto f={item.antes} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 mb-1">Depois</div>
              <Foto f={item.depois} />
            </div>
          </div>
          {item.descricao && <div className="text-sm mt-2">{item.descricao}</div>}
        </div>
      )}

      {tipo === 'avaliacao' && (
        <div className="space-y-1">
          <div className="text-sm font-semibold">{item.item}</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={18} className={item.nota >= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
            ))}
          </div>
        </div>
      )}

      <Ocorrencia it={item} />
    </div>
  )
}
