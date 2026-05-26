import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { extrairErro } from '../api/erros'
import { Eye, EyeOff, MessageCircle } from 'lucide-react'

const STORAGE_KEY = 'xvistoria-pwa-credenciais'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

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
      await login(email, senha, lembrar)
      if (lembrar) localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, senha }))
      else localStorage.removeItem(STORAGE_KEY)
      navigate('/')
    } catch (err: any) {
      setErro(extrairErro(err, 'Email ou senha inválidos.'))
    } finally {
      setLoading(false)
    }
  }

  const webUrl = import.meta.env.VITE_WEB_URL || ''

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="/logo.png" alt="X Vistoria" className="w-20 h-20 mx-auto mb-3 rounded-2xl" />
          <div className="text-white font-bold text-4xl">X Vistoria</div>
          <div className="text-brand-green/60 text-xs tracking-widest uppercase mt-2">Condominial</div>
        </div>

        <div className="card p-6 space-y-4">
          <h1 className="text-lg font-bold text-gray-900">Entrar</h1>
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="pwa-email" className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
              <input
                id="pwa-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="seu@email.com" required
              />
            </div>
            <div>
              <label htmlFor="pwa-senha" className="text-xs font-semibold text-gray-500 block mb-1">Senha</label>
              <div className="relative">
                <input
                  id="pwa-senha"
                  type={show ? 'text' : 'password'} value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input pr-10" placeholder="••••••••" required
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 select-none mt-1">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
              />
              Manter conectado neste dispositivo
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center">
            <a href={`${webUrl}/esqueci-senha`} target="_blank" rel="noopener noreferrer"
              className="text-sm text-brand-green hover:underline">
              Esqueceu sua senha?
            </a>
          </div>

          <div className="pt-3 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-2">Ainda não tem conta?</p>
            <a href={`${webUrl}/register`} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center py-2.5 px-4 rounded-lg border-2 border-brand-green text-brand-green font-semibold hover:bg-brand-green hover:text-white transition-colors">
              Cadastre-se
            </a>
          </div>
        </div>

        <a
          href="https://wa.me/5511933284364?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20App%20Vistoria"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors"
        >
          <MessageCircle size={18} />
          Suporte via WhatsApp
        </a>
      </div>
    </div>
  )
}
