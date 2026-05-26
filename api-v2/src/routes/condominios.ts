import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const condSchema = z.object({
  nome: z.string().min(2),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().length(2).optional(),
  sindico: z.string().optional(),
  sindico_email: z.string().email().optional().or(z.literal('')),
})

export default async function condominiosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/condominios', async (req) => {
    return prisma.condominio.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { nome: 'asc' },
    })
  })

  app.post('/condominios', async (req, reply) => {
    const parsed = condSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = parsed.data
    const c = await prisma.condominio.create({
      data: {
        empresaId: req.usuario.empresaId,
        nome: d.nome,
        endereco: d.endereco,
        cidade: d.cidade,
        uf: d.uf,
        sindico: d.sindico,
        sindicoEmail: d.sindico_email || null,
      },
    })
    return reply.code(201).send(c)
  })

  app.patch('/condominios/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = condSchema.partial().safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const c = await prisma.condominio.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!c) return reply.code(404).send({ erro: 'Não encontrado' })
    const d = parsed.data
    const atualizado = await prisma.condominio.update({
      where: { id },
      data: {
        nome: d.nome,
        endereco: d.endereco,
        cidade: d.cidade,
        uf: d.uf,
        sindico: d.sindico,
        sindicoEmail: d.sindico_email || null,
      },
    })
    return atualizado
  })

  app.delete('/condominios/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const c = await prisma.condominio.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!c) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.condominio.delete({ where: { id } })
    return reply.code(204).send()
  })
}
