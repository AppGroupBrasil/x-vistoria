import { Injectable, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SQL } from '../database/database.module';

const APP_SLUG = 'xvistoria';
const STATUS_VALIDOS = new Set(['ativa', 'trial']);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(SQL) private readonly sql: any,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Token do auth-central traz `apps: [{slug, role, status, expira_em}]`.
    // Token legado (emitido pelo próprio X Vistoria) traz `role`/`empresa_id` no topo.
    const isCentral = Array.isArray(payload.apps);

    if (isCentral) {
      const licenca = payload.apps.find((a: any) => a.slug === APP_SLUG);
      if (!licenca || !STATUS_VALIDOS.has(licenca.status)) {
        throw new ForbiddenException('Sem licença ativa para o X Vistoria');
      }
      if (licenca.expira_em && new Date(licenca.expira_em) < new Date()) {
        throw new ForbiddenException('Licença expirada');
      }

      const [usuario] = await this.sql`
        SELECT id, empresa_id, role, pode_editar, pode_excluir, ativo
        FROM usuarios WHERE id = ${payload.sub}
      `;
      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedException('Usuário não provisionado neste app');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        nome: payload.nome,
        role: licenca.role || usuario.role,
        empresa_id: usuario.empresa_id,
        pode_editar: !!usuario.pode_editar,
        pode_excluir: !!usuario.pode_excluir,
      };
    }

    return {
      sub: payload.sub,
      email: payload.email,
      nome: payload.nome,
      role: payload.role,
      empresa_id: payload.empresa_id,
      pode_editar: payload.pode_editar || false,
      pode_excluir: payload.pode_excluir || false,
    };
  }
}
