import axios, { type AxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const instance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30_000,
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect if already on login page (avoids swallowing login errors)
      const isLoginPage = globalThis.location.pathname === '/login'
      if (!isLoginPage) {
        localStorage.removeItem('token')
        globalThis.location.href = '/login'
      }
    }
    return Promise.reject(err.response?.data || err)
  },
)

// The response interceptor unwraps res.data, so override return types
interface TypedApi {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
}

export const api = instance as unknown as TypedApi
