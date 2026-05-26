import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import toast from 'react-hot-toast'
import { Eye, EyeOff, MessageCircle } from 'lucide-react'
import SeoHead from '../components/SeoHead'

const STORAGE_KEY = 'xvistoria-web-credenciais'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const [erro, setErro] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const { email: e, senha: s } = JSON.parse(raw)
        if (e) setEmail(e)
        if (s) setSenha(s)
        setLembrar(true)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      await login(email, senha)
      if (lembrar) localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, senha }))
      else localStorage.removeItem(STORAGE_KEY)
      navigate('/dashboard')
    } catch (err: any) {
      let msg = ''
      if (!err) {
        msg = 'Erro desconhecido. Tente novamente.'
      } else if (err.statusCode === 401) {
        msg = 'Email ou senha incorretos.'
      } else if (err.statusCode === 429) {
        msg = 'Muitas tentativas. Aguarde um momento e tente novamente.'
      } else if (err.statusCode === 400) {
        msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Dados inválidos.')
      } else if (err.statusCode >= 500) {
        msg = `Erro no servidor (${err.statusCode}). Tente novamente em instantes.`
      } else if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        msg = 'Sem conexão com o servidor. Verifique sua internet ou tente novamente.'
      } else if (err.code === 'ECONNABORTED') {
        msg = 'Tempo de conexão esgotado. O servidor pode estar fora do ar.'
      } else {
        msg = typeof err.message === 'string' ? err.message : 'Falha ao fazer login. Tente novamente.'
      }
      setErro(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <SeoHead title="Login — X Vistoria" description="Acesse o painel de vistoria condominial. Gerencie vistorias, checklists e relatórios." />
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="X Vistoria" className="w-16 h-16 mx-auto mb-3 rounded-2xl" />
          <div className="text-white font-bold text-3xl">X Vistoria</div>
          <div className="text-white/80 text-xs tracking-widest uppercase mt-1">Condominial</div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Entrar</h1>
          <p className="text-sm text-gray-500 mb-6">Acesse o painel administrativo</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="login-senha" className="label">Senha</label>
              <div className="relative">
                <input
                  id="login-senha"
                  type={show ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
              />
              Manter conectado neste dispositivo
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {erro && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {erro}
              </div>
            )}
          </form>

          <div className="mt-4 text-center">
            <Link to="/esqueci-senha" className="text-sm text-brand-green hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-3">Ainda não tem conta?</p>
            <Link
              to="/register"
              className="block w-full text-center py-2.5 px-4 rounded-lg border-2 border-brand-green text-brand-green font-semibold hover:bg-brand-green hover:text-white transition-colors"
            >
              Cadastre-se
            </Link>
          </div>
        </div>

        <a
          href="https://wa.me/5511933284364?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20App%20Vistoria"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors"
        >
          <MessageCircle size={18} />
          Suporte via WhatsApp
        </a>

        <p className="text-center text-white/30 text-xs mt-6">
          X Vistoria Condominial © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
