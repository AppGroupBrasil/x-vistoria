import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import clsx from 'clsx'

type Props = {
  onTexto: (texto: string) => void
  contexto?: { pergunta?: string; condominio?: string; categoria?: string }
  className?: string
  title?: string
}

function escolherMimeType(): string {
  const cands = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const c of cands) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export default function MicDictar({ onTexto, contexto, className, title }: Props) {
  const [estado, setEstado] = useState<'parado' | 'gravando' | 'enviando'>('parado')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const fecharStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => { fecharStream() }, [])

  const iniciar = async () => {
    if (estado !== 'parado') return
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microfone não suportado neste navegador')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = escolherMimeType()
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const tipo = rec.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: tipo })
        fecharStream()
        if (blob.size < 1024) {
          setEstado('parado')
          toast.error('Áudio muito curto')
          return
        }
        setEstado('enviando')
        try {
          const fd = new FormData()
          const ext = tipo.includes('mp4') ? 'mp4' : tipo.includes('ogg') ? 'ogg' : 'webm'
          fd.append('audio', blob, `dictado.${ext}`)
          fd.append('pergunta', contexto?.pergunta || '')
          fd.append('condominio', contexto?.condominio || '')
          fd.append('categoria', contexto?.categoria || '')
          const res: any = await api.post('/ai/transcrever', fd)
          const texto = (res?.transcricao_corrigida || res?.transcricao_bruta || '').trim()
          if (!texto) { toast.error('Nada reconhecido'); return }
          onTexto(texto)
        } catch (e: any) {
          toast.error(e?.erro || e?.message || 'Falha na transcrição')
        } finally {
          setEstado('parado')
        }
      }
      rec.start()
      mediaRef.current = rec
      setEstado('gravando')
    } catch (e: any) {
      fecharStream()
      setEstado('parado')
      toast.error('Permissão de microfone negada')
    }
  }

  const parar = () => {
    if (estado === 'gravando' && mediaRef.current) {
      mediaRef.current.stop()
    }
  }

  const click = () => {
    if (estado === 'parado') iniciar()
    else if (estado === 'gravando') parar()
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={estado === 'enviando'}
      title={title || (estado === 'gravando' ? 'Parar e enviar' : 'Ditar por voz')}
      aria-label="Ditar por voz"
      className={clsx(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 active:scale-95',
        estado === 'gravando' && 'bg-red-500 text-white animate-pulse',
        estado === 'enviando' && 'bg-gray-200 text-gray-500 cursor-wait',
        estado === 'parado' && 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-brand-navy',
        className,
      )}
    >
      {estado === 'gravando' ? <Square size={14} fill="currentColor" />
        : estado === 'enviando' ? <Loader2 size={14} className="animate-spin" />
        : <Mic size={14} />}
    </button>
  )
}
