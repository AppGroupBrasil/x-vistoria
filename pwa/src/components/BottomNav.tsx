import { NavLink } from 'react-router-dom'
import { Home, ClipboardList } from 'lucide-react'
import clsx from 'clsx'

const items = [
  { to: '/', icon: Home, label: 'Início', end: true },
  { to: '/visitas', icon: ClipboardList, label: 'Vistorias', end: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-brand-navy dark:text-brand-green'
                  : 'text-gray-400 dark:text-gray-500'
              )
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
