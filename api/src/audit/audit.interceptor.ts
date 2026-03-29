import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const ENTIDADE_MAP: Record<string, string> = {
  '/visitas': 'vistoria',
  '/condominios': 'condominio',
  '/usuarios': 'usuario',
  '/checklist-templates': 'template',
  '/categorias': 'categoria',
  '/perguntas': 'pergunta',
  '/pendencias': 'pendencia',
  '/empresas': 'empresa',
  '/vistoria-livre': 'vistoria_livre',
  '/checklist-avulso': 'checklist',
  '/qr-ponto': 'qr_ponto',
  '/configuracoes': 'configuracao',
  '/upload': 'arquivo',
};

const ACAO_MAP: Record<string, string> = {
  POST: 'criar',
  PATCH: 'editar',
  PUT: 'editar',
  DELETE: 'excluir',
};

function extrairEntidade(path: string): string {
  // Remove /api/v1 prefix if present
  const clean = path.replace(/^\/api\/v1/, '');
  for (const [prefix, entidade] of Object.entries(ENTIDADE_MAP)) {
    if (clean.startsWith(prefix)) return entidade;
  }
  // Fallback: use first segment
  const seg = clean.split('/').filter(Boolean)[0];
  return seg || 'sistema';
}

function extrairEntidadeId(path: string): string | undefined {
  const parts = path.replace(/^\/api\/v1/, '').split('/').filter(Boolean);
  // UUID pattern: check second segment
  if (parts[1] && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1])) {
    return parts[1];
  }
  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only log mutations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Skip auth routes (login is logged separately), public routes, health
    const path: string = req.path || req.url;
    if (
      path.includes('/auth/') ||
      path.includes('/publico/') ||
      path.includes('/health') ||
      path.includes('/upload')
    ) {
      return next.handle();
    }

    const user = req.user;
    if (!user?.empresa_id || !user?.sub) {
      return next.handle();
    }

    const acao = ACAO_MAP[method] || method.toLowerCase();
    const entidade = extrairEntidade(path);
    const entidadeId = extrairEntidadeId(path);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || '';

    return next.handle().pipe(
      tap((resultado) => {
        const nome = resultado?.nome || req.body?.nome || req.body?.titulo || req.body?.email || '';
        let descricao = '';

        switch (acao) {
          case 'criar':
            descricao = `Criou ${entidade}${nome ? `: ${nome}` : ''}`;
            break;
          case 'editar':
            descricao = `Editou ${entidade}${nome ? `: ${nome}` : ''}`;
            break;
          case 'excluir':
            descricao = `Excluiu ${entidade}${entidadeId ? ` (${entidadeId.slice(0, 8)})` : ''}`;
            break;
          default:
            descricao = `${acao} em ${entidade}`;
        }

        this.auditService.registrar({
          empresa_id: user.empresa_id,
          usuario_id: user.sub,
          usuario_nome: user.nome || user.email,
          usuario_email: user.email,
          acao,
          entidade,
          entidade_id: entidadeId || resultado?.id,
          descricao,
          detalhes: {
            method,
            path,
            body: this.sanitizeBody(req.body),
          },
          ip,
        });
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    const sanitized = { ...body };
    // Never log passwords
    delete sanitized.senha;
    delete sanitized.senha_hash;
    delete sanitized.nova_senha;
    delete sanitized.password;
    return Object.keys(sanitized).length ? sanitized : undefined;
  }
}
