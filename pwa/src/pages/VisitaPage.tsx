import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVisita, useRespostas, usePendenciasVisita } from '../api/hooks'
import {
  ArrowLeft, Play, Clock, Camera, FileText, MessageSquare, Loader2
} from 'lucide-react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import MensagemModal from '../components/MensagemModal'

dayjs.extend(duration)

export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const visitaId = id ?? ''
  const { data: visita, isLoading } = useVisita(visitaId)
  const { data: respostas = [] } = useRespostas(visitaId)
  const { data: pendencias = [] } = usePendenciasVisita(visitaId)
  const [showMsg, setShowMsg] = useState(false)
  const [tempo, setTempo] = useState(0)

  useEffect(() => {
    if (visita?.status !== 'em_andamento') return
    const inicio = new Date(visita.iniciada_em).getTime()
    const interval = setInterval(() => {
      setTempo(Math.floor((Date.now() - inicio) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [visita?.status, visita?.iniciada_em])

  const formatTempo = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-brand-navy" />
    </div>
  )
  if (!visita) return null

  const totalRespondidos = respostas.filter((r: any) => r.resultado).length
  const totalPerguntas = respostas.length
  const progresso = totalPerguntas > 0 ? Math.round((totalRespondidos / totalPerguntas) * 100) : 0
  const isCompleto = visita.status === 'concluida' || visita.status === 'aprovada'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-5">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-white/60 mb-3 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="font-bold text-lg">{visita.condominio_nome}</div>
        <div className="text-white/60 text-xs mt-0.5">{visita.condominio_endereco}</div>

        {visita.status === 'em_andamento' && (
          <div className="flex items-center gap-2 mt-2 text-sm text-white/80">
            <Clock size={14} /> <span>{formatTempo(tempo)}</span>
          </div>
        )}

        {/* Progress bar */}
        {totalPerguntas > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
            <span className="text-xs text-white/60">{totalRespondidos}/{totalPerguntas}</span>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-5 space-y-4">
        {/* Big CTA */}
        {!isCompleto && (
          <button
            onClick={() => navigate(`/visita/${id}/checklist`)}
            className="w-full bg-brand-green hover:bg-green-600 text-white py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
          >
            <Play size={24} /> {visita.status === 'nao_iniciada' ? 'Começar vistoria' : 'Continuar vistoria'}
          </button>
        )}

        {isCompleto && (
          <div className="card p-5 text-center bg-green-50 border border-green-200">
            <div className="text-green-600 font-bold text-lg">Vistoria {visita.status === 'aprovada' ? 'aprovada' : 'enviada'} ✓</div>
            <div className="text-xs text-gray-500 mt-1">Protocolo: #{visita.protocolo}</div>
          </div>
        )}

        {/* Secondary actions */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate(`/visita/${id}/fotos`)} className="card p-4 flex flex-col items-center gap-2 text-gray-600 active:scale-95 transition-transform">
            <Camera size={24} className="text-emerald-500" />
            <span className="text-xs font-medium">Fotos</span>
          </button>
          <button onClick={() => navigate(`/visita/${id}/pendencias`)} className="card p-4 flex flex-col items-center gap-2 text-gray-600 active:scale-95 transition-transform">
            <FileText size={24} className="text-orange-500" />
            <span className="text-xs font-medium">Pendências</span>
            {pendencias.length > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{pendencias.length}</span>
            )}
          </button>
          <button onClick={() => setShowMsg(true)} className="card p-4 flex flex-col items-center gap-2 text-gray-600 active:scale-95 transition-transform">
            <MessageSquare size={24} className="text-brand-navy" />
            <span className="text-xs font-medium">Mensagem</span>
          </button>
        </div>
      </div>

      {showMsg && <MensagemModal visitaId={visitaId} onClose={() => setShowMsg(false)} />}
    </div>
  )
}
