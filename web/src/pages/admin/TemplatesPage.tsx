import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTemplates, useCategorias, useExcluirTemplate, useTemplate } from '../../api/hooks'
import { api } from '../../api/client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, ClipboardList, ChevronDown, ChevronUp, Check, Trash2, Search, HelpCircle, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useAuth } from '../../store/auth'
import { useSetupProgress } from '../../api/useSetupProgress'
import SetupBanner from '../../components/SetupBanner'

function usePerguntasCategoria(categoriaId: string) {
  return useQuery({
    queryKey: ['perguntas', categoriaId],
    queryFn: () => api.get(`/checklist/categorias/${categoriaId}/perguntas`),
    enabled: !!categoriaId,
  })
}

function CategoriaPerguntas({
  categoria,
  selecionadas,
  onToggle,
  onMarcarTodas,
}: Readonly<{
  categoria: any
  selecionadas: string[]
  onToggle: (id: string) => void
  onMarcarTodas: (ids: string[], marcar: boolean) => void
}>) {
  const [aberta, setAberta] = useState(false)
  const { data: perguntas = [], isLoading } = usePerguntasCategoria(aberta ? categoria.id : '')

  const totalSel = perguntas.filter((p: any) => selecionadas.includes(p.id)).length
  const todasMarcadas = perguntas.length > 0 && totalSel === perguntas.length

  const handleMarcarTodas = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarcarTodas(perguntas.map((p: any) => p.id), !todasMarcadas)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-800">{categoria.nome}</span>
          <span className="text-xs text-gray-400">({categoria.total_perguntas} perguntas)</span>
          {totalSel > 0 && (
            <span className="text-xs bg-brand-navy text-white px-2 py-0.5 rounded-full">
              {totalSel} selecionada{totalSel > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {aberta && !isLoading && perguntas.length > 0 && (
            <button
              type="button"
              onClick={handleMarcarTodas}
              className="text-xs text-brand-navy font-medium hover:underline px-2 py-0.5 rounded hover:bg-white transition-colors bg-transparent border-0 cursor-pointer"
            >
              {todasMarcadas ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
          )}
          {aberta ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {aberta && (
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-3 space-y-2 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ) : (
            <>
              {perguntas.map((p: any) => {
                const sel = selecionadas.includes(p.id)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => onToggle(p.id)}
                        className="sr-only"
                      />
                      <div
                        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                          sel ? 'bg-brand-navy border-brand-navy' : 'border-gray-300'
                        }`}
                        aria-hidden="true"
                      >
                        {sel && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{p.texto}</span>
                    </label>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useTemplates()
  const { data: categorias = [] } = useCategorias()
  const qc = useQueryClient()
  const excluirMutation = useExcluirTemplate()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const { allDone } = useSetupProgress()
  const [cameFromWizard] = useState(() => searchParams.get('fromWizard') === '1')

  const [showModal, setShowModal] = useState(false)
  const [showDetalhe, setShowDetalhe] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', descricao: '' })
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [busca, setBusca] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Edit mode
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState({ nome: '', descricao: '' })
  const [editSelecionadas, setEditSelecionadas] = useState<string[]>([])
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Auto-open create modal when coming from wizard or during setup
  useEffect(() => {
    if (cameFromWizard) {
      setShowModal(true)
      setSearchParams({}, { replace: true })
    } else if (!allDone && !isLoading && (templates as any[]).length === 0) {
      setShowModal(true)
    }
  }, [allDone, isLoading])

  const togglePergunta = (id: string) => {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleEditPergunta = (id: string) => {
    setEditSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const marcarTodas = (ids: string[], marcar: boolean) => {
    setSelecionadas((prev) =>
      marcar
        ? [...new Set([...prev, ...ids])]
        : prev.filter((x) => !ids.includes(x))
    )
  }

  const marcarTodasEdit = (ids: string[], marcar: boolean) => {
    setEditSelecionadas((prev) =>
      marcar
        ? [...new Set([...prev, ...ids])]
        : prev.filter((x) => !ids.includes(x))
    )
  }

  const abrirEdicao = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditando(t)
    setEditForm({ nome: t.nome, descricao: t.descricao || '' })
    try {
      const detail = await api.get(`/checklist/templates/${t.id}`)
      setEditSelecionadas(detail.perguntas?.map((p: any) => p.pergunta_id || p.id) || [])
    } catch {
      setEditSelecionadas([])
    }
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editSelecionadas.length === 0) return toast.error('Selecione ao menos uma pergunta')
    setLoadingEdit(true)
    try {
      await api.patch(`/checklist/templates/${editando.id}`, {
        nome: editForm.nome,
        descricao: editForm.descricao || null,
        perguntas: editSelecionadas.map((pergunta_id, i) => ({
          pergunta_id,
          ordem: i + 1,
          obrigatoria: true,
        })),
      })
      toast.success('Modelo atualizado!')
      qc.invalidateQueries({ queryKey: ['templates'] })
      setEditando(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar modelo.'))
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleExcluir = async () => {
    if (!confirmDelete) return
    try {
      await excluirMutation.mutateAsync(confirmDelete.id)
      toast.success('Modelo excluído!')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir modelo.'))
    }
  }

  const templatesFiltrados = (templates as any[]).filter((t: any) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return t.nome?.toLowerCase().includes(q) || t.descricao?.toLowerCase().includes(q)
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return toast.error('Informe o nome do modelo')
    if (selecionadas.length === 0) return toast.error('Selecione ao menos uma pergunta')
    setLoading(true)
    try {
      const created: any = await api.post('/checklist/templates', {
        nome: form.nome,
        descricao: form.descricao || null,
        perguntas: selecionadas.map((pergunta_id, i) => ({
          pergunta_id,
          ordem: i + 1,
          obrigatoria: true,
        })),
      })
      toast.success('Modelo criado!')
      qc.invalidateQueries({ queryKey: ['templates'] })
      setShowModal(false)
      setForm({ nome: '', descricao: '' })
      setSelecionadas([])
      if (cameFromWizard && created?.id) {
        navigate(`/visitas?resumeWizard=1&template=${created.id}`)
        return
      }
      if (!allDone) { navigate('/visitas?novaVisita=1'); return }
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar modelo de vistoria.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <SetupBanner currentKey="templates" />
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700">Para montar sua vistoria, clique em <strong>+ Novo modelo</strong>, dê um nome, selecione as categorias e perguntas desejadas e salve.</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelo de Vistoria</h1>
          <p className="text-sm text-gray-500">{templates.length} modelo{templates.length === 1 ? '' : 's'} cadastrado{templates.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo modelo
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input pl-9" placeholder="Buscar por nome ou descrição..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templatesFiltrados.map((t: any) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setShowDetalhe(t)}
            className="card p-5 hover:shadow-md transition-shadow cursor-pointer text-left w-full"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} className="text-brand-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900">{t.nome}</h3>
                {t.descricao && (
                  <p className="text-xs text-gray-500 mt-0.5">{t.descricao}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => abrirEdicao(t, e)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50" title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(t) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-semibold text-brand-navy">{t.total_perguntas}</span> pergunta{t.total_perguntas === 1 ? '' : 's'}
            </div>
          </button>
        ))}

        {templates.length === 0 && !isLoading && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum modelo de vistoria cadastrado</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={16} /> Criar primeiro modelo
            </button>
          </div>
        )}
      </div>

      {/* Modal criar modelo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
            <h2 className="text-lg font-bold">Cadastrar modelo da vistoria</h2>
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2 mb-4">
              Para criar perguntas personalizadas com fotos e respostas sim/não, vá na opção <strong>Categoria e Perguntas</strong>.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="tpl-nome" className="label">Nome *</label>
                  <input
                    id="tpl-nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="input"
                    placeholder="Ex: Condomínio Maria Ângela"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="tpl-desc" className="label">Descrição</label>
                  <input
                    id="tpl-desc"
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="input"
                    placeholder="Ex: Vistoria mensal completa"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="label mb-0">Perguntas</span>
                  {selecionadas.length > 0 && (
                    <span className="text-xs text-brand-navy font-medium">
                      {selecionadas.length} selecionada{selecionadas.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Selecione as perguntas que farão parte deste modelo.
                </p>
                <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                  {categorias.map((cat: any) => (
                    <CategoriaPerguntas
                      key={cat.id}
                      categoria={cat}
                      selecionadas={selecionadas}
                      onToggle={togglePergunta}
                      onMarcarTodas={marcarTodas}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Salvando...' : 'Criar modelo'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelecionadas([]); setForm({ nome: '', descricao: '' }) }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe modelo */}
      {showDetalhe && (
        <TemplateDetalheModal
          template={showDetalhe}
          onClose={() => setShowDetalhe(null)}
        />
      )}

      {/* Modal editar modelo */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Editar Modelo</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditar} className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="tpl-edit-nome" className="label">Nome *</label>
                  <input id="tpl-edit-nome" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="input" required />
                </div>
                <div>
                  <label htmlFor="tpl-edit-desc" className="label">Descrição</label>
                  <input id="tpl-edit-desc" value={editForm.descricao} onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })} className="input" />
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="label mb-0">Perguntas</span>
                  {editSelecionadas.length > 0 && (
                    <span className="text-xs text-brand-navy font-medium">{editSelecionadas.length} selecionada{editSelecionadas.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                  {categorias.map((cat: any) => (
                    <CategoriaPerguntas
                      key={cat.id}
                      categoria={cat}
                      selecionadas={editSelecionadas}
                      onToggle={toggleEditPergunta}
                      onMarcarTodas={marcarTodasEdit}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loadingEdit} className="btn-primary flex-1 justify-center">
                  {loadingEdit ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir modelo?</h3>
            <p className="text-sm text-gray-500 mb-4"><strong>{confirmDelete.nome}</strong> será excluído permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleExcluir} disabled={excluirMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle size={20} className="text-brand-navy" /> Como usar</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">1</div>
                <div><p className="font-medium text-gray-900">Criar modelo</p><p>Clique em "Novo modelo", dê um nome e selecione as perguntas das categorias.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Editar</p><p>Clique no ícone de lápis para alterar nome, descrição ou perguntas do modelo.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Usar modelo</p><p>Ao criar uma nova visita, selecione o modelo desejado para pré-carregar as perguntas.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateDetalheModal({ template, onClose }: Readonly<{ template: any; onClose: () => void }>) {
  const navigate = useNavigate()
  const { data: detalhe, isLoading } = useTemplate(template.id)
  const perguntas = detalhe?.perguntas || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{template.nome}</h2>
            {template.descricao && (
              <p className="text-sm text-gray-500 mt-0.5">{template.descricao}</p>
            )}
          </div>
          <span className="text-xs bg-brand-light text-brand-navy px-2 py-1 rounded-full font-medium flex-shrink-0">
            {template.total_perguntas} perguntas
          </span>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4">
          {isLoading && (
            <div className="space-y-2 animate-pulse py-4">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          )}
          {!isLoading && perguntas.length > 0 && (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {perguntas.map((p: any, i: number) => (
                <div key={p.pergunta_id || p.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-gray-700 flex-1">{p.texto}</span>
                </div>
              ))}
            </div>
          )}
          {!isLoading && perguntas.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma pergunta vinculada</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose()
              navigate(`/visitas?template=${template.id}`)
            }}
            className="btn-primary flex-1 justify-center"
          >
            <ClipboardList size={16} /> Usar em nova visita
          </button>
        </div>
      </div>
    </div>
  )
}
