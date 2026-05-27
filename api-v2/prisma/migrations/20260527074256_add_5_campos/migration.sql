-- CreateEnum
CREATE TYPE "NivelConservacao" AS ENUM ('ruim', 'regular', 'bom', 'otimo');

-- AlterTable
ALTER TABLE "perguntas" ADD COLUMN     "requer_assinatura" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_conservacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_local_exato" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_prazo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_validade" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "respostas" ADD COLUMN     "assinatura" TEXT,
ADD COLUMN     "conservacao" "NivelConservacao",
ADD COLUMN     "local_exato" TEXT,
ADD COLUMN     "prazo" TIMESTAMP(3),
ADD COLUMN     "validade" TIMESTAMP(3);
