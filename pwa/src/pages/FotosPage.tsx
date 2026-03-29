import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFotos, useUploadFoto, useExcluirFoto } from '../api/hooks'
import { api } from '../api/client'
import { extrairErro } from '../api/erros'
import { ArrowLeft, Camera, X, Trash2, Image } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FotosPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const visitaId = id ?? ''
  const { data: fotos = [], isLoading: loading } = useFotos(visitaId)
  const uploadMut = useUploadFoto(visitaId)
  const excluirMut = useExcluirFoto(visitaId)
  const [ampliada, setAmpliada] = useState<string | null>(null)

  if (!id) return null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('visita_id', id)
        await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      toast.success(`${files.length} foto(s) enviada(s)`)
      uploadMut.reset()
      // refetch happens via invalidateQueries in hook
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao enviar foto.'))
    } finally {
      e.target.value = ''
    }
  }

  const handleExcluir = async (fotoId: string) => {
    try {
      await excluirMut.mutateAsync(fotoId)
      toast.success('Foto excluída')
      setAmpliada(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir foto.'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-navy text-white px-4 pt-12 pb-4 safe-top">
        <button onClick={() => navigate(`/visita/${id}`)} className="flex items-center gap-1 text-white/60 mb-3 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">Fotos da vistoria</div>
          <label className={`btn-primary text-xs px-3 py-2 cursor-pointer ${uploadMut.isPending ? 'opacity-50' : ''}`}>
            <Camera size={16} /> {uploadMut.isPending ? 'Enviando...' : 'Tirar foto'}
            <input type="file" accept="image/*" capture="environment" multiple onChange={handleUpload} className="hidden" disabled={uploadMut.isPending} />
          </label>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {loading && (
          <div className="grid grid-cols-3 gap-2 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-200 rounded-lg aspect-square" />)}
          </div>
        )}
        {!loading && (!Array.isArray(fotos) || fotos.length === 0) && (
          <div className="card p-10 text-center">
            <Image size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhuma foto registrada</p>
            <label className="btn-primary mt-4 inline-flex cursor-pointer">
              <Camera size={16} /> Adicionar foto
              <input type="file" accept="image/*" capture="environment" multiple onChange={handleUpload} className="hidden" />
            </label>
          </div>
        )}
        {!loading && Array.isArray(fotos) && fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f: any) => (
              <button
                key={f.id}
                onClick={() => setAmpliada(f.id)}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={f.thumbnail_url || f.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal foto ampliada */}
      {ampliada && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex justify-between items-center px-4 pt-12 pb-3 safe-top">
            <button onClick={() => setAmpliada(null)} className="text-white/70 p-2">
              <X size={24} />
            </button>
            <button onClick={() => handleExcluir(ampliada)} className="text-red-400 p-2">
              <Trash2 size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img
              src={Array.isArray(fotos) ? fotos.find((f: any) => f.id === ampliada)?.url : undefined}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
