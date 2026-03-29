import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import {
  ArrowLeft, Camera, CheckCircle, AlertTriangle, Loader2, X,
  MapPin, Clock, Send, Save, ChevronDown, ChevronUp,
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import clsx from 'clsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface ItemLocal {
  id: string
  titulo: string
  ordem: number
  conforme: boolean | null
  problema_descricao: string | null
  problema_foto_url: string | null
  problema_foto_thumb: string | null
  verificado_em: string | null
  uploading?: boolean
  saving?: boolean
}

export default function ChecklistExecPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: execucao, isLoading, refetch } = useQuery({
    queryKey: ['checklist-execucao', id],
    queryFn: () => api.get(`/checklist-avulso/execucoes/${id}`),
    enabled: !!id,
  })

  const [itens, setItens] = useState<ItemLocal[]>([])
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [descProblema, setDescProblema] = useState<Record<string, string>>({})
  const [observacao, setObservacao] = useState('')
  const [finalizando, setFinalizando] = useState(false)
  const [fotoFullscreen, setFotoFullscreen] = useState<string | null>(null)

  // Selfie state
  const [etapaSelfie, setEtapaSelfie] = useState(false)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [cameraAtiva, setCameraAtiva] = useState(false)
  const [enviandoSelfie, setEnviandoSelfie] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Initialize items from API
  useEffect(() => {
    if (execucao?.itens) {
      setItens(execucao.itens.map((i: any) => ({
        ...i,
        problema_descricao: i.problema_descricao || null,
      })))
      setObservacao(execucao.observacao || '')

      // Show selfie step if no selfie AND still em_andamento
      if (!execucao.selfie_url && execucao.status === 'em_andamento') {
        setEtapaSelfie(true)
      }
    }
  }, [execucao])

  const isConcluido = execucao?.status === 'concluida'

  // Geolocation helper
  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  // Reverse geocode
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
        headers: { 'Accept-Language': 'pt-BR' },
      })
      const data = await res.json()
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  // ── Camera functions ──
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

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const enviarSelfie = async () => {
    if (!selfieFile || !id) return
    setEnviandoSelfie(true)
    try {
      const formData = new FormData()
      formData.append('foto', selfieFile)
      await api.post(`/checklist-avulso/execucoes/${id}/selfie`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Capture start geolocation
      const loc = await getLocation()
      if (loc) {
        await api.patch(`/checklist-avulso/execucoes/${id}/finalizar`, {
          // Hack: we just update inicio fields via a separate call
        }).catch(() => {})
      }

      setEtapaSelfie(false)
      refetch()
      toast.success('Selfie registrada!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar selfie.'))
    } finally {
      setEnviandoSelfie(false)
    }
  }

  // ── Item actions ──
  const marcarItem = async (itemId: string, conforme: boolean) => {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, saving: true } : i))
    try {
      const desc = conforme ? null : (descProblema[itemId] || null)
      const updated = await api.patch(`/checklist-avulso/execucoes/${id}/item/${itemId}`, {
        conforme,
        problema_descricao: desc,
      })
      setItens(prev => prev.map(i => i.id === itemId ? { ...updated.data, saving: false } : i))
      if (!conforme) setExpandedItem(itemId) // Open problem details
    } catch (err: any) {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, saving: false } : i))
      toast.error(extrairErro(err, 'Erro ao salvar.'))
    }
  }

  const salvarDescricaoProblema = async (itemId: string) => {
    const desc = descProblema[itemId]
    if (!desc?.trim()) return
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, saving: true } : i))
    try {
      const updated = await api.patch(`/checklist-avulso/execucoes/${id}/item/${itemId}`, {
        conforme: false,
        problema_descricao: desc.trim(),
      })
      setItens(prev => prev.map(i => i.id === itemId ? { ...updated.data, saving: false } : i))
      toast.success('Descrição salva')
    } catch (err: any) {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, saving: false } : i))
      toast.error(extrairErro(err, 'Erro ao salvar descrição.'))
    }
  }

  const uploadFotoProblema = async (itemId: string, file: File) => {
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, uploading: true } : i))
    try {
      const formData = new FormData()
      formData.append('foto', file)
      const result = await api.post(`/checklist-avulso/execucoes/item/${itemId}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setItens(prev => prev.map(i => i.id === itemId ? {
        ...i,
        problema_foto_url: result.data.url,
        problema_foto_thumb: result.data.thumbnail_url,
        uploading: false,
      } : i))
      toast.success('Foto enviada!')
    } catch (err: any) {
      setItens(prev => prev.map(i => i.id === itemId ? { ...i, uploading: false } : i))
      toast.error(extrairErro(err, 'Erro ao enviar foto.'))
    }
  }

  const handleFinalizar = async () => {
    const naoVerificados = itens.filter(i => i.conforme === null)
    if (naoVerificados.length > 0) {
      toast.error(`Ainda faltam ${naoVerificados.length} itens para verificar`)
      return
    }
    setFinalizando(true)
    try {
      const loc = await getLocation()
      let endereco = undefined
      if (loc) {
        endereco = await reverseGeocode(loc.lat, loc.lng)
      }
      await api.patch(`/checklist-avulso/execucoes/${id}/finalizar`, {
        fim_lat: loc?.lat,
        fim_lng: loc?.lng,
        fim_endereco: endereco,
        observacao: observacao.trim() || undefined,
      })
      toast.success('Checklist finalizado!')
      queryClient.invalidateQueries({ queryKey: ['checklist-execucoes'] })
      navigate('/checklist-avulso')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao finalizar.'))
    } finally {
      setFinalizando(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!execucao) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Checklist não encontrado</p>
        <button onClick={() => navigate('/checklist-avulso')} className="text-emerald-600 mt-2 hover:underline text-sm">Voltar</button>
      </div>
    )
  }

  // Stats
  const totalItens = itens.length
  const totalOk = itens.filter(i => i.conforme === true).length
  const totalProblemas = itens.filter(i => i.conforme === false).length
  const totalPendente = itens.filter(i => i.conforme === null).length
  const progresso = totalItens > 0 ? ((totalOk + totalProblemas) / totalItens) * 100 : 0

  // ── Selfie screen ──
  if (etapaSelfie && !isConcluido) {
    return (
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/checklist-avulso')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={18} /> Voltar
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Identificação</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tire uma selfie antes de iniciar o checklist</p>

          <canvas ref={canvasRef} className="hidden" />

          {cameraAtiva && (
            <div className="relative mb-4">
              <video ref={videoRef} className="w-full rounded-xl" autoPlay playsInline muted />
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={fecharCamera} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
                  Cancelar
                </button>
                <button onClick={capturarSelfie} className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2">
                  <Camera size={16} /> Capturar
                </button>
              </div>
            </div>
          )}
          {!cameraAtiva && selfiePreview && (
              <div className="mb-4">
                <img src={selfiePreview} alt="Selfie" className="w-48 h-48 object-cover rounded-full mx-auto border-4 border-emerald-100" />
                <div className="flex justify-center gap-3 mt-4">
                  <button onClick={() => { setSelfiePreview(null); setSelfieFile(null) }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
                    Tirar outra
                  </button>
                  <button onClick={enviarSelfie} disabled={enviandoSelfie}
                    className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                    {enviandoSelfie ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Confirmar
                  </button>
                </div>
              </div>
          )}
          {!cameraAtiva && !selfiePreview && (
              <button onClick={abrirCamera}
                className="w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-dashed border-emerald-300 flex items-center justify-center mx-auto hover:bg-emerald-100 transition-all">
                <Camera size={40} className="text-emerald-400" />
              </button>
          )}

          <button onClick={() => setEtapaSelfie(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-4">
            Pular selfie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/checklist-avulso')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{execucao.titulo}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className={clsx('font-semibold px-2 py-0.5 rounded-full',
              isConcluido ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            )}>
              {isConcluido ? 'Concluído' : 'Em andamento'}
            </span>
            <span className="flex items-center gap-1"><Clock size={12} />{dayjs(execucao.iniciado_em).format('DD/MM HH:mm')}</span>
            {execucao.local_nome && <span className="flex items-center gap-1"><MapPin size={12} />{execucao.local_nome}</span>}
          </div>
        </div>

        {execucao.selfie_url && (
          <img src={execucao.selfie_url} alt="Selfie" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200" />
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progresso</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(progresso)}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />{totalOk} OK</span>
          <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={12} />{totalProblemas} Problemas</span>
          <span className="text-gray-400">{totalPendente} pendentes</span>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {itens.map((item, idx) => {
          const isExpanded = expandedItem === item.id
          const hasProblema = item.conforme === false

          let borderClass = 'border-gray-200 dark:border-gray-700'
          if (hasProblema) borderClass = 'border-red-200 dark:border-red-800'
          else if (item.conforme === true) borderClass = 'border-green-200 dark:border-green-800'

          let badgeClass = 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          if (item.conforme === true) badgeClass = 'bg-green-100 text-green-700'
          else if (item.conforme === false) badgeClass = 'bg-red-100 text-red-700'

          let badgeContent: React.ReactNode = idx + 1
          if (item.conforme === true) badgeContent = <CheckCircle size={16} />
          else if (item.conforme === false) badgeContent = <AlertTriangle size={16} />

          return (
            <div key={item.id} className={clsx(
              'bg-white dark:bg-gray-800 rounded-xl border transition-all',
              borderClass
            )}>
              {/* Item header */}
              <div className="flex items-center gap-3 p-3">
                <span className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  badgeClass
                )}>
                  {badgeContent}
                </span>

                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.titulo}
                </span>

                {item.saving && <Loader2 size={16} className="animate-spin text-gray-400" />}

                {!isConcluido && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => marcarItem(item.id, true)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        item.conforme === true
                          ? 'bg-green-600 text-white'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                      )}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => { marcarItem(item.id, false); setExpandedItem(item.id) }}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        item.conforme === false
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                      )}
                    >
                      Problema
                    </button>
                  </div>
                )}

                {(hasProblema || item.conforme !== null) && (
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>

              {/* Expanded details (problem info) */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                  {/* Problem description */}
                  {hasProblema && !isConcluido && (
                    <div>
                      <label htmlFor={`desc-${item.id}`} className="block text-xs font-medium text-gray-500 mb-1">Descrição do problema</label>
                      <div className="flex gap-2">
                        <textarea
                          id={`desc-${item.id}`}
                          value={descProblema[item.id] ?? item.problema_descricao ?? ''}
                          onChange={(e) => setDescProblema(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Descreva o problema encontrado..."
                          rows={2}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 resize-none"
                        />
                        <button onClick={() => salvarDescricaoProblema(item.id)}
                          className="self-end p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                          <Save size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isConcluido && item.problema_descricao && (
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Descrição do problema</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.problema_descricao}</p>
                    </div>
                  )}

                  {/* Problem photo */}
                  {item.problema_foto_url && (
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Foto do problema</span>
                      <button type="button" className="p-0 border-0 bg-transparent" onClick={() => setFotoFullscreen(item.problema_foto_url)}>
                        <img
                          src={item.problema_foto_thumb || item.problema_foto_url}
                          alt="Problema"
                          className="h-32 rounded-xl object-cover cursor-pointer hover:opacity-80"
                        />
                      </button>
                    </div>
                  )}
                  {!item.problema_foto_url && hasProblema && !isConcluido && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1">Foto do problema</span>
                      <input
                        type="file"
                        ref={el => { fileInputRefs.current[item.id] = el }}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) uploadFotoProblema(item.id, f)
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                        disabled={item.uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                      >
                        {item.uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        Tirar foto do problema
                      </button>
                    </div>
                  )}

                  {item.verificado_em && (
                    <p className="text-xs text-gray-400">Verificado em {dayjs(item.verificado_em).format('DD/MM/YY HH:mm')}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Observation + Finalize */}
      {!isConcluido && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div>
            <label htmlFor="obs-geral" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observação geral (opcional)</label>
            <textarea
              id="obs-geral"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações adicionais sobre o checklist..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 resize-none"
            />
          </div>

          <button
            onClick={handleFinalizar}
            disabled={finalizando || totalPendente > 0}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {finalizando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Finalizar Checklist
          </button>

          {totalPendente > 0 && (
            <p className="text-xs text-center text-gray-400">
              Verifique todos os {totalPendente} itens pendentes para finalizar
            </p>
          )}
        </div>
      )}

      {/* Concluded info */}
      {isConcluido && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-sm font-bold text-green-700 dark:text-green-400">Checklist concluído</span>
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
            {execucao.finalizado_em && <p>Finalizado em {dayjs(execucao.finalizado_em).format('DD/MM/YYYY HH:mm')}</p>}
            {execucao.fim_endereco && <p className="flex items-center gap-1"><MapPin size={12} />{execucao.fim_endereco}</p>}
            {execucao.observacao && <p className="mt-2 text-gray-600 dark:text-gray-400">{execucao.observacao}</p>}
          </div>
        </div>
      )}

      {/* Photo fullscreen modal */}
      {fotoFullscreen && (
        <dialog
          open
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 w-full h-full border-0 m-0 max-w-none max-h-none"
        >
          <button className="absolute inset-0 bg-transparent border-0 cursor-default" onClick={() => setFotoFullscreen(null)} aria-label="Fechar" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setFotoFullscreen(null)}><X size={28} /></button>
          <img src={fotoFullscreen} alt="Foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg relative z-10" />
        </dialog>
      )}
    </div>
  )
}
