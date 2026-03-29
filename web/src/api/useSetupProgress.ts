import { useCondominios, useUsuarios, useCategorias, useTemplates, useVisitas } from './hooks'

export interface SetupStep {
  key: string
  step: number
  label: string
  description: string
  route: string
  done: boolean
  count: number
  unlocked: boolean
}

export function useSetupProgress() {
  const { data: condominiosRes, isLoading: loadingC } = useCondominios({ limit: 1 })
  const { data: usuariosRes, isLoading: loadingU } = useUsuarios({ limit: 1 })
  const { data: categorias, isLoading: loadingCat } = useCategorias()
  const { data: templates, isLoading: loadingT } = useTemplates()
  const { data: visitasRes, isLoading: loadingV } = useVisitas({ limit: 1 })

  const totalCondominios = condominiosRes?.total ?? condominiosRes?.data?.length ?? 0
  const totalUsuarios = usuariosRes?.total ?? usuariosRes?.data?.length ?? 0
  const categoriasArr = Array.isArray(categorias) ? categorias : []
  const totalCategorias = categoriasArr.length
  const templatesArr = Array.isArray(templates) ? templates : []
  const totalTemplates = templatesArr.length
  const totalVisitas = visitasRes?.total ?? visitasRes?.data?.length ?? 0

  const hasCondominios = totalCondominios > 0
  const hasUsuarios = totalUsuarios > 0
  const hasCategorias = totalCategorias > 0
  const hasTemplates = totalTemplates > 0
  const hasVisitas = totalVisitas > 0

  const steps: SetupStep[] = [
    {
      key: 'condominios',
      step: 1,
      label: 'Condomínios',
      description: 'Cadastre pelo menos 1 condomínio',
      route: '/condominios',
      done: hasCondominios,
      count: totalCondominios,
      unlocked: true,
    },
    {
      key: 'usuarios',
      step: 2,
      label: 'Usuários',
      description: 'Cadastre funcionários',
      route: '/usuarios',
      done: hasUsuarios,
      count: totalUsuarios,
      unlocked: hasCondominios,
    },
    {
      key: 'categorias',
      step: 3,
      label: 'Categorias e Perguntas',
      description: 'Crie categorias e perguntas',
      route: '/categorias',
      done: hasCategorias,
      count: totalCategorias,
      unlocked: hasUsuarios,
    },
    {
      key: 'templates',
      step: 4,
      label: 'Vistoria',
      description: 'Monte templates de checklist',
      route: '/vistoria',
      done: hasTemplates,
      count: totalTemplates,
      unlocked: hasCategorias,
    },
    {
      key: 'visitas',
      step: 5,
      label: 'Visitas',
      description: 'Crie e agende visitas',
      route: '/visitas',
      done: hasVisitas,
      count: totalVisitas,
      unlocked: hasCondominios,
    },
  ]

  const allDone = hasCondominios && hasUsuarios && hasCategorias && hasTemplates && hasVisitas
  const currentStep = steps.find(s => s.unlocked && !s.done)?.step ?? (allDone ? steps.length : 1)
  const completedSteps = steps.filter(s => s.done).length
  const isLoading = loadingC || loadingU || loadingCat || loadingT || loadingV

  return { steps, allDone, currentStep, completedSteps, isLoading }
}
