-- CreateEnum
CREATE TYPE "NivelLimpeza" AS ENUM ('ruim', 'regular', 'boa', 'otima');

-- AlterTable
ALTER TABLE "perguntas" ADD COLUMN     "requer_limpeza" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "respostas" ADD COLUMN     "limpeza" "NivelLimpeza";
