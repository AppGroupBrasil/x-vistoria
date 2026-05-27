import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync, createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import OpenAI from 'openai'

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'

function clientGroq() {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key, baseURL: GROQ_BASE })
}
function clientDeepSeek() {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key, baseURL: DEEPSEEK_BASE })
}

const TMP_DIR = path.join(tmpdir(), 'xv-ai')

async function corrigir(deepseek: OpenAI, textoBruto: string, ctx: { pergunta: string; condominio: string; categoria: string }) {
  const prompt = `Você é um assistente especializado em vistorias condominiais.

Um supervisor de condomínio gravou uma observação por áudio. O texto abaixo foi transcrito automaticamente e pode conter erros de pronúncia, gírias ou linguagem informal.

Contexto da vistoria:
- Condomínio: ${ctx.condominio}
- Categoria: ${ctx.categoria}
- Pergunta: ${ctx.pergunta}

Texto transcrito:
"${textoBruto}"

Reescreva esse texto de forma clara, profissional e adequada para um relatório de vistoria condominial. Mantenha o sentido original. Corrija erros gramaticais e de português. Não invente informações que não estão no texto original. Responda APENAS com o texto corrigido, sem explicações.`

  const resp = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 512,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })
  return resp.choices?.[0]?.message?.content?.trim() || textoBruto
}

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)
  if (!existsSync(TMP_DIR)) await mkdir(TMP_DIR, { recursive: true })

  app.post('/ai/transcrever', async (req, reply) => {
    const groq = clientGroq()
    const deepseek = clientDeepSeek()
    if (!groq) return reply.code(503).send({ erro: 'Transcrição indisponível (GROQ_API_KEY ausente)' })

    let audioBuffer: Buffer | null = null
    let audioName = 'audio.webm'
    let pergunta = ''
    let condominio = ''
    let categoria = ''

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        audioBuffer = await part.toBuffer()
        audioName = part.filename || audioName
      } else if (part.fieldname === 'pergunta') pergunta = String(part.value || '')
      else if (part.fieldname === 'condominio') condominio = String(part.value || '')
      else if (part.fieldname === 'categoria') categoria = String(part.value || '')
    }

    if (!audioBuffer || audioBuffer.length < 512) {
      return reply.code(400).send({ erro: 'Arquivo de áudio ausente ou muito pequeno' })
    }

    const ext = (path.extname(audioName) || '.webm').toLowerCase()
    const tmpPath = path.join(TMP_DIR, `${randomUUID()}${ext}`)
    await writeFile(tmpPath, audioBuffer)

    try {
      const transcription = await groq.audio.transcriptions.create({
        file: createReadStream(tmpPath) as any,
        model: 'whisper-large-v3-turbo',
        language: 'pt',
        response_format: 'text',
      })
      const textoBruto = (transcription as unknown as string) || ''
      let textoCorrigido = textoBruto
      if (deepseek && textoBruto.trim()) {
        try {
          textoCorrigido = await corrigir(deepseek, textoBruto, { pergunta, condominio, categoria })
        } catch (e: any) {
          app.log.warn({ err: e?.message }, 'Falha na correção DeepSeek — devolvendo texto bruto')
        }
      }
      return { transcricao_bruta: textoBruto, transcricao_corrigida: textoCorrigido }
    } catch (e: any) {
      app.log.error({ err: e?.message }, 'Falha Groq Whisper')
      return reply.code(502).send({ erro: e?.message || 'Falha na transcrição' })
    } finally {
      try { await unlink(tmpPath) } catch {}
    }
  })

  app.post('/ai/corrigir', async (req, reply) => {
    const deepseek = clientDeepSeek()
    if (!deepseek) return reply.code(503).send({ erro: 'Correção indisponível (DEEPSEEK_API_KEY ausente)' })
    const body = (req.body || {}) as { texto?: string; pergunta?: string; condominio?: string; categoria?: string }
    if (!body.texto?.trim()) return reply.code(400).send({ erro: 'Texto é obrigatório' })
    try {
      const texto = await corrigir(deepseek, body.texto, {
        pergunta: body.pergunta || '', condominio: body.condominio || '', categoria: body.categoria || '',
      })
      return { texto_corrigido: texto }
    } catch (e: any) {
      app.log.error({ err: e?.message }, 'Falha DeepSeek')
      return reply.code(502).send({ erro: e?.message || 'Falha na correção' })
    }
  })
}
