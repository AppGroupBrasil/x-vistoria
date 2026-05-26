import { useParams, useNavigate } from 'react-router-dom'
import { useVisita, useRespostas, usePendenciasVisita, useFotos } from '../api/hooks'
import { ArrowLeft, Check, X, Minus, AlertTriangle, Loader2, MapPin } from 'lucide-react'
import dayjs from 'dayjs'

const STATUS_LABEL: Record<string, string> = {
  concluida: 'Concluída',
  aprovada: 'Aprovada',
  aguardando_aprovacao: 'Aguardando aprovação',
}

export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const visitaId = id ?? ''
  const { data: visita, isLoading } = useVisita(visitaId)
  const { data: respostas = [] } = useRespostas(visitaId)
  const { data: pendencias = [] } = usePendenciasVisita(visitaId)
  const { data: fotos = [] } = useFotos(visitaId)

  if (isLoading || !visita) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-navy" />
      </div>
    )
  }

  // Se ainda aberta, mandar pro checklist
  if (['nao_iniciada', 'em_andamento', 'pausada'].includes(visita.status)) {
    navigate(`/visita/${visitaId}/checklist`, { replace: true })
    return null
  }

  const ok = respostas.filter((r: any) => r.resultado === 'ok').length
  const naoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length
  const na = respostas.filter((r: any) => r.resultado === 'na').length
  const fotosArr = Array.isArray(fotos) ? fotos : []
  const pendArr = Array.isArray(pendencias) ? pendencias : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-brand-navy text-white px-4 pt-12 pb-5">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-white/70 text-sm mb-3">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="font-bold text-lg">{visita.condominio_nome}</div>
        <div className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
          <MapPin size={11} /> {visita.condominio_endereco || '—'}
        </div>
        <div className="text-white/60 text-xs mt-1">
          {STATUS_LABEL[visita.status] || visita.status} · {dayjs(visita.criado_em).format('DD/MM/YYYY')}
          {visita.protocolo && ` · #${visita.protocolo}`}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <Check size={20} className="mx-auto text-green-500 mb-1" />
            <div className="text-xl font-bold text-green-600">{ok}</div>
            <div className="text-[10px] text-gray-500">Conforme</div>
          </div>
          <div className="card p-3 text-center">
            <X size={20} className="mx-auto text-red-500 mb-1" />
            <div className="text-xl font-bold text-red-600">{naoOk}</div>
            <div className="text-[10px] text-gray-500">Não conforme</div>
          </div>
          <div className="card p-3 text-center">
            <Minus size={20} className="mx-auto text-gray-400 mb-1" />
            <div className="text-xl font-bold text-gray-500">{na}</div>
            <div className="text-[10px] text-gray-500">N/A</div>
          </div>
        </div>

        {pendArr.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Pendências</h3>
            <div className="space-y-2">
              {pendArr.map((p: any) => (
                <div key={p.id} className="card p-3 border-l-4 border-orange-400">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{p.titulo}</div>
                      {p.descricao && <div className="text-xs text-gray-500 mt-0.5">{p.descricao}</div>}
                      <div className="text-[10px] text-gray-400 mt-1 capitalize">{p.prioridade} · {p.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fotosArr.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fotos</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {fotosArr.map((f: any) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden">
                  <img src={f.thumbnail_url || f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}

        {visita.observacoes && (
          <div className="card p-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Observação final</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{visita.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
