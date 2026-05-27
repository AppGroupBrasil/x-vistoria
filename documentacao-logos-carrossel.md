# Documentação — Carrossel de Logos dos 13 Apps

Este documento descreve como replicar o carrossel "Conheça nossos aplicativos" usado na landing do X Vistoria nos demais 13 sistemas do App Group Brasil.

---

## 1) Pode ser centralizado?

**Sim.** Há duas estratégias:

### A) Embed central (recomendado)
Hospedar um único arquivo JS + CSS num domínio (ex.: `appgroupbrasil.com.br/embed/apps-carousel.js`). Cada site inclui uma linha só:

```html
<script src="https://appgroupbrasil.com.br/embed/apps-carousel.js" defer></script>
<div id="apps-carousel-root"></div>
```

**Vantagem:** atualiza tudo de uma vez (novo app, link mudou, logo trocado). Basta editar o JS hospedado.
**Desvantagem:** os 13 sites dependem desse JS estar no ar.

### B) Copiar/colar em cada sistema
Cada repositório recebe sua cópia do HTML + pasta `apps/` com os PNGs. Atualizações exigem editar 13 vezes (ou via script).

**Vantagem:** zero dependência externa.
**Desvantagem:** divergência ao longo do tempo se alguém esquecer de propagar uma mudança.

> **Sugestão:** começar com B (rápido), e quando estabilizar, migrar para A.

---

## 2) Lista oficial dos 13 apps

| Ordem | Nome exibido        | Arquivo do logo            | Link                                   |
|------:|---------------------|----------------------------|----------------------------------------|
| 1     | App Avisos          | `avisos.png`               | https://appavisos.com.br               |
| 2     | App Condomínio      | `condominio.png`           | https://appcondominio.com.br           |
| 3     | App Revista         | `revista.png`              | https://apprevista.com.br              |
| 4     | App Síndico         | `sindico.png`              | https://appsindico.com.br              |
| 5     | App Vistoria        | `vistoria.png`             | https://xvistoria.com.br               |
| 6     | App Votação         | `votacao.png`              | https://appvotacao.com.br              |
| 7     | App Correspondência | `correspondencia.png`      | https://www.appcorrespondencia.com.br  |
| 8     | App Gestão          | `gestao.png`               | https://appgestaoemlimpeza.com.br      |
| 9     | Manutenção X        | `manutencao-x.png`         | https://manutencaox.com.br             |
| 10    | App Manutenção      | `manutencao.png`           | https://appmanutencao.com.br           |
| 11    | Portaria X          | `portaria-x.png`           | https://www.portariax.com.br           |
| 12    | App Reserva         | `reserva.png`              | https://appreserva.com.br              |
| 13    | Simples Manutenção  | `simples-manutencao.png`   | https://simplesmanutencao.com.br       |

**Pasta canônica dos PNGs:** [site/apps/](site/apps/) deste repositório.
Cada arquivo tem ~100–500 KB, máximo 256×256px (foram redimensionados de originais gigantes).

---

## 3) Como replicar manualmente em outro sistema

Em cada um dos 13 repositórios:

1. Criar pasta `apps/` na raiz pública (ou onde ficam os assets estáticos).
2. Copiar os 13 PNGs de [site/apps/](site/apps/) do X Vistoria para essa pasta.
3. Inserir o bloco abaixo (HTML + CSS) no local desejado da landing.

### Bloco HTML + CSS (completo, autônomo)

```html
<!-- CARROSSEL DE APPS — APP GROUP BRASIL -->
<section style="background:#fff;padding:60px 0 80px;border-top:1px solid #e2e8f0;overflow:hidden">
  <div style="text-align:center;max-width:720px;margin:0 auto 32px;padding:0 5%">
    <span style="display:inline-block;background:linear-gradient(135deg,rgba(0,214,143,.1),rgba(59,130,246,.1));color:#1A3A5C;border-radius:100px;padding:5px 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px">App Group Brasil</span>
    <h2 style="font-size:clamp(1.8rem,3vw,2.5rem);font-weight:800;color:#0B1D35;line-height:1.2;margin:0 0 14px">Conheça nossos aplicativos</h2>
    <p style="font-size:1rem;color:#64748B;line-height:1.7;margin:0 auto;max-width:560px">Soluções para administradoras, síndicos, condomínios e empresas de facility.</p>
  </div>
  <div class="apps-marquee" aria-label="Aplicativos do App Group Brasil">
    <div class="apps-track">
      <a href="https://appavisos.com.br" target="_blank" rel="noopener"><img src="apps/avisos.png" alt="App Avisos" loading="lazy"/><span class="nome">App Avisos</span></a>
      <a href="https://appcondominio.com.br" target="_blank" rel="noopener"><img src="apps/condominio.png" alt="App Condomínio" loading="lazy"/><span class="nome">App Condomínio</span></a>
      <a href="https://apprevista.com.br" target="_blank" rel="noopener"><img src="apps/revista.png" alt="App Revista" loading="lazy"/><span class="nome">App Revista</span></a>
      <a href="https://appsindico.com.br" target="_blank" rel="noopener"><img src="apps/sindico.png" alt="App Síndico" loading="lazy"/><span class="nome">App Síndico</span></a>
      <a href="https://xvistoria.com.br" target="_blank" rel="noopener"><img src="apps/vistoria.png" alt="App Vistoria" loading="lazy"/><span class="nome">App Vistoria</span></a>
      <a href="https://appvotacao.com.br" target="_blank" rel="noopener"><img src="apps/votacao.png" alt="App Votação" loading="lazy"/><span class="nome">App Votação</span></a>
      <a href="https://www.appcorrespondencia.com.br" target="_blank" rel="noopener"><img src="apps/correspondencia.png" alt="App Correspondência" loading="lazy"/><span class="nome">App Correspondência</span></a>
      <a href="https://appgestaoemlimpeza.com.br" target="_blank" rel="noopener"><img src="apps/gestao.png" alt="App Gestão" loading="lazy"/><span class="nome">App Gestão</span></a>
      <a href="https://manutencaox.com.br" target="_blank" rel="noopener"><img src="apps/manutencao-x.png" alt="Manutenção X" loading="lazy"/><span class="nome">Manutenção X</span></a>
      <a href="https://appmanutencao.com.br" target="_blank" rel="noopener"><img src="apps/manutencao.png" alt="App Manutenção" loading="lazy"/><span class="nome">App Manutenção</span></a>
      <a href="https://www.portariax.com.br" target="_blank" rel="noopener"><img src="apps/portaria-x.png" alt="Portaria X" loading="lazy"/><span class="nome">Portaria X</span></a>
      <a href="https://appreserva.com.br" target="_blank" rel="noopener"><img src="apps/reserva.png" alt="App Reserva" loading="lazy"/><span class="nome">App Reserva</span></a>
      <a href="https://simplesmanutencao.com.br" target="_blank" rel="noopener"><img src="apps/simples-manutencao.png" alt="Simples Manutenção" loading="lazy"/><span class="nome">Simples Manutenção</span></a>
      <!-- DUPLICADO para loop infinito (não remover) -->
      <a href="https://appavisos.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/avisos.png" alt="" loading="lazy"/><span class="nome">App Avisos</span></a>
      <a href="https://appcondominio.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/condominio.png" alt="" loading="lazy"/><span class="nome">App Condomínio</span></a>
      <a href="https://apprevista.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/revista.png" alt="" loading="lazy"/><span class="nome">App Revista</span></a>
      <a href="https://appsindico.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/sindico.png" alt="" loading="lazy"/><span class="nome">App Síndico</span></a>
      <a href="https://xvistoria.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/vistoria.png" alt="" loading="lazy"/><span class="nome">App Vistoria</span></a>
      <a href="https://appvotacao.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/votacao.png" alt="" loading="lazy"/><span class="nome">App Votação</span></a>
      <a href="https://www.appcorrespondencia.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/correspondencia.png" alt="" loading="lazy"/><span class="nome">App Correspondência</span></a>
      <a href="https://appgestaoemlimpeza.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/gestao.png" alt="" loading="lazy"/><span class="nome">App Gestão</span></a>
      <a href="https://manutencaox.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/manutencao-x.png" alt="" loading="lazy"/><span class="nome">Manutenção X</span></a>
      <a href="https://appmanutencao.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/manutencao.png" alt="" loading="lazy"/><span class="nome">App Manutenção</span></a>
      <a href="https://www.portariax.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/portaria-x.png" alt="" loading="lazy"/><span class="nome">Portaria X</span></a>
      <a href="https://appreserva.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/reserva.png" alt="" loading="lazy"/><span class="nome">App Reserva</span></a>
      <a href="https://simplesmanutencao.com.br" target="_blank" rel="noopener" aria-hidden="true"><img src="apps/simples-manutencao.png" alt="" loading="lazy"/><span class="nome">Simples Manutenção</span></a>
    </div>
  </div>
</section>
<style>
.apps-marquee{position:relative;width:100%;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.apps-track{display:flex;gap:32px;width:max-content;animation:apps-scroll 60s linear infinite;align-items:center;padding:10px 0}
.apps-marquee:hover .apps-track{animation-play-state:paused}
.apps-track a{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:200px;padding:18px 12px 14px;border-radius:22px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.08);transition:transform .2s, box-shadow .2s;text-decoration:none}
.apps-track a:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,214,143,.25)}
.apps-track img{width:144px;height:144px;object-fit:contain}
.apps-track .nome{margin-top:10px;font-size:.82rem;font-weight:700;color:#0B1D35;text-align:center;line-height:1.2}
@keyframes apps-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){.apps-track{animation:none}}
</style>
```

### Posicionamento sugerido
Inserir **logo após a seção Hero** (acima do bloco "Tudo que você precisa em um só lugar" ou equivalente).

### Auto-exclusão
Cada site deve **omitir o próprio logo** da lista (ex.: na landing do X Vistoria, remover o item `vistoria.png` para não autorreferenciar). Basta excluir as 2 linhas correspondentes (original + duplicada).

---

## 4) Atualizando todos de uma vez (estratégia B — via script)

Se optar por copiar/colar e quiser propagar mudanças depois, manter este repositório como **fonte da verdade** e usar:

```bash
# Em cada repositório destino:
rsync -av --delete /caminho/X-Vistoria/site/apps/ ./apps/
# Substituir o bloco HTML pelo atual deste documento.
```

Ou commitar o bloco em um arquivo `_carrossel.html` e usar SSI/include do servidor para incluir.

---

## 5) Quando adicionar um 14º app

1. Colocar PNG (máx. 256×256px, ~100 KB) em [site/apps/](site/apps/).
2. Atualizar a tabela da seção 2 deste documento.
3. Adicionar **duas linhas** no bloco HTML (original + duplicada `aria-hidden="true"`).
4. Propagar (manual ou via script) para os 13 sistemas.

---

## 6) Manutenção das imagens

- **Formato:** PNG com fundo transparente.
- **Tamanho máximo:** 256×256px (display final é 144×144px).
- **Peso recomendado:** < 200 KB por arquivo.
- Para redimensionar PNGs gigantes, usar `sharp` (Node.js):

```bash
node -e "require('sharp')('original.png',{limitInputPixels:false}).resize(256,256,{fit:'inside'}).png({compressionLevel:9}).toFile('saida.png')"
```
