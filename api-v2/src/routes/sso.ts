import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

// ─────────────────────────────────────────────────────────────────────────────
// SSO da central (App Condomínio) — login único.
// A central assina o token com a chave PRIVADA (RS256); aqui verificamos só pela
// chave PÚBLICA do JWKS — nada a vazar. O hub redireciona para ${site}/sso?token=
// <JWT curto> → o front faz POST /api/v1/sso { token } → verifica RS256/JWKS →
// JIT provisiona empresa+usuário → devolve a MESMA resposta do login local
// (access_token HS256 de 30d + usuario). O usuário é casado por email (idempotente).
// ─────────────────────────────────────────────────────────────────────────────

const ISS = 'auth-central'
const AUDIENCE = process.env.SSO_AUDIENCE || 'xvistoria'
const JWKS_URL = process.env.SSO_JWKS_URL || 'https://auth.appgroupbrasil.com.br/api/v1/sso/jwks.json'

const JWKS_TTL = 5 * 60 * 1000
let jwksCache: Map<string, string> | null = null
let jwksCacheAt = 0

async function carregarJwks(): Promise<Map<string, string>> {
  if (jwksCache && Date.now() - jwksCacheAt < JWKS_TTL) return jwksCache
  const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`JWKS ${res.status}`)
  const body: any = await res.json()
  const pems = new Map<string, string>()
  for (const k of body.keys || []) {
    if (k.kty !== 'RSA') continue
    const pem = crypto.createPublicKey({ key: k, format: 'jwk' }).export({ type: 'spki', format: 'pem' }) as string
    pems.set(k.kid || 'default', pem)
  }
  jwksCache = pems
  jwksCacheAt = Date.now()
  return pems
}

const jsonSeg = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))

async function verificarSso(token: string): Promise<any> {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) throw new Error('formato')
  const head = jsonSeg(h)
  const pems = await carregarJwks()
  const candidatos = head.kid && pems.has(head.kid) ? [pems.get(head.kid)!] : [...pems.values()]
  if (candidatos.length === 0) throw new Error('JWKS sem chave RSA')
  const assinado = `${h}.${p}`
  const sig = Buffer.from(s, 'base64url')
  const ok = candidatos.some(pem => crypto.createVerify('RSA-SHA256').update(assinado).verify(pem, sig))
  if (!ok) throw new Error('assinatura inválida')
  const c = jsonSeg(p)
  const agora = Math.floor(Date.now() / 1000)
  if (c.iss !== ISS) throw new Error('iss inválido')
  if (c.aud !== AUDIENCE) throw new Error('aud inválido')
  if (c.exp && c.exp < agora - 30) throw new Error('token expirado')
  return c
}

function mapearRole(perfil: string): 'master' | 'supervisor' | 'admin' {
  const r = (perfil || '').toLowerCase()
  if (r === 'superadmin' || r === 'master') return 'master'
  if (r === 'supervisor') return 'supervisor'
  return 'admin'
}

export default async function ssoRoutes(app: FastifyInstance) {
  app.post('/sso', async (req, reply) => {
    const token = (req.body as any)?.token
    if (!token || typeof token !== 'string') return reply.code(400).send({ erro: 'Token ausente' })

    let c: any
    try {
      c = await verificarSso(token)
    } catch (err: any) {
      app.log.warn({ msg: '[SSO] falha', detalhe: err?.message })
      return reply.code(401).send({ erro: 'SSO inválido' })
    }

    const email = String(c.email || '').toLowerCase().trim()
    if (!email) return reply.code(401).send({ erro: 'SSO sem email' })
    const nome = c.nome || email
    const role = mapearRole(c.perfil)

    // JIT idempotente por email: regrava nome/role (read-only da central); cria empresa+usuário se novo.
    let user = await prisma.usuario.findUnique({ where: { email }, include: { empresa: true } })
    if (!user) {
      const senhaHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10)
      const empresa = await prisma.empresa.create({ data: { nome } })
      await prisma.usuario.create({ data: { empresaId: empresa.id, nome, email, senhaHash, role } })
      user = await prisma.usuario.findUnique({ where: { email }, include: { empresa: true } })
    } else {
      await prisma.usuario.update({ where: { id: user.id }, data: { nome, role, ativo: true } })
      user = await prisma.usuario.findUnique({ where: { email }, include: { empresa: true } })
    }
    if (!user) return reply.code(500).send({ erro: 'Falha ao provisionar' })

    const access_token = app.jwt.sign({ sub: user.id, empresa_id: user.empresaId, role: user.role })
    return {
      access_token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        empresa_id: user.empresaId,
        empresa_nome: user.empresa.nome,
        empresa_logo: user.empresa.logoUrl,
        empresa_cor: user.empresa.corPrimaria,
        permissoes: user.permissoes || [],
      },
    }
  })
}
