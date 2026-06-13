import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

// Recebe ?token=<JWT curto da central>, troca por sessão local e entra direto.
export default function SsoPage() {
  const nav = useNavigate()
  const loginSso = useAuth((s) => s.loginSso)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setErro(true); return }
    loginSso(token)
      .then(() => nav('/x-vistoria', { replace: true }))
      .catch(() => setErro(true))
  }, [loginSso, nav])

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p>Não foi possível entrar pelo login único.</p>
        <button onClick={() => nav('/login', { replace: true })} className="px-5 py-2 rounded-lg bg-blue-600 text-white">Ir para o login</button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )
}
