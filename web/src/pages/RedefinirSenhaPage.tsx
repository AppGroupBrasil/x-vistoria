import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const NUMERIC_PASSWORD_REGEX = /^\d{6}$/

export default function RedefinirSenhaPage() {
  const { token } = useParams<{ token: string }>()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (senha !== confirmar) {
      toast.error('As senhas não conferem')
      return
    }

    if (!NUMERIC_PASSWORD_REGEX.test(senha)) {
      toast.error('A senha deve conter exatamente 6 dígitos numéricos')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      setSucesso(true)
      toast.success('Senha redefinida com sucesso!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Token inválido ou expirado.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="X Vistoria" className="w-16 h-16 mx-auto mb-3 rounded-2xl" />
          <div className="text-white font-bold text-3xl">X Vistoria</div>
          <div className="text-brand-green/60 text-xs tracking-widest uppercase mt-1">Condominial</div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Redefinir Senha</h1>
          <p className="text-sm text-gray-500 mb-6">Escolha uma nova senha para sua conta.</p>

          {sucesso ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Sua senha foi redefinida com sucesso.</p>
              <Link to="/login" className="btn-primary inline-flex justify-center py-2.5 px-6">
                Ir para o Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-senha" className="label">Nova Senha</label>
                <div className="relative">
                  <input
                    id="reset-senha"
                    type={show ? 'text' : 'password'} value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="input pr-10" placeholder="6 dígitos numéricos" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirmar" className="label">Confirmar Nova Senha</label>
                <input
                  id="reset-confirmar"
                  type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                  className="input" placeholder="••••••••" required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
