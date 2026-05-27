import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { enviarEmail, smtpDisponivel } from '../lib/mailer.js'

const criar = z.object({
  morador_id: z.string().nullable().optional(),
  morador_nome: z.string().optional().default(''),
  email_destino: z.string().email().optional().nullable(),
  titulo: z.string().min(1),
  descricao: z.string().min(1),
  imagens: z.array(z.object({ url: z.string(), nome: z.string().optional() })).optional().default([]),
  canais: z.array(z.enum(['email', 'whatsapp'])).min(1),
})

function fmt(n: any) {
  return {
    id: n.id,
    data: n.criadoEm,
    morador_id: n.moradorId || null,
    morador_nome: n.moradorNome || '',
    email_destino: n.emailDestino || null,
    titulo: n.titulo,
    descricao: n.descricao,
    imagens: n.imagens || [],
    canais: n.canais || [],
    enviado_email: !!n.enviadoEmail,
    aberto_em: n.abertoEm || null,
    aberto_cliente: n.abertoCliente || null,
    aberto_ua: n.abertoUa || null,
    aberturas: n.aberturas || 0,
    clicado_em: n.clicadoEm || null,
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function montarHtml(titulo: string, descricao: string, imagens: { url: string; nome?: string }[], pixelUrl: string) {
  const imgsHtml = imagens.map((i) => `<div style="margin:8px 0"><img src="${i.url}" alt="${escapeHtml(i.nome || '')}" style="max-width:100%;border-radius:8px"/></div>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
      <div style="font-size:12px;color:#6b7280;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:8px">X Vistoria · Notificação</div>
      <h1 style="font-size:20px;margin:0 0 12px;color:#0B1D35">${escapeHtml(titulo)}</h1>
      <div style="font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(descricao)}</div>
      ${imgsHtml}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
      <div style="font-size:11px;color:#9ca3af">Esta é uma notificação automática enviada pelo sistema X Vistoria.</div>
    </div>
  </div>
  <img src="${pixelUrl}" alt="" width="1" height="1" style="display:block;border:0"/>
  </body></html>`
}

const PODE_ENVIAR = new Set(['master', 'admin', 'sindico', 'supervisor', 'vistoriador'])

export default async function notificacoesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)
  app.addHook('preHandler', async (req, reply) => {
    if (req.method === 'POST' && !PODE_ENVIAR.has(req.usuario.role)) return reply.code(403).send({ erro: 'Sem permissão' })
  })

  app.get('/notificacoes', async (req) => {
    const ns = await prisma.notificacaoEnviada.findMany({
      where: { empresaId: req.usuario.empresaId },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })
    return ns.map(fmt)
  })

  app.post('/notificacoes', async (req, reply) => {
    const p = criar.safeParse(req.body)
    if (!p.success) return reply.code(400).send({ erro: 'Dados inválidos' })
    const d = p.data
    let moradorNome = d.morador_nome || ''
    let emailDestino = d.email_destino || null
    if (d.morador_id) {
      const m = await prisma.morador.findFirst({ where: { id: d.morador_id, empresaId: req.usuario.empresaId } })
      if (m) {
        moradorNome = m.nome
        if (!emailDestino) emailDestino = m.email || null
      }
    }

    const n = await prisma.notificacaoEnviada.create({
      data: {
        empresaId: req.usuario.empresaId,
        autorId: req.usuario.id,
        moradorId: d.morador_id || null,
        moradorNome,
        emailDestino,
        titulo: d.titulo.trim(),
        descricao: d.descricao.trim(),
        imagens: d.imagens as any,
        canais: d.canais,
      },
    })

    let avisoEmail: string | null = null
    if (d.canais.includes('email') && emailDestino) {
      if (!smtpDisponivel()) {
        avisoEmail = 'SMTP não configurado — abertura de e-mail não pode ser rastreada. Configure SMTP_HOST/SMTP_USER/SMTP_PASS.'
      } else {
        try {
          const base = process.env.PUBLIC_URL || ''
          const pixelUrl = `${base}/api/v1/track/notif/${n.id}/open.png`
          const html = montarHtml(d.titulo.trim(), d.descricao.trim(), d.imagens, pixelUrl)
          await enviarEmail({ para: emailDestino, assunto: d.titulo.trim(), html })
          await prisma.notificacaoEnviada.update({ where: { id: n.id }, data: { enviadoEmail: true } })
        } catch (e: any) {
          avisoEmail = e?.message || 'Falha ao enviar e-mail'
        }
      }
    }

    const novo = await prisma.notificacaoEnviada.findUnique({ where: { id: n.id } })
    return reply.code(201).send({ ...fmt(novo), aviso_email: avisoEmail })
  })
}
