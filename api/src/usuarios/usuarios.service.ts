import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SQL } from '../database/database.module';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async listar(empresaId: string, filtros: any = {}) {
    const page = Math.max(1, Number.parseInt(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filtros.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClause = this.sql`
      WHERE u.empresa_id = ${empresaId}
        ${filtros.busca ? this.sql`AND (u.nome ILIKE ${'%' + filtros.busca + '%'} OR u.email ILIKE ${'%' + filtros.busca + '%'})` : this.sql``}
        ${filtros.role ? this.sql`AND u.role = ${filtros.role}` : this.sql``}
    `;

    const [{ count }] = await this.sql`
      SELECT COUNT(*)::int as count FROM usuarios u ${whereClause}
    `;

    const data = await this.sql`
      SELECT u.id, u.nome, u.email, u.role, u.telefone, u.avatar_url, u.ativo,
             u.pode_editar, u.pode_excluir, u.ultimo_login, u.criado_em,
             COALESCE(
               json_agg(json_build_object('id', c.id, 'nome', c.nome))
               FILTER (WHERE c.id IS NOT NULL), '[]'
             ) as condominios
      FROM usuarios u
      LEFT JOIN supervisor_condominios sc ON sc.supervisor_id = u.id
      LEFT JOIN condominios c ON c.id = sc.condominio_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.nome
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { data, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  async buscarPorId(id: string) {
    const [usuario] = await this.sql`
      SELECT id, nome, email, role, telefone, avatar_url, ativo, pode_editar, pode_excluir, empresa_id, criado_em
      FROM usuarios WHERE id = ${id}
    `;
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async criar(dto: any, empresaId: string) {
    const [existe] = await this.sql`SELECT id FROM usuarios WHERE email = ${dto.email}`;
    if (existe) throw new ConflictException('Email já cadastrado');

    const senha_hash = await bcrypt.hash(dto.senha, 12);
    const [usuario] = await this.sql`
      INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role, telefone, pode_editar, pode_excluir)
      VALUES (${empresaId}, ${dto.nome}, ${dto.email}, ${senha_hash}, ${dto.role || 'supervisor'}, ${dto.telefone || null},
              ${dto.pode_editar ?? false}, ${dto.pode_excluir ?? false})
      RETURNING id, nome, email, role, telefone, ativo, pode_editar, pode_excluir, criado_em
    `;
    return usuario;
  }

  async atualizar(id: string, dto: any) {
    let senhaUpdate = this.sql``;
    if (dto.senha) {
      const senha_hash = await bcrypt.hash(dto.senha, 12);
      senhaUpdate = this.sql`, senha_hash = ${senha_hash}`;
    }

    const [usuario] = await this.sql`
      UPDATE usuarios SET
        nome = COALESCE(${dto.nome || null}, nome),
        telefone = COALESCE(${dto.telefone || null}, telefone),
        role = COALESCE(${dto.role || null}, role),
        ativo = COALESCE(${dto.ativo ?? null}, ativo),
        pode_editar = COALESCE(${dto.pode_editar ?? null}, pode_editar),
        pode_excluir = COALESCE(${dto.pode_excluir ?? null}, pode_excluir),
        atualizado_em = NOW()
        ${senhaUpdate}
      WHERE id = ${id}
      RETURNING id, nome, email, role, telefone, ativo, pode_editar, pode_excluir
    `;
    if (!usuario) throw new NotFoundException();
    return usuario;
  }

  async excluir(id: string, empresaId: string, solicitanteId: string) {
    if (id === solicitanteId) throw new BadRequestException('Você não pode excluir sua própria conta');

    const [usuario] = await this.sql`
      SELECT id FROM usuarios WHERE id = ${id} AND empresa_id = ${empresaId}
    `;
    if (!usuario) throw new NotFoundException('Usuário não encontrado');

    await this.sql`DELETE FROM usuarios WHERE id = ${id}`;
    return { ok: true };
  }

  async supervisoresDoCondominio(condominioId: string) {
    return this.sql`
      SELECT u.id, u.nome, u.email, u.telefone, u.avatar_url
      FROM usuarios u
      JOIN supervisor_condominios sc ON sc.supervisor_id = u.id
      WHERE sc.condominio_id = ${condominioId} AND u.ativo = true
    `;
  }
}
