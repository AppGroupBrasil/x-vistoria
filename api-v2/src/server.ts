import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import visitasRoutes from './routes/visitas.js'
import checklistRoutes from './routes/checklist.js'
import condominiosRoutes from './routes/condominios.js'
import pendenciasRoutes from './routes/pendencias.js'
import mensagensRoutes from './routes/mensagens.js'
import uploadRoutes from './routes/upload.js'
import usuariosRoutes from './routes/usuarios.js'
import templatesRoutes from './routes/templates.js'
import cadastrosRoutes from './routes/cadastros.js'
import atribuicoesRoutes from './routes/atribuicoes.js'
import historicoRoutes from './routes/historico.js'

const app = Fastify({ logger: { level: 'info' } })

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

await app.register(cors, { origin: true, credentials: true })
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } })
await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: '/uploads/' })
await app.register(authPlugin)

app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

await app.register(async (api) => {
  await api.register(authRoutes)
  await api.register(visitasRoutes)
  await api.register(checklistRoutes)
  await api.register(condominiosRoutes)
  await api.register(pendenciasRoutes)
  await api.register(mensagensRoutes)
  await api.register(uploadRoutes)
  await api.register(usuariosRoutes)
  await api.register(templatesRoutes)
  await api.register(cadastrosRoutes)
  await api.register(atribuicoesRoutes)
  await api.register(historicoRoutes)
}, { prefix: '/api/v1' })

const port = Number(process.env.PORT || 5100)
const host = process.env.HOST || '0.0.0.0'

app.listen({ port, host }).then(() => {
  app.log.info(`X Vistoria API rodando em http://${host}:${port}`)
}).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
