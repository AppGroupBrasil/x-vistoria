import { useNavigate } from 'react-router-dom'
import { useSetupProgress } from '../api/useSetupProgress'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

const STEP_ROUTES: Record<string, string> = {
  condominios: '/condominios',
  usuarios: '/usuarios',
  categorias: '/categorias',
  templates: '/vistoria',
  visitas: '/visitas',
}

const STEP_ORDER = ['condominios', 'usuarios', 'categorias', 'templates', 'visitas']

export default function SetupBanner({ currentKey }: { currentKey: string }) {
  const { steps, allDone, completedSteps } = useSetupProgress()
  const navigate = useNavigate()

  if (allDone) return null

  const currentIndex = STEP_ORDER.indexOf(currentKey)
  const currentStep = steps.find(s => s.key === currentKey)
  const nextKey = currentIndex < STEP_ORDER.length - 1 ? STEP_ORDER[currentIndex + 1] : null
  const nextStep = nextKey ? steps.find(s => s.key === nextKey) : null
  const prevKey = currentIndex > 0 ? STEP_ORDER[currentIndex - 1] : null

  return (
    <div className="bg-brand-navy text-white rounded-xl p-4 mb-6 shadow-lg dark:!bg-white dark:!text-gray-900">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-brand-green/20 flex items-center justify-center text-sm font-bold dark:text-brand-green">
            {currentStep?.done ? <Check size={16} /> : currentStep?.step}
          </div>
          <div>
            <div className="text-xs text-white/60 dark:text-gray-500 uppercase tracking-wider">
              Passo {currentStep?.step} de {steps.length} — Configuração inicial
            </div>
            <div className="font-semibold dark:text-gray-900">{currentStep?.label}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
          {steps.map((s) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-all ${s.done ? 'bg-green-400 dark:bg-brand-green' : s.key === currentKey ? 'bg-white/50 dark:bg-gray-300' : 'bg-white/15 dark:bg-gray-200'}`}
            />
          ))}
          <span className="text-xs text-white/60 dark:text-gray-500 ml-1">{completedSteps}/{steps.length}</span>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {prevKey && (
            <button
              onClick={() => navigate(STEP_ROUTES[prevKey])}
              className="flex items-center gap-1 text-sm text-white/70 hover:text-white dark:text-gray-500 dark:hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-100"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          )}
          {!prevKey && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-sm text-white/70 hover:text-white dark:text-gray-500 dark:hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-100"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
          )}
          {nextStep && currentStep?.done && (
            <button
              onClick={() => navigate(STEP_ROUTES[nextKey!])}
              className="flex items-center gap-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 dark:bg-brand-green dark:hover:bg-brand-green-dark text-white px-4 py-2 rounded-lg transition-colors shadow"
            >
              {nextStep.label} <ArrowRight size={14} />
            </button>
          )}
          {!nextStep && currentStep?.done && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 dark:bg-brand-green dark:hover:bg-brand-green-dark text-white px-4 py-2 rounded-lg transition-colors shadow"
            >
              Concluir <Check size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
