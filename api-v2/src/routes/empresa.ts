import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const branding = z.object({
  logo_url: z.string().url().nullable().optional(),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  nome: z.string().min(2).optional(),
})

export default async function empresaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/empresa', async (req) => {
    const e = await prisma.empresa.findUnique({ where: { id: req.usuario.empresaId } })
    return e ? { id: e.id, nome: e.nome, cnpj: e.cnpj, logo_url: e.logoUrl, cor_primaria: e.corPrimaria } : null
  })

  app.patch('/empresa', async (req, reply) => {
    if (!['master', 'admin'].includes(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })
    const p = branding.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const e = await prisma.empresa.update({
      where: { id: req.usuario.empresaId },
      data: {
        logoUrl: p.data.logo_url,
        corPrimaria: p.data.cor_primaria,
        nome: p.data.nome,
      },
    })
    return { id: e.id, nome: e.nome, cnpj: e.cnpj, logo_url: e.logoUrl, cor_primaria: e.corPrimaria }
  })
}
