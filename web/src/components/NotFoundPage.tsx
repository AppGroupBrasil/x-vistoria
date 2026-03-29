import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-brand-navy/20 dark:text-white/10 mb-2">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Página não encontrada</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            <Home size={16} /> Ir ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
