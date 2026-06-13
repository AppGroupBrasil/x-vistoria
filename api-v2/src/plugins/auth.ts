import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyInstance {
    autenticar: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    usuario: { id: string; empresaId: string; role: string }
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; empresa_id: string; role: string }
    user: { sub: string; empresa_id: string; role: string }
  }
}

const APP_SLUGS = new Set(['xvistoria', 'x-vistoria'])
const STATUS_VALIDOS = new Set(['ativa', 'trial'])

type AppLicenca = { slug: string; role: string; status: string; expira_em: string | null }
type CentralPayload = { sub: string; email: string; nome: string; apps?: AppLicenca[] }

function mapearRole(roleCentral: string): 'master' | 'admin' | 'supervisor' {
  const r = (roleCentral || '').toLowerCase()
  if (r === 'superadmin' || r === 'master') return 'master'
  if (r === 'supervisor') return 'supervisor'
  return 'admin'
}

async function provisionarDoCentral(p: CentralPayload, roleCentral: string) {
  const email = p.email.toLowerCase()
  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    return { id: existente.id, empresaId: existente.empresaId, role: existente.role }
  }
  const role = mapearRole(roleCentral)
  const senhaHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10)
  const empresa = await prisma.empresa.create({ data: { nome: p.nome || 'Minha Empresa' } })
  const novo = await prisma.usuario.create({
    data: { empresaId: empresa.id, nome: p.nome || email, email, senhaHash, role },
  })
  return { id: novo.id, empresaId: novo.empresaId, role: novo.role }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-trocar',
    sign: { expiresIn: '30d' },
  })

  const centralSecret = process.env.AUTH_CENTRAL_JWT_SECRET || ''
  if (centralSecret) {
    await app.register(fastifyJwt, { secret: centralSecret, namespace: 'central' })
  }

  app.decorate('autenticar', async (req: FastifyRequest, reply: FastifyReply) => {
    if (centralSecret) {
      try {
        const payload = (await (req as any).centralJwtVerify()) as CentralPayload
        if (Array.isArray(payload.apps)) {
          const licenca = payload.apps.find(a => APP_SLUGS.has(a.slug))
          if (!licenca || !STATUS_VALIDOS.has(licenca.status)) {
            return reply.code(403).send({ erro: 'Sem licença ativa para o X Vistoria' })
          }
          if (licenca.expira_em && new Date(licenca.expira_em) < new Date()) {
            return reply.code(403).send({ erro: 'Licença expirada' })
          }
          const local = await provisionarDoCentral(payload, licenca.role)
          req.usuario = { id: local.id, empresaId: local.empresaId, role: local.role }
          return
        }
      } catch {
        // não é token central válido — tenta token local
      }
    }

    try {
      await req.jwtVerify()
      const payload = req.user as any
      req.usuario = { id: payload.sub, empresaId: payload.empresa_id, role: payload.role }
      return
    } catch {
      return reply.code(401).send({ erro: 'Não autenticado' })
    }
  })
})
