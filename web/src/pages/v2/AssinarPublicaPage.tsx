import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle, FileSignature, ShieldCheck } from 'lucide-react'

type Info = {
  id: string
  protocolo: string
  tipo: string
  condominio: string | null
  endereco: string | null
  iniciada_em: string
  finalizada_em: string | null
  assinada: boolean
  assinada_por: string | null
  assinada_em: string | null
  hash: string | null
}

export default function AssinarPublicaPage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<Info | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aceito, setAceito] = useState(false)

  useEffect(() => {
    api.get(`/assinar/${token}`).then((r: any) => setInfo(r as Info))
      .catch((e: any) => toast.error(e?.erro || 'Token inválido'))
      .finally(() => setCarregando(false))
  }, [token])

  const assinar = async () => {
    if (!nome.trim()) return toast.error('Digite seu nome completo')
    if (!aceito) return toast.error('Confirme a declaração antes de assinar')
    setSalvando(true)
    try {
      await api.post(`/assinar/${token}`, { nome: nome.trim() })
      const r: any = await api.get(`/assinar/${token}`)
      setInfo(r as Info)
      toast.success('Assinatura registrada com sucesso')
    } catch (e: any) { toast.error(e?.erro || 'Erro ao assinar') }
    finally { setSalvando(false) }
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
  }
  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-lg font-bold text-gray-700">Link inválido</p>
          <p className="text-sm text-gray-500 mt-1">Solicite um novo link de assinatura.</p>
        </div>
      </div>
    )
  }

  if (info.assinada) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-extrabold text-brand-navy">Documento assinado</h1>
          <p className="text-sm text-gray-600 mt-1">
            Vistoria <strong>#{info.protocolo}</strong> em {info.condominio || '—'}
          </p>
          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 text-left">
            <div><strong>Assinada por:</strong> {info.assinada_por}</div>
            <div><strong>Quando:</strong> {info.assinada_em && new Date(info.assinada_em).toLocaleString('pt-BR')}</div>
            <div className="mt-2 break-all"><strong>Hash:</strong> <span className="font-mono text-xs">{info.hash}</span></div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Guarde este hash como prova de integridade.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSignature size={28} className="text-brand-navy" />
          <h1 className="text-xl font-extrabold text-brand-navy">Assinar relatório de vistoria</h1>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 mb-4">
          <div><strong>Protocolo:</strong> #{info.protocolo}</div>
          <div><strong>Condomínio:</strong> {info.condominio || '—'}</div>
          {info.endereco && <div><strong>Endereço:</strong> {info.endereco}</div>}
          <div><strong>Realizada em:</strong> {info.iniciada_em && new Date(info.iniciada_em).toLocaleString('pt-BR')}</div>
        </div>

        <label className="block text-sm font-bold text-gray-800 mb-1">Seu nome completo</label>
        <input
          type="text" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: João da Silva"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none mb-3"
        />

        <label className="flex items-start gap-2 text-sm text-gray-700 mb-4">
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            Declaro ter recebido e revisado o relatório acima e que esta assinatura digital tem o mesmo
            valor de uma assinatura manuscrita para os fins deste documento.
          </span>
        </label>

        <button
          onClick={assinar} disabled={salvando}
          className="w-full py-3 rounded-xl bg-brand-navy text-white font-bold inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Assinar com validade digital
        </button>
        <p className="text-[11px] text-gray-500 mt-2 text-center">
          A assinatura será registrada com data, hora e hash criptográfico (SHA-256).
        </p>
      </div>
    </div>
  )
}
