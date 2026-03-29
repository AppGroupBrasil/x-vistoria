import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CondominiosService } from './condominios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CriarCondominioDto {
  @IsString({ message: 'Nome é obrigatório.' }) nome: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() sindico_nome?: string;
  @IsOptional() @IsEmail({}, { message: 'Email do síndico inválido.' }) sindico_email?: string;
  @IsOptional() @IsString() sindico_telefone?: string;
  @IsOptional() @Type(() => Number) @IsInt({ message: 'Total de unidades deve ser um número inteiro.' }) @Min(1, { message: 'Total de unidades deve ser pelo menos 1.' }) total_unidades?: number;
}

class AtualizarCondominioDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() sindico_nome?: string;
  @IsOptional() @IsEmail({}, { message: 'Email do síndico inválido.' }) sindico_email?: string;
  @IsOptional() @IsString() sindico_telefone?: string;
  @IsOptional() @Type(() => Number) @IsInt({ message: 'Total de unidades deve ser um número inteiro.' }) @Min(1, { message: 'Total de unidades deve ser pelo menos 1.' }) total_unidades?: number;
}

@ApiTags('condominios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('condominios')
export class CondominiosController {
  constructor(private readonly service: CondominiosService) {}

  @Get()
  listar(@Request() req, @Query() query: any) {
    const supervisorId = req.user.role === 'supervisor' ? req.user.sub : undefined;
    return this.service.listar(req.user.empresa_id, supervisorId, query);
  }

  @Get(':id')
  buscar(@Param('id') id: string) { return this.service.buscarPorId(id); }

  @Post()
  criar(@Body() dto: CriarCondominioDto, @Request() req) { return this.service.criar(dto, req.user.empresa_id); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarCondominioDto) { return this.service.atualizar(id, dto); }

  @Patch(':id/bloquear')
  @Roles('admin', 'master')
  bloquear(@Param('id') id: string) { return this.service.atualizar(id, { ativo: false }); }

  @Patch(':id/desbloquear')
  @Roles('admin', 'master')
  desbloquear(@Param('id') id: string) { return this.service.atualizar(id, { ativo: true }); }

  @Delete(':id')
  excluir(@Param('id') id: string) { return this.service.excluir(id); }

  @Post(':id/supervisores/:supervisorId')
  vincular(@Param('id') id: string, @Param('supervisorId') supervisorId: string) {
    return this.service.vincularSupervisor(id, supervisorId);
  }

  @Delete(':id/supervisores/:supervisorId')
  desvincular(@Param('id') id: string, @Param('supervisorId') supervisorId: string) {
    return this.service.desvincularSupervisor(id, supervisorId);
  }

  @Patch(':id/visitas/:visitaId/portal')
  @Roles('admin', 'master')
  togglePortal(
    @Param('id') id: string,
    @Param('visitaId') visitaId: string,
    @Body() body: { visivel: boolean },
  ) {
    return this.service.toggleVisivelPortal(id, visitaId, body.visivel);
  }

  @Get(':id/visitas-portal')
  listarVisitasPortal(@Param('id') id: string) {
    return this.service.listarVisitasPortal(id);
  }

  // ====== ESPAÇOS ======

  @Get(':id/espacos')
  listarEspacos(@Param('id') id: string) {
    return this.service.listarEspacos(id);
  }

  @Post(':id/espacos')
  @Roles('admin', 'master')
  criarEspaco(@Param('id') id: string, @Body() body: { nome: string }, @Request() req) {
    return this.service.criarEspaco(id, req.user.empresa_id, body.nome);
  }

  @Delete(':id/espacos/:espacoId')
  @Roles('admin', 'master')
  excluirEspaco(@Param('id') id: string, @Param('espacoId') espacoId: string) {
    return this.service.excluirEspaco(id, espacoId);
  }

  @Patch(':id/visitas/:visitaId/espaco')
  @Roles('admin', 'master')
  atribuirEspaco(
    @Param('id') id: string,
    @Param('visitaId') visitaId: string,
    @Body() body: { espaco_id: string | null },
  ) {
    return this.service.atribuirVistoriaEspaco(id, visitaId, body.espaco_id);
  }
}
