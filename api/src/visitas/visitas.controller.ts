import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, Res, UseInterceptors, UploadedFile, BadRequestException, Inject
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { VisitasService } from './visitas.service';
import { UploadService } from '../upload/upload.service';
import { SQL } from '../database/database.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CriarVisitaDto {
  @Matches(UUID_REGEX, { message: 'condominio_id deve ser UUID' })
  condominio_id: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'template_id deve ser UUID' })
  template_id?: string;

  @IsOptional()
  @Matches(UUID_REGEX, { message: 'supervisor_id deve ser UUID' })
  supervisor_id?: string;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

class AtualizarVisitaDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  observacoes_gerais?: string;
}

@ApiTags('visitas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitas')
export class VisitasController {
  constructor(
    private readonly visitasService: VisitasService,
    private readonly uploadService: UploadService,
    @Inject(SQL) private readonly sql: any,
  ) {}

  @Get()
  listar(@Request() req, @Query() query: any) {
    const { role, empresa_id, sub } = req.user;
    const filtros = { ...query };
    if (role === 'supervisor') filtros.supervisorId = sub;
    return this.visitasService.listar(empresa_id, filtros);
  }

  @Get('timeline')
  timeline(@Request() req) {
    const { role, empresa_id, sub } = req.user;
    const supervisorId = role === 'supervisor' ? sub : undefined;
    return this.visitasService.listarTimeline(empresa_id, supervisorId);
  }

  @Get('supervisores-ativos')
  @Roles('admin', 'master')
  supervisoresAtivos(@Request() req) {
    return this.visitasService.listarSupervisoresAtivos(req.user.empresa_id);
  }

  @Get('localizacoes')
  @Roles('admin', 'master')
  localizacoes(@Request() req) {
    return this.visitasService.localizacoesSupervisores(req.user.empresa_id);
  }

  @Get('mapa-vistorias')
  @Roles('admin', 'master')
  mapaVistorias(@Request() req) {
    return this.visitasService.localizacoesVistorias(req.user.empresa_id);
  }

  @Get('exportar/csv')
  @Roles('admin', 'master')
  async exportarCSV(@Request() req, @Query() query: any, @Res() res: Response) {
    const { empresa_id } = req.user;
    const resultado = await this.visitasService.listar(empresa_id, { ...query, limit: 10000 });
    const visitas = resultado.data;

    const STATUS_LABEL: Record<string, string> = {
      nao_iniciada: 'Não iniciada', em_andamento: 'Em andamento',
      pausada: 'Pausada', aguardando_aprovacao: 'Aguardando aprovação',
      aprovada: 'Aprovada', enviada_sindico: 'Enviada ao síndico', concluida: 'Concluída',
    };

    const header = 'Protocolo;Condomínio;Supervisor;Status;Data Criação;Pendências;Fotos\n';
    const rows = visitas.map((v: any) =>
      [
        v.protocolo || '',
        (v.condominio_nome || '').replaceAll(';', ','),
        (v.supervisor_nome || '').replaceAll(';', ','),
        STATUS_LABEL[v.status] || v.status,
        v.criado_em ? new Date(v.criado_em).toLocaleDateString('pt-BR') : '',
        v.total_pendencias || 0,
        v.total_fotos || 0,
      ].join(';')
    ).join('\n');

    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=visitas_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(bom + header + rows);
  }

  @Get(':id')
  buscar(@Param('id') id: string, @Request() req) {
    return this.visitasService.buscarPorId(id, req.user.empresa_id);
  }

  @Post()
  @Roles('admin', 'master', 'supervisor')
  criar(@Body() dto: CriarVisitaDto, @Request() req) {
    const supervisorId = (req.user.role === 'admin' || req.user.role === 'master') && dto.supervisor_id
      ? dto.supervisor_id
      : req.user.sub;
    return this.visitasService.criar(dto, supervisorId, req.user.empresa_id);
  }

  @Patch(':id')
  @Roles('supervisor', 'admin', 'master')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarVisitaDto, @Request() req) {
    return this.visitasService.atualizar(id, req.user.empresa_id, dto);
  }

  @Patch(':id/iniciar')
  @Roles('supervisor', 'admin', 'master')
  iniciar(@Param('id') id: string, @Request() req) {
    return this.visitasService.iniciar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/pausar')
  @Roles('supervisor', 'admin', 'master')
  pausar(@Param('id') id: string, @Request() req) {
    return this.visitasService.pausar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/finalizar')
  @Roles('supervisor', 'admin', 'master')
  finalizar(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.visitasService.finalizar(id, req.user.sub, req.user.empresa_id, body.observacoes);
  }

  @Patch(':id/aprovar')
  @Roles('admin', 'master')
  aprovar(@Param('id') id: string, @Request() req) {
    return this.visitasService.aprovar(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/enviar-sindico')
  @Roles('admin', 'master')
  enviarSindico(@Param('id') id: string, @Request() req) {
    return this.visitasService.enviarSindico(id, req.user.sub, req.user.empresa_id);
  }

  @Patch(':id/reatribuir')
  @Roles('admin', 'master')
  reatribuir(@Param('id') id: string, @Body() body: { supervisor_id: string }, @Request() req) {
    return this.visitasService.reatribuir(id, body.supervisor_id, req.user.empresa_id);
  }

  @Patch(':id/status')
  alterarStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req) {
    return this.visitasService.alterarStatus(id, body.status, req.user);
  }

  @Post(':id/selfie')
  @Roles('supervisor', 'admin', 'master')
  @UseInterceptors(FileInterceptor('selfie'))
  async uploadSelfie(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { localizacao_lat?: string; localizacao_lng?: string },
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Selfie obrigatório');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Tipo não permitido: ${file.mimetype}`);
    }

    const { url } = await this.uploadService.uploadFoto(file.buffer, file.mimetype, id);
    const lat = body.localizacao_lat ? Number.parseFloat(body.localizacao_lat) : null;
    const lng = body.localizacao_lng ? Number.parseFloat(body.localizacao_lng) : null;

    const [updated] = await this.sql`
      UPDATE visitas
      SET selfie_url = ${url},
          identificacao_em = NOW(),
          identificacao_lat = ${lat},
          identificacao_lng = ${lng},
          atualizado_em = NOW()
      WHERE id = ${id} AND empresa_id = ${req.user.empresa_id}
      RETURNING selfie_url, identificacao_em, identificacao_lat, identificacao_lng
    `;
    return updated;
  }

  @Delete(':id')
  @Roles('admin', 'master')
  excluir(@Param('id') id: string, @Request() req) {
    return this.visitasService.excluir(id, req.user);
  }
}
