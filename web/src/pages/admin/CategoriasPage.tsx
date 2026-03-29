import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCategorias, usePerguntas,
  useCriarCategoria, useAtualizarCategoria, useExcluirCategoria,
  useCriarPergunta, useAtualizarPergunta, useExcluirPergunta,
  useExcluirPerguntasBulk, useCriarTemplate,
} from '../../api/hooks'
import { useSetupProgress } from '../../api/useSetupProgress'
import SetupBanner from '../../components/SetupBanner'
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronUp, X, Search, HelpCircle, FolderOpen, MessageSquare,
  Camera, FileText, ToggleLeft, CheckSquare, Square, LayoutTemplate, Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useAuth } from '../../store/auth'
import VoiceButton from '../../components/VoiceButton'

export default function CategoriasPage() {
  const { data: categorias = [], isLoading } = useCategorias()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const navigate = useNavigate()
  const { allDone } = useSetupProgress()

  const [busca, setBusca] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Categoria form
  const [showCatModal, setShowCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ nome: '', descricao: '' })

  // Auto-open modal during setup
  useEffect(() => {
    if (!allDone && !isLoading && (categorias as any[]).length === 0) {
      setShowCatModal(true)
    }
  }, [allDone, isLoading])
  const [editCat, setEditCat] = useState<any>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<any>(null)

  const criarCat = useCriarCategoria()
  const atualizarCat = useAtualizarCategoria()
  const excluirCat = useExcluirCategoria()

  const categoriasFiltradas = (categorias as any[]).filter((c: any) => {
    if (!busca) return true
    return c.nome?.toLowerCase().includes(busca.toLowerCase())
  })

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarCat.mutateAsync({ nome: catForm.nome, descricao: catForm.descricao || undefined })
      toast.success('Categoria criada!')
      setShowCatModal(false)
      setCatForm({ nome: '', descricao: '' })
      if (!allDone) navigate('/vistoria')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar categoria.'))
    }
  }

  const handleEditarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await atualizarCat.mutateAsync({ id: editCat.id, nome: catForm.nome, descricao: catForm.descricao || undefined })
      toast.success('Categoria atualizada!')
      setEditCat(null)
      setCatForm({ nome: '', descricao: '' })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar categoria.'))
    }
  }

  const handleExcluirCategoria = async () => {
    if (!confirmDeleteCat) return
    try {
      await excluirCat.mutateAsync(confirmDeleteCat.id)
      toast.success('Categoria excluída!')
      setConfirmDeleteCat(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir categoria.'))
    }
  }

  const abrirEditCat = (c: any) => {
    setEditCat(c)
    setCatForm({ nome: c.nome, descricao: c.descricao || '' })
  }

  let catBtnText = 'Criar'
  if (criarCat.isPending || atualizarCat.isPending) catBtnText = 'Salvando...'
  else if (editCat) catBtnText = 'Salvar'

  return (
    <div className="space-y-4">
      <SetupBanner currentKey="categorias" />
      <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">⚠ Atenção — Seção mais importante do sistema</p>
        <p className="text-sm text-amber-700 mt-1">Cadastre aqui suas categorias e perguntas. Cada modelo de vistoria é montado a partir delas. Um modelo pode ser universal ou específico para cada condomínio.</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias & Perguntas</h1>
          <p className="text-sm text-gray-500">{(categorias as any[]).length} categorias</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => { setShowCatModal(true); setCatForm({ nome: '', descricao: '' }) }} className="btn-primary">
            <Plus size={16} /> Nova categoria
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input pl-9" placeholder="Buscar categoria..." />
      </div>

      <div className="space-y-3">
        {categoriasFiltradas.map((cat: any) => (
          <CategoriaAccordion
            key={cat.id}
            categoria={cat}
            isAdmin={isAdmin}
            onEdit={() => abrirEditCat(cat)}
            onDelete={() => setConfirmDeleteCat(cat)}
          />
        ))}
        {categoriasFiltradas.length === 0 && !isLoading && (
          <div className="card p-12 text-center text-gray-400">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma categoria encontrada</p>
          </div>
        )}
      </div>

      {/* Modal criar/editar categoria */}
      {(showCatModal || editCat) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => { setShowCatModal(false); setEditCat(null) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={editCat ? handleEditarCategoria : handleCriarCategoria} className="space-y-3">
              <div>
                <label htmlFor="cat-nome" className="label">Nome *</label>
                <input id="cat-nome" value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} className="input" required />
              </div>
              <div>
                <label htmlFor="cat-descricao" className="label">Descrição</label>
                <input id="cat-descricao" value={catForm.descricao} onChange={(e) => setCatForm({ ...catForm, descricao: e.target.value })} className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={criarCat.isPending || atualizarCat.isPending} className="btn-primary flex-1 justify-center">
                  {catBtnText}
                </button>
                <button type="button" onClick={() => { setShowCatModal(false); setEditCat(null) }} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar exclusão categoria */}
      {confirmDeleteCat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir categoria?</h3>
            <p className="text-sm text-gray-500 mb-4"><strong>{confirmDeleteCat.nome}</strong> e todas as suas perguntas serão removidas.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteCat(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleExcluirCategoria} disabled={excluirCat.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                {excluirCat.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
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
                <div><p className="font-medium text-gray-900">Categorias</p><p>Agrupe perguntas por área: elétrica, hidráulica, áreas comuns, etc.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Perguntas</p><p>Dentro de cada categoria, adicione as perguntas que o funcionário responderá na vistoria.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Modelos</p><p>Use as categorias e perguntas ao criar modelos de vistoria.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Accordion for each category with inline questions CRUD
function CategoriaAccordion({ categoria, isAdmin, onEdit, onDelete }: Readonly<{
  categoria: any; isAdmin: boolean; onEdit: () => void; onDelete: () => void
}>) {
  const [aberta, setAberta] = useState(false)
  const { data: perguntas = [], isLoading } = usePerguntas(aberta ? categoria.id : '')

  const [showPerguntaForm, setShowPerguntaForm] = useState(false)
  const [perguntaForm, setPerguntaForm] = useState({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false, requer_avaliacao: false })
  const [editPergunta, setEditPergunta] = useState<any>(null)
  const [confirmDeletePergunta, setConfirmDeletePergunta] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateNome, setTemplateNome] = useState('')

  const criarPergunta = useCriarPergunta()
  const atualizarPergunta = useAtualizarPergunta()
  const excluirPergunta = useExcluirPergunta()
  const excluirBulk = useExcluirPerguntasBulk()
  const criarTemplate = useCriarTemplate()

  const perguntasList = perguntas as any[]
  const allSelected = perguntasList.length > 0 && selectedIds.size === perguntasList.length

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(perguntasList.map((p: any) => p.id)))
    }
  }

  const handleCriarPergunta = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarPergunta.mutateAsync({
        categoria_id: categoria.id,
        texto: perguntaForm.texto,
        requer_sim_nao: perguntaForm.requer_sim_nao,
        requer_foto: perguntaForm.requer_foto,
        requer_observacao: perguntaForm.requer_observacao,
        requer_avaliacao: perguntaForm.requer_avaliacao,
      })
      toast.success('Pergunta adicionada!')
      setShowPerguntaForm(false)
      setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false, requer_avaliacao: false })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar pergunta.'))
    }
  }

  const handleEditarPergunta = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await atualizarPergunta.mutateAsync({
        id: editPergunta.id,
        texto: perguntaForm.texto,
        requer_sim_nao: perguntaForm.requer_sim_nao,
        requer_foto: perguntaForm.requer_foto,
        requer_observacao: perguntaForm.requer_observacao,
        requer_avaliacao: perguntaForm.requer_avaliacao,
      })
      toast.success('Pergunta atualizada!')
      setEditPergunta(null)
      setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false, requer_avaliacao: false })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar pergunta.'))
    }
  }

  const handleExcluirPergunta = async () => {
    if (!confirmDeletePergunta) return
    try {
      await excluirPergunta.mutateAsync(confirmDeletePergunta.id)
      toast.success('Pergunta removida!')
      setConfirmDeletePergunta(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir pergunta.'))
    }
  }

  const handleBulkDelete = async () => {
    try {
      await excluirBulk.mutateAsync([...selectedIds])
      toast.success(`${selectedIds.size} pergunta(s) removida(s)!`)
      setSelectedIds(new Set())
      setConfirmBulkDelete(false)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir perguntas.'))
    }
  }

  const handleCriarTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarTemplate.mutateAsync({
        nome: templateNome,
        perguntas: [...selectedIds].map((id, i) => ({ pergunta_id: id, ordem: i + 1 })),
      })
      toast.success('Modelo de vistoria criado com sucesso!')
      setSelectedIds(new Set())
      setShowTemplateForm(false)
      setTemplateNome('')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar modelo de vistoria.'))
    }
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-light rounded-lg flex items-center justify-center">
            <FolderOpen size={18} className="text-brand-navy" />
          </div>
          <div>
            <span className="font-semibold text-gray-900">{categoria.nome}</span>
            <span className="text-xs text-gray-400 ml-2">({categoria.total_perguntas} perguntas)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50" title="Editar">
            <Pencil size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir">
            <Trash2 size={15} />
          </button>
          {aberta ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {aberta && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="px-5 py-4 space-y-2 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ) : (
            <>
              {/* Select all + bulk actions bar */}
              {perguntasList.length > 0 && (
                <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <button type="button" onClick={toggleAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-navy">
                    {allSelected
                      ? <CheckSquare size={14} className="text-brand-navy" />
                      : <Square size={14} />}
                    <span>{allSelected ? 'Desmarcar todas' : 'Selecionar todas'}</span>
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-brand-navy font-medium ml-auto">
                      {selectedIds.size} selecionada(s)
                    </span>
                  )}
                </div>
              )}

              {perguntasList.map((p: any, i: number) => (
                <div key={p.id} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-emerald-50/50' : ''}`}>
                  <button type="button" onClick={() => toggleSelect(p.id)} className="flex-shrink-0">
                    {selectedIds.has(p.id)
                      ? <CheckSquare size={16} className="text-brand-navy" />
                      : <Square size={16} className="text-gray-300 hover:text-gray-400" />}
                  </button>
                  <span className="text-xs text-gray-400 w-6 flex-shrink-0">{i + 1}.</span>
                  <MessageSquare size={14} className="text-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{p.texto}</span>
                  <div className="flex items-center gap-1">
                    {p.requer_sim_nao !== false && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <ToggleLeft size={10} /> Sim/Não
                      </span>
                    )}
                    {p.requer_foto && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <Camera size={10} /> Foto
                      </span>
                    )}
                    {p.requer_observacao && (
                      <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <FileText size={10} /> Texto
                      </span>
                    )}
                    {p.requer_avaliacao && (
                      <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                        <Star size={10} /> Avaliação
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditPergunta(p); setPerguntaForm({ texto: p.texto, requer_sim_nao: p.requer_sim_nao !== false, requer_foto: !!p.requer_foto, requer_observacao: !!p.requer_observacao, requer_avaliacao: !!p.requer_avaliacao }) }}
                      className="p-1 rounded text-gray-400 hover:text-emerald-600"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDeletePergunta(p)} className="p-1 rounded text-gray-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {perguntasList.length === 0 && (
                <div className="px-5 py-4 text-sm text-gray-400">Nenhuma pergunta nesta categoria</div>
              )}

              {/* Floating toolbar when items selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 px-5 py-3 bg-brand-navy/5 border-t border-brand-navy/10">
                  <span className="text-xs font-medium text-brand-navy mr-auto">{selectedIds.size} pergunta(s) selecionada(s)</span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-lg"
                  >
                    <LayoutTemplate size={13} /> Criar modelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    title="Limpar seleção"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Add question inline form */}
              {!showPerguntaForm && !editPergunta ? (
                <button
                  onClick={() => { setShowPerguntaForm(true); setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false }) }}
                  className="flex items-center gap-2 px-5 py-3 text-sm text-brand-navy hover:bg-emerald-50 w-full text-left"
                >
                  <Plus size={14} /> Adicionar pergunta
                </button>
              ) : (
                <form onSubmit={editPergunta ? handleEditarPergunta : handleCriarPergunta} className="px-5 py-3 bg-gray-50 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={perguntaForm.texto}
                      onChange={(e) => setPerguntaForm({ ...perguntaForm, texto: e.target.value })}
                      className="input text-sm flex-1"
                      placeholder="Texto da pergunta..."
                      required
                      autoFocus
                    />
                    <VoiceButton
                      onTranscription={(t) => setPerguntaForm((f) => ({ ...f, texto: t }))}
                      append
                      currentValue={perguntaForm.texto}
                    />
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Tipos de resposta:</span>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perguntaForm.requer_sim_nao}
                        onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_sim_nao: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <ToggleLeft size={14} className="text-emerald-500" />
                      <span>Sim/Não</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perguntaForm.requer_foto}
                        onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_foto: e.target.checked })}
                        className="w-4 h-4 accent-amber-600"
                      />
                      <Camera size={14} className="text-amber-500" />
                      <span>Foto</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perguntaForm.requer_observacao}
                        onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_observacao: e.target.checked })}
                        className="w-4 h-4 accent-green-600"
                      />
                      <FileText size={14} className="text-green-500" />
                      <span>Texto</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perguntaForm.requer_avaliacao}
                        onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_avaliacao: e.target.checked })}
                        className="w-4 h-4 accent-yellow-600"
                      />
                      <Star size={14} className="text-yellow-500" />
                      <span>Avaliação</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={criarPergunta.isPending || atualizarPergunta.isPending} className="btn-primary text-sm py-1.5">
                      {editPergunta ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button type="button" onClick={() => { setShowPerguntaForm(false); setEditPergunta(null) }} className="btn-secondary text-sm py-1.5">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Confirm delete single pergunta */}
          {confirmDeletePergunta && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-sm p-6 text-center">
                <Trash2 size={32} className="mx-auto mb-3 text-red-400" />
                <h3 className="text-base font-bold text-gray-900 mb-2">Excluir pergunta?</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">"{confirmDeletePergunta.texto}"</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDeletePergunta(null)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={handleExcluirPergunta} disabled={excluirPergunta.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm bulk delete */}
          {confirmBulkDelete && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-sm p-6 text-center">
                <Trash2 size={32} className="mx-auto mb-3 text-red-400" />
                <h3 className="text-base font-bold text-gray-900 mb-2">Excluir {selectedIds.size} pergunta(s)?</h3>
                <p className="text-sm text-gray-500 mb-4">Esta ação não pode ser desfeita.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmBulkDelete(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={handleBulkDelete} disabled={excluirBulk.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                    {excluirBulk.isPending ? 'Excluindo...' : 'Excluir todas'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create template modal */}
          {showTemplateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutTemplate size={20} className="text-brand-navy" />
                  <h3 className="text-base font-bold text-gray-900">Criar modelo de vistoria</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">{selectedIds.size} pergunta(s) selecionada(s) de "{categoria.nome}"</p>
                <form onSubmit={handleCriarTemplate}>
                  <input
                    value={templateNome}
                    onChange={(e) => setTemplateNome(e.target.value)}
                    className="input text-sm mb-4"
                    placeholder="Nome do modelo (ex: Vistoria Portaria)"
                    required
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowTemplateForm(false); setTemplateNome('') }} className="btn-secondary flex-1">Cancelar</button>
                    <button type="submit" disabled={criarTemplate.isPending} className="btn-primary flex-1">
                      {criarTemplate.isPending ? 'Criando...' : 'Criar modelo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
