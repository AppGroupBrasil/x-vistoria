import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai?: OpenAI;
  private readonly anthropic?: Anthropic;

  constructor(private readonly config: ConfigService) {
    const openAiKey = config.get<string>('OPENAI_API_KEY');
    const anthropicKey = config.get<string>('ANTHROPIC_API_KEY');

    if (openAiKey) {
      this.openai = new OpenAI({ apiKey: openAiKey });
    }

    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
  }

  getTempExtension(mimetype: string, originalname?: string) {
    const fromName = originalname ? path.extname(originalname) : '';
    if (fromName) {
      return fromName;
    }

    const map: Record<string, string> = {
      'audio/webm': '.webm',
      'video/webm': '.webm',
      'audio/mp4': '.mp4',
      'audio/m4a': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/mpga': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/ogg': '.ogg',
    };

    return map[mimetype] || '.bin';
  }

  private ensureOpenAiConfigured() {
    if (!this.openai) {
      throw new ServiceUnavailableException('Transcrição de áudio indisponível no momento.');
    }
  }

  private ensureAnthropicConfigured() {
    if (!this.anthropic) {
      throw new ServiceUnavailableException('Correção de texto por IA indisponível no momento.');
    }
  }

  async transcreverAudio(audioPath: string): Promise<string> {
    this.ensureOpenAiConfigured();

    const openai = this.openai;

    const audioFile = fs.createReadStream(audioPath);

    this.logger.log(`Transcrevendo áudio: ${audioPath}`);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    });

    this.logger.log(`Transcrição concluída (${(transcription as unknown as string).length} chars)`);
    return transcription as unknown as string;
  }

  async corrigirTextoVistoria(
    textoBruto: string,
    contexto: { pergunta: string; condominio: string; categoria: string },
  ): Promise<string> {
    this.ensureAnthropicConfigured();

    const anthropic = this.anthropic;

    const mensagem = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente especializado em vistorias condominiais.

Um supervisor de condomínio gravou uma observação por áudio. O texto abaixo foi transcrito automaticamente e pode conter erros de pronúncia, gírias ou linguagem informal.

Contexto da vistoria:
- Condomínio: ${contexto.condominio}
- Categoria: ${contexto.categoria}
- Pergunta: ${contexto.pergunta}

Texto transcrito:
"${textoBruto}"

Reescreva esse texto de forma clara, profissional e adequada para um relatório de vistoria condominial. Mantenha o sentido original. Corrija erros gramaticais e de português. Não invente informações que não estão no texto original. Responda APENAS com o texto corrigido, sem explicações.`,
        },
      ],
    });

    const content = mensagem.content[0];
    this.logger.log(`Correção AI concluída (${content.type === 'text' ? content.text.length : 0} chars)`);
    if (content.type === 'text') return content.text;
    return textoBruto;
  }

  async estimarTempo(perguntas: number, categoria: string): Promise<number> {
    // Estimativa simples em minutos baseada no tipo de vistoria
    const tempoBase: Record<string, number> = {
      'Portaria e Acesso': 5,
      'Áreas Comuns': 10,
      'Segurança e Vigilância': 8,
      'Limpeza e Conservação': 8,
      'Instalações Elétricas': 12,
      'Hidráulica e Encanamento': 10,
      'Elevadores': 8,
      'Incêndio e Emergência': 10,
      'Documentação e Contratos': 5,
      'Funcionários': 5,
      'Manutenção Preventiva': 10,
    };

    const base = tempoBase[categoria] || 8;
    return Math.round((base * perguntas) / 5);
  }
}
