/**
 * Gera OG images, favicons e ícones PWA a partir do favicon.svg
 * Uso: node scripts/generate-icons.js
 * Requer: npm install sharp (já instalado em api/)
 */
const path = require('node:path');
const fs = require('node:fs');
const sharp = require(path.resolve(__dirname, '..', 'api', 'node_modules', 'sharp'));

const ROOT = path.resolve(__dirname, '..');
const faviconSvg = path.join(ROOT, 'web', 'public', 'favicon.svg');

// OG image SVG (1200x630) — branded banner
const ogImageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E3A5F"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Icon -->
  <g transform="translate(500, 120) scale(4)">
    <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)"/>
    <path d="M8 22V10l8-4 8 4v12l-8 4-8-4z" stroke="#fff" stroke-width="2" stroke-linejoin="round" fill="none"/>
    <path d="M16 6v20M8 10l8 4 8-4" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <!-- Title -->
  <text x="600" y="340" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff" text-anchor="middle">X Vistoria</text>
  <!-- Subtitle -->
  <text x="600" y="400" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="400" fill="rgba(255,255,255,0.85)" text-anchor="middle">Sistema de Vistoria Condominial</text>
  <!-- Features -->
  <text x="600" y="480" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="400" fill="rgba(255,255,255,0.6)" text-anchor="middle">Checklists • Relatórios PDF • Fotos Geolocalizadas • Gestão de Pendências</text>
  <!-- URL -->
  <text x="600" y="580" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" fill="rgba(255,255,255,0.5)" text-anchor="middle">xvistoria.com.br</text>
</svg>`;

async function generate() {
  console.log('Gerando ícones e OG images...\n');

  const svgBuffer = fs.readFileSync(faviconSvg);

  const targets = [
    // Web public
    { output: 'web/public/og-image.png', svg: ogImageSvg, w: 1200, h: 630 },
    { output: 'web/public/favicon-32.png', svg: svgBuffer, w: 32, h: 32 },
    { output: 'web/public/apple-touch-icon.png', svg: svgBuffer, w: 180, h: 180 },
    // PWA public
    { output: 'pwa/public/og-image.png', svg: ogImageSvg, w: 1200, h: 630 },
    { output: 'pwa/public/favicon.svg', svg: svgBuffer, copy: true },
    { output: 'pwa/public/apple-touch-icon.png', svg: svgBuffer, w: 180, h: 180 },
    { output: 'pwa/public/icons/icon-192.png', svg: svgBuffer, w: 192, h: 192 },
    { output: 'pwa/public/icons/icon-512.png', svg: svgBuffer, w: 512, h: 512 },
  ];

  for (const t of targets) {
    const outPath = path.join(ROOT, t.output);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (t.copy) {
      fs.copyFileSync(faviconSvg, outPath);
      console.log(`  ✓ ${t.output} (copy)`);
      continue;
    }

    const input = typeof t.svg === 'string' ? Buffer.from(t.svg) : t.svg;
    await sharp(input, { density: 300 })
      .resize(t.w, t.h)
      .png()
      .toFile(outPath);

    console.log(`  ✓ ${t.output} (${t.w}x${t.h})`);
  }

  console.log('\nConcluído!');
}

generate().catch(console.error);
