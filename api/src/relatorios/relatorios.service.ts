import { Injectable, Inject } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class RelatoriosService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  private buildFiltros(filtros: any, useAlias: boolean) {
    const { dataInicio, dataFim, supervisorId, condominioId } = filtros;
    if (useAlias) {
      return this.sql`
        ${dataInicio ? this.sql`AND v.criado_em >= ${dataInicio}` : this.sql``}
        ${dataFim ? this.sql`AND v.criado_em <= ${dataFim}` : this.sql``}
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}
        ${condominioId ? this.sql`AND v.condominio_id = ${condominioId}` : this.sql``}
      `;
    }
    return this.sql`
      ${dataInicio ? this.sql`AND criado_em >= ${dataInicio}` : this.sql``}
      ${dataFim ? this.sql`AND criado_em <= ${dataFim}` : this.sql``}
      ${supervisorId ? this.sql`AND supervisor_id = ${supervisorId}` : this.sql``}
      ${condominioId ? this.sql`AND condominio_id = ${condominioId}` : this.sql``}
    `;
  }

  async resumoGeral(empresaId: string, filtros: any = {}) {
    const f = this.buildFiltros(filtros, false);
    const fv = this.buildFiltros(filtros, true);

    const [totais] = await this.sql`
      SELECT
        COUNT(*)::int as total_visitas,
        COUNT(*) FILTER (WHERE status = 'nao_iniciada')::int as abertas,
        COUNT(*) FILTER (WHERE status = 'em_andamento')::int as em_andamento,
        COUNT(*) FILTER (WHERE status = 'pausada')::int as pausadas,
        COUNT(*) FILTER (WHERE status = 'aguardando_aprovacao')::int as aguardando,
        COUNT(*) FILTER (WHERE status = 'concluida')::int as concluidas,
        COALESCE(AVG(tempo_total_segundos) FILTER (WHERE tempo_total_segundos > 0), 0)::int as tempo_medio_segundos
      FROM visitas
      WHERE empresa_id = ${empresaId}
        ${f}
    `;

    const porStatus = await this.sql`
      SELECT status, COUNT(*)::int as total
      FROM visitas
      WHERE empresa_id = ${empresaId}
        ${f}
      GROUP BY status
    `;

    const porSupervisor = await this.sql`
      SELECT u.nome, COUNT(v.id)::int as total,
             COUNT(*) FILTER (WHERE v.status = 'concluida')::int as concluidas
      FROM visitas v
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.empresa_id = ${empresaId}
        ${fv}
      GROUP BY u.nome
      ORDER BY total DESC
    `;

    const porCondominio = await this.sql`
      SELECT c.nome, COUNT(v.id)::int as total,
             COUNT(*) FILTER (WHERE v.status = 'concluida')::int as concluidas,
             COUNT(DISTINCT p.id)::int as total_pendencias
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      LEFT JOIN pendencias p ON p.visita_id = v.id
      WHERE v.empresa_id = ${empresaId}
        ${fv}
      GROUP BY c.nome
      ORDER BY total DESC
    `;

    const porMes = await this.sql`
      SELECT
        TO_CHAR(v.criado_em, 'YYYY-MM') as mes,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE v.status = 'concluida')::int as concluidas
      FROM visitas v
      WHERE v.empresa_id = ${empresaId}
        ${fv}
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `;

    const conformidade = await this.sql`
      SELECT
        COUNT(*) FILTER (WHERE r.resultado = 'ok')::int as ok,
        COUNT(*) FILTER (WHERE r.resultado = 'nao_ok')::int as nao_ok,
        COUNT(*) FILTER (WHERE r.resultado = 'na')::int as na,
        COUNT(*)::int as total
      FROM respostas r
      JOIN visitas v ON v.id = r.visita_id
      WHERE v.empresa_id = ${empresaId}
        ${fv}
    `;

    return {
      totais,
      porStatus,
      porSupervisor,
      porCondominio,
      porMes,
      conformidade: conformidade[0] || { ok: 0, nao_ok: 0, na: 0, total: 0 },
    };
  }
}
