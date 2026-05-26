import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const respostaSchema = z.object({
  visita_id: z.string().uuid(),
  pergunta_id: z.string().uuid(),
  resultado: z.enum(['ok', 'nao_ok', 'na']),
  observacao: z.string().optional().default(''),
})

export default async function checklistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/checklist/categorias', async (req) => {
    return prisma.categoria.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { ordem: 'asc' },
    })
  })

  app.get('/checklist/perguntas', async (req) => {
    return prisma.pergunta.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: [{ categoriaId: 'asc' }, { ordem: 'asc' }],
    })
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
      perguntas: tpl.perguntas.map((tp) => ({
        id: tp.pergunta.id,
        texto: tp.pergunta.texto,
        categoria_id: tp.pergunta.categoriaId,
        ordem: tp.ordem,
      })),
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
    const { visita_id, pergunta_id, resultado, observacao } = parsed.data

    const v = await prisma.visita.findFirst({ where: { id: visita_id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })

    const r = await prisma.resposta.upsert({
      where: { visitaId_perguntaId: { visitaId: visita_id, perguntaId: pergunta_id } },
      create: { visitaId: visita_id, perguntaId: pergunta_id, resultado, observacao },
      update: { resultado, observacao },
    })
    return r
  })
}
