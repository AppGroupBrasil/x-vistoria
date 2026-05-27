import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

const registerSchema = z.object({
  empresa_nome: z.string().min(2),
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
})

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { email, senha } = parsed.data

    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { empresa: true },
    })
    if (!user || !user.ativo) return reply.code(401).send({ erro: 'Email ou senha inválidos' })

    const ok = await bcrypt.compare(senha, user.senhaHash)
    if (!ok) return reply.code(401).send({ erro: 'Email ou senha inválidos' })

    const token = app.jwt.sign({ sub: user.id, empresa_id: user.empresaId, role: user.role })

    return {
      access_token: token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        empresa_id: user.empresaId,
        empresa_nome: user.empresa.nome,
        permissoes: user.permissoes || [],
      },
    }
  })

  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { empresa_nome, nome, email, senha } = parsed.data

    const existing = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return reply.code(409).send({ erro: 'Email já cadastrado' })

    const senhaHash = await bcrypt.hash(senha, 10)
    const empresa = await prisma.empresa.create({ data: { nome: empresa_nome } })
    const user = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nome,
        email: email.toLowerCase(),
        senhaHash,
        role: 'admin',
      },
    })

    const token = app.jwt.sign({ sub: user.id, empresa_id: empresa.id, role: user.role })
    return reply.code(201).send({
      access_token: token,
      usuario: { id: user.id, nome, email: user.email, role: user.role, empresa_id: empresa.id, empresa_nome: empresa.nome, permissoes: [] },
    })
  })

  app.get('/auth/me', { preHandler: [app.autenticar] }, async (req) => {
    const u = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { empresa: true },
    })
    if (!u) return { erro: 'Usuário não encontrado' }
    return {
      id: u.id, nome: u.nome, email: u.email, role: u.role,
      empresa_id: u.empresaId, empresa_nome: u.empresa.nome,
      permissoes: u.permissoes || [],
    }
  })
}
