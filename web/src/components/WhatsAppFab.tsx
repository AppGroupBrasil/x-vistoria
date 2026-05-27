import { MessageCircle } from 'lucide-react'

const NUMERO = '5511933284364'
const HREF = `https://wa.me/${NUMERO}?text=${encodeURIComponent('Olá! Preciso de ajuda com o X Vistoria.')}`

export default function WhatsAppFab() {
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Suporte via WhatsApp"
      title="Suporte via WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/40 flex items-center justify-center hover:bg-[#1ebe57] hover:scale-105 active:scale-95 transition-all"
    >
      <MessageCircle size={28} fill="currentColor" />
    </a>
  )
}
