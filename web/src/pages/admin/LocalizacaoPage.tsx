import { useEffect, useRef, useState } from 'react'
import { useLocalizacoes, useVisitasMapa, useQrPontos, useCriarQrPonto, useExcluirQrPonto, useQrRegistros, useCondominios } from '../../api/hooks'
import { MapPin, RefreshCw, Clock, QrCode, Plus, Trash2, X, Download, ClipboardList, Filter, FileText, Eye, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../../api/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'

dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const VISTORIA_COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#D946EF', '#0EA5E9', '#84CC16']
const STATUS_LABEL: Record<string, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  aprovada: 'Aprovada',
}
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin

export default function LocalizacaoPage() {
  const [tab, setTab] = useState<'mapa' | 'qrcode' | 'registros'>('mapa')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button onClick={() => setTab('mapa')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'mapa' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <MapPin size={16} className="inline mr-1" /> Mapa ao Vivo
        </button>
        <button onClick={() => setTab('qrcode')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'qrcode' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <QrCode size={16} className="inline mr-1" /> QR Code Ponto
        </button>
        <button onClick={() => setTab('registros')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'registros' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <ClipboardList size={16} className="inline mr-1" /> Registros
        </button>
      </div>

      {tab === 'mapa' && <MapaTab />}
      {tab === 'qrcode' && <QrCodeTab />}
      {tab === 'registros' && <RegistrosTab />}
    </div>
  )
}

// ===================== MAPA TAB =====================
function MapaTab() {
  const { data: localizacoes = [], refetch, isLoading } = useLocalizacoes()
  const { data: vistorias = [] } = useVisitasMapa()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [sideTab, setSideTab] = useState<'func' | 'vist'>('func')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setMapReady(true); return }
    const css = document.createElement('link')
    css.id = 'leaflet-css'; css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    const L = (globalThis as any).L
    if (!L) return
    const map = L.map(mapRef.current).setView([-23.55, -46.63], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    mapInstanceRef.current = map
  }, [mapReady])

  // Render markers for both employees (green) and vistorias (colored)
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = (globalThis as any).L
    const map = mapInstanceRef.current
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []
    const bounds: any[] = []

    // Employee markers — always GREEN
    localizacoes.forEach((loc: any) => {
      if (!loc.lat || !loc.lng) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#00D68F;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px">${loc.supervisor_nome?.charAt(0)?.toUpperCase() || '?'}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      })
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
        .bindPopup(`<div style="min-width:180px"><strong>${loc.supervisor_nome}</strong><br/><span style="color:#666;font-size:12px">${loc.condominio_nome}</span><br/><span style="color:#999;font-size:11px">${dayjs(loc.momento).fromNow()}</span></div>`)
        .on('click', () => setSelected(loc))
      markersRef.current.push(marker)
      bounds.push([loc.lat, loc.lng])
    })

    // Vistoria markers — each a different color
    ;(vistorias as any[]).forEach((v: any, idx: number) => {
      if (!v.lat || !v.lng) return
      const color = VISTORIA_COLORS[idx % VISTORIA_COLORS.length]
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};width:32px;height:32px;border-radius:6px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:16px">📋</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      })
      const dataStr = v.iniciada_em ? dayjs(v.iniciada_em).format('DD/MM/YYYY [às] HH:mm') : dayjs(v.criado_em).format('DD/MM/YYYY [às] HH:mm')
      const statusLabel = STATUS_LABEL[v.status] || v.status
      const marker = L.marker([v.lat, v.lng], { icon }).addTo(map)
        .bindPopup(`<div style="min-width:200px"><strong>${v.titulo || 'Vistoria'}</strong><br/><span style="color:#666;font-size:12px">👤 ${v.funcionario_nome}</span><br/><span style="color:#666;font-size:12px">🏢 ${v.condominio_nome}</span><br/><span style="color:#666;font-size:12px">📅 ${dataStr}</span><br/><span style="color:#888;font-size:11px">Status: ${statusLabel}</span><br/><a href="/visitas/${v.id}" style="color:#3B82F6;font-size:12px;text-decoration:underline;" target="_self">Abrir vistoria →</a></div>`)
      markersRef.current.push(marker)
      bounds.push([v.lat, v.lng])
    })

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [localizacoes, vistorias, mapReady])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Localização dos Funcionários</h1>
          <p className="text-sm text-gray-500 mt-1">Funcionários em verde • Vistorias em cores no mapa</p>
        </div>
        <button onClick={() => refetch()} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
      <div className="flex gap-4 h-[calc(100vh-14rem)]">
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
          <div ref={mapRef} className="w-full h-full" />
        </div>
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Side tabs */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setSideTab('func')} className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${sideTab === 'func' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00D68F] mr-1.5" /> Funcionários ({localizacoes.length})
            </button>
            <button onClick={() => setSideTab('vist')} className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${sideTab === 'vist' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className="inline-block w-2.5 h-2.5 rounded bg-blue-500 mr-1.5" /> Vistorias ({(vistorias as any[]).length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Funcionários list */}
            {sideTab === 'func' && <>
              {localizacoes.map((loc: any) => {
                const isSelected = selected?.supervisor_id === loc.supervisor_id
                return (
                  <button key={loc.supervisor_id} onClick={() => { setSelected(loc); const map = mapInstanceRef.current; if (map && loc.lat && loc.lng) map.setView([loc.lat, loc.lng], 16, { animate: true }) }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center gap-3 transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-[#00D68F]">
                      {loc.supervisor_nome?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{loc.supervisor_nome}</div>
                      <div className="text-xs text-gray-500 truncate">{loc.condominio_nome}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Clock size={10} />{dayjs(loc.momento).fromNow()}</div>
                    </div>
                    <MapPin size={14} className="text-emerald-400" />
                  </button>
                )
              })}
              {localizacoes.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-400">
                  <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum funcionário com localização nas últimas 24h</p>
                </div>
              )}
            </>}

            {/* Vistorias list */}
            {sideTab === 'vist' && <>
              {(vistorias as any[]).map((v: any, idx: number) => {
                const color = VISTORIA_COLORS[idx % VISTORIA_COLORS.length]
                return (
                  <button key={v.id} onClick={() => { const map = mapInstanceRef.current; if (map && v.lat && v.lng) map.setView([v.lat, v.lng], 16, { animate: true }) }}
                    className="w-full text-left px-4 py-3 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0" style={{ background: color }}>
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{v.titulo || 'Vistoria'}</div>
                      <div className="text-xs text-gray-500 truncate">{v.funcionario_nome} • {v.condominio_nome}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Clock size={10} />
                        {v.iniciada_em ? dayjs(v.iniciada_em).format('DD/MM/YY HH:mm') : dayjs(v.criado_em).format('DD/MM/YY HH:mm')}
                      </div>
                    </div>
                    <a href={`/visitas/${v.id}`} onClick={e => e.stopPropagation()} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Abrir vistoria">
                      <ExternalLink size={14} />
                    </a>
                  </button>
                )
              })}
              {(vistorias as any[]).length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma vistoria com localização</p>
                </div>
              )}
            </>}
          </div>
        </div>
      </div>
    </>
  )
}

// ===================== QR CODE TAB =====================
function QrCodeTab() {
  const { data: pontos = [], isLoading } = useQrPontos()
  const { data: condominiosData } = useCondominios()
  const condominios = Array.isArray(condominiosData) ? condominiosData : (condominiosData as any)?.data || []
  const criarMutation = useCriarQrPonto()
  const excluirMutation = useExcluirQrPonto()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', descricao: '', condominio_id: '' })
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [showQr, setShowQr] = useState<any>(null)

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return toast.error('Informe o nome do ponto')
    try {
      await criarMutation.mutateAsync({
        nome: form.nome,
        descricao: form.descricao || undefined,
        condominio_id: form.condominio_id || undefined,
      })
      toast.success('QR Code criado!')
      setShowModal(false)
      setForm({ nome: '', descricao: '', condominio_id: '' })
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao criar QR Code.'))
    }
  }

  const handleExcluir = async () => {
    if (!confirmDelete) return
    try {
      await excluirMutation.mutateAsync(confirmDelete.id)
      toast.success('QR Code excluído!')
      setConfirmDelete(null)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao excluir.'))
    }
  }

  const downloadQr = (ponto: any) => {
    const svg = document.getElementById(`qr-svg-${ponto.id}`)
    if (!svg) return
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const svgData = new XMLSerializer().serializeToString(svg)
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(img, 0, 0, 1024, 1024)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `qrcode-${ponto.nome.replace(/\s/g, '-')}.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Ponto</h1>
          <p className="text-sm text-gray-500 mt-1">Crie QR Codes para locais. Ao escanear, o funcionário registra presença com endereço, data e hora.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Novo QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(pontos as any[]).map((p: any) => (
          <div key={p.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{p.nome}</h3>
                {p.descricao && <p className="text-xs text-gray-500 mt-0.5">{p.descricao}</p>}
                {p.condominio_nome && <p className="text-xs text-emerald-600 mt-1">{p.condominio_nome}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowQr(p)} className="p-1.5 text-gray-400 hover:text-brand-navy hover:bg-brand-light rounded-lg" title="Ver QR Code">
                  <QrCode size={16} />
                </button>
                <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span>{p.total_registros || 0} registro{p.total_registros === 1 ? '' : 's'}</span>
              <span>{dayjs(p.criado_em).format('DD/MM/YYYY')}</span>
            </div>
          </div>
        ))}

        {pontos.length === 0 && !isLoading && (
          <div className="col-span-3 card p-12 text-center text-gray-400">
            <QrCode size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum QR Code criado</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto"><Plus size={16} /> Criar primeiro QR Code</button>
          </div>
        )}
      </div>

      {/* Modal criar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Novo QR Code Ponto</h2>
            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="label">Nome do local *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input" placeholder="Ex: Portaria Principal" required />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input" placeholder="Descrição opcional do local" />
              </div>
              <div>
                <label className="label">Condomínio (opcional)</label>
                <select value={form.condominio_id} onChange={e => setForm({ ...form, condominio_id: e.target.value })} className="input">
                  <option value="">— Sem condomínio —</option>
                  {condominios.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={criarMutation.isPending} className="btn-primary flex-1 justify-center">
                  {criarMutation.isPending ? 'Criando...' : 'Criar QR Code'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{showQr.nome}</h2>
              <button onClick={() => setShowQr(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {showQr.descricao && <p className="text-sm text-gray-500 mb-3">{showQr.descricao}</p>}
            <div className="bg-white p-4 rounded-xl border border-gray-100 inline-block mb-4">
              <QRCodeSVG id={`qr-svg-${showQr.id}`} value={`${FRONTEND_URL}/ponto/${showQr.token}`} size={220} level="H" />
            </div>
            <p className="text-xs text-gray-400 mb-4 break-all">{FRONTEND_URL}/ponto/{showQr.token}</p>
            <div className="flex gap-3">
              <button onClick={() => downloadQr(showQr)} className="btn-primary flex-1 justify-center"><Download size={16} /> Baixar PNG</button>
              <button onClick={() => { navigator.clipboard.writeText(`${FRONTEND_URL}/ponto/${showQr.token}`); toast.success('Link copiado!') }} className="btn-secondary flex-1 justify-center">Copiar link</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6 text-center">
            <Trash2 size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir QR Code?</h3>
            <p className="text-sm text-gray-500 mb-4"><strong>{confirmDelete.nome}</strong> e todos os registros serão excluídos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleExcluir} disabled={excluirMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-xl text-sm font-medium">
                {excluirMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ===================== REGISTROS TAB =====================
function RegistrosTab() {
  const { data: condominiosData } = useCondominios()
  const condominios = Array.isArray(condominiosData) ? condominiosData : (condominiosData as any)?.data || []
  const [filtros, setFiltros] = useState({ dataInicio: '', dataFim: '', usuarioNome: '', condominioId: '' })
  const { data: registros = [], isLoading } = useQrRegistros(
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
  )

  const handlePdf = () => {
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v))
    const url = `${import.meta.env.VITE_API_URL || ''}/api/v1/qr-ponto/registros/pdf?${params}`
    const token = localStorage.getItem('token')
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'relatorio-qr-pontos.pdf'
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch((err: any) => toast.error(extrairErro(err, 'Erro ao gerar PDF.')))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Presença</h1>
          <p className="text-sm text-gray-500 mt-1">Histórico de todos os escaneamentos de QR Code Ponto</p>
        </div>
        <button onClick={handlePdf} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors">
          <FileText size={16} /> Gerar PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Data início</label>
            <input type="date" value={filtros.dataInicio} onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })} className="input" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Data fim</label>
            <input type="date" value={filtros.dataFim} onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })} className="input" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Funcionário</label>
            <input value={filtros.usuarioNome} onChange={e => setFiltros({ ...filtros, usuarioNome: e.target.value })} className="input" placeholder="Nome do funcionário..." />
          </div>
          <div>
            <label className="text-xs text-gray-500">Condomínio</label>
            <select value={filtros.condominioId} onChange={e => setFiltros({ ...filtros, condominioId: e.target.value })} className="input">
              <option value="">Todos</option>
              {condominios.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Ponto</th>
                <th className="px-4 py-3">Condomínio</th>
                <th className="px-4 py-3">Funcionário</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(registros as any[]).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.ponto_nome}</td>
                  <td className="px-4 py-3 text-gray-500">{r.condominio_nome || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{r.usuario_nome}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.endereco || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{dayjs(r.criado_em).format('DD/MM/YYYY HH:mm')}</td>
                </tr>
              ))}
              {registros.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Nenhum registro encontrado</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
