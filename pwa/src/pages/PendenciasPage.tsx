import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePendenciasVisita, useCriarPendencia, useAtualizarPendencia } from '../api/hooks'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, AlertTriangle, CheckCircle, Clock, X
} from 'lucide-react'

const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'border-emerald-400 bg-emerald-50',
  media: 'border-yellow-400 bg-yellow-50',
  alta: 'border-orange-400 bg-orange-50',
  urgente: 'border-red-500 bg-red-50',
}

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_tratativa: 'Em tratativa',
  resolvida: 'Resolvida',
}

export default function PendenciasPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const visitaId = id ?? ''
  const { data: pendencias = [], isLoading: loading } = usePendenciasVisita(visitaId)
  const criarMut = useCriarPendencia(visitaId)
  const atualizarMut = useAtualizarPendencia(visitaId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', responsavel: '' })

  if (!id) return null

  const criarPendencia = async () => {
    if (!form.titulo.trim()) return toast.error('Título obrigatório')
    try {
      await criarMut.mutateAsync(form)
      toast.success('Pendência criada')
      setShowForm(false)
      setForm({ titulo: '', descricao: '', prioridade: 'media', responsavel: '' })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar pendência.'))
    }
  }

  const atualizarStatus = async (pId: string, status: string) => {
    try {
      await atualizarMut.mutateAsync({ id: pId, status })
      toast.success(status === 'resolvida' ? 'Resolvida!' : 'Atualizada')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar pendência.'))
    }
  }

  const items = Array.isArray(pendencias) ? pendencias : []
  const abertas = items.filter((p: any) => p.status === 'aberta')
  const emTratativa = items.filter((p: any) => p.status === 'em_tratativa')
  const resolvidas = items.filter((p: any) => p.status === 'resolvida')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-4 safe-top">
        <button onClick={() => navigate(`/visita/${id}`)} className="flex items-center gap-1 text-white/60 mb-3 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">Pendências</div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-2">
            <Plus size={16} /> Nova
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <div className="card p-2 text-center">
          <div className="text-lg font-bold text-orange-600">{abertas.length}</div>
          <div className="text-[10px] text-gray-500">Abertas</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{emTratativa.length}</div>
          <div className="text-[10px] text-gray-500">Em tratativa</div>
        </div>
        <div className="card p-2 text-center">
          <div className="text-lg font-bold text-green-600">{resolvidas.length}</div>
          <div className="text-[10px] text-gray-500">Resolvidas</div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 pb-4 space-y-2">
        {loading && (
          <div className="space-y-2 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="card p-3 h-20 bg-gray-100 rounded" />)}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="card p-10 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhuma pendência</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          items.map((p: any) => (
            <div key={p.id} className={`card p-3 border-l-4 ${PRIORIDADE_COR[p.prioridade] || 'border-gray-300 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{p.titulo}</div>
                  {p.descricao && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.descricao}</div>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">{p.prioridade}</span>
                    <span className="text-[10px] text-gray-400">{STATUS_LABEL[p.status]}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {p.status === 'aberta' && (
                    <button onClick={() => atualizarStatus(p.id, 'em_tratativa')} className="p-1.5 rounded-lg hover:bg-emerald-100">
                      <Clock size={16} className="text-emerald-500" />
                    </button>
                  )}
                  {p.status !== 'resolvida' && (
                    <button onClick={() => atualizarStatus(p.id, 'resolvida')} className="p-1.5 rounded-lg hover:bg-green-100">
                      <CheckCircle size={16} className="text-green-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal nova pendência */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nova pendência</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <input
              className="input" placeholder="Título *"
              value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <textarea
              className="input resize-none" rows={2} placeholder="Descrição"
              value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <select className="input" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <input
              className="input" placeholder="Responsável (opcional)"
              value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
            <button onClick={criarPendencia} disabled={criarMut.isPending} className="btn-primary w-full">
              {criarMut.isPending ? 'Salvando...' : 'Criar pendência'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
