import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVisita, useCategorias, useRespostas, useTemplate, useAllPerguntas, useAlterarStatusVisita } from '../api/hooks'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Check, X, Mic, MicOff,
  ChevronLeft, ChevronRight, Send, Pause,
  CheckCircle, XCircle, AlertTriangle, Minus, Loader2, Star
} from 'lucide-react'
import clsx from 'clsx'
import VoiceButton from '../components/VoiceButton'

type Resultado = 'ok' | 'nao_ok' | 'na' | null

interface Resposta {
  id?: string
  resultado: Resultado
  observacao: string
  transcricao_corrigida?: string
  gravando?: boolean
  avaliacao?: number
}

export default function ChecklistPage() {
  const { id: visitaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: visita } = useVisita(visitaId ?? '')
  const { data: cats = [] } = useCategorias()
  const { data: resps = [] } = useRespostas(visitaId ?? '')
  const { data: templateData } = useTemplate(visita?.template_id)
  const { data: allPerguntasGlobais = [] } = useAllPerguntas(!visita?.template_id && !!visita)
  const statusMut = useAlterarStatusVisita(visitaId ?? '')

  const [categorias, setCategorias] = useState<any[]>([])
  const [template, setTemplate] = useState<any>(null)
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState('')
  const [showObs, setShowObs] = useState(false)
  const [showResumo, setShowResumo] = useState(false)
  const [showConfirmacao, setShowConfirmacao] = useState(false)
  const [obsFinal, setObsFinal] = useState('')
  const [acao, setAcao] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Auto-start visita if nao_iniciada
  useEffect(() => {
    if (visita?.status === 'nao_iniciada') {
      statusMut.mutateAsync({ acao: 'iniciar' }).catch(() => {})
    }
  }, [visita?.status])

  useEffect(() => { if (cats.length > 0) setCategorias(cats) }, [cats])
  useEffect(() => { if (templateData) setTemplate(templateData) }, [templateData])

  // Modo livre: sem template, usar todas as perguntas globais
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
          transcricao_corrigida: r.transcricao_corrigida,
        }
      })
      setRespostas(map)
    }
  }, [resps])

  // Auto-navigate to first unanswered question
  useEffect(() => {
    if (template && resps.length > 0) {
      const allPerguntas = template.perguntas || []
      const firstUnanswered = allPerguntas.findIndex((p: any) => {
        const r = resps.find((resp: any) => resp.pergunta_id === p.id)
        return !r?.resultado
      })
      if (firstUnanswered > 0) setCurrentIndex(firstUnanswered)
    }
  }, [template, resps])

  // All questions flat list
  const allPerguntas: any[] = template?.perguntas || []
  const totalPerguntas = allPerguntas.length
  const perguntaAtual = allPerguntas[currentIndex]
  const categoriaAtual = perguntaAtual ? categorias.find((c: any) => c.id === perguntaAtual.categoria_id) : null
  const respAtual = perguntaAtual ? (respostas[perguntaAtual.id] || { resultado: null, observacao: '', gravando: false }) : null

  const totalRespondidos = allPerguntas.filter((p: any) => respostas[p.id]?.resultado).length
  const progresso = totalPerguntas > 0 ? (totalRespondidos / totalPerguntas) * 100 : 0

  // Find category name for current question + detect category change
  const prevPergunta = currentIndex > 0 ? allPerguntas[currentIndex - 1] : null
  const isCategoryChange = perguntaAtual && prevPergunta && perguntaAtual.categoria_id !== prevPergunta.categoria_id
  const isFirstQuestion = currentIndex === 0

  const salvarResposta = async (perguntaId: string, resultado: Resultado, observacao?: string, extra?: any) => {
    setSaving(perguntaId)
    try {
      const body = {
        visita_id: visitaId, pergunta_id: perguntaId, resultado,
        observacao: observacao ?? respostas[perguntaId]?.observacao ?? '',
        ...extra,
      }
      await api.post('/checklist/respostas', body)
      setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], ...body } }))
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao salvar resposta.')) }
    finally { setSaving('') }
  }

  const responderEAvancar = useCallback(async (resultado: Resultado) => {
    if (!perguntaAtual) return
    await salvarResposta(perguntaAtual.id, resultado)
    // Auto advance after answering
    setTimeout(() => {
      if (currentIndex < totalPerguntas - 1) {
        setCurrentIndex((i) => i + 1)
        setShowObs(false)
      } else {
        setShowResumo(true)
      }
    }, 400)
  }, [perguntaAtual, currentIndex, totalPerguntas])

  const irAnterior = () => { if (currentIndex > 0) { setCurrentIndex((i) => i - 1); setShowObs(false) } }
  const irProxima = () => {
    if (currentIndex < totalPerguntas - 1) { setCurrentIndex((i) => i + 1); setShowObs(false) }
    else setShowResumo(true)
  }

  const iniciarGravacao = (perguntaId: string) => {
    const SR = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
    if (!SR) { toast.error('Navegador não suporta reconhecimento de voz'); return }
    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let final = '', interim = ''
      for (const result of Array.from<any>(event.results)) {
        const t = result[0].transcript
        if (result.isFinal) final += t; else interim += t
      }
      const combined = (final + interim).trim()
      if (combined) {
        setRespostas((prev) => ({
          ...prev, [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), observacao: combined },
        }))
      }
    }
    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') toast.error('Erro no microfone')
      setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
      recognitionRef.current = null
    }
    recognition.start()
    recognitionRef.current = recognition
    setRespostas((prev) => ({ ...prev, [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), gravando: true } }))
  }

  const pararGravacao = (perguntaId: string) => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
  }

  const handlePausar = async () => {
    setAcao('pausar')
    try {
      await statusMut.mutateAsync({ acao: 'pausar' })
      toast.success('Vistoria pausada')
      navigate('/')
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao pausar vistoria.')) }
    finally { setAcao('') }
  }

  const handleFinalizar = async () => {
    setAcao('finalizar')
    try {
      await statusMut.mutateAsync({ acao: 'finalizar', body: { observacoes: obsFinal } })
      setShowResumo(false)
      setShowConfirmacao(true)
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao finalizar vistoria.')) }
    finally { setAcao('') }
  }

  // ── Tela de confirmação ──
  if (showConfirmacao) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vistoria enviada!</h1>
        <p className="text-white/60 mb-2">Protocolo: #{visita?.protocolo}</p>
        <p className="text-white/60 text-sm mb-8">{visita?.condominio_nome}</p>
        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-xs">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'ok').length}</div>
            <div className="text-[10px] text-white/50">Conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'nao_ok').length}</div>
            <div className="text-[10px] text-white/50">Não conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'na').length}</div>
            <div className="text-[10px] text-white/50">N/A</div>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary w-full max-w-xs text-base py-3">
          <ArrowLeft size={18} /> Voltar ao início
        </button>
      </div>
    )
  }

  // ── Tela de resumo (após última pergunta) ──
  if (showResumo) {
    const totalOk = allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'ok').length
    const totalNaoOk = allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'nao_ok').length
    const totalNa = allPerguntas.filter((p: any) => respostas[p.id]?.resultado === 'na').length
    const totalSemResposta = totalPerguntas - totalRespondidos

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-brand-navy text-white px-4 pt-12 pb-5">
          <div className="font-bold text-xl text-center">
            {totalRespondidos === totalPerguntas ? '✅ Vistoria completa' : `${totalRespondidos}/${totalPerguntas} respondidas`}
          </div>
          <p className="text-white/60 text-sm text-center mt-1">{visita?.condominio_nome}</p>
        </div>

        <div className="flex-1 px-4 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <CheckCircle size={24} className="mx-auto text-green-500 mb-1" />
              <div className="text-2xl font-bold text-green-600">{totalOk}</div>
              <div className="text-xs text-gray-500">Conforme</div>
            </div>
            <div className="card p-4 text-center">
              <XCircle size={24} className="mx-auto text-red-500 mb-1" />
              <div className="text-2xl font-bold text-red-600">{totalNaoOk}</div>
              <div className="text-xs text-gray-500">Não conforme</div>
            </div>
            <div className="card p-4 text-center">
              <Minus size={24} className="mx-auto text-gray-400 mb-1" />
              <div className="text-2xl font-bold text-gray-500">{totalNa}</div>
              <div className="text-xs text-gray-500">N/A</div>
            </div>
          </div>

          {totalSemResposta > 0 && (
            <div className="card p-4 bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <AlertTriangle size={16} />
                {totalSemResposta} pergunta(s) sem resposta
              </div>
              <button
                onClick={() => {
                  // Go to first unanswered
                  const idx = allPerguntas.findIndex((p: any) => !respostas[p.id]?.resultado)
                  if (idx >= 0) { setCurrentIndex(idx); setShowResumo(false) }
                }}
                className="text-amber-700 text-xs font-semibold underline mt-1"
              >
                Responder agora
              </button>
            </div>
          )}

          <div>
            <label htmlFor="obs-final" className="text-sm font-semibold text-gray-700 block mb-2">Observação final</label>
            <textarea
              id="obs-final"
              value={obsFinal} onChange={(e) => setObsFinal(e.target.value)}
              placeholder="Alguma observação geral? (opcional)"
              className="input resize-none text-sm" rows={3}
            />
            <VoiceButton
              onTranscription={(t) => setObsFinal(t)}
              append
              currentValue={obsFinal}
              className="mt-2 w-full py-3"
            />
          </div>

          <button
            onClick={handleFinalizar}
            disabled={!!acao}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            {acao === 'finalizar' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Enviar para aprovação
          </button>

          <button
            onClick={() => { setShowResumo(false); setCurrentIndex(0) }}
            className="w-full text-center text-sm text-brand-navy font-semibold py-2"
          >
            ← Revisar respostas
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ──
  if (!template || !perguntaAtual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-navy" />
      </div>
    )
  }

  const isGravando = respAtual?.gravando
  const isSaving = saving === perguntaAtual.id

  // ── Quiz Mode: uma pergunta por vez ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header compacto */}
      <div className="bg-brand-navy text-white px-4 pt-11 pb-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(`/visita/${visitaId}`)} className="text-white/60 text-sm flex items-center gap-1">
            <ArrowLeft size={16} /> {visita?.condominio_nome}
          </button>
          <button onClick={handlePausar} disabled={!!acao} className="text-white/60 text-sm flex items-center gap-1 hover:text-white">
            <Pause size={14} /> Pausar
          </button>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <span className="text-xs text-white/60 font-medium whitespace-nowrap">
            {totalRespondidos}/{totalPerguntas}
          </span>
        </div>
      </div>

      {/* Body: uma pergunta */}
      <div className="flex-1 flex flex-col px-5 py-5">
        {/* Category label */}
        {(isFirstQuestion || isCategoryChange) && categoriaAtual && (
          <div className="text-xs font-bold text-brand-navy uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-brand-navy rounded-full" />
            {categoriaAtual.nome}
          </div>
        )}

        {/* Question number */}
        <div className="text-xs text-gray-400 mb-2">Pergunta {currentIndex + 1} de {totalPerguntas}</div>

        {/* Question text */}
        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-8">{perguntaAtual.texto}</h2>

        {/* SIM / NÃO buttons - big and clear */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => responderEAvancar('ok')}
            disabled={isSaving}
            className={clsx(
              'py-6 rounded-2xl text-lg font-bold border-3 transition-all active:scale-95 flex flex-col items-center gap-1',
              respAtual?.resultado === 'ok'
                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
            )}
          >
            <Check size={28} strokeWidth={3} />
            SIM
          </button>
          <button
            onClick={() => responderEAvancar('nao_ok')}
            disabled={isSaving}
            className={clsx(
              'py-6 rounded-2xl text-lg font-bold border-3 transition-all active:scale-95 flex flex-col items-center gap-1',
              respAtual?.resultado === 'nao_ok'
                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
            )}
          >
            <X size={28} strokeWidth={3} />
            NÃO
          </button>
        </div>

        {/* N/A small link */}
        <button
          onClick={() => responderEAvancar('na')}
          className={clsx(
            'text-xs font-medium mx-auto block mb-6',
            respAtual?.resultado === 'na' ? 'text-gray-700 underline' : 'text-gray-400'
          )}
        >
          Não se aplica
        </button>

        {/* Star rating */}
        {perguntaAtual?.requer_avaliacao && (
          <div className="mb-6">
            <p className="text-xs text-gray-500 font-medium text-center mb-2">Avaliação</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={async () => {
                    const newVal = (respAtual as any)?.avaliacao === star ? 0 : star
                    await salvarResposta(perguntaAtual.id, respAtual?.resultado ?? 'ok', undefined, { avaliacao: newVal })
                  }}
                  className="p-1 transition-transform active:scale-110"
                >
                  <Star
                    size={32}
                    className={clsx(
                      'transition-colors',
                      (respAtual as any)?.avaliacao >= star
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            {(respAtual as any)?.avaliacao > 0 && (
              <p className="text-center text-sm font-bold text-yellow-600 mt-1">{(respAtual as any).avaliacao}/5</p>
            )}
          </div>
        )}

        {/* Voice + Photo big buttons */}
        <div className="space-y-3 mt-auto">
          {/* Voice */}
          <button
            onClick={() => isGravando ? pararGravacao(perguntaAtual.id) : iniciarGravacao(perguntaAtual.id)}
            className={clsx(
              'w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98]',
              isGravando ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30' : 'bg-red-100 text-red-600 hover:bg-red-200'
            )}
          >
            {isGravando ? <><MicOff size={24} /> Parar ditado</> : <><Mic size={24} /> 🎤 Ditar observação</>}
          </button>

          {/* Show/hide text observation */}
          {!showObs && !respAtual?.observacao ? (
            <button
              onClick={() => setShowObs(true)}
              className="w-full text-center text-xs text-gray-400 py-2"
            >
              Escrever observação...
            </button>
          ) : (
            <textarea
              value={respAtual?.observacao || ''}
              onChange={(e) => {
                setRespostas((prev) => ({ ...prev, [perguntaAtual.id]: { ...prev[perguntaAtual.id] || { resultado: null, observacao: '' }, observacao: e.target.value } }))
              }}
              onBlur={() => respAtual?.resultado && salvarResposta(perguntaAtual.id, respAtual.resultado, respAtual.observacao)}
              placeholder="Observação..."
              className="input text-sm resize-none"
              rows={2}
              autoFocus={showObs}
            />
          )}

          {respAtual?.transcricao_corrigida && (
            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 italic">
              🤖 IA: "{respAtual.transcricao_corrigida}"
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="px-5 pb-5 pt-2 flex items-center gap-3">
        <button
          onClick={irAnterior}
          disabled={currentIndex === 0}
          className={clsx(
            'flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1 transition-all active:scale-[0.98]',
            currentIndex === 0 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600'
          )}
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <button
          onClick={irProxima}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1 bg-brand-navy text-white active:scale-[0.98] transition-all"
        >
          {currentIndex === totalPerguntas - 1 ? 'Finalizar' : 'Próxima'} <ChevronRight size={18} />
        </button>
      </div>

      {isSaving && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
          Salvando...
        </div>
      )}
    </div>
  )
}
