import { Injectable, Inject, Logger } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(SQL) private readonly sql: any) {}

  async registrar(dados: {
    empresa_id: string;
    usuario_id: string;
    usuario_nome: string;
    usuario_email?: string;
    acao: string;
    entidade: string;
    entidade_id?: string;
    descricao: string;
    detalhes?: any;
    ip?: string;
  }) {
    try {
      await this.sql`
        INSERT INTO audit_log (empresa_id, usuario_id, usuario_nome, usuario_email, acao, entidade, entidade_id, descricao, detalhes, ip)
        VALUES (
          ${dados.empresa_id},
          ${dados.usuario_id},
          ${dados.usuario_nome},
          ${dados.usuario_email || null},
          ${dados.acao},
          ${dados.entidade},
          ${dados.entidade_id || null},
          ${dados.descricao},
          ${dados.detalhes ? JSON.stringify(dados.detalhes) : null}::jsonb,
          ${dados.ip || null}
        )
      `;
    } catch (err) {
      this.logger.error(`Falha ao registrar audit log: ${err.message}`);
    }
  }

  async listar(empresaId: string, filtros: any = {}) {
    const page = Math.max(1, parseInt(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filtros.limit) || 30));
    const offset = (page - 1) * limit;

    const whereParts = [this.sql`a.empresa_id = ${empresaId}`];

    if (filtros.usuario_id) {
      whereParts.push(this.sql`a.usuario_id = ${filtros.usuario_id}`);
    }
    if (filtros.acao) {
      whereParts.push(this.sql`a.acao = ${filtros.acao}`);
    }
    if (filtros.entidade) {
      whereParts.push(this.sql`a.entidade = ${filtros.entidade}`);
    }
    if (filtros.busca) {
      whereParts.push(this.sql`a.descricao ILIKE ${'%' + filtros.busca + '%'}`);
    }
    if (filtros.de) {
      whereParts.push(this.sql`a.criado_em >= ${filtros.de}::timestamptz`);
    }
    if (filtros.ate) {
      whereParts.push(this.sql`a.criado_em <= ${filtros.ate}::timestamptz`);
    }

    let whereClause = whereParts[0];
    for (let i = 1; i < whereParts.length; i++) {
      whereClause = this.sql`${whereClause} AND ${whereParts[i]}`;
    }

    const [{ count }] = await this.sql`
      SELECT COUNT(*)::int as count FROM audit_log a WHERE ${whereClause}
    `;

    const data = await this.sql`
      SELECT a.* FROM audit_log a
      WHERE ${whereClause}
      ORDER BY a.criado_em DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { data, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async usuariosAtivos(empresaId: string) {
    return this.sql`
      SELECT DISTINCT a.usuario_id, a.usuario_nome
      FROM audit_log a
      WHERE a.empresa_id = ${empresaId} AND a.usuario_id IS NOT NULL
      ORDER BY a.usuario_nome
    `;
  }
}
