import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../store/auth'
import {
  Plus, Search, Trash2, Eye, FileText, Loader2, CheckSquare,
  Calendar, MapPin, X, Printer, Share2, QrCode,
  AlertTriangle, CheckCircle,
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import clsx from 'clsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function ChecklistDashPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'

  const { data: execucoes = [], isLoading } = useQuery({
    queryKey: ['checklist-execucoes'],
    queryFn: () => api.get('/checklist-avulso/execucoes'),
  })

  const { data: modelos = [] } = useQuery({
    queryKey: ['checklist-modelos'],
    queryFn: () => api.get('/checklist-avulso/modelos'),
  })

  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showModeloModal, setShowModeloModal] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoLocalNome, setNovoLocalNome] = useState('')
  const [modeloSel, setModeloSel] = useState('')
  const [itensCustom, setItensCustom] = useState<string[]>([''])
  const [criando, setCriando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [shareModal, setShareModal] = useState<string | null>(null)
  const [tab, setTab] = useState<'todos' | 'andamento' | 'concluidos'>('todos')

  // Modelo modal state
  const [modeloTitulo, setModeloTitulo] = useState('')
  const [modeloDesc, setModeloDesc] = useState('')
  const [modeloItens, setModeloItens] = useState<string[]>([''])
  const [criandoModelo, setCriandoModelo] = useState(false)

  const filtered = execucoes.filter((e: any) => {
    if (tab === 'andamento' && e.status !== 'em_andamento') return false
    if (tab === 'concluidos' && e.status !== 'concluida') return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.titulo?.toLowerCase().includes(q) ||
      e.executor_nome?.toLowerCase().includes(q) ||
      e.local_nome?.toLowerCase().includes(q)
    )
  })

  const totalConcluidos = execucoes.filter((e: any) => e.status === 'concluida').length
  const totalAndamento = execucoes.filter((e: any) => e.status === 'em_andamento').length
  const totalProblemas = execucoes.reduce((acc: number, e: any) => acc + (e.total_problemas || 0), 0)

  const handleIniciar = async () => {
    if (!novoTitulo.trim()) return toast.error('Informe o título')
    setCriando(true)
    try {
      const itensFinais = itensCustom.filter(i => i.trim())
      const res = await api.post('/checklist-avulso/execucoes', {
        titulo: novoTitulo.trim(),
        local_nome: novoLocalNome.trim() || undefined,
        modelo_id: modeloSel || undefined,
        itens: itensFinais.length ? itensFinais : undefined,
      })
      toast.success('Checklist iniciado!')
      setShowNewModal(false)
      setNovoTitulo('')
      setNovoLocalNome('')
      setModeloSel('')
      setItensCustom([''])
      queryClient.invalidateQueries({ queryKey: ['checklist-execucoes'] })
      navigate(`/checklist-avulso/${(res as any).id}`)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao iniciar checklist.'))
    } finally {
      setCriando(false)
    }
  }

  const handleCriarModelo = async () => {
    if (!modeloTitulo.trim()) return toast.error('Informe o título do modelo')
    const itens = modeloItens.filter(i => i.trim())
    if (!itens.length) return toast.error('Adicione ao menos um item')
    setCriandoModelo(true)
    try {
      await api.post('/checklist-avulso/modelos', {
        titulo: modeloTitulo.trim(),
        descricao: modeloDesc.trim() || undefined,
        itens,
      })
      toast.success('Modelo criado!')
      setShowModeloModal(false)
      setModeloTitulo('')
      setModeloDesc('')
      setModeloItens([''])
      queryClient.invalidateQueries({ queryKey: ['checklist-modelos'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar modelo.'))
    } finally {
      setCriandoModelo(false)
    }
  }

  const handleExcluir = async (id: string) => {
    try {
      await api.delete(`/checklist-avulso/execucoes/${id}`)
      toast.success('Excluído')
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: ['checklist-execucoes'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    }
  }

  const baixarPdf = async (id: string) => {
    try {
      const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/checklist-avulso/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erro')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checklist-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao gerar PDF.'))
    }
  }

  const baixarFormulario = async (modeloId: string) => {
    try {
      const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/checklist-avulso/${modeloId}/formulario`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erro')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `formulario-checklist-${modeloId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao gerar formulário.'))
    }
  }

  const copyShareLink = (id: string) => {
    const url = `${globalThis.location.origin}/checklist-report/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
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
            <CheckSquare size={22} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checklist</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{execucoes.length} execuç{execucoes.length === 1 ? 'ão' : 'ões'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowModeloModal(true)}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <FileText size={18} />
              Novo Modelo
            </button>
          )}
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Plus size={18} />
            Novo Checklist
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{execucoes.length}</div>
          <div className="text-xs text-gray-500 uppercase font-semibold">Total</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-extrabold text-green-600">{totalConcluidos}</div>
          <div className="text-xs text-gray-500 uppercase font-semibold">Concluídos</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-extrabold text-yellow-600">{totalAndamento}</div>
          <div className="text-xs text-gray-500 uppercase font-semibold">Em andamento</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-extrabold text-red-600">{totalProblemas}</div>
          <div className="text-xs text-gray-500 uppercase font-semibold">Problemas</div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {(['todos', 'andamento', 'concluidos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              tab === t ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
            )}>
              {(() => {
                const labels: Record<string, string> = { todos: 'Todos', andamento: 'Em andamento', concluidos: 'Concluídos' }
                return labels[t]
              })()}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, executor ou local..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Modelos (admin only) */}
      {isAdmin && modelos.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Modelos de Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {modelos.map((m: any) => (
              <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{m.titulo}</span>
                  <span className="text-xs text-gray-400">{m.total_itens} itens</span>
                </div>
                {m.descricao && <p className="text-xs text-gray-500 mb-3">{m.descricao}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setModeloSel(m.id); setNovoTitulo(m.titulo); setShowNewModal(true) }}
                    className="flex-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    Usar modelo
                  </button>
                  <button
                    onClick={() => baixarFormulario(m.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                    title="Imprimir formulário"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-base font-medium">Nenhum checklist encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Checklist" para começar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e: any) => (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                      e.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {e.status === 'concluida' ? 'Concluído' : 'Em andamento'}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{e.titulo}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">👤 {e.executor_nome}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} />{dayjs(e.iniciado_em).format('DD/MM/YY HH:mm')}</span>
                    {e.local_nome && <span className="flex items-center gap-1"><MapPin size={12} />{e.local_nome}</span>}
                    <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" />{e.total_ok || 0}</span>
                    {e.total_problemas > 0 && (
                      <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={12} />{e.total_problemas}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/checklist-avulso/${e.id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-emerald-600"
                    title={e.status === 'em_andamento' ? 'Continuar' : 'Visualizar'}
                  >
                    <Eye size={20} />
                  </button>

                  {e.status === 'concluida' && (
                    <>
                      <button onClick={() => baixarPdf(e.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="PDF">
                        <FileText size={20} />
                      </button>
                      <button onClick={() => setShareModal(e.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-emerald-500" title="Compartilhar">
                        <Share2 size={20} />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setConfirmDelete(e)}
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

      {/* New Checklist modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Novo Checklist</h2>
              <button onClick={() => { setShowNewModal(false); setModeloSel(''); setNovoTitulo(''); setItensCustom(['']) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="novo-titulo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input id="novo-titulo" type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Checklist áreas comuns"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200" />
              </div>

              <div>
                <label htmlFor="novo-local" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local (opcional)</label>
                <input id="novo-local" type="text" value={novoLocalNome} onChange={(e) => setNovoLocalNome(e.target.value)}
                  placeholder="Ex: Bloco A, Torre Sul..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200" />
              </div>

              {modelos.length > 0 && (
                <div>
                  <label htmlFor="usar-modelo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usar modelo</label>
                  <select id="usar-modelo" value={modeloSel} onChange={(e) => setModeloSel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200">
                    <option value="">Sem modelo (itens livres)</option>
                    {modelos.map((m: any) => <option key={m.id} value={m.id}>{m.titulo} ({m.total_itens} itens)</option>)}
                  </select>
                </div>
              )}

              {!modeloSel && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Itens do checklist</span>
                  <div className="space-y-2">
                    {itensCustom.map((item, i) => (
                      <div key={`custom-${i}`} className="flex gap-2">
                        <input type="text" autoComplete="off" value={item} onChange={(e) => {
                          const val = e.target.value; setItensCustom(prev => prev.map((v, j) => j === i ? val : v))
                        }}
                          placeholder={`Item ${i + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200" />
                        {itensCustom.length > 1 && (
                          <button onClick={() => setItensCustom(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setItensCustom(prev => [...prev, ''])} className="text-xs text-emerald-600 font-semibold hover:underline">
                      + Adicionar item
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowNewModal(false); setModeloSel('') }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={handleIniciar} disabled={criando}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {criando ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Iniciar Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Model modal */}
      {showModeloModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Novo Modelo de Checklist</h2>
              <button onClick={() => setShowModeloModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="modelo-titulo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input id="modelo-titulo" type="text" value={modeloTitulo} onChange={(e) => setModeloTitulo(e.target.value)}
                  placeholder="Ex: Checklist áreas comuns"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200" />
              </div>

              <div>
                <label htmlFor="modelo-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                <textarea id="modelo-desc" value={modeloDesc} onChange={(e) => setModeloDesc(e.target.value)}
                  placeholder="Descreva o objetivo deste checklist..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 resize-none" />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Itens *</span>
                <div className="space-y-2">
                  {modeloItens.map((item, i) => (
                    <div key={`modelo-${i}`} className="flex gap-2">
                      <input type="text" autoComplete="off" value={item} onChange={(e) => {
                        const val = e.target.value; setModeloItens(prev => prev.map((v, j) => j === i ? val : v))
                      }}
                        placeholder={`Item ${i + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200" />
                      {modeloItens.length > 1 && (
                        <button onClick={() => setModeloItens(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setModeloItens(prev => [...prev, ''])} className="text-xs text-emerald-600 font-semibold hover:underline">
                    + Adicionar item
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModeloModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={handleCriarModelo} disabled={criandoModelo}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {criandoModelo ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Criar Modelo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Compartilhar</h3>
              <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { copyShareLink(shareModal); setShareModal(null) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                <Share2 size={20} className="text-emerald-500" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Copiar link</div>
                  <div className="text-xs text-gray-500">Compartilhe via WhatsApp, e-mail, etc.</div>
                </div>
              </button>
              <button onClick={() => { window.open(`/checklist-report/${shareModal}`, '_blank'); setShareModal(null) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                <QrCode size={20} className="text-purple-500" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Ver relatório</div>
                  <div className="text-xs text-gray-500">Abrir relatório público com QR Code</div>
                </div>
              </button>
              <button onClick={() => { baixarPdf(shareModal); setShareModal(null) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                <FileText size={20} className="text-red-500" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Baixar PDF</div>
                  <div className="text-xs text-gray-500">Relatório completo em PDF</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Excluir checklist?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Todos os itens e fotos serão removidos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleExcluir(confirmDelete.id)} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
