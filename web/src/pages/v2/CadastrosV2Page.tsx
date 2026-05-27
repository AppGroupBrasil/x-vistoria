import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Save, Plus, X, Loader2, MessageCircle } from 'lucide-react'
import clsx from 'clsx'

const ITEM_KEY: Record<string, string> = {
  'Assinatura': 'requer_assinatura',
  'Campo de resposta': 'requer_titulo',
  'Conservação (Ruim / Regular / Bom / Ótimo)': 'requer_conservacao',
  'Descrição': 'requer_descricao',
  'Foto': 'requer_foto',
  'Limpeza (Ruim / Regular / Boa / Ótima)': 'requer_limpeza',
  'Local exato': 'requer_local_exato',
  'Notificação': 'requer_notificacao',
  'Ocorrência': 'requer_ocorrencia',
  'Prazo para resolver': 'requer_prazo',
  'Problema': 'requer_problema',
  'Status (Aberto / Em execução / Finalizado)': 'requer_status',
  'Validade': 'requer_validade',
}

const PERIODICIDADES = ['Diária', 'Semanal', 'Quinzenal', 'Mensal'] as const

const ITENS_VISTORIA = [
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

export default function CadastrosV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [condominio, setCondominio] = useState('')
  const [funcionario, setFuncionario] = useState('')
  const [periodicidade, setPeriodicidade] = useState<typeof PERIODICIDADES[number] | ''>('')
  type Pergunta = { texto: string; itens: Record<string, boolean> }
  const novaPergunta = (): Pergunta => ({ texto: '', itens: {} })
  const [perguntas, setPerguntas] = useState<Pergunta[]>([novaPergunta()])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('xv-import-personalizada')
      if (raw) {
        const importados = JSON.parse(raw) as Pergunta[]
        if (Array.isArray(importados) && importados.length > 0) {
          setPerguntas(importados.map((p) => ({ texto: p.texto, itens: p.itens || {} })))
          localStorage.removeItem('xv-import-personalizada')
          toast.success(`${importados.length} questão(ões) importadas da biblioteca`)
        }
      }
    } catch { /* ignore */ }
  }, [])
  const [salvarModelo, setSalvarModelo] = useState<'sim' | 'nao' | ''>('')
  const [nomeModelo, setNomeModelo] = useState('')

  const sair = () => { logout(); navigate('/login') }

  const setPerguntaTexto = (idx: number, texto: string) =>
    setPerguntas((prev) => prev.map((p, i) => (i === idx ? { ...p, texto } : p)))

  const togglePerguntaItem = (idx: number, item: string) =>
    setPerguntas((prev) => prev.map((p, i) => i === idx ? { ...p, itens: { ...p.itens, [item]: !p.itens[item] } } : p))

  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!condominio.trim()) return toast.error('Informe o nome do condomínio')
    if (!funcionario.trim()) return toast.error('Informe o nome do funcionário')
    if (perguntas.every((p) => !p.texto.trim())) return toast.error('Adicione pelo menos uma pergunta')
    if (salvarModelo === 'sim' && !nomeModelo.trim()) return toast.error('Dê um nome ao modelo')

    setSalvando(true)
    try {
      const payload = {
        condominio_nome: condominio.trim(),
        funcionario_nome: funcionario.trim(),
        periodicidade: periodicidade || undefined,
        salvar_modelo: salvarModelo === 'sim',
        nome_modelo: nomeModelo.trim() || undefined,
        perguntas: perguntas
          .filter((p) => p.texto.trim())
          .map((p) => {
            const flags: Record<string, boolean> = {}
            Object.entries(ITEM_KEY).forEach(([label, key]) => {
              flags[key] = !!p.itens[label]
            })
            return { texto: p.texto.trim(), ...flags }
          }),
      }
      const res: any = await api.post('/cadastros', payload)
      toast.success(`Vistoria criada! Protocolo #${res.protocolo}`)
      navigate('/x-vistoria')
    } catch (err: any) {
      toast.error(err?.erro || err?.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/x-vistoria')}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70"
            aria-label="Voltar"
          >
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

      <main className="flex-1 px-6 py-10 flex justify-center">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-navy">Cadastros</h1>
            <p className="text-gray-500 mt-1">Preencha os dados básicos da vistoria.</p>
          </div>

          {/* 1. Condomínio */}
          <div>
            <label htmlFor="cond" className="block text-base font-bold text-gray-800 mb-2">
              Nome do condomínio
            </label>
            <p className="text-xs text-gray-500 mb-2">Onde a vistoria será feita.</p>
            <input
              id="cond"
              type="text"
              value={condominio}
              onChange={(e) => setCondominio(e.target.value)}
              placeholder="Ex.: Edifício Jardim das Flores"
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
            />
          </div>

          {/* 2. Funcionário */}
          <div>
            <label htmlFor="func" className="block text-base font-bold text-gray-800 mb-2">
              Nome do funcionário
            </label>
            <p className="text-xs text-gray-500 mb-2">Quem fará a vistoria.</p>
            <input
              id="func"
              type="text"
              value={funcionario}
              onChange={(e) => setFuncionario(e.target.value)}
              placeholder="Ex.: João da Silva"
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
            />
          </div>

          {/* 3. Periodicidade */}
          <div>
            <div className="block text-base font-bold text-gray-800 mb-2">Periodicidade</div>
            <p className="text-xs text-gray-500 mb-3">Com que frequência a vistoria acontece.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERIODICIDADES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodicidade(p)}
                  className={clsx(
                    'py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95',
                    periodicidade === p
                      ? 'bg-brand-green border-brand-green text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-brand-green',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Questionário da vistoria */}
          <div>
            <div className="block text-base font-bold text-gray-800 mb-2">Questionário da vistoria</div>
            <p className="text-xs text-gray-500 mb-3">Escreva cada pergunta que o vistoriador deverá responder.</p>

            <div className="space-y-4">
              {perguntas.map((p, idx) => (
                <div key={idx} className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-6 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={p.texto}
                      onChange={(e) => setPerguntaTexto(idx, e.target.value)}
                      placeholder="Ex.: O hall está limpo?"
                      className="flex-1 px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                    />
                    {perguntas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPerguntas((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-gray-400 hover:text-red-500"
                        aria-label="Remover pergunta"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ITENS_VISTORIA.map((it) => (
                      <label
                        key={it}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm',
                          p.itens[it]
                            ? 'border-brand-green bg-emerald-50'
                            : 'border-gray-200 bg-white hover:border-gray-300',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!p.itens[it]}
                          onChange={() => togglePerguntaItem(idx, it)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="font-medium text-gray-800">{it}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPerguntas((prev) => [...prev, novaPergunta()])}
              className="mt-4 flex items-center gap-2 text-sm font-bold text-brand-green hover:underline"
            >
              <Plus size={16} /> Adicionar pergunta
            </button>

            <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Precisa de algum campo personalizado?</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Solicite que colocamos em poucas horas, sem nenhum custo adicional.
                </p>
              </div>
              <a
                href="https://wa.me/5511933284364?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20campo%20personalizado%20para%20o%20question%C3%A1rio%20da%20minha%20vistoria."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1ebe57] active:scale-95"
              >
                <MessageCircle size={16} /> Solicitar pelo WhatsApp
              </a>
            </div>
          </div>

          {/* 5. Salvar modelo */}
          <div>
            <div className="block text-base font-bold text-gray-800 mb-2">
              Salvar esse modelo de vistoria para reutilização?
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSalvarModelo('sim'); handleSalvar() }}
                className={clsx(
                  'py-3 rounded-xl border-2 text-base font-bold transition-all active:scale-95',
                  salvarModelo === 'sim'
                    ? 'bg-brand-green border-brand-green text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-green',
                )}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => { setSalvarModelo('nao'); handleSalvar() }}
                className={clsx(
                  'py-3 rounded-xl border-2 text-base font-bold transition-all active:scale-95',
                  salvarModelo === 'nao'
                    ? 'bg-gray-700 border-gray-700 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400',
                )}
              >
                Não
              </button>
            </div>

            {salvarModelo === 'sim' && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 border-2 border-brand-green space-y-3">
                <label htmlFor="nome-modelo" className="block text-sm font-bold text-gray-800">
                  Dê um nome a este modelo
                </label>
                <input
                  id="nome-modelo"
                  type="text"
                  value={nomeModelo}
                  onChange={(e) => setNomeModelo(e.target.value)}
                  placeholder="Ex.: Vistoria mensal padrão"
                  autoFocus
                  className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={!nomeModelo.trim() || salvando}
                  className="w-full py-3 rounded-xl bg-brand-navy text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar modelo
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
