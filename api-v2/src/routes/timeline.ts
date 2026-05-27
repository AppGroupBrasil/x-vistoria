import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

const ROLES_PERMITIDOS = new Set(['master', 'admin', 'sindico', 'supervisor'])

function contarItens(itens: any) {
  if (!Array.isArray(itens)) return { fotos: 0, textos: 0, ocorrencias: 0 }
  let fotos = 0, textos = 0, ocorrencias = 0
  for (const it of itens) {
    if (!it || typeof it !== 'object') continue
    if (it.foto?.url) fotos++
    if (it.antes?.url) fotos++
    if (it.depois?.url) fotos++
    if (it.problemaFoto?.url) fotos++
    if (Array.isArray(it.fotosExtras)) fotos += it.fotosExtras.length
    if (it.descricao?.trim?.()) textos++
    if (it.resposta?.trim?.()) textos++
    if (it.problemaDesc?.trim?.()) textos++
    if (it.ocFoto?.url || it.ocDescricao?.trim?.()) ocorrencias++
  }
  return { fotos, textos, ocorrencias }
}

function primeiraFoto(itens: any): string | null {
  if (!Array.isArray(itens)) return null
  for (const it of itens) {
    if (it?.foto?.url) return it.foto.url
    if (it?.antes?.url) return it.antes.url
    if (it?.problemaFoto?.url) return it.problemaFoto.url
    if (Array.isArray(it?.fotosExtras) && it.fotosExtras[0]?.url) return it.fotosExtras[0].url
  }
  return null
}

export default async function timelineRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.get('/timeline', async (req, reply) => {
    if (!ROLES_PERMITIDOS.has(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })

    const vs = await prisma.vistoriaSimples.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { iniciadaEm: 'desc' },
      take: 50,
      include: { vistoriador: { select: { id: true, nome: true } } },
    })

    return vs.map((v) => {
      const counts = contarItens(v.itens)
      const inicio = v.iniciadaEm
      const fim = v.finalizadaEm
      const duracaoSeg = inicio && fim ? Math.round((fim.getTime() - inicio.getTime()) / 1000) : null
      return {
        id: v.id,
        protocolo: v.protocolo,
        tipo: v.tipo,
        condominio: v.condominioNome || null,
        endereco: v.endereco || null,
        vistoriador_id: v.vistoriadorId,
        vistoriador_nome: v.vistoriador?.nome || '—',
        iniciada_em: v.iniciadaEm,
        finalizada_em: v.finalizadaEm,
        duracao_segundos: duracaoSeg,
        lat_inicio: v.latInicio,
        lng_inicio: v.lngInicio,
        lat_fim: v.latFim,
        lng_fim: v.lngFim,
        fotos: counts.fotos,
        textos: counts.textos,
        ocorrencias: counts.ocorrencias,
        capa: primeiraFoto(v.itens),
      }
    })
  })
}
