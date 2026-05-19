import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { CondominiosModule } from './condominios/condominios.module';
import { ChecklistModule } from './checklist/checklist.module';
import { VisitasModule } from './visitas/visitas.module';
import { PendenciasModule } from './pendencias/pendencias.module';
import { MensagensModule } from './mensagens/mensagens.module';
import { PdfModule } from './pdf/pdf.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';
import { SeoController } from './seo.controller';
import { GatewayModule } from './gateway/gateway.module';
import { SindicoModule } from './sindico/sindico.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { VistoriaLivreModule } from './vistoria-livre/vistoria-livre.module';
import { ChecklistAvulsoModule } from './checklist-avulso/checklist-avulso.module';
import { QrPontoModule } from './qr-ponto/qr-ponto.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { ProvisioningModule } from './provisioning/provisioning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        FRONTEND_URL: Joi.string().required(),
        HETZNER_S3_ENDPOINT: Joi.string().required(),
        HETZNER_S3_ACCESS_KEY: Joi.string().required(),
        HETZNER_S3_SECRET_KEY: Joi.string().required(),
        HETZNER_S3_BUCKET: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().optional().allow(''),
        ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
        GOOGLE_SMTP_USER: Joi.string().optional().allow(''),
        GOOGLE_SMTP_APP_PASSWORD: Joi.string().optional().allow(''),
        MAIL_FROM: Joi.string().optional().allow(''),
        PASSWORD_RESET_URL_BASE: Joi.string().optional().allow(''),
        PROVISIONING_SECRET: Joi.string().min(16).optional().allow(''),
      }),
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    CondominiosModule,
    ChecklistModule,
    VisitasModule,
    PendenciasModule,
    MensagensModule,
    PdfModule,
    UploadModule,
    AiModule,
    GatewayModule,
    SindicoModule,
    RelatoriosModule,
    VistoriaLivreModule,
    ChecklistAvulsoModule,
    QrPontoModule,
    AuditModule,
    ProvisioningModule,
  ],
  controllers: [HealthController, SeoController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
