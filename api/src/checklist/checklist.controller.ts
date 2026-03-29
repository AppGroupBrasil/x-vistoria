import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsArray, ValidateNested, IsEnum, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { Type } from 'class-transformer';

// ── Categorias DTOs ──

class CriarCategoriaDto {
  @IsString({ message: 'Nome da categoria é obrigatório.' }) nome: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() icone?: string;
  @IsOptional() @IsInt() ordem?: number;
}

class AtualizarCategoriaDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() icone?: string;
  @IsOptional() @IsInt() ordem?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

// ── Perguntas DTOs ──

class CriarPerguntaDto {
  @Matches(UUID_REGEX, { message: 'categoria_id deve ser UUID' }) categoria_id: string;
  @IsString({ message: 'Texto da pergunta é obrigatório.' }) texto: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsBoolean() requer_sim_nao?: boolean;
  @IsOptional() @IsBoolean() requer_foto?: boolean;
  @IsOptional() @IsBoolean() requer_observacao?: boolean;
  @IsOptional() @IsBoolean() requer_avaliacao?: boolean;
  @IsOptional() @IsInt() ordem?: number;
}

class AtualizarPerguntaDto {
  @IsOptional() @IsString() texto?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsBoolean() requer_sim_nao?: boolean;
  @IsOptional() @IsBoolean() requer_foto?: boolean;
  @IsOptional() @IsBoolean() requer_observacao?: boolean;
  @IsOptional() @IsBoolean() requer_avaliacao?: boolean;
  @IsOptional() @IsInt() ordem?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

// ── Templates DTOs ──

class TemplatePerguntaDto {
  @Matches(UUID_REGEX, { message: 'pergunta_id deve ser UUID' }) pergunta_id: string;
  @IsOptional() @IsInt() ordem?: number;
  @IsOptional() @IsBoolean() obrigatoria?: boolean;
}

class CriarTemplateDto {
  @IsString({ message: 'Nome do template é obrigatório.' }) nome: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TemplatePerguntaDto) perguntas?: TemplatePerguntaDto[];
}

class AtualizarTemplateDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TemplatePerguntaDto) perguntas?: TemplatePerguntaDto[];
}

// ── Bulk Delete DTO ──

class ExcluirPerguntasBulkDto {
  @IsArray() @IsString({ each: true }) ids: string[];
}

// ── Respostas DTO ──

class SalvarRespostaDto {
  @Matches(UUID_REGEX, { message: 'visita_id deve ser UUID' }) visita_id: string;
  @Matches(UUID_REGEX, { message: 'pergunta_id deve ser UUID' }) pergunta_id: string;
  @IsOptional() @IsString() @IsEnum(['conforme', 'nao_conforme', 'nao_aplicavel'], { message: 'Resultado inválido.' }) resultado?: string;
  @IsOptional() @IsString() observacao?: string;
  @IsOptional() @IsString() audio_url?: string;
  @IsOptional() @IsString() transcricao_bruta?: string;
  @IsOptional() @IsString() transcricao_corrigida?: string;
  @IsOptional() @IsInt() avaliacao?: number;
}

@ApiTags('checklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly service: ChecklistService) {}

  @Get('categorias')
  categorias(@Request() req) { return this.service.listarCategorias(req.user.empresa_id); }

  @Get('perguntas')
  todasPerguntas(@Request() req) { return this.service.listarTodasPerguntas(req.user.empresa_id); }

  @Get('categorias/:id/perguntas')
  perguntas(@Param('id') id: string) { return this.service.listarPerguntasPorCategoria(id); }

  @Post('categorias')
  criarCategoria(@Body() dto: CriarCategoriaDto, @Request() req) { return this.service.criarCategoria(dto, req.user.empresa_id); }

  @Patch('categorias/:id')
  @Roles('admin', 'master')
  atualizarCategoria(@Param('id') id: string, @Body() dto: AtualizarCategoriaDto) { return this.service.atualizarCategoria(id, dto); }

  @Delete('categorias/:id')
  @Roles('admin', 'master')
  excluirCategoria(@Param('id') id: string) { return this.service.excluirCategoria(id); }

  @Post('perguntas')
  criarPergunta(@Body() dto: CriarPerguntaDto, @Request() req) { return this.service.criarPergunta(dto, req.user.empresa_id); }

  @Patch('perguntas/:id')
  @Roles('admin', 'master')
  atualizarPergunta(@Param('id') id: string, @Body() dto: AtualizarPerguntaDto) { return this.service.atualizarPergunta(id, dto); }

  @Delete('perguntas/:id')
  @Roles('admin', 'master')
  excluirPergunta(@Param('id') id: string) { return this.service.excluirPergunta(id); }

  @Post('perguntas/bulk-delete')
  @Roles('admin', 'master')
  excluirPerguntasBulk(@Body() dto: ExcluirPerguntasBulkDto) { return this.service.excluirPerguntasBulk(dto.ids); }

  @Get('templates')
  templates(@Request() req) { return this.service.listarTemplates(req.user.empresa_id); }

  @Get('templates/:id')
  template(@Param('id') id: string) { return this.service.buscarTemplate(id); }

  @Post('templates')
  criarTemplate(@Body() dto: CriarTemplateDto, @Request() req) { return this.service.criarTemplate(dto, req.user.empresa_id); }

  @Patch('templates/:id')
  @Roles('admin', 'master')
  atualizarTemplate(@Param('id') id: string, @Body() dto: AtualizarTemplateDto) { return this.service.atualizarTemplate(id, dto); }

  @Delete('templates/:id')
  @Roles('admin', 'master')
  excluirTemplate(@Param('id') id: string) { return this.service.excluirTemplate(id); }

  @Get('visitas/:visitaId/respostas')
  respostas(@Param('visitaId') visitaId: string) { return this.service.listarRespostas(visitaId); }

  @Post('respostas')
  salvarResposta(@Body() dto: SalvarRespostaDto, @Request() req) { return this.service.salvarResposta(dto, req.user); }
}
