import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVisitas } from '../api/hooks'
import { useAuth } from '../store/auth'
import { ClipboardList, ChevronRight, LogOut, Loader2, MapPin } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

type Filtro = 'hoje' | 'pendentes' | 'concluidas' | 'todas'

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguardando',
  concluida: 'Concluída',
  aprovada: 'Aprovada',
}

const isAberta = (s: string) => ['nao_iniciada', 'em_andamento', 'pausada'].includes(s)
const isConcluida = (s: string) => ['concluida', 'aprovada', 'aguardando_aprovacao'].includes(s)

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: visitas = [], isLoading: loading } = useVisitas()
  const [filtro, setFiltro] = useState<Filtro>('pendentes')

  const lista = useMemo(() => {
    const hoje = dayjs().format('YYYY-MM-DD')
    return visitas.filter((v: any) => {
      if (filtro === 'hoje') return dayjs(v.criado_em).format('YYYY-MM-DD') === hoje
      if (filtro === 'pendentes') return isAberta(v.status)
      if (filtro === 'concluidas') return isConcluida(v.status)
      return true
    })
  }, [visitas, filtro])

  const contagem = useMemo(() => ({
    pendentes: visitas.filter((v: any) => isAberta(v.status)).length,
    hoje: visitas.filter((v: any) => dayjs(v.criado_em).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).length,
    concluidas: visitas.filter((v: any) => isConcluida(v.status)).length,
  }), [visitas])

  const abrir = (v: any) => {
    if (isConcluida(v.status)) navigate(`/visita/${v.id}`)
    else navigate(`/visita/${v.id}/checklist`)
  }

  const tabs: { key: Filtro; label: string; count?: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: contagem.pendentes },
    { key: 'hoje', label: 'Hoje', count: contagem.hoje },
    { key: 'concluidas', label: 'Concluídas', count: contagem.concluidas },
    { key: 'todas', label: 'Todas' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-brand-navy text-white px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-xl">Olá, {user?.nome?.split(' ')[0]}</div>
            <div className="text-white/60 text-xs mt-0.5">{dayjs().format('dddd, DD [de] MMMM')}</div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="p-2 rounded-xl hover:bg-white/10 text-white/70"
            aria-label="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex gap-1 mt-4 -mb-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFiltro(t.key)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                filtro === t.key ? 'bg-white text-brand-navy' : 'bg-white/10 text-white/70'
              )}
            >
              {t.label}{t.count !== undefined && t.count > 0 ? ` · ${t.count}` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-brand-navy" />
          </div>
        )}

        {!loading && lista.length === 0 && (
          <div className="card p-10 text-center">
            <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhuma vistoria nesta lista.</p>
          </div>
        )}

        {!loading && lista.map((v: any) => {
          const aberta = isAberta(v.status)
          return (
            <button
              key={v.id}
              onClick={() => abrir(v)}
              className={clsx(
                'card w-full p-4 text-left active:scale-[0.99] transition-transform',
                aberta && 'border-l-4 border-brand-green'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{v.condominio_nome}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={11} /> {v.condominio_endereco || '—'}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {STATUS_LABEL[v.status] || v.status} · {dayjs(v.criado_em).format('DD/MM')}
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
