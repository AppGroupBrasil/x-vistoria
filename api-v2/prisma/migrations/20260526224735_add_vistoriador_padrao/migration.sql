-- AlterTable
ALTER TABLE "condominios" ADD COLUMN     "vistoriador_padrao_id" TEXT;

-- CreateIndex
CREATE INDEX "condominios_vistoriador_padrao_id_idx" ON "condominios"("vistoriador_padrao_id");

-- AddForeignKey
ALTER TABLE "condominios" ADD CONSTRAINT "condominios_vistoriador_padrao_id_fkey" FOREIGN KEY ("vistoriador_padrao_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
