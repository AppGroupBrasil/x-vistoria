import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, LogOut, Loader2, Printer, MapPin, Clock, CheckCircle, User, FileText, Building2 } from 'lucide-react'

interface Detalhe {
  id: string
  protocolo: string
  status: string
  condominio_nome: string
  condominio_endereco?: string
  vistoriador_nome: string
  template_nome?: string
  observacoes?: string
  criado_em: string
  iniciada_em?: string
  finalizada_em?: string
  lat_inicio?: number; lng_inicio?: number
  lat_fim?: number; lng_fim?: number
  perguntas: {
    id: string; texto: string; ordem: number
    resposta: any | null
    fotos: { id: string; url: string }[]
  }[]
  pendencias: { id: string; titulo: string; descricao?: string; prioridade: string; status: string }[]
  fotos_gerais: { id: string; url: string }[]
}

const RESULTADO_LABEL: Record<string, string> = { ok: 'Conforme', nao_ok: 'Não conforme', na: 'N/A' }
const RESULTADO_COR: Record<string, string> = {
  ok: 'bg-green-100 text-green-700 border-green-200',
  nao_ok: 'bg-red-100 text-red-700 border-red-200',
  na: 'bg-gray-100 text-gray-600 border-gray-200',
}
const STATUS_LIMPEZA: Record<string, string> = { ruim: 'Ruim', regular: 'Regular', boa: 'Boa', otima: 'Ótima' }
const STATUS_CONSERV: Record<string, string> = { ruim: 'Ruim', regular: 'Regular', bom: 'Bom', otimo: 'Ótimo' }
const STATUS_RESP: Record<string, string> = { aberto: 'Aberto', em_execucao: 'Em execução', finalizado: 'Finalizado' }

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtData(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
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

export default function HistoricoDetailV2Page() {
  const { id } = useParams<{ id: string }>()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [v, setV] = useState<Detalhe | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/historico/${id}`)
      .then((r: any) => setV(r as Detalhe))
      .catch((e: any) => toast.error(e?.erro || 'Erro ao carregar'))
      .finally(() => setCarregando(false))
  }, [id])

  const sair = () => { logout(); navigate('/login') }
  const publicURL = `${window.location.origin}/v/${id}`

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
  }
  if (!v) return null

  const totalOk = v.perguntas.filter((p) => p.resposta?.resultado === 'ok').length
  const totalNok = v.perguntas.filter((p) => p.resposta?.resultado === 'nao_ok').length
  const totalNa = v.perguntas.filter((p) => p.resposta?.resultado === 'na').length

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header (oculto na impressão) */}
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria/historico')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div className="font-bold text-base">X <span className="text-brand-green">Vistoria</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Página A4 estilizada */}
      <div className="py-8 print:py-0 flex justify-center">
        <article className="bg-white shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-10 print:p-8 text-gray-800 a4-page">
          {/* Cabeçalho premium */}
          <div className="border-b-4 border-brand-green pb-5 mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="" className="w-12 h-12 rounded-lg" />
                <div>
                  <div className="font-extrabold text-2xl text-brand-navy leading-none">X <span className="text-brand-green">Vistoria</span></div>
                  <div className="text-[10px] tracking-widest uppercase text-gray-500">Relatório oficial</div>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mt-3">{v.condominio_nome}</h1>
              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={12} /> {v.condominio_endereco || 'Endereço não informado'}
              </div>
            </div>
            <div className="text-right">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wide">Protocolo</div>
                <div className="font-mono text-lg font-bold text-brand-navy">#{v.protocolo}</div>
              </div>
            </div>
          </div>

          {/* Bloco de informações */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <InfoLinha icon={<User size={14} />} label="Vistoriador" value={v.vistoriador_nome} />
            <InfoLinha icon={<Building2 size={14} />} label="Modelo" value={v.template_nome || '—'} />
            <InfoLinha icon={<Clock size={14} />} label="Início" value={fmt(v.iniciada_em)} />
            <InfoLinha icon={<CheckCircle size={14} />} label="Fim" value={fmt(v.finalizada_em)} />
            <InfoLinha icon={<Clock size={14} />} label="Duração" value={duracao(v.iniciada_em, v.finalizada_em)} />
            <InfoLinha icon={<FileText size={14} />} label="Status" value={v.status} />
            {mapsLink(v.lat_inicio, v.lng_inicio) && (
              <InfoLinha icon={<MapPin size={14} />} label="Local início" value={
                <a href={mapsLink(v.lat_inicio, v.lng_inicio)!} target="_blank" rel="noreferrer" className="text-brand-green underline">
                  {v.lat_inicio?.toFixed(5)}, {v.lng_inicio?.toFixed(5)}
                </a>
              } />
            )}
            {mapsLink(v.lat_fim, v.lng_fim) && (
              <InfoLinha icon={<MapPin size={14} />} label="Local fim" value={
                <a href={mapsLink(v.lat_fim, v.lng_fim)!} target="_blank" rel="noreferrer" className="text-brand-green underline">
                  {v.lat_fim?.toFixed(5)}, {v.lng_fim?.toFixed(5)}
                </a>
              } />
            )}
          </div>

          {/* Resumo */}
          {v.perguntas.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Stat n={totalOk} label="Conforme" cor="text-green-600 bg-green-50 border-green-200" />
              <Stat n={totalNok} label="Não conforme" cor="text-red-600 bg-red-50 border-red-200" />
              <Stat n={totalNa} label="N/A" cor="text-gray-600 bg-gray-50 border-gray-200" />
            </div>
          )}

          {/* Perguntas */}
          {v.perguntas.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-navy mb-3 border-b border-gray-200 pb-1">Itens vistoriados</h2>
              <div className="space-y-3">
                {v.perguntas.map((p, idx) => {
                  const r = p.resposta
                  return (
                    <div key={p.id} className="rounded-lg border border-gray-200 p-3 break-inside-avoid">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-gray-400 mt-0.5">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{p.texto}</p>
                          {r ? (
                            <div className="mt-2 space-y-1 text-xs text-gray-700">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-bold border ${RESULTADO_COR[r.resultado] || 'bg-gray-100'}`}>
                                {RESULTADO_LABEL[r.resultado] || r.resultado}
                              </span>
                              {r.titulo && <div><strong>Resposta:</strong> {r.titulo}</div>}
                              {r.descricao && <div><strong>Descrição:</strong> {r.descricao}</div>}
                              {r.observacao && <div><strong>Obs:</strong> {r.observacao}</div>}
                              {r.status && <div><strong>Status:</strong> {STATUS_RESP[r.status] || r.status}</div>}
                              {r.problema && <div><strong>Problema:</strong> {r.problema}</div>}
                              {r.ocorrencia && <div><strong>Ocorrência:</strong> {r.ocorrencia}</div>}
                              {r.notificacao && <div><strong>Notificação:</strong> {r.notificacao}</div>}
                              {r.limpeza && <div><strong>Limpeza:</strong> {STATUS_LIMPEZA[r.limpeza]}</div>}
                              {r.conservacao && <div><strong>Conservação:</strong> {STATUS_CONSERV[r.conservacao]}</div>}
                              {r.validade && <div><strong>Validade:</strong> {fmtData(r.validade)}</div>}
                              {r.local_exato && <div><strong>Local exato:</strong> {r.local_exato}</div>}
                              {r.prazo && <div><strong>Prazo:</strong> {fmtData(r.prazo)}</div>}
                              {r.assinatura && <div><strong>Assinatura:</strong> {r.assinatura}</div>}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic mt-1">Sem resposta</div>
                          )}
                          {p.fotos.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {p.fotos.map((f) => (
                                <img key={f.id} src={f.url} alt="" className="w-20 h-20 object-cover rounded border border-gray-200" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Pendências */}
          {v.pendencias.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-navy mb-3 border-b border-gray-200 pb-1">Pendências</h2>
              <div className="space-y-2">
                {v.pendencias.map((p) => (
                  <div key={p.id} className="rounded-lg border-l-4 border-orange-400 bg-orange-50 p-3 break-inside-avoid">
                    <div className="text-sm font-bold text-gray-900">{p.titulo}</div>
                    {p.descricao && <div className="text-xs text-gray-600 mt-0.5">{p.descricao}</div>}
                    <div className="text-[10px] text-gray-500 mt-1 capitalize">{p.prioridade} · {p.status}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.observacoes && (
            <section className="mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-navy mb-2 border-b border-gray-200 pb-1">Observações</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.observacoes}</p>
            </section>
          )}

          {/* Rodapé com QR */}
          <footer className="mt-10 pt-5 border-t-2 border-gray-200 flex items-end justify-between">
            <div className="text-[10px] text-gray-500">
              <div>Gerado em {fmt(new Date().toISOString())}</div>
              <div className="mt-0.5">X Vistoria · Sistema de vistoria condominial</div>
              <div className="mt-2 text-gray-700 text-xs">
                Escaneie o QR ao lado para abrir esta vistoria online.
              </div>
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

function InfoLinha({ icon, label, value }: { icon: any; label: string; value: any }) {
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

function Stat({ n, label, cor }: { n: number; label: string; cor: string }) {
  return (
    <div className={`text-center rounded-lg border py-3 ${cor}`}>
      <div className="text-2xl font-extrabold">{n}</div>
      <div className="text-[10px] uppercase tracking-wider font-bold">{label}</div>
    </div>
  )
}
