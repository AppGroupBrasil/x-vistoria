import { Controller, Get, Param } from '@nestjs/common';
import { ChecklistAvulsoService } from './checklist-avulso.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('publico')
@Controller('checklist-avulso/publico')
export class ChecklistAvulsoPublicoController {
  constructor(private readonly service: ChecklistAvulsoService) {}

  @Get(':id')
  async relatorioPublico(@Param('id') id: string) {
    return this.service.obterExecucaoPublica(id);
  }
}
