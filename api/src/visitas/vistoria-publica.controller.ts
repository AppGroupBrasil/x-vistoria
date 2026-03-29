import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException, BadRequestException, UploadedFiles, UploadedFile, UseInterceptors, Inject } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { SQL } from '../database/database.module';
import { UploadService } from '../upload/upload.service';
import { AppGateway } from '../gateway/app.gateway';
import { ApiTags } from '@nestjs/swagger';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

@ApiTags('publico')
@Controller('publico/vistoria')
export class VistoriaPublicaController {
  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly uploadService: UploadService,
    private readonly gateway: AppGateway,
  ) {}

  @Get(':id')
  async buscar(@Param('id') id: string) {
    const [visita] = await this.sql`
      SELECT v.id, v.protocolo, v.status, v.titulo, v.template_id, v.empresa_id,
             v.iniciada_em, v.finalizada_em, v.observacoes_gerais,
             v.selfie_url, v.identificacao_em, v.identificacao_lat, v.identificacao_lng,
             c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             u.nome as supervisor_nome,
             e.nome as empresa_nome, e.logo_url as empresa_logo,
             e.layout_questionario
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN empresas e ON e.id = v.empresa_id
      WHERE v.id = ${id}
    `;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');

    // Busca perguntas do template
    let perguntas: any[] = [];
    if (visita.template_id) {
      perguntas = await this.sql`
        SELECT tp.ordem, tp.obrigatoria, p.id, p.texto, p.categoria_id,
               cat.nome as categoria_nome, cat.ordem as categoria_ordem
        FROM template_perguntas tp
        JOIN perguntas p ON p.id = tp.pergunta_id
        JOIN categorias cat ON cat.id = p.categoria_id
        WHERE tp.template_id = ${visita.template_id}
        ORDER BY cat.ordem, tp.ordem
      `;
    }

    // Busca respostas existentes
    const respostas = await this.sql`
      SELECT r.id, r.pergunta_id, r.resultado, r.observacao,
             r.transcricao_corrigida, r.respondido_em
      FROM respostas r
      WHERE r.visita_id = ${id}
    `;

    // Busca fotos por resposta
    const fotos = await this.sql`
      SELECT f.id, f.resposta_id, f.url, f.thumbnail_url, f.legenda, f.localizacao_lat, f.localizacao_lng
      FROM fotos f
      WHERE f.visita_id = ${id}
      ORDER BY f.criado_em
    `;

    return { visita, perguntas, respostas, fotos };
  }

  @Post(':id/identificacao')
  @UseInterceptors(FileInterceptor('selfie'))
  async identificacao(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { localizacao_lat?: string; localizacao_lng?: string },
  ) {
    const [visita] = await this.sql`SELECT id, status FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');

    if (!file) throw new BadRequestException('Selfie obrigatório');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Tipo não permitido: ${file.mimetype}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 20MB.');
    }

    const { url } = await this.uploadService.uploadFoto(file.buffer, file.mimetype, id);
    const lat = body.localizacao_lat ? Number.parseFloat(body.localizacao_lat) : null;
    const lng = body.localizacao_lng ? Number.parseFloat(body.localizacao_lng) : null;

    const [updated] = await this.sql`
      UPDATE visitas
      SET selfie_url = ${url},
          identificacao_em = NOW(),
          identificacao_lat = ${lat},
          identificacao_lng = ${lng},
          atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING selfie_url, identificacao_em, identificacao_lat, identificacao_lng
    `;
    return updated;
  }

  @Patch(':id/iniciar')
  async iniciar(@Param('id') id: string) {
    const [visita] = await this.sql`SELECT id, status, empresa_id FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');
    if (visita.status !== 'nao_iniciada' && visita.status !== 'pausada') {
      throw new BadRequestException('Vistoria não pode ser iniciada nesse status');
    }

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'em_andamento', iniciada_em = COALESCE(iniciada_em, NOW()), atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(visita.empresa_id, 'visita:iniciada', { id });
    return updated;
  }

  @Post(':id/resposta')
  async salvarResposta(@Param('id') id: string, @Body() dto: any) {
    const [visita] = await this.sql`SELECT id, status FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');

    const statusBloqueados = ['aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida'];
    if (statusBloqueados.includes(visita.status)) {
      throw new BadRequestException('Respostas não podem ser alteradas após finalização');
    }

    const [resposta] = await this.sql`
      INSERT INTO respostas (visita_id, pergunta_id, resultado, observacao, transcricao_bruta, transcricao_corrigida)
      VALUES (${id}, ${dto.pergunta_id}, ${dto.resultado || null}, ${dto.observacao || null},
              ${dto.transcricao_bruta || null}, ${dto.transcricao_corrigida || null})
      ON CONFLICT (visita_id, pergunta_id) DO UPDATE SET
        resultado = EXCLUDED.resultado,
        observacao = EXCLUDED.observacao,
        transcricao_bruta = EXCLUDED.transcricao_bruta,
        transcricao_corrigida = EXCLUDED.transcricao_corrigida,
        respondido_em = NOW()
      RETURNING *
    `;
    return resposta;
  }

  @Patch(':id/finalizar')
  async finalizar(@Param('id') id: string, @Body() body: any) {
    const [visita] = await this.sql`SELECT id, status, empresa_id, iniciada_em FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');

    const iniciada = visita.iniciada_em ? new Date(visita.iniciada_em).getTime() : Date.now();
    const tempoTotal = Math.floor((Date.now() - iniciada) / 1000);

    const [updated] = await this.sql`
      UPDATE visitas
      SET status = 'aguardando_aprovacao',
          finalizada_em = NOW(),
          observacoes_gerais = COALESCE(${body.observacoes || null}, observacoes_gerais),
          tempo_total_segundos = ${tempoTotal},
          atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    this.gateway.emitParaEmpresa(visita.empresa_id, 'visita:finalizada', { id });
    return updated;
  }

  @Post(':id/foto')
  @UseInterceptors(FilesInterceptor('fotos', 5))
  async uploadFoto(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { resposta_id?: string; localizacao_lat?: string; localizacao_lng?: string },
  ) {
    const [visita] = await this.sql`SELECT id, status, empresa_id FROM visitas WHERE id = ${id}`;
    if (!visita) throw new NotFoundException('Vistoria não encontrada');

    const statusBloqueados = ['aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida'];
    if (statusBloqueados.includes(visita.status)) {
      throw new BadRequestException('Não é possível anexar fotos após finalização');
    }

    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado');

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(`Tipo não permitido: ${file.mimetype}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Arquivo muito grande. Máximo: 20MB.');
      }
    }

    const resultados = await Promise.all(
      files.map(async (file) => {
        const { url, thumbnail_url, tamanho_bytes } = await this.uploadService.uploadFoto(file.buffer, file.mimetype, id);
        const lat = body.localizacao_lat ? Number.parseFloat(body.localizacao_lat) : null;
        const lng = body.localizacao_lng ? Number.parseFloat(body.localizacao_lng) : null;
        const [foto] = await this.sql`
          INSERT INTO fotos (visita_id, resposta_id, url, thumbnail_url, tamanho_bytes, localizacao_lat, localizacao_lng)
          VALUES (${id}, ${body.resposta_id || null}, ${url}, ${thumbnail_url}, ${tamanho_bytes}, ${lat}, ${lng})
          RETURNING *
        `;
        return foto;
      }),
    );

    this.gateway.emitParaEmpresa(visita.empresa_id, 'foto:nova', { visita_id: id, fotos: resultados });
    return resultados;
  }

  @Delete(':id/foto/:fotoId')
  async excluirFoto(@Param('id') id: string, @Param('fotoId') fotoId: string) {
    const [foto] = await this.sql`SELECT * FROM fotos WHERE id = ${fotoId} AND visita_id = ${id}`;
    if (!foto) throw new NotFoundException('Foto não encontrada');

    await this.uploadService.deletarFoto(foto.url);
    if (foto.thumbnail_url) await this.uploadService.deletarFoto(foto.thumbnail_url);
    await this.sql`DELETE FROM fotos WHERE id = ${fotoId}`;
    return { ok: true };
  }
}
