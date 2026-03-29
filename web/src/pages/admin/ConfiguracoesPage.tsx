import { useState, useEffect, useRef, useCallback } from 'react'
import { useMinhaEmpresa } from '../../api/hooks'
import { api } from '../../api/client'
import { Settings, CheckCircle, List, Zap, Loader2, PenTool, Save, Trash2, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import { useQueryClient } from '@tanstack/react-query'

const layouts = [
  {
    id: 'quiz',
    nome: 'Quiz (uma por vez)',
    descricao: 'Exibe uma pergunta por vez em tela cheia com botões grandes. Ideal para vistorias rápidas no celular.',
    icone: Zap,
    preview: [
      'Uma pergunta por tela',
      'Botões SIM / NÃO em destaque',
      'Navegação por swipe ou botão',
      'Progresso no topo',
      'Ditado por voz integrado',
    ],
  },
  {
    id: 'lista',
    nome: 'Lista completa',
    descricao: 'Mostra todas as perguntas agrupadas por categoria em uma página rolável. Ideal para vistorias detalhadas.',
    icone: List,
    preview: [
      'Todas as perguntas visíveis',
      'Agrupadas por categoria',
      'Barra de progresso geral',
      'Informações gerais no topo',
      'Conforme / Não conforme / N/A por item',
    ],
  },
]

export default function ConfiguracoesPage() {
  const { data: empresa, isLoading } = useMinhaEmpresa()
  const [layoutSelecionado, setLayoutSelecionado] = useState('quiz')
  const [salvando, setSalvando] = useState(false)
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false)
  const [adminNome, setAdminNome] = useState('')
  const [adminCargo, setAdminCargo] = useState('')
  const [adminDocumento, setAdminDocumento] = useState('')
  const [adminImg, setAdminImg] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDrawingRef = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (empresa?.layout_questionario) {
      setLayoutSelecionado(empresa.layout_questionario)
    }
    if (empresa) {
      setAdminNome(empresa.assinatura_admin_nome || '')
      setAdminCargo(empresa.assinatura_admin_cargo || '')
      setAdminDocumento(empresa.assinatura_admin_documento || '')
      setAdminImg(empresa.assinatura_admin_img || '')
    }
  }, [empresa])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1E3A5F'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    initCanvas()
    if (adminImg && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = () => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
        ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height)
      }
      img.src = adminImg
    }
  }, [initCanvas, adminImg])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    const mouse = e as React.MouseEvent
    return { x: (mouse.clientX - rect.left) * scaleX, y: (mouse.clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDrawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDraw = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    setAdminImg('')
    initCanvas()
  }

  const saveCanvasToState = () => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result as string
      setAdminImg(data)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDownload = () => {
    const dataUrl = adminImg || saveCanvasToState()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = 'assinatura-admin.png'
    link.href = dataUrl
    link.click()
  }

  const salvar = async (layoutId: string) => {
    setLayoutSelecionado(layoutId)
    setSalvando(true)
    try {
      await api.patch('/empresas/minha/configuracoes', { layout_questionario: layoutId })
      queryClient.invalidateQueries({ queryKey: ['minha-empresa'] })
      toast.success('Layout alterado com sucesso!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao salvar configuração.'))
    } finally {
      setSalvando(false)
    }
  }

  const salvarAssinatura = async () => {
    setSalvandoAssinatura(true)
    try {
      const imgData = adminImg || saveCanvasToState()
      await api.patch('/empresas/minha/configuracoes', {
        assinatura_admin_nome: adminNome || undefined,
        assinatura_admin_cargo: adminCargo || undefined,
        assinatura_admin_documento: adminDocumento || undefined,
        assinatura_admin_img: imgData || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['minha-empresa'] })
      toast.success('Assinatura salva com sucesso!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao salvar assinatura.'))
    } finally {
      setSalvandoAssinatura(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-navy" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-navy/10 rounded-xl flex items-center justify-center">
          <Settings size={22} className="text-brand-navy" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize a experiência do vistoriador</p>
        </div>
      </div>

      {/* Layout selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Layout do questionário</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Escolha como o vistoriador verá as perguntas ao responder o checklist
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {layouts.map((layout) => {
            const isSelected = layoutSelecionado === layout.id
            const Icon = layout.icone
            return (
              <button
                key={layout.id}
                onClick={() => salvar(layout.id)}
                disabled={salvando}
                className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-brand-navy bg-brand-navy/5 dark:bg-brand-navy/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                }`}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle size={22} className="text-brand-navy" />
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-brand-navy text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isSelected ? 'text-brand-navy' : 'text-gray-900 dark:text-white'}`}>
                      {layout.nome}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{layout.descricao}</p>

                {/* Feature list */}
                <ul className="space-y-1.5">
                  {layout.preview.map((item, i) => (
                    <li key={`${layout.id}-${i}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-brand-navy' : 'bg-gray-300 dark:bg-gray-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {salvando && (
          <div className="flex items-center gap-2 mt-4 text-sm text-brand-navy">
            <Loader2 size={16} className="animate-spin" />
            Salvando...
          </div>
        )}
      </div>

      {/* Assinatura Digital do Administrador */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-brand-navy/10 rounded-lg flex items-center justify-center">
            <PenTool size={18} className="text-brand-navy" />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Assinatura Digital — Administrador</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-11">
          Dados que aparecerão na assinatura do administrador nos relatórios PDF
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={adminNome}
              onChange={(e) => setAdminNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Cargo
            </label>
            <input
              type="text"
              value={adminCargo}
              onChange={(e) => setAdminCargo(e.target.value)}
              placeholder="Ex: Diretor Técnico"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Documento (CNPJ/CPF)
            </label>
            <input
              type="text"
              value={adminDocumento}
              onChange={(e) => setAdminDocumento(e.target.value)}
              placeholder="Ex: CPF 000.000.000-00"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
            />
          </div>
        </div>

        {/* Signature canvas */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Assinatura (desenhe ou carregue uma imagem)
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={500}
              height={160}
              className="w-full cursor-crosshair"
              style={{ height: 160 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              <Trash2 size={14} /> Limpar
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-navy bg-brand-navy/10 rounded-lg hover:bg-brand-navy/20 transition"
            >
              <Upload size={14} /> Carregar imagem
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-navy bg-brand-navy/10 rounded-lg hover:bg-brand-navy/20 transition"
            >
              <Download size={14} /> Download
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Preview */}
        {adminNome && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Pré-visualização no PDF</div>
            <div className="text-center py-3 border border-dashed border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Assinatura Digital — Administrador</div>
              {(adminImg || canvasRef.current) && (
                <img src={adminImg || saveCanvasToState()} alt="Assinatura" className="mx-auto max-w-[180px] max-h-[60px] mb-1" />
              )}
              <div className="text-sm font-bold text-[#1E3A5F]">{adminNome}</div>
              {adminCargo && <div className="text-xs text-gray-500">{adminCargo}</div>}
              {adminDocumento && <div className="text-[11px] text-gray-400">CNPJ/CPF: {adminDocumento}</div>}
              <div className="inline-block mt-2 px-2 py-0.5 bg-[#1E3A5F] text-white rounded text-[10px] font-semibold">✓ ASSINADO DIGITALMENTE</div>
            </div>
          </div>
        )}

        <button
          onClick={salvarAssinatura}
          disabled={salvandoAssinatura}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white rounded-lg text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-60 transition"
        >
          {salvandoAssinatura ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar assinatura
        </button>
      </div>
    </div>
  )
}
