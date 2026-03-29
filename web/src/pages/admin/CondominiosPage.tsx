import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCondominios, useUsuarios, useExcluirCondominio } from '../../api/hooks'
import { useSetupProgress } from '../../api/useSetupProgress'
import SetupBanner from '../../components/SetupBanner'
import { api } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, Users, MapPin, UserCheck, X, Search, Trash2, Ban, CheckCircle, HelpCircle, Pencil, QrCode, Download, Copy, Loader2, ClipboardCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useAuth } from '../../store/auth'

const emptyForm = {
  nome: '', endereco: '', cep: '', cidade: '', estado: '',
  sindico_nome: '', sindico_email: '', sindico_telefone: '', total_unidades: '',
}

export default function CondominiosPage() {
  const { data: condominiosRes, isLoading } = useCondominios()
  const { data: usuariosRes } = useUsuarios({ limit: 1000 })
  const qc = useQueryClient()
  const { user } = useAuth()
  const excluirMutation = useExcluirCondominio()
  const navigate = useNavigate()
  const { allDone } = useSetupProgress()

  const condominios = condominiosRes?.data || []
  const usuarios = usuariosRes?.data || []

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [supervisoresSelecionados, setSupervisoresSelecionados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')

  // Auto-open modal during setup
  useEffect(() => {
    if (!allDone && !isLoading && condominios.length === 0) {
      setShowModal(true)
    }
  }, [allDone, isLoading])
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)

  // Edição
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSupervisores, setEditSupervisores] = useState<string[]>([])
  const [loadingEdit, setLoadingEdit] = useState(false)

  // QR Code
  const [qrCondominio, setQrCondominio] = useState<any>(null)

  const supervisores = usuarios.filter((u: any) => u.role === 'supervisor')

  const isAdmin = user?.role === 'admin' || user?.role === 'master'

  const condominiosFiltrados = condominios.filter((c: any) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.endereco?.toLowerCase().includes(q) ||
      c.cidade?.toLowerCase().includes(q) ||
      c.sindico_nome?.toLowerCase().includes(q) ||
      c.cep?.includes(q)
    )
  })

  const toggleSupervisor = (id: string, lista: string[], setLista: (v: string[]) => void) => {
    setLista(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
  }

  const handleBloquear = async (c: any, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const endpoint = c.ativo === false ? 'desbloquear' : 'bloquear'
      await api.patch(`/condominios/${c.id}/${endpoint}`)
      toast.success(c.ativo === false ? 'Condomínio desbloqueado!' : 'Condomínio bloqueado!')
      qc.invalidateQueries({ queryKey: ['condominios'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao alterar status.'))
    }
  }

  const handleExcluir = async () => {
    if (!confirmDelete) return
    try {
      await excluirMutation.mutateAsync(confirmDelete.id)
      toast.success('Condomínio excluído!')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir condomínio.'))
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cond = await api.post('/condominios', {
        nome: form.nome,
        endereco: form.endereco || null,
        cep: form.cep || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        sindico_nome: form.sindico_nome || null,
        sindico_email: form.sindico_email?.trim() || null,
        sindico_telefone: form.sindico_telefone || null,
        total_unidades: form.total_unidades ? Number(form.total_unidades) : null,
      })
      // Vincula supervisores selecionados
      await Promise.all(
        supervisoresSelecionados.map((sid) =>
          api.post(`/condominios/${cond.id}/supervisores/${sid}`)
        )
      )
      toast.success('Condomínio cadastrado!')
      qc.invalidateQueries({ queryKey: ['condominios'] })
      setShowModal(false)
      setForm(emptyForm)
      setSupervisoresSelecionados([])
      if (!allDone) navigate('/usuarios')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao cadastrar condomínio.'))
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicao = (c: any) => {
    setEditando(c)
    setEditForm({
      nome: c.nome || '', endereco: c.endereco || '', cep: c.cep || '', cidade: c.cidade || '',
      estado: c.estado || '', sindico_nome: c.sindico_nome || '',
      sindico_email: c.sindico_email || '', sindico_telefone: c.sindico_telefone || '',
      total_unidades: c.total_unidades ? String(c.total_unidades) : '',
    })
    setEditSupervisores((c.supervisores || []).map((s: any) => s.id))
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEdit(true)
    try {
      await api.patch(`/condominios/${editando.id}`, {
        nome: editForm.nome,
        endereco: editForm.endereco || null,
        cep: editForm.cep || null,
        cidade: editForm.cidade || null,
        estado: editForm.estado || null,
        sindico_nome: editForm.sindico_nome || null,
        sindico_email: editForm.sindico_email?.trim() || null,
        sindico_telefone: editForm.sindico_telefone || null,
        total_unidades: editForm.total_unidades ? Number(editForm.total_unidades) : null,
      })

      // Supervisores atuais vs novos
      const atuais: string[] = (editando.supervisores || []).map((s: any) => s.id)
      const adicionar = editSupervisores.filter((id) => !atuais.includes(id))
      const remover = atuais.filter((id) => !editSupervisores.includes(id))

      await Promise.all([
        ...adicionar.map((sid) => api.post(`/condominios/${editando.id}/supervisores/${sid}`)),
        ...remover.map((sid) => api.delete(`/condominios/${editando.id}/supervisores/${sid}`)),
      ])

      toast.success('Condomínio atualizado!')
      qc.invalidateQueries({ queryKey: ['condominios'] })
      setEditando(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar condomínio.'))
    } finally {
      setLoadingEdit(false)
    }
  }

  return (
    <div className="space-y-4">
      <SetupBanner currentKey="condominios" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condomínios</h1>
          <p className="text-sm text-gray-500">{condominios.length} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo condomínio
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input pl-9"
          placeholder="Buscar por nome, endereço, cidade, síndico ou CEP..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {condominiosFiltrados.map((c: any) => (
          <div
            key={c.id}
            className={`card p-5 hover:shadow-md transition-shadow ${c.ativo === false ? 'opacity-60 border-red-200' : ''}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-brand-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{c.nome}</h3>
                <div className="flex items-center gap-2">
                  {c.total_unidades && (
                    <p className="text-xs text-gray-500">{c.total_unidades} unidades</p>
                  )}
                  {c.ativo === false && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Bloqueado</span>
                  )}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {c.qr_token && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setQrCondominio(c) }}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                    title="QR Code"
                  >
                    <QrCode size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); abrirEdicao(c) }}
                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => handleBloquear(c, e)}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 ${c.ativo === false ? 'text-green-500 hover:text-green-700' : 'text-yellow-500 hover:text-yellow-700'}`}
                      title={c.ativo === false ? 'Desbloquear' : 'Bloquear'}
                    >
                      {c.ativo === false ? <CheckCircle size={16} /> : <Ban size={16} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(c) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-gray-500">
              {c.endereco && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} /> {c.endereco}
                  {c.cidade && `, ${c.cidade}/${c.estado}`}
                </div>
              )}
              {c.sindico_nome && (
                <div className="flex items-center gap-1.5">
                  <Users size={13} /> Síndico: {c.sindico_nome}
                </div>
              )}
            </div>
            {/* Supervisores vinculados */}
            {c.supervisores?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                  <UserCheck size={13} /> Funcionário responsável por este condomínio
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.supervisores.map((s: any) => (
                    <span key={s.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      {s.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(!c.supervisores || c.supervisores.length === 0) && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1">
                <UserCheck size={13} /> Nenhum supervisor vinculado
              </div>
            )}
          </div>
        ))}
        {condominiosFiltrados.length === 0 && !isLoading && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{busca ? 'Nenhum condomínio encontrado' : 'Nenhum condomínio cadastrado'}</p>
          </div>
        )}
      </div>

      {/* Modal criar */}
      {showModal && (
        <CondominioModal
          title="Novo Condomínio"
          form={form}
          setForm={setForm}
          supervisores={supervisores}
          supervisoresSelecionados={supervisoresSelecionados}
          onToggleSupervisor={(id) => toggleSupervisor(id, supervisoresSelecionados, setSupervisoresSelecionados)}
          onSubmit={handleCriar}
          onClose={() => { setShowModal(false); setForm(emptyForm); setSupervisoresSelecionados([]) }}
          loading={loading}
          submitLabel="Cadastrar"
        />
      )}

      {/* Modal editar */}
      {editando && (
        <CondominioModal
          title="Editar Condomínio"
          form={editForm}
          setForm={setEditForm}
          supervisores={supervisores}
          supervisoresSelecionados={editSupervisores}
          onToggleSupervisor={(id) => toggleSupervisor(id, editSupervisores, setEditSupervisores)}
          onSubmit={handleEditar}
          onClose={() => setEditando(null)}
          loading={loadingEdit}
          submitLabel="Salvar alterações"
        />
      )}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir condomínio?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{confirmDelete.nome}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleExcluir} disabled={excluirMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
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
                <div><p className="font-medium text-gray-900">Cadastrar condomínio</p><p>Clique em "Novo condomínio" e preencha os dados. Vincule o funcionário responsável.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Editar</p><p>Clique no card do condomínio para abrir o formulário de edição.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Bloquear / Desbloquear</p><p>Use o ícone de bloqueio no card para impedir temporariamente o uso do condomínio.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">4</div>
                <div><p className="font-medium text-gray-900">Excluir</p><p>Use o ícone de lixeira para remover permanentemente o condomínio. Apenas administradores podem excluir.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">5</div>
                <div><p className="font-medium text-gray-900">Buscar</p><p>Use o campo de busca para filtrar por nome, endereço, cidade, síndico ou CEP.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrCondominio && (
        <QrCodeModal
          condominio={qrCondominio}
          onClose={() => setQrCondominio(null)}
        />
      )}
    </div>
  )
}

function CondominioModal({
  title, form, setForm, supervisores, supervisoresSelecionados, onToggleSupervisor,
  onSubmit, onClose, loading, submitLabel,
}: Readonly<{
  title: string
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  supervisores: any[]
  supervisoresSelecionados: string[]
  onToggleSupervisor: (id: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  loading: boolean
  submitLabel: string
}>) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="cond-nome" className="label">Nome *</label>
            <input id="cond-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required />
          </div>
          <div>
            <label htmlFor="cond-endereco" className="label">Endereço</label>
            <input id="cond-endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="cond-cep" className="label">CEP</label>
              <input id="cond-cep" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value.replaceAll(/\D/g, '').slice(0, 8) })} className="input" placeholder="00000000" maxLength={8} />
            </div>
            <div>
              <label htmlFor="cond-cidade" className="label">Cidade</label>
              <input id="cond-cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="input" />
            </div>
            <div>
              <label htmlFor="cond-estado" className="label">Estado</label>
              <input id="cond-estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="input" maxLength={2} placeholder="SP" />
            </div>
          </div>
          <div>
            <label htmlFor="cond-sindico-nome" className="label">Nome do síndico</label>
            <input id="cond-sindico-nome" value={form.sindico_nome} onChange={(e) => setForm({ ...form, sindico_nome: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cond-sindico-email" className="label">Email do síndico</label>
              <input id="cond-sindico-email" type="email" value={form.sindico_email} onChange={(e) => setForm({ ...form, sindico_email: e.target.value })} className="input" />
            </div>
            <div>
              <label htmlFor="cond-sindico-tel" className="label">Telefone do síndico</label>
              <input id="cond-sindico-tel" value={form.sindico_telefone} onChange={(e) => setForm({ ...form, sindico_telefone: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="cond-unidades" className="label">Total de unidades</label>
            <input id="cond-unidades" type="number" min="1" value={form.total_unidades} onChange={(e) => setForm({ ...form, total_unidades: e.target.value })} className="input" placeholder="Ex: 50" />
          </div>

          {/* Funcionário responsável por este condomínio */}
          <div>
            <label className="label flex items-center gap-1.5">
              <UserCheck size={14} /> Funcionário responsável por este condomínio
            </label>
            {supervisores.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">Nenhum supervisor cadastrado.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-44 overflow-y-auto">
                {supervisores.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supervisoresSelecionados.includes(s.id)}
                      onChange={() => onToggleSupervisor(s.id)}
                      className="w-4 h-4 accent-brand-navy"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{s.nome}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </div>
                    <span className="sr-only">{s.nome}</span>
                  </label>
                ))}
              </div>
            )}
            {supervisoresSelecionados.length > 0 && (
              <p className="text-xs text-emerald-600 mt-1">
                {supervisoresSelecionados.length} supervisor(es) selecionado(s) — este condomínio aparecerá apenas para eles.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Salvando...' : submitLabel}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QrCodeModal({ condominio, onClose }: Readonly<{ condominio: any; onClose: () => void }>) {
  const [tab, setTab] = useState<'condominio' | 'espacos' | 'vistorias'>('condominio')
  const [espacos, setEspacos] = useState<any[]>([])
  const [visitas, setVisitas] = useState<any[]>([])
  const [novoEspaco, setNovoEspaco] = useState('')
  const [loadingEspacos, setLoadingEspacos] = useState(false)
  const [loadingVisitas, setLoadingVisitas] = useState(false)
  const [qrEspaco, setQrEspaco] = useState<any>(null)

  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
  const portalUrl = `${frontendUrl}/portal/${condominio.qr_token}`

  const carregarEspacos = async () => {
    setLoadingEspacos(true)
    try {
      const data = await api.get(`/condominios/${condominio.id}/espacos`)
      setEspacos(data as any)
    } catch { /* ignore */ }
    setLoadingEspacos(false)
  }

  const carregarVisitas = async () => {
    setLoadingVisitas(true)
    try {
      const data = await api.get(`/condominios/${condominio.id}/visitas-portal`)
      setVisitas(data as any)
    } catch { /* ignore */ }
    setLoadingVisitas(false)
  }

  useEffect(() => {
    carregarEspacos()
    carregarVisitas()
  }, [condominio.id])

  const handleToggleVisita = async (visitaId: string, visivel: boolean) => {
    try {
      await api.patch(`/condominios/${condominio.id}/visitas/${visitaId}/portal`, { visivel })
      setVisitas((prev) => prev.map((v) => v.id === visitaId ? { ...v, visivel_portal: visivel } : v))
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao alterar visibilidade.')) }
  }

  const handleAtribuirEspaco = async (visitaId: string, espacoId: string | null) => {
    try {
      await api.patch(`/condominios/${condominio.id}/visitas/${visitaId}/espaco`, { espaco_id: espacoId })
      setVisitas((prev) => prev.map((v) =>
        v.id === visitaId
          ? { ...v, espaco_id: espacoId, espaco_nome: espacoId ? espacos.find((e) => e.id === espacoId)?.nome : null }
          : v
      ))
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao atribuir espaço.')) }
  }

  const handleCriarEspaco = async () => {
    if (!novoEspaco.trim()) return
    try {
      await api.post(`/condominios/${condominio.id}/espacos`, { nome: novoEspaco.trim() })
      setNovoEspaco('')
      carregarEspacos()
      toast.success('Espaço criado!')
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao criar espaço.')) }
  }

  const handleExcluirEspaco = async (espacoId: string) => {
    try {
      await api.delete(`/condominios/${condominio.id}/espacos/${espacoId}`)
      setEspacos((prev) => prev.filter((e) => e.id !== espacoId))
      toast.success('Espaço removido!')
    } catch (err: any) { toast.error(extrairErro(err, 'Erro ao remover espaço.')) }
  }

  const downloadQr = (svgId: string, filename: string) => {
    const svg = document.getElementById(svgId)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 1024
      canvas.height = 1024
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 1024, 1024)
        ctx.drawImage(img, 0, 0, 1024, 1024)
      }
      const a = document.createElement('a')
      a.download = filename
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const printQr = (svgId: string, title: string, subtitle: string) => {
    const printWin = window.open('', '_blank', 'width=600,height=800')
    if (!printWin) return
    const svg = document.getElementById(svgId)
    const svgHtml = svg ? new XMLSerializer().serializeToString(svg) : ''
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>QR Code - ${title}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; font-family:system-ui,sans-serif; }
        h2 { margin:0 0 8px; font-size:20px; }
        p { margin:0 0 24px; color:#666; font-size:14px; }
        .qr { width:300px; height:300px; }
        .footer { margin-top:24px; font-size:11px; color:#999; }
      </style></head><body>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      <div class="qr">${svgHtml}</div>
      <p style="margin-top:16px;font-size:12px;color:#888;">Escaneie para ver as vistorias</p>
      <div class="footer">X Vistoria — Portal de Transparência</div>
      </body></html>
    `)
    printWin.document.close()
    printWin.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-xl p-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <QrCode size={20} className="text-emerald-600" /> QR Codes — {condominio.nome}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {(['condominio', 'espacos', 'vistorias'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'condominio' ? 'QR Code Geral' : t === 'espacos' ? 'Espaços' : 'Vistorias'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Tab: QR do Condomínio (Elevador) */}
          {tab === 'condominio' && (
            <div>
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500">QR Code geral do condomínio</p>
                <p className="text-xs text-gray-400">Mostra todas as vistorias habilitadas</p>
              </div>
              <div className="flex justify-center mb-4">
                <QRCodeSVG id="qr-condo" value={portalUrl} size={200} level="M" includeMargin />
              </div>
              <div className="bg-gray-50 rounded-lg p-2 mb-4">
                <p className="text-xs text-gray-500 text-center break-all font-mono">{portalUrl}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Link copiado!') }} className="btn-secondary text-xs flex flex-col items-center gap-1 py-2">
                  <Copy size={16} /> Copiar
                </button>
                <button onClick={() => downloadQr('qr-condo', `qrcode-${condominio.nome.replace(/\s+/g, '-').toLowerCase()}.png`)} className="btn-secondary text-xs flex flex-col items-center gap-1 py-2">
                  <Download size={16} /> PNG
                </button>
                <button onClick={() => printQr('qr-condo', condominio.nome, condominio.endereco || '')} className="btn-primary text-xs flex flex-col items-center gap-1 py-2 justify-center">
                  <QrCode size={16} /> Imprimir
                </button>
              </div>
            </div>
          )}

          {/* Tab: Espaços */}
          {tab === 'espacos' && (
            <div className="space-y-4">
              {/* Criar espaço */}
              <div className="flex gap-2">
                <input
                  value={novoEspaco}
                  onChange={(e) => setNovoEspaco(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCriarEspaco()}
                  className="input flex-1"
                  placeholder="Nome do espaço (ex: Salão de Festas)"
                />
                <button onClick={handleCriarEspaco} className="btn-primary whitespace-nowrap">
                  <Plus size={16} /> Criar
                </button>
              </div>

              {loadingEspacos ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
              ) : espacos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <MapPin size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Nenhum espaço criado ainda.</p>
                  <p className="text-xs mt-1">Crie espaços como Salão de Festas, Churrasqueira, Piscina...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {espacos.map((esp: any) => (
                    <div key={esp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{esp.nome}</p>
                        <p className="text-xs text-gray-400">
                          {esp.visitas_visiveis} vistoria(s) visível(is)
                        </p>
                      </div>
                      <button
                        onClick={() => setQrEspaco(esp)}
                        className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600"
                        title="Ver QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={() => handleExcluirEspaco(esp.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-modal QR do espaço */}
              {qrEspaco && (
                <div className="mt-4 p-4 border border-emerald-200 rounded-xl bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-sm text-gray-900">{qrEspaco.nome}</p>
                    <button onClick={() => setQrEspaco(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG id="qr-espaco" value={`${frontendUrl}/portal/espaco/${qrEspaco.qr_token}`} size={180} level="M" includeMargin />
                  </div>
                  <div className="bg-white rounded-lg p-2 mb-3">
                    <p className="text-xs text-gray-500 text-center break-all font-mono">
                      {frontendUrl}/portal/espaco/{qrEspaco.qr_token}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${frontendUrl}/portal/espaco/${qrEspaco.qr_token}`); toast.success('Link copiado!') }}
                      className="btn-secondary text-xs flex flex-col items-center gap-1 py-2"
                    >
                      <Copy size={14} /> Copiar
                    </button>
                    <button
                      onClick={() => downloadQr('qr-espaco', `qrcode-${qrEspaco.nome.replace(/\s+/g, '-').toLowerCase()}.png`)}
                      className="btn-secondary text-xs flex flex-col items-center gap-1 py-2"
                    >
                      <Download size={14} /> PNG
                    </button>
                    <button
                      onClick={() => printQr('qr-espaco', qrEspaco.nome, condominio.nome)}
                      className="btn-primary text-xs flex flex-col items-center gap-1 py-2 justify-center"
                    >
                      <QrCode size={14} /> Imprimir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Vistorias */}
          {tab === 'vistorias' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Ative as vistorias que devem aparecer no portal e escolha em qual espaço exibi-las.
              </p>
              {loadingVisitas ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
              ) : visitas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <ClipboardCheck size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Nenhuma vistoria concluída para este condomínio.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visitas.map((v: any) => (
                    <div key={v.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {/* Toggle on/off */}
                        <button
                          onClick={() => handleToggleVisita(v.id, !v.visivel_portal)}
                          className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                            v.visivel_portal ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                          title={v.visivel_portal ? 'Desabilitar' : 'Habilitar'}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            v.visivel_portal ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {v.titulo || `Vistoria ${v.protocolo}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {v.supervisor_nome} — {v.finalizada_em
                              ? new Date(v.finalizada_em).toLocaleDateString('pt-BR')
                              : new Date(v.criado_em).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {/* Selector de espaço */}
                      {v.visivel_portal && (
                        <div className="mt-2 ml-13">
                          <select
                            value={v.espaco_id || ''}
                            onChange={(e) => handleAtribuirEspaco(v.id, e.target.value || null)}
                            className="input text-xs py-1.5"
                          >
                            <option value="">QR Code Geral</option>
                            {espacos.map((esp: any) => (
                              <option key={esp.id} value={esp.id}>{esp.nome}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
