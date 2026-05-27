import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Download, CheckSquare, Square, MessageCircle } from 'lucide-react'
import clsx from 'clsx'
import { BIBLIOTECA, CATEGORIAS, STORAGE_KEY, destinoURL, toItens, type CategoriaBib } from '../../data/biblioteca'

export default function BibliotecaV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from') as CategoriaBib | null
  const fromValido = from && CATEGORIAS.some((c) => c.key === from) ? from : null
  const [aba, setAba] = useState<CategoriaBib>(fromValido || 'personalizada')

  useEffect(() => {
    if (fromValido) setAba(fromValido)
  }, [fromValido])
  const [sel, setSel] = useState<Record<CategoriaBib, Set<string>>>(
    Object.fromEntries(CATEGORIAS.map((c) => [c.key, new Set<string>()])) as any,
  )

  const sair = () => { logout(); navigate('/login') }
  const lista = BIBLIOTECA[aba]
  const selAtual = sel[aba]

  const toggle = (texto: string) => {
    setSel((prev) => {
      const next = new Set(prev[aba])
      if (next.has(texto)) next.delete(texto); else next.add(texto)
      return { ...prev, [aba]: next }
    })
  }

  const marcarTodos = () => setSel((prev) => ({ ...prev, [aba]: new Set(lista) }))
  const desmarcarTodos = () => setSel((prev) => ({ ...prev, [aba]: new Set() }))

  const importar = () => {
    if (selAtual.size === 0) return toast.error('Marque pelo menos uma questão')
    const textos = lista.filter((t) => selAtual.has(t))
    const itens = toItens(aba, textos)
    localStorage.setItem(STORAGE_KEY(aba), JSON.stringify(itens))
    toast.success(`${textos.length} questão(ões) importada(s)`)
    navigate(destinoURL(aba))
  }

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

      <main className="flex-1 px-6 py-10 flex justify-center pb-28">
        <div className="w-full max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-brand-navy">Biblioteca de questões</h1>
            <p className="text-gray-500 mt-1">
              Escolha o tipo de vistoria, marque o que precisa e clique em <strong>Importar</strong>. Vai pra tela da vistoria já preenchida.
            </p>
            {fromValido && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                <strong>Modo anexar:</strong> as questões marcadas serão adicionadas à vistoria que você já estava preenchendo.
              </div>
            )}
          </div>

          {/* Abas */}
          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIAS.map((c) => (
              <button
                key={c.key}
                onClick={() => setAba(c.key)}
                className={clsx(
                  'px-3 py-2 rounded-full text-xs font-bold transition-colors',
                  aba === c.key ? 'bg-brand-navy text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400',
                )}
              >
                {c.label}
                {sel[c.key].size > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-brand-green text-white">{sel[c.key].size}</span>
                )}
              </button>
            ))}
          </div>

          {/* Ações topo */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="text-gray-500">
              {selAtual.size} de {lista.length} selecionadas
            </div>
            <div className="flex gap-2">
              <button onClick={marcarTodos} className="font-bold text-brand-green hover:underline">Marcar todas</button>
              <span className="text-gray-300">|</span>
              <button onClick={desmarcarTodos} className="font-bold text-gray-500 hover:underline">Desmarcar</button>
            </div>
          </div>

          {/* Funções personalizadas */}
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">Precisa de questões personalizadas?</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Solicite categorias ou perguntas exclusivas para sua operação. Adicionamos em poucas horas, sem custo.
              </p>
            </div>
            <a
              href="https://wa.me/5511933284364?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20quest%C3%B5es%20personalizadas%20na%20biblioteca%20do%20X%20Vistoria."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1ebe57] active:scale-95"
            >
              <MessageCircle size={16} /> Solicitar pelo WhatsApp
            </a>
          </div>

          {/* Lista */}
          <div className="space-y-1.5">
            {lista.map((t) => {
              const marcada = selAtual.has(t)
              return (
                <label
                  key={t}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
                    marcada
                      ? 'border-brand-green bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  {marcada
                    ? <CheckSquare size={18} className="text-brand-green flex-shrink-0" />
                    : <Square size={18} className="text-gray-300 flex-shrink-0" />}
                  <input type="checkbox" checked={marcada} onChange={() => toggle(t)} className="sr-only" />
                  <span className="text-sm text-gray-800">{t}</span>
                </label>
              )
            })}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-xs text-gray-500">
            {selAtual.size > 0
              ? `Importar ${selAtual.size} questão(ões) para ${CATEGORIAS.find((c) => c.key === aba)?.label}`
              : 'Marque questões para liberar o botão'}
          </div>
          <button
            onClick={importar}
            disabled={selAtual.size === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-brand-green text-white active:scale-95 disabled:opacity-50"
          >
            <Download size={16} /> Importar
          </button>
        </div>
      </div>
    </div>
  )
}
