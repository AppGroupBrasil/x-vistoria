import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/auth'
import ErrorBoundary from './components/ErrorBoundary'
import { ConfirmProvider } from './components/ConfirmDialog'
import WhatsAppFab from './components/WhatsAppFab'
import BrandingApplier from './components/BrandingApplier'
import LoginPage from './pages/LoginPage'

// Lazy-loaded pages (code-splitting)
const SsoPage = lazy(() => import('./pages/SsoPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const EsqueciSenhaPage = lazy(() => import('./pages/EsqueciSenhaPage'))
const RedefinirSenhaPage = lazy(() => import('./pages/RedefinirSenhaPage'))
const ChecklistReportPage = lazy(() => import('./pages/ChecklistReportPage'))
const SindicoPage = lazy(() => import('./pages/sindico/SindicoPage'))
const QuestionarioPage = lazy(() => import('./pages/QuestionarioPage'))
const PortalCondominioPage = lazy(() => import('./pages/PortalCondominioPage'))
const PortalEspacoPage = lazy(() => import('./pages/PortalEspacoPage'))
const PontoQrPage = lazy(() => import('./pages/PontoQrPage'))
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
const NotificacoesV2Page = lazy(() => import('./pages/v2/NotificacoesV2Page'))
const TimelineV2Page = lazy(() => import('./pages/v2/TimelineV2Page'))
const AssinarPublicaPage = lazy(() => import('./pages/v2/AssinarPublicaPage'))
const VisitaSimplesPublicaPage = lazy(() => import('./pages/v2/VisitaSimplesPublicaPage'))

const ROLES_VEM_TUDO = new Set(['master', 'admin', 'sindico'])

function RequireAuth({ children, permissao }: Readonly<{ children: React.ReactNode; permissao?: string }>) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (permissao && !ROLES_VEM_TUDO.has(user.role || '') && !(user.permissoes || []).includes(permissao)) {
    return <Navigate to="/x-vistoria" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrandingApplier />
    <ConfirmProvider>
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sso" element={<SsoPage />} />

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
          <RequireAuth permissao="cadastros">
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
          <RequireAuth permissao="vistoria">
            <SimplesV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/simples/:tipo"
        element={
          <RequireAuth permissao="vistoria">
            <SimplesExecV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico"
        element={
          <RequireAuth permissao="historico">
            <HistoricoV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico/:id"
        element={
          <RequireAuth permissao="historico">
            <HistoricoDetailV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/historico/simples/:id"
        element={
          <RequireAuth permissao="historico">
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
      <Route
        path="/x-vistoria/notificacoes"
        element={
          <RequireAuth permissao="notificacoes">
            <NotificacoesV2Page />
          </RequireAuth>
        }
      />
      <Route
        path="/x-vistoria/timeline"
        element={
          <RequireAuth permissao="timeline">
            <TimelineV2Page />
          </RequireAuth>
        }
      />
      {/* Página pública apontada pelo QR Code */}
      <Route path="/v/:id" element={<VisitaPublicaPage />} />
      <Route path="/v/simples/:id" element={<VisitaSimplesPublicaPage />} />
      <Route path="/assinar/:token" element={<AssinarPublicaPage />} />

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

      <Route path="/" element={<Navigate to="/x-vistoria" replace />} />
      <Route path="*" element={<Navigate to="/x-vistoria" replace />} />
    </Routes>
    <WhatsAppFab />
    </Suspense>
    </ConfirmProvider>
    </ErrorBoundary>
  )
}
