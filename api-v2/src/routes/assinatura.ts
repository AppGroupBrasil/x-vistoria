import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

function token() { return randomBytes(24).toString('base64url') }

function hashVistoria(v: any, nome: string, quando: Date): string {
  const base = JSON.stringify({
    id: v.id,
    protocolo: v.protocolo,
    tipo: v.tipo,
    iniciada_em: v.iniciadaEm,
    finalizada_em: v.finalizadaEm,
    condominio: v.condominioNome,
    nome,
    quando: quando.toISOString(),
  })
  return createHash('sha256').update(base).digest('hex')
}

const assinarSchema = z.object({
  nome: z.string().min(2),
})

export default async function assinaturaRoutes(app: FastifyInstance) {
  // POST autenticado: gera/retorna o token de assinatura
  app.post('/vistoria-simples/:id/preparar-assinatura', { preHandler: app.autenticar }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const v = await prisma.vistoriaSimples.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Não encontrado' })
    if (v.assinSindicoToken) return { token: v.assinSindicoToken, assinada: !!v.assinSindicoEm }
    const t = token()
    await prisma.vistoriaSimples.update({ where: { id }, data: { assinSindicoToken: t } })
    return { token: t, assinada: false }
  })

  // GET público: info da vistoria pelo token
  app.get('/assinar/:token', async (req, reply) => {
    const { token: tk } = req.params as { token: string }
    const v = await prisma.vistoriaSimples.findUnique({ where: { assinSindicoToken: tk } })
    if (!v) return reply.code(404).send({ erro: 'Token inválido' })
    return {
      id: v.id,
      protocolo: v.protocolo,
      tipo: v.tipo,
      condominio: v.condominioNome,
      endereco: v.endereco,
      iniciada_em: v.iniciadaEm,
      finalizada_em: v.finalizadaEm,
      assinada: !!v.assinSindicoEm,
      assinada_por: v.assinSindicoNome,
      assinada_em: v.assinSindicoEm,
      hash: v.assinSindicoHash,
    }
  })

  // POST público: registra a assinatura
  app.post('/assinar/:token', async (req, reply) => {
    const { token: tk } = req.params as { token: string }
    const p = assinarSchema.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Informe seu nome completo' })
    const v = await prisma.vistoriaSimples.findUnique({ where: { assinSindicoToken: tk } })
    if (!v) return reply.code(404).send({ erro: 'Token inválido' })
    if (v.assinSindicoEm) return reply.code(409).send({ erro: 'Esta vistoria já foi assinada' })
    const agora = new Date()
    const hash = hashVistoria(v, p.data.nome.trim(), agora)
    await prisma.vistoriaSimples.update({
      where: { id: v.id },
      data: { assinSindicoNome: p.data.nome.trim(), assinSindicoEm: agora, assinSindicoHash: hash },
    })
    return { ok: true, hash, assinada_em: agora }
  })
}
