import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criar = z.object({
  condominio_id: z.string().nullable().optional(),
  condominio_nome: z.string().nullable().optional(),
  bloco: z.string().optional().default(''),
  apartamento: z.string().optional().default(''),
  nome: z.string().min(1),
  telefone: z.string().optional().default(''),
  email: z.string().optional().default(''),
})

const lote = z.object({ moradores: z.array(criar).min(1).max(1000) })

function fmt(m: any) {
  return {
    id: m.id,
    condominio_id: m.condominioId,
    condominio: m.condominioNome || '',
    bloco: m.bloco || '',
    apartamento: m.apartamento || '',
    nome: m.nome,
    telefone: m.telefone || '',
    email: m.email || '',
  }
}

export default async function moradoresRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/moradores', async (req) => {
    const ms = await prisma.morador.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { criadoEm: 'desc' },
    })
    return ms.map(fmt)
  })

  app.post('/moradores', async (req, reply) => {
    const p = criar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = p.data
    const m = await prisma.morador.create({
      data: {
        empresaId: req.usuario.empresaId,
        condominioId: d.condominio_id || null,
        condominioNome: d.condominio_nome || null,
        bloco: d.bloco, apartamento: d.apartamento, nome: d.nome,
        telefone: d.telefone, email: d.email,
      },
    })
    return reply.code(201).send(fmt(m))
  })

  app.post('/moradores/lote', async (req, reply) => {
    const p = lote.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const rows = p.data.moradores.map((d) => ({
      empresaId: req.usuario.empresaId,
      condominioId: d.condominio_id || null,
      condominioNome: d.condominio_nome || null,
      bloco: d.bloco || '', apartamento: d.apartamento || '', nome: d.nome,
      telefone: d.telefone || '', email: d.email || '',
    }))
    await prisma.morador.createMany({ data: rows })
    return reply.code(201).send({ inseridos: rows.length })
  })

  app.delete('/moradores/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const m = await prisma.morador.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!m) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.morador.delete({ where: { id } })
    return reply.code(204).send()
  })
}
