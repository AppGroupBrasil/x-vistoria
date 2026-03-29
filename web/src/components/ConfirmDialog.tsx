import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

export function ConfirmProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
    resolve: ((v: boolean) => void) | null
  }>({ open: false, options: { message: '' }, resolve: null })

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve })
    })
  }, [])

  const handleClose = (result: boolean) => {
    state.resolve?.(result)
    setState({ open: false, options: { message: '' }, resolve: null })
  }

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    default: 'bg-brand-navy hover:bg-brand-navy/90 text-white',
  }

  const contextValue = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="fixed inset-0 bg-black/50 border-0 cursor-default" onClick={() => handleClose(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <button
              onClick={() => handleClose(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {state.options.title ?? 'Confirmar'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {state.options.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleClose(false)}
                className="btn-secondary text-sm"
              >
                {state.options.cancelText ?? 'Cancelar'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variantClasses[state.options.variant ?? 'danger']}`}
              >
                {state.options.confirmText ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
