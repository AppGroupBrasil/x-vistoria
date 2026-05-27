import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | null = null
let configurado = false

export function smtpDisponivel() {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS
}

function obter() {
  if (transporter || configurado) return transporter
  configurado = true
  if (!smtpDisponivel()) return null
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  })
  return transporter
}

export async function enviarEmail(opts: { para: string; assunto: string; html: string; texto?: string }) {
  const t = obter()
  if (!t) throw new Error('SMTP não configurado (defina SMTP_HOST/SMTP_USER/SMTP_PASS)')
  const from = process.env.SMTP_FROM || `X Vistoria <${process.env.SMTP_USER}>`
  await t.sendMail({ from, to: opts.para, subject: opts.assunto, html: opts.html, text: opts.texto })
}
