import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class SeoController {
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    return [
      '# X Vistoria API',
      '# https://api.xvistoria.com.br',
      '',
      'User-agent: *',
      'Disallow: /',
      '',
      '# API endpoints are not meant for crawling',
    ].join('\n');
  }
}
