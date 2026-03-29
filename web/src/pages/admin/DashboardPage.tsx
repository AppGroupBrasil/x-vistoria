import { useVisitas, useCondominios, useUsuarios } from '../../api/hooks'
import { useSetupProgress } from '../../api/useSetupProgress'
import { Building2, ClipboardList, AlertTriangle, Clock, Filter, Check, ChevronRight, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import isToday from 'dayjs/plugin/isToday'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'

dayjs.extend(isToday)
dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const STATUS_COLORS: Record<string, string> = {
  nao_iniciada: '#9ca3af',
  em_andamento: '#00D68F',
  pausada: '#f59e0b',
  aguardando_aprovacao: '#f97316',
  aprovada: '#10b981',
  enviada_sindico: '#8b5cf6',
  concluida: '#0B1D35',
}

const STATUS_LABELS: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguard. aprovação',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada ao síndico',
  concluida: 'Concluída',
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const navigate = useNavigate()
  const { steps, allDone, completedSteps } = useSetupProgress()

  const filtros: any = { limit: 100 }
  if (dataInicio) filtros.dataInicio = dataInicio
  if (dataFim) filtros.dataFim = dataFim

  const { data: visitasRes } = useVisitas(filtros)
  const { data: condominiosRes } = useCondominios({ limit: 1000 })
  useUsuarios({ limit: 1000 })

  const visitas = visitasRes?.data || []
  const condominios = condominiosRes?.data || []

  const statusCount = visitas.reduce((acc: any, v: any) => {
    acc[v.status] = (acc[v.status] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(statusCount).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count as number,
    color: STATUS_COLORS[status] || '#9ca3af',
  }))

  const emAndamento = visitas.filter((v: any) => v.status === 'em_andamento').length
  const aguardando = visitas.filter((v: any) => v.status === 'aguardando_aprovacao').length

  // Dados por supervisor
  const porSupervisor: { nome: string; total: number }[] = Object.values(
    visitas.reduce((acc: any, v: any) => {
      if (!acc[v.supervisor_nome]) acc[v.supervisor_nome] = { nome: v.supervisor_nome, total: 0 }
      acc[v.supervisor_nome].total++
      return acc
    }, {})
  )

  const hasFilters = dataInicio || dataFim
  const totalVisitas = visitasRes?.total ?? visitas.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{dayjs().format('dddd, DD [de] MMMM [de] YYYY')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/visitas?novaVisita=1')}
            className="btn-primary px-6 py-2.5 text-sm shadow-lg"
          >
            <Plus size={18} /> NOVO
          </button>
          {totalVisitas > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input w-auto text-sm py-1.5" placeholder="De" />
                <span className="text-gray-400 text-sm">até</span>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input w-auto text-sm py-1.5" placeholder="Até" />
              </div>
              {hasFilters && (
                <button onClick={() => { setDataInicio(''); setDataFim('') }} className="text-sm text-red-500 hover:underline">
                  Limpar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Setup Progress Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Configuração inicial</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Complete os passos abaixo para começar a usar o sistema
              </p>
            </div>
            <div className="text-sm font-bold text-brand-navy">
              {completedSteps}/{steps.length}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
            <div
              className="h-2 bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / steps.length) * 100}%` }}
            />
          </div>
          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step) => (
              <button
                key={step.key}
                onClick={() => navigate(step.route)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all text-left group"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${step.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 border-2 border-gray-200'}`}>
                  {step.done ? <Check size={14} /> : step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{step.label}</div>
                  <div className="text-xs text-gray-400">{step.description}</div>
                </div>
                {step.done && step.count > 0 && (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {step.count} cadastrado{step.count > 1 ? 's' : ''}
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
              </button>
            ))}
          </div>
        </div>

      {/* CTA — quando não há visitas */}
      {totalVisitas === 0 && (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-navy/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} className="text-brand-navy" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhuma vistoria cadastrada</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Comece cadastrando sua primeira vistoria. O assistente vai guiar você passo a passo.
          </p>
          <button
            onClick={() => navigate('/visitas?novaVisita=1')}
            className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
          >
            <Plus size={20} /> Cadastrar Vistoria
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Total de visitas" value={visitasRes?.total || visitas.length} color="bg-brand-navy" />
        <StatCard icon={Clock} label="Em andamento" value={emAndamento} color="bg-emerald-500" />
        <StatCard icon={AlertTriangle} label="Aguard. aprovação" value={aguardando} color="bg-orange-500" />
        <StatCard icon={Building2} label="Condomínios ativos" value={condominiosRes?.total || condominios.length} color="bg-brand-green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de status */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Visitas por status</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={180} height={180}>
                <Pie data={pieData} dataKey="value" cx={85} cy={85} innerRadius={50} outerRadius={80}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-bold ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Nenhuma visita registrada
            </div>
          )}
        </div>

        {/* Visitas recentes */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Visitas recentes</h2>
          <div className="space-y-2">
            {visitas.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[v.status] || '#9ca3af' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{v.condominio_nome}</div>
                  <div className="text-xs text-gray-500">{v.supervisor_nome}</div>
                </div>
                <div className="text-xs text-gray-400">{dayjs(v.criado_em).fromNow()}</div>
              </div>
            ))}
            {visitas.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">Nenhuma visita</div>
            )}
          </div>
        </div>
      </div>

      {/* Visitas por supervisor */}
      {porSupervisor.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Visitas por funcionário</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, porSupervisor.length * 40)}>
            <BarChart data={porSupervisor} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#0B1D35" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
