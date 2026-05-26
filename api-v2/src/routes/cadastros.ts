import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { gerarProtocolo } from '../lib/protocolo.js'

const perguntaSchema = z.object({
  texto: z.string().min(1),
  requer_foto: z.boolean().optional().default(false),
  requer_descricao: z.boolean().optional().default(false),
  requer_titulo: z.boolean().optional().default(false),
  requer_status: z.boolean().optional().default(false),
  requer_problema: z.boolean().optional().default(false),
  requer_ocorrencia: z.boolean().optional().default(false),
  requer_notificacao: z.boolean().optional().default(false),
})

const cadastroSchema = z.object({
  condominio_nome: z.string().min(2),
  funcionario_nome: z.string().min(2),
  periodicidade: z.enum(['Diária', 'Semanal', 'Quinzenal', 'Mensal']).optional(),
  perguntas: z.array(perguntaSchema).min(1),
  salvar_modelo: z.boolean().default(false),
  nome_modelo: z.string().optional(),
})

// Endpoint único: cria/reaproveita condomínio + funcionário, cria perguntas + template + visita
export default async function cadastrosRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.autenticar)

  app.post('/cadastros', async (req, reply) => {
    const parsed = cadastroSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ erro: 'Dados inválidos', detalhe: parsed.error.flatten() })
    }
    const d = parsed.data
    const empresaId = req.usuario.empresaId

    const result = await prisma.$transaction(async (tx) => {
      // 1. Condomínio (reaproveita se já existe pelo nome)
      let condominio = await tx.condominio.findFirst({
        where: { empresaId, nome: { equals: d.condominio_nome, mode: 'insensitive' } },
      })
      if (!condominio) {
        condominio = await tx.condominio.create({
          data: { empresaId, nome: d.condominio_nome },
        })
      }

      // 2. Funcionário (vistoriador). Tenta achar por nome dentro da empresa.
      let funcionario = await tx.usuario.findFirst({
        where: { empresaId, nome: { equals: d.funcionario_nome, mode: 'insensitive' } },
      })
      if (!funcionario) {
        const emailSlug = d.funcionario_nome.toLowerCase().normalize('NFD')
          .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
        const senhaHash = await bcrypt.hash('123456', 10)
        funcionario = await tx.usuario.create({
          data: {
            empresaId,
            nome: d.funcionario_nome,
            email: `${emailSlug}.${Date.now()}@vistoriador.local`,
            senhaHash,
            role: 'vistoriador',
          },
        })
      }

      // 3. Perguntas com flags
      const perguntasCriadas = await Promise.all(
        d.perguntas.map((p, idx) =>
          tx.pergunta.create({
            data: {
              empresaId,
              texto: p.texto,
              ordem: idx,
              requerFoto: p.requer_foto,
              requerDescricao: p.requer_descricao,
              requerTitulo: p.requer_titulo,
              requerStatus: p.requer_status,
              requerProblema: p.requer_problema,
              requerOcorrencia: p.requer_ocorrencia,
              requerNotificacao: p.requer_notificacao,
            },
          }),
        ),
      )

      // 4. Template (sempre criado; nome custom se "Salvar modelo = sim")
      const template = await tx.template.create({
        data: {
          empresaId,
          nome: d.salvar_modelo && d.nome_modelo
            ? d.nome_modelo
            : `${condominio.nome} — ${new Date().toLocaleDateString('pt-BR')}`,
          descricao: d.periodicidade ? `Periodicidade: ${d.periodicidade}` : null,
          perguntas: {
            create: perguntasCriadas.map((p, idx) => ({ perguntaId: p.id, ordem: idx })),
          },
        },
      })

      // 5. Visita já agendada
      const visita = await tx.visita.create({
        data: {
          empresaId,
          condominioId: condominio.id,
          templateId: template.id,
          vistoriadorId: funcionario.id,
          criadorId: req.usuario.id,
          protocolo: gerarProtocolo(),
          observacoes: d.periodicidade ? `Periodicidade: ${d.periodicidade}` : null,
        },
      })

      return { condominio, funcionario, template, visita }
    })

    return reply.code(201).send({
      condominio_id: result.condominio.id,
      condominio_nome: result.condominio.nome,
      funcionario_id: result.funcionario.id,
      funcionario_nome: result.funcionario.nome,
      template_id: result.template.id,
      template_nome: result.template.nome,
      visita_id: result.visita.id,
      protocolo: result.visita.protocolo,
    })
  })
}
