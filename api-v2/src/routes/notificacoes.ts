import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criar = z.object({
  morador_id: z.string().nullable().optional(),
  morador_nome: z.string().optional().default(''),
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  imagens: z.array(z.object({ url: z.string(), nome: z.string().optional() })).optional().default([]),
  canais: z.array(z.enum(['email', 'whatsapp'])).min(1),
})

function fmt(n: any) {
  return {
    id: n.id,
    data: n.criadoEm,
    morador_id: n.moradorId || null,
    morador_nome: n.moradorNome || '',
    titulo: n.titulo,
    descricao: n.descricao,
    imagens: n.imagens || [],
    canais: n.canais || [],
  }
}

const PODE_ENVIAR = new Set(['master', 'admin', 'sindico', 'supervisor', 'vistoriador'])

export default async function notificacoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)
  app.addHook('preHandler', async (req, reply) => {
    if (req.method === 'POST' && !PODE_ENVIAR.has(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })
  })

  app.get('/notificacoes', async (req) => {
    const ns = await prisma.notificacaoEnviada.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })
    return ns.map(fmt)
  })

  app.post('/notificacoes', async (req, reply) => {
    const p = criar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = p.data
    let moradorNome = d.morador_nome || ''
    if (d.morador_id) {
      const m = await prisma.morador.findFirst({ where: { id: d.morador_id, empresaId: req.usuario.empresaId } })
      if (m) moradorNome = m.nome
    }
    const n = await prisma.notificacaoEnviada.create({
      data: {
        empresaId: req.usuario.empresaId,
        autorId: req.usuario.id,
        moradorId: d.morador_id || null,
        moradorNome,
        titulo: d.titulo.trim(),
        descricao: d.descricao.trim(),
        imagens: d.imagens as any,
        canais: d.canais,
      },
    })
    return reply.code(201).send(fmt(n))
  })
}
