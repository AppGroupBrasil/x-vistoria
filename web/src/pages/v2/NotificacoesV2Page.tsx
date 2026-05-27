import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Bell, Plus, Trash2, Upload, Download, AlertTriangle } from 'lucide-react'

type CondominioCad = { id: string; nome: string }

type Morador = {
  id: string
  condominio_id: string | null
  condominio: string
  bloco: string
  apartamento: string
  nome: string
  telefone: string
  email: string
}

const STORAGE = 'xv-moradores'
const uid = () => Math.random().toString(36).slice(2, 10)
const carregar = (): Morador[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '[]') } catch { return [] }
}

const COLUNAS = ['condominio', 'bloco', 'apartamento', 'nome', 'telefone', 'email'] as const

function parseCsv(texto: string, condominios: CondominioCad[]): { moradores: Morador[]; semVinculo: number } {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (linhas.length === 0) return { moradores: [], semVinculo: 0 }
  const primeira = linhas[0].toLowerCase()
  const temCabecalho = COLUNAS.every((c) => primeira.includes(c))
  const dados = temCabecalho ? linhas.slice(1) : linhas
  const indice = new Map(condominios.map((c) => [c.nome.toLowerCase().trim(), c]))
  let semVinculo = 0
  const moradores = dados.map((l) => {
    const partes = l.split(/[,;\t]/).map((p) => p.trim())
    const [condominio = '', bloco = '', apartamento = '', nome = '', telefone = '', email = ''] = partes
    const cad = indice.get(condominio.toLowerCase())
    if (!cad && condominio) semVinculo++
    return {
      id: uid(),
      condominio_id: cad?.id || null,
      condominio: cad?.nome || condominio,
      bloco, apartamento, nome, telefone, email,
    }
  }).filter((m) => m.nome || m.apartamento)
  return { moradores, semVinculo }
}

export default function NotificacoesV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sair = () => { logout(); navigate('/login') }

  const [moradores, setMoradores] = useState<Morador[]>(carregar)
  const [condominios, setCondominios] = useState<CondominioCad[]>([])
  const persistir = (lista: Morador[]) => {
    setMoradores(lista)
    localStorage.setItem(STORAGE, JSON.stringify(lista))
  }
  useEffect(() => {
    api.get('/atribuicoes')
      .then((r: any) => setCondominios((r as CondominioCad[]).map((c) => ({ id: c.id, nome: c.nome }))))
      .catch(() => { /* silencioso */ })
  }, [])

  const [form, setForm] = useState<Omit<Morador, 'id'>>({
    condominio_id: null, condominio: '', bloco: '', apartamento: '', nome: '', telefone: '', email: '',
  })
  const setCampo = (k: keyof Omit<Morador, 'id'>, v: string | null) =>
    setForm((p) => ({ ...p, [k]: v as any }))

  const selecionarCondominio = (id: string) => {
    const cad = condominios.find((c) => c.id === id)
    setForm((p) => ({ ...p, condominio_id: cad?.id || null, condominio: cad?.nome || '' }))
  }

  const adicionarManual = () => {
    if (!form.nome.trim() || !form.apartamento.trim() || !form.condominio_id) {
      return toast.error('Selecione o condomínio e preencha apartamento e nome')
    }
    persistir([{ id: uid(), ...form }, ...moradores])
    setForm({ condominio_id: form.condominio_id, condominio: form.condominio, bloco: form.bloco, apartamento: '', nome: '', telefone: '', email: '' })
    toast.success('Morador cadastrado')
  }

  const excluir = (id: string) => persistir(moradores.filter((m) => m.id !== id))

  const importarLote = async (file: File) => {
    try {
      const texto = await file.text()
      const { moradores: novos, semVinculo } = parseCsv(texto, condominios)
      if (novos.length === 0) return toast.error('Nenhuma linha válida encontrada')
      persistir([...novos, ...moradores])
      if (semVinculo > 0) {
        toast(`${novos.length} importado(s). ${semVinculo} sem vínculo com condomínio cadastrado.`, { icon: '⚠️' })
      } else {
        toast.success(`${novos.length} morador(es) importado(s)`)
      }
    } catch {
      toast.error('Erro ao ler o arquivo')
    }
  }

  const baixarModelo = () => {
    const csv =
      'condominio,bloco,apartamento,nome,telefone,email\n' +
      'Edifício Jardim,A,101,Maria Silva,11987654321,maria@email.com\n' +
      'Edifício Jardim,A,102,João Souza,11912345678,joao@email.com\n' +
      'Edifício Jardim,B,201,Ana Costa,11999998888,ana@email.com\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'modelo-moradores.csv'
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="w-full max-w-3xl space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-navy">Notificações</h1>
            <p className="text-gray-500 mt-1">Envie um aviso direto ao morador em caso de ocorrência ou problema identificado.</p>
          </div>

          <div className="p-5 rounded-2xl border-2 border-blue-300 bg-blue-50 flex items-start gap-3">
            <Bell size={22} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900">Para que serve esta tela</p>
              <p className="text-sm text-blue-800 mt-1">
                Este quadrado serve para o funcionário <strong>notificar o morador</strong> sempre que houver
                uma ocorrência ou problema na vistoria — como vazamento, falha em equipamento, irregularidade
                ou qualquer alerta que exija atenção imediata.
              </p>
            </div>
          </div>

          {/* Vínculo unificado */}
          <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 flex items-start gap-3">
            <AlertTriangle size={20} className="text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-bold">Cadastro unificado de condomínio</p>
              <p className="mt-1">
                O condomínio do morador é o <strong>mesmo</strong> cadastrado no Passo 1 da vistoria. Para cadastrar
                um morador, o condomínio precisa existir antes lá. Isso evita duplicidade e mantém os relatórios
                ligados a um único registro.
              </p>
              {condominios.length === 0 && (
                <button
                  onClick={() => navigate('/x-vistoria/cadastros')}
                  className="mt-2 inline-flex items-center gap-2 text-emerald-800 font-bold hover:underline"
                >
                  Ir para Cadastros e criar o primeiro condomínio →
                </button>
              )}
            </div>
          </div>

          {/* Cadastro por lote */}
          <section className="p-5 rounded-2xl border-2 border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-brand-navy">Cadastro por lote (planilha CSV)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Importe vários moradores de uma vez a partir de um arquivo <strong>.csv</strong>.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
              <p className="text-sm font-bold text-amber-900">📋 Como montar a planilha</p>
              <ol className="text-sm text-amber-800 mt-2 space-y-1 list-decimal list-inside">
                <li>A primeira linha deve conter os nomes das colunas (cabeçalho).</li>
                <li>A ordem das colunas deve ser exatamente esta:</li>
              </ol>
              <div className="mt-2 p-2 rounded-lg bg-white border border-amber-300 font-mono text-xs text-gray-800 overflow-x-auto">
                condominio,bloco,apartamento,nome,telefone,email
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Separadores aceitos: <code className="bg-white px-1 rounded">,</code> (vírgula),
                <code className="bg-white px-1 rounded ml-1">;</code> (ponto e vírgula) ou tabulação.
                Não use acentos no cabeçalho.
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Exemplo de linha:
                <span className="ml-1 font-mono bg-white px-1 rounded">Edifício Jardim,A,101,Maria Silva,11987654321,maria@email.com</span>
              </p>
              <p className="text-xs text-amber-700 mt-2">
                <strong>Importante:</strong> o nome do condomínio precisa ser idêntico ao cadastrado no Passo 1.
                Linhas com condomínio não cadastrado serão importadas, mas ficarão sem vínculo.
              </p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={baixarModelo}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95"
              >
                <Download size={16} /> Baixar modelo de exemplo
              </button>
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-bold cursor-pointer active:scale-95">
                <Upload size={16} /> Enviar planilha
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) importarLote(f)
                  }}
                />
              </label>
            </div>
          </section>

          {/* Cadastro manual */}
          <section className="p-5 rounded-2xl border-2 border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-brand-navy">Cadastro manual</h2>
            <p className="text-sm text-gray-600 mt-1">Cadastre um morador por vez.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                value={form.condominio_id || ''}
                onChange={(e) => selecionarCondominio(e.target.value)}
              >
                <option value="">{condominios.length === 0 ? 'Nenhum condomínio cadastrado' : 'Selecione o condomínio'}</option>
                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="Bloco" value={form.bloco} onChange={(e) => setCampo('bloco', e.target.value)} />
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="Apartamento" value={form.apartamento} onChange={(e) => setCampo('apartamento', e.target.value)} />
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="Nome do morador" value={form.nome} onChange={(e) => setCampo('nome', e.target.value)} />
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="Telefone" value={form.telefone} onChange={(e) => setCampo('telefone', e.target.value)} />
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="E-mail" type="email" value={form.email} onChange={(e) => setCampo('email', e.target.value)} />
            </div>

            <button
              onClick={adicionarManual}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white text-sm font-bold active:scale-95"
            >
              <Plus size={16} /> Adicionar morador
            </button>
          </section>

          {/* Lista */}
          <section>
            <h2 className="text-lg font-bold text-brand-navy mb-3">Moradores cadastrados ({moradores.length})</h2>
            {moradores.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 bg-white rounded-2xl">
                <Bell size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">Nenhum morador cadastrado ainda</p>
                <p className="text-xs text-gray-500 mt-1">Use o cadastro manual ou importe uma planilha.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {moradores.map((m) => (
                  <div key={m.id} className={`p-3 rounded-xl border-2 ${m.condominio_id ? 'border-gray-200' : 'border-amber-300 bg-amber-50'} bg-white flex items-start gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">{m.nome || '(sem nome)'}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {m.condominio}{!m.condominio_id && <span className="ml-1 text-amber-700 font-bold">(sem vínculo)</span>}
                        {m.bloco ? ` • Bl. ${m.bloco}` : ''}{m.apartamento ? ` • Ap. ${m.apartamento}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {[m.telefone, m.email].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <button onClick={() => excluir(m.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
