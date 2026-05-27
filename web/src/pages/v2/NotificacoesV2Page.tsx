import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Bell, Plus, Trash2, Upload, Download } from 'lucide-react'

type Morador = {
  id: string
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

function parseCsv(texto: string): Morador[] {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (linhas.length === 0) return []
  // detecta cabeçalho (se a primeira linha tiver as colunas)
  const primeira = linhas[0].toLowerCase()
  const temCabecalho = COLUNAS.every((c) => primeira.includes(c))
  const dados = temCabecalho ? linhas.slice(1) : linhas
  return dados.map((l) => {
    const partes = l.split(/[,;\t]/).map((p) => p.trim())
    const [condominio = '', bloco = '', apartamento = '', nome = '', telefone = '', email = ''] = partes
    return { id: uid(), condominio, bloco, apartamento, nome, telefone, email }
  }).filter((m) => m.nome || m.apartamento)
}

export default function NotificacoesV2Page() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sair = () => { logout(); navigate('/login') }

  const [moradores, setMoradores] = useState<Morador[]>(carregar)
  const persistir = (lista: Morador[]) => {
    setMoradores(lista)
    localStorage.setItem(STORAGE, JSON.stringify(lista))
  }
  useEffect(() => { /* hidrata na primeira render */ }, [])

  const [form, setForm] = useState<Omit<Morador, 'id'>>({
    condominio: '', bloco: '', apartamento: '', nome: '', telefone: '', email: '',
  })
  const setCampo = (k: keyof Omit<Morador, 'id'>, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const adicionarManual = () => {
    if (!form.nome.trim() || !form.apartamento.trim() || !form.condominio.trim()) {
      return toast.error('Preencha ao menos condomínio, apartamento e nome')
    }
    persistir([{ id: uid(), ...form }, ...moradores])
    setForm({ condominio: form.condominio, bloco: form.bloco, apartamento: '', nome: '', telefone: '', email: '' })
    toast.success('Morador cadastrado')
  }

  const excluir = (id: string) => persistir(moradores.filter((m) => m.id !== id))

  const importarLote = async (file: File) => {
    try {
      const texto = await file.text()
      const novos = parseCsv(texto)
      if (novos.length === 0) return toast.error('Nenhuma linha válida encontrada')
      persistir([...novos, ...moradores])
      toast.success(`${novos.length} morador(es) importado(s)`)
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
              <input className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                placeholder="Condomínio" value={form.condominio} onChange={(e) => setCampo('condominio', e.target.value)} />
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
                  <div key={m.id} className="p-3 rounded-xl border-2 border-gray-200 bg-white flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">{m.nome || '(sem nome)'}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {m.condominio}{m.bloco ? ` • Bl. ${m.bloco}` : ''}{m.apartamento ? ` • Ap. ${m.apartamento}` : ''}
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
