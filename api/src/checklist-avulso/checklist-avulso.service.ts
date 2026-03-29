import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { SQL } from '../database/database.module';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ChecklistAvulsoService {
  private readonly logger = new Logger(ChecklistAvulsoService.name);

  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly uploadService: UploadService,
  ) {}

  // ─── MODELOS ────────────────────────────────────────────

  async listarModelos(empresaId: string) {
    return this.sql`
      SELECT m.*, u.nome as criado_por_nome,
        (SELECT count(*) FROM checklist_modelo_itens WHERE modelo_id = m.id)::int as total_itens
      FROM checklist_modelos m
      JOIN usuarios u ON u.id = m.criado_por
      WHERE m.empresa_id = ${empresaId} AND m.ativo = true
      ORDER BY m.criado_em DESC
    `;
  }

  async obterModelo(id: string, empresaId: string) {
    const [modelo] = await this.sql`
      SELECT m.*, u.nome as criado_por_nome
      FROM checklist_modelos m
      JOIN usuarios u ON u.id = m.criado_por
      WHERE m.id = ${id} AND m.empresa_id = ${empresaId}
    `;
    if (!modelo) throw new NotFoundException('Modelo não encontrado');

    const itens = await this.sql`
      SELECT * FROM checklist_modelo_itens
      WHERE modelo_id = ${id}
      ORDER BY ordem, criado_em
    `;
    return { ...modelo, itens };
  }

  async criarModelo(data: { titulo: string; descricao?: string; itens: string[] }, empresaId: string, userId: string) {
    const [modelo] = await this.sql`
      INSERT INTO checklist_modelos (empresa_id, criado_por, titulo, descricao)
      VALUES (${empresaId}, ${userId}, ${data.titulo}, ${data.descricao || null})
      RETURNING *
    `;

    if (data.itens?.length) {
      for (let i = 0; i < data.itens.length; i++) {
        await this.sql`
          INSERT INTO checklist_modelo_itens (modelo_id, titulo, ordem)
          VALUES (${modelo.id}, ${data.itens[i]}, ${i})
        `;
      }
    }

    this.logger.log(`Modelo criado: ${modelo.titulo} (${data.itens?.length || 0} itens)`);
    return modelo;
  }

  async atualizarModelo(id: string, data: { titulo?: string; descricao?: string; itens?: string[] }, empresaId: string) {
    const [modelo] = await this.sql`
      SELECT * FROM checklist_modelos WHERE id = ${id} AND empresa_id = ${empresaId}
    `;
    if (!modelo) throw new NotFoundException('Modelo não encontrado');

    const [updated] = await this.sql`
      UPDATE checklist_modelos
      SET titulo = COALESCE(${data.titulo || null}, titulo),
          descricao = COALESCE(${data.descricao ?? null}, descricao)
      WHERE id = ${id}
      RETURNING *
    `;

    if (data.itens) {
      await this.sql`DELETE FROM checklist_modelo_itens WHERE modelo_id = ${id}`;
      for (let i = 0; i < data.itens.length; i++) {
        await this.sql`
          INSERT INTO checklist_modelo_itens (modelo_id, titulo, ordem)
          VALUES (${id}, ${data.itens[i]}, ${i})
        `;
      }
    }

    return updated;
  }

  async excluirModelo(id: string, empresaId: string) {
    const [modelo] = await this.sql`
      SELECT * FROM checklist_modelos WHERE id = ${id} AND empresa_id = ${empresaId}
    `;
    if (!modelo) throw new NotFoundException('Modelo não encontrado');

    await this.sql`UPDATE checklist_modelos SET ativo = false WHERE id = ${id}`;
  }

  // ─── EXECUÇÕES ──────────────────────────────────────────

  async listarExecucoes(empresaId: string, userId: string, role: string) {
    if (role === 'admin' || role === 'master') {
      return this.sql`
        SELECT e.*, u.nome as executor_nome,
          m.titulo as modelo_titulo,
          (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id)::int as total_itens,
          (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id AND conforme = true)::int as total_ok,
          (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id AND conforme = false)::int as total_problemas
        FROM checklist_execucoes e
        JOIN usuarios u ON u.id = e.executor_id
        LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
        WHERE e.empresa_id = ${empresaId}
        ORDER BY e.criado_em DESC
      `;
    }
    return this.sql`
      SELECT e.*, u.nome as executor_nome,
        m.titulo as modelo_titulo,
        (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id)::int as total_itens,
        (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id AND conforme = true)::int as total_ok,
        (SELECT count(*) FROM checklist_execucao_itens WHERE execucao_id = e.id AND conforme = false)::int as total_problemas
      FROM checklist_execucoes e
      JOIN usuarios u ON u.id = e.executor_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      WHERE e.empresa_id = ${empresaId} AND e.executor_id = ${userId}
      ORDER BY e.criado_em DESC
    `;
  }

  async obterExecucao(id: string, empresaId: string) {
    const [exec] = await this.sql`
      SELECT e.*, u.nome as executor_nome, u.email as executor_email,
        m.titulo as modelo_titulo,
        emp.nome as empresa_nome
      FROM checklist_execucoes e
      JOIN usuarios u ON u.id = e.executor_id
      JOIN empresas emp ON emp.id = e.empresa_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      WHERE e.id = ${id} AND e.empresa_id = ${empresaId}
    `;
    if (!exec) throw new NotFoundException('Execução não encontrada');

    const itens = await this.sql`
      SELECT * FROM checklist_execucao_itens
      WHERE execucao_id = ${id}
      ORDER BY ordem, criado_em
    `;
    return { ...exec, itens };
  }

  async iniciarExecucao(data: {
    modelo_id?: string;
    titulo: string;
    local_nome?: string;
    selfie_url?: string;
    inicio_lat?: number;
    inicio_lng?: number;
    inicio_endereco?: string;
    itens?: string[];
  }, empresaId: string, userId: string) {
    const [exec] = await this.sql`
      INSERT INTO checklist_execucoes (
        empresa_id, executor_id, modelo_id, titulo, selfie_url, local_nome,
        inicio_lat, inicio_lng, inicio_endereco
      ) VALUES (
        ${empresaId}, ${userId}, ${data.modelo_id || null}, ${data.titulo},
        ${data.selfie_url || null}, ${data.local_nome || null},
        ${data.inicio_lat || null}, ${data.inicio_lng || null}, ${data.inicio_endereco || null}
      ) RETURNING *
    `;

    // Copy items from model or use custom items
    let itens: string[] = data.itens || [];
    if (data.modelo_id && !itens.length) {
      const modeloItens = await this.sql`
        SELECT titulo, ordem FROM checklist_modelo_itens
        WHERE modelo_id = ${data.modelo_id}
        ORDER BY ordem
      `;
      itens = modeloItens.map((i: any) => i.titulo);
    }

    for (let i = 0; i < itens.length; i++) {
      await this.sql`
        INSERT INTO checklist_execucao_itens (execucao_id, titulo, ordem)
        VALUES (${exec.id}, ${itens[i]}, ${i})
      `;
    }

    this.logger.log(`Execução iniciada: ${data.titulo} (${itens.length} itens) por user=${userId}`);
    return exec;
  }

  async marcarItem(itemId: string, data: { conforme: boolean; problema_descricao?: string }, empresaId: string) {
    const [item] = await this.sql`
      SELECT i.*, e.empresa_id FROM checklist_execucao_itens i
      JOIN checklist_execucoes e ON e.id = i.execucao_id
      WHERE i.id = ${itemId} AND e.empresa_id = ${empresaId}
    `;
    if (!item) throw new NotFoundException('Item não encontrado');

    const [updated] = await this.sql`
      UPDATE checklist_execucao_itens
      SET conforme = ${data.conforme},
          problema_descricao = ${data.problema_descricao || null},
          verificado_em = NOW()
      WHERE id = ${itemId}
      RETURNING *
    `;
    return updated;
  }

  async uploadFotoProblema(itemId: string, buffer: Buffer, mimetype: string, empresaId: string) {
    const [item] = await this.sql`
      SELECT i.*, e.empresa_id, e.id as exec_id FROM checklist_execucao_itens i
      JOIN checklist_execucoes e ON e.id = i.execucao_id
      WHERE i.id = ${itemId} AND e.empresa_id = ${empresaId}
    `;
    if (!item) throw new NotFoundException('Item não encontrado');

    const result = await this.uploadService.uploadFoto(buffer, mimetype, item.exec_id);

    await this.sql`
      UPDATE checklist_execucao_itens
      SET problema_foto_url = ${result.url},
          problema_foto_thumb = ${result.thumbnail_url}
      WHERE id = ${itemId}
    `;

    return result;
  }

  async uploadSelfie(execId: string, buffer: Buffer, mimetype: string, empresaId: string) {
    const [exec] = await this.sql`
      SELECT * FROM checklist_execucoes WHERE id = ${execId} AND empresa_id = ${empresaId}
    `;
    if (!exec) throw new NotFoundException('Execução não encontrada');

    const result = await this.uploadService.uploadFoto(buffer, mimetype, execId);

    await this.sql`
      UPDATE checklist_execucoes SET selfie_url = ${result.url} WHERE id = ${execId}
    `;

    return result;
  }

  async finalizarExecucao(id: string, data: {
    fim_lat?: number;
    fim_lng?: number;
    fim_endereco?: string;
    observacao?: string;
  }, empresaId: string) {
    const [exec] = await this.sql`
      SELECT * FROM checklist_execucoes WHERE id = ${id} AND empresa_id = ${empresaId}
    `;
    if (!exec) throw new NotFoundException('Execução não encontrada');

    const [updated] = await this.sql`
      UPDATE checklist_execucoes
      SET status = 'concluida',
          finalizado_em = NOW(),
          fim_lat = ${data.fim_lat || null},
          fim_lng = ${data.fim_lng || null},
          fim_endereco = ${data.fim_endereco || null},
          observacao = ${data.observacao || null}
      WHERE id = ${id}
      RETURNING *
    `;

    this.logger.log(`Execução finalizada: ${exec.titulo} (id=${id})`);
    return updated;
  }

  async excluirExecucao(id: string, empresaId: string) {
    const [exec] = await this.sql`
      SELECT * FROM checklist_execucoes WHERE id = ${id} AND empresa_id = ${empresaId}
    `;
    if (!exec) throw new NotFoundException('Execução não encontrada');

    await this.sql`DELETE FROM checklist_execucao_itens WHERE execucao_id = ${id}`;
    await this.sql`DELETE FROM checklist_execucoes WHERE id = ${id}`;
  }

  // ─── RELATÓRIO PÚBLICO ──────────────────────────────────

  async obterExecucaoPublica(id: string) {
    const [exec] = await this.sql`
      SELECT e.*, u.nome as executor_nome, u.email as executor_email,
        m.titulo as modelo_titulo,
        emp.nome as empresa_nome
      FROM checklist_execucoes e
      JOIN usuarios u ON u.id = e.executor_id
      JOIN empresas emp ON emp.id = e.empresa_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      WHERE e.id = ${id} AND e.status = 'concluida'
    `;
    if (!exec) throw new NotFoundException('Relatório não encontrado');

    const itens = await this.sql`
      SELECT * FROM checklist_execucao_itens
      WHERE execucao_id = ${id}
      ORDER BY ordem, criado_em
    `;
    return { ...exec, itens };
  }
}
