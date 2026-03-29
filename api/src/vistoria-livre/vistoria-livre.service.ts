import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SQL } from '../database/database.module';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class VistoriaLivreService {
  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly uploadService: UploadService,
  ) {}

  async listar(user: any) {
    const isAdmin = user.role === 'admin' || user.role === 'master';
    if (isAdmin) {
      return this.sql`
        SELECT vl.*, c.nome as condominio_nome, u.nome as supervisor_nome,
               (SELECT COUNT(*)::int FROM itens_vistoria_livre i WHERE i.vistoria_livre_id = vl.id) as total_itens
        FROM vistorias_livres vl
        JOIN condominios c ON c.id = vl.condominio_id
        JOIN usuarios u ON u.id = vl.supervisor_id
        WHERE vl.empresa_id = ${user.empresa_id}
        ORDER BY vl.criado_em DESC
      `;
    }
    return this.sql`
      SELECT vl.*, c.nome as condominio_nome, u.nome as supervisor_nome,
             (SELECT COUNT(*)::int FROM itens_vistoria_livre i WHERE i.vistoria_livre_id = vl.id) as total_itens
      FROM vistorias_livres vl
      JOIN condominios c ON c.id = vl.condominio_id
      JOIN usuarios u ON u.id = vl.supervisor_id
      WHERE vl.supervisor_id = ${user.sub}
        AND vl.empresa_id = ${user.empresa_id}
      ORDER BY vl.criado_em DESC
    `;
  }

  async buscarPorId(id: string, user: any) {
    const [vl] = await this.sql`
      SELECT vl.*, c.nome as condominio_nome, u.nome as supervisor_nome
      FROM vistorias_livres vl
      JOIN condominios c ON c.id = vl.condominio_id
      JOIN usuarios u ON u.id = vl.supervisor_id
      WHERE vl.id = ${id} AND vl.empresa_id = ${user.empresa_id}
    `;
    if (!vl) throw new NotFoundException('Vistoria livre não encontrada');

    const isAdmin = user.role === 'admin' || user.role === 'master';
    if (!isAdmin && vl.supervisor_id !== user.sub) {
      throw new ForbiddenException();
    }

    const itens = await this.sql`
      SELECT * FROM itens_vistoria_livre
      WHERE vistoria_livre_id = ${id}
      ORDER BY ordem, criado_em
    `;

    return { ...vl, itens };
  }

  async criar(dto: any, user: any) {
    const [vl] = await this.sql`
      INSERT INTO vistorias_livres (empresa_id, supervisor_id, condominio_id, titulo, localizacao_lat, localizacao_lng)
      VALUES (${user.empresa_id}, ${user.sub}, ${dto.condominio_id}, ${dto.titulo || null}, ${dto.localizacao_lat || null}, ${dto.localizacao_lng || null})
      RETURNING *
    `;
    return vl;
  }

  async atualizar(id: string, dto: any, user: any) {
    const [vl] = await this.sql`SELECT * FROM vistorias_livres WHERE id = ${id} AND empresa_id = ${user.empresa_id}`;
    if (!vl) throw new NotFoundException();

    const [updated] = await this.sql`
      UPDATE vistorias_livres SET
        titulo = COALESCE(${dto.titulo || null}, titulo),
        condominio_id = COALESCE(${dto.condominio_id || null}, condominio_id),
        localizacao_lat = COALESCE(${dto.localizacao_lat ?? null}, localizacao_lat),
        localizacao_lng = COALESCE(${dto.localizacao_lng ?? null}, localizacao_lng)
      WHERE id = ${id}
      RETURNING *
    `;
    return updated;
  }

  async adicionarItem(vistoriaId: string, dto: any, user: any) {
    const [vl] = await this.sql`SELECT * FROM vistorias_livres WHERE id = ${vistoriaId} AND empresa_id = ${user.empresa_id}`;
    if (!vl) throw new NotFoundException();

    const [maxOrdem] = await this.sql`SELECT COALESCE(MAX(ordem), 0) as max FROM itens_vistoria_livre WHERE vistoria_livre_id = ${vistoriaId}`;

    const [item] = await this.sql`
      INSERT INTO itens_vistoria_livre (vistoria_livre_id, titulo, descricao, foto_url, thumbnail_url, localizacao_lat, localizacao_lng, ordem)
      VALUES (${vistoriaId}, ${dto.titulo}, ${dto.descricao || null}, ${dto.foto_url || null}, ${dto.thumbnail_url || null}, ${dto.localizacao_lat || null}, ${dto.localizacao_lng || null}, ${maxOrdem.max + 1})
      RETURNING *
    `;
    return item;
  }

  async atualizarItem(itemId: string, dto: any, user: any) {
    const [item] = await this.sql`
      SELECT i.* FROM itens_vistoria_livre i
      JOIN vistorias_livres vl ON vl.id = i.vistoria_livre_id
      WHERE i.id = ${itemId} AND vl.empresa_id = ${user.empresa_id}
    `;
    if (!item) throw new NotFoundException();

    const [updated] = await this.sql`
      UPDATE itens_vistoria_livre SET
        titulo = COALESCE(${dto.titulo || null}, titulo),
        descricao = COALESCE(${dto.descricao ?? null}, descricao),
        foto_url = COALESCE(${dto.foto_url ?? null}, foto_url),
        thumbnail_url = COALESCE(${dto.thumbnail_url ?? null}, thumbnail_url),
        localizacao_lat = COALESCE(${dto.localizacao_lat ?? null}, localizacao_lat),
        localizacao_lng = COALESCE(${dto.localizacao_lng ?? null}, localizacao_lng)
      WHERE id = ${itemId}
      RETURNING *
    `;
    return updated;
  }

  async excluirItem(itemId: string, user: any) {
    const [item] = await this.sql`
      SELECT i.* FROM itens_vistoria_livre i
      JOIN vistorias_livres vl ON vl.id = i.vistoria_livre_id
      WHERE i.id = ${itemId} AND vl.empresa_id = ${user.empresa_id}
    `;
    if (!item) throw new NotFoundException();

    if (item.foto_url) {
      await this.uploadService.deletarFoto(item.foto_url);
      if (item.thumbnail_url) await this.uploadService.deletarFoto(item.thumbnail_url);
    }

    await this.sql`DELETE FROM itens_vistoria_livre WHERE id = ${itemId}`;
    return { ok: true };
  }

  async uploadFotoItem(vistoriaId: string, itemId: string, buffer: Buffer, mimetype: string, user: any) {
    const [item] = await this.sql`
      SELECT i.* FROM itens_vistoria_livre i
      JOIN vistorias_livres vl ON vl.id = i.vistoria_livre_id
      WHERE i.id = ${itemId} AND vl.id = ${vistoriaId} AND vl.empresa_id = ${user.empresa_id}
    `;
    if (!item) throw new NotFoundException();

    // Delete old photo if exists
    if (item.foto_url) {
      await this.uploadService.deletarFoto(item.foto_url);
      if (item.thumbnail_url) await this.uploadService.deletarFoto(item.thumbnail_url);
    }

    const result = await this.uploadService.uploadFoto(buffer, mimetype, `livre/${vistoriaId}`);

    const [updated] = await this.sql`
      UPDATE itens_vistoria_livre SET
        foto_url = ${result.url},
        thumbnail_url = ${result.thumbnail_url}
      WHERE id = ${itemId}
      RETURNING *
    `;
    return updated;
  }

  async finalizar(id: string, user: any) {
    const [vl] = await this.sql`SELECT * FROM vistorias_livres WHERE id = ${id} AND empresa_id = ${user.empresa_id}`;
    if (!vl) throw new NotFoundException();

    const [updated] = await this.sql`
      UPDATE vistorias_livres SET
        status = 'concluida',
        finalizada_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return updated;
  }

  async enviar(id: string, user: any) {
    const [vl] = await this.sql`SELECT * FROM vistorias_livres WHERE id = ${id} AND empresa_id = ${user.empresa_id}`;
    if (!vl) throw new NotFoundException();

    const [updated] = await this.sql`
      UPDATE vistorias_livres SET status = 'enviada' WHERE id = ${id} RETURNING *
    `;
    return updated;
  }

  async excluir(id: string, user: any) {
    const [vl] = await this.sql`SELECT * FROM vistorias_livres WHERE id = ${id} AND empresa_id = ${user.empresa_id}`;
    if (!vl) throw new NotFoundException();

    // Delete all item photos
    const itens = await this.sql`SELECT * FROM itens_vistoria_livre WHERE vistoria_livre_id = ${id}`;
    for (const item of itens) {
      if (item.foto_url) {
        await this.uploadService.deletarFoto(item.foto_url);
        if (item.thumbnail_url) await this.uploadService.deletarFoto(item.thumbnail_url);
      }
    }

    await this.sql`DELETE FROM vistorias_livres WHERE id = ${id}`;
    return { ok: true };
  }

  // =========== CHECKLIST LIVRE (admin config) ===========
  async listarChecklistItens(empresaId: string) {
    return this.sql`
      SELECT * FROM checklist_livre_itens
      WHERE empresa_id = ${empresaId}
      ORDER BY ordem, criado_em
    `;
  }

  async criarChecklistItem(dto: any, empresaId: string) {
    const [maxOrdem] = await this.sql`SELECT COALESCE(MAX(ordem), 0) as max FROM checklist_livre_itens WHERE empresa_id = ${empresaId}`;
    const [item] = await this.sql`
      INSERT INTO checklist_livre_itens (empresa_id, titulo, ordem)
      VALUES (${empresaId}, ${dto.titulo}, ${maxOrdem.max + 1})
      RETURNING *
    `;
    return item;
  }

  async atualizarChecklistItem(id: string, dto: any, empresaId: string) {
    const [item] = await this.sql`
      UPDATE checklist_livre_itens SET
        titulo = COALESCE(${dto.titulo || null}, titulo),
        ordem = COALESCE(${dto.ordem ?? null}, ordem),
        ativo = COALESCE(${dto.ativo ?? null}, ativo)
      WHERE id = ${id} AND empresa_id = ${empresaId}
      RETURNING *
    `;
    if (!item) throw new NotFoundException();
    return item;
  }

  async excluirChecklistItem(id: string, empresaId: string) {
    const [item] = await this.sql`SELECT id FROM checklist_livre_itens WHERE id = ${id} AND empresa_id = ${empresaId}`;
    if (!item) throw new NotFoundException();
    await this.sql`DELETE FROM checklist_livre_itens WHERE id = ${id}`;
    return { ok: true };
  }
}
