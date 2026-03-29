import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

class LoginDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString({ message: 'Senha é obrigatória.' })
  senha: string;
}

class RegisterDto {
  @IsString({ message: 'Nome da empresa é obrigatório.' })
  empresa_nome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsString({ message: 'Nome é obrigatório.' })
  nome: string;

  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString({ message: 'Senha é obrigatória.' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres.' })
  senha: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}

class EsqueciSenhaDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;
}

class RedefinirSenhaDto {
  @IsString({ message: 'Token é obrigatório.' })
  token: string;

  @IsString({ message: 'Nova senha é obrigatória.' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres.' })
  nova_senha: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('esqueci-senha')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.authService.esqueciSenha(dto.email);
  }

  @Post('redefinir-senha')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.authService.redefinirSenha(dto.token, dto.nova_senha);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Request() req) {
    return this.authService.me(req.user.sub);
  }
}
