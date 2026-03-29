import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVistoriasLivres, useCriarVistoriaLivre, useExcluirVistoriaLivre, useChecklistLivreItens, useMinhaEmpresa, useCondominios } from '../../api/hooks'
import { api } from '../../api/client'
import { useAuth } from '../../store/auth'
import {
  Plus, Search, Trash2, Eye, FileText, Loader2, ClipboardCheck,
  Building2, MapPin, Calendar, X, Settings, ToggleLeft, ToggleRight,
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  concluida: 'Concluída',
  enviada: 'Enviada',
}

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-green-100 text-green-700',
  enviada: 'bg-emerald-100 text-emerald-700',
}

export default function VistoriaLivrePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: vistorias = [], isLoading } = useVistoriasLivres()
  const { data: condominiosRes } = useCondominios({ limit: 1000 })
  const condominios = condominiosRes?.data || []
  const criar = useCriarVistoriaLivre()
  const excluir = useExcluirVistoriaLivre()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'

  const queryClient = useQueryClient()
  const { data: empresa } = useMinhaEmpresa()
  const { data: checklistItens = [], refetch: refetchChecklist } = useChecklistLivreItens()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [condominioId, setCondominioId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [showPredefinida, setShowPredefinida] = useState(false)
  const [checklistAtivo, setChecklistAtivo] = useState(false)
  const [novoItem, setNovoItem] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    if (empresa?.checklist_livre_ativo != null) setChecklistAtivo(empresa.checklist_livre_ativo)
  }, [empresa])

  const filtered = vistorias.filter((v: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      v.condominio_nome?.toLowerCase().includes(q) ||
      v.supervisor_nome?.toLowerCase().includes(q) ||
      v.titulo?.toLowerCase().includes(q)
    )
  })

  const handleCriar = async () => {
    if (!condominioId) return toast.error('Selecione um condomínio')
    try {
      const nova = await criar.mutateAsync({ condominio_id: condominioId, titulo: titulo || undefined })
      toast.success('Vistoria livre criada!')
      setShowModal(false)
      setCondominioId('')
      setTitulo('')
      navigate(`/vistoria-livre/${nova.id}`)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar vistoria livre.'))
    }
  }

  const handleExcluir = async (id: string) => {
    try {
      await excluir.mutateAsync(id)
      toast.success('Excluída com sucesso')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    }
  }

  const baixarPdf = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/vistoria-livre/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erro')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vistoria-livre-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao gerar PDF.'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-navy" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck size={22} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vistoria Livre</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{vistorias.length} vistoria{vistorias.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowPredefinida(true)}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <Settings size={18} />
              Vistoria Livre Predefinida
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus size={18} />
            Nova Vistoria Livre
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por condomínio, supervisor ou título..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardCheck size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-base font-medium">Nenhuma vistoria livre</p>
          <p className="text-sm mt-1">Clique em "Nova Vistoria Livre" para começar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v: any) => (
            <div
              key={v.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_BADGE[v.status])}>
                      {STATUS_LABEL[v.status]}
                    </span>
                    {v.titulo && <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{v.titulo}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Building2 size={12} />{v.condominio_nome}</span>
                    {isAdmin && <span className="flex items-center gap-1">👤 {v.supervisor_nome}</span>}
                    <span className="flex items-center gap-1"><Calendar size={12} />{dayjs(v.criado_em).format('DD/MM/YY HH:mm')}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} />{v.total_itens} {v.total_itens === 1 ? 'item' : 'itens'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Open / Continue */}
                  <button
                    onClick={() => navigate(`/vistoria-livre/${v.id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-emerald-600"
                    title={v.status === 'rascunho' ? 'Continuar' : 'Visualizar'}
                  >
                    <Eye size={20} />
                  </button>

                  {/* PDF */}
                  {v.status !== 'rascunho' && (
                    <button onClick={() => baixarPdf(v.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="PDF">
                      <FileText size={20} />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(v)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
                    title="Excluir"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Vistoria Livre</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="condominio-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condomínio *</label>
                <select
                  id="condominio-select"
                  value={condominioId}
                  onChange={(e) => setCondominioId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200"
                >
                  <option value="">Selecione...</option>
                  {condominios.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="titulo-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título (opcional)</label>
                <input
                  id="titulo-input"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Vistoria geral, Área externa..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={criar.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {criar.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Iniciar Vistoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Predefined checklist modal */}
      {showPredefinida && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vistoria Livre Predefinida</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure itens pré-definidos para novas vistorias</p>
              </div>
              <button onClick={() => setShowPredefinida(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ativar checklist predefinido</span>
              <button
                onClick={async () => {
                  const val = !checklistAtivo
                  setChecklistAtivo(val)
                  try {
                    await api.patch('/empresas/minha/configuracoes', { checklist_livre_ativo: val })
                    queryClient.invalidateQueries({ queryKey: ['minha-empresa'] })
                    toast.success(val ? 'Checklist ativado' : 'Checklist desativado')
                  } catch (err: any) {
                    setChecklistAtivo(!val)
                    toast.error(extrairErro(err, 'Erro ao alterar configuração.'))
                  }
                }}
              >
                {checklistAtivo ? (
                  <ToggleRight size={36} className="text-emerald-500" />
                ) : (
                  <ToggleLeft size={36} className="text-gray-400" />
                )}
              </button>
            </div>

            {checklistAtivo && (
              <div className="space-y-3">
                {/* Add new item */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoItem}
                    onChange={(e) => setNovoItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novoItem.trim()) {
                        e.preventDefault()
                        const addItem = async () => {
                          setAdicionando(true)
                          try {
                            await api.post('/vistoria-livre/checklist/itens', { titulo: novoItem.trim() })
                            setNovoItem('')
                            refetchChecklist()
                            toast.success('Item adicionado')
                          } catch (err: any) {
                            toast.error(extrairErro(err, 'Erro ao adicionar.'))
                          } finally {
                            setAdicionando(false)
                          }
                        }
                        addItem()
                      }
                    }}
                    placeholder="Nome do item (ex: Fachada, Elevadores, Piscina...)"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200"
                  />
                  <button
                    onClick={async () => {
                      if (!novoItem.trim()) return
                      setAdicionando(true)
                      try {
                        await api.post('/vistoria-livre/checklist/itens', { titulo: novoItem.trim() })
                        setNovoItem('')
                        refetchChecklist()
                        toast.success('Item adicionado')
                      } catch (err: any) {
                        toast.error(extrairErro(err, 'Erro ao adicionar.'))
                      } finally {
                        setAdicionando(false)
                      }
                    }}
                    disabled={adicionando || !novoItem.trim()}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {adicionando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  </button>
                </div>

                {/* Items list */}
                <div className="max-h-60 overflow-y-auto">
                  {checklistItens.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum item cadastrado</p>
                  ) : (
                    <div className="space-y-1">
                      {checklistItens.map((item: any, idx: number) => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-200">{item.titulo}</span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await api.delete(`/vistoria-livre/checklist/itens/${item.id}`)
                                refetchChecklist()
                                toast.success('Item removido')
                              } catch (err: any) {
                                toast.error(extrairErro(err, 'Erro ao remover.'))
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  Esses itens serão pré-carregados automaticamente quando o supervisor iniciar uma nova Vistoria Livre.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Excluir vistoria livre?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Todos os itens e fotos serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmDelete.id)}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
