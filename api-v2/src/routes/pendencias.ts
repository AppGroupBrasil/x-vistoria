import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criarSchema = z.object({
  visita_id: z.string().uuid(),
  pergunta_id: z.string().uuid().optional(),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).default('media'),
  responsavel: z.string().optional(),
})

const atualizarSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  status: z.enum(['aberta', 'em_tratativa', 'resolvida']).optional(),
  responsavel: z.string().optional(),
})

function formatar(p: any) {
  return {
    id: p.id,
    visita_id: p.visitaId,
    pergunta_id: p.perguntaId,
    titulo: p.titulo,
    descricao: p.descricao,
    prioridade: p.prioridade,
    status: p.status,
    responsavel: p.responsavel,
    criado_em: p.criadoEm,
    condominio_nome: p.visita?.condominio?.nome,
  }
}

export default async function pendenciasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/pendencias', async (req) => {
    const pendencias = await prisma.pendencia.findMany({
      where: { visita: { empresaId: req.usuario.empresaId } },
      include: { visita: { include: { condominio: true } } },
      orderBy: { criadoEm: 'desc' },
    })
    return pendencias.map(formatar)
  })

  app.get('/pendencias/visita/:visitaId', async (req) => {
    const { visitaId } = req.params as { visitaId: string }
    const pendencias = await prisma.pendencia.findMany({
      where: { visitaId, visita: { empresaId: req.usuario.empresaId } },
      orderBy: { criadoEm: 'desc' },
    })
    return pendencias.map(formatar)
  })

  app.post('/pendencias', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = parsed.data

    const v = await prisma.visita.findFirst({ where: { id: d.visita_id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })

    const p = await prisma.pendencia.create({
      data: {
        visitaId: d.visita_id,
        perguntaId: d.pergunta_id,
        titulo: d.titulo,
        descricao: d.descricao,
        prioridade: d.prioridade,
        responsavel: d.responsavel,
      },
    })
    return reply.code(201).send(formatar(p))
  })

  app.patch('/pendencias/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = atualizarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })

    const p = await prisma.pendencia.findFirst({
      where: { id, visita: { empresaId: req.usuario.empresaId } },
    })
    if (!p) return reply.code(404).send({ erro: 'Não encontrada' })

    const atualizada = await prisma.pendencia.update({ where: { id }, data: parsed.data })
    return formatar(atualizada)
  })

  app.delete('/pendencias/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const p = await prisma.pendencia.findFirst({
      where: { id, visita: { empresaId: req.usuario.empresaId } },
    })
    if (!p) return reply.code(404).send({ erro: 'Não encontrada' })
    await prisma.pendencia.delete({ where: { id } })
    return reply.code(204).send()
  })
}
