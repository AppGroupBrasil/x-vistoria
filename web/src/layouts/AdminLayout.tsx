import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useTodasPendencias } from '../api/hooks'
import { useSetupProgress } from '../api/useSetupProgress'
import {
  LayoutDashboard, ClipboardList, Building2,
  Users, LogOut, Bell, ChevronDown, Briefcase, X,
  Moon, Sun, Menu, LayoutTemplate, Settings, Activity, MapPin, ClipboardCheck, ListChecks, Shield,
  AlertCircle, FileBarChart
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userOpen, setUserOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const { data: pendencias = [] } = useTodasPendencias()
  const { allDone } = useSetupProgress()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const pendenciasAbertas = pendencias.filter((p: any) => p.status === 'aberta')
  const totalNotif = pendenciasAbertas.length

  const role = user?.role || ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden border-none cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-60 bg-brand-navy sidebar-navy flex flex-col shadow-xl transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              X <span className="text-brand-green">Vistoria</span>
            </div>
            <div className="text-white/80 text-xs tracking-widest uppercase">
              Condominial
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          {/* Itens do menu — só aparecem após configuração inicial completa */}
          {allDone && (
            <>
              {/* 1. Condomínios — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/condominios"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Building2 size={18} />
                  Condomínios
                </NavLink>
              )}

              {/* 2. Usuários/Funcionários — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/usuarios"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Users size={18} />
                  Funcionários
                </NavLink>
              )}

              {/* Modelos de Vistoria — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/vistoria"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <LayoutTemplate size={18} />
                  Modelos de Vistoria
                </NavLink>
              )}

              {/* 5. Vistorias */}
              <NavLink
                to="/visitas"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive || location.pathname.startsWith('/visitas/')
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <ClipboardList size={18} />
                Vistorias
              </NavLink>

              {/* 6. Pendências */}
              <NavLink
                to="/pendencias"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <AlertCircle size={18} />
                Pendências
              </NavLink>

              {/* 7. Timeline — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/timeline"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Activity size={18} />
                  Timeline
                </NavLink>
              )}

              {/* 8. Relatórios */}
              <NavLink
                to="/relatorios"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <FileBarChart size={18} />
                Relatórios
              </NavLink>

              {/* Vistoria Livre */}
              <NavLink
                to="/vistoria-livre"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive || location.pathname.startsWith('/vistoria-livre/')
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <ClipboardCheck size={18} />
                Vistoria Livre
              </NavLink>

              {/* Checklist */}
              <NavLink
                to="/checklist-avulso"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive || location.pathname.startsWith('/checklist-avulso/')
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <ListChecks size={18} />
                Checklist
              </NavLink>

              {/* Localização — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/localizacao"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <MapPin size={18} />
                  Localização
                </NavLink>
              )}

              {/* Registro de Atividades — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/atividades"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Shield size={18} />
                  Atividades
                </NavLink>
              )}

              {/* Empresas — master only */}
              {role === 'master' && (
                <NavLink
                  to="/empresas"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Briefcase size={18} />
                  Empresas
                </NavLink>
              )}

              {/* Configurações — admin/master */}
              {(role === 'admin' || role === 'master') && (
                <NavLink
                  to="/configuracoes"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Settings size={18} />
                  Configurações
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Dark mode toggle */}
        <div className="px-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white text-sm transition-all"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Modo claro' : 'Modo escuro'}
          </button>
        </div>

        {/* WhatsApp */}
        <div className="px-3">
          <a
            href="https://wa.me/5511933284364"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[#25D366] text-white hover:bg-[#1ebe57] text-sm font-medium transition-all"
          >
            <svg viewBox="0 0 32 32" className="w-[18px] h-[18px] fill-current flex-shrink-0">
              <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.2l6.012-1.93A15.906 15.906 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.302 22.602c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.656-1.216-4.748-1.966-7.804-6.788-8.04-7.104-.226-.316-1.9-2.53-1.9-4.826s1.2-3.426 1.628-3.894c.39-.426 1.03-.638 1.644-.638.198 0 .376.01.536.018.428.018.642.044.924.716.352.84 1.212 2.952 1.318 3.168.108.216.216.504.072.792-.134.296-.252.428-.468.678-.216.25-.422.44-.638.71-.198.234-.42.484-.178.928.242.444 1.078 1.778 2.314 2.88 1.59 1.416 2.93 1.856 3.346 2.062.416.206.66.178.902-.098.25-.284 1.068-1.24 1.352-1.666.276-.426.56-.354.942-.212.384.134 2.494 1.176 2.922 1.392.428.216.714.322.82.504.104.18.104 1.06-.286 2.16z" />
            </svg>
            Suporte WhatsApp
          </a>
        </div>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="text-white text-sm font-medium truncate">{user?.nome}</div>
              <div className="text-white/50 text-xs capitalize">{user?.role}</div>
            </div>
            <ChevronDown size={14} className="text-white/50" />
          </button>
          {userOpen && (
            <button
              onClick={handleLogout}
              className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-white/10 text-sm transition-all"
            >
              <LogOut size={16} />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm text-gray-500">
              {user?.empresa_nome}
            </div>
          </div>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Bell size={20} />
            {totalNotif > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalNotif > 99 ? '99+' : totalNotif}
              </span>
            )}
          </button>

          {/* Dropdown notificações */}
          {showNotif && (
            <div className="absolute right-4 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-bold text-sm text-gray-900">Notificações</span>
                <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {pendenciasAbertas.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">Nenhuma notificação</div>
                ) : pendenciasAbertas.slice(0, 10).map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => { setShowNotif(false); navigate('/pendencias') }}
                  >
                    <div className="font-semibold text-gray-800 truncate">{p.titulo}</div>
                    <div className="text-xs text-gray-400">{p.condominio_nome} · {p.prioridade}</div>
                  </button>
                ))}
              </div>
              {pendenciasAbertas.length > 0 && (
                <button
                  onClick={() => { setShowNotif(false); navigate('/pendencias') }}
                  className="w-full py-2.5 text-sm text-brand-navy font-semibold hover:bg-gray-50 border-t border-gray-100"
                >
                  Ver todas as pendências
                </button>
              )}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
