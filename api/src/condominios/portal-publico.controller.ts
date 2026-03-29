import { Controller, Get, Param, NotFoundException, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SQL } from '../database/database.module';

@ApiTags('publico')
@Controller('publico/portal')
export class PortalPublicoController {
  constructor(@Inject(SQL) private readonly sql: any) {}

  @Get(':token')
  async portalCondominio(@Param('token') token: string) {
    // Busca condomínio pelo qr_token
    const [condominio] = await this.sql`
      SELECT c.id, c.nome, c.endereco, c.cidade, c.estado, c.cep,
             c.sindico_nome, c.total_unidades, c.foto_url,
             e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM condominios c
      JOIN empresas e ON e.id = c.empresa_id
      WHERE c.qr_token = ${token} AND c.ativo = true
    `;
    if (!condominio) throw new NotFoundException('Condomínio não encontrado');

    // Busca apenas visitas marcadas como visíveis no portal
    const visitas = await this.sql`
      SELECT v.id, v.protocolo, v.titulo, v.status, v.pdf_url,
             v.iniciada_em, v.finalizada_em, v.criado_em,
             u.nome as supervisor_nome
      FROM visitas v
      LEFT JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.condominio_id = ${condominio.id}
        AND v.status IN ('concluida', 'aprovada', 'enviada_sindico')
        AND v.visivel_portal = true
      ORDER BY v.criado_em DESC
    `;

    // Busca pendências resolvidas apenas das visitas visíveis no portal
    const pendencias = await this.sql`
      SELECT p.id, p.titulo, p.descricao, p.prioridade, p.status, p.resolvida_em,
             p.criado_em
      FROM pendencias p
      JOIN visitas v ON v.id = p.visita_id
      WHERE v.condominio_id = ${condominio.id}
        AND v.visivel_portal = true
        AND p.status = 'resolvida'
      ORDER BY p.resolvida_em DESC
      LIMIT 20
    `;

    return { condominio, visitas, pendencias };
  }

  @Get('espaco/:token')
  async portalEspaco(@Param('token') token: string) {
    const [espaco] = await this.sql`
      SELECT es.id, es.nome, es.qr_token,
             c.id as condominio_id, c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM espacos es
      JOIN condominios c ON c.id = es.condominio_id
      JOIN empresas e ON e.id = es.empresa_id
      WHERE es.qr_token = ${token} AND es.ativo = true AND c.ativo = true
    `;
    if (!espaco) throw new NotFoundException('Espaço não encontrado');

    const visitas = await this.sql`
      SELECT v.id, v.protocolo, v.titulo, v.status, v.pdf_url,
             v.iniciada_em, v.finalizada_em, v.criado_em,
             u.nome as supervisor_nome
      FROM visitas v
      LEFT JOIN usuarios u ON u.id = v.supervisor_id
      WHERE v.espaco_id = ${espaco.id}
        AND v.status IN ('concluida', 'aprovada', 'enviada_sindico')
        AND v.visivel_portal = true
      ORDER BY v.criado_em DESC
    `;

    const pendencias = await this.sql`
      SELECT p.id, p.titulo, p.descricao, p.prioridade, p.status, p.resolvida_em,
             p.criado_em
      FROM pendencias p
      JOIN visitas v ON v.id = p.visita_id
      WHERE v.espaco_id = ${espaco.id}
        AND v.visivel_portal = true
        AND p.status = 'resolvida'
      ORDER BY p.resolvida_em DESC
      LIMIT 20
    `;

    return { espaco, visitas, pendencias };
  }
}
