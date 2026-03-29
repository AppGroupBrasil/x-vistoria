import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'

const cache = new Map<string, string>()

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`
  if (cache.has(key)) return cache.get(key) as string

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    )
    if (!res.ok) throw new Error('Geocoding failed')
    const data = await res.json()
    const addr = data.address || {}
    const parts: string[] = []
    const road = addr.road || addr.pedestrian || addr.footway || addr.cycleway || ''
    if (road) parts.push(road)
    if (addr.house_number) parts.push(addr.house_number)
    if (!road && addr.suburb) parts.push(addr.suburb)
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
    const result = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    cache.set(key, result)
    return result
  } catch {
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    cache.set(key, fallback)
    return fallback
  }
}

export default function EnderecoCoords({ lat, lng, className = '' }: Readonly<{ lat: number; lng: number; className?: string }>) {
  const [endereco, setEndereco] = useState<string | null>(null)

  useEffect(() => {
    reverseGeocode(lat, lng).then(setEndereco)
  }, [lat, lng])

  return (
    <div className={`flex items-center gap-1.5 text-xs text-gray-400 ${className}`}>
      <MapPin size={12} className="flex-shrink-0" />
      <span className="truncate">{endereco ?? 'Obtendo endereço...'}</span>
    </div>
  )
}
