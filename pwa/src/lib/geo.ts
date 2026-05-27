// Solicita a localização do dispositivo. Resolve com { lat, lng } ou null se negar/erro/sem suporte.
export function obterLocalizacao(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    let resolved = false
    const finalizar = (v: { lat: number; lng: number } | null) => {
      if (resolved) return
      resolved = true
      resolve(v)
    }
    const t = setTimeout(() => finalizar(null), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(t); finalizar({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
      () => { clearTimeout(t); finalizar(null) },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}
