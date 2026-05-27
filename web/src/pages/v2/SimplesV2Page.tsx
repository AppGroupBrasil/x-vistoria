import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import {
  ArrowLeft, LogOut, Camera, ListChecks, MessageSquareText,
  CheckSquare, ArrowLeftRight, Star,
} from 'lucide-react'

export const TIPOS = [
  { key: 'foto-descricao',    titulo: 'Foto e descrição',       desc: 'Tira foto, escreve descrição, repete.',                icon: Camera },
  { key: 'checklist',         titulo: 'Checklist',              desc: 'Cadastre itens. Em cada um, marque problema com foto.', icon: ListChecks },
  { key: 'pergunta-resposta', titulo: 'Pergunta e Resposta',    desc: 'Pergunta + resposta. Foto opcional em cada uma.',       icon: MessageSquareText },
  { key: 'conformidade',      titulo: 'Conformidade Sim / Não', desc: 'Lista rápida marcando conforme ou não conforme.',       icon: CheckSquare },
  { key: 'antes-depois',      titulo: 'Antes e Depois',         desc: 'Duas fotos lado a lado + descrição.',                   icon: ArrowLeftRight },
  { key: 'avaliacao',         titulo: 'Avaliação por nota',     desc: 'Cada item de 1 a 5 estrelas.',                          icon: Star },
] as const

export default function SimplesV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-brand-navy">Vistoria simples</h1>
            <p className="text-gray-500 mt-1">Escolha o tipo de vistoria. Você adiciona itens e no final salva e envia.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TIPOS.map((t) => (
              <button
                key={t.key}
                onClick={() => navigate(`/x-vistoria/simples/${t.key}`)}
                className="text-left p-5 rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-95 transition-all"
              >
                <t.icon size={36} strokeWidth={1.75} className="mb-3" />
                <div className="font-bold text-lg">{t.titulo}</div>
                <div className="text-xs text-white/80 mt-1 leading-snug">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
