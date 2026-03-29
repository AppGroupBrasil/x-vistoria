import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SQL } from '../database/database.module';

@Injectable()
export class EmpresasService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar() {
    return this.sql`SELECT * FROM empresas ORDER BY nome`;
  }

  async buscarPorId(id: string) {
    const [empresa] = await this.sql`SELECT * FROM empresas WHERE id = ${id}`;
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  async criar(dto: any) {
    const [empresa] = await this.sql`
      INSERT INTO empresas (nome, cnpj, email, telefone, plano)
      VALUES (${dto.nome}, ${dto.cnpj || null}, ${dto.email}, ${dto.telefone || null}, ${dto.plano || 'basico'})
      RETURNING *
    `;
    return empresa;
  }

  async atualizar(id: string, dto: any) {
    const [empresa] = await this.sql`
      UPDATE empresas SET
        nome = COALESCE(${dto.nome || null}, nome),
        cnpj = COALESCE(${dto.cnpj || null}, cnpj),
        email = COALESCE(${dto.email || null}, email),
        telefone = COALESCE(${dto.telefone || null}, telefone),
        logo_url = COALESCE(${dto.logo_url || null}, logo_url),
        plano = COALESCE(${dto.plano || null}, plano),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        layout_questionario = COALESCE(${dto.layout_questionario || null}, layout_questionario),
        checklist_livre_ativo = COALESCE(${dto.checklist_livre_ativo ?? null}, checklist_livre_ativo),
        assinatura_admin_nome = COALESCE(${dto.assinatura_admin_nome || null}, assinatura_admin_nome),
        assinatura_admin_cargo = COALESCE(${dto.assinatura_admin_cargo || null}, assinatura_admin_cargo),
        assinatura_admin_documento = COALESCE(${dto.assinatura_admin_documento || null}, assinatura_admin_documento),
        assinatura_admin_img = COALESCE(${dto.assinatura_admin_img || null}, assinatura_admin_img),
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!empresa) throw new NotFoundException();
    return empresa;
  }

  async excluir(id: string) {
    const [empresa] = await this.sql`SELECT id, plano FROM empresas WHERE id = ${id}`;
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    await this.sql`DELETE FROM empresas WHERE id = ${id}`;
    return { ok: true };
  }

  async resumo(id: string) {
    const [empresa] = await this.sql`SELECT * FROM empresas WHERE id = ${id}`;
    if (!empresa) throw new NotFoundException();

    const [stats] = await this.sql`
      SELECT
        (SELECT COUNT(*) FROM condominios WHERE empresa_id = ${id})::int as total_condominios,
        (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ${id})::int as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE empresa_id = ${id} AND role = 'supervisor')::int as total_supervisores,
        (SELECT COUNT(*) FROM visitas WHERE empresa_id = ${id})::int as total_visitas,
        (SELECT COUNT(*) FROM visitas WHERE empresa_id = ${id} AND status NOT IN ('concluida'))::int as visitas_ativas
    `;

    return { ...empresa, ...stats };
  }
}
