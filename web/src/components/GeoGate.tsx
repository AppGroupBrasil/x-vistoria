import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Loader2 } from 'lucide-react'
import { obterLocalizacao } from '../lib/geo'

type Status = 'consentimento' | 'pendente' | 'autorizado' | 'negado'

interface Props {
  children: (geo: { lat: number; lng: number }) => ReactNode
  voltarPara?: string
}

export default function GeoGate({ children, voltarPara = '/x-vistoria' }: Props) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('consentimento')
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)

  const autorizar = async () => {
    setStatus('pendente')
    const g = await obterLocalizacao()
    if (g) { setGeo(g); setStatus('autorizado') }
    else setStatus('negado')
  }
  const negar = () => setStatus('negado')

  if (status === 'autorizado' && geo) return <>{children(geo)}</>

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-6 text-center text-white">
      <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
        <MapPin size={40} className="text-brand-green" />
      </div>

      {status === 'consentimento' && (
        <>
          <div className="bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            Atenção
          </div>
          <h1 className="text-xl font-bold mb-3">Esta vistoria registra a localização</h1>
          <p className="text-white/80 text-sm mb-6 max-w-sm leading-relaxed">
            O aplicativo captura a localização de cada vistoria para comprovar que ela foi feita no local.
            <br /><br />
            Para continuar, é necessário <strong>autorizar</strong> o acesso à localização. Caso contrário,
            não será possível realizar a vistoria.
          </p>
          <div className="flex flex-col w-full max-w-xs gap-2">
            <button onClick={autorizar} className="bg-brand-green hover:bg-emerald-600 text-white py-3 rounded-xl font-bold active:scale-95">
              Autorizar
            </button>
            <button onClick={negar} className="bg-white/10 hover:bg-white/15 text-white/80 py-3 rounded-xl font-semibold active:scale-95">
              Negar
            </button>
          </div>
        </>
      )}

      {status === 'pendente' && (
        <>
          <h1 className="text-xl font-bold mb-2">Aguardando localização…</h1>
          <p className="text-white/70 text-sm mb-6">Confirme no aviso do navegador.</p>
          <Loader2 size={28} className="animate-spin text-white/70" />
        </>
      )}

      {status === 'negado' && (
        <>
          <h1 className="text-xl font-bold mb-3 text-red-300">Não será possível realizar a vistoria</h1>
          <p className="text-white/80 text-sm mb-6 max-w-sm leading-relaxed">
            A localização é obrigatória. Autorize o acesso para registrar onde a vistoria está sendo feita.
          </p>
          <div className="flex flex-col w-full max-w-xs gap-2">
            <button onClick={autorizar} className="bg-brand-green hover:bg-emerald-600 text-white py-3 rounded-xl font-bold active:scale-95">
              Autorizar agora
            </button>
            <button onClick={() => navigate(voltarPara)} className="bg-white/10 hover:bg-white/15 text-white/80 py-3 rounded-xl font-semibold active:scale-95">
              Voltar
            </button>
          </div>
          <p className="text-white/40 text-[11px] mt-6 max-w-xs">
            Se você já negou antes no navegador, abra as configurações deste site e libere "Localização".
          </p>
        </>
      )}
    </div>
  )
}
