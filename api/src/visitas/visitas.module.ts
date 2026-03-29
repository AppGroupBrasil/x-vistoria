import { Module } from '@nestjs/common';
import { VisitasController } from './visitas.controller';
import { VistoriaPublicaController } from './vistoria-publica.controller';
import { VisitasService } from './visitas.service';
import { GatewayModule } from '../gateway/gateway.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [GatewayModule, UploadModule],
  controllers: [VisitasController, VistoriaPublicaController],
  providers: [VisitasService],
  exports: [VisitasService],
})
export class VisitasModule {}
