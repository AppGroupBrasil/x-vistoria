import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QrPontoService } from './qr-ponto.service';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

class RegistrarPresencaDto {
  @IsString() @MaxLength(200) usuario_nome: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(500) endereco?: string;
}

@ApiTags('qr-ponto-publico')
@Controller('publico/qr-ponto')
export class QrPontoPublicoController {
  constructor(private readonly service: QrPontoService) {}

  @Get(':token')
  buscar(@Param('token') token: string) {
    return this.service.buscarPorToken(token);
  }

  @Post(':token/registrar')
  registrar(@Param('token') token: string, @Body() dto: RegistrarPresencaDto) {
    return this.service.registrarPresenca(token, dto);
  }
}
