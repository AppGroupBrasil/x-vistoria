import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import SeoHead from '../components/SeoHead'

export default function RegisterPage() {
  const [form, setForm] = useState({
    empresa_nome: '',
    cnpj: '',
    nome: '',
    email: '',
    senha: '',
    confirmar_senha: '',
    telefone: '',
  })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.senha !== form.confirmar_senha) {
      toast.error('As senhas não conferem')
      return
    }

    if (form.senha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res: any = await api.post('/auth/register', {
        empresa_nome: form.empresa_nome,
        cnpj: form.cnpj || undefined,
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone || undefined,
      })
      localStorage.setItem('token', res.access_token)
      login(form.email, form.senha)
      toast.success('Conta criada com sucesso!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar conta.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4">
      <SeoHead title="Cadastro — X Vistoria" description="Crie sua conta gratuita no X Vistoria. Sistema de vistoria condominial para empresas e síndicos." />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="X Vistoria" className="w-16 h-16 mx-auto mb-3 rounded-2xl" />
          <div className="text-white font-bold text-3xl">X Vistoria</div>
          <div className="text-brand-green/60 text-xs tracking-widest uppercase mt-1">Condominial</div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-brand-green mb-1">Cadastre-se</h1>
          <p className="text-sm text-gray-500 mb-6">Crie sua conta de administradora</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-empresa" className="label">Nome da Empresa</label>
              <input
                id="reg-empresa"
                type="text" value={form.empresa_nome} onChange={set('empresa_nome')}
                className="input" placeholder="Administradora XYZ" required
              />
            </div>
            <div>
              <label htmlFor="reg-cnpj" className="label">CNPJ <span className="text-gray-400">(opcional)</span></label>
              <input
                id="reg-cnpj"
                type="text" value={form.cnpj} onChange={set('cnpj')}
                className="input" placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label htmlFor="reg-nome" className="label">Seu Nome</label>
              <input
                id="reg-nome"
                type="text" value={form.nome} onChange={set('nome')}
                className="input" placeholder="João Silva" required
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="label">Email</label>
              <input
                id="reg-email"
                type="email" value={form.email} onChange={set('email')}
                className="input" placeholder="seu@email.com" required
              />
            </div>
            <div>
              <label htmlFor="reg-telefone" className="label">Telefone <span className="text-gray-400">(opcional)</span></label>
              <input
                id="reg-telefone"
                type="tel" value={form.telefone} onChange={set('telefone')}
                className="input" placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label htmlFor="reg-senha" className="label">Senha</label>
              <div className="relative">
                <input
                  id="reg-senha"
                  type={show ? 'text' : 'password'} value={form.senha} onChange={set('senha')}
                  className="input pr-10" placeholder="Mínimo 6 caracteres" required
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirmar" className="label">Confirmar Senha</label>
              <input
                id="reg-confirmar"
                type="password" value={form.confirmar_senha} onChange={set('confirmar_senha')}
                className="input" placeholder="••••••••" required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-brand-green font-semibold hover:underline">Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
