import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

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

export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-trocar',
    sign: { expiresIn: '30d' },
  })

  app.decorate('autenticar', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const payload = req.user as any
      req.usuario = { id: payload.sub, empresaId: payload.empresa_id, role: payload.role }
    } catch {
      return reply.code(401).send({ erro: 'Não autenticado' })
    }
  })
})
