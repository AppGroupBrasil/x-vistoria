import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { gerarProtocolo } from '../lib/protocolo.js'

const criarSchema = z.object({
  condominio_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  vistoriador_id: z.string().uuid().optional(),
})

const finalizarSchema = z.object({
  observacoes: z.string().optional(),
})

function formatar(v: any) {
  return {
    id: v.id,
    protocolo: v.protocolo,
    status: v.status,
    observacoes: v.observacoes,
    condominio_id: v.condominioId,
    condominio_nome: v.condominio?.nome,
    condominio_endereco: v.condominio?.endereco,
    template_id: v.templateId,
    vistoriador_id: v.vistoriadorId,
    vistoriador_nome: v.vistoriador?.nome,
    iniciada_em: v.iniciadaEm,
    finalizada_em: v.finalizadaEm,
    criado_em: v.criadoEm,
  }
}

export default async function visitasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/visitas', async (req) => {
    const { empresaId, id: userId, role } = req.usuario
    const where: any = { empresaId }
    if (role === 'vistoriador') where.vistoriadorId = userId

    const visitas = await prisma.visita.findMany({
      where,
      include: { condominio: true, vistoriador: true },
      orderBy: { criadoEm: 'desc' },
    })
    return visitas.map(formatar)
  })

  app.get('/visitas/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const v = await prisma.visita.findFirst({
      where: { id, empresaId: req.usuario.empresaId },
      include: { condominio: true, vistoriador: true },
    })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })
    return formatar(v)
  })

  app.post('/visitas', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const { condominio_id, template_id, vistoriador_id } = parsed.data

    const cond = await prisma.condominio.findFirst({ where: { id: condominio_id, empresaId: req.usuario.empresaId } })
    if (!cond) return reply.code(404).send({ erro: 'Condomínio não encontrado' })

    const v = await prisma.visita.create({
      data: {
        empresaId: req.usuario.empresaId,
        condominioId: condominio_id,
        templateId: template_id,
        vistoriadorId: vistoriador_id ?? req.usuario.id,
        criadorId: req.usuario.id,
        protocolo: gerarProtocolo(),
        status: 'nao_iniciada',
      },
      include: { condominio: true, vistoriador: true },
    })
    return reply.code(201).send(formatar(v))
  })

  // PATCH /visitas/:id/:acao — iniciar | pausar | finalizar
  app.patch('/visitas/:id/:acao', async (req, reply) => {
    const { id, acao } = req.params as { id: string; acao: string }
    const v = await prisma.visita.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })

    if (acao === 'iniciar') {
      const atualizada = await prisma.visita.update({
        where: { id },
        data: { status: 'em_andamento', iniciadaEm: v.iniciadaEm ?? new Date() },
        include: { condominio: true, vistoriador: true },
      })
      return formatar(atualizada)
    }
    if (acao === 'pausar') {
      const atualizada = await prisma.visita.update({
        where: { id },
        data: { status: 'pausada' },
        include: { condominio: true, vistoriador: true },
      })
      return formatar(atualizada)
    }
    if (acao === 'finalizar') {
      const parsed = finalizarSchema.safeParse(req.body ?? {})
      if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos' })
      const atualizada = await prisma.visita.update({
        where: { id },
        data: {
          status: 'aguardando_aprovacao',
          finalizadaEm: new Date(),
          observacoes: parsed.data.observacoes ?? v.observacoes,
        },
        include: { condominio: true, vistoriador: true },
      })
      return formatar(atualizada)
    }
    if (acao === 'aprovar') {
      const atualizada = await prisma.visita.update({
        where: { id },
        data: { status: 'aprovada' },
        include: { condominio: true, vistoriador: true },
      })
      return formatar(atualizada)
    }

    return reply.code(400).send({ erro: `Ação desconhecida: ${acao}` })
  })

  app.delete('/visitas/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const v = await prisma.visita.findFirst({ where: { id, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })
    await prisma.visita.delete({ where: { id } })
    return reply.code(204).send()
  })
}
