(function () {
  var BASE = 'https://appgroupbrasil.com.br/embed';

  var APPS = [
    { nome: 'App Avisos',          arquivo: 'avisos.png',             link: 'https://appavisos.com.br',              host: 'appavisos.com.br' },
    { nome: 'App Revista',         arquivo: 'revista.png',            link: 'https://apprevista.com.br',             host: 'apprevista.com.br' },
    { nome: 'App Vistoria',        arquivo: 'vistoria.png',           link: 'https://xvistoria.com.br',              host: 'xvistoria.com.br' },
    { nome: 'App Votação',         arquivo: 'votacao.png',            link: 'https://appvotacao.com.br',             host: 'appvotacao.com.br' },
    { nome: 'App Correspondência', arquivo: 'correspondencia.png',    link: 'https://www.appcorrespondencia.com.br', host: 'appcorrespondencia.com.br' },
    { nome: 'App Gestão',          arquivo: 'gestao.png',             link: 'https://appgestaoemlimpeza.com.br',     host: 'appgestaoemlimpeza.com.br' },
    { nome: 'Manutenção X',        arquivo: 'manutencao-x.png',       link: 'https://manutencaox.com.br',            host: 'manutencaox.com.br' },
    { nome: 'App Manutenção',      arquivo: 'manutencao.png',         link: 'https://appmanutencao.com.br',          host: 'appmanutencao.com.br' },
    { nome: 'Portaria X',          arquivo: 'portaria-x.png',         link: 'https://www.portariax.com.br',          host: 'portariax.com.br' },
    { nome: 'App Reserva',         arquivo: 'reserva.png',            link: 'https://appreserva.com.br',             host: 'appreserva.com.br' },
    { nome: 'Simples Manutenção',  arquivo: 'simples-manutencao.png', link: 'https://simplesmanutencao.com.br',      host: 'simplesmanutencao.com.br' }
  ];

  var hostAtual = (window.location && window.location.hostname || '').replace(/^www\./, '');
  var lista = APPS.filter(function (a) { return a.host !== hostAtual; });

  function cartao(a, ariaHidden) {
    return '<a href="' + a.link + '" target="_blank" rel="noopener"' + (ariaHidden ? ' aria-hidden="true"' : '') + '>' +
      '<img src="' + BASE + '/apps/' + a.arquivo + '" alt="' + (ariaHidden ? '' : a.nome) + '" loading="lazy"/>' +
      '<span class="agb-nome">' + a.nome + '</span>' +
    '</a>';
  }

  var html =
    '<section class="agb-section">' +
      '<div class="agb-hd">' +
        '<span class="agb-label">App Group Brasil</span>' +
        '<h2 class="agb-title">Conheça nossos aplicativos</h2>' +
        '<p class="agb-sub">Soluções para administradoras, síndicos, condomínios e empresas de facility.</p>' +
      '</div>' +
      '<div class="agb-marquee" aria-label="Aplicativos do App Group Brasil">' +
        '<div class="agb-track">' +
          lista.map(function (a) { return cartao(a, false); }).join('') +
          lista.map(function (a) { return cartao(a, true); }).join('') +
        '</div>' +
      '</div>' +
    '</section>';

  var css =
    '.agb-section{position:relative;z-index:1;clear:both;display:block;width:100%;box-sizing:border-box;background:#fff;padding:60px 0 80px;margin:0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;overflow:hidden;font-family:Inter,system-ui,sans-serif}' +
    '.agb-section *{box-sizing:border-box}' +
    '.agb-hd{text-align:center;max-width:720px;margin:0 auto 32px;padding:0 5%}' +
    '.agb-label{display:inline-block;background:linear-gradient(135deg,rgba(0,214,143,.1),rgba(59,130,246,.1));color:#1A3A5C;border-radius:100px;padding:5px 16px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}' +
    '.agb-title{font-size:clamp(1.8rem,3vw,2.5rem);font-weight:800;color:#0B1D35;line-height:1.2;margin:0 0 14px}' +
    '.agb-sub{font-size:1rem;color:#64748B;line-height:1.7;margin:0 auto;max-width:560px}' +
    '.agb-marquee{position:relative;width:100%;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}' +
    '.agb-track{display:flex;gap:32px;width:max-content;animation:agb-scroll 60s linear infinite;align-items:center;padding:10px 0}' +
    '.agb-marquee:hover .agb-track{animation-play-state:paused}' +
    '.agb-track a{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:200px;padding:18px 12px 14px;border-radius:22px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.08);transition:transform .2s,box-shadow .2s;text-decoration:none}' +
    '.agb-track a:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,214,143,.25)}' +
    '.agb-track img{width:144px;height:144px;object-fit:contain}' +
    '.agb-track .agb-nome{margin-top:10px;font-size:.82rem;font-weight:700;color:#0B1D35;text-align:center;line-height:1.2}' +
    '@keyframes agb-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
    '@media (prefers-reduced-motion:reduce){.agb-track{animation:none}}';

  function localizarAlvo(definitivo) {
    var manual = document.getElementById('apps-carousel-root');
    if (manual) return { tipo: 'manual', el: manual };
    var titulos = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < titulos.length; i++) {
      var txt = (titulos[i].textContent || '').toLowerCase();
      if (txt.indexOf('tudo') !== -1 && txt.indexOf('precisa') !== -1) {
        var sec = titulos[i].closest('section, article, div');
        return { tipo: 'antes', el: sec || titulos[i] };
      }
    }
    if (definitivo) {
      var footer = document.querySelector('footer');
      if (footer) return { tipo: 'antes', el: footer };
      if (document.body) return { tipo: 'fim', el: document.body };
    }
    return null;
  }

  function injetar(definitivo) {
    if (document.getElementById('agb-apps-carousel-style')) return false;
    var alvo = localizarAlvo(definitivo);
    if (!alvo) return false;
    var style = document.createElement('style');
    style.id = 'agb-apps-carousel-style';
    style.textContent = css;
    document.head.appendChild(style);
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    var node = wrapper.firstChild;
    if (alvo.tipo === 'manual') {
      alvo.el.innerHTML = '';
      alvo.el.appendChild(node);
    } else if (alvo.tipo === 'fim') {
      alvo.el.appendChild(node);
    } else {
      alvo.el.parentNode.insertBefore(node, alvo.el);
    }
    return true;
  }

  function tentar() {
    if (injetar(false)) return;
    var tentativas = 0;
    var t = setInterval(function () {
      tentativas++;
      if (injetar(false)) { clearInterval(t); return; }
      if (tentativas > 40) { clearInterval(t); injetar(true); }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tentar);
  } else {
    tentar();
  }
})();
