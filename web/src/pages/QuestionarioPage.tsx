import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import SeoHead from '../components/SeoHead'
import {
  Check, X, Mic, MicOff, ChevronLeft, ChevronRight, Send,
  CheckCircle, XCircle, AlertTriangle, Minus, Loader2, ClipboardCheck,
  Camera, MapPin, User, Clock, Navigation, Save, ArrowLeft
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { extrairErro } from '../api/erros'

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api/v1/publico/vistoria`,
  timeout: 30_000,
})

const UPLOAD_API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api/v1/publico/vistoria`,
  timeout: 60_000,
})

type Resultado = 'ok' | 'nao_ok' | 'na' | null

interface Resposta {
  resultado: Resultado
  observacao: string
  transcricao_corrigida?: string
  gravando?: boolean
}

export default function QuestionarioPage() {
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visita, setVisita] = useState<any>(null)
  const [perguntas, setPerguntas] = useState<any[]>([])
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState('')
  const [showObs, setShowObs] = useState(false)
  const [showResumo, setShowResumo] = useState(false)
  const [showConfirmacao, setShowConfirmacao] = useState(false)
  const [obsFinal, setObsFinal] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [fotos, setFotos] = useState<Record<string, any[]>>({})
  const [uploading, setUploading] = useState(false)
  const [fotoAmpliar, setFotoAmpliar] = useState<string | null>(null)
  const [etapaIdentificacao, setEtapaIdentificacao] = useState(false)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [geoIdent, setGeoIdent] = useState<{ lat: number; lng: number } | null>(null)
  const [enviandoIdent, setEnviandoIdent] = useState(false)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const [layoutMode, setLayoutMode] = useState<'quiz' | 'lista'>('quiz')
  const [tituloVisita, setTituloVisita] = useState('')
  const [obsGerais, setObsGerais] = useState('')
  const [salvandoInfo, setSalvandoInfo] = useState(false)

  // Carrega dados
  useEffect(() => {
    if (!id) return
    API.get(`/${id}`).then(({ data }) => {
      setVisita(data.visita)
      setPerguntas(data.perguntas)
      if (data.visita.layout_questionario === 'lista') setLayoutMode('lista')
      setTituloVisita(data.visita.titulo || '')
      setObsGerais(data.visita.observacoes_gerais || '')
      const map: Record<string, Resposta> = {}
      data.respostas.forEach((r: any) => {
        map[r.pergunta_id] = { resultado: r.resultado, observacao: r.observacao || '', transcricao_corrigida: r.transcricao_corrigida }
      })
      setRespostas(map)
      // Group photos by resposta_id → pergunta_id
      const fotosMap: Record<string, any[]> = {}
      if (data.fotos) {
        for (const f of data.fotos) {
          const resp = data.respostas.find((r: any) => r.id === f.resposta_id)
          const pId = resp?.pergunta_id || '__geral__'
          if (!fotosMap[pId]) fotosMap[pId] = []
          fotosMap[pId].push(f)
        }
      }
      setFotos(fotosMap)
      // Show identification step if not yet done
      if (!data.visita.selfie_url) {
        setEtapaIdentificacao(true)
      }
      // Navigate to first unanswered
      if (data.respostas.length > 0) {
        const idx = data.perguntas.findIndex((p: any) => !data.respostas.some((r: any) => r.pergunta_id === p.id && r.resultado))
        if (idx > 0) setCurrentIndex(idx)
      }
      setLoading(false)
    }).catch(() => {
      setError('Vistoria não encontrada ou link inválido.')
      setLoading(false)
    })
  }, [id])

  // Auto-iniciar se nao_iniciada
  useEffect(() => {
    if (visita?.status === 'nao_iniciada') {
      API.patch(`/${id}/iniciar`).then(({ data }) => {
        setVisita((v: any) => ({ ...v, status: data.status, iniciada_em: data.iniciada_em }))
      }).catch(() => {})
    }
  }, [visita?.status])

  // Capture geolocation for identification
  useEffect(() => {
    if (etapaIdentificacao && !geoIdent && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGeoIdent({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      )
    }
  }, [etapaIdentificacao])

  const abrirCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraAtiva(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      toast.error('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  const fecharCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraAtiva(false)
  }

  const capturarSelfie = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      setSelfieFile(file)
      setSelfiePreview(canvas.toDataURL('image/jpeg', 0.92))
      fecharCamera()
    }, 'image/jpeg', 0.92)
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const handleEnviarIdentificacao = async () => {
    if (!selfieFile || !id) return
    setEnviandoIdent(true)
    try {
      const formData = new FormData()
      formData.append('selfie', selfieFile)
      if (geoIdent) {
        formData.append('localizacao_lat', geoIdent.lat.toString())
        formData.append('localizacao_lng', geoIdent.lng.toString())
      }
      const { data } = await UPLOAD_API.post(`/${id}/identificacao`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setVisita((v: any) => ({ ...v, ...data }))
      setEtapaIdentificacao(false)
      toast.success('Identificação registrada!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar identificação.'))
    } finally {
      setEnviandoIdent(false)
    }
  }

  // Save general info (list mode)
  const salvarInfoGerais = async () => {
    if (!id) return
    setSalvandoInfo(true)
    try {
      await API.post(`/${id}/resposta`, { pergunta_id: '__info__', resultado: null, observacao: obsGerais })
        .catch(() => {}) // ignore if no __info__ pergunta
      // Save title + obs on finalize body (stored on visita)
      await API.patch(`/${id}/iniciar`).catch(() => {}) // ensure started
      toast.success('Informações salvas')
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao salvar.')) }
    finally { setSalvandoInfo(false) }
  }

  // group questions by category for list mode
  const categorias = perguntas.reduce<{ nome: string; id: string; perguntas: any[] }[]>((acc, p) => {
    let cat = acc.find(c => c.id === p.categoria_id)
    if (!cat) { cat = { id: p.categoria_id, nome: p.categoria_nome, perguntas: [] }; acc.push(cat) }
    cat.perguntas.push(p)
    return acc
  }, [])

  const perguntaAtual = perguntas[currentIndex]
  const totalPerguntas = perguntas.length
  const totalRespondidos = perguntas.filter(p => respostas[p.id]?.resultado).length
  const progresso = totalPerguntas > 0 ? (totalRespondidos / totalPerguntas) * 100 : 0

  // Category change detection
  const prevPergunta = currentIndex > 0 ? perguntas[currentIndex - 1] : null
  const isCategoryChange = perguntaAtual && prevPergunta && perguntaAtual.categoria_id !== prevPergunta.categoria_id
  const isFirstQuestion = currentIndex === 0

  const salvarResposta = async (perguntaId: string, resultado: Resultado, observacao?: string) => {
    setSaving(perguntaId)
    try {
      await API.post(`/${id}/resposta`, {
        pergunta_id: perguntaId,
        resultado,
        observacao: observacao ?? respostas[perguntaId]?.observacao ?? '',
      })
      setRespostas(prev => ({
        ...prev,
        [perguntaId]: { ...prev[perguntaId], resultado, observacao: observacao ?? prev[perguntaId]?.observacao ?? '' }
      }))
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao salvar.')) }
    finally { setSaving('') }
  }

  const responderEAvancar = useCallback(async (resultado: Resultado) => {
    if (!perguntaAtual) return
    await salvarResposta(perguntaAtual.id, resultado)
    setTimeout(() => {
      if (currentIndex < totalPerguntas - 1) {
        setCurrentIndex(i => i + 1)
        setShowObs(false)
      } else {
        setShowResumo(true)
      }
    }, 400)
  }, [perguntaAtual, currentIndex, totalPerguntas])

  const irAnterior = () => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setShowObs(false) } }
  const irProxima = () => {
    if (currentIndex < totalPerguntas - 1) { setCurrentIndex(i => i + 1); setShowObs(false) }
    else setShowResumo(true)
  }

  // Voice recording
  const iniciarGravacao = (perguntaId: string) => {
    const SR = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
    if (!SR) { toast.error('Navegador não suporta reconhecimento de voz'); return }
    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let final = '', interim = ''
      for (const result of event.results) {
        const t = result[0].transcript
        if (result.isFinal) final += t; else interim += t
      }
      const combined = (final + interim).trim()
      if (combined) {
        setRespostas(prev => ({
          ...prev,
          [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), observacao: combined },
        }))
      }
    }
    recognition.onerror = () => {
      setRespostas(prev => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setRespostas(prev => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
      recognitionRef.current = null
    }
    recognition.start()
    recognitionRef.current = recognition
    setRespostas(prev => ({ ...prev, [perguntaId]: { ...(prev[perguntaId] || { resultado: null, observacao: '' }), gravando: true } }))
  }

  const pararGravacao = (perguntaId: string) => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRespostas(prev => ({ ...prev, [perguntaId]: { ...prev[perguntaId], gravando: false } }))
  }

  // Get geolocation
  const obterLocalizacao = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      )
    })
  }

  // Photo upload
  const handleUploadFotos = async (files: FileList, perguntaId: string) => {
    if (!id || files.length === 0) return
    setUploading(true)
    try {
      // Capture geolocation
      const loc = await obterLocalizacao()

      // First ensure resposta exists
      const resp = respostas[perguntaId]
      let respostaResult: any = null
      if (resp?.resultado) {
        const { data } = await API.post(`/${id}/resposta`, {
          pergunta_id: perguntaId,
          resultado: resp.resultado,
          observacao: resp.observacao || '',
        })
        respostaResult = data
      }

      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('fotos', f))
      if (respostaResult?.id) formData.append('resposta_id', respostaResult.id)
      if (loc) {
        formData.append('localizacao_lat', loc.lat.toString())
        formData.append('localizacao_lng', loc.lng.toString())
      }

      const { data: novasFotos } = await UPLOAD_API.post(`/${id}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setFotos(prev => ({
        ...prev,
        [perguntaId]: [...(prev[perguntaId] || []), ...novasFotos],
      }))
      const locMsg = loc ? ' (📍 localização registrada)' : ''
      toast.success(`${novasFotos.length} foto(s) anexada(s)${locMsg}`)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar foto.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExcluirFoto = async (perguntaId: string, fotoId: string) => {
    try {
      await UPLOAD_API.delete(`/${id}/foto/${fotoId}`)
      setFotos(prev => ({
        ...prev,
        [perguntaId]: (prev[perguntaId] || []).filter(f => f.id !== fotoId),
      }))
      toast.success('Foto removida')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao remover foto.'))
    }
  }

  const handleFinalizar = async () => {
    setFinalizando(true)
    try {
      await API.patch(`/${id}/finalizar`, { observacoes: obsFinal })
      setShowResumo(false)
      setShowConfirmacao(true)
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao finalizar.')) }
    finally { setFinalizando(false) }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1D35] flex flex-col items-center justify-center text-white">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="text-white/60">Carregando questionário...</p>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={48} className="text-orange-400 mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Ops!</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  // ── Already finalized ──
  if (visita && ['aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida'].includes(visita.status)) {
    const totalOk = perguntas.filter(p => respostas[p.id]?.resultado === 'ok').length
    const totalNaoOk = perguntas.filter(p => respostas[p.id]?.resultado === 'nao_ok').length
    const totalNa = perguntas.filter(p => respostas[p.id]?.resultado === 'na').length
    return (
      <div className="min-h-screen bg-[#0B1D35] flex flex-col items-center justify-center px-6 text-center text-white">
        <Toaster position="top-center" />
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vistoria finalizada</h1>
        <p className="text-white/60 mb-1">Protocolo: #{visita.protocolo}</p>
        <p className="text-white/60 text-sm mb-8">{visita.condominio_nome}</p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{totalOk}</div>
            <div className="text-[10px] text-white/50">Conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{totalNaoOk}</div>
            <div className="text-[10px] text-white/50">Não conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{totalNa}</div>
            <div className="text-[10px] text-white/50">N/A</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Identification screen (selfie + location) ──
  if (etapaIdentificacao && visita) {
    const agora = new Date()
    const dataFormatada = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1D35] to-[#091627] flex flex-col text-white">
        <Toaster position="top-center" />

        {/* Header */}
        <div className="px-5 pt-12 pb-4 text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-white/80" />
          </div>
          <h1 className="text-xl font-bold">Identificação do Funcionário</h1>
          <p className="text-white/50 text-sm mt-1">Registre sua presença antes de iniciar</p>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4">
          {/* Info cards */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ClipboardCheck size={18} className="text-emerald-300 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Vistoria</div>
                <div className="text-sm font-medium">{visita.titulo || `#${visita.protocolo}`}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Navigation size={18} className="text-green-300 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Local</div>
                <div className="text-sm font-medium">{visita.condominio_nome}</div>
                <div className="text-xs text-white/50">{visita.endereco}{visita.cidade ? `, ${visita.cidade}` : ''}{visita.estado ? ` - ${visita.estado}` : ''}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-300" />
                <span className="text-sm">{dataFormatada} às {horaFormatada}</span>
              </div>
              {geoIdent ? (
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <MapPin size={14} />
                  <span>GPS ativo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs animate-pulse">
                  <MapPin size={14} />
                  <span>Obtendo GPS...</span>
                </div>
              )}
            </div>
          </div>

          {/* Selfie capture */}
          <div className="text-center space-y-3">
            <p className="text-sm text-white/60">Tire uma selfie para confirmar sua identidade</p>
            <p className="text-xs text-white/40">A foto deve ser tirada ao vivo pela câmera</p>

            <canvas ref={canvasRef} className="hidden" />

            {cameraAtiva && (
              <div className="relative mx-auto w-56 h-56 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <button
                  onClick={capturarSelfie}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-[#0B1D35] rounded-full p-3 shadow-lg active:scale-90 transition-transform"
                >
                  <Camera size={24} />
                </button>
              </div>
            )}
            {!cameraAtiva && selfiePreview && (
                <div className="relative mx-auto w-48 h-48">
                  <img
                    src={selfiePreview}
                    alt="Selfie"
                    className="w-48 h-48 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                  />
                  <button
                    onClick={() => { setSelfiePreview(null); setSelfieFile(null); abrirCamera() }}
                    className="absolute -bottom-1 -right-1 bg-white text-[#0B1D35] rounded-full p-2 shadow-lg"
                  >
                    <Camera size={18} />
                  </button>
                </div>
            )}
            {!cameraAtiva && !selfiePreview && (
                <button
                  onClick={abrirCamera}
                  className="mx-auto w-48 h-48 rounded-full border-4 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition-all active:scale-95"
                >
                  <Camera size={40} className="text-white/40" />
                  <span className="text-sm text-white/40">Abrir câmera</span>
                </button>
            )}
          </div>

          {/* Supervisor name */}
          <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-white/40 mb-0.5">Funcionário</div>
            <div className="text-sm font-medium">{visita.supervisor_nome}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleEnviarIdentificacao}
            disabled={!selfieFile || enviandoIdent}
            className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 active:scale-[0.97] transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {enviandoIdent ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} strokeWidth={3} />}
            Confirmar e iniciar vistoria
          </button>
          {!selfieFile && (
            <p className="text-center text-xs text-white/30 mt-2">Tire a selfie para liberar o botão</p>
          )}
        </div>
      </div>
    )
  }

  // ── Confirmation screen ──
  if (showConfirmacao) {
    const totalOk = perguntas.filter(p => respostas[p.id]?.resultado === 'ok').length
    const totalNaoOk = perguntas.filter(p => respostas[p.id]?.resultado === 'nao_ok').length
    const totalNa = perguntas.filter(p => respostas[p.id]?.resultado === 'na').length
    return (
      <div className="min-h-screen bg-[#0B1D35] flex flex-col items-center justify-center px-6 text-center text-white">
        <Toaster position="top-center" />
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vistoria enviada!</h1>
        <p className="text-white/60 mb-1">Protocolo: #{visita?.protocolo}</p>
        <p className="text-white/60 text-sm mb-8">{visita?.condominio_nome}</p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-8">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{totalOk}</div>
            <div className="text-[10px] text-white/50">Conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{totalNaoOk}</div>
            <div className="text-[10px] text-white/50">Não conforme</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{totalNa}</div>
            <div className="text-[10px] text-white/50">N/A</div>
          </div>
        </div>
        <p className="text-white/40 text-xs mb-8">As respostas foram enviadas para o administrador.</p>
        <button
          onClick={() => window.close()}
          className="px-8 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all"
        >
          Sair da vistoria
        </button>
      </div>
    )
  }

  // ── Summary screen ──
  if (showResumo) {
    const totalOk = perguntas.filter(p => respostas[p.id]?.resultado === 'ok').length
    const totalNaoOk = perguntas.filter(p => respostas[p.id]?.resultado === 'nao_ok').length
    const totalNa = perguntas.filter(p => respostas[p.id]?.resultado === 'na').length
    const totalSemResposta = totalPerguntas - totalRespondidos

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Toaster position="top-center" />
        <div className="bg-[#0B1D35] text-white px-4 pt-12 pb-5">
          <div className="font-bold text-xl text-center">
            {totalRespondidos === totalPerguntas ? '✅ Vistoria completa' : `${totalRespondidos}/${totalPerguntas} respondidas`}
          </div>
          <p className="text-white/60 text-sm text-center mt-1">{visita?.condominio_nome}</p>
        </div>

        <div className="flex-1 px-4 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <CheckCircle size={24} className="mx-auto text-green-500 mb-1" />
              <div className="text-2xl font-bold text-green-600">{totalOk}</div>
              <div className="text-xs text-gray-500">Conforme</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <XCircle size={24} className="mx-auto text-red-500 mb-1" />
              <div className="text-2xl font-bold text-red-600">{totalNaoOk}</div>
              <div className="text-xs text-gray-500">Não conforme</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <Minus size={24} className="mx-auto text-gray-400 mb-1" />
              <div className="text-2xl font-bold text-gray-500">{totalNa}</div>
              <div className="text-xs text-gray-500">N/A</div>
            </div>
          </div>

          {totalSemResposta > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                <AlertTriangle size={16} />
                {totalSemResposta} pergunta(s) sem resposta
              </div>
              <button
                onClick={() => {
                  const idx = perguntas.findIndex(p => !respostas[p.id]?.resultado)
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
              value={obsFinal} onChange={e => setObsFinal(e.target.value)}
              placeholder="Alguma observação geral? (opcional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-[#0B1D35] focus:border-transparent outline-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleFinalizar}
            disabled={finalizando}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {finalizando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Enviar para aprovação
          </button>

          <button
            onClick={() => { setShowResumo(false); setCurrentIndex(0) }}
            className="w-full text-center text-sm text-[#0B1D35] font-semibold py-2"
          >
            ← Revisar respostas
          </button>
        </div>
      </div>
    )
  }

  // ── No template ──
  if (perguntas.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <Toaster position="top-center" />
        <AlertTriangle size={48} className="text-orange-400 mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sem checklist</h2>
        <p className="text-sm text-gray-500">Esta vistoria não tem perguntas associadas.</p>
      </div>
    )
  }

  // ── Loading question ──
  if (!perguntaAtual) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0B1D35]" />
      </div>
    )
  }

  const respAtual = respostas[perguntaAtual.id] || { resultado: null, observacao: '', gravando: false }
  const isGravando = respAtual.gravando
  const isSaving = saving === perguntaAtual.id

  // ── List Mode: all questions visible ──
  if (layoutMode === 'lista') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-4 shadow-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ArrowLeft size={18} className="text-gray-400" />
                <h1 className="text-lg font-bold text-gray-900 truncate">{visita?.condominio_nome?.toUpperCase()}</h1>
              </div>
              <span className="text-xs font-medium text-white bg-emerald-500 rounded-full px-3 py-1">{visita?.status === 'em_andamento' ? 'Em andamento' : visita?.status}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{visita?.status?.toUpperCase()} · {visita?.supervisor_nome}</p>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progresso do checklist</span>
                <span className="font-medium">{totalRespondidos}/{totalPerguntas} respondidas</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* General info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Informações gerais</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="titulo-visita" className="text-sm font-medium text-gray-700 block mb-1">Título da vistoria</label>
                <input
                  id="titulo-visita"
                  type="text"
                  value={tituloVisita}
                  onChange={e => setTituloVisita(e.target.value)}
                  placeholder="Ex: Vistoria mensal - Março"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label htmlFor="obs-gerais" className="text-sm font-medium text-gray-700 block mb-1">Observações gerais</label>
                <textarea
                  id="obs-gerais"
                  value={obsGerais}
                  onChange={e => setObsGerais(e.target.value)}
                  placeholder="Observações sobre a vistoria..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              {/* Voice button */}
              <button
                onClick={() => {
                  const SR = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
                  if (!SR) { toast.error('Navegador não suporta reconhecimento de voz'); return }
                  const recognition = new SR()
                  recognition.lang = 'pt-BR'
                  recognition.continuous = true
                  recognition.interimResults = true
                  recognition.onresult = (event: any) => {
                    let txt = ''
                    for (const result of event.results) txt += result[0].transcript
                    if (txt) setObsGerais(txt.trim())
                  }
                  recognition.start()
                  setTimeout(() => recognition.stop(), 30_000)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Mic size={16} /> 🎤 Ditar
              </button>
              <button
                onClick={salvarInfoGerais}
                disabled={salvandoInfo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {salvandoInfo ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar informações
              </button>
            </div>
          </div>

          {/* Questions by category */}
          {categorias.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                {cat.nome}
              </h3>
              <div className="space-y-5">
                {cat.perguntas.map((p: any, idx: number) => {
                  const resp = respostas[p.id] || { resultado: null, observacao: '', gravando: false }
                  const isSaved = !!resp.resultado
                  const isItemSaving = saving === p.id
                  const isItemGravando = resp.gravando

                  return (
                    <div key={p.id} className="space-y-2">
                      {/* Question header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-emerald-600">{idx + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{p.texto}</span>
                          </div>
                          {p.obrigatoria && <span className="text-xs text-red-500 ml-5">* Obrigatória</span>}
                        </div>
                        {isSaved && (
                          <span className="text-xs text-green-600 font-medium whitespace-nowrap flex items-center gap-1">
                            <Check size={12} /> salvo
                          </span>
                        )}
                      </div>

                      {/* Answer buttons */}
                      <div className="flex items-center gap-2 ml-5">
                        <button
                          onClick={() => salvarResposta(p.id, 'ok')}
                          disabled={isItemSaving}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                            resp.resultado === 'ok'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 text-gray-600 hover:border-green-400 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle size={16} /> Conforme
                        </button>
                        <button
                          onClick={() => salvarResposta(p.id, 'nao_ok')}
                          disabled={isItemSaving}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                            resp.resultado === 'nao_ok'
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'border-gray-300 text-gray-600 hover:border-red-400 hover:bg-red-50'
                          }`}
                        >
                          <XCircle size={16} /> Não conforme
                        </button>
                        <button
                          onClick={() => salvarResposta(p.id, 'na')}
                          disabled={isItemSaving}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                            resp.resultado === 'na'
                              ? 'bg-gray-500 border-gray-500 text-white'
                              : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Minus size={16} /> N/A
                        </button>
                      </div>

                      {/* Observation (shown after answering or if there's text) */}
                      {(isSaved || resp.observacao) && (
                        <div className="ml-5 space-y-2">
                          <textarea
                            value={resp.observacao || ''}
                            onChange={e => {
                              setRespostas(prev => ({
                                ...prev,
                                [p.id]: { ...(prev[p.id] || { resultado: null, observacao: '' }), observacao: e.target.value }
                              }))
                            }}
                            onBlur={() => resp.resultado && salvarResposta(p.id, resp.resultado, resp.observacao)}
                            placeholder="Observação sobre este item (opcional)..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                            rows={2}
                          />
                          {/* Voice dictation per question */}
                          <button
                            onClick={() => isItemGravando ? pararGravacao(p.id) : iniciarGravacao(p.id)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              isItemGravando
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {isItemGravando ? <><MicOff size={14} /> Parar</> : <><Mic size={14} /> 🎤 Ditar</>}
                          </button>
                        </div>
                      )}

                      {idx < cat.perguntas.length - 1 && <hr className="border-gray-100 mt-3" />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Footer: finalize */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900 mb-1">
                {totalRespondidos === totalPerguntas ? '✅ Todas as perguntas respondidas' : `${totalRespondidos} de ${totalPerguntas} respondidas`}
              </div>
              {totalRespondidos < totalPerguntas && (
                <p className="text-xs text-amber-600">Restam {totalPerguntas - totalRespondidos} pergunta(s) sem resposta</p>
              )}
            </div>
            <button
              onClick={handleFinalizar}
              disabled={finalizando}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {finalizando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Enviar para aprovação
            </button>
          </div>
        </div>

        {/* Fullscreen photo modal */}
        {fotoAmpliar && (
          <dialog
            open
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center w-full h-full border-0 m-0 max-w-none max-h-none"
          >
            <button className="absolute inset-0 bg-transparent border-0 cursor-default" onClick={() => setFotoAmpliar(null)} aria-label="Fechar" />
            <button onClick={() => setFotoAmpliar(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10">
              <X size={24} />
            </button>
            <img src={fotoAmpliar} alt="Foto ampliada" className="max-w-full max-h-full object-contain rounded-lg relative z-10" />
          </dialog>
        )}
      </div>
    )
  }

  // ── Quiz Mode: one question at a time ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SeoHead title="Questionário de Vistoria — X Vistoria" description="Responda ao questionário de vistoria condominial online." noindex />
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-[#0B1D35] text-white px-4 pt-10 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-white/60" />
            <span className="text-sm font-medium truncate max-w-[200px]">{visita?.condominio_nome}</span>
          </div>
          <span className="text-xs text-white/50 font-mono">#{visita?.protocolo}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <span className="text-xs text-white/60 font-medium whitespace-nowrap">
            {totalRespondidos}/{totalPerguntas}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 py-5">
        {/* Category label */}
        {(isFirstQuestion || isCategoryChange) && (
          <div className="text-xs font-bold text-[#0B1D35] uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#0B1D35] rounded-full" />
            {perguntaAtual.categoria_nome}
          </div>
        )}

        <div className="text-xs text-gray-400 mb-2">Pergunta {currentIndex + 1} de {totalPerguntas}</div>
        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-8">{perguntaAtual.texto}</h2>

        {/* SIM / NÃO buttons */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => responderEAvancar('ok')}
            disabled={isSaving}
            className={`py-6 rounded-2xl text-lg font-bold border-2 transition-all active:scale-95 flex flex-col items-center gap-1 ${
              respAtual.resultado === 'ok'
                ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <Check size={28} strokeWidth={3} />
            SIM
          </button>
          <button
            onClick={() => responderEAvancar('nao_ok')}
            disabled={isSaving}
            className={`py-6 rounded-2xl text-lg font-bold border-2 transition-all active:scale-95 flex flex-col items-center gap-1 ${
              respAtual.resultado === 'nao_ok'
                ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
            }`}
          >
            <X size={28} strokeWidth={3} />
            NÃO
          </button>
        </div>

        {/* N/A */}
        <button
          onClick={() => responderEAvancar('na')}
          className={`text-sm font-bold mx-auto block mb-6 ${
            respAtual.resultado === 'na' ? 'text-gray-700 underline' : 'text-gray-400'
          }`}
        >
          Não se aplica
        </button>

        {/* Voice + observation */}
        <div className="space-y-3 mt-auto">
          <button
            onClick={() => isGravando ? pararGravacao(perguntaAtual.id) : iniciarGravacao(perguntaAtual.id)}
            className={`w-full py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              isGravando
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            {isGravando ? <><MicOff size={24} /> Parar ditado</> : <><Mic size={24} /> 🎤 Ditar observação</>}
          </button>

          {!showObs && !respAtual.observacao ? (
            <button
              onClick={() => setShowObs(true)}
              className="w-full text-center text-xs text-gray-400 py-2"
            >
              Escrever observação...
            </button>
          ) : (
            <textarea
              value={respAtual.observacao || ''}
              onChange={e => {
                setRespostas(prev => ({
                  ...prev,
                  [perguntaAtual.id]: { ...(prev[perguntaAtual.id] || { resultado: null, observacao: '' }), observacao: e.target.value }
                }))
              }}
              onBlur={() => respAtual.resultado && salvarResposta(perguntaAtual.id, respAtual.resultado, respAtual.observacao)}
              placeholder="Observação..."
              className="w-full border-2 border-gray-900 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-[#0B1D35] focus:border-transparent outline-none"
              rows={2}
              autoFocus={showObs}
            />
          )}

          {respAtual.transcricao_corrigida && (
            <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-700 italic">
              🤖 IA: &ldquo;{respAtual.transcricao_corrigida}&rdquo;
            </div>
          )}

          {/* Photo attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={e => e.target.files && handleUploadFotos(e.target.files, perguntaAtual.id)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#0B1D35] to-[#132B4D] text-white shadow-lg shadow-[#0B1D35]/25 hover:shadow-xl hover:shadow-[#0B1D35]/30 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            Registrar foto
          </button>

          {/* Thumbnails */}
          {(fotos[perguntaAtual.id] || []).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {fotos[perguntaAtual.id].map((f: any) => (
                <div key={f.id} className="relative group">
                  <button type="button" className="p-0 border-0 bg-transparent" onClick={() => setFotoAmpliar(f.url)}>
                    <img src={f.thumbnail_url || f.url} alt="Foto" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    {f.localizacao_lat && (
                      <span className="absolute bottom-0.5 left-0.5 bg-green-500 rounded-full p-0.5">
                        <MapPin size={8} className="text-white" />
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleExcluirFoto(perguntaAtual.id, f.id)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen photo modal */}
      {fotoAmpliar && (
        <dialog
          open
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center w-full h-full border-0 m-0 max-w-none max-h-none"
        >
          <button className="absolute inset-0 bg-transparent border-0 cursor-default" onClick={() => setFotoAmpliar(null)} aria-label="Fechar" />
          <button onClick={() => setFotoAmpliar(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10">
            <X size={24} />
          </button>
          <img src={fotoAmpliar} alt="Foto ampliada" className="max-w-full max-h-full object-contain rounded-lg relative z-10" />
        </dialog>
      )}

      {/* Footer navigation */}
      <div className="px-5 pb-5 pt-2 flex items-center gap-3">
        <button
          onClick={irAnterior}
          disabled={currentIndex === 0}
          className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1 transition-all active:scale-[0.98] ${
            currentIndex === 0 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <button
          onClick={irProxima}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1 bg-[#0B1D35] text-white active:scale-[0.98] transition-all"
        >
          {currentIndex === totalPerguntas - 1 ? 'Resumo' : 'Próxima'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
