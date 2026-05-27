ALTER TABLE "empresas" ADD COLUMN "logo_url" TEXT;
ALTER TABLE "empresas" ADD COLUMN "cor_primaria" TEXT;

ALTER TABLE "condominios" ADD COLUMN "lat_ref" DOUBLE PRECISION;
ALTER TABLE "condominios" ADD COLUMN "lng_ref" DOUBLE PRECISION;

ALTER TABLE "vistorias_simples" ADD COLUMN "assin_sindico_nome" TEXT;
ALTER TABLE "vistorias_simples" ADD COLUMN "assin_sindico_em" TIMESTAMP(3);
ALTER TABLE "vistorias_simples" ADD COLUMN "assin_sindico_token" TEXT;
ALTER TABLE "vistorias_simples" ADD COLUMN "assin_sindico_hash" TEXT;
CREATE UNIQUE INDEX "vistorias_simples_assin_sindico_token_key" ON "vistorias_simples"("assin_sindico_token");
