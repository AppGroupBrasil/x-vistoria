import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './components/NotFoundPage'
import OfflineBanner from './components/OfflineBanner'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VisitaPage from './pages/VisitaPage'
import ChecklistPage from './pages/ChecklistPage'

function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/visitas" element={<Navigate to="/" replace />} />
      <Route path="/visita/:id" element={<RequireAuth><VisitaPage /></RequireAuth>} />
      <Route path="/visita/:id/checklist" element={<RequireAuth><ChecklistPage /></RequireAuth>} />
      <Route path="/visita/:id/fotos" element={<Navigate to=".." replace />} />
      <Route path="/visita/:id/pendencias" element={<Navigate to=".." replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ErrorBoundary>
  )
}
