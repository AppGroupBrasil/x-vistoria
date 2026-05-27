import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useVisita, useCategorias, useRespostas, useTemplate, useAllPerguntas,
  useAlterarStatusVisita, useFotos, useUploadFoto, useExcluirFoto,
  usePendenciasVisita, useCriarPendencia,
} from '../api/hooks'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Check, X, Camera, AlertTriangle, MessageSquare, Send,
  Loader2, Trash2, Plus
} from 'lucide-react'
import clsx from 'clsx'
import MensagemModal from '../components/MensagemModal'
import { compactarImagem } from '../lib/compactarImagem'

type Resultado = 'ok' | 'nao_ok' | 'na' | null
type Status = 'aberto' | 'em_execucao' | 'finalizado' | null
type Limpeza = 'ruim' | 'regular' | 'boa' | 'otima' | null

interface Resposta {
  id?: string
  resultado: Resultado
  observacao: string
  titulo?: string
  descricao?: string
  status?: Status
  problema?: string
  ocorrencia?: string
  notificacao?: string
  limpeza?: Limpeza
}

const STATUS_OPCOES: { v: Status; l: string }[] = [
  { v: 'aberto', l: 'Aberto' },
  { v: 'em_execucao', l: 'Em execução' },
  { v: 'finalizado', l: 'Finalizado' },
]

const LIMPEZA_OPCOES: { v: Limpeza; l: string; cor: string }[] = [
  { v: 'ruim', l: 'Ruim', cor: 'bg-red-500' },
  { v: 'regular', l: 'Regular', cor: 'bg-yellow-500' },
  { v: 'boa', l: 'Boa', cor: 'bg-emerald-500' },
  { v: 'otima', l: 'Ótima', cor: 'bg-green-600' },
]

export default function ChecklistPage() {
  const { id: visitaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: visita } = useVisita(visitaId ?? '')
  const { data: cats = [] } = useCategorias()
  const { data: resps = [] } = useRespostas(visitaId ?? '')
  const { data: templateData } = useTemplate(visita?.template_id)
  const { data: allPerguntasGlobais = [] } = useAllPerguntas(!visita?.template_id && !!visita)
  const { data: fotos = [] } = useFotos(visitaId ?? '')
  const { data: pendencias = [] } = usePendenciasVisita(visitaId ?? '')
  const statusMut = useAlterarStatusVisita(visitaId ?? '')
  const uploadFoto = useUploadFoto(visitaId ?? '')
  const excluirFoto = useExcluirFoto(visitaId ?? '')
  const criarPendMut = useCriarPendencia(visitaId ?? '')

  const [template, setTemplate] = useState<any>(null)
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [showResumo, setShowResumo] = useState(false)
  const [showMsg, setShowMsg] = useState(false)
  const [pendForm, setPendForm] = useState<{ perguntaId?: string } | null>(null)
  const [fotoForId, setFotoForId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [obsFinal, setObsFinal] = useState('')

  useEffect(() => {
    if (visita?.status === 'nao_iniciada') statusMut.mutateAsync({ acao: 'iniciar' }).catch(() => {})
  }, [visita?.status])

  useEffect(() => { if (templateData) setTemplate(templateData) }, [templateData])
  useEffect(() => {
    if (!visita?.template_id && allPerguntasGlobais.length > 0 && !template) {
      setTemplate({ id: null, nome: 'Vistoria Livre', perguntas: allPerguntasGlobais })
    }
  }, [visita?.template_id, allPerguntasGlobais, template])

  useEffect(() => {
    if (resps.length > 0) {
      const map: Record<string, Resposta> = {}
      resps.forEach((r: any) => {
        map[r.pergunta_id] = {
          id: r.id, resultado: r.resultado, observacao: r.observacao || '',
          titulo: r.titulo || '', descricao: r.descricao || '', status: r.status || null,
          problema: r.problema || '', ocorrencia: r.ocorrencia || '', notificacao: r.notificacao || '',
          limpeza: r.limpeza || null,
        }
      })
      setRespostas(map)
    }
  }, [resps])

  const allPerguntas: any[] = template?.perguntas || []
  const total = allPerguntas.length
  const respondidos = allPerguntas.filter((p) => respostas[p.id]?.resultado).length
  const totalOk = allPerguntas.filter((p) => respostas[p.id]?.resultado === 'ok').length
  const totalNaoOk = allPerguntas.filter((p) => respostas[p.id]?.resultado === 'nao_ok').length
  const totalNa = allPerguntas.filter((p) => respostas[p.id]?.resultado === 'na').length
  const progresso = total > 0 ? (respondidos / total) * 100 : 0

  // Agrupar por categoria preservando ordem
  const perguntasPorCategoria = useMemo(() => {
    const grupos: { catId: string | null; catNome: string; perguntas: any[] }[] = []
    allPerguntas.forEach((p) => {
      const catNome = cats.find((c: any) => c.id === p.categoria_id)?.nome || 'Geral'
      const ultimo = grupos[grupos.length - 1]
      if (ultimo && ultimo.catId === p.categoria_id) ultimo.perguntas.push(p)
      else grupos.push({ catId: p.categoria_id, catNome, perguntas: [p] })
    })
    return grupos
  }, [allPerguntas, cats])

  const salvar = async (perguntaId: string, resultado: Resultado, observacao?: string, extra?: Partial<Resposta>) => {
    const atual: Resposta = respostas[perguntaId] || { resultado: null, observacao: '' }
    const merged = { ...atual, ...(extra || {}) }
    const body: any = {
      visita_id: visitaId,
      pergunta_id: perguntaId,
      resultado,
      observacao: observacao ?? atual.observacao ?? '',
      titulo: merged.titulo || undefined,
      descricao: merged.descricao || undefined,
      status: merged.status || undefined,
      problema: merged.problema || undefined,
      ocorrencia: merged.ocorrencia || undefined,
      notificacao: merged.notificacao || undefined,
      limpeza: merged.limpeza || undefined,
    }
    setRespostas((prev) => ({ ...prev, [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), ...body, resultado: body.resultado } as Resposta }))
    try { await api.post('/checklist/respostas', body) }
    catch (err: any) { toast.error(extrairErro(err, 'Erro ao salvar resposta.')) }
  }

  const handleUploadFoto = async (perguntaId: string, files: FileList | null) => {
    if (!files?.length) return
    const toastId = toast.loading(files.length > 1 ? `Enviando ${files.length} fotos…` : 'Enviando foto…')
    try {
      for (const original of Array.from(files)) {
        const file = await compactarImagem(original)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('visita_id', visitaId ?? '')
        fd.append('pergunta_id', perguntaId)
        await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      toast.success(files.length > 1 ? `${files.length} fotos enviadas` : 'Foto enviada', { id: toastId })
      uploadFoto.reset()
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao enviar foto.'), { id: toastId }) }
  }

  const handleFinalizar = async () => {
    setEnviando(true)
    try {
      await statusMut.mutateAsync({ acao: 'finalizar', body: { observacoes: obsFinal } })
      toast.success('Vistoria enviada!')
      navigate('/')
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao finalizar.')) }
    finally { setEnviando(false) }
  }

  const fotosDe = (perguntaId: string) => (Array.isArray(fotos) ? fotos : []).filter((f: any) => f.pergunta_id === perguntaId)
  const pendDe = (perguntaId: string) => (Array.isArray(pendencias) ? pendencias : []).filter((p: any) => p.pergunta_id === perguntaId)

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-navy" />
      </div>
    )
  }

  if (showResumo) {
    const semResposta = total - respondidos
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-brand-navy text-white px-4 pt-12 pb-5">
          <button onClick={() => setShowResumo(false)} className="text-white/60 text-sm flex items-center gap-1 mb-3">
            <ArrowLeft size={16} /> Revisar
          </button>
          <div className="font-bold text-xl">Resumo da vistoria</div>
          <div className="text-white/60 text-sm mt-0.5">{visita?.condominio_nome}</div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalOk}</div>
              <div className="text-[11px] text-gray-500">Conforme</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{totalNaoOk}</div>
              <div className="text-[11px] text-gray-500">Não conforme</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-gray-500">{totalNa}</div>
              <div className="text-[11px] text-gray-500">N/A</div>
            </div>
          </div>
          {semResposta > 0 && (
            <div className="card p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {semResposta} pergunta(s) sem resposta
            </div>
          )}
          <div>
            <label htmlFor="obs-final" className="text-sm font-semibold text-gray-700 block mb-1">Observação final</label>
            <textarea
              id="obs-final"
              value={obsFinal}
              onChange={(e) => setObsFinal(e.target.value)}
              placeholder="Opcional"
              className="input resize-none text-sm"
              rows={3}
            />
          </div>
          <button
            onClick={handleFinalizar}
            disabled={enviando}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {enviando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Enviar para aprovação
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/')} className="text-white/70 text-sm flex items-center gap-1">
            <ArrowLeft size={16} /> Sair
          </button>
          <button onClick={() => setShowMsg(true)} className="text-white/70 text-sm flex items-center gap-1">
            <MessageSquare size={16} /> Mensagem
          </button>
        </div>
        <div className="font-bold text-base truncate">{visita?.condominio_nome}</div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-brand-green transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <span className="text-xs text-white/70 whitespace-nowrap">{respondidos}/{total}</span>
        </div>
      </div>

      {/* Lista de perguntas */}
      <div className="flex-1 px-3 py-3 space-y-4">
        {perguntasPorCategoria.map((grupo) => (
          <div key={grupo.catId ?? 'sem'} className="space-y-2">
            <div className="text-[11px] font-bold text-brand-navy uppercase tracking-wider px-1">{grupo.catNome}</div>
            {grupo.perguntas.map((p, idxLocal) => {
              const r = respostas[p.id] || { resultado: null, observacao: '' }
              const fotosCount = fotosDe(p.id).length
              const pendCount = pendDe(p.id).length
              const setCampo = (campo: keyof Resposta, valor: any) =>
                setRespostas((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] || { resultado: null, observacao: '' }), [campo]: valor } as Resposta }))
              const persistir = () => r.resultado && salvar(p.id, r.resultado)
              return (
                <div key={p.id} className="card p-3 space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">#{idxLocal + 1}</div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{p.texto}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => salvar(p.id, 'ok')}
                      className={clsx('py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all active:scale-95',
                        r.resultado === 'ok' ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600')}
                    >
                      <Check size={16} /> Sim
                    </button>
                    <button
                      onClick={() => salvar(p.id, 'nao_ok')}
                      className={clsx('py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 transition-all active:scale-95',
                        r.resultado === 'nao_ok' ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600')}
                    >
                      <X size={16} /> Não
                    </button>
                    <button
                      onClick={() => salvar(p.id, 'na')}
                      className={clsx('py-3 rounded-xl text-sm font-bold transition-all active:scale-95',
                        r.resultado === 'na' ? 'bg-gray-500 text-white' : 'bg-white border border-gray-200 text-gray-600')}
                    >
                      N/A
                    </button>
                  </div>

                  {/* Campos condicionais — só aparecem se foram marcados no cadastro */}
                  {p.requer_titulo && (
                    <input
                      type="text" placeholder="Resposta"
                      value={r.titulo || ''} onChange={(e) => setCampo('titulo', e.target.value)} onBlur={persistir}
                      className="input text-sm"
                    />
                  )}
                  {p.requer_descricao && (
                    <textarea
                      placeholder="Descrição" rows={2}
                      value={r.descricao || ''} onChange={(e) => setCampo('descricao', e.target.value)} onBlur={persistir}
                      className="input text-sm resize-none"
                    />
                  )}
                  {p.requer_status && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1">Status</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {STATUS_OPCOES.map((s) => (
                          <button
                            key={s.v}
                            onClick={() => { setCampo('status', s.v); setTimeout(persistir, 0) }}
                            className={clsx('py-2 rounded-lg text-xs font-bold',
                              r.status === s.v ? 'bg-brand-navy text-white' : 'bg-gray-50 text-gray-600 border border-gray-200')}
                          >
                            {s.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.requer_problema && (
                    <textarea
                      placeholder="Problema identificado" rows={2}
                      value={r.problema || ''} onChange={(e) => setCampo('problema', e.target.value)} onBlur={persistir}
                      className="input text-sm resize-none"
                    />
                  )}
                  {p.requer_ocorrencia && (
                    <textarea
                      placeholder="Ocorrência" rows={2}
                      value={r.ocorrencia || ''} onChange={(e) => setCampo('ocorrencia', e.target.value)} onBlur={persistir}
                      className="input text-sm resize-none"
                    />
                  )}
                  {p.requer_notificacao && (
                    <textarea
                      placeholder="Notificação" rows={2}
                      value={r.notificacao || ''} onChange={(e) => setCampo('notificacao', e.target.value)} onBlur={persistir}
                      className="input text-sm resize-none"
                    />
                  )}
                  {p.requer_limpeza && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1">Limpeza</div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {LIMPEZA_OPCOES.map((s) => (
                          <button
                            key={s.v}
                            onClick={() => { setCampo('limpeza', s.v); setTimeout(persistir, 0) }}
                            className={clsx('py-2 rounded-lg text-xs font-bold',
                              r.limpeza === s.v ? `${s.cor} text-white` : 'bg-gray-50 text-gray-600 border border-gray-200')}
                          >
                            {s.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações de apoio: foto (se requer) + pendência (sempre disponível) */}
                  <div className="flex items-center gap-1">
                    {p.requer_foto && (
                      <label className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-50 text-gray-500 text-xs font-medium active:bg-gray-100 cursor-pointer">
                        <Camera size={14} />
                        Foto{fotosCount > 0 ? ` (${fotosCount})` : ''}
                        <input type="file" accept="image/*" capture="environment" multiple className="hidden"
                          onChange={(e) => { handleUploadFoto(p.id, e.target.files); e.target.value = '' }} />
                      </label>
                    )}
                    <button
                      onClick={() => setPendForm({ perguntaId: p.id })}
                      className={clsx('flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium',
                        pendCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500 active:bg-gray-100')}
                    >
                      <AlertTriangle size={14} /> {pendCount > 0 ? pendCount : 'Pendência'}
                    </button>
                  </div>

                  {fotosCount > 0 && (
                    <div className="flex gap-1 overflow-x-auto">
                      {fotosDe(p.id).map((f: any) => (
                        <button key={f.id} onClick={() => setFotoForId(f.id)} className="flex-shrink-0">
                          <img src={f.thumbnail_url || f.url} alt="" className="w-14 h-14 rounded-lg object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer fixo: resumo + enviar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600 font-bold"><Check size={12} />{totalOk}</span>
            <span className="flex items-center gap-1 text-red-600 font-bold"><X size={12} />{totalNaoOk}</span>
            <span className="text-gray-400 font-bold">N/A {totalNa}</span>
          </div>
          <button
            onClick={() => setShowResumo(true)}
            disabled={respondidos === 0}
            className={clsx('px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 active:scale-95 transition-all',
              respondidos === 0 ? 'bg-gray-200 text-gray-400' : 'bg-brand-green text-white')}
          >
            Enviar <Send size={14} />
          </button>
        </div>
      </div>

      {/* Modais */}
      {showMsg && <MensagemModal visitaId={visitaId ?? ''} onClose={() => setShowMsg(false)} />}

      {pendForm && (
        <PendenciaModal
          onClose={() => setPendForm(null)}
          onSalvar={async (data) => {
            try {
              await criarPendMut.mutateAsync({ ...data, pergunta_id: pendForm.perguntaId })
              toast.success('Pendência criada')
              setPendForm(null)
            } catch (err: any) { toast.error(extrairErro(err, 'Erro ao criar pendência.')) }
          }}
        />
      )}

      {fotoForId && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex justify-between items-center px-4 pt-12 pb-3 safe-top">
            <button onClick={() => setFotoForId(null)} className="text-white/70 p-2"><X size={24} /></button>
            <button
              onClick={async () => { try { await excluirFoto.mutateAsync(fotoForId); setFotoForId(null) } catch (e: any) { toast.error(extrairErro(e, 'Erro')) } }}
              className="text-red-400 p-2"
            ><Trash2 size={20} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={(Array.isArray(fotos) ? fotos.find((f: any) => f.id === fotoForId)?.url : '')} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

function PendenciaModal({ onClose, onSalvar }: { onClose: () => void; onSalvar: (d: any) => void }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [salvando, setSalvando] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Nova pendência</h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X size={20} /></button>
        </div>
        <input className="input" placeholder="Título *" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea className="input resize-none" rows={2} placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <select className="input" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        <button
          onClick={async () => { if (!titulo.trim()) { toast.error('Título obrigatório'); return } setSalvando(true); await onSalvar({ titulo, descricao, prioridade }); setSalvando(false) }}
          disabled={salvando}
          className="btn-primary w-full"
        >
          {salvando ? <><Loader2 size={16} className="animate-spin" /> Salvando</> : <><Plus size={16} /> Criar pendência</>}
        </button>
      </div>
    </div>
  )
}
