import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criarSchema = z.object({
  visita_id: z.string().uuid(),
  texto: z.string().min(1),
})

export default async function mensagensRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/mensagens/visita/:visitaId', async (req) => {
    const { visitaId } = req.params as { visitaId: string }
    return prisma.mensagem.findMany({
      where: { visitaId, visita: { empresaId: req.usuario.empresaId } },
      orderBy: { criadoEm: 'asc' },
      include: { autor: true },
    })
  })

  app.post('/mensagens', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { visita_id, texto } = parsed.data
    const v = await prisma.visita.findFirst({ where: { id: visita_id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })
    const m = await prisma.mensagem.create({
      data: { visitaId: visita_id, autorId: req.usuario.id, texto },
    })
    return reply.code(201).send(m)
  })
}
