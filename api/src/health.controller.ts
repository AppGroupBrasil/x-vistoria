import { Controller, Get, Inject } from '@nestjs/common';
import { SQL } from './database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(SQL) private readonly sql: any) {}

  @Get()
  async check() {
    let db = 'ok';
    try {
      await this.sql`SELECT 1`;
    } catch {
      db = 'down';
    }
    const mem = process.memoryUsage();
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      db,
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heap: Math.round(mem.heapUsed / 1024 / 1024),
      },
    };
  }
}
