import { useState } from 'react'
import { useAuditLog, useAuditUsuarios } from '../../api/hooks'
import { useAuth } from '../../store/auth'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
import {
  Shield, Plus, Pencil, Trash2, LogIn, Share2, Download,
  Search, Filter, ChevronLeft, ChevronRight, User, Clock, FileText
} from 'lucide-react'
import clsx from 'clsx'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const ACAO_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  criar: { icon: Plus, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', label: 'Criação' },
  editar: { icon: Pencil, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', label: 'Edição' },
  excluir: { icon: Trash2, color: 'text-red-600 bg-red-50 dark:bg-red-900/30', label: 'Exclusão' },
  login: { icon: LogIn, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', label: 'Login' },
  logout: { icon: LogIn, color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30', label: 'Logout' },
  exportar: { icon: Download, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', label: 'Exportação' },
  compartilhar: { icon: Share2, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30', label: 'Compartilhamento' },
}

const ENTIDADE_LABEL: Record<string, string> = {
  vistoria: 'Vistoria',
  condominio: 'Condomínio',
  usuario: 'Usuário',
  template: 'Modelo',
  categoria: 'Categoria',
  pergunta: 'Pergunta',
  pendencia: 'Pendência',
  empresa: 'Empresa',
  vistoria_livre: 'Vistoria Livre',
  checklist: 'Checklist',
  qr_ponto: 'QR Ponto',
  configuracao: 'Configuração',
  arquivo: 'Arquivo',
  sistema: 'Sistema',
}

export default function AtividadesPage() {
  const { user } = useAuth()
  const [filtros, setFiltros] = useState<any>({ page: 1, limit: 30 })
  const [showFilters, setShowFilters] = useState(false)
  const { data: result, isLoading } = useAuditLog(filtros)
  const { data: auditUsuarios = [] } = useAuditUsuarios()

  const logs = result?.data || []
  const total = result?.total || 0
  const page = result?.page || 1
  const totalPages = result?.totalPages || 1

  const updateFiltro = (key: string, value: any) => {
    setFiltros((prev: any) => ({ ...prev, [key]: value, page: 1 }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white flex items-center gap-2">
            <Shield size={28} />
            Registro de Atividades
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Histórico completo de ações realizadas no sistema
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            showFilters
              ? 'bg-brand-navy text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
        >
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar na descrição..."
                value={filtros.busca || ''}
                onChange={(e) => updateFiltro('busca', e.target.value || undefined)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuário</label>
            <select
              value={filtros.usuario_id || ''}
              onChange={(e) => updateFiltro('usuario_id', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
            >
              <option value="">Todos</option>
              {auditUsuarios.map((u: any) => (
                <option key={u.usuario_id} value={u.usuario_id}>{u.usuario_nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ação</label>
            <select
              value={filtros.acao || ''}
              onChange={(e) => updateFiltro('acao', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
            >
              <option value="">Todas</option>
              <option value="criar">Criação</option>
              <option value="editar">Edição</option>
              <option value="excluir">Exclusão</option>
              <option value="login">Login</option>
              <option value="compartilhar">Compartilhamento</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Entidade</label>
            <select
              value={filtros.entidade || ''}
              onChange={(e) => updateFiltro('entidade', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
            >
              <option value="">Todas</option>
              <option value="vistoria">Vistoria</option>
              <option value="condominio">Condomínio</option>
              <option value="usuario">Usuário</option>
              <option value="template">Modelo</option>
              <option value="pendencia">Pendência</option>
              <option value="checklist">Checklist</option>
              <option value="sistema">Sistema (Login)</option>
            </select>
          </div>
        </div>
      )}

      {/* Stats summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </div>

      {/* Logs timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <FileText size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">Nenhuma atividade registrada</p>
            <p className="text-sm mt-1">As ações realizadas no sistema aparecerão aqui</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.map((log: any) => {
              const config = ACAO_CONFIG[log.acao] || ACAO_CONFIG.editar
              const Icon = config.icon
              const entidadeLabel = ENTIDADE_LABEL[log.entidade] || log.entidade

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Icon */}
                  <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.color)}>
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.descricao}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <User size={12} />
                        {log.usuario_nome}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} />
                        {dayjs(log.criado_em).format('DD/MM/YYYY HH:mm')}
                      </span>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                        config.color
                      )}>
                        {config.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {entidadeLabel}
                      </span>
                    </div>
                  </div>

                  {/* Relative time */}
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-1">
                    {dayjs(log.criado_em).fromNow()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltros((p: any) => ({ ...p, page: Math.max(1, page - 1) }))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => setFiltros((p: any) => ({ ...p, page: Math.min(totalPages, page + 1) }))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Próximo <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
