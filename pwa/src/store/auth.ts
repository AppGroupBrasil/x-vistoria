import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

interface User {
  id: string; nome: string; email: string
  role: string; empresa_id: string
}

interface AuthState {
  user: User | null
  token: string | null
  lembrar: boolean
  login: (email: string, senha: string, lembrar: boolean) => Promise<void>
  logout: () => void
}

const SESSION_MARK = 'xvistoria-session-alive'

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, lembrar: true,
      login: async (email, senha, lembrar) => {
        const res: any = await api.post('/auth/login', { email, senha })
        localStorage.setItem('token', res.access_token)
        if (!lembrar) sessionStorage.setItem(SESSION_MARK, '1')
        set({ user: res.usuario, token: res.access_token, lembrar })
      },
      logout: () => {
        localStorage.removeItem('token')
        sessionStorage.removeItem(SESSION_MARK)
        set({ user: null, token: null })
      },
    }),
    { name: 'xvistoria-pwa-auth', partialize: (s) => ({ user: s.user, token: s.token, lembrar: s.lembrar }) },
  ),
)

// Sessão temporária: se "lembrar" estiver desmarcado e a aba foi fechada (sessionStorage some), desloga.
if (typeof window !== 'undefined') {
  const s = useAuth.getState()
  if (s.user && s.lembrar === false && !sessionStorage.getItem(SESSION_MARK)) {
    useAuth.getState().logout()
  }
}
