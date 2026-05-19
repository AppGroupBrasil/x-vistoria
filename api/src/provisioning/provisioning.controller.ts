import { Body, Controller, ForbiddenException, Headers, Inject, Logger, Post, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQL } from '../database/database.module';

interface ProvisioningBody {
  usuario_id: string;
  email: string;
  nome: string;
  telefone?: string | null;
  role: string;
  status: string;
  expira_em?: string | null;
  metadata?: Record<string, any>;
}

@Controller('api/v1/provisioning')
export class ProvisioningController {
  private readonly logger = new Logger(ProvisioningController.name);

  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly config: ConfigService,
  ) {}

  @Post('usuario')
  async provisionar(
    @Headers('x-provisioning-secret') secret: string,
    @Body() body: ProvisioningBody,
  ) {
    const expected = this.config.get<string>('PROVISIONING_SECRET');
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Assinatura de provisionamento inválida');
    }
    if (!body?.usuario_id || !body?.email || !body?.nome) {
      throw new BadRequestException('Campos obrigatórios ausentes');
    }

    const ativo = body.status === 'ativa' || body.status === 'trial';
    const roleLocal = this.mapearRole(body.role);
    const podeEditar = ['admin', 'supervisor'].includes(roleLocal);
    const podeExcluir = roleLocal === 'admin';

    let empresaId: string | null = body.metadata?.empresa_id ?? null;
    if (!empresaId) {
      const [empresa] = await this.sql`
        INSERT INTO empresas (nome, email, telefone)
        VALUES (${body.metadata?.empresa_nome || body.nome}, ${body.email}, ${body.telefone || null})
        RETURNING id
      `;
      empresaId = empresa.id;
    }

    await this.sql`
      INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, role, telefone, pode_editar, pode_excluir, ativo)
      VALUES (
        ${body.usuario_id},
        ${empresaId},
        ${body.nome},
        ${body.email},
        ${'!central!'},
        ${roleLocal}::role_usuario,
        ${body.telefone || null},
        ${podeEditar},
        ${podeExcluir},
        ${ativo}
      )
      ON CONFLICT (id) DO UPDATE
        SET nome = EXCLUDED.nome,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            telefone = EXCLUDED.telefone,
            pode_editar = EXCLUDED.pode_editar,
            pode_excluir = EXCLUDED.pode_excluir,
            ativo = EXCLUDED.ativo
    `;

    this.logger.log(`Usuário provisionado ${body.email} (role=${roleLocal}, empresa=${empresaId})`);
    return { ok: true, usuario_id: body.usuario_id, empresa_id: empresaId };
  }

  private mapearRole(role: string): string {
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r === 'superadmin') return 'admin';
    if (r === 'supervisor' || r === 'gerente') return 'supervisor';
    return 'supervisor';
  }
}
