import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const respostaSchema = z.object({
  visita_id: z.string().uuid(),
  pergunta_id: z.string().uuid(),
  resultado: z.enum(['ok', 'nao_ok', 'na']),
  observacao: z.string().optional().default(''),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  status: z.enum(['aberto', 'em_execucao', 'finalizado']).optional(),
  problema: z.string().optional(),
  ocorrencia: z.string().optional(),
  notificacao: z.string().optional(),
  limpeza: z.enum(['ruim', 'regular', 'boa', 'otima']).optional(),
})

function formatarPergunta(p: any) {
  return {
    id: p.id,
    texto: p.texto,
    categoria_id: p.categoriaId,
    ordem: p.ordem,
    requer_foto: p.requerFoto,
    requer_descricao: p.requerDescricao,
    requer_titulo: p.requerTitulo,
    requer_status: p.requerStatus,
    requer_problema: p.requerProblema,
    requer_ocorrencia: p.requerOcorrencia,
    requer_notificacao: p.requerNotificacao,
    requer_limpeza: p.requerLimpeza,
  }
}

export default async function checklistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/checklist/categorias', async (req) => {
    return prisma.categoria.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { ordem: 'asc' },
    })
  })

  app.get('/checklist/perguntas', async (req) => {
    const ps = await prisma.pergunta.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: [{ categoriaId: 'asc' }, { ordem: 'asc' }],
    })
    return ps.map(formatarPergunta)
  })

  app.get('/checklist/templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const tpl = await prisma.template.findFirst({
      where: { id, empresaId: req.usuario.empresaId },
      include: {
        perguntas: {
          include: { pergunta: true },
          orderBy: { ordem: 'asc' },
        },
      },
    })
    if (!tpl) return reply.code(404).send({ erro: 'Template não encontrado' })
    return {
      id: tpl.id,
      nome: tpl.nome,
      descricao: tpl.descricao,
      perguntas: tpl.perguntas.map((tp) => ({ ...formatarPergunta(tp.pergunta), ordem: tp.ordem })),
    }
  })

  app.get('/checklist/visitas/:visitaId/respostas', async (req) => {
    const { visitaId } = req.params as { visitaId: string }
    const respostas = await prisma.resposta.findMany({
      where: { visitaId, visita: { empresaId: req.usuario.empresaId } },
    })
    return respostas.map((r) => ({
      id: r.id,
      visita_id: r.visitaId,
      pergunta_id: r.perguntaId,
      resultado: r.resultado,
      observacao: r.observacao,
    }))
  })

  app.post('/checklist/respostas', async (req, reply) => {
    const parsed = respostaSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = parsed.data

    const v = await prisma.visita.findFirst({ where: { id: d.visita_id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })

    const data = {
      resultado: d.resultado, observacao: d.observacao,
      titulo: d.titulo, descricao: d.descricao, status: d.status,
      problema: d.problema, ocorrencia: d.ocorrencia, notificacao: d.notificacao,
      limpeza: d.limpeza,
    }
    const r = await prisma.resposta.upsert({
      where: { visitaId_perguntaId: { visitaId: d.visita_id, perguntaId: d.pergunta_id } },
      create: { visitaId: d.visita_id, perguntaId: d.pergunta_id, ...data },
      update: data,
    })
    return r
  })
}
