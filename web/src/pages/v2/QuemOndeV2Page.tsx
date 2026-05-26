import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Save, Loader2, User } from 'lucide-react'
import clsx from 'clsx'

interface Funcionario { id: string; nome: string; email: string }
interface Atribuicao { id: string; nome: string; vistoriador_id: string | null; vistoriador_nome?: string }

export default function QuemOndeV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [condominios, setCondominios] = useState<Atribuicao[]>([])
  const [selFunc, setSelFunc] = useState<string>('')
  const [selConds, setSelConds] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/funcionarios').then((r: any) => r as Funcionario[]),
      api.get('/atribuicoes').then((r: any) => r as Atribuicao[]),
    ]).then(([fs, cs]) => {
      setFuncionarios(fs); setCondominios(cs)
    }).catch((e: any) => toast.error(e?.erro || 'Erro ao carregar'))
    .finally(() => setCarregando(false))
  }, [])

  // Quando troca funcionário, marca condomínios já atribuídos a ele
  useEffect(() => {
    if (!selFunc) { setSelConds(new Set()); return }
    setSelConds(new Set(condominios.filter((c) => c.vistoriador_id === selFunc).map((c) => c.id)))
  }, [selFunc, condominios])

  const sair = () => { logout(); navigate('/login') }
  const toggleCond = (id: string) => setSelConds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleSalvar = async () => {
    if (!selFunc) return toast.error('Selecione um funcionário')
    if (selConds.size === 0) return toast.error('Marque pelo menos um condomínio')
    setSalvando(true)
    try {
      await api.post('/atribuicoes', { vistoriador_id: selFunc, condominio_ids: Array.from(selConds) })
      toast.success(`${selConds.size} condomínio(s) atribuído(s)`)
      navigate('/x-vistoria')
    } catch (err: any) {
      toast.error(err?.erro || 'Erro ao salvar')
    } finally { setSalvando(false) }
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

      <main className="flex-1 px-6 py-10 flex justify-center">
        <div className="w-full max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-navy">Quem e Onde</h1>
            <p className="text-gray-500 mt-1">Escolha o funcionário responsável e marque os condomínios sob a responsabilidade dele.</p>
          </div>

          {carregando && (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-brand-navy" /></div>
          )}

          {!carregando && (
            <>
              {/* Funcionários */}
              <section>
                <h2 className="text-base font-bold text-gray-800 mb-2">Funcionário responsável</h2>
                <p className="text-xs text-gray-500 mb-3">Marque um dos funcionários cadastrados.</p>
                {funcionarios.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-gray-500">
                    Nenhum funcionário cadastrado ainda. Cadastre primeiro em "Cadastros".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {funcionarios.map((f) => {
                      const ativo = selFunc === f.id
                      const desabilitado = !!selFunc && !ativo
                      return (
                        <label
                          key={f.id}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                            ativo
                              ? 'border-brand-green bg-emerald-50 cursor-pointer'
                              : desabilitado
                                ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={ativo}
                            onChange={() => setSelFunc(ativo ? '' : f.id)}
                            disabled={desabilitado}
                            className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                          />
                          <User size={18} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Condomínios */}
              <section>
                <h2 className="text-base font-bold text-gray-800 mb-2">Condomínios sob responsabilidade</h2>
                <p className="text-xs text-gray-500 mb-3">
                  {selFunc ? 'Marque os condomínios que este funcionário vai vistoriar.' : 'Escolha um funcionário acima para liberar a seleção.'}
                </p>
                {condominios.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-gray-500">
                    Nenhum condomínio cadastrado ainda.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {condominios.map((c) => {
                      const marcado = selConds.has(c.id)
                      const outroDono = c.vistoriador_id && c.vistoriador_id !== selFunc
                      return (
                        <label
                          key={c.id}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all',
                            !selFunc
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : marcado
                                ? 'border-brand-green bg-emerald-50 cursor-pointer'
                                : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => toggleCond(c.id)}
                            disabled={!selFunc}
                            className="h-5 w-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">{c.nome}</div>
                            {outroDono && (
                              <div className="text-[11px] text-orange-600">
                                Atualmente com: {c.vistoriador_nome}
                              </div>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>

              <button
                onClick={handleSalvar}
                disabled={salvando || !selFunc || selConds.size === 0}
                className="w-full py-4 rounded-2xl bg-brand-navy text-white text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
