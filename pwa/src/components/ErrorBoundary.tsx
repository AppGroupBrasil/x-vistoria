import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Algo deu errado</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Ocorreu um erro inesperado.
            </p>
            <button onClick={this.handleReset} className="btn-primary mx-auto">
              <RefreshCw size={16} /> Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
