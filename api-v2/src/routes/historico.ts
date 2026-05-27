import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

function formatar(v: any, fallbackNome: string) {
  return {
    id: v.id,
    protocolo: v.protocolo,
    status: v.status,
    condominio_nome: v.condominio?.nome ?? fallbackNome,
    condominio_endereco: v.condominio?.endereco ?? null,
    vistoriador_nome: v.vistoriador?.nome ?? fallbackNome,
    template_nome: v.template?.nome ?? null,
    observacoes: v.observacoes,
    criado_em: v.criadoEm,
    iniciada_em: v.iniciadaEm,
    finalizada_em: v.finalizadaEm,
    lat_inicio: v.latInicio, lng_inicio: v.lngInicio,
    lat_fim: v.latFim, lng_fim: v.lngFim,
    total_perguntas: v.template?._count?.perguntas ?? v.respostas?.length ?? 0,
    total_respondidas: v.respostas?.length ?? 0,
  }
}

export default async function historicoRoutes(app: FastifyInstance) {
  app.get('/historico', { preHandler: [app.autenticar] }, async (req) => {
    const me = await prisma.usuario.findUnique({ where: { id: req.usuario.id } })
    const vs = await prisma.visita.findMany({
      where: { empresaId: req.usuario.empresaId },
      include: {
        condominio: true,
        vistoriador: true,
        template: { include: { _count: { select: { perguntas: true } } } },
        respostas: { select: { id: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })
    return vs.map((v) => formatar(v, me?.nome ?? 'Sem nome'))
  })

  app.get('/historico/:id', { preHandler: [app.autenticar] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const me = await prisma.usuario.findUnique({ where: { id: req.usuario.id } })
    const v = await prisma.visita.findFirst({
      where: { id, empresaId: req.usuario.empresaId },
      include: {
        condominio: true,
        vistoriador: true,
        template: {
          include: {
            perguntas: { include: { pergunta: true }, orderBy: { ordem: 'asc' } },
          },
        },
        respostas: true,
        fotos: true,
        pendencias: true,
      },
    })
    if (!v) return reply.code(404).send({ erro: 'Vistoria não encontrada' })

    const respPorPergunta = new Map(v.respostas.map((r) => [r.perguntaId, r]))
    const perguntas = (v.template?.perguntas ?? []).map((tp) => {
      const r: any = respPorPergunta.get(tp.perguntaId)
      return {
        id: tp.pergunta.id,
        texto: tp.pergunta.texto,
        ordem: tp.ordem,
        resposta: r ? {
          resultado: r.resultado, observacao: r.observacao,
          titulo: r.titulo, descricao: r.descricao, status: r.status,
          problema: r.problema, ocorrencia: r.ocorrencia, notificacao: r.notificacao,
          limpeza: r.limpeza, conservacao: r.conservacao,
          validade: r.validade, local_exato: r.localExato,
          assinatura: r.assinatura, prazo: r.prazo,
        } : null,
        fotos: v.fotos.filter((f) => f.perguntaId === tp.pergunta.id).map((f) => ({ id: f.id, url: f.url })),
      }
    })

    return {
      ...formatar(v, me?.nome ?? 'Sem nome'),
      perguntas,
      pendencias: v.pendencias.map((p) => ({
        id: p.id, titulo: p.titulo, descricao: p.descricao,
        prioridade: p.prioridade, status: p.status,
      })),
      fotos_gerais: v.fotos.filter((f) => !f.perguntaId).map((f) => ({ id: f.id, url: f.url })),
    }
  })

  // Versão pública (sem autenticação) — usada pelo QR Code impresso
  app.get('/publico/visita/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const v = await prisma.visita.findUnique({
      where: { id },
      include: {
        condominio: true,
        vistoriador: true,
        template: { include: { perguntas: { include: { pergunta: true }, orderBy: { ordem: 'asc' } } } },
        respostas: true,
        fotos: true,
        empresa: true,
      },
    })
    if (!v) return reply.code(404).send({ erro: 'Não encontrada' })

    const respPorPergunta = new Map(v.respostas.map((r) => [r.perguntaId, r]))
    const perguntas = (v.template?.perguntas ?? []).map((tp) => {
      const r: any = respPorPergunta.get(tp.perguntaId)
      return {
        id: tp.pergunta.id,
        texto: tp.pergunta.texto,
        resposta: r ? { resultado: r.resultado, observacao: r.observacao } : null,
        fotos: v.fotos.filter((f) => f.perguntaId === tp.pergunta.id).map((f) => ({ id: f.id, url: f.url })),
      }
    })

    return {
      protocolo: v.protocolo,
      empresa_nome: v.empresa.nome,
      condominio_nome: v.condominio?.nome,
      condominio_endereco: v.condominio?.endereco,
      vistoriador_nome: v.vistoriador?.nome,
      iniciada_em: v.iniciadaEm,
      finalizada_em: v.finalizadaEm,
      perguntas,
    }
  })
}
