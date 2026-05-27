import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { LogOut, UserPlus, Zap, History, Bell, Activity } from 'lucide-react'

type Passo = { topo?: string; titulo?: string; icon: any; to?: string; key: string; rolesOnly?: string[] }

const PASSOS: Passo[] = [
  { key: 'cadastros',    titulo: 'Cadastros', icon: UserPlus, to: '/x-vistoria/cadastros' },
  { key: 'vistoria',     titulo: 'Vistoria', icon: Zap, to: '/x-vistoria/simples' },
  { key: 'historico',    titulo: 'Histórico', icon: History, to: '/x-vistoria/historico' },
  { key: 'notificacoes', titulo: 'Notificações', icon: Bell, to: '/x-vistoria/notificacoes' },
  { key: 'timeline',     titulo: 'Timeline', icon: Activity, to: '/x-vistoria/timeline', rolesOnly: ['master', 'admin', 'sindico'] },
]

const ROLES_VEM_TUDO = new Set(['master', 'admin', 'supervisor', 'sindico'])

export default function HomeV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const veTudo = user?.role && ROLES_VEM_TUDO.has(user.role)
  const base = veTudo
    ? PASSOS
    : PASSOS.filter((p) => (user?.permissoes || []).includes(p.key))
  const permitidos = base.filter((p) => !p.rolesOnly || (user?.role && p.rolesOnly.includes(user.role)))

  const sair = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-base leading-tight">X <span className="text-brand-green">Vistoria</span></div>
            <div className="text-white/60 text-[11px]">Olá, {user?.nome?.split(' ')[0]}</div>
          </div>
        </div>
        <button
          onClick={sair}
          className="p-2 rounded-lg hover:bg-white/10 text-white/70"
          aria-label="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-6 py-12 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-brand-navy leading-none tracking-tight text-center">
          X <span className="text-brand-green">Vistoria</span>
        </h1>
        <p className="mt-4 text-lg md:text-2xl text-gray-600 font-medium text-center">
          Vistoria para condomínios
        </p>

        <div className="mt-12 w-full max-w-6xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {permitidos.length === 0 && (
            <p className="col-span-full text-center text-gray-500 text-sm">
              Nenhuma função liberada. Peça ao seu síndico ou administradora para habilitar suas permissões.
            </p>
          )}
          {permitidos.map((p, i) => {
            const Icon = p.icon
            return (
              <div key={i} className="flex flex-col items-center">
                {p.topo && <div className="text-sm font-semibold text-gray-700 mb-2">{p.topo}</div>}
                <button
                  type="button"
                  onClick={() => p.to && navigate(p.to)}
                  disabled={!p.to}
                  className="aspect-square w-full rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center gap-2 text-white active:scale-95 hover:shadow-xl transition-all p-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Icon size={56} strokeWidth={1.75} />
                  {p.titulo && <span className="text-lg font-bold text-white">{p.titulo}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
