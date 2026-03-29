import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SQL } from '../database/database.module';
import * as puppeteer from 'puppeteer';

@Injectable()
export class QrPontoService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  private gerarToken(): string {
    return randomBytes(6).toString('hex').slice(0, 12);
  }

  async listar(empresaId: string) {
    return this.sql`
      SELECT qp.*, c.nome as condominio_nome,
             COUNT(qr.id)::int as total_registros
      FROM qr_pontos qp
      LEFT JOIN condominios c ON c.id = qp.condominio_id
      LEFT JOIN qr_registros qr ON qr.ponto_id = qp.id
      WHERE qp.empresa_id = ${empresaId}
      GROUP BY qp.id, c.nome
      ORDER BY qp.criado_em DESC
    `;
  }

  async buscarPorId(id: string, empresaId: string) {
    const [ponto] = await this.sql`
      SELECT qp.*, c.nome as condominio_nome
      FROM qr_pontos qp
      LEFT JOIN condominios c ON c.id = qp.condominio_id
      WHERE qp.id = ${id} AND qp.empresa_id = ${empresaId}
    `;
    if (!ponto) throw new NotFoundException('Ponto QR não encontrado');
    return ponto;
  }

  async criar(dto: { nome: string; descricao?: string; condominio_id?: string }, empresaId: string) {
    let token = '';
    for (let i = 0; i < 10; i++) {
      token = this.gerarToken();
      const [existe] = await this.sql`SELECT id FROM qr_pontos WHERE token = ${token}`;
      if (!existe) break;
    }
    if (!token) throw new Error('Falha ao gerar token único');
    const [ponto] = await this.sql`
      INSERT INTO qr_pontos (empresa_id, condominio_id, nome, descricao, token)
      VALUES (${empresaId}, ${dto.condominio_id || null}, ${dto.nome}, ${dto.descricao || null}, ${token})
      RETURNING *
    `;
    return ponto;
  }

  async atualizar(id: string, dto: { nome?: string; descricao?: string; condominio_id?: string }, empresaId: string) {
    const [ponto] = await this.sql`
      UPDATE qr_pontos SET
        nome = COALESCE(${dto.nome ?? null}, nome),
        descricao = COALESCE(${dto.descricao ?? null}, descricao),
        condominio_id = ${dto.condominio_id ?? null},
        atualizado_em = NOW()
      WHERE id = ${id} AND empresa_id = ${empresaId}
      RETURNING *
    `;
    if (!ponto) throw new NotFoundException('Ponto QR não encontrado');
    return ponto;
  }

  async excluir(id: string, empresaId: string) {
    const [ponto] = await this.sql`
      DELETE FROM qr_pontos WHERE id = ${id} AND empresa_id = ${empresaId} RETURNING id
    `;
    if (!ponto) throw new NotFoundException('Ponto QR não encontrado');
    return { ok: true };
  }

  // ---- Público: escanear QR ----
  async buscarPorToken(token: string) {
    const [ponto] = await this.sql`
      SELECT qp.*, e.nome as empresa_nome, c.nome as condominio_nome
      FROM qr_pontos qp
      JOIN empresas e ON e.id = qp.empresa_id
      LEFT JOIN condominios c ON c.id = qp.condominio_id
      WHERE qp.token = ${token}
    `;
    if (!ponto) throw new NotFoundException('QR Code não encontrado');
    return ponto;
  }

  async registrarPresenca(token: string, dto: { usuario_nome: string; latitude?: number; longitude?: number; endereco?: string }) {
    const ponto = await this.buscarPorToken(token);
    const [registro] = await this.sql`
      INSERT INTO qr_registros (ponto_id, empresa_id, usuario_nome, latitude, longitude, endereco)
      VALUES (${ponto.id}, ${ponto.empresa_id}, ${dto.usuario_nome}, ${dto.latitude || null}, ${dto.longitude || null}, ${dto.endereco || null})
      RETURNING *
    `;
    return registro;
  }

  // ---- Relatório (registros) ----
  async listarRegistros(empresaId: string, filtros: any = {}) {
    const { pontoId, dataInicio, dataFim, usuarioNome, condominioId } = filtros;
    return this.sql`
      SELECT qr.*, qp.nome as ponto_nome, qp.descricao as ponto_descricao,
             c.nome as condominio_nome
      FROM qr_registros qr
      JOIN qr_pontos qp ON qp.id = qr.ponto_id
      LEFT JOIN condominios c ON c.id = qp.condominio_id
      WHERE qr.empresa_id = ${empresaId}
        ${pontoId ? this.sql`AND qr.ponto_id = ${pontoId}` : this.sql``}
        ${condominioId ? this.sql`AND qp.condominio_id = ${condominioId}` : this.sql``}
        ${dataInicio ? this.sql`AND qr.criado_em >= ${dataInicio}` : this.sql``}
        ${dataFim ? this.sql`AND qr.criado_em <= ${dataFim + 'T23:59:59'}` : this.sql``}
        ${usuarioNome ? this.sql`AND qr.usuario_nome ILIKE ${'%' + usuarioNome + '%'}` : this.sql``}
      ORDER BY qr.criado_em DESC
    `;
  }

  // ---- PDF Report ----
  async gerarPdfRegistros(empresaId: string, filtros: any = {}): Promise<Buffer> {
    const registros = await this.listarRegistros(empresaId, filtros);

    const formatDate = (d: string) => {
      const dt = new Date(d);
      return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const rows = registros.map((r: any) => `
      <tr>
        <td>${r.ponto_nome || '-'}</td>
        <td>${r.condominio_nome || '-'}</td>
        <td>${r.usuario_nome || '-'}</td>
        <td>${r.endereco || '-'}</td>
        <td>${formatDate(r.criado_em)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
      h1 { color: #0B1D35; font-size: 22px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #0B1D35; color: white; padding: 10px 8px; text-align: left; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) { background: #f9f9f9; }
      .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
      .total { margin-top: 10px; font-size: 13px; font-weight: bold; color: #0B1D35; }
    </style>
    </head><body>
      <h1>Relatório de Registros — QR Code Ponto</h1>
      <p class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      <p class="total">Total de registros: ${registros.length}</p>
      <table>
        <thead><tr>
          <th>Ponto</th>
          <th>Condomínio</th>
          <th>Funcionário</th>
          <th>Endereço</th>
          <th>Data/Hora</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:20px">Nenhum registro encontrado</td></tr>'}</tbody>
      </table>
      <p class="footer">X Vistoria — Sistema de Gestão Condominial</p>
    </body></html>`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' } });
    await browser.close();
    return Buffer.from(buffer);
  }
}
