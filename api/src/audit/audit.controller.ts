import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  listar(@Request() req, @Query() query: any) {
    return this.auditService.listar(req.user.empresa_id, query);
  }

  @Get('usuarios')
  usuariosAtivos(@Request() req) {
    return this.auditService.usuariosAtivos(req.user.empresa_id);
  }
}
