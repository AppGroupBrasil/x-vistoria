import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq?: OpenAI;
  private readonly deepseek?: OpenAI;

  constructor(private readonly config: ConfigService) {
    const groqKey = config.get<string>('GROQ_API_KEY');
    const deepseekKey = config.get<string>('DEEPSEEK_API_KEY');

    if (groqKey) {
      this.groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
    }
    if (deepseekKey) {
      this.deepseek = new OpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com/v1' });
    }
  }

  getTempExtension(mimetype: string, originalname?: string) {
    const fromName = originalname ? path.extname(originalname) : '';
    if (fromName) return fromName;

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

  private ensureGroqConfigured() {
    if (!this.groq) {
      throw new ServiceUnavailableException('Transcrição de áudio indisponível no momento.');
    }
  }

  private ensureDeepseekConfigured() {
    if (!this.deepseek) {
      throw new ServiceUnavailableException('Correção de texto por IA indisponível no momento.');
    }
  }

  async transcreverAudio(audioPath: string): Promise<string> {
    this.ensureGroqConfigured();
    const groq = this.groq;

    const audioFile = fs.createReadStream(audioPath);

    this.logger.log(`Transcrevendo áudio com Groq Whisper: ${audioPath}`);
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'pt',
      response_format: 'text',
    });

    const texto = transcription as unknown as string;
    this.logger.log(`Transcrição concluída (${texto.length} chars)`);
    return texto;
  }

  async corrigirTextoVistoria(
    textoBruto: string,
    contexto: { pergunta: string; condominio: string; categoria: string },
  ): Promise<string> {
    this.ensureDeepseekConfigured();
    const deepseek = this.deepseek;

    const prompt = `Você é um assistente especializado em vistorias condominiais.

Um supervisor de condomínio gravou uma observação por áudio. O texto abaixo foi transcrito automaticamente e pode conter erros de pronúncia, gírias ou linguagem informal.

Contexto da vistoria:
- Condomínio: ${contexto.condominio}
- Categoria: ${contexto.categoria}
- Pergunta: ${contexto.pergunta}

Texto transcrito:
"${textoBruto}"

Reescreva esse texto de forma clara, profissional e adequada para um relatório de vistoria condominial. Mantenha o sentido original. Corrija erros gramaticais e de português. Não invente informações que não estão no texto original. Responda APENAS com o texto corrigido, sem explicações.`;

    const resp = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 512,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const texto = resp.choices?.[0]?.message?.content?.trim() || textoBruto;
    this.logger.log(`Correção DeepSeek concluída (${texto.length} chars)`);
    return texto;
  }

  async estimarTempo(perguntas: number, categoria: string): Promise<number> {
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
