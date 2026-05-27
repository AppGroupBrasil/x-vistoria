import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { gerarProtocolo } from '../lib/protocolo.js'

const TIPOS = ['foto_descricao', 'checklist', 'pergunta_resposta', 'conformidade', 'antes_depois', 'avaliacao'] as const

const criarSchema = z.object({
  tipo: z.enum(TIPOS),
  itens: z.array(z.any()).min(1),
  iniciada_em: z.string().datetime(),
  finalizada_em: z.string().datetime(),
  lat_inicio: z.number().optional(),
  lng_inicio: z.number().optional(),
  lat_fim: z.number().optional(),
  lng_fim: z.number().optional(),
})

export default async function vistoriaSimplesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.post('/vistoria-simples', async (req, reply) => {
    const parsed = criarSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ erro: 'Dados inválidos', detalhe: parsed.error.flatten() })
    const d = parsed.data

    const v = await prisma.vistoriaSimples.create({
      data: {
        empresaId: req.usuario.empresaId,
        vistoriadorId: req.usuario.id,
        tipo: d.tipo,
        protocolo: gerarProtocolo(),
        itens: d.itens,
        iniciadaEm: new Date(d.iniciada_em),
        finalizadaEm: new Date(d.finalizada_em),
        latInicio: d.lat_inicio,
        lngInicio: d.lng_inicio,
        latFim: d.lat_fim,
        lngFim: d.lng_fim,
      },
    })
    return reply.code(201).send({ id: v.id, protocolo: v.protocolo })
  })

  app.get('/vistoria-simples/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const v = await prisma.vistoriaSimples.findFirst({
      where: { id, empresaId: req.usuario.empresaId },
      include: { vistoriador: true },
    })
    if (!v) return reply.code(404).send({ erro: 'Não encontrada' })
    return {
      id: v.id,
      tipo: v.tipo,
      protocolo: v.protocolo,
      itens: v.itens,
      vistoriador_nome: v.vistoriador.nome,
      iniciada_em: v.iniciadaEm,
      finalizada_em: v.finalizadaEm,
      lat_inicio: v.latInicio, lng_inicio: v.lngInicio,
      lat_fim: v.latFim, lng_fim: v.lngFim,
      criado_em: v.criadoEm,
    }
  })
}
