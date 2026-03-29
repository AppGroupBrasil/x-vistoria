import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class CondominiosService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar(empresaId: string, supervisorId?: string, filtros: any = {}) {
    const page = Math.max(1, Number.parseInt(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filtros.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClause = this.sql`
      WHERE c.empresa_id = ${empresaId}
        ${supervisorId ? this.sql`AND c.id IN (
          SELECT condominio_id FROM supervisor_condominios WHERE supervisor_id = ${supervisorId}
        )` : this.sql``}
        ${filtros.busca ? this.sql`AND c.nome ILIKE ${'%' + filtros.busca + '%'}` : this.sql``}
    `;

    const [{ count }] = await this.sql`
      SELECT COUNT(*)::int as count FROM condominios c ${whereClause}
    `;

    const data = await this.sql`
      SELECT c.*,
             COUNT(DISTINCT sc.supervisor_id)::int as total_supervisores,
             COUNT(DISTINCT v.id) FILTER (WHERE v.status NOT IN ('concluida'))::int as visitas_ativas,
             COALESCE(
               json_agg(
                 json_build_object('id', u.id, 'nome', u.nome)
               ) FILTER (WHERE u.id IS NOT NULL),
               '[]'
             ) as supervisores
      FROM condominios c
      LEFT JOIN supervisor_condominios sc ON sc.condominio_id = c.id
      LEFT JOIN usuarios u ON u.id = sc.supervisor_id
      LEFT JOIN visitas v ON v.condominio_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.nome
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { data, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async buscarPorId(id: string) {
    const [cond] = await this.sql`
      SELECT c.*,
             json_agg(json_build_object('id', u.id, 'nome', u.nome, 'email', u.email))
               FILTER (WHERE u.id IS NOT NULL) as supervisores
      FROM condominios c
      LEFT JOIN supervisor_condominios sc ON sc.condominio_id = c.id
      LEFT JOIN usuarios u ON u.id = sc.supervisor_id
      WHERE c.id = ${id}
      GROUP BY c.id
    `;
    if (!cond) throw new NotFoundException('Condomínio não encontrado');
    return cond;
  }

  async criar(dto: any, empresaId: string) {
    const [cond] = await this.sql`
      INSERT INTO condominios (empresa_id, nome, endereco, cidade, estado, cep, sindico_nome, sindico_email, sindico_telefone, total_unidades)
      VALUES (${empresaId}, ${dto.nome}, ${dto.endereco || null}, ${dto.cidade || null}, ${dto.estado || null},
              ${dto.cep || null}, ${dto.sindico_nome || null}, ${dto.sindico_email || null},
              ${dto.sindico_telefone || null}, ${dto.total_unidades || null})
      RETURNING *
    `;
    return cond;
  }

  async atualizar(id: string, dto: any) {
    const [cond] = await this.sql`
      UPDATE condominios SET
        nome = COALESCE(${dto.nome || null}, nome),
        endereco = COALESCE(${dto.endereco || null}, endereco),
        cidade = COALESCE(${dto.cidade || null}, cidade),
        estado = COALESCE(${dto.estado || null}, estado),
        cep = COALESCE(${dto.cep || null}, cep),
        sindico_nome = COALESCE(${dto.sindico_nome || null}, sindico_nome),
        sindico_email = COALESCE(${dto.sindico_email || null}, sindico_email),
        sindico_telefone = COALESCE(${dto.sindico_telefone || null}, sindico_telefone),
        total_unidades = COALESCE(${dto.total_unidades || null}, total_unidades),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!cond) throw new NotFoundException();
    return cond;
  }

  async vincularSupervisor(condominioId: string, supervisorId: string) {
    await this.sql`
      INSERT INTO supervisor_condominios (condominio_id, supervisor_id)
      VALUES (${condominioId}, ${supervisorId})
      ON CONFLICT DO NOTHING
    `;
    return { ok: true };
  }

  async desvincularSupervisor(condominioId: string, supervisorId: string) {
    await this.sql`
      DELETE FROM supervisor_condominios
      WHERE condominio_id = ${condominioId} AND supervisor_id = ${supervisorId}
    `;
    return { ok: true };
  }

  async excluir(id: string) {
    const [cond] = await this.sql`SELECT id FROM condominios WHERE id = ${id}`;
    if (!cond) throw new NotFoundException('Condomínio não encontrado');
    await this.sql`DELETE FROM condominios WHERE id = ${id}`;
    return { ok: true };
  }

  // ====== ESPAÇOS ======

  async listarEspacos(condominioId: string) {
    return this.sql`
      SELECT e.*,
             COUNT(v.id) FILTER (WHERE v.visivel_portal = true)::int as visitas_visiveis
      FROM espacos e
      LEFT JOIN visitas v ON v.espaco_id = e.id AND v.visivel_portal = true
      WHERE e.condominio_id = ${condominioId}
      GROUP BY e.id
      ORDER BY e.nome
    `;
  }

  async criarEspaco(condominioId: string, empresaId: string, nome: string) {
    const [espaco] = await this.sql`
      INSERT INTO espacos (condominio_id, empresa_id, nome)
      VALUES (${condominioId}, ${empresaId}, ${nome})
      RETURNING *
    `;
    return espaco;
  }

  async excluirEspaco(condominioId: string, espacoId: string) {
    const [espaco] = await this.sql`
      SELECT id FROM espacos WHERE id = ${espacoId} AND condominio_id = ${condominioId}
    `;
    if (!espaco) throw new NotFoundException('Espaço não encontrado');
    await this.sql`DELETE FROM espacos WHERE id = ${espacoId}`;
    return { ok: true };
  }

  async atribuirVistoriaEspaco(condominioId: string, visitaId: string, espacoId: string | null) {
    const [visita] = await this.sql`
      SELECT id FROM visitas WHERE id = ${visitaId} AND condominio_id = ${condominioId}
    `;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    if (espacoId) {
      const [espaco] = await this.sql`
        SELECT id FROM espacos WHERE id = ${espacoId} AND condominio_id = ${condominioId}
      `;
      if (!espaco) throw new NotFoundException('Espaço não encontrado');
    }
    await this.sql`
      UPDATE visitas SET espaco_id = ${espacoId}, atualizado_em = NOW()
      WHERE id = ${visitaId}
    `;
    return { ok: true };
  }

  async listarVisitasPortal(condominioId: string) {
    return this.sql`
      SELECT v.id, v.protocolo, v.titulo, v.status, v.visivel_portal,
             v.espaco_id, v.criado_em, v.finalizada_em,
             u.nome as supervisor_nome,
             es.nome as espaco_nome
      FROM visitas v
      LEFT JOIN espacos es ON es.id = v.espaco_id
      LEFT JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.condominio_id = ${condominioId}
        AND v.status IN ('concluida', 'aprovada', 'enviada_sindico')
      ORDER BY v.criado_em DESC
    `;
  }

  async toggleVisivelPortal(condominioId: string, visitaId: string, visivel: boolean) {
    const [visita] = await this.sql`
      SELECT id FROM visitas WHERE id = ${visitaId} AND condominio_id = ${condominioId}
    `;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    await this.sql`
      UPDATE visitas SET visivel_portal = ${visivel}, atualizado_em = NOW()
      WHERE id = ${visitaId}
    `;
    return { ok: true };
  }
}
