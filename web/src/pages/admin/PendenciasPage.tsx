import { useState } from 'react'
import { useTodasPendencias, useAtualizarPendencia, useExcluirPendencia } from '../../api/hooks'
import { useAuth } from '../../store/auth'
import { useConfirm } from '../../components/ConfirmDialog'
import { Search, AlertTriangle, CheckCircle, Clock, Trash2, HelpCircle, X } from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'

const PRIORIDADE_STYLE: Record<string, string> = {
  urgente: 'border-red-500 bg-red-50 text-red-700',
  alta: 'border-orange-500 bg-orange-50 text-orange-700',
  media: 'border-yellow-500 bg-yellow-50 text-yellow-700',
  baixa: 'border-gray-300 bg-gray-50 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_tratativa: 'Em tratativa',
  resolvida: 'Resolvida',
}

export default function PendenciasPage() {
  const { data: pendencias = [], isLoading } = useTodasPendencias()
  const atualizar = useAtualizarPendencia()
  const excluir = useExcluirPendencia()
  const { user } = useAuth()
  const confirm = useConfirm()

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const filtradas = pendencias.filter((p: any) => {
    if (filtroStatus && p.status !== filtroStatus) return false
    if (filtroPrioridade && p.prioridade !== filtroPrioridade) return false
    if (busca) {
      const b = busca.toLowerCase()
      return (
        p.titulo?.toLowerCase().includes(b) ||
        p.condominio_nome?.toLowerCase().includes(b) ||
        p.supervisor_nome?.toLowerCase().includes(b) ||
        p.responsavel?.toLowerCase().includes(b)
      )
    }
    return true
  })

  const contadores = {
    abertas: pendencias.filter((p: any) => p.status === 'aberta').length,
    em_tratativa: pendencias.filter((p: any) => p.status === 'em_tratativa').length,
    resolvidas: pendencias.filter((p: any) => p.status === 'resolvida').length,
  }

  const handleStatus = async (id: string, novoStatus: string) => {
    try {
      await atualizar.mutateAsync({ id, status: novoStatus })
      toast.success(`Pendência ${novoStatus === 'resolvida' ? 'resolvida' : 'atualizada'}!`)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar.'))
    }
  }

  const handleExcluir = async (id: string) => {
    if (!await confirm({ message: 'Excluir esta pendência?', variant: 'danger', confirmText: 'Excluir' })) return
    try {
      await excluir.mutateAsync(id)
      toast.success('Pendência excluída')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendências</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de pendências de todas as vistorias</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <HelpCircle size={20} />
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{contadores.abertas}</div>
          <div className="text-xs text-gray-500 mt-1">Abertas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{contadores.em_tratativa}</div>
          <div className="text-xs text-gray-500 mt-1">Em tratativa</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{contadores.resolvidas}</div>
          <div className="text-xs text-gray-500 mt-1">Resolvidas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pendências..."
            className="input w-full pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select className="input w-40" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="aberta">Aberta</option>
          <option value="em_tratativa">Em tratativa</option>
          <option value="resolvida">Resolvida</option>
        </select>
        <select className="input w-40" value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)}>
          <option value="">Todas prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="card p-4 h-20 bg-gray-100 rounded" />)}
        </div>
      )}
      {!isLoading && filtradas.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma pendência encontrada</p>
        </div>
      )}
      {!isLoading && filtradas.length > 0 && (
        <div className="space-y-3">
          {filtradas.map((p: any) => (
            <div key={p.id} className={`card p-4 border-l-4 ${PRIORIDADE_STYLE[p.prioridade] || 'border-gray-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{p.titulo}</span>
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-white/80">
                      {p.prioridade}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${{
                      aberta: 'bg-orange-100 text-orange-700',
                      em_tratativa: 'bg-emerald-100 text-emerald-700',
                      resolvida: 'bg-green-100 text-green-700',
                    }[p.status as string] || 'bg-green-100 text-green-700'}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  {p.descricao && <p className="text-xs text-gray-500 mt-1">{p.descricao}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{p.condominio_nome}</span>
                    <span>·</span>
                    <span>{p.supervisor_nome}</span>
                    {p.protocolo && <><span>·</span><span>#{p.protocolo}</span></>}
                    {p.prazo && <><span>·</span><span>Prazo: {dayjs(p.prazo).format('DD/MM/YYYY')}</span></>}
                    {p.responsavel && <><span>·</span><span>Resp: {p.responsavel}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.status === 'aberta' && (
                    <button
                      onClick={() => handleStatus(p.id, 'em_tratativa')}
                      className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                      title="Iniciar tratativa"
                    >
                      <Clock size={16} />
                    </button>
                  )}
                  {p.status !== 'resolvida' && (
                    <button
                      onClick={() => handleStatus(p.id, 'resolvida')}
                      className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
                      title="Marcar como resolvida"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {(user?.role === 'admin' || user?.role === 'master') && (
                    <button
                      onClick={() => handleExcluir(p.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Ajuda — Pendências</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>As pendências são itens não conformes identificados durante as vistorias que precisam de resolução.</p>
              <p><strong>Prioridades:</strong> Urgente, Alta, Média ou Baixa — identificadas pela cor da borda.</p>
              <p><strong>Status:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Aberta</strong> — Pendência identificada, ainda não tratada</li>
                <li><strong>Em tratativa</strong> — Está sendo resolvida</li>
                <li><strong>Resolvida</strong> — Concluída</li>
              </ul>
              <p>Use os filtros e a busca para localizar pendências rapidamente.</p>
            </div>
            <button onClick={() => setShowHelp(false)} className="btn-primary w-full mt-5 text-sm">Entendi</button>
          </div>
        </div>
      )}
    </div>
  )
}
