import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Save, Loader2, User } from 'lucide-react'
import clsx from 'clsx'

const PERIODICIDADES = ['Diária', 'Semanal', 'Quinzenal', 'Mensal'] as const

export default function CadastrosV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [condominio, setCondominio] = useState('')
  const [funcionario, setFuncionario] = useState('')
  const [periodicidade, setPeriodicidade] = useState<typeof PERIODICIDADES[number] | ''>('')
  const [nomeModelo, setNomeModelo] = useState('')

  // Passo 2 — Quem e Onde (mesclado no rodapé)
  type Funcionario = { id: string; nome: string; email: string }
  type Atribuicao = { id: string; nome: string; vistoriador_id: string | null; vistoriador_nome?: string }
  const [funcionariosCad, setFuncionariosCad] = useState<Funcionario[]>([])
  const [condominiosCad, setCondominiosCad] = useState<Atribuicao[]>([])
  const [selFunc, setSelFunc] = useState<string>('')
  const [selConds, setSelConds] = useState<Set<string>>(new Set())
  const [carregandoQO, setCarregandoQO] = useState(true)
  const [salvandoQO, setSalvandoQO] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/funcionarios').then((r: any) => r as Funcionario[]),
      api.get('/atribuicoes').then((r: any) => r as Atribuicao[]),
    ]).then(([fs, cs]) => {
      setFuncionariosCad(fs); setCondominiosCad(cs)
    }).catch(() => { /* silencioso — passo 2 só aparece se houver dados */ })
    .finally(() => setCarregandoQO(false))
  }, [])

  useEffect(() => {
    if (!selFunc) { setSelConds(new Set()); return }
    setSelConds(new Set(condominiosCad.filter((c) => c.vistoriador_id === selFunc).map((c) => c.id)))
  }, [selFunc, condominiosCad])

  const toggleCond = (id: string) => setSelConds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleSalvarAtribuicao = async () => {
    if (!selFunc) return toast.error('Selecione um funcionário')
    if (selConds.size === 0) return toast.error('Marque pelo menos um condomínio')
    setSalvandoQO(true)
    try {
      await api.post('/atribuicoes', { vistoriador_id: selFunc, condominio_ids: Array.from(selConds) })
      toast.success(`${selConds.size} condomínio(s) atribuído(s)`)
      navigate('/x-vistoria')
    } catch (err: any) {
      toast.error(err?.erro || 'Erro ao salvar')
    } finally { setSalvandoQO(false) }
  }

  const passo2Habilitado = funcionariosCad.length > 1

  const sair = () => { logout(); navigate('/login') }

  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!condominio.trim()) return toast.error('Informe o nome do condomínio')
    if (!funcionario.trim()) return toast.error('Informe o nome do funcionário')

    setSalvando(true)
    try {
      const payload = {
        condominio_nome: condominio.trim(),
        funcionario_nome: funcionario.trim(),
        periodicidade: periodicidade || undefined,
        salvar_modelo: !!nomeModelo.trim(),
        nome_modelo: nomeModelo.trim() || undefined,
        perguntas: [],
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

  // ---- Cadastro de Perfil (apenas admin/master/sindico) ----
  const podeCadastrarPerfil = user?.role === 'admin' || user?.role === 'master' || user?.role === 'sindico'
  const rolesPermitidos: { value: string; label: string }[] = (() => {
    if (user?.role === 'admin' || user?.role === 'master') {
      return [
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'sindico', label: 'Síndico' },
        { value: 'vistoriador', label: 'Funcionário' },
      ]
    }
    if (user?.role === 'sindico') {
      return [{ value: 'vistoriador', label: 'Funcionário' }]
    }
    return []
  })()

  const [perfilNome, setPerfilNome] = useState('')
  const [perfilEmail, setPerfilEmail] = useState('')
  const [perfilSenha, setPerfilSenha] = useState('')
  const [perfilRole, setPerfilRole] = useState(rolesPermitidos[0]?.value || '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const ehMaster = user?.role === 'master'
  type UsuarioRow = { id: string; nome: string; email: string; role: string; ativo: boolean; permissoes: string[] }
  const [usuariosLista, setUsuariosLista] = useState<UsuarioRow[]>([])
  useEffect(() => {
    if (!podeCadastrarPerfil) return
    api.get('/usuarios').then((r: any) => setUsuariosLista(r as UsuarioRow[])).catch(() => {})
  }, [podeCadastrarPerfil])

  const recarregarUsuarios = () => {
    api.get('/usuarios').then((r: any) => setUsuariosLista(r as UsuarioRow[])).catch(() => {})
  }

  const PERMISSOES_DISPONIVEIS = [
    { key: 'cadastros',    label: 'Cadastros' },
    { key: 'vistoria',     label: 'Vistoria' },
    { key: 'historico',    label: 'Histórico' },
    { key: 'biblioteca',   label: 'Biblioteca' },
    { key: 'notificacoes', label: 'Notificações' },
  ]

  const togglePermissao = async (u: UsuarioRow, key: string) => {
    const tem = u.permissoes.includes(key)
    const novas = tem ? u.permissoes.filter((p) => p !== key) : [...u.permissoes, key]
    setUsuariosLista((prev) => prev.map((x) => x.id === u.id ? { ...x, permissoes: novas } : x))
    try {
      await api.patch(`/usuarios/${u.id}`, { permissoes: novas })
    } catch (e: any) {
      toast.error(e?.erro || 'Erro ao salvar permissão')
      setUsuariosLista((prev) => prev.map((x) => x.id === u.id ? { ...x, permissoes: u.permissoes } : x))
    }
  }

  const cadastrarPerfil = async () => {
    if (!perfilNome.trim() || !perfilEmail.trim() || perfilSenha.length < 6) {
      return toast.error('Preencha nome, e-mail e senha (mín. 6 caracteres)')
    }
    if (!perfilRole) return toast.error('Selecione o tipo de perfil')
    setSalvandoPerfil(true)
    try {
      await api.post('/usuarios', {
        nome: perfilNome.trim(),
        email: perfilEmail.trim(),
        senha: perfilSenha,
        role: perfilRole,
      })
      toast.success('Perfil cadastrado')
      setPerfilNome(''); setPerfilEmail(''); setPerfilSenha('')
      if (ehMaster) recarregarUsuarios()
    } catch (err: any) {
      toast.error(err?.erro || 'Erro ao cadastrar')
    } finally { setSalvandoPerfil(false) }
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

          {/* Cadastro de Perfil — apenas admin/master/sindico */}
          {podeCadastrarPerfil && (
            <section className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-brand-navy">Cadastro de perfil</h2>
                  <p className="text-sm text-gray-700">
                    {user?.role === 'sindico'
                      ? 'Cadastre os funcionários que ficarão sob sua responsabilidade.'
                      : 'Cadastre supervisores, síndicos e funcionários da administradora.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  placeholder="Nome completo" value={perfilNome} onChange={(e) => setPerfilNome(e.target.value)} />
                <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  placeholder="E-mail" type="email" value={perfilEmail} onChange={(e) => setPerfilEmail(e.target.value)} />
                <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  placeholder="Senha (mín. 6 caracteres)" type="password" value={perfilSenha} onChange={(e) => setPerfilSenha(e.target.value)} />
                <select className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  value={perfilRole} onChange={(e) => setPerfilRole(e.target.value)}>
                  {rolesPermitidos.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={cadastrarPerfil}
                disabled={salvandoPerfil}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/30 active:scale-95 disabled:opacity-50"
              >
                {salvandoPerfil ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />} Cadastrar perfil
              </button>

              {usuariosLista.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-1">Permissões dos usuários</p>
                  <p className="text-xs text-gray-600 mb-3">Marque quais funções cada usuário poderá acessar. As mudanças são salvas automaticamente.</p>
                  <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                    {usuariosLista
                      .filter((u) => ehMaster ? true : (u.role === 'supervisor' || u.role === 'vistoriador'))
                      .map((u) => (
                        <div key={u.id} className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-gray-800 truncate">{u.nome}</div>
                              <div className="text-[11px] text-gray-500 truncate">{u.email}</div>
                            </div>
                            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {u.role === 'vistoriador' ? 'Funcionário' : u.role}
                            </span>
                            <span className={`text-[10px] font-bold ${u.ativo ? 'text-emerald-600' : 'text-gray-400'}`}>{u.ativo ? '●' : '○'}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {PERMISSOES_DISPONIVEIS.map((p) => {
                              const ativa = u.permissoes.includes(p.key)
                              return (
                                <label key={p.key} className={clsx(
                                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-xs',
                                  ativa ? 'border-brand-green bg-emerald-50' : 'border-gray-200 bg-white',
                                )}>
                                  <input
                                    type="checkbox"
                                    checked={ativa}
                                    onChange={() => togglePermissao(u, p.key)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                                  />
                                  <span className="font-medium text-gray-800">{p.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}

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

          {/* 4. Salvar */}
          <div>
            <label htmlFor="nome-modelo" className="block text-base font-bold text-gray-800 mb-2">
              Salvar como modelo reutilizável (opcional)
            </label>
            <p className="text-xs text-gray-500 mb-2">Dê um nome para reaproveitar este modelo depois. Deixe vazio se não quiser salvar.</p>
            <input
              id="nome-modelo"
              type="text"
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              placeholder="Ex.: Vistoria mensal padrão"
              className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none mb-4"
            />
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="w-full py-4 rounded-2xl bg-brand-navy text-white text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar vistoria
            </button>
          </div>

          {/* Passo 2 — Quem e Onde (mesclado) */}
          <div className="pt-8 border-t-2 border-gray-200">
            <h2 className="text-2xl font-extrabold text-brand-navy">Quem e Onde</h2>
            <p className="text-gray-500 mt-1 mb-4">Escolha o funcionário responsável e marque os condomínios sob a responsabilidade dele.</p>
            <div className="mb-6 p-4 rounded-2xl border-2 border-amber-300 bg-amber-50">
              <p className="text-sm font-bold text-amber-900">⚠️ Observação</p>
              <p className="text-sm text-amber-800 mt-1">Só utilize esta seção caso tenha mais de um condomínio ou mais de um funcionário.</p>
            </div>

            {carregandoQO && (
              <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-brand-navy" /></div>
            )}

            {!carregandoQO && !passo2Habilitado && (
              <div className="card p-6 text-center border-2 border-amber-200 bg-amber-50 rounded-2xl">
                <p className="text-sm text-amber-800 font-medium">
                  Cadastre mais de um funcionário ou mais de um condomínio para habilitar esta etapa.
                </p>
              </div>
            )}

            {!carregandoQO && passo2Habilitado && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-base font-bold text-gray-800 mb-2">Funcionário responsável</h3>
                  <p className="text-xs text-gray-500 mb-3">Marque um dos funcionários cadastrados.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {funcionariosCad.map((f) => {
                      const ativo = selFunc === f.id
                      return (
                        <label
                          key={f.id}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer',
                            ativo
                              ? 'border-brand-green bg-emerald-50'
                              : 'border-gray-200 bg-white hover:border-gray-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="qo-funcionario"
                            checked={ativo}
                            onChange={() => setSelFunc(f.id)}
                            className="h-5 w-5 border-gray-300 text-brand-green focus:ring-brand-green"
                          />
                          <User size={18} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-bold text-gray-800 mb-2">Condomínios sob responsabilidade</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {selFunc ? 'Marque os condomínios que este funcionário vai vistoriar.' : 'Escolha um funcionário acima para liberar a seleção.'}
                  </p>
                  {condominiosCad.length === 0 ? (
                    <div className="card p-6 text-center text-sm text-gray-600">Nenhum condomínio cadastrado ainda.</div>
                  ) : (
                    <div className="space-y-2">
                      {condominiosCad.map((c) => {
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
                                <div className="text-[11px] text-orange-600">Atualmente com: {c.vistoriador_nome}</div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </section>

                <button
                  type="button"
                  onClick={handleSalvarAtribuicao}
                  disabled={salvandoQO || !selFunc || selConds.size === 0}
                  className="w-full py-4 rounded-2xl bg-brand-navy text-white text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {salvandoQO ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar atribuição
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
