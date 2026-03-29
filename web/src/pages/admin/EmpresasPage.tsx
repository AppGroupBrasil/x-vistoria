import { useState } from 'react'
import { useEmpresas } from '../../api/hooks'
import { api } from '../../api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Building, Pencil, Lock, Unlock, Trash2, X, Search, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'

const emptyForm = { nome: '', cnpj: '', email: '', telefone: '', plano: 'basico' }

export default function EmpresasPage() {
  const { data: empresas = [], isLoading } = useEmpresas()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const [editando, setEditando] = useState<Record<string, any> | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<Record<string, any> | null>(null)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const [showHelp, setShowHelp] = useState(false)

  const filtered = (empresas as any[]).filter(
    (e) =>
      e.nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj?.includes(search) ||
      e.email?.toLowerCase().includes(search.toLowerCase())
  )

  const maskCnpj = (v: string) => {
    const nums = v.replaceAll(/\D/g, '').slice(0, 14)
    let m = nums
    if (nums.length > 2) m = `${nums.slice(0, 2)}.${nums.slice(2)}`
    if (nums.length > 5) m = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`
    if (nums.length > 8) m = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`
    if (nums.length > 12) m = `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`
    return m
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/empresas', form)
      toast.success('Empresa cadastrada!')
      qc.invalidateQueries({ queryKey: ['empresas'] })
      setShowModal(false)
      setForm(emptyForm)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao cadastrar empresa.'))
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicao = (emp: any) => {
    setEditando(emp)
    setEditForm({
      nome: emp.nome || '', cnpj: emp.cnpj || '', email: emp.email || '',
      telefone: emp.telefone || '', plano: emp.plano || 'basico',
    })
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEdit(true)
    try {
      await api.patch(`/empresas/${editando!.id}`, editForm)
      toast.success('Empresa atualizada!')
      qc.invalidateQueries({ queryKey: ['empresas'] })
      setEditando(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao atualizar.'))
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleToggleAtivo = async (emp: any) => {
    try {
      await api.patch(`/empresas/${emp.id}/${emp.ativo ? 'bloquear' : 'desbloquear'}`)
      toast.success(emp.ativo ? 'Empresa bloqueada!' : 'Empresa desbloqueada!')
      qc.invalidateQueries({ queryKey: ['empresas'] })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao alterar status.'))
    }
  }

  const handleExcluir = async () => {
    setLoadingDelete(true)
    try {
      await api.delete(`/empresas/${confirmDelete!.id}`)
      toast.success('Empresa excluída!')
      qc.invalidateQueries({ queryKey: ['empresas'] })
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    } finally {
      setLoadingDelete(false)
    }
  }

  const renderForm = (f: typeof emptyForm, setF: (v: typeof emptyForm) => void) => (
    <>
      <div>
        <label className="label" htmlFor="form-nome">Nome da empresa *</label>
        <input id="form-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="form-cnpj">CNPJ</label>
        <input id="form-cnpj" value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: maskCnpj(e.target.value) })} className="input" placeholder="00.000.000/0000-00" />
      </div>
      <div>
        <label className="label" htmlFor="form-email">Email *</label>
        <input id="form-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="form-telefone">Telefone</label>
        <input id="form-telefone" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="form-plano">Plano</label>
        <select id="form-plano" value={f.plano} onChange={(e) => setF({ ...f, plano: e.target.value })} className="input">
          <option value="basico">Básico</option>
          <option value="profissional">Profissional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500">{empresas.length} empresas cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(true)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title="Ajuda">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Nova empresa
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, CNPJ ou email..." className="input pl-9" />
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Empresa</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">CNPJ</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${emp.ativo ? 'bg-brand-light text-brand-navy' : 'bg-gray-100 text-gray-400'}`}>
                      <Building size={14} />
                    </div>
                    <span className={`font-medium ${emp.ativo ? 'text-gray-900' : 'text-gray-400'}`}>{emp.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{emp.cnpj || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 capitalize">{emp.plano}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${emp.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {emp.ativo ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEdicao(emp)} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded hover:bg-emerald-50" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleToggleAtivo(emp)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded hover:bg-yellow-50" title={emp.ativo ? 'Bloquear' : 'Desbloquear'}>
                      {emp.ativo ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button onClick={() => setConfirmDelete(emp)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <Building size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma empresa encontrada</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal criar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nova Empresa</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleCriar} className="space-y-3">
              {renderForm(form, setForm)}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Cadastrar'}</button>
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
              <h2 className="text-lg font-bold">Editar Empresa</h2>
              <button onClick={() => setEditando(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditar} className="space-y-3">
              {renderForm(editForm, setEditForm)}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="btn-outline flex-1">Cancelar</button>
                <button type="submit" disabled={loadingEdit} className="btn-primary flex-1">{loadingEdit ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal excluir */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-500" />
            <h3 className="font-bold text-lg mb-2">Excluir empresa?</h3>
            <p className="text-sm text-gray-500 mb-4">"{confirmDelete.nome}" e todos os dados associados serão removidos permanentemente.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn-outline flex-1">Cancelar</button>
              <button onClick={handleExcluir} disabled={loadingDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex-1 hover:bg-red-700">
                {loadingDelete ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Como funciona — Empresas</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[
                { step: 1, title: 'Cadastre a empresa', desc: 'Preencha nome, CNPJ, email e selecione o plano.' },
                { step: 2, title: 'Associe condomínios', desc: 'Cada condomínio será vinculado a uma empresa.' },
                { step: 3, title: 'Cadastre funcionários', desc: 'Crie usuários com perfil "Funcionário" para a empresa.' },
                { step: 4, title: 'Gerencie tudo no dashboard', desc: 'Acompanhe vistorias, pendências e relatórios da empresa.' },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{s.title}</h4>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHelp(false)} className="btn-primary w-full mt-4">Entendi</button>
          </div>
        </div>
      )}
    </div>
  )
}
