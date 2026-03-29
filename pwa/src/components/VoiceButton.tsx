import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface VoiceButtonProps {
  onTranscription: (text: string) => void
  append?: boolean
  currentValue?: string
  className?: string
}

function getSpeechRecognition(): (new () => any) | null {
  const w = globalThis as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export default function VoiceButton({ onTranscription, append, currentValue = '', className = '' }: Readonly<VoiceButtonProps>) {
  const [ouvindo, setOuvindo] = useState(false)
  const recognitionRef = useRef<any>(null)
  const baseTextRef = useRef('')

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  const iniciar = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      toast.error('Navegador não suporta reconhecimento de voz')
      return
    }

    baseTextRef.current = append ? currentValue : ''

    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''
      for (const result of Array.from(event.results)) {
        const t = result[0].transcript
        if (result.isFinal) {
          final += t
        } else {
          interim += t
        }
      }
      const combined = (final + interim).trim()
      if (combined) {
        const base = baseTextRef.current
        onTranscription(base ? base + ' ' + combined : combined)
      }
    }

    recognition.onerror = (e: any) => {
      if (e.error !== 'aborted') {
        toast.error('Erro no microfone')
      }
      setOuvindo(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setOuvindo(false)
      recognitionRef.current = null
    }

    recognition.start()
    recognitionRef.current = recognition
    setOuvindo(true)
  }, [append, currentValue, onTranscription])

  const parar = useCallback(() => {
    recognitionRef.current?.stop()
    setOuvindo(false)
  }, [])

  return (
    <button
      type="button"
      onClick={ouvindo ? parar : iniciar}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
        ouvindo
          ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
          : 'bg-red-100 text-red-600 hover:bg-red-200'
      } ${className}`}
      title={ouvindo ? 'Parar ditado' : 'Ditar com microfone'}
    >
      {ouvindo ? <MicOff size={18} /> : <Mic size={18} />}
      {ouvindo ? 'Parar' : '🎤 Ditar'}
    </button>
  )
}
