import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PendenciasService } from './pendencias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CriarPendenciaDto {
  @Matches(UUID_REGEX, { message: 'visita_id deve ser UUID' }) visita_id: string;
  @IsString({ message: 'Título é obrigatório.' }) titulo: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsEnum(['baixa', 'media', 'alta', 'urgente'], { message: 'Prioridade inválida.' }) prioridade?: string;
  @IsOptional() @IsString() responsavel?: string;
}

class AtualizarPendenciaDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsEnum(['baixa', 'media', 'alta', 'urgente'], { message: 'Prioridade inválida.' }) prioridade?: string;
  @IsOptional() @IsEnum(['aberta', 'em_tratativa', 'resolvida'], { message: 'Status inválido.' }) status?: string;
  @IsOptional() @IsString() responsavel?: string;
}

@ApiTags('pendencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pendencias')
export class PendenciasController {
  constructor(private readonly service: PendenciasService) {}

  @Get()
  listarTodas(@Request() req) { return this.service.listarTodas(req.user.empresa_id); }

  @Get('visita/:visitaId')
  listar(@Param('visitaId') visitaId: string, @Request() req) { return this.service.listarPorVisita(visitaId, req.user.empresa_id); }

  @Post()
  criar(@Body() dto: CriarPendenciaDto, @Request() req) { return this.service.criar(dto, req.user.empresa_id); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarPendenciaDto, @Request() req) { return this.service.atualizar(id, dto, req.user.empresa_id); }

  @Delete(':id')
  excluir(@Param('id') id: string, @Request() req) { return this.service.excluir(id, req.user.empresa_id); }
}
