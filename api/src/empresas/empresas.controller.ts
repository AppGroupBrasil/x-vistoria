import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';

class CriarEmpresaDto {
  @IsString({ message: 'Nome é obrigatório.' }) nome: string;
  @IsEmail({}, { message: 'Email inválido.' }) email: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsEnum(['basico', 'profissional', 'enterprise'], { message: 'Plano inválido.' }) plano?: string;
}

class AtualizarEmpresaDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsEmail({}, { message: 'Email inválido.' }) email?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsEnum(['basico', 'profissional', 'enterprise'], { message: 'Plano inválido.' }) plano?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsEnum(['quiz', 'lista'], { message: 'Layout inválido.' }) layout_questionario?: string;
}

@ApiTags('empresas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get()
  @Roles('master')
  listar() { return this.empresasService.listar(); }

  @Get('minha')
  minhaEmpresa(@Request() req) { return this.empresasService.buscarPorId(req.user.empresa_id); }

  @Get(':id')
  @Roles('master')
  buscar(@Param('id') id: string) { return this.empresasService.buscarPorId(id); }

  @Get(':id/resumo')
  @Roles('master', 'admin')
  resumo(@Param('id') id: string) { return this.empresasService.resumo(id); }

  @Post()
  @Roles('master')
  criar(@Body() dto: CriarEmpresaDto) { return this.empresasService.criar(dto); }

  @Patch('minha/configuracoes')
  @Roles('master', 'admin')
  atualizarConfiguracoes(@Request() req, @Body() dto: {
    layout_questionario?: string;
    assinatura_admin_nome?: string;
    assinatura_admin_cargo?: string;
    assinatura_admin_documento?: string;
    assinatura_admin_img?: string;
  }) {
    return this.empresasService.atualizar(req.user.empresa_id, dto);
  }

  @Patch(':id')
  @Roles('master', 'admin')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarEmpresaDto) { return this.empresasService.atualizar(id, dto); }

  @Patch(':id/bloquear')
  @Roles('master')
  bloquear(@Param('id') id: string) { return this.empresasService.atualizar(id, { ativo: false }); }

  @Patch(':id/desbloquear')
  @Roles('master')
  desbloquear(@Param('id') id: string) { return this.empresasService.atualizar(id, { ativo: true }); }

  @Delete(':id')
  @Roles('master')
  excluir(@Param('id') id: string) { return this.empresasService.excluir(id); }
}
