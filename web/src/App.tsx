import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './components/NotFoundPage'
import { ConfirmProvider } from './components/ConfirmDialog'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EsqueciSenhaPage from './pages/EsqueciSenhaPage'
import RedefinirSenhaPage from './pages/RedefinirSenhaPage'
import AdminLayout from './layouts/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import VisitasPage from './pages/admin/VisitasPage'
import VisitaDetailPage from './pages/admin/VisitaDetailPage'
import CondominiosPage from './pages/admin/CondominiosPage'
import UsuariosPage from './pages/admin/UsuariosPage'
import TimelinePage from './pages/admin/TimelinePage'
import TemplatesPage from './pages/admin/TemplatesPage'
import VisitaEditPage from './pages/admin/VisitaEditPage'
import EmpresasPage from './pages/admin/EmpresasPage'
import CategoriasPage from './pages/admin/CategoriasPage'
import RelatoriosPage from './pages/admin/RelatoriosPage'
import PendenciasPage from './pages/admin/PendenciasPage'
import ConfiguracoesPage from './pages/admin/ConfiguracoesPage'
import LocalizacaoPage from './pages/admin/LocalizacaoPage'
import VistoriaLivrePage from './pages/admin/VistoriaLivrePage'
import VistoriaLivreExecPage from './pages/admin/VistoriaLivreExecPage'
import ChecklistDashPage from './pages/admin/ChecklistDashPage'
import ChecklistExecPage from './pages/admin/ChecklistExecPage'
import ChecklistReportPage from './pages/ChecklistReportPage'
import SindicoPage from './pages/sindico/SindicoPage'
import QuestionarioPage from './pages/QuestionarioPage'
import PortalCondominioPage from './pages/PortalCondominioPage'
import PortalEspacoPage from './pages/PortalEspacoPage'
import PontoQrPage from './pages/PontoQrPage'
import AtividadesPage from './pages/admin/AtividadesPage'

function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <ConfirmProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha/:token" element={<RedefinirSenhaPage />} />

      {/* Síndico portal — rota pública com token */}
      <Route path="/sindico/:token" element={<SindicoPage />} />

      {/* Questionário público — link compartilhável */}
      <Route path="/questionario/:id" element={<QuestionarioPage />} />

      {/* Checklist público — relatório compartilhável */}
      <Route path="/checklist-report/:id" element={<ChecklistReportPage />} />

      {/* Portal público do condomínio — QR Code */}
      <Route path="/portal/:token" element={<PortalCondominioPage />} />

      {/* Portal público do espaço — QR Code específico */}
      <Route path="/portal/espaco/:token" element={<PortalEspacoPage />} />

      {/* QR Code Ponto — registro de presença */}
      <Route path="/ponto/:token" element={<PontoQrPage />} />

      {/* Admin panel — protegido */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="visitas" element={<VisitasPage />} />
        <Route path="visitas/:id" element={<VisitaDetailPage />} />
        <Route path="visitas/:id/editar" element={<VisitaEditPage />} />
        <Route path="condominios" element={<CondominiosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="vistoria" element={<TemplatesPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="pendencias" element={<PendenciasPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="localizacao" element={<LocalizacaoPage />} />
        <Route path="vistoria-livre" element={<VistoriaLivrePage />} />
        <Route path="vistoria-livre/:id" element={<VistoriaLivreExecPage />} />
        <Route path="checklist-avulso" element={<ChecklistDashPage />} />
        <Route path="checklist-avulso/:id" element={<ChecklistExecPage />} />
        <Route path="atividades" element={<AtividadesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>

    </ConfirmProvider>
    </ErrorBoundary>
  )
}
