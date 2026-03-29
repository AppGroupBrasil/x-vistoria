import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pdf')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('visita/:id')
  async gerar(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.gerarPdfVisita(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="visita-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('visita/:id/questionario')
  async questionario(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.gerarQuestionario(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="questionario-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('vistoria-livre/:id')
  async vistoriaLivre(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.gerarPdfVistoriaLivre(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="vistoria-livre-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('checklist-avulso/:id')
  async checklistAvulso(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.gerarPdfChecklistAvulso(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="checklist-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('checklist-avulso/:id/formulario')
  async checklistFormulario(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.gerarFormularioChecklist(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="formulario-checklist-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
