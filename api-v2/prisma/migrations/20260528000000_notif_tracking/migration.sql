ALTER TABLE "notificacoes_enviadas"
  ADD COLUMN "email_destino"   TEXT,
  ADD COLUMN "enviado_email"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aberto_em"       TIMESTAMP(3),
  ADD COLUMN "aberto_ua"       TEXT,
  ADD COLUMN "aberto_ip"       TEXT,
  ADD COLUMN "aberto_cliente"  TEXT,
  ADD COLUMN "aberturas"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "clicado_em"      TIMESTAMP(3);
