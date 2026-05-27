-- CreateEnum
CREATE TYPE "TipoVistoriaSimples" AS ENUM ('foto_descricao', 'checklist', 'pergunta_resposta', 'conformidade', 'antes_depois', 'avaliacao');

-- CreateTable
CREATE TABLE "vistorias_simples" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "vistoriador_id" TEXT NOT NULL,
    "tipo" "TipoVistoriaSimples" NOT NULL,
    "protocolo" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "iniciada_em" TIMESTAMP(3) NOT NULL,
    "finalizada_em" TIMESTAMP(3) NOT NULL,
    "lat_inicio" DOUBLE PRECISION,
    "lng_inicio" DOUBLE PRECISION,
    "lat_fim" DOUBLE PRECISION,
    "lng_fim" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vistorias_simples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vistorias_simples_protocolo_key" ON "vistorias_simples"("protocolo");

-- CreateIndex
CREATE INDEX "vistorias_simples_empresa_id_idx" ON "vistorias_simples"("empresa_id");

-- CreateIndex
CREATE INDEX "vistorias_simples_vistoriador_id_idx" ON "vistorias_simples"("vistoriador_id");

-- AddForeignKey
ALTER TABLE "vistorias_simples" ADD CONSTRAINT "vistorias_simples_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias_simples" ADD CONSTRAINT "vistorias_simples_vistoriador_id_fkey" FOREIGN KEY ("vistoriador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
