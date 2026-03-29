import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginPage = globalThis.location.pathname === '/login'
      if (!isLoginPage) {
        localStorage.removeItem('token')
        globalThis.location.href = '/login'
      }
    }
    return Promise.reject(err.response?.data || err)
  },
)
