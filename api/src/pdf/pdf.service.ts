import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQL } from '../database/database.module';
import * as puppeteer from 'puppeteer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';
import * as dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'xvistoria/1.0' } }
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json();
    const addr = data.address || {};
    const parts: string[] = [];
    const road = addr.road || addr.pedestrian || addr.footway || '';
    if (road) parts.push(road);
    if (addr.house_number) parts.push(addr.house_number);
    if (!road && addr.suburb) parts.push(addr.suburb);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

@Injectable()
export class PdfService {
  private readonly s3PublicUrl: string;
  private readonly s3InternalUrl: string;

  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly config: ConfigService,
  ) {
    this.s3PublicUrl = this.config.get('HETZNER_S3_PUBLIC_URL') || this.config.get('HETZNER_S3_ENDPOINT') || '';
    this.s3InternalUrl = this.config.get('HETZNER_S3_ENDPOINT') || this.s3PublicUrl;
  }

  /** Replace public S3 URLs with internal ones so Puppeteer (inside Docker) can load images */
  private toInternalUrl(url: string): string {
    if (!url || !this.s3PublicUrl || this.s3PublicUrl === this.s3InternalUrl) return url;
    return url.replace(this.s3PublicUrl, this.s3InternalUrl);
  }

  async gerarPdfVisita(visitaId: string): Promise<Buffer> {
    // Busca todos os dados da visita
    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             c.sindico_nome, c.sindico_email, c.total_unidades,
             u.nome as supervisor_nome, u.email as supervisor_email, u.telefone as supervisor_telefone,
             u.cargo as supervisor_cargo, u.documento as supervisor_documento,
             e.nome as empresa_nome, e.logo_url as empresa_logo,
             e.assinatura_admin_nome, e.assinatura_admin_cargo, e.assinatura_admin_documento, e.assinatura_admin_img
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN empresas e ON e.id = v.empresa_id
      WHERE v.id = ${visitaId}
    `;

    // Busca TODAS as perguntas do template com respostas (se existirem)
    let respostas: any[] = [];
    if (visita.template_id) {
      respostas = await this.sql`
        SELECT
          r.id, r.resultado, r.observacao, r.transcricao_corrigida, r.audio_url,
          p.id as pergunta_id, p.texto as pergunta_texto,
          c.nome as categoria_nome, c.icone as categoria_icone
        FROM template_perguntas tp
        JOIN perguntas p ON p.id = tp.pergunta_id
        JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN respostas r ON r.pergunta_id = tp.pergunta_id AND r.visita_id = ${visitaId}
        WHERE tp.template_id = ${visita.template_id}
        ORDER BY c.ordem, tp.ordem
      `;
    } else {
      respostas = await this.sql`
        SELECT r.*, p.texto as pergunta_texto, c.nome as categoria_nome, c.icone as categoria_icone
        FROM respostas r
        JOIN perguntas p ON p.id = r.pergunta_id
        JOIN categorias c ON c.id = p.categoria_id
        WHERE r.visita_id = ${visitaId}
        ORDER BY c.ordem, p.ordem
      `;
    }

    const pendencias = await this.sql`
      SELECT * FROM pendencias WHERE visita_id = ${visitaId} ORDER BY prioridade DESC
    `;

    const fotos = await this.sql`
      SELECT f.*, r.pergunta_id
      FROM fotos f
      LEFT JOIN respostas r ON r.id = f.resposta_id
      WHERE f.visita_id = ${visitaId} ORDER BY f.criado_em
    `;

    // Index photos by pergunta_id for inline display
    const fotosPorPergunta: Record<string, any[]> = {};
    const fotosGerais: any[] = [];
    for (const f of fotos) {
      if (f.pergunta_id) {
        if (!fotosPorPergunta[f.pergunta_id]) fotosPorPergunta[f.pergunta_id] = [];
        fotosPorPergunta[f.pergunta_id].push(f);
      } else {
        fotosGerais.push(f);
      }
    }

    // Agrupa respostas por categoria
    const porCategoria = respostas.reduce((acc: any, r: any) => {
      if (!acc[r.categoria_nome]) acc[r.categoria_nome] = [];
      acc[r.categoria_nome].push({ ...r, fotos: fotosPorPergunta[r.pergunta_id] || [] });
      return acc;
    }, {});

    const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length;
    const totalNaoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length;
    const totalNA = respostas.filter((r: any) => r.resultado === 'na').length;
    const respondidas = totalOk + totalNaoOk + totalNA;
    const percentual = respondidas > 0 ? Math.round((totalOk / (respondidas - totalNA || 1)) * 100) : 0;

    const templatePath = path.join(__dirname, 'templates', 'relatorio.hbs');
    const templateSrc = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSrc);

    const html = template({
      visita,
      categorias: Object.entries(porCategoria).map(([nome, itens]) => ({ nome, itens })),
      pendencias,
      fotos: fotosGerais,
      totalOk,
      totalNaoOk,
      totalNA,
      percentual,
      assinatura_admin: {
        nome: visita.assinatura_admin_nome,
        cargo: visita.assinatura_admin_cargo,
        documento: visita.assinatura_admin_documento,
        img: visita.assinatura_admin_img,
      },
      data_geracao: dayjs().format('DD/MM/YYYY HH:mm'),
      data_visita: visita.iniciada_em ? dayjs(visita.iniciada_em).format('DD/MM/YYYY') : '',
    });

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async gerarQuestionario(visitaId: string): Promise<Buffer> {
    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             c.sindico_nome,
             u.nome as supervisor_nome,
             u.cargo as supervisor_cargo, u.documento as supervisor_documento,
             e.nome as empresa_nome, e.logo_url as empresa_logo,
             e.assinatura_admin_nome, e.assinatura_admin_cargo, e.assinatura_admin_documento, e.assinatura_admin_img
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN empresas e ON e.id = v.empresa_id
      WHERE v.id = ${visitaId}
    `;

    if (!visita) throw new NotFoundException('Visita não encontrada');

    const perguntas = await this.sql`
      SELECT tp.ordem, p.texto, cat.nome as categoria_nome
      FROM template_perguntas tp
      JOIN perguntas p ON p.id = tp.pergunta_id
      JOIN categorias cat ON cat.id = p.categoria_id
      WHERE tp.template_id = ${visita.template_id}
      ORDER BY cat.ordem, tp.ordem
    `;

    const porCategoria: Record<string, any[]> = {};
    let num = 0;
    for (const p of perguntas) {
      if (!porCategoria[p.categoria_nome]) porCategoria[p.categoria_nome] = [];
      num++;
      porCategoria[p.categoria_nome].push({ ...p, num });
    }

    const templatePath = path.join(__dirname, 'templates', 'questionario.hbs');
    const templateSrc = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSrc);

    const html = template({
      visita,
      categorias: Object.entries(porCategoria).map(([nome, itens]) => ({ nome, itens })),
      assinatura_admin: {
        nome: visita.assinatura_admin_nome,
        cargo: visita.assinatura_admin_cargo,
        documento: visita.assinatura_admin_documento,
        img: visita.assinatura_admin_img,
      },
      data_geracao: dayjs().format('DD/MM/YYYY HH:mm'),
    });

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '12mm', bottom: '20mm', left: '12mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async gerarPdfVistoriaLivre(id: string): Promise<Buffer> {
    const [vl] = await this.sql`
      SELECT vl.*,
             c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             u.nome as supervisor_nome, u.email as supervisor_email,
             e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM vistorias_livres vl
      JOIN condominios c ON c.id = vl.condominio_id
      JOIN usuarios u ON u.id = vl.supervisor_id
      JOIN empresas e ON e.id = vl.empresa_id
      WHERE vl.id = ${id}
    `;
    if (!vl) throw new NotFoundException('Vistoria livre não encontrada');

    const itens = await this.sql`
      SELECT * FROM itens_vistoria_livre
      WHERE vistoria_livre_id = ${id}
      ORDER BY ordem, criado_em
    `;

    // Resolve addresses for items with coordinates
    const enderecos: Record<number, string> = {};
    for (let i = 0; i < itens.length; i++) {
      if (itens[i].localizacao_lat && itens[i].localizacao_lng) {
        enderecos[i] = await reverseGeocode(itens[i].localizacao_lat, itens[i].localizacao_lng);
      }
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.5; }
  .header { background: #1a365d; color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 18px; font-weight: 700; }
  .header .sub { font-size: 11px; color: rgba(255,255,255,0.7); }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 24px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
  .info-item label { font-size: 9px; text-transform: uppercase; color: #718096; font-weight: 600; }
  .info-item p { font-size: 12px; color: #2d3748; font-weight: 500; }
  .section-title { font-size: 14px; font-weight: 700; color: #1a365d; padding: 16px 24px 8px; border-bottom: 2px solid #1a365d; margin: 0 24px; }
  .item { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
  .item-header { font-size: 13px; font-weight: 700; color: #2d3748; margin-bottom: 6px; }
  .item-desc { font-size: 11px; color: #4a5568; margin-bottom: 8px; white-space: pre-wrap; }
  .item-photo { max-width: 100%; max-height: 300px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 6px; }
  .item-location { font-size: 9px; color: #a0aec0; margin-top: 4px; }
  .footer { text-align: center; padding: 16px; font-size: 9px; color: #a0aec0; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-rascunho { background: #fefcbf; color: #975a16; }
  .badge-concluida { background: #c6f6d5; color: #276749; }
  .badge-enviada { background: #bee3f8; color: #2a4365; }
  .item-number { display: inline-block; width: 24px; height: 24px; border-radius: 50%; background: #1a365d; color: white; text-align: center; line-height: 24px; font-size: 11px; font-weight: 700; margin-right: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Vistoria Livre</h1>
      <div class="sub">${vl.empresa_nome}</div>
    </div>
    <div style="text-align: right;">
      <div class="sub">${dayjs(vl.criado_em).format('DD/MM/YYYY HH:mm')}</div>
      <span class="badge badge-${vl.status}">${{ rascunho: 'Rascunho', concluida: 'Concluída', enviada: 'Enviada' }[vl.status] || vl.status}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Condomínio</label><p>${vl.condominio_nome}</p></div>
    <div class="info-item"><label>Endereço</label><p>${vl.endereco || '-'}${vl.cidade ? ', ' + vl.cidade : ''}${vl.estado ? ' - ' + vl.estado : ''}</p></div>
    <div class="info-item"><label>Vistoriador</label><p>${vl.supervisor_nome}</p></div>
    <div class="info-item"><label>Título</label><p>${vl.titulo || 'Sem título'}</p></div>
  </div>

  <div class="section-title">Itens da Vistoria (${itens.length})</div>
  ${itens.map((item: any, idx: number) => `
    <div class="item">
      <div class="item-header"><span class="item-number">${idx + 1}</span>${item.titulo}</div>
      ${item.descricao ? `<div class="item-desc">${item.descricao}</div>` : ''}
      ${item.foto_url ? `<img class="item-photo" src="${this.toInternalUrl(item.foto_url)}" />` : ''}
      ${item.localizacao_lat ? `<div class="item-location">📍 ${enderecos[idx] || (item.localizacao_lat.toFixed(6) + ', ' + item.localizacao_lng.toFixed(6))}</div>` : ''}
    </div>
  `).join('')}

  <div class="footer">
    Gerado em ${dayjs().format('DD/MM/YYYY [às] HH:mm')} · ${vl.empresa_nome} · X Vistoria Condominial
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // ─── CHECKLIST AVULSO PDF ───────────────────────────────

  async gerarPdfChecklistAvulso(id: string): Promise<Buffer> {
    const [exec] = await this.sql`
      SELECT e.*, u.nome as executor_nome, u.email as executor_email,
        m.titulo as modelo_titulo,
        emp.nome as empresa_nome
      FROM checklist_execucoes e
      JOIN usuarios u ON u.id = e.executor_id
      JOIN empresas emp ON emp.id = e.empresa_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      WHERE e.id = ${id}
    `;
    if (!exec) throw new NotFoundException('Checklist não encontrado');

    const itens = await this.sql`
      SELECT * FROM checklist_execucao_itens
      WHERE execucao_id = ${id}
      ORDER BY ordem, criado_em
    `;

    const totalOk = itens.filter((i: any) => i.conforme === true).length;
    const totalProblemas = itens.filter((i: any) => i.conforme === false).length;
    const totalPendente = itens.filter((i: any) => i.conforme === null).length;

    // Resolve addresses
    let inicioEnd = exec.inicio_endereco || '';
    let fimEnd = exec.fim_endereco || '';
    if (!inicioEnd && exec.inicio_lat) inicioEnd = await reverseGeocode(exec.inicio_lat, exec.inicio_lng);
    if (!fimEnd && exec.fim_lat) fimEnd = await reverseGeocode(exec.fim_lat, exec.fim_lng);

    const problemas = itens.filter((i: any) => i.conforme === false);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.5; }
  .header { background: #0f172a; color: white; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 18px; font-weight: 700; }
  .header .sub { font-size: 11px; color: rgba(255,255,255,0.7); }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  .info-item label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
  .info-item p { font-size: 12px; color: #1e293b; font-weight: 500; }
  .stats { display: flex; gap: 16px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
  .stat { flex: 1; text-align: center; padding: 12px; border-radius: 8px; }
  .stat-ok { background: #f0fdf4; }
  .stat-prob { background: #fef2f2; }
  .stat-pend { background: #f8fafc; }
  .stat-num { font-size: 24px; font-weight: 800; }
  .stat-ok .stat-num { color: #16a34a; }
  .stat-prob .stat-num { color: #dc2626; }
  .stat-pend .stat-num { color: #64748b; }
  .stat-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
  .section-title { font-size: 14px; font-weight: 700; color: #0f172a; padding: 16px 24px 8px; border-bottom: 2px solid #0f172a; margin: 0 24px; }
  .item { padding: 12px 24px; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid; display: flex; align-items: flex-start; gap: 12px; }
  .item-check { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; }
  .check-ok { background: #16a34a; }
  .check-prob { background: #dc2626; }
  .check-pend { background: #cbd5e1; }
  .item-content { flex: 1; }
  .item-title { font-size: 12px; font-weight: 600; color: #1e293b; }
  .item-time { font-size: 9px; color: #94a3b8; }
  .problema { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 24px; margin: 8px 24px; page-break-inside: avoid; }
  .problema-title { font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 6px; }
  .problema-desc { font-size: 11px; color: #4a5568; margin-bottom: 8px; white-space: pre-wrap; }
  .problema-foto { max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #fecaca; }
  .selfie-section { padding: 16px 24px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #e2e8f0; }
  .selfie-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #0f172a; }
  .footer { text-align: center; padding: 16px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-concluida { background: #dcfce7; color: #166534; }
  .badge-em_andamento { background: #fef9c3; color: #854d0e; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Relatório de Checklist</h1>
      <div class="sub">${exec.empresa_nome}</div>
    </div>
    <div style="text-align: right;">
      <div class="sub">${dayjs(exec.iniciado_em).format('DD/MM/YYYY HH:mm')}</div>
      <span class="badge badge-${exec.status}">${exec.status === 'concluida' ? 'Concluído' : 'Em andamento'}</span>
    </div>
  </div>

  ${exec.selfie_url ? `
  <div class="selfie-section">
    <img class="selfie-img" src="${this.toInternalUrl(exec.selfie_url)}" />
    <div>
      <div style="font-weight: 700; font-size: 13px; color: #1e293b;">${exec.executor_nome}</div>
      <div style="font-size: 11px; color: #64748b;">${exec.executor_email}</div>
    </div>
  </div>` : ''}

  <div class="info-grid">
    <div class="info-item"><label>Título</label><p>${exec.titulo}</p></div>
    <div class="info-item"><label>Executor</label><p>${exec.executor_nome}</p></div>
    ${exec.local_nome ? `<div class="info-item"><label>Local</label><p>${exec.local_nome}</p></div>` : ''}
    <div class="info-item"><label>Início</label><p>${dayjs(exec.iniciado_em).format('DD/MM/YYYY [às] HH:mm')}</p></div>
    ${exec.finalizado_em ? `<div class="info-item"><label>Fim</label><p>${dayjs(exec.finalizado_em).format('DD/MM/YYYY [às] HH:mm')}</p></div>` : ''}
    ${inicioEnd ? `<div class="info-item"><label>Endereço início</label><p>${inicioEnd}</p></div>` : ''}
    ${fimEnd ? `<div class="info-item"><label>Endereço fim</label><p>${fimEnd}</p></div>` : ''}
  </div>

  <div class="stats">
    <div class="stat stat-ok"><div class="stat-num">${totalOk}</div><div class="stat-label">Conforme</div></div>
    <div class="stat stat-prob"><div class="stat-num">${totalProblemas}</div><div class="stat-label">Problemas</div></div>
    <div class="stat stat-pend"><div class="stat-num">${totalPendente}</div><div class="stat-label">Pendente</div></div>
  </div>

  <div class="section-title">Itens do Checklist (${itens.length})</div>
  ${itens.map((item: any) => {
    let checkCls: string;
    let checkSym: string;
    if (item.conforme === true) { checkCls = 'check-ok'; checkSym = '\u2713'; }
    else if (item.conforme === false) { checkCls = 'check-prob'; checkSym = '\u2717'; }
    else { checkCls = 'check-pend'; checkSym = '\u2014'; }
    return `
    <div class="item">
      <div class="item-check ${checkCls}">
        ${checkSym}
      </div>
      <div class="item-content">
        <div class="item-title">${item.titulo}</div>
        ${item.verificado_em ? `<div class="item-time">${dayjs(item.verificado_em).format('DD/MM/YYYY HH:mm')}</div>` : ''}
      </div>
    </div>
  `;
  }).join('')}

  ${problemas.length > 0 ? `
  <div class="section-title" style="color: #dc2626; border-color: #dc2626;">Problemas Encontrados (${problemas.length})</div>
  ${problemas.map((item: any) => {
    const descHtml = item.problema_descricao ? '<div class="problema-desc">' + item.problema_descricao + '</div>' : '';
    const fotoHtml = item.problema_foto_url ? '<img class="problema-foto" src="' + this.toInternalUrl(item.problema_foto_url) + '" />' : '';
    return '<div class="problema"><div class="problema-title">\u26a0\ufe0f ' + item.titulo + '</div>' + descHtml + fotoHtml + '</div>';
  }).join('')}` : ''}

  ${exec.observacao ? `
  <div style="padding: 16px 24px; background: #fffbeb; border-top: 1px solid #fbbf24; margin-top: 16px;">
    <div style="font-size: 11px; font-weight: 700; color: #92400e; margin-bottom: 4px;">Observações</div>
    <div style="font-size: 11px; color: #78350f; white-space: pre-wrap;">${exec.observacao}</div>
  </div>` : ''}

  <div class="footer">
    Gerado em ${dayjs().format('DD/MM/YYYY [às] HH:mm')} · ${exec.empresa_nome} · X Vistoria Condominial
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // ─── FORMULÁRIO FÍSICO (checklist em branco para preencher à mão) ───

  async gerarFormularioChecklist(modeloId: string): Promise<Buffer> {
    const [modelo] = await this.sql`
      SELECT m.*, e.nome as empresa_nome
      FROM checklist_modelos m
      JOIN empresas e ON e.id = m.empresa_id
      WHERE m.id = ${modeloId}
    `;
    if (!modelo) throw new NotFoundException('Modelo não encontrado');

    const itens = await this.sql`
      SELECT * FROM checklist_modelo_itens
      WHERE modelo_id = ${modeloId}
      ORDER BY ordem, criado_em
    `;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.6; }
  .header { background: #0f172a; color: white; padding: 20px 24px; }
  .header h1 { font-size: 18px; font-weight: 700; }
  .header .sub { font-size: 11px; color: rgba(255,255,255,0.7); }
  .form-fields { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
  .form-field { margin-bottom: 12px; }
  .form-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
  .form-line { border-bottom: 1px solid #cbd5e1; height: 24px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .checklist-header { display: grid; grid-template-columns: 1fr 60px 60px auto; gap: 8px; padding: 10px 24px; background: #f1f5f9; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
  .checklist-item { display: grid; grid-template-columns: 1fr 60px 60px auto; gap: 8px; padding: 10px 24px; border-bottom: 1px solid #f1f5f9; min-height: 36px; align-items: center; }
  .checklist-item:nth-child(even) { background: #fafafa; }
  .item-name { font-size: 12px; font-weight: 500; }
  .checkbox { width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 3px; margin: 0 auto; }
  .obs-section { padding: 16px 24px; margin-top: 8px; }
  .obs-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 8px; }
  .obs-lines { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; min-height: 100px; }
  .obs-line { border-bottom: 1px solid #f1f5f9; height: 24px; }
  .footer { text-align: center; padding: 16px 24px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 20px; }
  .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 24px; margin-top: 16px; }
  .sig-box { border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 10px; color: #64748b; }
</style>
</head>
<body>
  <div class="header">
    <h1>${modelo.titulo}</h1>
    <div class="sub">${modelo.empresa_nome} · Formulário de Checklist</div>
  </div>

  <div class="form-fields">
    <div class="form-row">
      <div class="form-field">
        <div class="form-label">Executor / Responsável</div>
        <div class="form-line"></div>
      </div>
      <div class="form-field">
        <div class="form-label">Data</div>
        <div class="form-line"></div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field">
        <div class="form-label">Local</div>
        <div class="form-line"></div>
      </div>
      <div class="form-field">
        <div class="form-label">Horário Início / Fim</div>
        <div class="form-line"></div>
      </div>
    </div>
  </div>

  <div class="checklist-header">
    <span>Item</span>
    <span style="text-align: center;">OK</span>
    <span style="text-align: center;">Prob.</span>
    <span>Observação</span>
  </div>

  ${itens.map((item: any, idx: number) => `
    <div class="checklist-item">
      <div class="item-name">${idx + 1}. ${item.titulo}</div>
      <div class="checkbox"></div>
      <div class="checkbox"></div>
      <div style="border-bottom: 1px solid #e2e8f0; min-width: 150px;"></div>
    </div>
  `).join('')}

  ${Array.from({ length: 5 }).map(() => `
    <div class="checklist-item">
      <div style="border-bottom: 1px solid #e2e8f0;"></div>
      <div class="checkbox"></div>
      <div class="checkbox"></div>
      <div style="border-bottom: 1px solid #e2e8f0; min-width: 150px;"></div>
    </div>
  `).join('')}

  <div class="obs-section">
    <div class="obs-label">Observações gerais</div>
    <div class="obs-lines">
      ${Array.from({ length: 4 }).map(() => '<div class="obs-line"></div>').join('')}
    </div>
  </div>

  <div class="sig-section">
    <div class="sig-box">Assinatura do executor</div>
    <div class="sig-box">Assinatura do responsável</div>
  </div>

  <div class="footer">
    ${modelo.empresa_nome} · X Vistoria Condominial · Formulário gerado em ${dayjs().format('DD/MM/YYYY')}
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
