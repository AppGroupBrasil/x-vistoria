import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useVisita, useTemplate, useRespostas, useSalvarResposta, useAcaoVisita, useEditarVisita } from '../../api/hooks'
import { ArrowLeft, CheckCircle, XCircle, Minus, Save, ClipboardCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { extrairErro } from '../../api/erros'
import VoiceButton from '../../components/VoiceButton'

type Resultado = 'ok' | 'nao_ok' | 'na' | null

interface RespostaLocal {
  resultado: Resultado
  observacao: string
}

export default function VisitaEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: visita, isLoading: loadingVisita } = useVisita(id as string)
  const { data: template, isLoading: loadingTemplate } = useTemplate(visita?.template_id || '')
  const { data: respostasExistentes = [] } = useRespostas(id as string)

  const salvarResposta = useSalvarResposta()
  const editarVisita = useEditarVisita()
  const finalizar = useAcaoVisita('finalizar')

  // Estado local de todas as respostas: { [pergunta_id]: { resultado, observacao } }
  const [respostas, setRespostas] = useState<Record<string, RespostaLocal>>({})
  const [titulo, setTitulo] = useState('')
  const [observacoesGerais, setObservacoesGerais] = useState('')
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [finalizando, setFinalizando] = useState(false)

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Limpar todos os debounce timers ao desmontar
  useEffect(() => {
    const timers = debounceTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  // Inicializa estado com respostas existentes
  useEffect(() => {
    if (respostasExistentes.length > 0) {
      const mapa: Record<string, RespostaLocal> = {}
      respostasExistentes.forEach((r: any) => {
        mapa[r.pergunta_id] = { resultado: r.resultado, observacao: r.observacao || '' }
      })
      setRespostas(mapa)
    }
  }, [respostasExistentes])

  useEffect(() => {
    if (visita) {
      setTitulo(visita.titulo || '')
      setObservacoesGerais(visita.observacoes_gerais || '')
    }
  }, [visita])

  const salvarRespostaComDebounce = useCallback(
    (perguntaId: string, dados: RespostaLocal) => {
      if (debounceTimers.current[perguntaId]) {
        clearTimeout(debounceTimers.current[perguntaId])
      }
      debounceTimers.current[perguntaId] = setTimeout(async () => {
        setSalvando((s) => ({ ...s, [perguntaId]: true }))
        try {
          await salvarResposta.mutateAsync({
            visita_id: id,
            pergunta_id: perguntaId,
            resultado: dados.resultado,
            observacao: dados.observacao || null,
          })
        } catch (err: any) {
          toast.error(extrairErro(err, 'Erro ao salvar resposta.'))
        } finally {
          setSalvando((s) => ({ ...s, [perguntaId]: false }))
        }
      }, 600)
    },
    [id, salvarResposta]
  )

  const setResultado = (perguntaId: string, resultado: Resultado) => {
    setRespostas((prev) => {
      const atual = prev[perguntaId] || { resultado: null, observacao: '' }
      // Toggle: se já está selecionado, desmarca
      const novoResultado = atual.resultado === resultado ? null : resultado
      const nova = { ...atual, resultado: novoResultado }
      salvarRespostaComDebounce(perguntaId, nova)
      return { ...prev, [perguntaId]: nova }
    })
  }

  const setObservacao = (perguntaId: string, observacao: string) => {
    setRespostas((prev) => {
      const atual = prev[perguntaId] || { resultado: null, observacao: '' }
      const nova = { ...atual, observacao }
      salvarRespostaComDebounce(perguntaId, nova)
      return { ...prev, [perguntaId]: nova }
    })
  }

  const salvarInfoGerais = async () => {
    try {
      await editarVisita.mutateAsync({ id: id as string, titulo, observacoes_gerais: observacoesGerais })
      toast.success('Informações salvas!')
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao salvar.'))
    }
  }

  const handleFinalizar = async () => {
    setFinalizando(true)
    try {
      await finalizar.mutateAsync({ id, observacoes: observacoesGerais })
      toast.success('Vistoria finalizada e enviada para aprovação!')
      navigate(`/visitas/${id}`)
    } catch (err: any) {
      toast.error(extrairErro(err, 'Erro ao finalizar vistoria.'))
    } finally {
      setFinalizando(false)
    }
  }

  if (loadingVisita || loadingTemplate) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="card p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!visita) {
    return <div className="text-center py-20 text-gray-400">Vistoria não encontrada</div>
  }

  if (visita.status !== 'em_andamento' && visita.status !== 'pausada') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertCircle size={48} className="mx-auto text-yellow-400 mb-4" />
        <p className="text-gray-600">Esta vistoria não pode ser editada no status atual.</p>
        <button onClick={() => navigate(`/visitas/${id}`)} className="btn-primary mt-4">
          Ver vistoria
        </button>
      </div>
    )
  }

  // Agrupa perguntas do template por categoria
  const perguntas: any[] = template?.perguntas || []
  const porCategoria = perguntas.reduce((acc: Record<string, any[]>, p: any) => {
    const cat = p.categoria_nome || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const totalRespondidas = perguntas.filter((p) => respostas[p.id]?.resultado).length
  const totalPerguntas = perguntas.length

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/visitas/${id}`)} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {visita.titulo || visita.condominio_nome}
          </h1>
          <p className="text-sm text-gray-500">{visita.condominio_nome} · {visita.supervisor_nome}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          {visita.status === 'em_andamento' ? 'Em andamento' : 'Pausada'}
        </span>
      </div>

      {/* Progresso */}
      {totalPerguntas > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Progresso do checklist</span>
            <span className="text-gray-500">{totalRespondidas}/{totalPerguntas} respondidas</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalPerguntas > 0 ? (totalRespondidas / totalPerguntas) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Informações gerais */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Informações gerais</h2>
        <div>
          <label htmlFor="edit-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título da vistoria</label>
          <input
            id="edit-titulo"
            type="text"
            className="input w-full"
            placeholder="Ex: Vistoria mensal - Março"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="edit-obs" className="block text-sm font-medium text-gray-700 mb-1">Observações gerais</label>
          <textarea
            id="edit-obs"
            rows={3}
            className="input w-full resize-none"
            placeholder="Observações sobre a vistoria..."
            value={observacoesGerais}
            onChange={(e) => setObservacoesGerais(e.target.value)}
          />
          <VoiceButton
            onTranscription={(t) => setObservacoesGerais(t)}
            append
            currentValue={observacoesGerais}
            className="mt-1"
          />
        </div>
        <button
          onClick={salvarInfoGerais}
          disabled={editarVisita.isPending}
          className="btn-secondary text-sm"
        >
          <Save size={14} />
          {editarVisita.isPending ? 'Salvando...' : 'Salvar informações'}
        </button>
      </div>

      {/* Checklist por categoria */}
      {perguntas.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          <ClipboardCheck size={40} className="mx-auto mb-3 opacity-40" />
          <p>Nenhuma pergunta no template desta vistoria.</p>
        </div>
      )}

      {Object.entries(porCategoria).map(([categoria, itens]: [string, any[]]) => (
        <div key={categoria} className="card overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{categoria}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {itens.map((pergunta: any, idx: number) => {
              const resposta = respostas[pergunta.id] || { resultado: null, observacao: '' }
              const saving = salvando[pergunta.id]

              return (
                <div key={pergunta.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 font-mono mt-0.5 w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{pergunta.texto}</p>
                      {pergunta.obrigatoria && (
                        <span className="text-xs text-red-400">* Obrigatória</span>
                      )}
                    </div>
                    {saving && (
                      <span className="text-xs text-gray-400 animate-pulse flex-shrink-0">salvando...</span>
                    )}
                    {!saving && resposta.resultado && (
                      <span className="text-xs text-green-500 flex-shrink-0">✓ salvo</span>
                    )}
                  </div>

                  {/* Botões de resultado */}
                  <div className="flex gap-2 ml-8">
                    <button
                      onClick={() => setResultado(pergunta.id, 'ok')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        resposta.resultado === 'ok'
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600'
                      }`}
                    >
                      <CheckCircle size={15} /> Conforme
                    </button>
                    <button
                      onClick={() => setResultado(pergunta.id, 'nao_ok')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        resposta.resultado === 'nao_ok'
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                      }`}
                    >
                      <XCircle size={15} /> Não conforme
                    </button>
                    <button
                      onClick={() => setResultado(pergunta.id, 'na')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        resposta.resultado === 'na'
                          ? 'bg-gray-400 text-white border-gray-400'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <Minus size={15} /> N/A
                    </button>
                  </div>

                  {/* Observação — aparece quando tem resultado */}
                  {resposta.resultado && (
                    <div className="ml-8">
                      <textarea
                        rows={2}
                        className="input w-full resize-none text-sm"
                        placeholder="Observação sobre este item (opcional)..."
                        value={resposta.observacao}
                        onChange={(e) => setObservacao(pergunta.id, e.target.value)}
                      />
                      <VoiceButton
                        onTranscription={(t) => setObservacao(pergunta.id, (resposta.observacao ? resposta.observacao + ' ' : '') + t)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Rodapé fixo com botão Finalizar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between z-40">
        <div className="text-sm text-gray-500 ml-4">
          {totalRespondidas} de {totalPerguntas} perguntas respondidas
        </div>
        <div className="flex gap-3 mr-4">
          <button
            onClick={() => navigate(`/visitas/${id}`)}
            className="btn-secondary text-sm"
          >
            Ver relatório
          </button>
          <button
            onClick={handleFinalizar}
            disabled={finalizando}
            className="btn-primary text-sm"
          >
            <ClipboardCheck size={15} />
            {finalizando ? 'Finalizando...' : 'Finalizar vistoria'}
          </button>
        </div>
      </div>
    </div>
  )
}
