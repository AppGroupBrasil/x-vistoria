import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  useVisita, useRespostas, usePendencias, useMensagens, useFotos,
  useAcaoVisita, useEditarVisita, useCriarPendencia, useAtualizarPendencia,
  useExcluirPendencia, useEnviarMensagem, useExcluirFoto
} from '../../api/hooks'
import { useAuth } from '../../store/auth'
import { useConfirm } from '../../components/ConfirmDialog'
import {
  CheckCircle, XCircle, Minus, Download, Send, ThumbsUp,
  Pencil, X, Plus, Trash2, Camera, Circle
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import VoiceButton from '../../components/VoiceButton'

const RESULTADO_ICON: Record<string, any> = {
  ok: { icon: CheckCircle, color: 'text-green-500' },
  nao_ok: { icon: XCircle, color: 'text-red-500' },
  na: { icon: Minus, color: 'text-gray-400' },
  pendente: { icon: Circle, color: 'text-gray-300' },
}

function FotoThumbnails({ fotos, onAmpliar }: Readonly<{ fotos: any[]; onAmpliar: (url: string) => void }>) {
  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      {fotos.map((f: any) => (
        <button
          key={f.id}
          type="button"
          className="p-0 border-0 bg-transparent cursor-pointer"
          onClick={() => onAmpliar(f.url)}
        >
          <img
            src={f.thumbnail_url || f.url}
            alt={f.legenda || 'Foto'}
            className="w-12 h-12 object-cover rounded-md border border-gray-200 hover:opacity-80 transition-opacity"
          />
        </button>
      ))}
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  aprovada: 'bg-green-100 text-green-700',
  enviada_sindico: 'bg-purple-100 text-purple-700',
}

const PRIORIDADE_STYLE: Record<string, string> = {
  urgente: 'border-red-500 bg-red-50',
  alta: 'border-orange-500 bg-orange-50',
  media: 'border-yellow-500 bg-yellow-50',
}

function prioridadeStyle(prioridade: string) {
  return PRIORIDADE_STYLE[prioridade] || 'border-gray-300 bg-gray-50'
}

export default function VisitaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: visita, isLoading } = useVisita(id as string)
  const { data: respostas = [] } = useRespostas(id as string)
  const { data: pendencias = [] } = usePendencias(id as string)
  const { data: mensagens = [] } = useMensagens(id as string)
  const { data: fotos = [] } = useFotos(id as string)

  const aprovar = useAcaoVisita('aprovar')
  const enviarSindico = useAcaoVisita('enviar-sindico')
  const editarVisita = useEditarVisita()
  const criarPendencia = useCriarPendencia()
  const atualizarPendencia = useAtualizarPendencia()
  const excluirPendencia = useExcluirPendencia()
  const enviarMensagem = useEnviarMensagem()
  const excluirFoto = useExcluirFoto()
  const confirm = useConfirm()

  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({ titulo: '', observacoes_gerais: '' })
  const [novaMensagem, setNovaMensagem] = useState('')
  const [showNovaPendencia, setShowNovaPendencia] = useState(false)
  const [formPendencia, setFormPendencia] = useState({ titulo: '', descricao: '', prioridade: 'media', responsavel: '' })
  const [fotoAmpliar, setFotoAmpliar] = useState<string | null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)

  // Abre modal automaticamente se vier da lista com ?editar=1
  useEffect(() => {
    if (visita && searchParams.get('editar') === '1') {
      setFormEdit({
        titulo: visita.titulo || '',
        observacoes_gerais: visita.observacoes_gerais || '',
      })
      setEditando(true)
    }
  }, [visita, searchParams])

  const salvarEdicao = async () => {
    try {
      await editarVisita.mutateAsync({ id: id as string, ...formEdit })
      toast.success('Vistoria atualizada!')
      setEditando(false)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao salvar alterações.'))
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/visita/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vistoria-${id}.pdf`
      a.click()
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao gerar PDF.'))
    }
  }

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim()) return
    try {
      await enviarMensagem.mutateAsync({ visita_id: id as string, texto: novaMensagem.trim() })
      setNovaMensagem('')
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar mensagem.'))
    }
  }

  const handleCriarPendencia = async () => {
    if (!formPendencia.titulo.trim()) return toast.error('Informe o título da pendência')
    try {
      await criarPendencia.mutateAsync({ visita_id: id as string, ...formPendencia })
      toast.success('Pendência criada!')
      setShowNovaPendencia(false)
      setFormPendencia({ titulo: '', descricao: '', prioridade: 'media', responsavel: '' })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar pendência.'))
    }
  }

  const handleResolverPendencia = async (pendenciaId: string) => {
    try {
      await atualizarPendencia.mutateAsync({ id: pendenciaId, status: 'resolvida' })
      toast.success('Pendência resolvida!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao resolver pendência.'))
    }
  }

  const handleExcluirPendencia = async (pendenciaId: string) => {
    if (!await confirm({ message: 'Excluir esta pendência?', variant: 'danger', confirmText: 'Excluir' })) return
    try {
      await excluirPendencia.mutateAsync(pendenciaId)
      toast.success('Pendência excluída')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    }
  }

  const handleExcluirFoto = async (fotoId: string) => {
    if (!await confirm({ message: 'Excluir esta foto?', variant: 'danger', confirmText: 'Excluir' })) return
    try {
      await excluirFoto.mutateAsync(fotoId)
      toast.success('Foto excluída')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir foto.'))
    }
  }

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="card p-5 h-20 bg-gray-100 rounded" />)}
      </div>
      <div className="card p-5 h-64 bg-gray-100 rounded" />
    </div>
  )
  if (!visita) return <div className="text-center py-20 text-gray-400">Visita não encontrada</div>

  // Agrupa respostas por categoria
  const porCategoria = respostas.reduce((acc: any, r: any) => {
    const cat = r.categoria_nome || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {})

  // Agrupa fotos por pergunta_id
  const fotosPorPergunta = fotos.reduce((acc: any, f: any) => {
    const key = f.pergunta_id || '__geral__'
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {} as Record<string, any[]>)

  const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length
  const totalNaoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length
  const totalNA = respostas.filter((r: any) => r.resultado === 'na').length
  const respondidas = totalOk + totalNaoOk + totalNA
  const pct = respondidas > 0 ? Math.round((totalOk / (respondidas - totalNA || 1)) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Editar vistoria</h2>
              <button onClick={() => setEditando(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  id="edit-titulo"
                  type="text"
                  className="input w-full"
                  placeholder="Título da vistoria"
                  value={formEdit.titulo}
                  onChange={(e) => setFormEdit((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-obs" className="block text-sm font-medium text-gray-700 mb-1">Observações gerais</label>
                <textarea
                  id="edit-obs"
                  rows={4}
                  className="input w-full resize-none"
                  placeholder="Observações sobre a vistoria..."
                  value={formEdit.observacoes_gerais}
                  onChange={(e) => setFormEdit((f) => ({ ...f, observacoes_gerais: e.target.value }))}
                />
                <VoiceButton
                  onTranscription={(t) => setFormEdit((f) => ({ ...f, observacoes_gerais: t }))}
                  append
                  currentValue={formEdit.observacoes_gerais}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditando(false)} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={editarVisita.isPending}
                className="btn-primary text-sm"
              >
                {editarVisita.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{visita.condominio_nome}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[visita.status] || 'bg-gray-100'}`}>
                {visita.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">Supervisor: {visita.supervisor_nome} · {dayjs(visita.criado_em).format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(visita.status === 'em_andamento' || visita.status === 'pausada') && (
              <button onClick={() => navigate(`/visitas/${id}/editar`)} className="btn-primary text-xs">
                <Pencil size={14} /> Editar vistoria
              </button>
            )}
            <button onClick={handleDownloadPdf} className="btn-secondary text-xs">
              <Download size={14} /> PDF
            </button>
            {visita.status === 'aguardando_aprovacao' && (
              <button
                onClick={() => aprovar.mutateAsync({ id }).then(() => toast.success('Visita aprovada!'))}
                className="btn-success text-xs"
              >
                <ThumbsUp size={14} /> Aprovar
              </button>
            )}
            {visita.status === 'aprovada' && (
              <button
                onClick={() => enviarSindico.mutateAsync({ id }).then(() => toast.success('Enviado ao síndico!'))}
                className="btn-primary text-xs"
              >
                <Send size={14} /> Enviar ao síndico
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Conforme', value: totalOk, color: 'bg-green-50 text-green-700' },
            { label: 'Não conforme', value: totalNaoOk, color: 'bg-red-50 text-red-700' },
            { label: 'N/A', value: totalNA, color: 'bg-gray-50 text-gray-600' },
            { label: 'Conformidade', value: `${pct}%`, color: 'bg-emerald-50 text-emerald-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900">Checklist</h2>
          {Object.entries(porCategoria).map(([cat, itens]: any) => (
            <div key={cat} className="card overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">
                {cat}
              </div>
              {itens.map((r: any, idx: number) => {
                const cfg = RESULTADO_ICON[r.resultado] || RESULTADO_ICON.pendente
                const Icon = cfg.icon
                return (
                  <div key={r.id || `q-${r.pergunta_id}-${idx}`} className="px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3">
                    <Icon size={18} className={`flex-shrink-0 mt-0.5 ${cfg.color}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{r.pergunta_texto}</div>
                      {r.transcricao_corrigida && (
                        <div className="text-xs text-gray-500 mt-1 italic">"{r.transcricao_corrigida}"</div>
                      )}
                      {r.observacao && !r.transcricao_corrigida && (
                        <div className="text-xs text-gray-500 mt-1">{r.observacao}</div>
                      )}
                      {(fotosPorPergunta[r.pergunta_id] || []).length > 0 && (
                        <FotoThumbnails fotos={fotosPorPergunta[r.pergunta_id]} onAmpliar={setFotoAmpliar} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar: pendências + mensagens + fotos */}
        <div className="space-y-4">
          {/* Pendências */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Pendências ({pendencias.length})</h3>
              <button onClick={() => setShowNovaPendencia(true)} className="p-1 text-brand-navy hover:bg-gray-100 rounded-lg" title="Nova pendência">
                <Plus size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {pendencias.map((p: any) => (
                <div key={p.id} className={`p-3 rounded-lg border-l-4 ${prioridadeStyle(p.prioridade)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold uppercase text-gray-500">{p.prioridade}</div>
                      <div className="text-sm font-semibold text-gray-800 mt-0.5">{p.titulo}</div>
                      {p.descricao && <div className="text-xs text-gray-500 mt-1">{p.descricao}</div>}
                      {p.status === 'resolvida' && <div className="text-xs text-green-600 mt-1 font-semibold">✓ Resolvida</div>}
                    </div>
                    {p.status !== 'resolvida' && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleResolverPendencia(p.id)} className="p-1 text-green-500 hover:bg-green-100 rounded" title="Resolver">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => handleExcluirPendencia(p.id)} className="p-1 text-red-400 hover:bg-red-100 rounded" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pendencias.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma pendência</p>
              )}
            </div>
          </div>

          {/* Fotos */}
          {fotos.length > 0 && (
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Camera size={16} /> Fotos ({fotos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((f: any) => (
                  <div key={f.id} className="relative group">
                    <button
                      type="button"
                      className="w-full p-0 border-0 bg-transparent cursor-pointer"
                      onClick={() => setFotoAmpliar(f.url)}
                    >
                      <img
                        src={f.thumbnail_url || f.url}
                        alt={f.legenda || 'Foto da vistoria'}
                        className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </button>
                    {(user?.role === 'admin' || user?.role === 'master') && (
                      <button
                        onClick={() => handleExcluirFoto(f.id)}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens */}
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 mb-3">Mensagens</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mensagens.map((m: any) => (
                <div key={m.id} className="text-sm">
                  <span className="font-semibold text-brand-navy">{m.autor_nome}: </span>
                  <span className="text-gray-700">{m.texto}</span>
                  <div className="text-xs text-gray-400">{dayjs(m.criado_em).format('HH:mm')}</div>
                </div>
              ))}
              {mensagens.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem</p>
              )}
              <div ref={msgEndRef} />
            </div>
            {/* Input para enviar mensagem */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <input
                type="text"
                className="input flex-1 text-sm"
                placeholder="Escrever mensagem..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEnviarMensagem()}
              />
              <button
                onClick={handleEnviarMensagem}
                disabled={!novaMensagem.trim() || enviarMensagem.isPending}
                className="btn-primary p-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal nova pendência */}
      {showNovaPendencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nova pendência</h2>
              <button onClick={() => setShowNovaPendencia(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="pend-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  id="pend-titulo"
                  type="text"
                  className="input w-full"
                  placeholder="Descreva a pendência"
                  value={formPendencia.titulo}
                  onChange={(e) => setFormPendencia((f) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="pend-desc" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  id="pend-desc"
                  rows={3}
                  className="input w-full resize-none"
                  placeholder="Detalhes adicionais..."
                  value={formPendencia.descricao}
                  onChange={(e) => setFormPendencia((f) => ({ ...f, descricao: e.target.value }))}
                />
                <VoiceButton
                  onTranscription={(t) => setFormPendencia((f) => ({ ...f, descricao: t }))}
                  append
                  currentValue={formPendencia.descricao}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pend-prio" className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    id="pend-prio"
                    className="input w-full"
                    value={formPendencia.prioridade}
                    onChange={(e) => setFormPendencia((f) => ({ ...f, prioridade: e.target.value }))}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pend-resp" className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                  <input
                    id="pend-resp"
                    type="text"
                    className="input w-full"
                    placeholder="Nome"
                    value={formPendencia.responsavel}
                    onChange={(e) => setFormPendencia((f) => ({ ...f, responsavel: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowNovaPendencia(false)} className="btn-secondary text-sm">Cancelar</button>
              <button onClick={handleCriarPendencia} disabled={criarPendencia.isPending} className="btn-primary text-sm">
                {criarPendencia.isPending ? 'Criando...' : 'Criar pendência'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal foto ampliada */}
      {fotoAmpliar && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 border-0 p-0 cursor-default w-full"
          onClick={() => setFotoAmpliar(null)}
        >
          <img src={fotoAmpliar} alt="Foto ampliada" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
        </button>
      )}
    </div>
  )
}
