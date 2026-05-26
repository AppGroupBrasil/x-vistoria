import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const atribuirSchema = z.object({
  vistoriador_id: z.string().uuid(),
  condominio_ids: z.array(z.string().uuid()),
})

export default async function atribuicoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  // Lista funcionários que podem vistoriar
  app.get('/funcionarios', async (req) => {
    const us = await prisma.usuario.findMany({
      where: { empresaId: req.usuario.empresaId, ativo: true, role: { in: ['vistoriador', 'supervisor', 'admin'] } },
      orderBy: { nome: 'asc' },
    })
    return us.map((u) => ({ id: u.id, nome: u.nome, email: u.email, role: u.role }))
  })

  // Lista condomínios da empresa com info de quem é responsável atual
  app.get('/atribuicoes', async (req) => {
    const cs = await prisma.condominio.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { nome: 'asc' },
      include: { vistoriadorPadrao: true },
    })
    return cs.map((c) => ({
      id: c.id,
      nome: c.nome,
      endereco: c.endereco,
      vistoriador_id: c.vistoriadorPadraoId,
      vistoriador_nome: c.vistoriadorPadrao?.nome,
    }))
  })

  // Atribuir N condomínios a 1 funcionário
  app.post('/atribuicoes', async (req, reply) => {
    const parsed = atribuirSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { vistoriador_id, condominio_ids } = parsed.data

    const func = await prisma.usuario.findFirst({
      where: { id: vistoriador_id, empresaId: req.usuario.empresaId },
    })
    if (!func) return reply.code(404).send({ erro: 'Funcionário não encontrado' })

    await prisma.condominio.updateMany({
      where: { id: { in: condominio_ids }, empresaId: req.usuario.empresaId },
      data: { vistoriadorPadraoId: vistoriador_id },
    })

    return { ok: true, atribuidos: condominio_ids.length }
  })
}
