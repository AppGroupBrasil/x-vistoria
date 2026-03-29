import { Module } from '@nestjs/common';
import { CondominiosController } from './condominios.controller';
import { PortalPublicoController } from './portal-publico.controller';
import { CondominiosService } from './condominios.service';

@Module({
  controllers: [CondominiosController, PortalPublicoController],
  providers: [CondominiosService],
  exports: [CondominiosService],
})
export class CondominiosModule {}
