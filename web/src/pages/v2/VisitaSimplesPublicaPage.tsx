import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Loader2, MapPin, Clock, CheckCircle, Star } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function Foto({ f }: { f: { url: string } | null | undefined }) {
  if (!f?.url) return null
  return <img src={f.url} alt="" className="w-20 h-20 object-cover rounded border border-gray-200" />
}

function ItemView({ tipo, item, idx }: { tipo: string; item: any; idx: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-[10px] font-bold text-gray-400 mb-1">#{idx + 1}</div>
      {tipo === 'foto_descricao' && (<><Foto f={item.foto} />{item.descricao && <div className="text-sm mt-1">{item.descricao}</div>}</>)}
      {tipo === 'checklist' && (<><div className="text-sm font-semibold">{item.nome}</div>{item.problemaDesc && <div className="text-xs text-orange-700 mt-1">⚠ {item.problemaDesc}</div>}{item.problemaFoto && <div className="mt-1"><Foto f={item.problemaFoto} /></div>}</>)}
      {tipo === 'pergunta_resposta' && (<><div className="text-sm font-semibold">{item.pergunta}</div><div className="text-sm text-gray-700">{item.resposta}</div>{item.foto && <div className="mt-1"><Foto f={item.foto} /></div>}</>)}
      {tipo === 'conformidade' && (<div className="flex items-center justify-between"><div className="text-sm font-semibold">{item.item}</div><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.conforme === 'sim' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.conforme === 'sim' ? '✓ Conforme' : '✗ Não conforme'}</span></div>)}
      {tipo === 'antes_depois' && (<div className="grid grid-cols-2 gap-2"><div><div className="text-[10px] font-bold text-gray-500 mb-1">Antes</div><Foto f={item.antes} /></div><div><div className="text-[10px] font-bold text-gray-500 mb-1">Depois</div><Foto f={item.depois} /></div></div>)}
      {tipo === 'avaliacao' && (<><div className="text-sm font-semibold">{item.item}</div><div className="flex gap-1 mt-1">{[1,2,3,4,5].map((n) => (<Star key={n} size={16} className={item.nota >= n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />))}</div></>)}
    </div>
  )
}

export default function VisitaSimplesPublicaPage() {
  const { id } = useParams<{ id: string }>()
  const [v, setV] = useState<any>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return
    axios.get(`${API_URL}/api/v1/publico/vistoria-simples/${id}`)
      .then((r) => setV(r.data))
      .catch(() => setErro('Vistoria não encontrada ou indisponível.'))
  }, [id])

  if (erro) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">{erro}</div>
  if (!v) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-navy" /></div>

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="border-b-4 border-brand-green pb-4 mb-5">
          {v.empresa_nome && <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{v.empresa_nome}</div>}
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">{v.condominio_nome || v.tipo_label}</h1>
          {v.endereco && <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={11} /> {v.endereco}</div>}
          <div className="mt-2 font-mono text-xs text-gray-500">Protocolo #{v.protocolo}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs mb-5">
          <div><div className="text-gray-500 font-bold uppercase text-[9px]">Tipo</div><div>{v.tipo_label}</div></div>
          <div><div className="text-gray-500 font-bold uppercase text-[9px]">Vistoriador</div><div>{v.vistoriador_nome || '—'}</div></div>
          <div className="flex items-center gap-1"><Clock size={11} className="text-gray-400" /> Início: {fmt(v.iniciada_em)}</div>
          <div className="flex items-center gap-1"><CheckCircle size={11} className="text-gray-400" /> Fim: {fmt(v.finalizada_em)}</div>
        </div>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy mb-2 border-b pb-1">Itens</h2>
        <div className="space-y-2">
          {(v.itens || []).map((it: any, i: number) => (<ItemView key={it.id ?? i} tipo={v.tipo} item={it} idx={i} />))}
        </div>
        <div className="mt-6 text-center text-[10px] text-gray-400">X Vistoria · Vistoria condominial</div>
      </div>
    </div>
  )
}
