-- CreateEnum
CREATE TYPE "RespostaStatus" AS ENUM ('aberto', 'em_execucao', 'finalizado');

-- AlterTable
ALTER TABLE "perguntas" ADD COLUMN     "requer_descricao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_foto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_notificacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_ocorrencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_problema" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requer_titulo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "respostas" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "notificacao" TEXT,
ADD COLUMN     "ocorrencia" TEXT,
ADD COLUMN     "problema" TEXT,
ADD COLUMN     "status" "RespostaStatus",
ADD COLUMN     "titulo" TEXT;
