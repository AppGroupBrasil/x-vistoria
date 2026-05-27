import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64',
)

function clienteEmailDeUA(ua: string): string {
  const u = ua.toLowerCase()
  if (u.includes('googleimageproxy')) return 'Gmail (proxy)'
  if (u.includes('yahoomailproxy')) return 'Yahoo Mail (proxy)'
  if (u.includes('mail.com')) return 'Mail.com'
  if (u.includes('outlook')) return 'Outlook'
  if (u.includes('thunderbird')) return 'Thunderbird'
  if (u.includes('applewebkit') && u.includes('mobile') && (u.includes('iphone') || u.includes('ipad'))) {
    if (u.includes('gmail')) return 'Gmail no iPhone/iPad'
    return 'Apple Mail (iPhone/iPad)'
  }
  if (u.includes('macintosh') && u.includes('applewebkit')) return 'Apple Mail (Mac)'
  if (u.includes('android')) {
    if (u.includes('gmail')) return 'Gmail Android'
    return 'Android'
  }
  if (u.includes('windows')) return 'Windows'
  return 'Desconhecido'
}

export default async function trackingRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/track/notif/:id/open.png', async (req, reply) => {
    const id = req.params.id
    try {
      const ua = (req.headers['user-agent'] as string) || ''
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || ''
      const n = await prisma.notificacaoEnviada.findUnique({ where: { id } })
      if (n) {
        await prisma.notificacaoEnviada.update({
          where: { id },
          data: {
            aberturas: { increment: 1 },
            ...(n.abertoEm ? {} : {
              abertoEm: new Date(),
              abertoUa: ua.slice(0, 500),
              abertoIp: ip.toString().slice(0, 80),
              abertoCliente: clienteEmailDeUA(ua),
            }),
          },
        })
      }
    } catch { /* nunca quebrar o pixel */ }
    reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(PIXEL_GIF)
  })

  app.get<{ Params: { id: string }, Querystring: { u?: string } }>('/track/notif/:id/click', async (req, reply) => {
    const id = req.params.id
    const url = req.query.u || '/'
    try {
      await prisma.notificacaoEnviada.update({
        where: { id },
        data: { clicadoEm: new Date() },
      })
    } catch { /* ignore */ }
    reply.redirect(url, 302)
  })
}
