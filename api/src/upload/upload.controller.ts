import {
  Controller, Post, Get, Delete, Param, UploadedFiles, UseInterceptors,
  Body, UseGuards, Inject, BadRequestException, NotFoundException, Request
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SQL } from '../database/database.module';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(SQL) private readonly sql: any,
  ) {}

  @Get('fotos/visita/:visitaId')
  async listarFotos(@Param('visitaId') visitaId: string, @Request() req) {
    // Verifica se a visita pertence à empresa do utilizador
    const [visita] = await this.sql`SELECT id FROM visitas WHERE id = ${visitaId} AND empresa_id = ${req.user.empresa_id}`;
    if (!visita) throw new NotFoundException('Visita não encontrada');
    return this.sql`
      SELECT f.*, r.pergunta_id
      FROM fotos f
      LEFT JOIN respostas r ON r.id = f.resposta_id
      WHERE f.visita_id = ${visitaId}
      ORDER BY f.criado_em DESC
    `;
  }

  @Delete('fotos/:id')
  async excluirFoto(@Param('id') id: string, @Request() req) {
    const [foto] = await this.sql`
      SELECT f.* FROM fotos f
      JOIN visitas v ON v.id = f.visita_id
      WHERE f.id = ${id} AND v.empresa_id = ${req.user.empresa_id}
    `;
    if (!foto) throw new NotFoundException('Foto não encontrada');

    // Remove do S3
    await this.uploadService.deletarFoto(foto.url);
    if (foto.thumbnail_url) {
      await this.uploadService.deletarFoto(foto.thumbnail_url);
    }

    await this.sql`DELETE FROM fotos WHERE id = ${id}`;
    return { ok: true };
  }

  @Post('fotos')
  @UseInterceptors(FilesInterceptor('fotos', 10))
  async uploadFotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { visita_id: string; resposta_id?: string; legenda?: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}. Use JPEG, PNG ou WebP.`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`Arquivo muito grande (${Math.round(file.size / 1024 / 1024)}MB). Máximo: 20MB.`);
      }
    }

    const resultados = await Promise.all(
      files.map(async (file) => {
        const { url, thumbnail_url, tamanho_bytes } = await this.uploadService.uploadFoto(
          file.buffer,
          file.mimetype,
          body.visita_id,
        );

        const [foto] = await this.sql`
          INSERT INTO fotos (visita_id, resposta_id, url, thumbnail_url, legenda, tamanho_bytes)
          VALUES (
            ${body.visita_id},
            ${body.resposta_id || null},
            ${url},
            ${thumbnail_url},
            ${body.legenda || null},
            ${tamanho_bytes}
          )
          RETURNING *
        `;

        return foto;
      }),
    );

    return resultados;
  }
}
