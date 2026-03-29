import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle, AlertTriangle, Loader2, MapPin,
  Share2, X,
} from 'lucide-react'
import SeoHead from '../components/SeoHead'
import dayjs from 'dayjs'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function ChecklistReportPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fotoFull, setFotoFull] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/api/v1/checklist-avulso/publico/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(setData)
      .catch((err: any) => {
        const msg = err?.message || 'Relatório não encontrado ou ainda não finalizado.'
        setError(typeof msg === 'string' ? msg : 'Relatório não encontrado ou ainda não finalizado.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600">{error}</p>
          <p className="text-sm text-gray-400 mt-2">Verifique se o link está correto</p>
        </div>
      </div>
    )
  }

  const itens = data.itens || []
  const totalOk = itens.filter((i: any) => i.conforme === true).length
  const totalProblemas = itens.filter((i: any) => i.conforme === false).length

  const shareUrl = globalThis.location.href
  const shareTitle = `Checklist: ${data.titulo}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl })
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copiado!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SeoHead title={`Checklist: ${data.titulo} — X Vistoria`} description={`Relatório de checklist condominial: ${data.titulo}. Veja os resultados da inspeção.`} />
      {/* Header */}
      <div className="bg-emerald-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-200 uppercase font-semibold tracking-wider mb-1">Relatório de Checklist</p>
              <h1 className="text-xl font-bold">{data.titulo}</h1>
              {data.empresa_nome && <p className="text-sm text-emerald-200 mt-0.5">{data.empresa_nome}</p>}
            </div>
            <button onClick={handleShare} className="p-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">Executor</p>
            <div className="flex items-center gap-2">
              {data.selfie_url && <img src={data.selfie_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
              <span className="text-sm font-semibold text-gray-900">{data.executor_nome}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">Data</p>
            <p className="text-sm font-semibold text-gray-900">{dayjs(data.iniciado_em).format('DD/MM/YYYY')}</p>
            <p className="text-xs text-gray-400">{dayjs(data.iniciado_em).format('HH:mm')} - {data.finalizado_em ? dayjs(data.finalizado_em).format('HH:mm') : '...'}</p>
          </div>
        </div>

        {data.local_nome && (
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin size={12} />Local</p>
            <p className="text-sm font-semibold text-gray-900">{data.local_nome}</p>
          </div>
        )}

        {(data.inicio_endereco || data.fim_endereco) && (
          <div className="grid grid-cols-2 gap-3">
            {data.inicio_endereco && (
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500 mb-1">Endereço início</p>
                <p className="text-xs text-gray-700">{data.inicio_endereco}</p>
              </div>
            )}
            {data.fim_endereco && (
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500 mb-1">Endereço fim</p>
                <p className="text-xs text-gray-700">{data.fim_endereco}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-extrabold text-gray-900">{itens.length}</div>
            <div className="text-xs text-gray-500 font-semibold">Total</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-extrabold text-green-600">{totalOk}</div>
            <div className="text-xs text-gray-500 font-semibold">Conforme</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-extrabold text-red-600">{totalProblemas}</div>
            <div className="text-xs text-gray-500 font-semibold">Problemas</div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Itens verificados</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {itens.map((item: any, idx: number) => {
              let badgeClass = 'bg-gray-100 text-gray-400'
              if (item.conforme === true) badgeClass = 'bg-green-100 text-green-600'
              else if (item.conforme === false) badgeClass = 'bg-red-100 text-red-600'

              let badgeContent: React.ReactNode = <span className="text-xs font-bold">{idx + 1}</span>
              if (item.conforme === true) badgeContent = <CheckCircle size={14} />
              else if (item.conforme === false) badgeContent = <AlertTriangle size={14} />

              return (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${badgeClass}`}>
                    {badgeContent}
                  </span>
                  <span className="flex-1 text-sm text-gray-900">{item.titulo}</span>
                  {item.verificado_em && (
                    <span className="text-xs text-gray-400">{dayjs(item.verificado_em).format('HH:mm')}</span>
                  )}
                </div>

                {item.conforme === false && (
                  <div className="ml-9 mt-2 space-y-2">
                    {item.problema_descricao && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{item.problema_descricao}</p>
                    )}
                    {item.problema_foto_url && (
                      <button type="button" className="p-0 border-0 bg-transparent" onClick={() => setFotoFull(item.problema_foto_url)}>
                        <img
                          src={item.problema_foto_thumb || item.problema_foto_url}
                          alt="Problema"
                          className="h-24 rounded-lg object-cover cursor-pointer hover:opacity-80"
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>

        {/* Observation */}
        {data.observacao && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Observações</h3>
            <p className="text-sm text-gray-600">{data.observacao}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">Gerado por X Vistoria</p>
        </div>
      </div>

      {/* Photo fullscreen */}
      {fotoFull && (
        <dialog open className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 w-full h-full border-0 m-0 max-w-none max-h-none">
          <button className="absolute inset-0 bg-transparent border-0 cursor-default" onClick={() => setFotoFull(null)} aria-label="Fechar" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setFotoFull(null)}><X size={28} /></button>
          <img src={fotoFull} alt="Foto" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg relative z-10" />
        </dialog>
      )}
    </div>
  )
}
