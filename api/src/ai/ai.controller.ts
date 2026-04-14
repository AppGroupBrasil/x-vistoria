import {
  Controller, Post, Body, UploadedFile, UseInterceptors, UseGuards, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/mpga',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/m4a',
  'video/webm',
]);
const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024;

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('transcrever')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_FILE_SIZE } }))
  async transcrever(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { pergunta: string; condominio: string; categoria: string },
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de áudio é obrigatório');
    }

    if (!ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Tipo de áudio não permitido: ${file.mimetype}`);
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Arquivo de áudio vazio');
    }

    const extension = this.aiService.getTempExtension(file.mimetype, file.originalname);
    const tmpPath = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`);
    fs.writeFileSync(tmpPath, file.buffer);

    try {
      const textoBruto = await this.aiService.transcreverAudio(tmpPath);
      const textoCorrigido = await this.aiService.corrigirTextoVistoria(textoBruto, {
        pergunta: body.pergunta || '',
        condominio: body.condominio || '',
        categoria: body.categoria || '',
      });

      return { transcricao_bruta: textoBruto, transcricao_corrigida: textoCorrigido };
    } finally {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    }
  }

  @Post('corrigir')
  corrigir(@Body() body: { texto: string; pergunta: string; condominio: string; categoria: string }) {
    if (!body.texto?.trim()) {
      throw new BadRequestException('Texto é obrigatório');
    }

    return this.aiService.corrigirTextoVistoria(body.texto, {
      pergunta: body.pergunta,
      condominio: body.condominio,
      categoria: body.categoria,
    }).then(textoCorrigido => ({ texto_corrigido: textoCorrigido }));
  }
}
