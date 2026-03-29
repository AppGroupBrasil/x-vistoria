import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import SeoHead from '../components/SeoHead'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <SeoHead title="Recuperar Senha — X Vistoria" description="Recupere sua senha de acesso ao X Vistoria." noindex />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="X Vistoria" className="w-16 h-16 mx-auto mb-3 rounded-2xl" />
          <div className="text-white font-bold text-3xl">X Vistoria</div>
          <div className="text-brand-green/60 text-xs tracking-widest uppercase mt-1">Condominial</div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Esqueceu sua senha?</h1>
          <p className="text-sm text-gray-500 mb-6">
            Informe seu email para receber um link de redefinição.
          </p>

          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Se o email estiver cadastrado, você receberá um link de redefinição em breve.
              </p>
              <Link to="/login" className="text-sm text-brand-green hover:underline block">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="label">Email</label>
                <input
                  id="forgot-email"
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="seu@email.com" required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
