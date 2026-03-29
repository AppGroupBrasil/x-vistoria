import { Module } from '@nestjs/common';
import { ChecklistAvulsoController } from './checklist-avulso.controller';
import { ChecklistAvulsoPublicoController } from './checklist-avulso-publico.controller';
import { ChecklistAvulsoService } from './checklist-avulso.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ChecklistAvulsoController, ChecklistAvulsoPublicoController],
  providers: [ChecklistAvulsoService],
  exports: [ChecklistAvulsoService],
})
export class ChecklistAvulsoModule {}
