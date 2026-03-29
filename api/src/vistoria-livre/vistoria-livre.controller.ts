import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VistoriaLivreService } from './vistoria-livre.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, Matches } from 'class-validator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

class CriarVistoriaLivreDto {
  @Matches(UUID_REGEX, { message: 'condominio_id deve ser UUID' }) condominio_id: string;
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsNumber() localizacao_lat?: number;
  @IsOptional() @IsNumber() localizacao_lng?: number;
}

class AdicionarItemDto {
  @IsString({ message: 'Título do item é obrigatório.' }) titulo: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsNumber() localizacao_lat?: number;
  @IsOptional() @IsNumber() localizacao_lng?: number;
}

class AtualizarItemDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsNumber() localizacao_lat?: number;
  @IsOptional() @IsNumber() localizacao_lng?: number;
}

class CriarChecklistItemDto {
  @IsString({ message: 'Título do item é obrigatório.' }) titulo: string;
}

class AtualizarChecklistItemDto {
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsNumber() ordem?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

@ApiTags('vistoria-livre')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vistoria-livre')
export class VistoriaLivreController {
  constructor(private readonly service: VistoriaLivreService) {}

  // =========== CHECKLIST CONFIG — must be before :id routes ===========
  @Get('checklist/itens')
  listarChecklistItens(@Request() req) {
    return this.service.listarChecklistItens(req.user.empresa_id);
  }

  @Post('checklist/itens')
  @Roles('admin', 'master')
  criarChecklistItem(@Body() dto: CriarChecklistItemDto, @Request() req) {
    return this.service.criarChecklistItem(dto, req.user.empresa_id);
  }

  @Patch('checklist/itens/:id')
  @Roles('admin', 'master')
  atualizarChecklistItem(@Param('id') id: string, @Body() dto: AtualizarChecklistItemDto, @Request() req) {
    return this.service.atualizarChecklistItem(id, dto, req.user.empresa_id);
  }

  @Delete('checklist/itens/:id')
  @Roles('admin', 'master')
  excluirChecklistItem(@Param('id') id: string, @Request() req) {
    return this.service.excluirChecklistItem(id, req.user.empresa_id);
  }

  // =========== VISTORIAS LIVRES ===========
  @Get()
  listar(@Request() req) {
    return this.service.listar(req.user);
  }

  @Get(':id')
  buscar(@Param('id') id: string, @Request() req) {
    return this.service.buscarPorId(id, req.user);
  }

  @Post()
  criar(@Body() dto: CriarVistoriaLivreDto, @Request() req) {
    return this.service.criar(dto, req.user);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.service.atualizar(id, dto, req.user);
  }

  @Patch(':id/finalizar')
  finalizar(@Param('id') id: string, @Request() req) {
    return this.service.finalizar(id, req.user);
  }

  @Patch(':id/enviar')
  enviar(@Param('id') id: string, @Request() req) {
    return this.service.enviar(id, req.user);
  }

  @Delete(':id')
  excluir(@Param('id') id: string, @Request() req) {
    return this.service.excluir(id, req.user);
  }

  // =========== ITENS ===========
  @Post(':id/itens')
  adicionarItem(@Param('id') id: string, @Body() dto: AdicionarItemDto, @Request() req) {
    return this.service.adicionarItem(id, dto, req.user);
  }

  @Patch('itens/:itemId')
  atualizarItem(@Param('itemId') itemId: string, @Body() dto: AtualizarItemDto, @Request() req) {
    return this.service.atualizarItem(itemId, dto, req.user);
  }

  @Delete('itens/:itemId')
  excluirItem(@Param('itemId') itemId: string, @Request() req) {
    return this.service.excluirItem(itemId, req.user);
  }

  @Post(':id/itens/:itemId/foto')
  @UseInterceptors(FileInterceptor('foto'))
  async uploadFotoItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Tipo de arquivo não permitido');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo muito grande (máx 20MB)');
    return this.service.uploadFotoItem(id, itemId, file.buffer, file.mimetype, req.user);
  }
}
