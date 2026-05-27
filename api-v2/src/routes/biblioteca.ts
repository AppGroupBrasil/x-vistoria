import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criar = z.object({
  categoria: z.string().min(1),
  texto: z.string().min(1),
  itens: z.record(z.boolean()).optional().default({}),
})

const atualizar = z.object({
  texto: z.string().min(1).optional(),
  itens: z.record(z.boolean()).optional(),
})

function fmt(p: any) {
  return { id: p.id, categoria: p.categoria, texto: p.texto, itens: p.itens || {} }
}

export default async function bibliotecaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/biblioteca-perguntas', async (req) => {
    const ps = await prisma.bibliotecaPergunta.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { criadoEm: 'desc' },
    })
    return ps.map(fmt)
  })

  app.post('/biblioteca-perguntas', async (req, reply) => {
    const p = criar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const pergunta = await prisma.bibliotecaPergunta.create({
      data: {
        empresaId: req.usuario.empresaId,
        categoria: p.data.categoria,
        texto: p.data.texto.trim(),
        itens: p.data.itens || {},
      },
    })
    return reply.code(201).send(fmt(pergunta))
  })

  app.patch('/biblioteca-perguntas/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const p = atualizar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const existing = await prisma.bibliotecaPergunta.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!existing) return reply.code(404).send({ erro: 'Não encontrado' })
    const upd = await prisma.bibliotecaPergunta.update({
      where: { id },
      data: { texto: p.data.texto?.trim(), itens: p.data.itens as any },
    })
    return fmt(upd)
  })

  app.delete('/biblioteca-perguntas/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await prisma.bibliotecaPergunta.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!existing) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.bibliotecaPergunta.delete({ where: { id } })
    return reply.code(204).send()
  })
}
