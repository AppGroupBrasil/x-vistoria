import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class ChecklistService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listarCategorias(empresaId?: string) {
    return this.sql`
      SELECT c.*, COUNT(p.id) as total_perguntas
      FROM categorias c
      LEFT JOIN perguntas p ON p.categoria_id = c.id AND p.ativo = true
      WHERE (c.empresa_id IS NULL OR c.empresa_id = ${empresaId || null})
        AND c.ativo = true
      GROUP BY c.id
      ORDER BY c.ordem, c.nome
    `;
  }

  async listarPerguntasPorCategoria(categoriaId: string) {
    return this.sql`
      SELECT * FROM perguntas
      WHERE categoria_id = ${categoriaId} AND ativo = true
      ORDER BY ordem
    `;
  }

  async listarTodasPerguntas(empresaId?: string) {
    return this.sql`
      SELECT p.*, c.nome as categoria_nome, c.icone as categoria_icone, c.ordem as categoria_ordem
      FROM perguntas p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.ativo = true
        AND (c.empresa_id IS NULL OR c.empresa_id = ${empresaId || null})
        AND c.ativo = true
      ORDER BY c.ordem, p.ordem
    `;
  }

  // =========== CATEGORIAS CRUD ===========

  async criarCategoria(dto: any, empresaId: string) {
    const [cat] = await this.sql`
      INSERT INTO categorias (empresa_id, nome, descricao, icone, ordem)
      VALUES (${empresaId}, ${dto.nome}, ${dto.descricao || null}, ${dto.icone || null}, ${dto.ordem || 0})
      RETURNING *
    `;
    return cat;
  }

  async atualizarCategoria(id: string, dto: any) {
    const [cat] = await this.sql`
      UPDATE categorias SET
        nome = COALESCE(${dto.nome || null}, nome),
        descricao = COALESCE(${dto.descricao || null}, descricao),
        icone = COALESCE(${dto.icone || null}, icone),
        ordem = COALESCE(${dto.ordem ?? null}, ordem),
        ativo = COALESCE(${dto.ativo ?? null}, ativo)
      WHERE id = ${id}
      RETURNING *
    `;
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async excluirCategoria(id: string) {
    const [cat] = await this.sql`SELECT id, empresa_id FROM categorias WHERE id = ${id}`;
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    if (!cat.empresa_id) throw new BadRequestException('Categorias padrão não podem ser excluídas');
    await this.sql`DELETE FROM categorias WHERE id = ${id}`;
    return { ok: true };
  }

  // =========== PERGUNTAS CRUD ===========

  async criarPergunta(dto: any, empresaId: string) {
    const [pergunta] = await this.sql`
      INSERT INTO perguntas (categoria_id, empresa_id, texto, descricao, requer_sim_nao, requer_foto, requer_observacao, requer_avaliacao, ordem)
      VALUES (${dto.categoria_id}, ${empresaId}, ${dto.texto}, ${dto.descricao || null},
              ${dto.requer_sim_nao ?? true}, ${dto.requer_foto || false}, ${dto.requer_observacao || false}, ${dto.requer_avaliacao || false}, ${dto.ordem || 0})
      RETURNING *
    `;
    return pergunta;
  }

  async atualizarPergunta(id: string, dto: any) {
    const [pergunta] = await this.sql`
      UPDATE perguntas SET
        texto = COALESCE(${dto.texto || null}, texto),
        descricao = COALESCE(${dto.descricao || null}, descricao),
        requer_sim_nao = COALESCE(${dto.requer_sim_nao ?? null}, requer_sim_nao),
        requer_foto = COALESCE(${dto.requer_foto ?? null}, requer_foto),
        requer_observacao = COALESCE(${dto.requer_observacao ?? null}, requer_observacao),
        requer_avaliacao = COALESCE(${dto.requer_avaliacao ?? null}, requer_avaliacao),
        ordem = COALESCE(${dto.ordem ?? null}, ordem),
        ativo = COALESCE(${dto.ativo ?? null}, ativo)
      WHERE id = ${id}
      RETURNING *
    `;
    if (!pergunta) throw new NotFoundException('Pergunta não encontrada');
    return pergunta;
  }

  async excluirPergunta(id: string) {
    const [p] = await this.sql`SELECT id FROM perguntas WHERE id = ${id}`;
    if (!p) throw new NotFoundException('Pergunta não encontrada');
    await this.sql`UPDATE perguntas SET ativo = false WHERE id = ${id}`;
    return { ok: true };
  }

  async excluirPerguntasBulk(ids: string[]) {
    if (!ids.length) throw new BadRequestException('Nenhum ID fornecido');
    await this.sql`UPDATE perguntas SET ativo = false WHERE id = ANY(${ids})`;
    return { ok: true, excluidas: ids.length };
  }

  async listarTemplates(empresaId: string) {
    return this.sql`
      SELECT t.*, COUNT(tp.id) as total_perguntas
      FROM checklist_templates t
      LEFT JOIN template_perguntas tp ON tp.template_id = t.id
      WHERE t.empresa_id = ${empresaId} AND t.ativo = true
      GROUP BY t.id
      ORDER BY t.nome
    `;
  }

  async buscarTemplate(id: string) {
    const [template] = await this.sql`SELECT * FROM checklist_templates WHERE id = ${id}`;
    if (!template) throw new NotFoundException('Modelo de vistoria não encontrado');

    const perguntas = await this.sql`
      SELECT tp.ordem, tp.obrigatoria, p.*, c.nome as categoria_nome
      FROM template_perguntas tp
      JOIN perguntas p ON p.id = tp.pergunta_id
      JOIN categorias c ON c.id = p.categoria_id
      WHERE tp.template_id = ${id}
      ORDER BY tp.ordem
    `;

    return { ...template, perguntas };
  }

  async criarTemplate(dto: any, empresaId: string) {
    const [template] = await this.sql`
      INSERT INTO checklist_templates (empresa_id, nome, descricao)
      VALUES (${empresaId}, ${dto.nome}, ${dto.descricao || null})
      RETURNING *
    `;

    if (dto.perguntas?.length) {
      await this.sql`
        INSERT INTO template_perguntas ${this.sql(
          dto.perguntas.map((p: any, i: number) => ({
            template_id: template.id,
            pergunta_id: p.pergunta_id,
            ordem: p.ordem ?? i + 1,
            obrigatoria: p.obrigatoria ?? true,
          }))
        )}
      `;
    }

    return this.buscarTemplate(template.id);
  }

  async atualizarTemplate(id: string, dto: any) {
    const [template] = await this.sql`
      UPDATE checklist_templates SET
        nome = COALESCE(${dto.nome || null}, nome),
        descricao = COALESCE(${dto.descricao || null}, descricao),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!template) throw new NotFoundException('Modelo de vistoria não encontrado');

    if (dto.perguntas) {
      await this.sql`DELETE FROM template_perguntas WHERE template_id = ${id}`;
      if (dto.perguntas.length > 0) {
        await this.sql`
          INSERT INTO template_perguntas ${this.sql(
            dto.perguntas.map((p: any, i: number) => ({
              template_id: id,
              pergunta_id: p.pergunta_id,
              ordem: p.ordem ?? i + 1,
              obrigatoria: p.obrigatoria ?? true,
            }))
          )}
        `;
      }
    }

    return this.buscarTemplate(id);
  }

  async excluirTemplate(id: string) {
    const [t] = await this.sql`SELECT id FROM checklist_templates WHERE id = ${id}`;
    if (!t) throw new NotFoundException('Modelo de vistoria não encontrado');
    await this.sql`UPDATE checklist_templates SET ativo = false, atualizado_em = NOW() WHERE id = ${id}`;
    return { ok: true };
  }

  async listarRespostas(visitaId: string) {
    // Busca template_id da visita para trazer TODAS as perguntas (respondidas ou não)
    const [visita] = await this.sql`SELECT template_id FROM visitas WHERE id = ${visitaId}`;

    if (visita?.template_id) {
      return this.sql`
        SELECT
          r.id, r.visita_id, r.resultado, r.observacao,
          r.audio_url, r.transcricao_bruta, r.transcricao_corrigida, r.respondido_em,
          p.id as pergunta_id, p.texto as pergunta_texto,
          c.nome as categoria_nome, c.icone as categoria_icone
        FROM template_perguntas tp
        JOIN perguntas p ON p.id = tp.pergunta_id
        JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN respostas r ON r.pergunta_id = tp.pergunta_id AND r.visita_id = ${visitaId}
        WHERE tp.template_id = ${visita.template_id}
        ORDER BY c.ordem, tp.ordem
      `;
    }

    // Fallback: visita sem template, retorna apenas respostas existentes
    return this.sql`
      SELECT r.*, p.texto as pergunta_texto, c.nome as categoria_nome
      FROM respostas r
      JOIN perguntas p ON p.id = r.pergunta_id
      JOIN categorias c ON c.id = p.categoria_id
      WHERE r.visita_id = ${visitaId}
      ORDER BY c.ordem, p.ordem
    `;
  }

  async salvarResposta(dto: any, usuario?: { role: string }) {
    // Verificar se a visita permite edição de respostas
    const [visita] = await this.sql`SELECT status FROM visitas WHERE id = ${dto.visita_id}`;
    if (!visita) throw new NotFoundException('Visita não encontrada');

    const statusBloqueados = ['aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida'];
    if (statusBloqueados.includes(visita.status)) {
      // Apenas admin e master podem editar respostas após finalização
      if (!usuario || (usuario.role !== 'admin' && usuario.role !== 'master')) {
        throw new ForbiddenException('Respostas não podem ser alteradas após a finalização da vistoria');
      }
    }

    const [resposta] = await this.sql`
      INSERT INTO respostas (visita_id, pergunta_id, resultado, observacao, audio_url, transcricao_bruta, transcricao_corrigida, avaliacao)
      VALUES (${dto.visita_id}, ${dto.pergunta_id}, ${dto.resultado || null}, ${dto.observacao || null},
              ${dto.audio_url || null}, ${dto.transcricao_bruta || null}, ${dto.transcricao_corrigida || null}, ${dto.avaliacao ?? null})
      ON CONFLICT (visita_id, pergunta_id) DO UPDATE SET
        resultado = EXCLUDED.resultado,
        observacao = EXCLUDED.observacao,
        audio_url = EXCLUDED.audio_url,
        transcricao_bruta = EXCLUDED.transcricao_bruta,
        transcricao_corrigida = EXCLUDED.transcricao_corrigida,
        avaliacao = EXCLUDED.avaliacao,
        respondido_em = NOW()
      RETURNING *
    `;
    return resposta;
  }
}
