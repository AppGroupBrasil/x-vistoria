import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { ArrowLeft, LogOut, Bell } from 'lucide-react'

export default function NotificacoesV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sair = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/x-vistoria')} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <img src="/logo.png" alt="X Vistoria" className="w-9 h-9 rounded-lg" />
          <div>
            <div className="font-bold text-base leading-tight">X <span className="text-brand-green">Vistoria</span></div>
            <div className="text-white/60 text-[11px]">Olá, {user?.nome?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10 text-white/70" aria-label="Sair">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-6 py-10 flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-navy">Notificações</h1>
            <p className="text-gray-500 mt-1">Envie um aviso direto ao morador em caso de ocorrência ou problema identificado.</p>
          </div>

          <div className="p-5 rounded-2xl border-2 border-blue-300 bg-blue-50 flex items-start gap-3">
            <Bell size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900">Para que serve esta tela</p>
              <p className="text-sm text-blue-800 mt-1">
                Este quadrado serve para o funcionário <strong>notificar o morador</strong> sempre que houver
                uma ocorrência ou problema na vistoria — como vazamento, falha em equipamento, irregularidade
                ou qualquer alerta que exija atenção imediata.
              </p>
            </div>
          </div>

          <div className="card p-10 text-center border-2 border-dashed border-gray-300 bg-white rounded-2xl">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-700">Nenhuma notificação enviada ainda</p>
            <p className="text-xs text-gray-500 mt-1">As notificações enviadas aos moradores aparecerão aqui.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
