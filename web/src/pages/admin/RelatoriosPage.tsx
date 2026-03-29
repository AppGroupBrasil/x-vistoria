import { useState } from 'react'
import { useRelatorios, useCondominios, useUsuarios } from '../../api/hooks'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { HelpCircle, X, Filter } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguard. aprovação',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada síndico',
  concluida: 'Concluída',
}

const COLORS = ['#0B1D35', '#00D68F', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#6b7280']

export default function RelatoriosPage() {
  const { data: condominiosRes } = useCondominios({ limit: 1000 })
  const { data: usuariosRes } = useUsuarios({ limit: 1000 })
  const condominios = condominiosRes?.data || []
  const usuarios = usuariosRes?.data || []
  const supervisores = usuarios.filter((u: any) => u.role === 'supervisor')

  const [filtros, setFiltros] = useState<any>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const { data: relatorio, isLoading } = useRelatorios(filtros)

  const totais = relatorio?.totais || { visitas: 0, em_andamento: 0, concluidas: 0, pendencias: 0 }
  const porStatus = relatorio?.porStatus || []
  const porSupervisor = relatorio?.porSupervisor || []
  const porCondominio = relatorio?.porCondominio || []
  const porMes = relatorio?.porMes || []
  const conformidade = relatorio?.conformidade || { ok: 0, nao_ok: 0, na: 0 }

  const statusData = porStatus.map((s: any) => ({
    name: STATUS_LABEL[s.status] || s.status,
    value: Number(s.total),
  }))

  const conformidadeData = [
    { name: 'Conforme', value: Number(conformidade.ok) },
    { name: 'Não conforme', value: Number(conformidade.nao_ok) },
    { name: 'N/A', value: Number(conformidade.na) },
  ].filter(d => d.value > 0)

  const CONFORME_COLORS = ['#10b981', '#ef4444', '#9ca3af']

  const mesData = porMes.map((m: any) => ({
    name: m.mes,
    visitas: Number(m.total),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500">Visão geral das vistorias</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-1.5 ${Object.keys(filtros).length > 0 ? 'border-brand-navy text-brand-navy' : ''}`}>
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 flex gap-4 flex-wrap items-end">
          <div>
            <label className="label" htmlFor="filtro-data-inicio">Data início</label>
            <input id="filtro-data-inicio" type="date" value={filtros.dataInicio || ''} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value || undefined })} className="input w-auto" />
          </div>
          <div>
            <label className="label" htmlFor="filtro-data-fim">Data fim</label>
            <input id="filtro-data-fim" type="date" value={filtros.dataFim || ''} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value || undefined })} className="input w-auto" />
          </div>
          <div>
            <label className="label" htmlFor="filtro-supervisor">Supervisor</label>
            <select id="filtro-supervisor" value={filtros.supervisorId || ''} onChange={(e) => setFiltros({ ...filtros, supervisorId: e.target.value || undefined })} className="input w-auto">
              <option value="">Todos</option>
              {supervisores.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filtro-condominio">Condomínio</label>
            <select id="filtro-condominio" value={filtros.condominioId || ''} onChange={(e) => setFiltros({ ...filtros, condominioId: e.target.value || undefined })} className="input w-auto">
              <option value="">Todos</option>
              {condominios.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {Object.keys(filtros).length > 0 && (
            <button onClick={() => setFiltros({})} className="text-sm text-red-500 hover:underline pb-2">Limpar</button>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-brand-navy">{totais.visitas}</p>
          <p className="text-sm text-gray-500 mt-1">Total de visitas</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-emerald-600">{totais.em_andamento}</p>
          <p className="text-sm text-gray-500 mt-1">Em andamento</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{totais.concluidas}</p>
          <p className="text-sm text-gray-500 mt-1">Concluídas</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-red-600">{totais.pendencias}</p>
          <p className="text-sm text-gray-500 mt-1">Pendências</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5 h-64 bg-gray-100 rounded" />
            <div className="card p-5 h-64 bg-gray-100 rounded" />
          </div>
          <div className="card p-5 h-80 bg-gray-100 rounded" />
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visitas por mês */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">Visitas por mês</h3>
              {mesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="visitas" fill="#0B1D35" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-12 text-center">Sem dados</p>
              )}
            </div>

            {/* Status pie */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">Por status</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((entry: any, i: number) => (
                        <Cell key={entry.name || `status-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-12 text-center">Sem dados</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conformidade pie */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">Conformidade das respostas</h3>
              {conformidadeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={conformidadeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {conformidadeData.map((entry: any, i: number) => (
                        <Cell key={entry.name || `conf-${i}`} fill={CONFORME_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-12 text-center">Sem dados</p>
              )}
            </div>

            {/* Por supervisor */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">Por supervisor</h3>
              {porSupervisor.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={porSupervisor.map((s: any) => ({ name: s.supervisor_nome || 'N/A', total: Number(s.total) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#00D68F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 py-12 text-center">Sem dados</p>
              )}
            </div>
          </div>

          {/* Por condomínio table */}
          {porCondominio.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Por condomínio</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Condomínio</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Visitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {porCondominio.map((c: any) => (
                    <tr key={c.condominio_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{c.condominio_nome}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-navy">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Help */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle size={20} className="text-brand-navy" /> Relatórios</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">1</div>
                <div><p className="font-medium text-gray-900">Visão geral</p><p>Veja totais de visitas, em andamento, concluídas e pendências.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Gráficos</p><p>Analise visitas por mês, status, conformidade e supervisor.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Filtros</p><p>Use filtros de período, supervisor e condomínio para refinar os dados.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
