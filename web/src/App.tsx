import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './components/NotFoundPage'
import { ConfirmProvider } from './components/ConfirmDialog'
import LoginPage from './pages/LoginPage'

// Lazy-loaded pages (code-splitting)
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const EsqueciSenhaPage = lazy(() => import('./pages/EsqueciSenhaPage'))
const RedefinirSenhaPage = lazy(() => import('./pages/RedefinirSenhaPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const VisitasPage = lazy(() => import('./pages/admin/VisitasPage'))
const VisitaDetailPage = lazy(() => import('./pages/admin/VisitaDetailPage'))
const CondominiosPage = lazy(() => import('./pages/admin/CondominiosPage'))
const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'))
const TimelinePage = lazy(() => import('./pages/admin/TimelinePage'))
const TemplatesPage = lazy(() => import('./pages/admin/TemplatesPage'))
const VisitaEditPage = lazy(() => import('./pages/admin/VisitaEditPage'))
const EmpresasPage = lazy(() => import('./pages/admin/EmpresasPage'))
const CategoriasPage = lazy(() => import('./pages/admin/CategoriasPage'))
const RelatoriosPage = lazy(() => import('./pages/admin/RelatoriosPage'))
const PendenciasPage = lazy(() => import('./pages/admin/PendenciasPage'))
const ConfiguracoesPage = lazy(() => import('./pages/admin/ConfiguracoesPage'))
const LocalizacaoPage = lazy(() => import('./pages/admin/LocalizacaoPage'))
const VistoriaLivrePage = lazy(() => import('./pages/admin/VistoriaLivrePage'))
const VistoriaLivreExecPage = lazy(() => import('./pages/admin/VistoriaLivreExecPage'))
const ChecklistDashPage = lazy(() => import('./pages/admin/ChecklistDashPage'))
const ChecklistExecPage = lazy(() => import('./pages/admin/ChecklistExecPage'))
const ChecklistReportPage = lazy(() => import('./pages/ChecklistReportPage'))
const SindicoPage = lazy(() => import('./pages/sindico/SindicoPage'))
const QuestionarioPage = lazy(() => import('./pages/QuestionarioPage'))
const PortalCondominioPage = lazy(() => import('./pages/PortalCondominioPage'))
const PortalEspacoPage = lazy(() => import('./pages/PortalEspacoPage'))
const PontoQrPage = lazy(() => import('./pages/PontoQrPage'))
const AtividadesPage = lazy(() => import('./pages/admin/AtividadesPage'))
const HomeV2Page = lazy(() => import('./pages/v2/HomeV2Page'))
const CadastrosV2Page = lazy(() => import('./pages/v2/CadastrosV2Page'))
const QuemOndeV2Page = lazy(() => import('./pages/v2/QuemOndeV2Page'))
const SimplesV2Page = lazy(() => import('./pages/v2/SimplesV2Page'))
const SimplesExecV2Page = lazy(() => import('./pages/v2/SimplesExecV2Page'))
const HistoricoV2Page = lazy(() => import('./pages/v2/HistoricoV2Page'))
const HistoricoDetailV2Page = lazy(() => import('./pages/v2/HistoricoDetailV2Page'))
const VisitaPublicaPage = lazy(() => import('./pages/v2/VisitaPublicaPage'))
const SimplesDetailV2Page = lazy(() => import('./pages/v2/SimplesDetailV2Page'))
const BibliotecaV2Page = lazy(() => import('./pages/v2/BibliotecaV2Page'))
const VisitaSimplesPublicaPage = lazy(() => import('./pages/v2/VisitaSimplesPublicaPage'))

function RequireAuth({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <ConfirmProvider>
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* X Vistoria — nova versão simplificada, em construção */}
      <Route
        path="/x-vistoria"
        element={
          <RequireAuth>
            <HomeV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/cadastros"
        element={
          <RequireAuth>
            <CadastrosV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/quem-e-onde"
        element={
          <RequireAuth>
            <QuemOndeV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/simples"
        element={
          <RequireAuth>
            <SimplesV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/simples/:tipo"
        element={
          <RequireAuth>
            <SimplesExecV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico"
        element={
          <RequireAuth>
            <HistoricoV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico/:id"
        element={
          <RequireAuth>
            <HistoricoDetailV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico/simples/:id"
        element={
          <RequireAuth>
            <SimplesDetailV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/biblioteca"
        element={
          <RequireAuth>
            <BibliotecaV2Page />
          </RequireAuth>
        }
      />
      {/* Página pública apontada pelo QR Code */}
      <Route path="/v/:id" element={<VisitaPublicaPage />} />
      <Route path="/v/simples/:id" element={<VisitaSimplesPublicaPage />} />

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
    </Suspense>
    </ConfirmProvider>
    </ErrorBoundary>
  )
}
