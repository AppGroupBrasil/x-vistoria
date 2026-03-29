import { useNavigate } from 'react-router-dom'
import { useVisitas } from '../api/hooks'
import { useAuth } from '../store/auth'
import {
  ClipboardList, Play, Clock, ChevronRight, LogOut, Loader2, MapPin
} from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguardando aprovação',
  concluida: 'Concluída',
  aprovada: 'Aprovada',
}

const STATUS_DOT: Record<string, string> = {
  nao_iniciada: 'bg-gray-400',
  em_andamento: 'bg-emerald-500',
  pausada: 'bg-yellow-500',
  aguardando_aprovacao: 'bg-orange-500',
  concluida: 'bg-green-500',
  aprovada: 'bg-green-600',
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: visitas = [], isLoading: loading } = useVisitas()

  // Split by priority: active first, then pending, then done
  const ativas = visitas.filter((v: any) => v.status === 'em_andamento' || v.status === 'pausada')
  const pendentes = visitas.filter((v: any) => v.status === 'nao_iniciada')
  const outras = visitas.filter((v: any) => !['em_andamento', 'pausada', 'nao_iniciada'].includes(v.status))

  const handleIrChecklist = (v: any) => {
    // Go directly to checklist (auto-start happens there)
    navigate(`/visita/${v.id}/checklist`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-5 safe-top">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-bold text-xl">Olá, {user?.nome?.split(' ')[0]}</div>
            <div className="text-white/60 text-sm">{dayjs().format('dddd, DD [de] MMMM')}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="p-2 rounded-xl hover:bg-white/10 text-white/70">
            <LogOut size={20} />
          </button>
        </div>
        {visitas.length > 0 && (
          <div className="mt-2 text-xs text-white/50">
            {ativas.length > 0 && `${ativas.length} em andamento · `}
            {pendentes.length > 0 && `${pendentes.length} pendente(s)`}
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-brand-navy" />
          </div>
        )}

        {!loading && visitas.length === 0 && (
          <div className="card p-10 text-center">
            <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-semibold">Nenhuma vistoria</p>
            <p className="text-gray-400 text-sm mt-1">Quando o administrador criar uma vistoria, ela aparecerá aqui.</p>
          </div>
        )}

        {!loading && visitas.length > 0 && (
          <>
            {/* Active — big CTA cards */}
            {ativas.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-sm mb-2 uppercase tracking-wider">Continuar</h2>
                <div className="space-y-3">
                  {ativas.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => handleIrChecklist(v)}
                      className="card w-full p-4 text-left active:scale-[0.98] transition-transform border-l-4 border-emerald-500"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{v.condominio_nome}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {v.condominio_endereco || '—'}
                          </div>
                        </div>
                        <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 flex-shrink-0">
                          <Play size={14} /> Continuar
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending — action cards */}
            {pendentes.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-sm mb-2 uppercase tracking-wider">Pendentes</h2>
                <div className="space-y-3">
                  {pendentes.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => handleIrChecklist(v)}
                      className="card w-full p-4 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate">{v.condominio_nome}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {v.condominio_endereco || '—'}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock size={10} /> {dayjs(v.criado_em).format('DD/MM/YYYY')}
                          </div>
                        </div>
                        <div className="bg-brand-green text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 flex-shrink-0">
                          <Play size={14} /> Começar
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Done — compact list */}
            {outras.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-sm mb-2 uppercase tracking-wider">Concluídas</h2>
                <div className="space-y-2">
                  {outras.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => navigate(`/visita/${v.id}`)}
                      className="card w-full p-3 text-left flex items-center gap-3 active:scale-[0.99] opacity-80"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[v.status] || 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-700 truncate">{v.condominio_nome}</div>
                        <div className="text-xs text-gray-400">{STATUS_LABEL[v.status] || v.status}</div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
