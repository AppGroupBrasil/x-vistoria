import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    globalThis.addEventListener('online', goOnline)
    globalThis.addEventListener('offline', goOffline)
    return () => {
      globalThis.removeEventListener('online', goOnline)
      globalThis.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 safe-area-top">
      <WifiOff size={16} />
      Sem conexão com a internet
    </div>
  )
}
