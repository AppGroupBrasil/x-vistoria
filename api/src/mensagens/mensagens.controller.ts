import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MensagensService } from './mensagens.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class EnviarMensagemDto {
  @Matches(UUID_REGEX, { message: 'visita_id deve ser UUID' }) visita_id: string;
  @IsString({ message: 'Texto da mensagem é obrigatório.' }) texto: string;
  @IsOptional() @IsString() tipo?: string;
}

@ApiTags('mensagens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mensagens')
export class MensagensController {
  constructor(private readonly service: MensagensService) {}

  @Get('visita/:visitaId')
  listar(@Param('visitaId') visitaId: string, @Request() req) { return this.service.listarPorVisita(visitaId, req.user.empresa_id); }

  @Post()
  enviar(@Body() dto: EnviarMensagemDto, @Request() req) { return this.service.enviar(dto, req.user.sub, req.user.empresa_id); }
}
