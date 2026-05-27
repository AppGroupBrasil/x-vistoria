import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const criarSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(['admin', 'supervisor', 'sindico', 'vistoriador']).default('vistoriador'),
})

const atualizarSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  role: z.enum(['admin', 'supervisor', 'sindico', 'vistoriador']).optional(),
  ativo: z.boolean().optional(),
  permissoes: z.array(z.string()).optional(),
})

function ehAdmin(role: string) { return role === 'admin' || role === 'master' }
function formatar(u: any) {
  return { id: u.id, nome: u.nome, email: u.email, role: u.role, ativo: u.ativo, permissoes: u.permissoes || [], criado_em: u.criadoEm }
}

export default async function usuariosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/usuarios', async (req, reply) => {
    const role = req.usuario.role
    const podeListar = ehAdmin(role) || role === 'sindico'
    if (!podeListar) return reply.code(403).send({ erro: 'Sem permissão' })
    const filtroRole = role === 'sindico' ? { role: { in: ['vistoriador' as any] } } : {}
    const us = await prisma.usuario.findMany({
      where: { empresaId: req.usuario.empresaId, ...filtroRole },
      orderBy: { nome: 'asc' },
    })
    return us.map(formatar)
  })

  app.post('/usuarios', async (req, reply) => {
    const role = req.usuario.role
    const ehSindico = role === 'sindico'
    if (!ehAdmin(role) && !ehSindico) return reply.code(403).send({ erro: 'Sem permissão' })
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = parsed.data
    if (ehSindico && d.role !== 'vistoriador') return reply.code(403).send({ erro: 'Síndico só pode cadastrar funcionários' })
    const existing = await prisma.usuario.findUnique({ where: { email: d.email.toLowerCase() } })
    if (existing) return reply.code(409).send({ erro: 'Email já cadastrado' })
    const u = await prisma.usuario.create({
      data: {
        empresaId: req.usuario.empresaId,
        nome: d.nome,
        email: d.email.toLowerCase(),
        senhaHash: await bcrypt.hash(d.senha, 10),
        role: d.role,
      },
    })
    return reply.code(201).send(formatar(u))
  })

  app.patch('/usuarios/:id', async (req, reply) => {
    const role = req.usuario.role
    const ehSindico = role === 'sindico'
    if (!ehAdmin(role) && !ehSindico) return reply.code(403).send({ erro: 'Sem permissão' })
    const { id } = req.params as { id: string }
    const parsed = atualizarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const u = await prisma.usuario.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!u) return reply.code(404).send({ erro: 'Não encontrado' })
    if (ehSindico && u.role !== 'vistoriador') return reply.code(403).send({ erro: 'Síndico só pode gerenciar funcionários' })
    const d = parsed.data
    const atualizado = await prisma.usuario.update({
      where: { id },
      data: {
        nome: d.nome,
        email: d.email?.toLowerCase(),
        role: d.role,
        ativo: d.ativo,
        permissoes: d.permissoes,
        senhaHash: d.senha ? await bcrypt.hash(d.senha, 10) : undefined,
      },
    })
    return formatar(atualizado)
  })

  app.delete('/usuarios/:id', async (req, reply) => {
    if (!ehAdmin(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })
    const { id } = req.params as { id: string }
    if (id === req.usuario.id) return reply.code(400).send({ erro: 'Não é possível excluir o próprio usuário' })
    const u = await prisma.usuario.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!u) return reply.code(404).send({ erro: 'Não encontrado' })
    await prisma.usuario.delete({ where: { id } })
    return reply.code(204).send()
  })
}
