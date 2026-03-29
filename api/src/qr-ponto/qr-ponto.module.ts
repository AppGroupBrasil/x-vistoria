import { Module } from '@nestjs/common';
import { QrPontoController } from './qr-ponto.controller';
import { QrPontoPublicoController } from './qr-ponto-publico.controller';
import { QrPontoService } from './qr-ponto.service';

@Module({
  controllers: [QrPontoController, QrPontoPublicoController],
  providers: [QrPontoService],
  exports: [QrPontoService],
})
export class QrPontoModule {}
