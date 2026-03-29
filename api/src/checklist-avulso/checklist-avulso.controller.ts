import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChecklistAvulsoService } from './checklist-avulso.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

@ApiTags('checklist-avulso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checklist-avulso')
export class ChecklistAvulsoController {
  constructor(private readonly service: ChecklistAvulsoService) {}

  // ─── MODELOS ────────────────────────────────────────────

  @Get('modelos')
  async listarModelos(@Request() req: any) {
    return this.service.listarModelos(req.user.empresa_id);
  }

  @Get('modelos/:id')
  async obterModelo(@Param('id') id: string, @Request() req: any) {
    return this.service.obterModelo(id, req.user.empresa_id);
  }

  @Post('modelos')
  async criarModelo(@Body() body: any, @Request() req: any) {
    return this.service.criarModelo(body, req.user.empresa_id, req.user.sub);
  }

  @Patch('modelos/:id')
  async atualizarModelo(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.atualizarModelo(id, body, req.user.empresa_id);
  }

  @Delete('modelos/:id')
  async excluirModelo(@Param('id') id: string, @Request() req: any) {
    await this.service.excluirModelo(id, req.user.empresa_id);
    return { ok: true };
  }

  // ─── EXECUÇÕES ──────────────────────────────────────────

  @Get('execucoes')
  async listarExecucoes(@Request() req: any) {
    return this.service.listarExecucoes(req.user.empresa_id, req.user.sub, req.user.role);
  }

  @Get('execucoes/:id')
  async obterExecucao(@Param('id') id: string, @Request() req: any) {
    return this.service.obterExecucao(id, req.user.empresa_id);
  }

  @Post('execucoes')
  async iniciarExecucao(@Body() body: any, @Request() req: any) {
    return this.service.iniciarExecucao(body, req.user.empresa_id, req.user.sub);
  }

  @Patch('execucoes/:id/item/:itemId')
  async marcarItem(
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.service.marcarItem(itemId, body, req.user.empresa_id);
  }

  @Post('execucoes/item/:itemId/foto')
  @UseInterceptors(FileInterceptor('foto'))
  async uploadFotoProblema(
    @Param('itemId') itemId: string,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Nenhuma foto enviada');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Tipo de arquivo não permitido');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo muito grande (max 20MB)');
    return this.service.uploadFotoProblema(itemId, file.buffer, file.mimetype, req.user.empresa_id);
  }

  @Post('execucoes/:id/selfie')
  @UseInterceptors(FileInterceptor('foto'))
  async uploadSelfie(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Nenhuma foto enviada');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Tipo de arquivo não permitido');
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException('Arquivo muito grande (max 20MB)');
    return this.service.uploadSelfie(id, file.buffer, file.mimetype, req.user.empresa_id);
  }

  @Patch('execucoes/:id/finalizar')
  async finalizarExecucao(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.finalizarExecucao(id, body, req.user.empresa_id);
  }

  @Delete('execucoes/:id')
  async excluirExecucao(@Param('id') id: string, @Request() req: any) {
    await this.service.excluirExecucao(id, req.user.empresa_id);
    return { ok: true };
  }
}
