import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SQL } from '../database/database.module';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class VisitasService {
  private readonly logger = new Logger(VisitasService.name);

  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly gateway: AppGateway,
  ) {}

  async listar(empresaId: string, filtros: any = {}) {
    const { status, supervisorId, condominioId, dataInicio, dataFim, protocolo, busca } = filtros;
    const page = Math.max(1, Number.parseInt(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filtros.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClause = this.sql`
      WHERE v.empresa_id = ${empresaId}
        ${status ? this.sql`AND v.status = ${status}` : this.sql``}
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}
        ${condominioId ? this.sql`AND v.condominio_id = ${condominioId}` : this.sql``}
        ${dataInicio ? this.sql`AND v.criado_em >= ${dataInicio}` : this.sql``}
        ${dataFim ? this.sql`AND v.criado_em <= ${dataFim}` : this.sql``}
        ${protocolo ? this.sql`AND v.protocolo LIKE ${protocolo + '%'}` : this.sql``}
        ${busca ? this.sql`AND (
          c.nome ILIKE ${'%' + busca + '%'}
          OR u.nome ILIKE ${'%' + busca + '%'}
          OR v.protocolo LIKE ${busca + '%'}
          OR v.titulo ILIKE ${'%' + busca + '%'}
        )` : this.sql``}
    `;

    const [{ count }] = await this.sql`
      SELECT COUNT(DISTINCT v.id)::int as count
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      ${whereClause}
    `;

    const data = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco as condominio_endereco,
             u.nome as supervisor_nome,
             COUNT(DISTINCT r.id)::int as total_respostas,
             COUNT(DISTINCT p.id)::int as total_pendencias,
             COUNT(DISTINCT f.id)::int as total_fotos
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      LEFT JOIN respostas r ON r.visita_id = v.id
      LEFT JOIN pendencias p ON p.visita_id = v.id
      LEFT JOIN fotos f ON f.visita_id = v.id
      ${whereClause}
      GROUP BY v.id, c.nome, c.endereco, u.nome
      ORDER BY v.criado_em DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { data, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async buscarPorId(id: string, empresaId?: string) {
    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco as condominio_endereco,
             c.sindico_nome, c.sindico_email,
             u.nome as supervisor_nome, u.email as supervisor_email, u.telefone as supervisor_telefone
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.id = ${id}
        ${empresaId ? this.sql`AND v.empresa_id = ${empresaId}` : this.sql``}
    `;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    return visita;
  }

  async criar(dto: any, supervisorId: string, empresaId: string) {
    // Gerar protocolo numérico de 6 dígitos
    const protocolo = await this.gerarProtocolo();

    const [visita] = await this.sql`
      INSERT INTO visitas (empresa_id, condominio_id, supervisor_id, template_id, titulo, protocolo)
      VALUES (${empresaId}, ${dto.condominio_id}, ${supervisorId}, ${dto.template_id || null}, ${dto.titulo || null}, ${protocolo})
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:criada', visita);
    return visita;
  }

  private async gerarProtocolo(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const num = String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0');
      const [existe] = await this.sql`SELECT id FROM visitas WHERE protocolo = ${num}`;
      if (!existe) return num;
    }
    // Fallback: buscar o maior e incrementar
    const [max] = await this.sql`SELECT MAX(protocolo::int) as m FROM visitas WHERE protocolo IS NOT NULL`;
    return String((max?.m || 0) + 1).padStart(6, '0');
  }

  async iniciar(id: string, supervisorId: string, empresaId: string) {
    const visita = await this.buscarPorId(id);
    if (visita.status !== 'nao_iniciada' && visita.status !== 'pausada') {
      throw new BadRequestException('Visita não pode ser iniciada nesse status');
    }

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'em_andamento', iniciada_em = COALESCE(iniciada_em, NOW()), atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:iniciada', { id, supervisor_id: supervisorId });
    return updated;
  }

  async pausar(id: string, supervisorId: string, empresaId: string) {
    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'pausada', pausada_em = NOW(), atualizado_em = NOW()
      WHERE id = ${id} AND status = 'em_andamento'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita não está em andamento');

    this.gateway.emitParaEmpresa(empresaId, 'visita:pausada', { id });
    return updated;
  }

  async finalizar(id: string, supervisorId: string, empresaId: string, observacoes?: string) {
    const visita = await this.buscarPorId(id);

    // Calcula tempo total
    const iniciada = new Date(visita.iniciada_em).getTime();
    const agora = Date.now();
    const tempoTotal = Math.floor((agora - iniciada) / 1000);

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'aguardando_aprovacao',
          finalizada_em = NOW(),
          observacoes_gerais = COALESCE(${observacoes || null}, observacoes_gerais),
          tempo_total_segundos = ${tempoTotal},
          atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(empresaId, 'visita:finalizada', { id, supervisor_id: supervisorId });
    return updated;
  }

  async aprovar(id: string, adminId: string, empresaId: string) {
    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'aprovada', aprovada_em = NOW(), aprovada_por = ${adminId}, atualizado_em = NOW()
      WHERE id = ${id} AND status = 'aguardando_aprovacao'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita não está aguardando aprovação');

    this.gateway.emitParaEmpresa(empresaId, 'visita:aprovada', { id });
    return updated;
  }

  async enviarSindico(id: string, adminId: string, empresaId: string) {
    const token = uuidv4();

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'enviada_sindico', enviada_sindico_em = NOW(), atualizado_em = NOW()
      WHERE id = ${id} AND status = 'aprovada'
      RETURNING *
    `;
    if (!updated) throw new BadRequestException('Visita precisa estar aprovada');

    await this.sql`
      INSERT INTO confirmacoes_sindico (visita_id, condominio_id, token)
      VALUES (${id}, ${updated.condominio_id}, ${token})
    `;

    return { ...updated, token_sindico: token };
  }

  async atualizar(id: string, empresaId: string, dto: { titulo?: string; observacoes_gerais?: string; localizacao_lat?: number; localizacao_lng?: number }) {
    const [updated] = await this.sql`
      UPDATE visitas
      SET titulo = COALESCE(${dto.titulo ?? null}, titulo),
          observacoes_gerais = COALESCE(${dto.observacoes_gerais ?? null}, observacoes_gerais),
          localizacao_lat = COALESCE(${dto.localizacao_lat ?? null}, localizacao_lat),
          localizacao_lng = COALESCE(${dto.localizacao_lng ?? null}, localizacao_lng),
          atualizado_em = NOW()
      WHERE id = ${id} AND empresa_id = ${empresaId}
      RETURNING *
    `;

    return updated;
  }

  async listarTimeline(empresaId: string, supervisorId?: string, limite = 50) {
    return this.sql`
      SELECT
        'visita' as tipo,
        v.id,
        v.status,
        v.atualizado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        u.id as supervisor_id,
        NULL as texto,
        NULL as foto_url,
        v.identificacao_lat as lat,
        v.identificacao_lng as lng
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.empresa_id = ${empresaId}
        AND v.atualizado_em > NOW() - INTERVAL '24 hours'
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}

      UNION ALL

      SELECT
        'mensagem' as tipo,
        m.id,
        NULL as status,
        m.criado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        u.id as supervisor_id,
        m.texto,
        NULL as foto_url,
        NULL as lat,
        NULL as lng
      FROM mensagens m
      JOIN visitas v ON v.id = m.visita_id
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = m.autor_id
      WHERE v.empresa_id = ${empresaId}
        AND m.criado_em > NOW() - INTERVAL '24 hours'
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}

      UNION ALL

      SELECT
        'foto' as tipo,
        f.id,
        NULL as status,
        f.criado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        u.id as supervisor_id,
        NULL as texto,
        f.url as foto_url,
        f.localizacao_lat as lat,
        f.localizacao_lng as lng
      FROM fotos f
      JOIN visitas v ON v.id = f.visita_id
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.empresa_id = ${empresaId}
        AND f.criado_em > NOW() - INTERVAL '24 hours'
        ${supervisorId ? this.sql`AND v.supervisor_id = ${supervisorId}` : this.sql``}

      UNION ALL

      SELECT
        'vistoria_livre' as tipo,
        vl.id,
        vl.status,
        vl.atualizado_em as momento,
        c.nome as condominio_nome,
        u.nome as supervisor_nome,
        u.id as supervisor_id,
        vl.titulo as texto,
        NULL as foto_url,
        vl.localizacao_lat as lat,
        vl.localizacao_lng as lng
      FROM vistorias_livres vl
      JOIN condominios c ON c.id = vl.condominio_id
      JOIN usuarios u ON u.id = vl.supervisor_id
      WHERE vl.empresa_id = ${empresaId}
        AND vl.atualizado_em > NOW() - INTERVAL '24 hours'
        ${supervisorId ? this.sql`AND vl.supervisor_id = ${supervisorId}` : this.sql``}

      UNION ALL

      SELECT
        'checklist' as tipo,
        ce.id,
        ce.status,
        ce.atualizado_em as momento,
        ce.local_nome as condominio_nome,
        u.nome as supervisor_nome,
        u.id as supervisor_id,
        ce.titulo as texto,
        NULL as foto_url,
        COALESCE(ce.fim_lat, ce.inicio_lat) as lat,
        COALESCE(ce.fim_lng, ce.inicio_lng) as lng
      FROM checklist_execucoes ce
      JOIN usuarios u ON u.id = ce.executor_id
      WHERE ce.empresa_id = ${empresaId}
        AND ce.atualizado_em > NOW() - INTERVAL '24 hours'
        ${supervisorId ? this.sql`AND ce.executor_id = ${supervisorId}` : this.sql``}

      ORDER BY momento DESC
      LIMIT ${limite}
    `;
  }

  async listarSupervisoresAtivos(empresaId: string) {
    return this.sql`
      SELECT DISTINCT u.id, u.nome, u.email,
        (SELECT COUNT(*) FROM visitas v2 WHERE v2.supervisor_id = u.id AND v2.status = 'em_andamento') as visitas_ativas
      FROM usuarios u
      WHERE u.empresa_id = ${empresaId}
        AND u.role = 'supervisor'
        AND u.ativo = true
      ORDER BY u.nome
    `;
  }

  async localizacoesSupervisores(empresaId: string) {
    return this.sql`
      SELECT DISTINCT ON (u.id)
        u.id as supervisor_id,
        u.nome as supervisor_nome,
        u.email,
        v.identificacao_lat as lat,
        v.identificacao_lng as lng,
        v.atualizado_em as momento,
        c.nome as condominio_nome,
        v.status
      FROM visitas v
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN condominios c ON c.id = v.condominio_id
      WHERE v.empresa_id = ${empresaId}
        AND u.role = 'supervisor'
        AND v.identificacao_lat IS NOT NULL
        AND v.atualizado_em > NOW() - INTERVAL '24 hours'
      ORDER BY u.id, v.atualizado_em DESC
    `;
  }

  async localizacoesVistorias(empresaId: string) {
    return this.sql`
      SELECT
        v.id,
        v.titulo,
        v.protocolo,
        v.status,
        v.identificacao_lat as lat,
        v.identificacao_lng as lng,
        v.iniciada_em,
        v.finalizada_em,
        v.criado_em,
        u.id as funcionario_id,
        u.nome as funcionario_nome,
        c.nome as condominio_nome
      FROM visitas v
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN condominios c ON c.id = v.condominio_id
      WHERE v.empresa_id = ${empresaId}
        AND v.identificacao_lat IS NOT NULL
        AND v.identificacao_lng IS NOT NULL
      ORDER BY v.criado_em DESC
      LIMIT 200
    `;
  }

  async reatribuir(id: string, novoSupervisorId: string, empresaId: string) {
    const [updated] = await this.sql`
      UPDATE visitas SET supervisor_id = ${novoSupervisorId}, atualizado_em = NOW()
      WHERE id = ${id} AND empresa_id = ${empresaId}
      RETURNING *
    `;
    if (!updated) throw new NotFoundException('Visita não encontrada');
    return updated;
  }

  async alterarStatus(id: string, novoStatus: string, usuario: any) {
    const statusValidos = ['nao_iniciada', 'em_andamento', 'pausada', 'aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida'];
    if (!statusValidos.includes(novoStatus)) {
      throw new BadRequestException('Status inválido');
    }

    // Máquina de estados: transições permitidas
    const transicoesPermitidas: Record<string, string[]> = {
      nao_iniciada: ['em_andamento'],
      em_andamento: ['pausada', 'aguardando_aprovacao'],
      pausada: ['em_andamento'],
      aguardando_aprovacao: ['aprovada', 'em_andamento'], // pode rejeitar voltando a em_andamento
      aprovada: ['enviada_sindico'],
      enviada_sindico: ['concluida'],
      concluida: [],
    };

    const visita = await this.buscarPorId(id, usuario.empresa_id);
    const permitidas = transicoesPermitidas[visita.status] || [];

    // Master pode fazer qualquer transição
    if (usuario.role !== 'master' && !permitidas.includes(novoStatus)) {
      throw new BadRequestException(
        `Transição de "${visita.status}" para "${novoStatus}" não é permitida`,
      );
    }

    const [updated] = await this.sql`
      UPDATE visitas SET
        status = ${novoStatus},
        iniciada_em = CASE WHEN ${novoStatus} = 'em_andamento' AND iniciada_em IS NULL THEN NOW() ELSE iniciada_em END,
        finalizada_em = CASE WHEN ${novoStatus} IN ('aguardando_aprovacao', 'concluida') AND finalizada_em IS NULL THEN NOW() ELSE finalizada_em END,
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!updated) throw new NotFoundException();

    this.logger.log(`Visita ${id}: ${visita.status} → ${novoStatus} (por ${usuario.sub})`);
    this.gateway.emitParaEmpresa(usuario.empresa_id, `visita:${novoStatus}`, { id, supervisor_id: usuario.sub });
    return updated;
  }

  async excluir(id: string, usuario: any) {
    if (usuario.role !== 'admin' && usuario.role !== 'master') {
      // Verifica se supervisor tem permissão
      const [usr] = await this.sql`SELECT pode_excluir FROM usuarios WHERE id = ${usuario.sub}`;
      if (!usr?.pode_excluir) throw new BadRequestException('Sem permissão para excluir vistorias');
    }

    const [visita] = await this.sql`SELECT id FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    await this.sql`DELETE FROM visitas WHERE id = ${id}`;
    return { ok: true };
  }
}
