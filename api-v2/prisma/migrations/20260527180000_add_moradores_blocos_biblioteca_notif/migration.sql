CREATE TABLE "blocos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "condominio_id" TEXT NOT NULL REFERENCES "condominios"("id") ON DELETE CASCADE,
  "nome" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "blocos_condominio_id_nome_key" ON "blocos"("condominio_id", "nome");
CREATE INDEX "blocos_empresa_id_idx" ON "blocos"("empresa_id");

CREATE TABLE "moradores" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "condominio_id" TEXT REFERENCES "condominios"("id") ON DELETE SET NULL,
  "condominio_nome" TEXT,
  "bloco" TEXT,
  "apartamento" TEXT,
  "nome" TEXT NOT NULL,
  "telefone" TEXT,
  "email" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "moradores_empresa_id_idx" ON "moradores"("empresa_id");
CREATE INDEX "moradores_condominio_id_idx" ON "moradores"("condominio_id");

CREATE TABLE "biblioteca_perguntas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "categoria" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "itens" JSONB NOT NULL DEFAULT '{}',
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "biblioteca_perguntas_empresa_id_categoria_idx" ON "biblioteca_perguntas"("empresa_id", "categoria");

CREATE TABLE "notificacoes_enviadas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "autor_id" TEXT REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "morador_id" TEXT REFERENCES "moradores"("id") ON DELETE SET NULL,
  "morador_nome" TEXT,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "imagens" JSONB NOT NULL DEFAULT '[]',
  "canais" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notificacoes_enviadas_empresa_id_idx" ON "notificacoes_enviadas"("empresa_id");
CREATE INDEX "notificacoes_enviadas_criado_em_idx" ON "notificacoes_enviadas"("criado_em");
