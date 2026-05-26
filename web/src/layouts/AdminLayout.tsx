import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useTodasPendencias } from '../api/hooks'
import { useSetupProgress } from '../api/useSetupProgress'
import {
  LayoutDashboard, ClipboardList, FolderOpen, BarChart3, Settings as SettingsIcon,
  LogOut, Bell, ChevronDown, ChevronRight, X, Moon, Sun, Menu,
  Building2, Users, LayoutTemplate, FileBarChart, Activity, Briefcase,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'

type Item = { to: string; label: string; icon?: any }
type Group = { key: string; label: string; icon: any; to?: string; children?: Item[]; roles?: string[] }

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userOpen, setUserOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const { data: pendencias = [] } = useTodasPendencias()
  const { allDone } = useSetupProgress()

  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const role = user?.role || ''
  const isAdmin = role === 'admin' || role === 'master'
  const isMaster = role === 'master'

  const grupos: Group[] = useMemo(() => [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { key: 'visitas', label: 'Visitas', icon: ClipboardList, to: '/visitas' },
    {
      key: 'cadastros', label: 'Cadastros', icon: FolderOpen, roles: ['admin', 'master'],
      children: [
        { to: '/condominios', label: 'Condomínios', icon: Building2 },
        { to: '/usuarios', label: 'Funcionários', icon: Users },
        { to: '/vistoria', label: 'Modelos', icon: LayoutTemplate },
      ],
    },
    {
      key: 'analise', label: 'Análise', icon: BarChart3,
      children: [
        { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
        ...(isAdmin ? [{ to: '/timeline', label: 'Timeline', icon: Activity }] : []),
      ],
    },
    {
      key: 'admin', label: 'Admin', icon: SettingsIcon, roles: ['admin', 'master'],
      children: [
        { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
        ...(isMaster ? [{ to: '/empresas', label: 'Empresas', icon: Briefcase }] : []),
      ],
    },
  ], [isAdmin, isMaster])

  // Lista achatada para o grid mobile (todos os itens navegáveis)
  const mobileItems: Item[] = useMemo(() => {
    const out: Item[] = []
    grupos.forEach((g) => {
      if (g.roles && !g.roles.includes(role)) return
      if (!allDone && g.key !== 'dashboard') return
      if (g.to) out.push({ to: g.to, label: g.label, icon: g.icon })
      g.children?.forEach((c) => out.push(c))
    })
    return out
  }, [grupos, role, allDone])

  useEffect(() => {
    const path = location.pathname
    const ativo = grupos.find((g) => g.children?.some((c) => path.startsWith(c.to)))
    if (ativo && !openGroups[ativo.key]) {
      setOpenGroups((prev) => ({ ...prev, [ativo.key]: true }))
    }
  }, [location.pathname, grupos])

  const pendenciasAbertas = pendencias.filter((p: any) => p.status === 'aberta')
  const totalNotif = pendenciasAbertas.length
  const handleLogout = () => { logout(); navigate('/login') }

  const itemClass = (active: boolean) => clsx(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
    active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar desktop (lg+) */}
      <aside className="hidden lg:flex w-60 bg-brand-navy sidebar-navy flex-col shadow-xl">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="text-white font-bold text-lg leading-tight">
              X <span className="text-brand-green">Vistoria</span>
            </div>
            <div className="text-white/80 text-xs tracking-widest uppercase">Condominial</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {grupos.map((g) => {
            if (g.roles && !g.roles.includes(role)) return null
            if (!allDone && g.key !== 'dashboard') return null

            if (g.to) {
              return (
                <NavLink key={g.key} to={g.to} className={({ isActive }) => itemClass(isActive)}>
                  <g.icon size={18} />
                  {g.label}
                </NavLink>
              )
            }

            const isOpen = !!openGroups[g.key]
            const childActive = g.children?.some((c) => location.pathname.startsWith(c.to))
            return (
              <div key={g.key}>
                <button
                  onClick={() => setOpenGroups((p) => ({ ...p, [g.key]: !isOpen }))}
                  className={clsx(itemClass(!!childActive), 'w-full justify-between')}
                >
                  <span className="flex items-center gap-3">
                    <g.icon size={18} />
                    {g.label}
                  </span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {g.children?.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        className={({ isActive }) => clsx(
                          'block px-3 py-1.5 rounded-md text-xs transition-all',
                          isActive ? 'text-white font-semibold' : 'text-white/50 hover:text-white',
                        )}
                      >
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white text-sm transition-all"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Modo claro' : 'Modo escuro'}
          </button>
        </div>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
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
              <LogOut size={16} /> Sair
            </button>
          )}
        </div>
      </aside>

      {/* Mobile grid (telas pequenas) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-brand-navy flex flex-col lg:hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
              <div className="text-white font-bold text-lg">X <span className="text-brand-green">Vistoria</span></div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white/70 hover:text-white">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 px-4 py-6 grid grid-cols-3 gap-3 auto-rows-min">
            {mobileItems.map((it) => {
              const Icon = it.icon || LayoutDashboard
              return (
                <button
                  key={it.to}
                  onClick={() => { navigate(it.to); setMobileMenuOpen(false) }}
                  className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white"
                >
                  <Icon size={28} />
                  <span className="text-[11px] font-medium text-center leading-tight px-1">{it.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-4 border-t border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.nome}</div>
              <div className="text-white/50 text-xs capitalize">{user?.role}</div>
            </div>
            <button onClick={toggleDark} className="p-2 text-white/70 hover:text-white" aria-label="Modo escuro">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className="p-2 text-red-400 hover:text-red-300" aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm text-gray-500 truncate">{user?.empresa_nome}</div>
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

          {showNotif && (
            <div className="absolute right-4 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-bold text-sm text-gray-900">Pendências abertas</span>
                <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {pendenciasAbertas.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">Nenhuma pendência aberta</div>
                ) : pendenciasAbertas.slice(0, 10).map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => { setShowNotif(false); if (p.visita_id) navigate(`/visitas/${p.visita_id}`) }}
                  >
                    <div className="font-semibold text-gray-800 truncate">{p.titulo}</div>
                    <div className="text-xs text-gray-400">{p.condominio_nome} · {p.prioridade}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
