import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Loader2, ChevronRight, MapPin, Calendar, CheckCircle, Clock } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguardando',
  concluida: 'Concluída',
  aprovada: 'Aprovada',
}
const STATUS_COR: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  concluida: 'bg-green-100 text-green-700',
  aprovada: 'bg-green-200 text-green-800',
}

interface ItemHist {
  id: string; protocolo: string; status: string
  categoria?: 'template' | 'simples'
  tipo_label?: string
  condominio_nome: string; condominio_endereco?: string
  vistoriador_nome: string; template_nome?: string
  criado_em: string; iniciada_em?: string; finalizada_em?: string
  total_perguntas: number; total_respondidas: number
}

function fmt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoricoV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [itens, setItens] = useState<ItemHist[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get('/historico')
      .then((r: any) => setItens(r as ItemHist[]))
      .catch((e: any) => toast.error(e?.erro || 'Erro ao carregar histórico'))
      .finally(() => setCarregando(false))
  }, [])

  const sair = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-base leading-tight">X <span className="text-brand-green">Vistoria</span></div>
            <div className="text-white/60 text-[11px]">Olá, {user?.nome?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-6 py-10 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-brand-navy">Histórico</h1>
            <p className="text-gray-500 mt-1">Todas as vistorias realizadas. Toque para abrir o relatório.</p>
          </div>

          {carregando && (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
          )}

          {!carregando && itens.length === 0 && (
            <div className="card p-8 text-center text-sm text-gray-500">
              Nenhuma vistoria ainda. Faça seu primeiro cadastro no <strong>1º passo</strong>.
            </div>
          )}

          <div className="space-y-2">
            {itens.map((it) => (
              <button
                key={`${it.categoria ?? 'template'}-${it.id}`}
                onClick={() => navigate(
                  it.categoria === 'simples'
                    ? `/x-vistoria/historico/simples/${it.id}`
                    : `/x-vistoria/historico/${it.id}`,
                )}
                className="w-full text-left card p-4 hover:shadow-md active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 truncate">{it.condominio_nome}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[it.status] || 'bg-gray-100'}`}>
                        {STATUS_LABEL[it.status] || it.status}
                      </span>
                      {it.categoria === 'simples' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Vistoria
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                      <MapPin size={11} /> {it.condominio_endereco || '—'}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {fmt(it.criado_em)}</span>
                      {it.iniciada_em && <span className="flex items-center gap-1"><Clock size={10} /> Início {fmt(it.iniciada_em)}</span>}
                      {it.finalizada_em && <span className="flex items-center gap-1"><CheckCircle size={10} /> Fim {fmt(it.finalizada_em)}</span>}
                      <span>Funcionário: {it.vistoriador_nome}</span>
                      <span>#{it.protocolo}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 mt-1 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
