import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const isProduction = process.env.NODE_ENV === 'production';

  const corsOrigins = [
    'https://xvistoria.com.br',
    'https://admin.xvistoria.com.br',
    'https://sindico.xvistoria.com.br',
    'https://app.xvistoria.com.br',
    ...(isProduction ? [] : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003']),
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1', {
    exclude: ['robots.txt'],
  });

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('X Vistoria API')
      .setDescription('API do sistema X Vistoria Condominial')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`X Vistoria API running on port ${port}`);
}

bootstrap();
