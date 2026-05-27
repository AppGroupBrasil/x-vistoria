export type CategoriaBib =
  | 'personalizada'
  | 'foto-descricao'
  | 'checklist'
  | 'pergunta-resposta'
  | 'conformidade'
  | 'antes-depois'
  | 'avaliacao'

export const CATEGORIAS: { key: CategoriaBib; label: string }[] = [
  { key: 'personalizada',     label: 'Personalizada (modelo completo)' },
  { key: 'foto-descricao',    label: 'Foto e descrição' },
  { key: 'checklist',         label: 'Checklist' },
  { key: 'pergunta-resposta', label: 'Pergunta e Resposta' },
  { key: 'conformidade',      label: 'Conformidade' },
  { key: 'antes-depois',      label: 'Antes e Depois' },
  { key: 'avaliacao',         label: 'Avaliação por nota' },
]

export const BIBLIOTECA: Record<CategoriaBib, string[]> = {
  'personalizada': [
    'Hall de entrada está limpo?',
    'Iluminação dos corredores funciona?',
    'Elevador social funciona normalmente?',
    'Elevador de serviço funciona normalmente?',
    'Botoeira do elevador está em bom estado?',
    'Extintores estão dentro da validade?',
    'Sinalização de saída de emergência está visível?',
    'Iluminação de emergência funciona?',
    'Hidrantes estão acessíveis?',
    'Mangueiras de incêndio em bom estado?',
    'Portão da garagem funciona?',
    'Câmeras de segurança estão operando?',
    'Interfone funciona?',
    'Caixa d\'água tem laudo de limpeza recente?',
    'Bomba de recalque funciona?',
    'Há vazamentos visíveis?',
    'Quadro elétrico está identificado?',
    'Gerador funciona (teste mensal)?',
    'Piscina está com água tratada?',
    'Salão de festas está em ordem?',
    'Playground está seguro?',
    'Academia tem equipamentos em bom estado?',
    'Área da churrasqueira está limpa?',
    'Coleta de lixo está sendo feita corretamente?',
    'Pintura externa está em bom estado?',
    'Há infiltrações visíveis?',
    'Jardim está cuidado?',
    'AVCB está vigente?',
    'Funcionários estão usando EPI?',
    'Livro de ocorrências está atualizado?',
  ],

  'foto-descricao': [
    'Fachada do prédio',
    'Hall de entrada',
    'Recepção / portaria',
    'Corredor do andar',
    'Caixa de correios',
    'Elevadores (interior)',
    'Escada de emergência',
    'Saída de emergência',
    'Extintores',
    'Hidrante',
    'Garagem (visão geral)',
    'Vaga visitante',
    'Bicicletário',
    'Lixeira / área de resíduos',
    'Casa de máquinas',
    'Quadro elétrico geral',
    'Caixa d\'água',
    'Cobertura / laje',
    'Piscina',
    'Sauna / SPA',
    'Salão de festas',
    'Salão de jogos',
    'Academia',
    'Playground',
    'Quadra esportiva',
    'Churrasqueira',
    'Jardim',
    'Portão social',
    'Portão da garagem',
    'Vaga de carga e descarga',
  ],

  'checklist': [
    'Iluminação do corredor — 1º andar',
    'Iluminação do corredor — 2º andar',
    'Iluminação da garagem',
    'Funcionamento do elevador social',
    'Funcionamento do elevador de serviço',
    'Extintor da portaria',
    'Extintor da garagem',
    'Hidrante do térreo',
    'Câmeras da portaria',
    'Câmeras da garagem',
    'Interfone da portaria',
    'Portão social',
    'Portão da garagem',
    'Bomba d\'água principal',
    'Bomba d\'água reserva',
    'Caixa d\'água superior',
    'Caixa d\'água inferior',
    'Quadro elétrico geral',
    'Gerador',
    'Iluminação de emergência do hall',
    'Sinalização de saída de emergência',
    'Limpeza do hall',
    'Limpeza da escada',
    'Limpeza da garagem',
    'Limpeza da piscina',
    'Limpeza do salão de festas',
    'Coleta de lixo',
    'Jardinagem',
    'Pintura das paredes externas',
    'Vazamentos visíveis',
  ],

  'pergunta-resposta': [
    'Quantos extintores existem no condomínio?',
    'Qual a validade do AVCB?',
    'Quando foi a última manutenção dos elevadores?',
    'Quem é o responsável pela manutenção elétrica?',
    'Quantas câmeras estão instaladas?',
    'Existe gerador? De qual capacidade?',
    'Qual a capacidade total da caixa d\'água?',
    'Quem é o porteiro do turno atual?',
    'Quantos funcionários trabalham no prédio?',
    'Quando foi a última dedetização?',
    'Quando foi a última limpeza da caixa d\'água?',
    'Quantas vagas de garagem existem?',
    'Existe vaga PCD?',
    'Existe rampa de acessibilidade?',
    'Existem bicicletários? Quantas vagas?',
    'Quantas unidades habitacionais?',
    'O condomínio tem síndico profissional?',
    'Qual a empresa de segurança contratada?',
    'Existe vigilância 24h?',
    'Quais os horários da portaria?',
    'Existem regras escritas para visitantes?',
    'Existem regras para uso da piscina?',
    'Existem regras para uso do salão de festas?',
    'Existem regras para mudanças?',
    'Existem regras para obras nas unidades?',
    'Qual a taxa condominial atual?',
    'Há inadimplentes? Quantos?',
    'Existem ações judiciais em andamento?',
    'A convenção está atualizada?',
    'O regimento interno está disponível aos moradores?',
  ],

  'conformidade': [
    'AVCB está vigente',
    'Extintores dentro da validade',
    'Sinalização de emergência visível',
    'Iluminação de emergência funcionando',
    'Hidrantes desobstruídos',
    'Mangueiras de incêndio em bom estado',
    'Bombas hidráulicas operando',
    'Reservatórios de água com laudo de limpeza',
    'Quadros elétricos identificados',
    'Quadros elétricos com dispositivos de proteção',
    'Para-raios com laudo atualizado',
    'Gerador testado mensalmente',
    'Elevadores com inspeção em dia',
    'Câmeras de segurança operando',
    'Sistema de alarme operando',
    'Portões automáticos com manutenção em dia',
    'Interfones funcionando',
    'Iluminação das áreas comuns adequada',
    'Sinalização da garagem visível',
    'Vagas demarcadas corretamente',
    'Vagas PCD em conformidade',
    'Caixas de gordura limpas',
    'Coleta seletiva implantada',
    'Área de lixo em condições adequadas',
    'Pintura em bom estado',
    'Sem infiltrações',
    'Sem vazamentos',
    'Jardim e áreas verdes cuidados',
    'EPIs disponíveis para funcionários',
    'Livros e documentos atualizados',
  ],

  'antes-depois': [
    'Pintura do hall',
    'Pintura do corredor',
    'Pintura da fachada',
    'Reforma do piso da garagem',
    'Reforma do telhado / cobertura',
    'Manutenção do elevador',
    'Reforma da piscina',
    'Reforma da quadra',
    'Reforma do salão de festas',
    'Reforma da academia',
    'Reforma do playground',
    'Substituição de luminárias',
    'Substituição de portas',
    'Substituição de fechaduras',
    'Substituição de janelas',
    'Conserto de vazamento',
    'Conserto de infiltração',
    'Conserto de rachadura',
    'Limpeza da caixa d\'água',
    'Limpeza geral pós-festa',
    'Limpeza pós-obra',
    'Poda de árvores',
    'Plantio do jardim',
    'Substituição da bomba d\'água',
    'Manutenção do portão social',
    'Manutenção do portão da garagem',
    'Conserto do interfone',
    'Instalação de câmeras',
    'Pintura da demarcação de vagas',
    'Manutenção dos extintores',
  ],

  'avaliacao': [
    'Limpeza do hall',
    'Limpeza dos corredores',
    'Limpeza da garagem',
    'Limpeza da piscina',
    'Limpeza do salão de festas',
    'Limpeza dos banheiros comuns',
    'Conservação da fachada',
    'Conservação dos elevadores',
    'Conservação do telhado',
    'Conservação da pintura interna',
    'Conservação da pintura externa',
    'Iluminação do hall',
    'Iluminação dos corredores',
    'Iluminação da garagem',
    'Iluminação externa',
    'Segurança da portaria',
    'Atendimento dos porteiros',
    'Atendimento do zelador',
    'Manutenção do gerador',
    'Manutenção das bombas',
    'Manutenção das caixas d\'água',
    'Manutenção dos elevadores',
    'Funcionamento das câmeras',
    'Funcionamento dos interfones',
    'Acessibilidade do prédio',
    'Qualidade do jardim',
    'Qualidade da área da piscina',
    'Qualidade do salão de festas',
    'Qualidade do playground',
    'Qualidade da academia',
  ],
}

export const STORAGE_KEY = (cat: CategoriaBib) => `xv-import-${cat}`

const uid = () => Math.random().toString(36).slice(2, 10)

// Converte textos selecionados para o formato esperado por cada destino
export function toItens(cat: CategoriaBib, textos: string[]): any[] {
  switch (cat) {
    case 'personalizada':
      return textos.map((t) => ({ id: uid(), pergunta: t, itens: {}, foto: null, descricao: '', status: '', conservacao: '', limpeza: '', localExato: '', prazo: '', validade: '', problema: '', resposta: '', notificacao: false }))
    case 'foto-descricao':
      return textos.map((t) => ({ id: uid(), foto: null, descricao: t }))
    case 'checklist':
      return textos.map((t) => ({ id: uid(), nome: t, problemaAberto: false, problemaFoto: null, problemaDesc: '' }))
    case 'pergunta-resposta':
      return textos.map((t) => ({ id: uid(), pergunta: t, resposta: '', foto: null }))
    case 'conformidade':
      return textos.map((t) => ({ id: uid(), item: t, conforme: null }))
    case 'antes-depois':
      return textos.map((t) => ({ id: uid(), antes: null, depois: null, descricao: t }))
    case 'avaliacao':
      return textos.map((t) => ({ id: uid(), item: t, nota: 0 }))
  }
}

export function destinoURL(cat: CategoriaBib): string {
  return `/x-vistoria/simples/${cat}`
}
