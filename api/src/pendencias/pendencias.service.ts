import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class PendenciasService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  private async verificarAcessoVisita(visitaId: string, empresaId: string) {
    const [visita] = await this.sql`SELECT id FROM visitas WHERE id = ${visitaId} AND empresa_id = ${empresaId}`;
    if (!visita) throw new ForbiddenException('Sem acesso a esta visita');
  }

  async listarTodas(empresaId: string) {
    return this.sql`
      SELECT p.*, v.protocolo, c.nome as condominio_nome, u.nome as supervisor_nome
      FROM pendencias p
      JOIN visitas v ON v.id = p.visita_id
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.empresa_id = ${empresaId}
      ORDER BY p.prioridade DESC, p.criado_em DESC
    `;
  }

  async listarPorVisita(visitaId: string, empresaId: string) {
    await this.verificarAcessoVisita(visitaId, empresaId);
    return this.sql`
      SELECT * FROM pendencias WHERE visita_id = ${visitaId} ORDER BY prioridade DESC, criado_em
    `;
  }

  async criar(dto: any, empresaId: string) {
    await this.verificarAcessoVisita(dto.visita_id, empresaId);
    const [pendencia] = await this.sql`
      INSERT INTO pendencias (visita_id, resposta_id, titulo, descricao, prioridade, responsavel, prazo)
      VALUES (${dto.visita_id}, ${dto.resposta_id || null}, ${dto.titulo}, ${dto.descricao || null},
              ${dto.prioridade || 'media'}, ${dto.responsavel || null}, ${dto.prazo || null})
      RETURNING *
    `;
    return pendencia;
  }

  async atualizar(id: string, dto: any, empresaId: string) {
    // Verifica se a pendência pertence a uma visita da empresa
    const [p] = await this.sql`
      SELECT p.id FROM pendencias p
      JOIN visitas v ON v.id = p.visita_id
      WHERE p.id = ${id} AND v.empresa_id = ${empresaId}
    `;
    if (!p) throw new NotFoundException('Pendência não encontrada');

    const [pendencia] = await this.sql`
      UPDATE pendencias SET
        status = COALESCE(${dto.status || null}, status),
        responsavel = COALESCE(${dto.responsavel || null}, responsavel),
        prazo = COALESCE(${dto.prazo || null}, prazo),
        resolvida_em = CASE WHEN ${dto.status || null} = 'resolvida' THEN NOW() ELSE resolvida_em END,
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return pendencia;
  }

  async excluir(id: string, empresaId: string) {
    const [p] = await this.sql`
      SELECT p.id FROM pendencias p
      JOIN visitas v ON v.id = p.visita_id
      WHERE p.id = ${id} AND v.empresa_id = ${empresaId}
    `;
    if (!p) throw new NotFoundException('Pendência não encontrada');
    await this.sql`DELETE FROM pendencias WHERE id = ${id}`;
    return { ok: true };
  }
}
