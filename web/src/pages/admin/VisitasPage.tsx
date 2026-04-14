import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  useVisitas, useCriarVisita, useCondominios, useCriarCondominio, useTemplates, useUsuarios, useExcluirVisita,
  useCategorias, usePerguntas, useCriarCategoria, useCriarPergunta, useAtualizarPergunta, useExcluirPergunta,
  useExcluirPerguntasBulk, useCriarTemplate, useCriarUsuario,
} from '../../api/hooks'
import { api } from '../../api/client'
import VoiceButton from '../../components/VoiceButton'
import {
  Plus, Search, Pencil, Trash2, HelpCircle, X, Filter, Download,
  Building2, LayoutTemplate, FileText, CheckCircle, ChevronRight, ChevronLeft,
  FolderOpen, MessageSquare, ChevronDown, ChevronUp, ListChecks, Camera, ToggleLeft,
  CheckSquare, Square, MapPin, Loader2, UserCheck, Printer, QrCode, Share2, ClipboardList, ExternalLink,
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useAuth } from '../../store/auth'
import { useSetupProgress } from '../../api/useSetupProgress'
import SetupBanner from '../../components/SetupBanner'
import clsx from 'clsx'

const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  aguardando_aprovacao: 'Aguard. aprovação',
  aprovada: 'Aprovada',
  enviada_sindico: 'Enviada ao síndico',
  concluida: 'Concluída',
}

const STATUS_BADGE: Record<string, string> = {
  nao_iniciada: 'bg-gray-100 text-gray-600',
  em_andamento: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-100 text-orange-700',
  aprovada: 'bg-green-100 text-green-700',
  enviada_sindico: 'bg-purple-100 text-purple-700',
  concluida: 'bg-gray-800 text-white',
}

export default function VisitasPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ condominio_id: '', template_id: '', supervisor_id: '', titulo: '', observacoes: '' })
  const [step, setStep] = useState(0)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCondominio, setFiltroCondominio] = useState('')
  const [filtroSupervisor, setFiltroSupervisor] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [qrVisita, setQrVisita] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(false)
  const [showNovoCondominio, setShowNovoCondominio] = useState(false)
  const [novoCondominio, setNovoCondominio] = useState({ nome: '', endereco: '' })
  const [cnpj, setCnpj] = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [usarCnpj, setUsarCnpj] = useState(true)
  const [showNovoSupervisor, setShowNovoSupervisor] = useState(false)
  const [novoSupervisor, setNovoSupervisor] = useState({ nome: '', email: '', senha: '' })

  const { data: visitasRes, isLoading } = useVisitas()
  const { data: condominiosRes } = useCondominios({ limit: 1000 })
  const { data: templates = [] } = useTemplates()
  const { data: usuariosRes } = useUsuarios({ limit: 1000 })
  const criar = useCriarVisita()
  const criarCond = useCriarCondominio()
  const criarUsuario = useCriarUsuario()
  const excluir = useExcluirVisita()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const { allDone } = useSetupProgress()

  const visitas = visitasRes?.data || []
  const condominios = condominiosRes?.data || []
  const usuarios = usuariosRes?.data || []

  const supervisores = usuarios.filter((u: any) => u.role === 'supervisor')

  const filtered = visitas.filter((v: any) => {
    if (filtroStatus && v.status !== filtroStatus) return false
    if (filtroCondominio && v.condominio_id !== filtroCondominio) return false
    if (filtroSupervisor && v.supervisor_id !== filtroSupervisor) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      v.condominio_nome?.toLowerCase().includes(q) ||
      v.supervisor_nome?.toLowerCase().includes(q) ||
      v.protocolo?.includes(q) ||
      v.titulo?.toLowerCase().includes(q)
    )
  })

  const handleCriar = async (e?: React.FormEvent) => {
    e?.preventDefault()
    try {
      await criar.mutateAsync({
        condominio_id: form.condominio_id,
        template_id: form.template_id || undefined,
        supervisor_id: form.supervisor_id || undefined,
        titulo: form.titulo || undefined,
        observacoes: form.observacoes || undefined,
      })
      toast.success('Visita criada!')
      setShowModal(false)
      setStep(0)
      setForm({ condominio_id: '', template_id: '', supervisor_id: '', titulo: '', observacoes: '' })
      if (!allDone) navigate('/dashboard')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar visita.'))
    }
  }

  const [searchParams, setSearchParams] = useSearchParams()

  const openWizard = () => {
    setForm({ condominio_id: '', template_id: '', supervisor_id: '', titulo: '', observacoes: '' })
    setStep(0)
    setShowNovoCondominio(false)
    setNovoCondominio({ nome: '', endereco: '' })
    setShowNovoSupervisor(false)
    setNovoSupervisor({ nome: '', email: '', senha: '' })
    setShowModal(true)
  }

  // Auto-open wizard when navigating with ?template=ID, ?novaVisita=1 or ?resumeWizard=1
  useEffect(() => {
    const templateParam = searchParams.get('template')
    const novaVisita = searchParams.get('novaVisita')
    const resumeWizard = searchParams.get('resumeWizard')
    if (resumeWizard && templateParam) {
      // Returning from TemplatesPage after creating a template
      const saved = sessionStorage.getItem('wizardState')
      const wizardState = saved ? JSON.parse(saved) : {}
      sessionStorage.removeItem('wizardState')
      setForm({
        condominio_id: wizardState.condominio_id || '',
        template_id: templateParam,
        supervisor_id: '',
        titulo: '',
        observacoes: '',
      })
      setStep(3)
      setShowModal(true)
      setSearchParams({}, { replace: true })
    } else if (templateParam) {
      setForm({ condominio_id: '', template_id: templateParam, supervisor_id: '', titulo: '', observacoes: '' })
      setStep(0)
      setShowModal(true)
      setSearchParams({}, { replace: true })
    } else if (novaVisita) {
      openWizard()
      setSearchParams({}, { replace: true })
    } else if (!allDone && visitas.length === 0) {
      openWizard()
    }
  }, [allDone, isLoading])

  const handleCriarCondominio = async () => {
    if (!novoCondominio.nome.trim() || !novoCondominio.endereco.trim()) {
      toast.error('Preencha nome e endereço')
      return
    }
    try {
      const cond: any = await criarCond.mutateAsync({
        nome: novoCondominio.nome.trim(),
        endereco: novoCondominio.endereco.trim(),
      })
      toast.success('Condomínio criado!')
      setForm((f) => ({ ...f, condominio_id: cond.id }))
      setShowNovoCondominio(false)
      setNovoCondominio({ nome: '', endereco: '' })
      setCnpj('')
      setTimeout(() => setStep(1), 300)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar condomínio.'))
    }
  }

  const buscarCnpj = async () => {
    const limpo = cnpj.replaceAll(/\D/g, '')
    if (limpo.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos')
      return
    }
    setBuscandoCnpj(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
      if (!res.ok) throw new Error('CNPJ não encontrado')
      const data = await res.json()
      const nome = data.nome_fantasia || data.razao_social || ''
      const partes = [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf].filter(Boolean)
      const endereco = partes.join(', ')
      setNovoCondominio({ nome, endereco })
      toast.success('Dados preenchidos!')
    } catch {
      toast.error('CNPJ não encontrado')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  const STEPS = [
    { label: 'Condomínio', icon: Building2 },
    { label: 'Vistoria', icon: LayoutTemplate },
    { label: 'Funcionário', icon: UserCheck },
    { label: 'Revisão', icon: CheckCircle },
  ]

  const canAdvance = () => {
    if (step === 0) return !!form.condominio_id
    if (step === 1) return !!form.template_id
    if (step === 2) return !!form.supervisor_id
    return true
  }

  const nextStep = () => { if (step < 3 && canAdvance()) setStep(step + 1) }
  const prevStep = () => { if (step > 0) setStep(step - 1) }

  const selectedCondominio = (condominios as any[]).find((c: any) => c.id === form.condominio_id)
  const selectedTemplate = (templates as any[]).find((t: any) => t.id === form.template_id)
  const selectedSupervisor = supervisores.find((s: any) => s.id === form.supervisor_id)

  const handleExcluir = async () => {
    if (!confirmDelete) return
    try {
      await excluir.mutateAsync(confirmDelete.id)
      toast.success('Visita excluída!')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir visita.'))
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/visitas/exportar/csv', { responseType: 'blob' })
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visitas_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao exportar.'))
    }
  }

  const hasActiveFilters = filtroStatus || filtroCondominio || filtroSupervisor
  const clearFilters = () => { setFiltroStatus(''); setFiltroCondominio(''); setFiltroSupervisor('') }

  return (
    <div className="space-y-4">
      <SetupBanner currentKey="visitas" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas</h1>
          <p className="text-sm text-gray-500">{visitasRes?.total || visitas.length} visitas registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQuestionsPanel(true)} className="btn-secondary flex items-center gap-1.5" title="Categorias & Perguntas">
            <ListChecks size={16} /> Perguntas
          </button>
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          {isAdmin && (
            <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-1.5" title="Exportar CSV">
              <Download size={16} /> CSV
            </button>
          )}
          <button onClick={openWizard} className="btn-primary">
            <Plus size={16} /> Nova visita
          </button>
        </div>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por condomínio, funcionário, protocolo ou título..."
            className="input pl-9"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-1.5 ${hasActiveFilters ? 'border-brand-navy text-brand-navy' : ''}`}>
          <Filter size={16} /> Filtros {hasActiveFilters && '•'}
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label htmlFor="filtro-status" className="label">Status</label>
            <select id="filtro-status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="input w-auto">
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-condominio" className="label">Condomínio</label>
            <select id="filtro-condominio" value={filtroCondominio} onChange={(e) => setFiltroCondominio(e.target.value)} className="input w-auto">
              <option value="">Todos</option>
              {(condominios as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-supervisor" className="label">Funcionário</label>
            <select id="filtro-supervisor" value={filtroSupervisor} onChange={(e) => setFiltroSupervisor(e.target.value)} className="input w-auto">
              <option value="">Todos</option>
              {supervisores.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-red-500 hover:underline pb-2">Limpar filtros</button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Protocolo</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Condomínio</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Funcionário</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Início</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Fim</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Pendências</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((v: any) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-700 font-mono text-xs px-2 py-1 rounded-lg">
                    #{v.protocolo || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{v.condominio_nome}</td>
                <td className="px-4 py-3 text-gray-600">{v.supervisor_nome}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[v.status] || 'bg-gray-100'}`}>
                    {STATUS_LABEL[v.status] || v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{dayjs(v.criado_em).format('DD/MM/YYYY')}</td>
                <td className="px-4 py-3 text-gray-500">{v.iniciada_em ? dayjs(v.iniciada_em).format('HH:mm') : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-500">{v.finalizada_em ? dayjs(v.finalizada_em).format('HH:mm') : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-center">
                  {v.total_pendencias > 0 ? (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {v.total_pendencias}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a href={`${globalThis.location.origin}/questionario/${v.id}`} target="_blank" rel="noopener noreferrer" className="text-brand-navy hover:underline flex items-center gap-1 font-medium">
                      <ClipboardList size={14} /> Iniciar Vistoria
                    </a>
                    <Link
                      to={`/visitas/${v.id}/editar`}
                      className="text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                    <button
                      onClick={() => {
                        const url = `${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/visita/${v.id}`
                        const token = localStorage.getItem('token')
                        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.blob())
                          .then(blob => {
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `vistoria-${v.protocolo || v.id}.pdf`
                            a.click()
                            URL.revokeObjectURL(a.href)
                          })
                          .catch((err: any) => toast.error(extrairErro(err, 'Erro ao gerar PDF.')))
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Imprimir Relatório"
                    >
                      <Printer size={28} />
                    </button>
                    <button
                      onClick={() => {
                        const url = `${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/visita/${v.id}/questionario`
                        const token = localStorage.getItem('token')
                        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.blob())
                          .then(blob => {
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `questionario-${v.protocolo || v.id}.pdf`
                            a.click()
                            URL.revokeObjectURL(a.href)
                          })
                          .catch((err: any) => toast.error(extrairErro(err, 'Erro ao gerar questionário.')))
                      }}
                      className="text-orange-500 hover:text-orange-700 p-1"
                      title="Imprimir Questionário em Branco"
                    >
                      <ClipboardList size={28} />
                    </button>
                    <button
                      onClick={() => setQrVisita(v)}
                      className="text-purple-500 hover:text-purple-700 p-1"
                      title="QR Code"
                    >
                      <QrCode size={28} />
                    </button>
                    <button
                      onClick={() => {
                        const shareUrl = `${globalThis.location.origin}/questionario/${v.id}`
                        if (navigator.share) {
                          navigator.share({ title: `Vistoria #${v.protocolo}`, text: `Executar vistoria: ${v.condominio_nome}`, url: shareUrl })
                        } else {
                          navigator.clipboard.writeText(shareUrl)
                          toast.success('Link de execução copiado!')
                        }
                      }}
                      className="text-green-500 hover:text-green-700 p-1"
                      title="Compartilhar link de execução"
                    >
                      <Share2 size={28} />
                    </button>
                    <Link
                      to={`/visitas/${v.id}`}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                      title="Abrir questionário"
                    >
                      <ExternalLink size={28} />
                    </Link>
                    {isAdmin && (
                      <button onClick={() => setConfirmDelete(v)} className="text-gray-400 hover:text-red-600 p-1" title="Excluir">
                        <Trash2 size={28} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma visita encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Wizard Nova Visita */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Visita</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Stepper */}
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center flex-1 last:flex-none">
                    <button
                      type="button"
                      onClick={() => { if (i < step || (i <= step)) setStep(i) }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm font-bold',
                        i < step && 'bg-brand-green text-white',
                        i === step && 'bg-brand-navy text-white ring-4 ring-brand-navy/20',
                        i > step && 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                      )}>
                        {i < step ? <CheckCircle size={18} /> : <s.icon size={16} />}
                      </div>
                      <span className={clsx(
                        'text-[11px] font-medium transition-colors',
                        i <= step ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                      )}>
                        {s.label}
                      </span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={clsx(
                        'flex-1 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors',
                        i < step ? 'bg-brand-green' : 'bg-gray-200 dark:bg-gray-700'
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="px-6 py-5 min-h-[220px]">

              {/* Step 0: Condomínio */}
              {step === 0 && (
                <div className="space-y-3">
                  {showNovoCondominio ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Novo condomínio</p>
                        <button
                          type="button"
                          onClick={() => setShowNovoCondominio(false)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          <ChevronLeft size={14} /> Voltar à lista
                        </button>
                      </div>
                      {/* Toggle CNPJ */}
                      <button
                        type="button"
                        onClick={() => { setCnpj(''); setBuscandoCnpj(false); setUsarCnpj(!usarCnpj) }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-all"
                      >
                        <span className="text-xs text-gray-500">Buscar por CNPJ</span>
                        <div className={clsx(
                          'w-9 h-5 rounded-full relative transition-colors',
                          usarCnpj ? 'bg-brand-navy' : 'bg-gray-300'
                        )}>
                          <div className={clsx(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                            usarCnpj ? 'left-[18px]' : 'left-0.5'
                          )} />
                        </div>
                      </button>
                      {/* Campo CNPJ */}
                      {usarCnpj && (
                        <div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                value={cnpj}
                                onChange={(e) => {
                                  const v = e.target.value.replaceAll(/\D/g, '').slice(0, 14)
                                  const formatted = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                                  setCnpj(v.length > 2 ? formatted : v)
                                }}
                                className="input pl-10"
                                placeholder="00.000.000/0000-00"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={buscarCnpj}
                              disabled={buscandoCnpj || cnpj.replaceAll(/\D/g, '').length !== 14}
                              className="btn-primary text-xs px-4 whitespace-nowrap"
                            >
                              {buscandoCnpj ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="border-t border-gray-100 dark:border-gray-700" />
                      <div>
                        <label htmlFor="novo-cond-nome" className="label">Nome *</label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            id="novo-cond-nome"
                            value={novoCondominio.nome}
                            onChange={(e) => setNovoCondominio({ ...novoCondominio, nome: e.target.value })}
                            className="input pl-10"
                            placeholder="Nome do condomínio"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="novo-cond-endereco" className="label">Endereço *</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            id="novo-cond-endereco"
                            value={novoCondominio.endereco}
                            onChange={(e) => setNovoCondominio({ ...novoCondominio, endereco: e.target.value })}
                            className="input pl-10"
                            placeholder="Endereço completo"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCriarCondominio}
                        disabled={criarCond.isPending || !novoCondominio.nome.trim() || !novoCondominio.endereco.trim()}
                        className="btn-primary w-full text-sm"
                      >
                        {criarCond.isPending ? 'Cadastrando...' : <><CheckCircle size={16} /> Cadastrar e continuar</>}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-500">Selecione o condomínio para a vistoria:</p>
                        <button
                          type="button"
                          onClick={() => setShowNovoCondominio(true)}
                          className="btn-primary text-xs px-3 py-1.5 rounded-lg shadow"
                        >
                          <Plus size={14} /> Novo
                        </button>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {(condominios as any[]).map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, condominio_id: c.id })
                              setTimeout(() => setStep(1), 200)
                            }}
                            className={clsx(
                              'w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between group',
                              form.condominio_id === c.id
                                ? 'border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/20'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                form.condominio_id === c.id ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                              )}>
                                <Building2 size={16} />
                              </div>
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-white">{c.nome}</div>
                                {c.endereco && <div className="text-xs text-gray-400 truncate max-w-[250px]">{c.endereco}</div>}
                              </div>
                            </div>
                            {form.condominio_id === c.id && <CheckCircle size={18} className="text-brand-green" />}
                          </button>
                        ))}
                      </div>
                      {condominios.length === 0 && (
                        <div className="text-center py-6">
                          <Building2 size={32} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-gray-400 text-sm mb-3">Nenhum condomínio cadastrado</p>
                          <button
                            type="button"
                            onClick={() => setShowNovoCondominio(true)}
                            className="btn-primary text-sm"
                          >
                            <Plus size={16} /> Cadastrar condomínio
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-500">Escolha um modelo de vistoria:</p>
                      <div className="relative group">
                        <HelpCircle size={15} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <p className="font-semibold mb-1">O que é um modelo de vistoria?</p>
                          <p>É um modelo pronto com perguntas pré-definidas. Ao selecionar um, a vistoria já vem com todas as perguntas configuradas.</p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('wizardState', JSON.stringify({ condominio_id: form.condominio_id }))
                        navigate('/vistoria?fromWizard=1')
                      }}
                      className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
                    >
                      <Plus size={14} /> Novo modelo
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {(templates as any[]).map((t: any) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, template_id: t.id })
                          setTimeout(() => setStep(2), 200)
                        }}
                        className={clsx(
                          'w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between',
                          form.template_id === t.id
                            ? 'border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/20'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            form.template_id === t.id ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                          )}>
                            <LayoutTemplate size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{t.nome}</div>
                            {t.total_perguntas != null && <div className="text-xs text-gray-400">{t.total_perguntas} perguntas</div>}
                          </div>
                        </div>
                        {form.template_id === t.id && <CheckCircle size={18} className="text-brand-green" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Funcionário */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500">Qual funcionário vai fazer a vistoria?</p>
                    {!showNovoSupervisor && (
                      <button
                        type="button"
                        onClick={() => setShowNovoSupervisor(true)}
                        className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
                      >
                        <Plus size={14} /> Novo
                      </button>
                    )}
                  </div>

                  {showNovoSupervisor ? (
                    <div className="space-y-3 p-4 border border-gray-200 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                      <div>
                        <label htmlFor="novo-sup-nome" className="label">Nome *</label>
                        <input
                          id="novo-sup-nome"
                          type="text"
                          value={novoSupervisor.nome}
                          onChange={(e) => setNovoSupervisor({ ...novoSupervisor, nome: e.target.value })}
                          className="input"
                          placeholder="Nome do funcionário"
                        />
                      </div>
                      <div>
                        <label htmlFor="novo-sup-email" className="label">Email *</label>
                        <input
                          id="novo-sup-email"
                          type="email"
                          value={novoSupervisor.email}
                          onChange={(e) => setNovoSupervisor({ ...novoSupervisor, email: e.target.value })}
                          className="input"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="novo-sup-senha" className="label">Senha *</label>
                        <input
                          id="novo-sup-senha"
                          type="password"
                          value={novoSupervisor.senha}
                          onChange={(e) => setNovoSupervisor({ ...novoSupervisor, senha: e.target.value })}
                          className="input"
                          placeholder="6 dígitos numéricos"
                          inputMode="numeric"
                          maxLength={6}
                          pattern="[0-9]{6}"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={criarUsuario.isPending || !novoSupervisor.nome.trim() || !novoSupervisor.email.trim() || !/^\d{6}$/.test(novoSupervisor.senha)}
                          onClick={async () => {
                            try {
                              const sup: any = await criarUsuario.mutateAsync({
                                nome: novoSupervisor.nome.trim(),
                                email: novoSupervisor.email.trim(),
                                senha: novoSupervisor.senha,
                                role: 'supervisor',
                              })
                              toast.success('Funcionário criado!')
                              setForm((f) => ({ ...f, supervisor_id: sup.id }))
                              setShowNovoSupervisor(false)
                              setNovoSupervisor({ nome: '', email: '', senha: '' })
                              setTimeout(() => setStep(3), 300)
                            } catch (err: any) {
                              toast.error(extrairErro(err, 'Erro ao criar funcionário.'))
                            }
                          }}
                          className="btn-primary text-sm flex-1"
                        >
                          {criarUsuario.isPending ? 'Criando...' : 'Cadastrar e continuar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNovoSupervisor(false); setNovoSupervisor({ nome: '', email: '', senha: '' }) }}
                          className="btn-secondary text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {supervisores.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, supervisor_id: s.id })
                          setTimeout(() => setStep(3), 200)
                        }}
                        className={clsx(
                          'w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between',
                          form.supervisor_id === s.id
                            ? 'border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/20'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            form.supervisor_id === s.id ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                          )}>
                            <UserCheck size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{s.nome}</div>
                            <div className="text-xs text-gray-400">{s.email}</div>
                          </div>
                        </div>
                        {form.supervisor_id === s.id && <CheckCircle size={18} className="text-brand-green" />}
                      </button>
                    ))}
                  </div>

                  )}
                </div>
              )}

              {/* Step 3: Revisão */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-3">Confira os dados antes de criar:</p>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                        <Building2 size={16} className="text-brand-navy" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Condomínio</div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{selectedCondominio?.nome || '—'}</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200/50 dark:border-gray-700" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                        <LayoutTemplate size={16} className="text-brand-navy" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Vistoria</div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{selectedTemplate?.nome || '—'}</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200/50 dark:border-gray-700" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                        <UserCheck size={16} className="text-brand-navy" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Funcionário</div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{selectedSupervisor?.nome || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200/50 dark:border-gray-700 pt-3 space-y-3">
                    <div>
                      <label htmlFor="wizard-titulo" className="label">Título (opcional)</label>
                      <input
                        id="wizard-titulo"
                        value={form.titulo}
                        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                        className="input"
                        placeholder="Ex: Vistoria mensal - Março"
                      />
                    </div>
                    <div>
                      <label htmlFor="wizard-obs" className="label">Observações (opcional)</label>
                      <textarea
                        id="wizard-obs"
                        value={form.observacoes}
                        onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                        className="input min-h-[70px] resize-none"
                        placeholder="Observações gerais sobre a vistoria..."
                        rows={2}
                      />
                      <VoiceButton
                        onTranscription={(t) => setForm((f) => ({ ...f, observacoes: t }))}
                        append
                        currentValue={form.observacoes}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={step === 0 ? () => setShowModal(false) : prevStep}
                className="btn-secondary text-sm"
              >
                {step === 0 ? 'Cancelar' : <><ChevronLeft size={16} /> Voltar</>}
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canAdvance()}
                  className="btn-primary text-sm"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCriar()}
                  disabled={criar.isPending}
                  className="btn-primary text-sm"
                >
                  {criar.isPending ? 'Criando...' : <><CheckCircle size={16} /> Criar visita</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrVisita && (() => {
        const questionarioUrl = `${globalThis.location.origin}/questionario/${qrVisita.id}`
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">QR Code</h3>
              <button onClick={() => setQrVisita(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(questionarioUrl)}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500 mb-1">Protocolo: <strong>#{qrVisita.protocolo || '—'}</strong></p>
            <p className="text-sm font-medium text-gray-700 mb-4">{qrVisita.condominio_nome}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(questionarioUrl)
                  toast.success('Link de execução copiado!')
                }}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Share2 size={14} /> Copiar link
              </button>
              <button
                onClick={() => {
                  const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(questionarioUrl)}`
                  const a = document.createElement('a')
                  a.href = imgUrl
                  a.download = `qr-vistoria-${qrVisita.protocolo || qrVisita.id}.png`
                  a.click()
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Download size={14} /> Baixar QR
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir visita?</h3>
            <p className="text-sm text-gray-500 mb-1">Protocolo: <strong>#{confirmDelete.protocolo || '—'}</strong></p>
            <p className="text-sm text-gray-500 mb-4">{confirmDelete.condominio_nome}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleExcluir} disabled={excluir.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                {excluir.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel Categorias & Perguntas */}
      {showQuestionsPanel && (
        <QuestionsPanelModal onClose={() => setShowQuestionsPanel(false)} />
      )}

      {/* Modal ajuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><HelpCircle size={20} className="text-brand-navy" /> Como usar</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">1</div>
                <div><p className="font-medium text-gray-900">Criar visita</p><p>Clique em "Nova visita", selecione o condomínio e opcionalmente um modelo de vistoria.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Protocolo</p><p>Cada visita recebe um protocolo de 6 dígitos automaticamente. Use-o para localizar rapidamente.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Filtros</p><p>Filtre por status, condomínio ou supervisor. Use a busca para pesquisar por protocolo, título ou nome.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">4</div>
                <div><p className="font-medium text-gray-900">Iniciar / Editar</p><p>Clique em "Iniciar Vistoria" para acessar os detalhes. Visitas em andamento, pausadas ou não iniciadas podem ser editadas.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quick panel for categories & questions ─────────────────────────

function QuestionsPanelModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const { data: categorias = [] } = useCategorias()
  const [catForm, setCatForm] = useState({ nome: '', descricao: '' })
  const [showCatForm, setShowCatForm] = useState(false)
  const criarCat = useCriarCategoria()

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarCat.mutateAsync({ nome: catForm.nome, descricao: catForm.descricao || undefined })
      toast.success('Categoria criada!')
      setShowCatForm(false)
      setCatForm({ nome: '', descricao: '' })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar categoria.'))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ListChecks size={20} className="text-brand-navy" /> Categorias & Perguntas
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{(categorias as any[]).length} categorias cadastradas</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {(categorias as any[]).length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FolderOpen size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma categoria cadastrada</p>
            </div>
          )}
          {(categorias as any[]).map((cat: any) => (
            <InlineCategoriaAccordion key={cat.id} categoria={cat} />
          ))}
        </div>

        {/* Footer — Nova categoria */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex-shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          {showCatForm ? (
            <form onSubmit={handleCriarCategoria} className="space-y-2">
              <input
                value={catForm.nome}
                onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })}
                className="input text-sm"
                placeholder="Nome da categoria *"
                required
                autoFocus
              />
              <input
                value={catForm.descricao}
                onChange={(e) => setCatForm({ ...catForm, descricao: e.target.value })}
                className="input text-sm"
                placeholder="Descrição (opcional)"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={criarCat.isPending} className="btn-primary text-sm flex-1 justify-center">
                  {criarCat.isPending ? 'Salvando...' : 'Criar categoria'}
                </button>
                <button type="button" onClick={() => setShowCatForm(false)} className="btn-secondary text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowCatForm(true); setCatForm({ nome: '', descricao: '' }) }}
              className="btn-primary w-full justify-center text-sm"
            >
              <Plus size={16} /> Nova categoria
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InlineCategoriaAccordion({ categoria }: Readonly<{ categoria: any }>) {
  const [aberta, setAberta] = useState(false)
  const { data: perguntas = [], isLoading } = usePerguntas(aberta ? categoria.id : '')

  const [showPerguntaForm, setShowPerguntaForm] = useState(false)
  const [perguntaForm, setPerguntaForm] = useState({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false })
  const [editPergunta, setEditPergunta] = useState<any>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateNome, setTemplateNome] = useState('')

  const criarPergunta = useCriarPergunta()
  const atualizarPergunta = useAtualizarPergunta()
  const excluirPergunta = useExcluirPergunta()
  const excluirBulk = useExcluirPerguntasBulk()
  const criarTemplate = useCriarTemplate()

  const perguntasList = perguntas as any[]
  const allSelected = perguntasList.length > 0 && selectedIds.size === perguntasList.length

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(perguntasList.map((p: any) => p.id)))
    }
  }

  const handleExcluirPergunta = async () => {
    if (!confirmDeleteId) return
    try {
      await excluirPergunta.mutateAsync(confirmDeleteId)
      toast.success('Pergunta removida!')
      setConfirmDeleteId(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir pergunta.'))
    }
  }

  const handleBulkDelete = async () => {
    try {
      await excluirBulk.mutateAsync([...selectedIds])
      toast.success(`${selectedIds.size} pergunta(s) removida(s)!`)
      setSelectedIds(new Set())
      setConfirmBulkDelete(false)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir perguntas.'))
    }
  }

  const handleCriarTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarTemplate.mutateAsync({
        nome: templateNome,
        perguntas: [...selectedIds].map((id, i) => ({ pergunta_id: id, ordem: i + 1 })),
      })
      toast.success('Modelo de vistoria criado com sucesso!')
      setSelectedIds(new Set())
      setShowTemplateForm(false)
      setTemplateNome('')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar modelo de vistoria.'))
    }
  }

  const handleEditarPergunta = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await atualizarPergunta.mutateAsync({
        id: editPergunta.id,
        texto: perguntaForm.texto,
        requer_sim_nao: perguntaForm.requer_sim_nao,
        requer_foto: perguntaForm.requer_foto,
        requer_observacao: perguntaForm.requer_observacao,
      })
      toast.success('Pergunta atualizada!')
      setEditPergunta(null)
      setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar pergunta.'))
    }
  }

  const handleCriarPergunta = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await criarPergunta.mutateAsync({
        categoria_id: categoria.id,
        texto: perguntaForm.texto,
        requer_sim_nao: perguntaForm.requer_sim_nao,
        requer_foto: perguntaForm.requer_foto,
        requer_observacao: perguntaForm.requer_observacao,
      })
      toast.success('Pergunta adicionada!')
      setShowPerguntaForm(false)
      setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar pergunta.'))
    }
  }



  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-light rounded-lg flex items-center justify-center flex-shrink-0">
            <FolderOpen size={14} className="text-brand-navy" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">{categoria.nome}</span>
          <span className="text-xs text-gray-400">({categoria.total_perguntas})</span>
        </div>
        {aberta ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {aberta && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {isLoading ? (
            <div className="px-4 py-3 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
          ) : (
            <>
              {/* Select all + selection count */}
              {perguntasList.length > 0 && (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={toggleAll} className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand-navy">
                    {allSelected
                      ? <CheckSquare size={13} className="text-brand-navy" />
                      : <Square size={13} />}
                    <span>{allSelected ? 'Desmarcar todas' : 'Selecionar todas'}</span>
                  </button>
                  {selectedIds.size > 0 && (
                    <span className="text-[11px] text-brand-navy font-medium ml-auto">
                      {selectedIds.size} selecionada(s)
                    </span>
                  )}
                </div>
              )}

              {perguntasList.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400">Nenhuma pergunta nesta categoria</div>
              )}
              {perguntasList.map((p: any, i: number) => (
                <div key={p.id} className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 group ${selectedIds.has(p.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                  <button type="button" onClick={() => toggleSelect(p.id)} className="flex-shrink-0">
                    {selectedIds.has(p.id)
                      ? <CheckSquare size={14} className="text-brand-navy" />
                      : <Square size={14} className="text-gray-300 hover:text-gray-400" />}
                  </button>
                  <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <MessageSquare size={13} className="text-gray-300 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{p.texto}</span>
                  {p.requer_sim_nao && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">Sim/Não</span>}
                  {p.requer_foto && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Foto</span>}
                  {p.requer_observacao && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">Texto</span>}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setEditPergunta(p); setPerguntaForm({ texto: p.texto, requer_sim_nao: p.requer_sim_nao ?? true, requer_foto: p.requer_foto ?? false, requer_observacao: p.requer_observacao ?? false }); setShowPerguntaForm(false) }}
                      className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Floating toolbar when items selected */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy/5 dark:bg-brand-navy/10 border-t border-brand-navy/10">
                  <span className="text-[11px] font-medium text-brand-navy mr-auto">{selectedIds.size} pergunta(s) selecionada(s)</span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateForm(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-lg"
                  >
                    <LayoutTemplate size={12} /> Criar template
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Limpar seleção"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Edit question inline form */}
              {editPergunta && (
                <form onSubmit={handleEditarPergunta} className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 space-y-2 border-b border-emerald-100 dark:border-emerald-800">
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">Editando pergunta</div>
                  <input
                    value={perguntaForm.texto}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, texto: e.target.value })}
                    className="input text-xs"
                    placeholder="Texto da pergunta..."
                    required
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_sim_nao} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_sim_nao: e.target.checked })} className="rounded" />
                      <ToggleLeft size={13} className="text-emerald-500" /> Sim/Não
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_foto} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_foto: e.target.checked })} className="rounded" />
                      <Camera size={13} className="text-amber-500" /> Foto
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_observacao} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_observacao: e.target.checked })} className="rounded" />
                      <FileText size={13} className="text-green-500" /> Texto
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={atualizarPergunta.isPending} className="btn-primary text-xs py-1.5 px-3">
                      {atualizarPergunta.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={() => { setEditPergunta(null); setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false }) }} className="btn-secondary text-xs py-1.5 px-3">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Inline add question */}
              {showPerguntaForm ? (
                <form onSubmit={handleCriarPergunta} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 space-y-2">
                  <input
                    value={perguntaForm.texto}
                    onChange={(e) => setPerguntaForm({ ...perguntaForm, texto: e.target.value })}
                    className="input text-xs"
                    placeholder="Texto da pergunta..."
                    required
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_sim_nao} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_sim_nao: e.target.checked })} className="rounded" />
                      <ToggleLeft size={13} className="text-emerald-500" /> Sim/Não
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_foto} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_foto: e.target.checked })} className="rounded" />
                      <Camera size={13} className="text-amber-500" /> Foto
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={perguntaForm.requer_observacao} onChange={(e) => setPerguntaForm({ ...perguntaForm, requer_observacao: e.target.checked })} className="rounded" />
                      <FileText size={13} className="text-green-500" /> Texto
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={criarPergunta.isPending} className="btn-primary text-xs py-1.5 px-3">
                      {criarPergunta.isPending ? 'Salvando...' : 'Adicionar'}
                    </button>
                    <button type="button" onClick={() => setShowPerguntaForm(false)} className="btn-secondary text-xs py-1.5 px-3">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => { setShowPerguntaForm(true); setEditPergunta(null); setPerguntaForm({ texto: '', requer_sim_nao: true, requer_foto: false, requer_observacao: false }) }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-brand-navy hover:bg-emerald-50 dark:hover:bg-emerald-900/20 w-full text-left"
                >
                  <Plus size={13} /> Adicionar pergunta
                </button>
              )}
            </>
          )}

          {/* Confirm delete single pergunta */}
          {confirmDeleteId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="card w-full max-w-xs p-5 text-center">
                <Trash2 size={32} className="mx-auto mb-2 text-red-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Excluir pergunta?</h3>
                <p className="text-xs text-gray-500 mb-4">Esta ação não pode ser desfeita.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary flex-1 text-xs">Cancelar</button>
                  <button onClick={handleExcluirPergunta} disabled={excluirPergunta.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-xl text-xs font-medium">
                    {excluirPergunta.isPending ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm bulk delete */}
          {confirmBulkDelete && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="card w-full max-w-xs p-5 text-center">
                <Trash2 size={32} className="mx-auto mb-2 text-red-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Excluir {selectedIds.size} pergunta(s)?</h3>
                <p className="text-xs text-gray-500 mb-4">Esta ação não pode ser desfeita.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmBulkDelete(false)} className="btn-secondary flex-1 text-xs">Cancelar</button>
                  <button onClick={handleBulkDelete} disabled={excluirBulk.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-xl text-xs font-medium">
                    {excluirBulk.isPending ? 'Excluindo...' : 'Excluir todas'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create template modal */}
          {showTemplateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <div className="card w-full max-w-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutTemplate size={18} className="text-brand-navy" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Criar template de vistoria</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">{selectedIds.size} pergunta(s) selecionada(s) de "{categoria.nome}"</p>
                <form onSubmit={handleCriarTemplate}>
                  <input
                    value={templateNome}
                    onChange={(e) => setTemplateNome(e.target.value)}
                    className="input text-xs mb-4"
                    placeholder="Nome do modelo (ex: Vistoria Portaria)"
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowTemplateForm(false); setTemplateNome('') }} className="btn-secondary flex-1 text-xs">Cancelar</button>
                    <button type="submit" disabled={criarTemplate.isPending} className="btn-primary flex-1 text-xs">
                      {criarTemplate.isPending ? 'Criando...' : 'Criar modelo'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
