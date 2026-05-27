import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, LogOut, Bell, Plus, Trash2, Upload, Download, AlertTriangle, Mail, MessageCircle, Send, Image as ImageIcon, Loader2, X } from 'lucide-react'

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
const STORAGE_BLOCOS = 'xv-blocos'
const STORAGE_NOTIF = 'xv-notificacoes-historico'

type NotifImg = { url: string; nome: string }
type NotifEnviada = {
  id: string
  data: string
  morador_id: string
  morador_nome: string
  titulo: string
  descricao: string
  imagens: NotifImg[]
  canais: ('email' | 'whatsapp')[]
}

function soDigitos(s: string) { return (s || '').replace(/\D/g, '') }
function montarTexto(titulo: string, descricao: string, imgs: NotifImg[]): string {
  const linhas = [`*${titulo}*`, '', descricao]
  if (imgs.length > 0) {
    linhas.push('', 'Imagens:')
    imgs.forEach((i, idx) => linhas.push(`${idx + 1}. ${i.url}`))
  }
  return linhas.filter((l) => l !== undefined).join('\n')
}
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
  const [blocos, setBlocos] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_BLOCOS) || '{}') } catch { return {} }
  })
  const persistirBlocos = (next: Record<string, string[]>) => {
    setBlocos(next)
    localStorage.setItem(STORAGE_BLOCOS, JSON.stringify(next))
  }

  const [blocoCondId, setBlocoCondId] = useState<string>('')
  const [blocoNome, setBlocoNome] = useState('')
  const [blocoQtd, setBlocoQtd] = useState('')
  const [blocoPrefixo, setBlocoPrefixo] = useState('Bloco ')

  const blocosDoCond = blocoCondId ? (blocos[blocoCondId] || []) : []

  const adicionarBlocoNomeado = () => {
    if (!blocoCondId) return toast.error('Selecione o condomínio')
    const nome = blocoNome.trim()
    if (!nome) return
    const atuais = blocos[blocoCondId] || []
    if (atuais.includes(nome)) return toast.error('Esse bloco já existe')
    persistirBlocos({ ...blocos, [blocoCondId]: [...atuais, nome] })
    setBlocoNome('')
  }

  const cadastrarBlocosEmLote = () => {
    if (!blocoCondId) return toast.error('Selecione o condomínio')
    const n = parseInt(blocoQtd, 10)
    if (!n || n < 1 || n > 999) return toast.error('Informe uma quantidade entre 1 e 999')
    const prefixo = blocoPrefixo.trim() ? blocoPrefixo : ''
    const atuais = blocos[blocoCondId] || []
    const gerados: string[] = []
    for (let i = 1; i <= n; i++) {
      const nome = `${prefixo}${i}`.trim()
      if (!atuais.includes(nome)) gerados.push(nome)
    }
    if (gerados.length === 0) return toast('Todos os blocos já existem', { icon: 'ℹ️' })
    persistirBlocos({ ...blocos, [blocoCondId]: [...atuais, ...gerados] })
    setBlocoQtd('')
    toast.success(`${gerados.length} bloco(s) cadastrado(s)`)
  }

  const excluirBloco = (nome: string) => {
    const atuais = blocos[blocoCondId] || []
    persistirBlocos({ ...blocos, [blocoCondId]: atuais.filter((b) => b !== nome) })
  }

  // ---- Notificações enviadas ----
  const [historico, setHistorico] = useState<NotifEnviada[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_NOTIF) || '[]') } catch { return [] }
  })
  const persistirHistorico = (lista: NotifEnviada[]) => {
    setHistorico(lista)
    localStorage.setItem(STORAGE_NOTIF, JSON.stringify(lista))
  }

  const [notifMoradorId, setNotifMoradorId] = useState('')
  const [notifTitulo, setNotifTitulo] = useState('')
  const [notifDesc, setNotifDesc] = useState('')
  const [notifImgs, setNotifImgs] = useState<NotifImg[]>([])
  const [enviandoImg, setEnviandoImg] = useState(false)

  const uploadImg = async (file: File) => {
    setEnviandoImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res: any = await api.post('/upload/avulso', fd)
      setNotifImgs((prev) => [...prev, { url: res.url, nome: file.name }])
    } catch (e: any) {
      toast.error(e?.erro || 'Falha no upload')
    } finally { setEnviandoImg(false) }
  }

  const moradorSelecionado = moradores.find((m) => m.id === notifMoradorId)

  const enviar = (canais: ('email' | 'whatsapp')[]) => {
    if (!moradorSelecionado) return toast.error('Selecione um morador')
    if (!notifTitulo.trim() || !notifDesc.trim()) return toast.error('Preencha título e descrição')
    if (canais.includes('email') && !moradorSelecionado.email) return toast.error('Este morador não tem e-mail cadastrado')
    if (canais.includes('whatsapp') && !moradorSelecionado.telefone) return toast.error('Este morador não tem telefone cadastrado')

    const texto = montarTexto(notifTitulo.trim(), notifDesc.trim(), notifImgs)

    if (canais.includes('whatsapp')) {
      const fone = soDigitos(moradorSelecionado.telefone)
      const numero = fone.length <= 11 ? `55${fone}` : fone
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    if (canais.includes('email')) {
      const subject = encodeURIComponent(notifTitulo.trim())
      const body = encodeURIComponent(texto)
      window.location.href = `mailto:${moradorSelecionado.email}?subject=${subject}&body=${body}`
    }

    const reg: NotifEnviada = {
      id: uid(),
      data: new Date().toISOString(),
      morador_id: moradorSelecionado.id,
      morador_nome: moradorSelecionado.nome,
      titulo: notifTitulo.trim(),
      descricao: notifDesc.trim(),
      imagens: notifImgs,
      canais,
    }
    persistirHistorico([reg, ...historico])
    toast.success('Notificação registrada e aberta no canal escolhido')
    setNotifTitulo(''); setNotifDesc(''); setNotifImgs([])
  }
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

          {/* Composer de notificação */}
          <section className="p-5 rounded-2xl border-2 border-brand-navy bg-white">
            <h2 className="text-lg font-bold text-brand-navy">Enviar notificação</h2>
            <p className="text-sm text-gray-600 mt-1">Compose o aviso e envie via e-mail, WhatsApp ou ambos.</p>

            <div className="mt-4 space-y-3">
              <select
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                value={notifMoradorId}
                onChange={(e) => setNotifMoradorId(e.target.value)}
              >
                <option value="">{moradores.length === 0 ? 'Nenhum morador cadastrado' : 'Selecione o morador destinatário'}</option>
                {moradores.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} — {m.condominio}{m.bloco ? ` Bl.${m.bloco}` : ''}{m.apartamento ? ` Ap.${m.apartamento}` : ''}
                  </option>
                ))}
              </select>

              {moradorSelecionado && (
                <div className="text-xs text-gray-500 px-1">
                  {moradorSelecionado.email ? `📧 ${moradorSelecionado.email}` : '📧 (sem e-mail)'}
                  <span className="mx-2">•</span>
                  {moradorSelecionado.telefone ? `📱 ${moradorSelecionado.telefone}` : '📱 (sem telefone)'}
                </div>
              )}

              <input
                type="text"
                value={notifTitulo}
                onChange={(e) => setNotifTitulo(e.target.value)}
                placeholder="Título da notificação (ex.: Vazamento no 3º andar)"
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
              />

              <textarea
                value={notifDesc}
                onChange={(e) => setNotifDesc(e.target.value)}
                placeholder="Descrição (detalhe a ocorrência ou o aviso)"
                rows={4}
                className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none resize-none"
              />

              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Imagens (opcional)</p>
                <div className="flex flex-wrap items-start gap-2">
                  {notifImgs.map((img, i) => (
                    <div key={i} className="relative inline-block">
                      <img src={img.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setNotifImgs((p) => p.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                        aria-label="Remover"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 text-gray-500 text-xs font-medium hover:bg-gray-100 ${enviandoImg ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
                    {enviandoImg ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                    {enviandoImg ? 'Enviando…' : 'Adicionar imagem'}
                    <input
                      type="file" accept="image/*" className="hidden" disabled={enviandoImg}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) uploadImg(f)
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  As imagens viram links no corpo da mensagem (WhatsApp/e-mail não permitem anexo automático sem API).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => enviar(['email'])}
                  disabled={!moradorSelecionado || !notifTitulo.trim() || !notifDesc.trim()}
                  className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Mail size={16} /> Enviar por E-mail
                </button>
                <button
                  onClick={() => enviar(['whatsapp'])}
                  disabled={!moradorSelecionado || !notifTitulo.trim() || !notifDesc.trim()}
                  className="px-4 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <MessageCircle size={16} /> Enviar por WhatsApp
                </button>
                <button
                  onClick={() => enviar(['email', 'whatsapp'])}
                  disabled={!moradorSelecionado || !notifTitulo.trim() || !notifDesc.trim()}
                  className="px-4 py-3 rounded-xl bg-brand-navy text-white text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Send size={16} /> Enviar por ambos
                </button>
              </div>
            </div>
          </section>

          {/* Histórico de notificações */}
          {historico.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-brand-navy mb-3">Notificações enviadas ({historico.length})</h2>
              <div className="space-y-2">
                {historico.slice(0, 20).map((n) => (
                  <div key={n.id} className="p-3 rounded-xl border-2 border-gray-200 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate">{n.titulo}</div>
                        <div className="text-xs text-gray-500">
                          Para <strong>{n.morador_nome}</strong> • {new Date(n.data).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.descricao}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {n.canais.includes('email') && <Mail size={14} className="text-blue-600" />}
                        {n.canais.includes('whatsapp') && <MessageCircle size={14} className="text-[#25D366]" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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

          {/* Blocos por condomínio */}
          <section className="p-5 rounded-2xl border-2 border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-brand-navy">Blocos do condomínio</h2>
            <p className="text-sm text-gray-600 mt-1">
              Cadastre os blocos em lote por quantidade (ex.: 10 blocos numerados) ou nomeie cada um manualmente.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white sm:col-span-2"
                value={blocoCondId}
                onChange={(e) => setBlocoCondId(e.target.value)}
              >
                <option value="">{condominios.length === 0 ? 'Nenhum condomínio cadastrado' : 'Selecione o condomínio'}</option>
                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Em lote */}
              <div className="p-3 rounded-xl border-2 border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 mb-2">Cadastro em lote (numerado)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blocoPrefixo}
                    onChange={(e) => setBlocoPrefixo(e.target.value)}
                    placeholder="Prefixo (ex.: Bloco )"
                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={blocoQtd}
                    onChange={(e) => setBlocoQtd(e.target.value)}
                    placeholder="Qtd"
                    className="w-24 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Gera: <span className="font-mono">{blocoPrefixo}1, {blocoPrefixo}2, …</span>
                </p>
                <button
                  onClick={cadastrarBlocosEmLote}
                  disabled={!blocoCondId || !blocoQtd}
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-brand-navy text-white text-sm font-bold inline-flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <Plus size={14} /> Cadastrar em lote
                </button>
              </div>

              {/* Manual */}
              <div className="p-3 rounded-xl border-2 border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-700 mb-2">Cadastro livre (nome)</p>
                <input
                  type="text"
                  value={blocoNome}
                  onChange={(e) => setBlocoNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') adicionarBlocoNomeado() }}
                  placeholder="Ex.: Torre Sul, Bloco Jasmim…"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-1">Use quando o bloco tem nome em vez de número.</p>
                <button
                  onClick={adicionarBlocoNomeado}
                  disabled={!blocoCondId || !blocoNome.trim()}
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-brand-green text-white text-sm font-bold inline-flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <Plus size={14} /> Adicionar bloco
                </button>
              </div>
            </div>

            {blocoCondId && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-700 mb-2">
                  Blocos cadastrados ({blocosDoCond.length})
                </p>
                {blocosDoCond.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhum bloco cadastrado para este condomínio.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {blocosDoCond.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-700">
                        {b}
                        <button onClick={() => excluirBloco(b)} className="text-gray-400 hover:text-red-500" aria-label={`Excluir ${b}`}>
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

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
              <div>
                <input
                  list="blocos-cadastrados"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:border-brand-green focus:outline-none"
                  placeholder="Bloco"
                  value={form.bloco}
                  onChange={(e) => setCampo('bloco', e.target.value)}
                />
                <datalist id="blocos-cadastrados">
                  {(form.condominio_id ? (blocos[form.condominio_id] || []) : []).map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
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
