import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Download, CheckSquare, Square, MessageCircle, Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { BIBLIOTECA, CATEGORIAS, STORAGE_KEY, destinoURL, toItens, type CategoriaBib } from '../../data/biblioteca'
import MicDictar from '../../components/MicDictar'

const ITENS_PERSONALIZADA = [
  'Assinatura',
  'Campo de resposta',
  'Conservação (Ruim / Regular / Bom / Ótimo)',
  'Descrição',
  'Foto',
  'Limpeza (Ruim / Regular / Boa / Ótima)',
  'Local exato',
  'Notificação',
  'Ocorrência',
  'Prazo para resolver',
  'Problema',
  'Status (Aberto / Em execução / Finalizado)',
  'Validade',
] as const

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
  const [itensPers, setItensPers] = useState<Record<string, Record<string, boolean>>>({})

  const toggleItemPers = (questao: string, item: string) => {
    setItensPers((prev) => {
      const cur = prev[questao] || {}
      return { ...prev, [questao]: { ...cur, [item]: !cur[item] } }
    })
  }

  const sair = () => { logout(); navigate('/login') }

  const LIB_OVERLAY_KEY = 'xv-biblioteca-overlay'
  const carregarOverlay = (): Partial<Record<CategoriaBib, string[]>> => {
    try { return JSON.parse(localStorage.getItem(LIB_OVERLAY_KEY) || '{}') } catch { return {} }
  }
  const [overlay, setOverlay] = useState<Partial<Record<CategoriaBib, string[]>>>(carregarOverlay)
  const salvarOverlay = (next: Partial<Record<CategoriaBib, string[]>>) => {
    setOverlay(next)
    localStorage.setItem(LIB_OVERLAY_KEY, JSON.stringify(next))
  }
  const lista = overlay[aba] ?? BIBLIOTECA[aba]
  const selAtual = sel[aba]

  const [novaPergunta, setNovaPergunta] = useState('')
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)
  const [editTexto, setEditTexto] = useState('')

  const updateLista = (next: string[]) => salvarOverlay({ ...overlay, [aba]: next })

  const adicionar = () => {
    const t = novaPergunta.trim()
    if (!t) return
    if (lista.includes(t)) { toast.error('Esta pergunta já existe nesta seção'); return }
    updateLista([t, ...lista])
    setNovaPergunta('')
    toast.success('Pergunta adicionada')
  }

  const excluir = (texto: string) => {
    updateLista(lista.filter((t) => t !== texto))
    setSel((prev) => {
      const next = new Set(prev[aba]); next.delete(texto)
      return { ...prev, [aba]: next }
    })
  }

  const iniciarEdicao = (idx: number, texto: string) => { setEditandoIdx(idx); setEditTexto(texto) }
  const cancelarEdicao = () => { setEditandoIdx(null); setEditTexto('') }
  const confirmarEdicao = (idx: number) => {
    const novo = editTexto.trim()
    if (!novo) return
    const antigo = lista[idx]
    if (novo !== antigo && lista.includes(novo)) { toast.error('Já existe uma pergunta igual'); return }
    const next = [...lista]; next[idx] = novo
    updateLista(next)
    if (selAtual.has(antigo)) {
      setSel((prev) => {
        const set = new Set(prev[aba]); set.delete(antigo); set.add(novo)
        return { ...prev, [aba]: set }
      })
    }
    cancelarEdicao()
  }

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
    const itens = aba === 'personalizada'
      ? textos.map((t) => ({ texto: t, itens: itensPers[t] || {} }))
      : toItens(aba, textos)
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

          {/* Adicionar pergunta nesta seção */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={novaPergunta}
              onChange={(e) => setNovaPergunta(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
              placeholder="Nova pergunta nesta seção…"
              className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
            />
            <MicDictar onTexto={(t) => setNovaPergunta((p) => (p ? p + ' ' : '') + t)} contexto={{ categoria: `biblioteca-${aba}` }} />
            <button
              onClick={adicionar}
              disabled={!novaPergunta.trim()}
              className="px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-bold inline-flex items-center gap-1 active:scale-95 disabled:opacity-50"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-1.5">
            {lista.map((t, idx) => {
              const marcada = selAtual.has(t)
              const itensDaQuestao = itensPers[t] || {}
              const editando = editandoIdx === idx
              return (
                <div
                  key={t}
                  className={clsx(
                    'rounded-xl border-2 transition-all',
                    marcada ? 'border-brand-green bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300',
                  )}
                >
                  {editando ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        type="text"
                        value={editTexto}
                        onChange={(e) => setEditTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmarEdicao(idx)
                          if (e.key === 'Escape') cancelarEdicao()
                        }}
                        autoFocus
                        className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                      />
                      <button onClick={() => confirmarEdicao(idx)} className="p-2 text-brand-green hover:bg-emerald-100 rounded-lg" aria-label="Confirmar"><Check size={16} /></button>
                      <button onClick={cancelarEdicao} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" aria-label="Cancelar"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                        {marcada
                          ? <CheckSquare size={18} className="text-brand-green flex-shrink-0" />
                          : <Square size={18} className="text-gray-300 flex-shrink-0" />}
                        <input type="checkbox" checked={marcada} onChange={() => toggle(t)} className="sr-only" />
                        <span className="text-sm text-gray-800 truncate">{t}</span>
                      </label>
                      <button onClick={() => iniciarEdicao(idx, t)} className="p-1.5 text-gray-400 hover:text-brand-navy" aria-label="Editar"><Pencil size={14} /></button>
                      <button onClick={() => excluir(t)} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Excluir"><Trash2 size={14} /></button>
                    </div>
                  )}

                  {aba === 'personalizada' && marcada && (
                    <div className="px-4 pb-3 pt-1 border-t border-emerald-200">
                      <p className="text-[11px] font-bold text-gray-600 mb-2">Itens desta questão</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {ITENS_PERSONALIZADA.map((it) => (
                          <label
                            key={it}
                            className={clsx(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs',
                              itensDaQuestao[it]
                                ? 'border-brand-green bg-white'
                                : 'border-gray-200 bg-white hover:border-gray-300',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={!!itensDaQuestao[it]}
                              onChange={() => toggleItemPers(t, it)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                            />
                            <span className="font-medium text-gray-800">{it}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
