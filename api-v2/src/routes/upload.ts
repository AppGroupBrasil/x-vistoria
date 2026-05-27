import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma.js'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const PUBLIC_URL = process.env.PUBLIC_URL || ''

export default async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })

  app.get('/upload/fotos/visita/:visitaId', async (req) => {
    const { visitaId } = req.params as { visitaId: string }
    const fotos = await prisma.foto.findMany({
      where: { visitaId, visita: { empresaId: req.usuario.empresaId } },
      orderBy: { criadoEm: 'desc' },
    })
    return fotos.map((f) => ({
      id: f.id,
      visita_id: f.visitaId,
      pergunta_id: f.perguntaId,
      url: f.url,
      thumbnail_url: f.thumbnailUrl,
      criado_em: f.criadoEm,
    }))
  })

  app.post('/upload', async (req, reply) => {
    const parts = req.parts()
    let fileBuffer: Buffer | null = null
    let fileName = ''
    let visitaId = ''
    let perguntaId: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
        fileName = part.filename
      } else if (part.fieldname === 'visita_id') visitaId = String(part.value)
      else if (part.fieldname === 'pergunta_id') perguntaId = String(part.value)
    }

    if (!fileBuffer || !visitaId) return reply.code(400).send({ erro: 'file e visita_id são obrigatórios' })

    const v = await prisma.visita.findFirst({ where: { id: visitaId, empresaId: req.usuario.empresaId } })
    if (!v) return reply.code(404).send({ erro: 'Visita não encontrada' })

    const ext = path.extname(fileName) || '.jpg'
    const novoNome = `${randomUUID()}${ext}`
    const destino = path.join(UPLOAD_DIR, novoNome)
    await writeFile(destino, fileBuffer)
    const url = `${PUBLIC_URL}/uploads/${novoNome}`

    const foto = await prisma.foto.create({
      data: { visitaId, perguntaId, url, thumbnailUrl: url },
    })
    return reply.code(201).send({
      id: foto.id,
      visita_id: foto.visitaId,
      pergunta_id: foto.perguntaId,
      url: foto.url,
      thumbnail_url: foto.thumbnailUrl,
    })
  })

  // Upload avulso (sem vinculo com Visita) — usado pela Vistoria Simples
  app.post('/upload/avulso', async (req, reply) => {
    const parts = req.parts()
    let fileBuffer: Buffer | null = null
    let fileName = ''
    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
        fileName = part.filename
      }
    }
    if (!fileBuffer) return reply.code(400).send({ erro: 'arquivo obrigatório' })
    const ext = (path.extname(fileName) || '.jpg').toLowerCase()
    const novoNome = `${randomUUID()}${ext}`
    const destino = path.join(UPLOAD_DIR, novoNome)
    await writeFile(destino, fileBuffer)
    return reply.code(201).send({ url: `${PUBLIC_URL}/uploads/${novoNome}` })
  })

  app.delete('/upload/fotos/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const f = await prisma.foto.findFirst({
      where: { id, visita: { empresaId: req.usuario.empresaId } },
    })
    if (!f) return reply.code(404).send({ erro: 'Foto não encontrada' })
    await prisma.foto.delete({ where: { id } })
    return reply.code(204).send()
  })
}
