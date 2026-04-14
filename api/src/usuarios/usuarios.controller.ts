import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, Matches } from 'class-validator';

const NUMERIC_PASSWORD_REGEX = /^\d{6}$/;
const NUMERIC_PASSWORD_MESSAGE = 'Senha deve conter exatamente 6 dígitos numéricos.';

class CriarUsuarioDto {
  @IsString({ message: 'Nome é obrigatório.' }) nome: string;
  @IsEmail({}, { message: 'Email inválido.' }) email: string;
  @IsString({ message: 'Senha é obrigatória.' }) @Matches(NUMERIC_PASSWORD_REGEX, { message: NUMERIC_PASSWORD_MESSAGE }) senha: string;
  @IsOptional() @IsEnum(['admin', 'supervisor'], { message: 'Perfil inválido.' }) role?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsBoolean() pode_editar?: boolean;
  @IsOptional() @IsBoolean() pode_excluir?: boolean;
}

class AtualizarUsuarioDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsEnum(['admin', 'supervisor'], { message: 'Perfil inválido.' }) role?: string;
  @IsOptional() @IsString() @Matches(NUMERIC_PASSWORD_REGEX, { message: NUMERIC_PASSWORD_MESSAGE }) senha?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsBoolean() pode_editar?: boolean;
  @IsOptional() @IsBoolean() pode_excluir?: boolean;
}

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(@Request() req, @Query() query: any) { return this.usuariosService.listar(req.user.empresa_id, query); }

  @Get(':id')
  buscar(@Param('id') id: string) { return this.usuariosService.buscarPorId(id); }

  @Post()
  criar(@Body() dto: CriarUsuarioDto, @Request() req) { return this.usuariosService.criar(dto, req.user.empresa_id); }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarUsuarioDto) { return this.usuariosService.atualizar(id, dto); }

  @Delete(':id')
  excluir(@Param('id') id: string, @Request() req) {
    return this.usuariosService.excluir(id, req.user.empresa_id, req.user.sub);
  }
}
