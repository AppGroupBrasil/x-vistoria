import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsuarios } from '../../api/hooks'
import { api } from '../../api/client'
import { useAuth } from '../../store/auth'
import { useSetupProgress } from '../../api/useSetupProgress'
import SetupBanner from '../../components/SetupBanner'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Lock, Unlock, Trash2, X, Search, HelpCircle, ShieldCheck, ShieldX } from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import dayjs from 'dayjs'

const ROLE_LABEL: Record<string, string> = {
  master: 'Master', admin: 'Administrador', supervisor: 'Funcionário', sindico: 'Síndico'
}
const ROLE_BADGE: Record<string, string> = {
  master: 'bg-purple-100 text-purple-700',
  admin: 'bg-emerald-100 text-emerald-700',
  supervisor: 'bg-green-100 text-green-700',
  sindico: 'bg-orange-100 text-orange-700',
}

const emptyForm = { nome: '', email: '', senha: '', role: 'supervisor', telefone: '' }

export default function UsuariosPage() {
  const { data: usuariosRes, isLoading } = useUsuarios()
  const usuarios = usuariosRes?.data || []
  const { user: meuUsuario } = useAuth()
  const isAdmin = meuUsuario?.role === 'admin' || meuUsuario?.role === 'master'
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { allDone } = useSetupProgress()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  // Auto-open modal during setup
  useEffect(() => {
    if (!allDone && !isLoading && usuarios.filter((u: any) => u.role === 'supervisor').length === 0) {
      setShowModal(true)
    }
  }, [allDone, isLoading])

  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState({ nome: '', telefone: '', role: '', senha: '' })
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroRole, setFiltroRole] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/usuarios', form)
      toast.success('Usuário criado!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
      setForm(emptyForm)
      if (!allDone) navigate('/categorias')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar usuário.'))
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicao = (u: any) => {
    setEditando(u)
    setEditForm({ nome: u.nome, telefone: u.telefone || '', role: u.role, senha: '' })
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEdit(true)
    try {
      const payload: any = { nome: editForm.nome, telefone: editForm.telefone, role: editForm.role }
      if (editForm.senha) payload.senha = editForm.senha
      await api.patch(`/usuarios/${editando.id}`, payload)
      toast.success('Usuário atualizado!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setEditando(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar usuário.'))
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleToggleAtivo = async (u: any) => {
    try {
      await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo })
      toast.success(u.ativo ? 'Usuário bloqueado!' : 'Usuário desbloqueado!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao alterar status.'))
    }
  }

  const handleExcluir = async () => {
    setLoadingDelete(true)
    try {
      await api.delete(`/usuarios/${confirmDelete.id}`)
      toast.success('Usuário excluído!')
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir usuário.'))
    } finally {
      setLoadingDelete(false)
    }
  }

  const maskTelefone = (value: string) => {
    const nums = value.replaceAll(/\D/g, '').slice(0, 11)
    let mask = nums
    if (nums.length >= 2) mask = `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    if (nums.length >= 7) mask = `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
    return mask
  }

  const handleTogglePermissao = async (u: any, campo: 'pode_editar' | 'pode_excluir') => {
    try {
      await api.patch(`/usuarios/${u.id}`, { [campo]: !u[campo] })
      toast.success(`Permissão atualizada!`)
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar permissão.'))
    }
  }

  const usuariosFiltrados = usuarios.filter((u: any) => {
    if (filtroRole && u.role !== filtroRole) return false
    if (!busca) return true
    const q = busca.toLowerCase()
    return u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.telefone?.includes(q)
  })

  return (
    <div className="space-y-4">
      <SetupBanner currentKey="usuarios" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500">{usuariosRes?.total || usuarios.length} usuários</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-brand-navy rounded-lg hover:bg-gray-100" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </div>

      {/* Busca e filtro */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input pl-9" placeholder="Buscar por nome, email ou telefone..." />
        </div>
        <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)} className="input w-auto">
          <option value="">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="supervisor">Supervisor</option>
          <option value="sindico">Síndico</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Perfil</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Permissões</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Último acesso</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuariosFiltrados.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.ativo ? 'bg-brand-light text-brand-navy' : 'bg-gray-100 text-gray-400'}`}>
                      {u.nome?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className={`font-medium ${u.ativo ? 'text-gray-900' : 'text-gray-400'}`}>{u.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || 'bg-gray-100'}`}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.role === 'supervisor' && isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePermissao(u, 'pode_editar')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${u.pode_editar ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        title={u.pode_editar ? 'Pode editar — clique para revogar' : 'Não pode editar — clique para autorizar'}
                      >
                        {u.pode_editar ? <ShieldCheck size={12} /> : <ShieldX size={12} />} Editar
                      </button>
                      <button
                        onClick={() => handleTogglePermissao(u, 'pode_excluir')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${u.pode_excluir ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        title={u.pode_excluir ? 'Pode excluir — clique para revogar' : 'Não pode excluir — clique para autorizar'}
                      >
                        {u.pode_excluir ? <ShieldCheck size={12} /> : <ShieldX size={12} />} Excluir
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.ultimo_login ? dayjs(u.ultimo_login).format('DD/MM/YYYY HH:mm') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => abrirEdicao(u)}
                      title="Editar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        title={u.ativo ? 'Bloquear' : 'Desbloquear'}
                        className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' : 'text-yellow-500 hover:text-green-600 hover:bg-green-50'}`}
                      >
                        {u.ativo ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDelete(u)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Novo Usuário</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCriar} className="space-y-3">
              <div>
                <label htmlFor="u-nome" className="label">Nome completo *</label>
                <input id="u-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" required />
              </div>
              <div>
                <label htmlFor="u-email" className="label">Email *</label>
                <input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" required />
              </div>
              <div>
                <label htmlFor="u-senha" className="label">Senha *</label>
                <input id="u-senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="input" required minLength={6} />
              </div>
              <div>
                <label htmlFor="u-role" className="label">Perfil *</label>
                <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  <option value="supervisor">Funcionário</option>
                  <option value="admin">Administrador</option>
                  <option value="sindico">Síndico</option>
                </select>
              </div>
              <div>
                <label htmlFor="u-tel" className="label">Telefone</label>
                <input id="u-tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} className="input" placeholder="(00) 00000-0000" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Criando...' : 'Criar usuário'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Editar Usuário</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditar} className="space-y-3">
              <div>
                <label htmlFor="ue-nome" className="label">Nome completo *</label>
                <input id="ue-nome" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className="input" required />
              </div>
              <div>
                <label htmlFor="ue-email" className="label">Email</label>
                <input id="ue-email" value={editando.email} className="input bg-gray-50 text-gray-400 cursor-not-allowed" disabled />
              </div>
              <div>
                <label htmlFor="ue-role" className="label">Perfil *</label>
                <select id="ue-role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="input">
                  <option value="supervisor">Funcionário</option>
                  <option value="admin">Administrador</option>
                  <option value="sindico">Síndico</option>
                </select>
              </div>
              <div>
                <label htmlFor="ue-tel" className="label">Telefone</label>
                <input id="ue-tel" value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: maskTelefone(e.target.value) })} className="input" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label htmlFor="ue-senha" className="label">Nova senha <span className="text-gray-400 font-normal">(deixe em branco para manter)</span></label>
                <input id="ue-senha" type="password" value={editForm.senha} onChange={(e) => setEditForm({ ...editForm, senha: e.target.value })} className="input" minLength={6} placeholder="••••••" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loadingEdit} className="btn-primary flex-1 justify-center">
                  {loadingEdit ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Excluir usuário?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-semibold">{confirmDelete.nome}</span> será removido permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={loadingDelete} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center gap-2">
                {loadingDelete ? 'Excluindo...' : 'Sim, excluir'}
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
                <div><p className="font-medium text-gray-900">Criar usuário</p><p>Clique em "Novo usuário" e defina nome, email, senha e perfil.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">2</div>
                <div><p className="font-medium text-gray-900">Perfis</p><p><strong>Admin:</strong> acesso total. <strong>Funcionário:</strong> faz vistorias. <strong>Síndico:</strong> acompanha o condomínio.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">3</div>
                <div><p className="font-medium text-gray-900">Permissões de funcionário</p><p>Use os botões <strong>Editar</strong> e <strong>Excluir</strong> na coluna Permissões para autorizar funcionários a editar ou excluir registros.</p></div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">4</div>
                <div><p className="font-medium text-gray-900">Bloquear / Excluir</p><p>Bloqueie temporariamente ou exclua permanentemente usuários usando os ícones de ação.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
