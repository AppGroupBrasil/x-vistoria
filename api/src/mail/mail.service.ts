import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('GOOGLE_SMTP_USER');
    const appPassword = this.config.get<string>('GOOGLE_SMTP_APP_PASSWORD');

    this.from = this.config.get<string>('MAIL_FROM') || user || 'no-reply@xvistoria.com.br';
    this.frontendUrl = this.config.get<string>('PASSWORD_RESET_URL_BASE') || this.config.get<string>('FRONTEND_URL') || 'https://xvistoria.com.br';

    if (user && appPassword) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass: appPassword,
        },
      });
    }
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  assertConfigured() {
    if (!this.transporter) {
      throw new ServiceUnavailableException('Recuperação de senha indisponível no momento.');
    }
  }

  async sendPasswordResetEmail(email: string, nome: string, token: string) {
    this.assertConfigured();

    const resetUrl = `${this.frontendUrl.replace(/\/$/, '')}/redefinir-senha/${token}`;

    await this.transporter!.sendMail({
      from: this.from,
      to: email,
      subject: 'Redefina sua senha no X Vistoria',
      text: [
        `Olá, ${nome}.`,
        '',
        'Recebemos uma solicitação para redefinir sua senha no X Vistoria.',
        `Acesse o link abaixo para criar uma nova senha: ${resetUrl}`,
        '',
        'Se você não fez essa solicitação, ignore este email.',
        'Este link expira em 1 hora.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2 style="margin-bottom: 16px;">Redefinição de senha</h2>
          <p>Olá, ${nome}.</p>
          <p>Recebemos uma solicitação para redefinir sua senha no <strong>X Vistoria</strong>.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;">
              Criar nova senha
            </a>
          </p>
          <p>Se preferir, copie e cole este link no navegador:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>Se você não fez essa solicitação, ignore este email. O link expira em 1 hora.</p>
        </div>
      `,
    });

    this.logger.log(`Email de redefinição enviado para ${email}`);
  }
}