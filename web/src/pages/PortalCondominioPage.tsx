import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { extrairErro } from '../api/erros'
import dayjs from 'dayjs'
import {
  MapPin, ClipboardCheck, FileText, Calendar,
  CheckCircle2, Shield, Users, Loader2, AlertTriangle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

interface Condominio {
  id: string
  nome: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  sindico_nome: string
  total_unidades: number
  foto_url: string
  empresa_nome: string
  empresa_logo: string
}

interface Visita {
  id: string
  protocolo: string
  titulo: string
  status: string
  pdf_url: string
  iniciada_em: string
  finalizada_em: string
  criado_em: string
  supervisor_nome: string
}

interface Pendencia {
  id: string
  titulo: string
  descricao: string
  prioridade: string
  status: string
  resolvida_em: string
  criado_em: string
}

const statusLabel: Record<string, string> = {
  concluida: 'Concluída',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada ao Síndico',
}

export default function PortalCondominioPage() {
  const { token } = useParams<{ token: string }>()
  const [condominio, setCondominio] = useState<Condominio | null>(null)
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    axios
      .get(`${API_URL}/api/v1/publico/portal/${token}`)
      .then((res) => {
        setCondominio(res.data.condominio)
        setVisitas(res.data.visitas || [])
        setPendencias(res.data.pendencias || [])
      })
      .catch((err: any) => setError(extrairErro(err?.response?.data || err, 'Portal não encontrado ou link inválido.')))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error || !condominio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Portal não encontrado</h1>
          <p className="text-gray-500 text-sm">{error || 'O QR Code pode estar desatualizado ou o condomínio foi desativado.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            {condominio.empresa_logo ? (
              <img src={condominio.empresa_logo} alt="" className="w-12 h-12 rounded-xl bg-white/20 object-contain p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">
                {condominio.empresa_nome}
              </p>
              <h1 className="text-xl font-bold">{condominio.nome}</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-emerald-100 text-sm">
            {condominio.endereco && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {condominio.endereco}
                {condominio.cidade && `, ${condominio.cidade}/${condominio.estado}`}
              </span>
            )}
            {condominio.total_unidades > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {condominio.total_unidades} unidades
              </span>
            )}
          </div>

          {/* Resumo */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{visitas.length}</p>
              <p className="text-emerald-100 text-xs">Vistorias realizadas</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{pendencias.length}</p>
              <p className="text-emerald-100 text-xs">Pendências resolvidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Vistorias */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-500" /> Vistorias realizadas
          </h2>

          {visitas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma vistoria concluída ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visitas.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {v.titulo || `Vistoria ${v.protocolo}`}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dayjs(v.finalizada_em || v.criado_em).format('DD/MM/YYYY')}
                        </span>
                        {v.supervisor_nome && (
                          <span>Funcionário: {v.supervisor_nome}</span>
                        )}
                        <span className="text-emerald-600 font-medium">
                          {statusLabel[v.status] || v.status}
                        </span>
                      </div>
                    </div>
                    {v.pdf_url && (
                      <a
                        href={v.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium flex-shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pendências resolvidas */}
        {pendencias.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Pendências resolvidas
            </h2>
            <div className="space-y-2">
              {pendencias.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.titulo || p.descricao}</p>
                    <p className="text-xs text-gray-400">
                      Resolvida em {dayjs(p.resolvida_em).format('DD/MM/YYYY')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
          <p>Portal de transparência — {condominio.empresa_nome}</p>
          <p className="mt-1">Gerenciado por <strong className="text-emerald-600">X Vistoria</strong></p>
        </div>
      </div>
    </div>
  )
}
