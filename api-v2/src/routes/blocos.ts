import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criar = z.object({ condominio_id: z.string(), nome: z.string().min(1) })
const lote = z.object({ condominio_id: z.string(), prefixo: z.string().default(''), quantidade: z.number().int().min(1).max(999) })

const GERENCIA = new Set(['master', 'admin', 'sindico', 'supervisor'])

export default async function blocosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)
  app.addHook('preHandler', async (req, reply) => {
    if (req.method === 'GET') return
    if (!GERENCIA.has(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })
  })

  app.get('/blocos', async (req) => {
    const bs = await prisma.bloco.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { criadoEm: 'asc' },
    })
    return bs.map((b) => ({ id: b.id, condominio_id: b.condominioId, nome: b.nome }))
  })

  app.post('/blocos', async (req, reply) => {
    const p = criar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const cond = await prisma.condominio.findFirst({ where: { id: p.data.condominio_id, empresaId: req.usuario.empresaId } })
    if (!cond) return reply.code(404).send({ erro: 'Condomínio não encontrado' })
    try {
      const b = await prisma.bloco.create({
        data: { empresaId: req.usuario.empresaId, condominioId: p.data.condominio_id, nome: p.data.nome.trim() },
      })
      return reply.code(201).send({ id: b.id, condominio_id: b.condominioId, nome: b.nome })
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.code(409).send({ erro: 'Esse bloco já existe' })
      throw e
    }
  })

  app.post('/blocos/lote', async (req, reply) => {
    const p = lote.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const cond = await prisma.condominio.findFirst({ where: { id: p.data.condominio_id, empresaId: req.usuario.empresaId } })
    if (!cond) return reply.code(404).send({ erro: 'Condomínio não encontrado' })
    const nomes = Array.from({ length: p.data.quantidade }, (_, i) => `${p.data.prefixo}${i + 1}`.trim())
    const rows = nomes.map((nome) => ({ empresaId: req.usuario.empresaId, condominioId: p.data.condominio_id, nome }))
    const r = await prisma.bloco.createMany({ data: rows, skipDuplicates: true })
    return reply.code(201).send({ inseridos: r.count })
  })

  app.delete('/blocos/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const b = await prisma.bloco.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!b) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.bloco.delete({ where: { id } })
    return reply.code(204).send()
  })
}
