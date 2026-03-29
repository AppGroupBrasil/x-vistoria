import { useEffect, useState } from 'react'
import { useTimeline, useSupervisoresAtivos } from '../../api/hooks'
import { useAuth } from '../../store/auth'
import { io } from 'socket.io-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
import {
  Activity, MessageSquare, CheckCircle, PauseCircle, Play, Send,
  Camera, User, X, ChevronRight, ClipboardCheck, ListChecks
} from 'lucide-react'
import EnderecoCoords from '../../components/EnderecoCoords'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const STATUS_ICON: Record<string, any> = {
  em_andamento: { icon: Play, color: 'text-emerald-500 bg-emerald-50', label: 'Em andamento' },
  pausada: { icon: PauseCircle, color: 'text-yellow-500 bg-yellow-50', label: 'Pausada' },
  concluida: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'Concluída' },
  aguardando_aprovacao: { icon: Activity, color: 'text-orange-500 bg-orange-50', label: 'Aguardando aprovação' },
  aprovada: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Aprovada' },
  enviada_sindico: { icon: Send, color: 'text-purple-500 bg-purple-50', label: 'Enviada ao síndico' },
}

function getEventConfig(ev: any, isMensagem: boolean, isFoto: boolean, isVistoriaLivre: boolean, isChecklist: boolean) {
  if (isMensagem) return { icon: MessageSquare, color: 'text-gray-500 bg-gray-50', label: 'Mensagem' }
  if (isFoto) return { icon: Camera, color: 'text-pink-500 bg-pink-50', label: 'Foto enviada' }
  if (isVistoriaLivre) {
    const done = ev.status === 'concluida' || ev.status === 'enviada'
    const color = done ? 'text-emerald-500 bg-emerald-50' : 'text-emerald-400 bg-emerald-50'
    let label = 'Vistoria Livre em rascunho'
    if (ev.status === 'concluida') label = 'Vistoria Livre concluída'
    else if (ev.status === 'enviada') label = 'Vistoria Livre enviada'
    return { icon: ClipboardCheck, color, label }
  }
  if (isChecklist) {
    const color = ev.status === 'concluida' ? 'text-emerald-500 bg-emerald-50' : 'text-emerald-400 bg-emerald-50'
    const label = ev.status === 'concluida' ? 'Checklist concluído' : 'Checklist em andamento'
    return { icon: ListChecks, color, label }
  }
  return STATUS_ICON[ev.status] || { icon: Activity, color: 'text-gray-400 bg-gray-50', label: ev.status }
}

export default function TimelinePage() {
  const { data: timelineInit = [] } = useTimeline()
  const { data: supervisores = [] } = useSupervisoresAtivos()
  const [eventos, setEventos] = useState<any[]>([])
  const [supervisorSelecionado, setSupervisorSelecionado] = useState<string | null>(null)
  const [fotoAmpliar, setFotoAmpliar] = useState<string | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    if (timelineInit.length) setEventos(timelineInit)
  }, [timelineInit])

  useEffect(() => {
    if (!token) return
    const WS_URL = import.meta.env.VITE_WS_URL || ''
    const socket = io(WS_URL, { auth: { token } })

    const addEvento = (ev: any) => {
      setEventos((prev) => [ev, ...prev].slice(0, 200))
    }

    socket.on('visita:iniciada', addEvento)
    socket.on('visita:pausada', addEvento)
    socket.on('visita:concluida', addEvento)
    socket.on('visita:aprovada', addEvento)
    socket.on('visita:finalizada', addEvento)
    socket.on('mensagem:nova', addEvento)

    return () => { socket.disconnect() }
  }, [token])

  const eventosFiltrados = supervisorSelecionado
    ? eventos.filter(ev => ev.supervisor_id === supervisorSelecionado)
    : eventos

  const supervisorNome = supervisorSelecionado
    ? supervisores.find((s: any) => s.id === supervisorSelecionado)?.nome || ''
    : ''

  return (
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* Sidebar — lista de funcionários */}
      <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-900">Funcionários</h2>
          <p className="text-xs text-gray-500 mt-0.5">{supervisores.length} cadastrados</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Todos */}
          <button
            onClick={() => setSupervisorSelecionado(null)}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center gap-3 transition-colors ${
              supervisorSelecionado ? 'hover:bg-gray-50' : 'bg-emerald-50 border-l-4 border-l-emerald-500'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <Activity size={16} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Todos</div>
              <div className="text-xs text-gray-500">{eventos.length} eventos</div>
            </div>
            <ChevronRight size={14} className="text-gray-400" />
          </button>

          {supervisores.map((s: any) => {
            const eventosSuper = eventos.filter(ev => ev.supervisor_id === s.id)
            const isSelected = supervisorSelecionado === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSupervisorSelecionado(s.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center gap-3 transition-colors ${
                  isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                  {s.nome?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{s.nome}</div>
                  <div className="text-xs text-gray-500">
                    {s.visitas_ativas > 0 ? `${s.visitas_ativas} vistoria(s) ativa(s)` : 'Sem vistorias ativas'}
                  </div>
                </div>
                {eventosSuper.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-medium rounded-full px-2 py-0.5">
                    {eventosSuper.length}
                  </span>
                )}
              </button>
            )
          })}

          {supervisores.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">
              <User size={32} className="mx-auto mb-2 opacity-30" />
              Nenhum funcionário cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Timeline principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {supervisorSelecionado ? `Timeline — ${supervisorNome}` : 'Timeline em tempo real'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {supervisorSelecionado ? 'Atividades deste funcionário' : 'Acompanhe ao vivo sua equipe em campo'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-500">Ao vivo</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {eventosFiltrados.map((ev: any, i) => {
            const isMensagem = ev.tipo === 'mensagem'
            const isFoto = ev.tipo === 'foto'
            const isVistoriaLivre = ev.tipo === 'vistoria_livre'
            const isChecklist = ev.tipo === 'checklist'
            const cfg = getEventConfig(ev, isMensagem, isFoto, isVistoriaLivre, isChecklist)

            const Icon = cfg.icon

            return (
              <div key={`${ev.id}-${i}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{ev.supervisor_nome}</span>
                    <span className="text-gray-400 text-sm">·</span>
                    <span className="text-gray-600 text-sm">{ev.condominio_nome}</span>
                  </div>
                  {isMensagem && (
                    <p className="text-sm text-gray-700 mt-1 italic">"{ev.texto}"</p>
                  )}
                  {(isVistoriaLivre || isChecklist) && ev.texto && (
                    <p className="text-sm text-gray-700 mt-1">
                      {isVistoriaLivre ? 'Vistoria Livre' : 'Checklist'}: <strong>{ev.texto}</strong> — {cfg.label}
                    </p>
                  )}
                  {!isMensagem && !isFoto && !isVistoriaLivre && !isChecklist && (
                    <p className="text-sm text-gray-500 mt-1">
                      Status: <strong>{cfg.label}</strong>
                    </p>
                  )}
                  {isFoto && ev.foto_url && (
                    <div className="mt-2">
                      <button
                        onClick={() => setFotoAmpliar(ev.foto_url)}
                        className="border-0 bg-transparent p-0 cursor-pointer"
                      >
                        <img
                          src={ev.foto_url}
                          alt="Foto da vistoria"
                          className="w-48 h-36 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity shadow-sm"
                        />
                      </button>
                    </div>
                  )}
                  {ev.lat && ev.lng && (
                    <EnderecoCoords lat={Number(ev.lat)} lng={Number(ev.lng)} className="mt-1.5" />
                  )}
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {dayjs(ev.momento).fromNow()}
                </div>
              </div>
            )
          })}

          {eventosFiltrados.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma atividade nas últimas 24 horas</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen photo modal */}
      {fotoAmpliar && (
        <dialog open className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 m-0 w-full h-full border-0">
          <button onClick={() => setFotoAmpliar(null)} className="absolute inset-0 bg-transparent border-0 cursor-default" aria-label="Fechar">
            <span className="sr-only">Fechar</span>
          </button>
          <button onClick={() => setFotoAmpliar(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10">
            <X size={24} />
          </button>
          <img src={fotoAmpliar} alt="Foto ampliada" className="max-w-full max-h-full object-contain rounded-lg relative z-10" />
        </dialog>
      )}
    </div>
  )
}
