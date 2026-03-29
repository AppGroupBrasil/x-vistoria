import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { QrPontoService } from './qr-ponto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

class CriarPontoDto {
  @IsString({ message: 'Nome do ponto é obrigatório.' }) nome: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() condominio_id?: string;
}

class AtualizarPontoDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() condominio_id?: string;
}

@ApiTags('qr-ponto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qr-ponto')
export class QrPontoController {
  constructor(private readonly service: QrPontoService) {}

  @Get()
  listar(@Request() req) {
    return this.service.listar(req.user.empresa_id);
  }

  @Get('registros')
  listarRegistros(@Request() req, @Query() query: any) {
    return this.service.listarRegistros(req.user.empresa_id, query);
  }

  @Get('registros/pdf')
  async gerarPdf(@Request() req, @Query() query: any, @Res() res: Response) {
    const buffer = await this.service.gerarPdfRegistros(req.user.empresa_id, query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="relatorio-qr-pontos.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  buscar(@Param('id') id: string, @Request() req) {
    return this.service.buscarPorId(id, req.user.empresa_id);
  }

  @Post()
  criar(@Body() dto: CriarPontoDto, @Request() req) {
    return this.service.criar(dto, req.user.empresa_id);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarPontoDto, @Request() req) {
    return this.service.atualizar(id, dto, req.user.empresa_id);
  }

  @Delete(':id')
  excluir(@Param('id') id: string, @Request() req) {
    return this.service.excluir(id, req.user.empresa_id);
  }
}
