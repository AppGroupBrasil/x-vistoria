# X Vistoria — API v2

Backend novo: Fastify + Prisma + PostgreSQL.
Mantém os contratos REST que o PWA e o Web atuais consomem (`/api/v1/...`).

## Rodando local

1. Subir o Postgres (qualquer um, ex.: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`).
2. Copiar variáveis: `cp .env.example .env` e ajustar `DATABASE_URL`.
3. Instalar dependências: `npm install`.
4. Aplicar schema: `npm run db:migrate -- --name init`.
5. (Opcional) Popular dados: `npx tsx prisma/seed.ts`.
6. Subir API: `npm run dev`.

API em `http://localhost:5100`. Health check: `GET /health`.

Login de demo após seed: `admin@demo.com` / `admin123`.

## Estrutura

```
src/
  server.ts          # Entrypoint Fastify
  plugins/
    auth.ts          # JWT (decorator app.autenticar)
  lib/
    prisma.ts        # Cliente Prisma compartilhado
    protocolo.ts     # Geração de número de protocolo
  routes/
    auth.ts          # POST /auth/login, /auth/register, GET /auth/me
    visitas.ts       # CRUD + ações iniciar/pausar/finalizar/aprovar
    checklist.ts     # Categorias, perguntas, templates, respostas (upsert)
    condominios.ts   # CRUD
    pendencias.ts    # CRUD + listar por visita
    mensagens.ts     # Listar por visita + criar
    upload.ts        # Upload de fotos (multipart) + listar + excluir
    usuarios.ts      # CRUD (admin/master)
    templates.ts     # Templates + categorias + perguntas
prisma/
  schema.prisma      # Modelo de dados
  seed.ts            # Seed básico
```

## Decisões

- **JWT 30 dias** — encaixa com o "manter conectado" do PWA.
- **Upsert em respostas** — auto-save do checklist sem 409.
- **Empresa isolada por usuário** — todas as queries filtram por `empresaId`.
- **Uploads em disco local** (`./uploads`), servidos em `/uploads/*`. Trocar por S3 quando produção exigir.
- **Sem voz, sem assinatura, sem PDF ainda** — entram em iterações futuras.
