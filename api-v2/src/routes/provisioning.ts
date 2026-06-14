import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

// Receiver da Fase 2 do SSO (push de cadastro da central). A central deriva a
// WEBHOOK_URL .../provisioning/usuario -> .../provisioning/cadastro. Casa o
// usuário por email (mesma chave do SSO JIT). upsert reativa+renomeia; delete
// revoga (ativo=false). A criação fica a cargo do JIT no 1º SSO.
export default async function provisioningRoutes(app: FastifyInstance) {
  app.post('/provisioning/cadastro', async (req, reply) => {
    const expected = process.env.PROVISIONING_SECRET || process.env.WEBHOOK_SECRET
    const secret = req.headers['x-provisioning-secret']
    if (!expected || secret !== expected) return reply.code(403).send({ erro: 'Assinatura inválida' })
    const ev: any = req.body || {}
    const d = ev.dados || {}
    if (ev.entidade === 'morador' || ev.entidade === 'funcionario') {
      const email = String(d.email || '').toLowerCase().trim()
      if (!email) return { ok: true, ignorado: 'sem email' }
      if (ev.acao === 'delete') {
        await prisma.usuario.updateMany({ where: { email }, data: { ativo: false } })
        return { ok: true }
      }
      const data: any = { ativo: true }
      if (d.nome) data.nome = d.nome
      await prisma.usuario.updateMany({ where: { email }, data })
      return { ok: true }
    }
    return { ok: true, ignorado: ev.entidade }
  })
}
