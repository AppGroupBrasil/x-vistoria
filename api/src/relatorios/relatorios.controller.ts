import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('relatorios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly service: RelatoriosService) {}

  @Get()
  resumo(@Request() req, @Query() query: any) {
    return this.service.resumoGeral(req.user.empresa_id, query);
  }
}
