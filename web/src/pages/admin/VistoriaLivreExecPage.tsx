import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVistoriaLivre, useChecklistLivreItens, useMinhaEmpresa, useCondominios } from '../../api/hooks'
import { api } from '../../api/client'
import VoiceButton from '../../components/VoiceButton'
import {
  Plus, Trash2, Camera, Save, Send, ArrowLeft,
  Loader2, FileText, Share2, CheckCircle,
  X, ImageIcon,
} from 'lucide-react'
import EnderecoCoords from '../../components/EnderecoCoords'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useQueryClient } from '@tanstack/react-query'

interface ItemLocal {
  id?: string
  titulo: string
  descricao: string
  foto_url?: string
  thumbnail_url?: string
  localizacao_lat?: number
  localizacao_lng?: number
  fotoFile?: File
  fotoPreview?: string
  salvando?: boolean
  salvo?: boolean
}

export default function VistoriaLivreExecPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: vistoria, isLoading } = useVistoriaLivre(id!)
  const { data: empresa } = useMinhaEmpresa()
  const { data: checklistItens = [] } = useChecklistLivreItens()
  const { data: condominiosRes } = useCondominios({ limit: 1000 })
  const condominios = condominiosRes?.data || []

  const [itens, setItens] = useState<ItemLocal[]>([])
  const [condominioId, setCondominioId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fotoFullscreen, setFotoFullscreen] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const inicializado = useRef(false)

  // Initialize from API data
  useEffect(() => {
    if (vistoria && !inicializado.current) {
      inicializado.current = true
      setTitulo(vistoria.titulo || '')
      setCondominioId(vistoria.condominio_id)
      if (vistoria.itens?.length > 0) {
        setItens(vistoria.itens.map((i: any) => ({
          id: i.id,
          titulo: i.titulo,
          descricao: i.descricao || '',
          foto_url: i.foto_url,
          thumbnail_url: i.thumbnail_url,
          localizacao_lat: i.localizacao_lat,
          localizacao_lng: i.localizacao_lng,
          salvo: true,
        })))
      } else if (empresa?.checklist_livre_ativo && checklistItens.length > 0) {
        // Pre-populate with checklist items
        setItens(checklistItens.filter((c: any) => c.ativo).map((c: any) => ({
          titulo: c.titulo,
          descricao: '',
        })))
      } else {
        setItens([{ titulo: '', descricao: '' }])
      }
    }
  }, [vistoria, empresa, checklistItens])

  // Get current position
  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }, [])

  // Auto-save a single item
  const salvarItem = useCallback(async (index: number, item: ItemLocal) => {
    if (!id) return
    try {
      setItens(prev => prev.map((it, i) => i === index ? { ...it, salvando: true } : it))

      if (item.id) {
        // Update existing
        await api.patch(`/vistoria-livre/itens/${item.id}`, {
          titulo: item.titulo,
          descricao: item.descricao || null,
          localizacao_lat: item.localizacao_lat,
          localizacao_lng: item.localizacao_lng,
        })
      } else {
        // Create new
        const loc = await getLocation()
        const created = await api.post(`/vistoria-livre/${id}/itens`, {
          titulo: item.titulo || 'Item sem título',
          descricao: item.descricao || null,
          localizacao_lat: loc?.lat,
          localizacao_lng: loc?.lng,
        })
        setItens(prev => prev.map((it, i) => i === index ? {
          ...it,
          id: created.id,
          localizacao_lat: loc?.lat,
          localizacao_lng: loc?.lng,
          salvando: false,
          salvo: true,
        } : it))
        return created.id
      }

      setItens(prev => prev.map((it, i) => i === index ? { ...it, salvando: false, salvo: true } : it))
      return item.id
    } catch (err: any) {
      setItens(prev => prev.map((it, i) => i === index ? { ...it, salvando: false } : it))
      toast.error(extrairErro(err, 'Erro ao salvar item.'))
      return null
    }
  }, [id, getLocation])

  // Upload photo for an item
  const uploadFoto = useCallback(async (index: number, file: File) => {
    const item = itens[index]
    if (!id) return

    // Save item first if not saved
    let itemId = item.id
    if (!itemId) {
      itemId = await salvarItem(index, item) as string | undefined
      if (!itemId) return
    }

    const formData = new FormData()
    formData.append('foto', file)

    try {
      setItens(prev => prev.map((it, i) => i === index ? { ...it, salvando: true } : it))
      const result = await api.post(`/vistoria-livre/${id}/itens/${itemId}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setItens(prev => prev.map((it, i) => i === index ? {
        ...it,
        id: itemId,
        foto_url: result.foto_url,
        thumbnail_url: result.thumbnail_url,
        fotoFile: undefined,
        fotoPreview: undefined,
        salvando: false,
        salvo: true,
      } : it))
      toast.success('Foto salva!')
    } catch (err: any) {
      setItens(prev => prev.map((it, i) => i === index ? { ...it, salvando: false } : it))
      toast.error(extrairErro(err, 'Erro ao enviar foto.'))
    }
  }, [id, itens, salvarItem])

  // Add new item
  const adicionarItem = () => {
    setItens(prev => [...prev, { titulo: '', descricao: '' }])
  }

  // Remove item
  const removerItem = async (index: number) => {
    const item = itens[index]
    if (item.id) {
      try {
        await api.delete(`/vistoria-livre/itens/${item.id}`)
      } catch (err: any) {
        toast.error(extrairErro(err, 'Erro ao remover item.'))
        return
      }
    }
    setItens(prev => prev.filter((_, i) => i !== index))
    toast.success('Item removido')
  }

  // Save all pending items
  const salvarTudo = async () => {
    setSalvando(true)
    try {
      // Update header
      await api.patch(`/vistoria-livre/${id}`, { titulo: titulo || null, condominio_id: condominioId })

      // Save each unsaved item
      for (let i = 0; i < itens.length; i++) {
        if (!itens[i].salvo && itens[i].titulo) {
          await salvarItem(i, itens[i])
        }
      }
      queryClient.invalidateQueries({ queryKey: ['vistoria-livre', id] })
      toast.success('Salvo com sucesso!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao salvar.'))
    } finally {
      setSalvando(false)
    }
  }

  // Finalize and send
  const finalizarEnviar = async () => {
    setEnviando(true)
    try {
      // Save all pending first
      await salvarTudo()
      // Finalize
      await api.patch(`/vistoria-livre/${id}/finalizar`)
      // Send
      await api.patch(`/vistoria-livre/${id}/enviar`)
      queryClient.invalidateQueries({ queryKey: ['vistorias-livres'] })
      queryClient.invalidateQueries({ queryKey: ['vistoria-livre', id] })
      toast.success('Vistoria livre enviada com sucesso!')
      navigate('/vistoria-livre')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao finalizar.'))
    } finally {
      setEnviando(false)
    }
  }

  // Share
  const compartilhar = async () => {
    const pdfUrl = `${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/vistoria-livre/${id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vistoria Livre', text: titulo || 'Vistoria Livre', url: pdfUrl })
      } else {
        await navigator.clipboard.writeText(pdfUrl)
        toast.success('Link copiado para a área de transferência!')
      }
    } catch { /* cancelled */ }
  }

  // PDF
  const baixarPdf = async () => {
    try {
      const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/pdf/vistoria-livre/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erro')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vistoria-livre-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao gerar PDF.'))
    }
  }

  // Handle file selection
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setItens(prev => prev.map((it, i) => i === index ? { ...it, fotoFile: file, fotoPreview: preview } : it))
    uploadFoto(index, file)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    )
  }

  const isRascunho = !vistoria || vistoria.status === 'rascunho'
  const isConcluida = vistoria?.status === 'concluida' || vistoria?.status === 'enviada'

  const updateItemField = (index: number, field: string, value: string) => {
    setItens(prev => prev.map((it, i) => i === index ? { ...it, [field]: value, salvo: false } : it))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/vistoria-livre')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {isConcluida ? 'Vistoria Livre' : 'Vistoria Livre em Andamento'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {vistoria ? dayjs(vistoria.criado_em).format('DD/MM/YYYY HH:mm') : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isConcluida && (
            <button
              onClick={salvarTudo}
              disabled={salvando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar
            </button>
          )}
          <button
            onClick={baixarPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={compartilhar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-sm font-medium text-green-600 hover:bg-green-100"
          >
            <Share2 size={16} />
            Compartilhar
          </button>
        </div>
      </div>

      {/* Condominium selector + Title */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="vl-condominio" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Condomínio</label>
            <select
              id="vl-condominio"
              value={condominioId}
              onChange={(e) => setCondominioId(e.target.value)}
              disabled={isConcluida}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 disabled:opacity-60"
            >
              <option value="">Selecione...</option>
              {condominios.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vl-titulo" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Título</label>
            <input
              id="vl-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={isConcluida}
              placeholder="Ex: Vistoria geral, Área externa..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {itens.map((item, index) => (
          <div
            key={item.id || `new-${index}`}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
          >
            {/* Item header */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                Item {index + 1}
                {item.salvo && <CheckCircle size={14} className="text-green-500" />}
                {item.salvando && <Loader2 size={14} className="animate-spin text-gray-400" />}
              </span>
              {!isConcluida && itens.length > 1 && (
                <button
                  onClick={() => removerItem(index)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label htmlFor={`item-titulo-${index}`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Título *</label>
              <input
                id={`item-titulo-${index}`}
                type="text"
                value={item.titulo}
                onChange={(e) => updateItemField(index, 'titulo', e.target.value)}
                disabled={isConcluida}
                placeholder="O que foi inspecionado?"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 disabled:opacity-60"
              />
            </div>

            {/* Description with voice */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={`item-descricao-${index}`} className="text-xs font-semibold text-gray-500 dark:text-gray-400">Descrição</label>
                {!isConcluida && (
                  <VoiceButton
                    onTranscription={(text) => updateItemField(index, 'descricao', text)}
                    append
                    currentValue={item.descricao}
                    className="!p-1.5"
                  />
                )}
              </div>
              <textarea
                id={`item-descricao-${index}`}
                value={item.descricao}
                onChange={(e) => updateItemField(index, 'descricao', e.target.value)}
                disabled={isConcluida}
                placeholder="Descreva o que foi observado... (ou use o microfone)"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-gray-200 resize-none disabled:opacity-60"
              />
            </div>

            {/* Photo */}
            <div>
              {(item.foto_url || item.fotoPreview) && (
                <div className="relative group">
                  <button type="button" className="p-0 border-0 bg-transparent w-full" onClick={() => setFotoFullscreen(item.foto_url || item.fotoPreview || null)}>
                    <img
                      src={item.fotoPreview || item.thumbnail_url || item.foto_url}
                      alt={item.titulo}
                      className="w-full max-h-[400px] object-contain rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    />
                  </button>
                  {!isConcluida && (
                    <button
                      onClick={() => fileInputRefs.current[index]?.click()}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80"
                    >
                      <Camera size={14} />
                      Trocar
                    </button>
                  )}
                </div>
              )}
              {!(item.foto_url || item.fotoPreview) && isConcluida && (
                  <div className="w-full py-6 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-400 flex flex-col items-center gap-1">
                    <ImageIcon size={24} />
                    <span className="text-xs">Sem foto</span>
                  </div>
              )}
              {!(item.foto_url || item.fotoPreview) && !isConcluida && (
                  <button
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="w-full py-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-all flex flex-col items-center gap-1"
                  >
                    <Camera size={24} />
                    <span className="text-xs font-medium">Adicionar foto</span>
                  </button>
              )}
              <input
                ref={(el) => { fileInputRefs.current[index] = el }}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(index, e)}
                className="hidden"
              />
            </div>

            {/* Location */}
            {item.localizacao_lat && item.localizacao_lng && (
              <EnderecoCoords lat={item.localizacao_lat} lng={item.localizacao_lng} />
            )}
          </div>
        ))}
      </div>

      {/* Add item button */}
      {!isConcluida && (
        <button
          onClick={adicionarItem}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={18} />
          Adicionar outro item
        </button>
      )}

      {/* Finalize / Send */}
      {isRascunho && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={finalizarEnviar}
            disabled={enviando || itens.filter(i => i.titulo).length === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Finalizar e Enviar Vistoria
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Ao enviar, a vistoria será finalizada e ficará disponível para consulta
          </p>
        </div>
      )}

      {/* Fullscreen photo modal */}
      {fotoFullscreen && (
        <dialog
          open
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 w-full h-full border-0 m-0 max-w-none max-h-none"
        >
          <button className="absolute inset-0 bg-transparent border-0 cursor-default" onClick={() => setFotoFullscreen(null)} aria-label="Fechar" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setFotoFullscreen(null)}>
            <X size={28} />
          </button>
          <img src={fotoFullscreen} alt="Foto" className="max-w-full max-h-full object-contain rounded-lg relative z-10" />
        </dialog>
      )}
    </div>
  )
}
