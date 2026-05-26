import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criarSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  perguntas: z.array(z.object({ pergunta_id: z.string().uuid(), ordem: z.number().int().default(0) })).default([]),
})

export default async function templatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/templates', async (req) => {
    return prisma.template.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { nome: 'asc' },
    })
  })

  app.post('/templates', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { nome, descricao, perguntas } = parsed.data
    const t = await prisma.template.create({
      data: {
        empresaId: req.usuario.empresaId,
        nome,
        descricao,
        perguntas: { create: perguntas.map((p) => ({ perguntaId: p.pergunta_id, ordem: p.ordem })) },
      },
    })
    return reply.code(201).send(t)
  })

  app.delete('/templates/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const t = await prisma.template.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!t) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.template.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Categorias e perguntas — CRUD básico
  app.post('/categorias', async (req, reply) => {
    const schema = z.object({ nome: z.string().min(1), ordem: z.number().int().default(0) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const c = await prisma.categoria.create({
      data: { ...parsed.data, empresaId: req.usuario.empresaId },
    })
    return reply.code(201).send(c)
  })

  app.post('/perguntas', async (req, reply) => {
    const schema = z.object({
      texto: z.string().min(1),
      categoria_id: z.string().uuid().optional(),
      ordem: z.number().int().default(0),
      requer_foto: z.boolean().optional().default(false),
      requer_descricao: z.boolean().optional().default(false),
      requer_titulo: z.boolean().optional().default(false),
      requer_status: z.boolean().optional().default(false),
      requer_problema: z.boolean().optional().default(false),
      requer_ocorrencia: z.boolean().optional().default(false),
      requer_notificacao: z.boolean().optional().default(false),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = parsed.data
    const p = await prisma.pergunta.create({
      data: {
        texto: d.texto,
        categoriaId: d.categoria_id,
        ordem: d.ordem,
        empresaId: req.usuario.empresaId,
        requerFoto: d.requer_foto,
        requerDescricao: d.requer_descricao,
        requerTitulo: d.requer_titulo,
        requerStatus: d.requer_status,
        requerProblema: d.requer_problema,
        requerOcorrencia: d.requer_ocorrencia,
        requerNotificacao: d.requer_notificacao,
      },
    })
    return reply.code(201).send(p)
  })
}
