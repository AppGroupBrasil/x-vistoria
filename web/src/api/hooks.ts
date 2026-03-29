import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// Auth
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api.get('/auth/me') })

// =========== EMPRESAS ===========
export const useEmpresas = () =>
  useQuery({ queryKey: ['empresas'], queryFn: () => api.get('/empresas') })

export const useEmpresa = (id: string) =>
  useQuery({ queryKey: ['empresa', id], queryFn: () => api.get(`/empresas/${id}`), enabled: !!id })

export const useMinhaEmpresa = () =>
  useQuery({ queryKey: ['minha-empresa'], queryFn: () => api.get('/empresas/minha') })

export const useEmpresaResumo = (id: string) =>
  useQuery({ queryKey: ['empresa-resumo', id], queryFn: () => api.get(`/empresas/${id}/resumo`), enabled: !!id })

// =========== VISITAS ===========
export const useVisitas = (filtros?: any) =>
  useQuery({
    queryKey: ['visitas', filtros],
    queryFn: () => api.get('/visitas', { params: filtros }),
  })

export const useVisita = (id: string) =>
  useQuery({ queryKey: ['visita', id], queryFn: () => api.get(`/visitas/${id}`), enabled: !!id })

export const useTimeline = () =>
  useQuery({ queryKey: ['timeline'], queryFn: () => api.get('/visitas/timeline'), refetchInterval: 30_000 })

export const useSupervisoresAtivos = () =>
  useQuery({ queryKey: ['supervisores-ativos'], queryFn: () => api.get('/visitas/supervisores-ativos') })

export const useLocalizacoes = () =>
  useQuery({ queryKey: ['localizacoes'], queryFn: () => api.get('/visitas/localizacoes'), refetchInterval: 15_000 })

export const useVisitasMapa = () =>
  useQuery({ queryKey: ['visitas-mapa'], queryFn: () => api.get('/visitas/mapa-vistorias') })

export const useCriarVisita = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/visitas', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitas'] }),
  })
}

export const useEditarVisita = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; [key: string]: any }) =>
      api.patch(`/visitas/${id}`, dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visita', vars.id] })
      qc.invalidateQueries({ queryKey: ['visitas'] })
    },
  })
}

export const useAcaoVisita = (acao: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/visitas/${id}/${acao}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visita', vars.id] })
      qc.invalidateQueries({ queryKey: ['visitas'] })
      qc.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export const useExcluirVisita = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/visitas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitas'] }),
  })
}

export const useReatribuirVisita = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, supervisor_id }: { id: string; supervisor_id: string }) =>
      api.patch(`/visitas/${id}/reatribuir`, { supervisor_id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visita', vars.id] })
      qc.invalidateQueries({ queryKey: ['visitas'] })
    },
  })
}

// =========== CONDOMINIOS ===========
export const useCondominios = (filtros?: any) =>
  useQuery({ queryKey: ['condominios', filtros], queryFn: () => api.get('/condominios', { params: filtros }) })

export const useCondominio = (id: string) =>
  useQuery({ queryKey: ['condominio', id], queryFn: () => api.get(`/condominios/${id}`), enabled: !!id })

export const useCriarCondominio = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/condominios', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['condominios'] }),
  })
}

export const useAtualizarCondominio = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; [key: string]: any }) => api.patch(`/condominios/${id}`, dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['condominio', vars.id] })
      qc.invalidateQueries({ queryKey: ['condominios'] })
    },
  })
}

export const useExcluirCondominio = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/condominios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['condominios'] }),
  })
}

// =========== USUARIOS ===========
export const useUsuarios = (filtros?: any) =>
  useQuery({ queryKey: ['usuarios', filtros], queryFn: () => api.get('/usuarios', { params: filtros }) })

export const useCriarUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/usuarios', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export const useAtualizarUsuario = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; [key: string]: any }) => api.patch(`/usuarios/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

// =========== CHECKLIST ===========
export const useCategorias = () =>
  useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/checklist/categorias') })

export const useTemplates = () =>
  useQuery({ queryKey: ['templates'], queryFn: () => api.get('/checklist/templates') })

export const useTemplate = (id: string) =>
  useQuery({
    queryKey: ['template', id],
    queryFn: () => api.get(`/checklist/templates/${id}`),
    enabled: !!id,
  })

export const useExcluirTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/checklist/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export const useCriarTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { nome: string; descricao?: string; perguntas?: { pergunta_id: string; ordem?: number; obrigatoria?: boolean }[] }) => api.post('/checklist/templates', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export const useExcluirPerguntasBulk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.post('/checklist/perguntas/bulk-delete', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perguntas'] }),
  })
}

export const useCriarCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { nome: string; descricao?: string }) => api.post('/checklist/categorias', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export const useAtualizarCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; nome?: string; descricao?: string }) => api.patch(`/checklist/categorias/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export const useExcluirCategoria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/checklist/categorias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export const usePerguntas = (categoriaId: string) =>
  useQuery({
    queryKey: ['perguntas', categoriaId],
    queryFn: () => api.get(`/checklist/categorias/${categoriaId}/perguntas`),
    enabled: !!categoriaId,
  })

export const useCriarPergunta = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { categoria_id: string; texto: string; requer_sim_nao?: boolean; requer_foto?: boolean; requer_observacao?: boolean; requer_avaliacao?: boolean; ordem?: number }) => api.post('/checklist/perguntas', dto),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['perguntas', vars.categoria_id] }),
  })
}

export const useAtualizarPergunta = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; texto?: string; requer_sim_nao?: boolean; requer_foto?: boolean; requer_observacao?: boolean; requer_avaliacao?: boolean; ordem?: number }) => api.patch(`/checklist/perguntas/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perguntas'] }),
  })
}

export const useExcluirPergunta = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/checklist/perguntas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perguntas'] }),
  })
}

export const useSalvarResposta = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/checklist/respostas', dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['respostas', vars.visita_id] })
    },
  })
}

export const useRespostas = (visitaId: string) =>
  useQuery({
    queryKey: ['respostas', visitaId],
    queryFn: () => api.get(`/checklist/visitas/${visitaId}/respostas`),
    enabled: !!visitaId,
  })

// =========== PENDENCIAS ===========
export const usePendencias = (visitaId: string) =>
  useQuery({
    queryKey: ['pendencias', visitaId],
    queryFn: () => api.get(`/pendencias/visita/${visitaId}`),
    enabled: !!visitaId,
  })

export const useTodasPendencias = () =>
  useQuery({ queryKey: ['todas-pendencias'], queryFn: () => api.get('/pendencias') })

export const useCriarPendencia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/pendencias', dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pendencias', vars.visita_id] })
      qc.invalidateQueries({ queryKey: ['todas-pendencias'] })
    },
  })
}

export const useAtualizarPendencia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; [key: string]: any }) => api.patch(`/pendencias/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendencias'] })
      qc.invalidateQueries({ queryKey: ['todas-pendencias'] })
    },
  })
}

export const useExcluirPendencia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pendencias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendencias'] })
      qc.invalidateQueries({ queryKey: ['todas-pendencias'] })
    },
  })
}

// =========== MENSAGENS ===========
export const useMensagens = (visitaId: string) =>
  useQuery({
    queryKey: ['mensagens', visitaId],
    queryFn: () => api.get(`/mensagens/visita/${visitaId}`),
    enabled: !!visitaId,
    refetchInterval: 5_000,
  })

export const useEnviarMensagem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { visita_id: string; texto: string }) => api.post('/mensagens', dto),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['mensagens', vars.visita_id] }),
  })
}

// =========== FOTOS ===========
export const useFotos = (visitaId: string) =>
  useQuery({
    queryKey: ['fotos', visitaId],
    queryFn: () => api.get(`/upload/fotos/visita/${visitaId}`),
    enabled: !!visitaId,
  })

export const useExcluirFoto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/upload/fotos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fotos'] }),
  })
}

// =========== RELATORIOS ===========
export const useRelatorios = (filtros?: any) =>
  useQuery({
    queryKey: ['relatorios', filtros],
    queryFn: () => api.get('/relatorios', { params: filtros }),
  })

// =========== VISTORIA LIVRE ===========
export const useVistoriasLivres = () =>
  useQuery({ queryKey: ['vistorias-livres'], queryFn: () => api.get('/vistoria-livre') })

export const useVistoriaLivre = (id: string) =>
  useQuery({ queryKey: ['vistoria-livre', id], queryFn: () => api.get(`/vistoria-livre/${id}`), enabled: !!id })

export const useCriarVistoriaLivre = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { condominio_id: string; titulo?: string }) => api.post('/vistoria-livre', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vistorias-livres'] }),
  })
}

export const useExcluirVistoriaLivre = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vistoria-livre/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vistorias-livres'] }),
  })
}

export const useChecklistLivreItens = () =>
  useQuery({ queryKey: ['checklist-livre-itens'], queryFn: () => api.get('/vistoria-livre/checklist/itens') })

// =========== QR PONTO ===========
export const useQrPontos = () =>
  useQuery({ queryKey: ['qr-pontos'], queryFn: () => api.get('/qr-ponto') })

export const useCriarQrPonto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { nome: string; descricao?: string; condominio_id?: string }) => api.post('/qr-ponto', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-pontos'] }),
  })
}

export const useAtualizarQrPonto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; nome?: string; descricao?: string; condominio_id?: string }) =>
      api.patch(`/qr-ponto/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-pontos'] }),
  })
}

export const useExcluirQrPonto = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/qr-ponto/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-pontos'] }),
  })
}

export const useQrRegistros = (filtros?: any) =>
  useQuery({
    queryKey: ['qr-registros', filtros],
    queryFn: () => api.get('/qr-ponto/registros', { params: filtros }),
  })

// =========== AUDIT LOG ===========
export const useAuditLog = (filtros?: any) =>
  useQuery({
    queryKey: ['audit-log', filtros],
    queryFn: () => api.get('/audit', { params: filtros }),
  })

export const useAuditUsuarios = () =>
  useQuery({
    queryKey: ['audit-usuarios'],
    queryFn: () => api.get('/audit/usuarios'),
  })
