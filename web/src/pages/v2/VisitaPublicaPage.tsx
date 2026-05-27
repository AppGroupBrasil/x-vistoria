import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Loader2, MapPin, Clock, CheckCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''
const RESULTADO_LABEL: Record<string, string> = { ok: 'Conforme', nao_ok: 'Não conforme', na: 'N/A' }
const RESULTADO_COR: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  nao_ok: 'bg-red-100 text-red-700',
  na: 'bg-gray-100 text-gray-600',
}

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function VisitaPublicaPage() {
  const { id } = useParams<{ id: string }>()
  const [v, setV] = useState<any>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return
    axios.get(`${API_URL}/api/v1/publico/visita/${id}`)
      .then((r) => setV(r.data))
      .catch(() => setErro('Vistoria não encontrada ou indisponível.'))
  }, [id])

  if (erro) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">{erro}</div>
  if (!v) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-navy" /></div>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="border-b-4 border-brand-green pb-4 mb-5">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{v.empresa_nome}</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">{v.condominio_nome}</h1>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin size={11} /> {v.condominio_endereco || '—'}
          </div>
          <div className="mt-2 font-mono text-xs text-gray-500">Protocolo #{v.protocolo}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-5">
          <div><div className="text-gray-500 font-bold uppercase text-[9px]">Funcionário</div><div>{v.vistoriador_nome || '—'}</div></div>
          <div><div className="text-gray-500 font-bold uppercase text-[9px]">Status</div><div>—</div></div>
          <div className="flex items-center gap-1"><Clock size={11} className="text-gray-400" /> Início: {fmt(v.iniciada_em)}</div>
          <div className="flex items-center gap-1"><CheckCircle size={11} className="text-gray-400" /> Fim: {fmt(v.finalizada_em)}</div>
        </div>

        <h2 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy mb-2 border-b pb-1">Itens</h2>
        <div className="space-y-2">
          {v.perguntas?.map((p: any, i: number) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-400 font-bold">{i + 1}.</div>
              <p className="text-sm font-semibold text-gray-900">{p.texto}</p>
              {p.resposta && (
                <div className="mt-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${RESULTADO_COR[p.resposta.resultado] || 'bg-gray-100'}`}>
                    {RESULTADO_LABEL[p.resposta.resultado] || p.resposta.resultado}
                  </span>
                  {p.resposta.observacao && <div className="text-xs text-gray-600 mt-1">{p.resposta.observacao}</div>}
                </div>
              )}
              {p.fotos?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {p.fotos.map((f: any) => (
                    <img key={f.id} src={f.url} alt="" className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-[10px] text-gray-400">X Vistoria · Vistoria condominial</div>
      </div>
    </div>
  )
}
