import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import { ArrowLeft, LogOut, Loader2, MapPin, Clock, User, Image as ImageIcon, FileText, AlertTriangle, RefreshCw } from 'lucide-react'

type Evento = {
  id: string
  protocolo: string
  tipo: string
  condominio: string | null
  endereco: string | null
  vistoriador_id: string
  vistoriador_nome: string
  iniciada_em: string
  finalizada_em: string | null
  duracao_segundos: number | null
  lat_inicio: number | null
  lng_inicio: number | null
  lat_fim: number | null
  lng_fim: number | null
  fotos: number
  textos: number
  ocorrencias: number
  capa: string | null
}

function formatarDuracao(s: number | null): string {
  if (!s || s < 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${seg}s`
  return `${seg}s`
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TimelineV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sair = () => { logout(); navigate('/login') }

  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const timerRef = useRef<number | null>(null)

  const carregar = async (silent = false) => {
    if (!silent) setAtualizando(true)
    try {
      const r: any = await api.get('/timeline')
      setEventos(r as Evento[])
    } catch (e: any) {
      if (!silent) console.error(e)
    } finally {
      if (!silent) setAtualizando(false)
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar(true)
    timerRef.current = window.setInterval(() => carregar(true), 8000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [])

  const agrupado = (() => {
    const grupos: Record<string, Evento[]> = {}
    for (const e of eventos) {
      const chave = `${e.vistoriador_nome} • ${e.condominio || 'Sem condomínio'}`
      if (!grupos[chave]) grupos[chave] = []
      grupos[chave].push(e)
    }
    return Object.entries(grupos)
  })()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-base leading-tight">X <span className="text-brand-green">Vistoria</span></div>
            <div className="text-white/60 text-[11px]">Olá, {user?.nome?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-navy">Timeline ao vivo</h1>
              <p className="text-gray-500 mt-1">Acompanhe em tempo real as vistorias da sua equipe — fotos, textos, localização e duração.</p>
            </div>
            <button
              onClick={() => carregar(false)}
              disabled={atualizando}
              className="px-3 py-2 rounded-xl bg-white border-2 border-gray-200 text-gray-600 text-xs font-bold inline-flex items-center gap-2 hover:border-brand-green active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Atualizando automaticamente a cada 8 segundos
          </div>

          {carregando && (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
          )}

          {!carregando && eventos.length === 0 && (
            <div className="card p-10 text-center border-2 border-dashed border-gray-300 bg-white rounded-2xl">
              <p className="text-sm font-bold text-gray-700">Nenhuma vistoria registrada ainda</p>
              <p className="text-xs text-gray-500 mt-1">Quando sua equipe começar a vistoriar, os eventos aparecem aqui em tempo real.</p>
            </div>
          )}

          {!carregando && agrupado.map(([chave, lista]) => (
            <section key={chave}>
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-gray-400" />
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wide">{chave}</h2>
                <span className="text-[10px] font-bold text-gray-400">{lista.length} {lista.length === 1 ? 'vistoria' : 'vistorias'}</span>
              </div>
              <div className="space-y-2">
                {lista.map((e) => {
                  const emAndamento = !e.finalizada_em
                  return (
                    <div
                      key={e.id}
                      onClick={() => navigate(`/x-vistoria/historico/simples/${e.id}`)}
                      className="p-3 rounded-2xl bg-white border-2 border-gray-200 hover:border-brand-green cursor-pointer flex gap-3"
                    >
                      {e.capa
                        ? <img src={e.capa} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                        : <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={24} className="text-gray-300" />
                          </div>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-800 truncate">{e.tipo.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] font-bold text-gray-400">#{e.protocolo}</span>
                          {emAndamento && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Em andamento
                            </span>
                          )}
                        </div>
                        {e.endereco && (
                          <div className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin size={12} className="flex-shrink-0" /> {e.endereco}
                          </div>
                        )}
                        <div className="flex items-center flex-wrap gap-3 mt-1.5 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatarHora(e.iniciada_em)}</span>
                          <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatarDuracao(e.duracao_segundos)}</span>
                          {(e.lat_inicio !== null && e.lng_inicio !== null) && (
                            <a
                              href={`https://maps.google.com/?q=${e.lat_inicio},${e.lng_inicio}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={(ev) => ev.stopPropagation()}
                              className="inline-flex items-center gap-1 text-brand-green font-bold hover:underline"
                            >
                              <MapPin size={11} /> mapa
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                          {e.fotos > 0 && <span className="inline-flex items-center gap-1 text-gray-600"><ImageIcon size={11} /> {e.fotos}</span>}
                          {e.textos > 0 && <span className="inline-flex items-center gap-1 text-gray-600"><FileText size={11} /> {e.textos}</span>}
                          {e.ocorrencias > 0 && <span className="inline-flex items-center gap-1 text-red-600 font-bold"><AlertTriangle size={11} /> {e.ocorrencias} ocorrência{e.ocorrencias > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
