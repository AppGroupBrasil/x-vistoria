import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './components/NotFoundPage'
import BottomNav from './components/BottomNav'
import OfflineBanner from './components/OfflineBanner'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VisitasPage from './pages/VisitasPage'
import VisitaPage from './pages/VisitaPage'
import ChecklistPage from './pages/ChecklistPage'
import FotosPage from './pages/FotosPage'
import PendenciasPage from './pages/PendenciasPage'

function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="pb-14">
      <OfflineBanner />
      {children}
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/visitas" element={<RequireAuth><VisitasPage /></RequireAuth>} />
      <Route path="/visita/:id" element={<RequireAuth><VisitaPage /></RequireAuth>} />
      <Route path="/visita/:id/checklist" element={<RequireAuth><ChecklistPage /></RequireAuth>} />
      <Route path="/visita/:id/fotos" element={<RequireAuth><FotosPage /></RequireAuth>} />
      <Route path="/visita/:id/pendencias" element={<RequireAuth><PendenciasPage /></RequireAuth>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ErrorBoundary>
  )
}
