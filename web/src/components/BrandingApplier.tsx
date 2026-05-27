import { useEffect } from 'react'
import { useAuth } from '../store/auth'

export default function BrandingApplier() {
  const { user } = useAuth()
  useEffect(() => {
    const cor = user?.empresa_cor
    if (cor && /^#[0-9a-fA-F]{6}$/.test(cor)) {
      document.documentElement.style.setProperty('--brand-green', cor)
    } else {
      document.documentElement.style.removeProperty('--brand-green')
    }
  }, [user?.empresa_cor])
  return null
}
