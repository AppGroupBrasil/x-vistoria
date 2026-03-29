import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// ── Queries ──

export function useVisitas() {
  return useQuery({
    queryKey: ['visitas'],
    queryFn: () => api.get('/visitas').then((res: any) => res?.data || res),
  })
}

export function useVisita(id: string) {
  return useQuery({
    queryKey: ['visita', id],
    queryFn: () => api.get(`/visitas/${id}`).then((r: any) => r?.data || r),
    enabled: !!id,
  })
}

export function useRespostas(visitaId: string) {
  return useQuery({
    queryKey: ['respostas', visitaId],
    queryFn: () => api.get(`/checklist/visitas/${visitaId}/respostas`).then((r: any) => r?.data || r),
    enabled: !!visitaId,
  })
}

export function usePendenciasVisita(visitaId: string) {
  return useQuery({
    queryKey: ['pendencias', visitaId],
    queryFn: () => api.get(`/pendencias/visita/${visitaId}`).then((r: any) => r?.data || r),
    enabled: !!visitaId,
  })
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => api.get('/checklist/categorias').then((r: any) => r?.data || r),
  })
}

export function useTemplate(templateId?: string) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => api.get(`/checklist/templates/${templateId}`).then((r: any) => r?.data || r),
    enabled: !!templateId,
  })
}

export function useAllPerguntas(enabled: boolean) {
  return useQuery({
    queryKey: ['all-perguntas'],
    queryFn: () => api.get('/checklist/perguntas').then((r: any) => r?.data || r),
    enabled,
  })
}

export function useFotos(visitaId: string) {
  return useQuery({
    queryKey: ['fotos', visitaId],
    queryFn: () => api.get(`/upload/fotos/visita/${visitaId}`).then((r: any) => r?.data || r),
    enabled: !!visitaId,
  })
}

// ── Mutations ──

export function useAlterarStatusVisita(visitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ acao, body }: { acao: string; body?: any }) =>
      api.patch(`/visitas/${visitaId}/${acao}`, body || {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visita', visitaId] })
      qc.invalidateQueries({ queryKey: ['respostas', visitaId] })
      qc.invalidateQueries({ queryKey: ['pendencias', visitaId] })
      qc.invalidateQueries({ queryKey: ['visitas'] })
    },
  })
}

export function useSalvarResposta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/checklist/respostas', dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: ['respostas', dto.visita_id] })
    },
  })
}

export function useTranscreverAudio() {
  return useMutation({
    mutationFn: (formData: FormData) => api.post('/ai/transcrever', formData),
  })
}

export function useUploadFoto(visitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => api.post('/upload', formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fotos', visitaId] })
    },
  })
}

export function useExcluirFoto(visitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fotoId: string) => api.delete(`/upload/fotos/${fotoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fotos', visitaId] })
    },
  })
}

export function useCriarPendencia(visitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: any) => api.post('/pendencias', { ...dto, visita_id: visitaId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendencias', visitaId] })
    },
  })
}

export function useAtualizarPendencia(visitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: any) => api.patch(`/pendencias/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendencias', visitaId] })
    },
  })
}
