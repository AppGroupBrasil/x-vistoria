import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { extrairErro } from '../api/erros'
import { MapPin, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function PontoQrPage() {
  const { token } = useParams<{ token: string }>()
  const [ponto, setPonto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nome, setNome] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [endereco, setEndereco] = useState('')
  const [geoLoading, setGeoLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Buscar dados do ponto
  useEffect(() => {
    if (!token) return
    axios.get(`${API_URL}/api/v1/publico/qr-ponto/${token}`)
      .then(res => setPonto(res.data))
      .catch((err: any) => setError(extrairErro(err?.response?.data || err, 'QR Code não encontrado ou inválido.')))
      .finally(() => setLoading(false))
  }, [token])

  // Obter geolocalização
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'pt-BR' },
          })
          const addr = res.data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          setEndereco(addr)
        } catch {
          setEndereco(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        }
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await axios.post(`${API_URL}/api/v1/publico/qr-ponto/${token}/registrar`, {
        usuario_nome: nome.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        endereco: endereco || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(extrairErro(err?.response?.data || err, 'Erro ao registrar presença. Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
    </div>
  )

  if (error && !ponto) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ops!</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <CheckCircle size={56} className="mx-auto mb-4 text-emerald-500" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Presença registrada!</h1>
        <p className="text-sm text-gray-500 mb-1"><strong>{nome}</strong></p>
        <p className="text-sm text-gray-500 mb-1">{ponto?.nome}</p>
        {endereco && <p className="text-xs text-gray-400 mt-2">{endereco}</p>}
        <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">X Vistoria</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{ponto?.nome}</h1>
          {ponto?.descricao && <p className="text-sm text-gray-500 mt-1">{ponto.descricao}</p>}
          {ponto?.condominio_nome && <p className="text-xs text-emerald-600 mt-1">{ponto.condominio_nome}</p>}
        </div>

        {/* Info automática */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Data:</span>
            <span className="font-medium text-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Hora:</span>
            <span className="font-medium text-gray-900">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-500 flex-shrink-0">Local:</span>
            {geoLoading ? (
              <span className="text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Obtendo...</span>
            ) : endereco ? (
              <span className="font-medium text-gray-900 text-right text-xs">{endereco}</span>
            ) : (
              <span className="text-gray-400">Localização não disponível</span>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Digite seu nome completo"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !nome.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : <><CheckCircle size={16} /> Registrar Presença</>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">X Vistoria — Registro de ponto</p>
      </div>
    </div>
  )
}
