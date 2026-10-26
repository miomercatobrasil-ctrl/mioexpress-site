// Gera as artes do Instagram da Mio (1080×1350, feed 4:5) a partir de HTML.
// Uso: node marketing/gerador/posts.mjs [id-do-post]   → PNGs em marketing/posts/<id>/
// Para um post novo: copie um item de POSTS e troque textos/fotos.
import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "marketing", "posts");
const f = (p) => "file://" + join(ROOT, p);
const FOTO = (n) => f(`assets/source/fotos/${n}.jpg`);
const R3D = (n) => f(`marketing/fotos-3d/${n}.png`);
const PROD = (n) => f(`assets/source/produtos/crop_${n}.png`);
const LOGO = f("public/brand/logo.svg");
const LOGO_W = f("public/brand/logo-white.svg");

const CSS = `
@font-face { font-family: M; src: url("${f("marketing/gerador/montserrat.ttf")}"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1080px; height: 1350px; font-family: M, sans-serif; color: #2b1d1a; overflow: hidden; }
.s { position: relative; width: 1080px; height: 1350px; padding: 90px 84px; display: flex; flex-direction: column; overflow: hidden; }
.bege { background: #f5eee4; } .vinho { background: #7a1f2b; color: #fffdf9; } .escuro { background: #3b0d14; color: #fffdf9; }
.foto { position: absolute; inset: 0; background-size: cover; background-position: center; }
.foto::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(43,29,26,.05) 30%, rgba(43,29,26,.82) 100%); }
.foto.escura::after { background: linear-gradient(180deg, rgba(43,29,26,0) 15%, rgba(43,29,26,.7) 45%, rgba(43,29,26,.95) 100%); }
.foto.topo::after { background: linear-gradient(180deg, rgba(43,29,26,.75) 0%, rgba(43,29,26,.1) 45%, rgba(43,29,26,.85) 100%); }
.z { position: relative; z-index: 1; }
.eyebrow { font-size: 26px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #b08d57; }
.pill { display: inline-block; align-self: flex-start; padding: 12px 24px; border-radius: 99px; background: #7a1f2b; color: #fffdf9; font-size: 24px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
h1 { font-size: 104px; line-height: .98; font-weight: 700; letter-spacing: -.035em; }
h2 { font-size: 76px; line-height: 1.02; font-weight: 700; letter-spacing: -.03em; }
h1 em, h2 em { font-style: normal; color: #b08d57; }
.bege h1 em, .bege h2 em { color: #7a1f2b; }
p.lead { font-size: 38px; line-height: 1.35; font-weight: 500; opacity: .88; }
.mt-a { margin-top: auto; } .mt1 { margin-top: 28px; } .mt2 { margin-top: 48px; } .mt3 { margin-top: 72px; }
.rodape { position: absolute; left: 84px; right: 84px; bottom: 64px; display: flex; align-items: center; justify-content: space-between; z-index: 2; font-size: 26px; font-weight: 600; }
.rodape img { height: 64px; }
.arraste { font-size: 26px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.lista { list-style: none; padding: 0; display: grid; gap: 30px; }
.lista li { display: flex; gap: 28px; align-items: flex-start; font-size: 40px; line-height: 1.25; font-weight: 600; }
.lista li small { display: block; font-size: 30px; font-weight: 500; opacity: .75; margin-top: 6px; }
.check { flex: none; width: 58px; height: 58px; border-radius: 50%; background: #7a1f2b; color: #fffdf9; display: grid; place-items: center; font-size: 30px; font-weight: 700; margin-top: -4px; }
.vinho .check, .escuro .check { background: #b08d57; color: #3b0d14; }
.num { font-size: 150px; font-weight: 700; line-height: 1; letter-spacing: -.04em; color: #b08d57; }
.bege .num { color: #7a1f2b; }
.card { background: #fffdf9; border-radius: 36px; padding: 44px 48px; box-shadow: 0 20px 50px rgba(43,29,26,.08); }
.q { font-size: 30px; font-weight: 700; color: #7a1f2b; letter-spacing: .14em; text-transform: uppercase; }
.produtos { position: absolute; display: flex; align-items: flex-end; gap: 0; }
.produtos img { filter: drop-shadow(0 24px 30px rgba(43,29,26,.28)); }
.passo { display: flex; gap: 34px; align-items: center; }
.passo b { flex: none; width: 120px; height: 120px; border-radius: 50%; background: #b08d57; color: #3b0d14; font-size: 60px; display: grid; place-items: center; }
.tag { position: absolute; top: 84px; right: 84px; z-index: 2; font-size: 24px; font-weight: 700; letter-spacing: .12em; opacity: .8; }
`;

const rodape = (claro = true, extra = "@mioexpressbrasil") => `<div class="rodape"><img src="${claro ? LOGO_W : LOGO}"><span>${extra}</span></div>`;
const tag = (i, n) => `<div class="tag">${i}/${n}</div>`;

/** Cada post: id, legenda (texto do Instagram) e slides (HTML de cada imagem). */
const POSTS = [
  {
    id: "01-sindico-custo-zero",
    slides: (n = 5) => [
      `<div class="s"><div class="foto" style="background-image:url(${FOTO("loja-frente")})"></div>
        <div class="z mt-a"><span class="pill">Para síndicos</span>
        <h1 class="mt1" style="color:#fffdf9">Um mini mercado 24h no seu condomínio.<br><em>Custo zero.</em></h1>
        <p class="lead mt1" style="color:#fffdf9">A Mio instala, abastece e cuida de tudo.</p>
        <p class="arraste mt2" style="color:#fffdf9;margin-bottom:90px">Arraste para ver como funciona →</p></div>${rodape()}</div>`,
      `<div class="s bege">${tag(2, n)}<p class="eyebrow">O que a Mio faz</p><h2 class="mt1">Você não precisa se preocupar com <em>nada</em>.</h2>
        <ul class="lista mt3">
          <li><span class="check">✓</span><div>Projeto e instalação<small>Customizado para o espaço, em ~20 dias</small></div></li>
          <li><span class="check">✓</span><div>Abastecimento e reposição<small>Pelo nosso time, de forma discreta</small></div></li>
          <li><span class="check">✓</span><div>Manutenção e limpeza<small>Da loja e dos equipamentos</small></div></li>
          <li><span class="check">✓</span><div>Segurança<small>Nossa câmera ou a do condomínio</small></div></li>
        </ul>${rodape(false)}</div>`,
      `<div class="s vinho">${tag(3, n)}<p class="eyebrow">O que o condomínio ganha</p><h2 class="mt1">Mais conforto para quem mora. <em>Zero custo</em> para o condomínio.</h2>
        <ul class="lista mt3">
          <li><span class="check">✓</span><div>Mercado aberto 24h, a poucos passos de casa</div></li>
          <li><span class="check">✓</span><div>Um diferencial que valoriza o empreendimento</div></li>
          <li><span class="check">✓</span><div>Sem custo de implantação nem de manutenção</div></li>
          <li><span class="check">✓</span><div>Possibilidade de cashback para o condomínio</div></li>
        </ul>${rodape()}</div>`,
      `<div class="s bege">${tag(4, n)}<p class="eyebrow">Quem já tem uma Mio</p>
        <div class="mt3"><div class="num">20</div><p class="lead">condomínios atendidos</p></div>
        <div class="mt2"><div class="num">+1.800</div><p class="lead">apartamentos</p></div>
        <div class="mt2"><div class="num">+5.000</div><p class="lead">moradores (estimativa)</p></div>
        <p class="lead mt2" style="font-weight:700;color:#7a1f2b">Empresa do Vale, com equipe própria.</p>${rodape(false)}</div>`,
      `<div class="s"><div class="foto topo" style="background-image:url(${R3D("armario")})"></div>${tag(5, n)}
        <div class="z"><h2 style="color:#fffdf9">Quer uma Mio no seu condomínio?</h2>
        <p class="lead mt1" style="color:#fffdf9">Atendemos condomínios a partir de 80 apartamentos em São José dos Campos e Jacareí.</p></div>
        <div class="z mt-a" style="margin-bottom:110px"><span class="pill" style="font-size:30px;padding:18px 32px;letter-spacing:.04em;text-transform:none">Fale com a gente: link na bio</span></div>${rodape()}</div>`,
    ],
    legenda: `Síndico, imagina oferecer aos moradores um mini mercado aberto 24h, dentro do condomínio, sem gastar nada? 🛒

A Mio Express instala, abastece, faz a manutenção e cuida da segurança. O condomínio só ganha: mais conforto, um diferencial que valoriza o empreendimento e, em alguns casos, cashback.

Já são 20 condomínios em São José dos Campos com uma Mio.

👉 Quer levar para o seu? Fale com a gente pelo link na bio ou no WhatsApp (12) 99739-7730.

#mercadoautonomo #minimercado #condominio #sindico #saojosedoscampos #jacarei #sjc #valedoparaiba #mioexpress`,
  },
  {
    id: "02-morador-23h",
    slides: () => [
      `<div class="s escuro">
        <p class="eyebrow">23h47</p>
        <h1 class="mt1">Acabou o leite?<br><em>Desce ali.</em></h1>
        <p class="lead mt2">Sua Mio fica aberta 24h, dentro do condomínio. Sem fila, sem trânsito, sem sair de chinelo na rua.</p>
        <div class="produtos" style="left:40px;right:40px;bottom:190px;justify-content:center">
          <img src="${PROD("arm_italac_leite")}" style="height:360px;margin-right:-20px">
          <img src="${PROD("cocazero_2l")}" style="height:470px;margin-right:-30px">
          <img src="${PROD("arm_pringles")}" style="height:330px;margin-right:-10px">
          <img src="${PROD("heineken_lata")}" style="height:230px;margin-right:-10px">
          <img src="${PROD("arm_kitkat")}" style="height:150px;margin-right:-20px">
          <img src="${PROD("guarana_2l")}" style="height:450px;margin-right:-20px">
          <img src="${PROD("arm_doritos")}" style="height:300px">
        </div>${rodape()}</div>`,
    ],
    legenda: `Aquela hora em que bate a vontade (ou a emergência) e o mercado mais perto já fechou… 🌙

Na Mio é só descer: aberto 24h, dentro do seu condomínio. Pegou, passou no totem, pagou com Pix ou cartão. Pronto.

Marca aqui quem sempre lembra que acabou alguma coisa às 23h 👇

#mioexpress #mercado24h #condominio #saojosedoscampos #jacarei #conveniencia`,
  },
  {
    id: "03-como-comprar",
    slides: (n = 4) => [
      `<div class="s vinho"><p class="eyebrow">Na Mio é assim</p>
        <h1 class="mt1">Pegou.<br>Passou.<br><em>Pagou.</em></h1>
        <p class="lead mt2">Comprar na Mio leva menos de 1 minuto. Arraste e veja →</p>
        <div class="produtos" style="right:20px;bottom:150px"><img src="${PROD("arm_doritos")}" style="height:420px;transform:rotate(-8deg)"><img src="${PROD("cocazero_lata")}" style="height:300px;margin-left:-40px;transform:rotate(6deg)"></div>${rodape()}</div>`,
      `<div class="s bege">${tag(2, n)}<div class="passo"><b>1</b><h2>Pegue o que precisar</h2></div>
        <p class="lead mt2">Bebidas geladas, snacks, congelados, sorvetes, limpeza e higiene. Tudo à mão, 24h por dia.</p>
        <div class="foto" style="top:auto;height:620px;background-image:url(${FOTO("loja-detalhe")});border-radius:36px;left:84px;right:84px;bottom:170px"></div>${rodape(false)}</div>`,
      `<div class="s bege">${tag(3, n)}<div class="passo"><b>2</b><h2>Passe no totem</h2></div>
        <p class="lead mt2">Aproxime o código de barras do leitor. O totem mostra cada item e o total na tela.</p>
        <div class="foto" style="top:auto;height:620px;background-image:url(${FOTO("loja-angulo")});border-radius:36px;left:84px;right:84px;bottom:170px"></div>${rodape(false)}</div>`,
      `<div class="s vinho">${tag(4, n)}<div class="passo"><b>3</b><h2>Pague como preferir</h2></div>
        <ul class="lista mt3"><li><span class="check">✓</span><div>Pix</div></li><li><span class="check">✓</span><div>Cartão de crédito ou débito</div></li><li><span class="check">✓</span><div>Aproximação ou chip</div></li></ul>
        <h2 class="mt3">Sem app.<br>Sem cadastro.<br><em>Sem fila.</em></h2>${rodape()}</div>`,
    ],
    legenda: `Pegou, passou, pagou. ✅ Comprar na Mio é simples assim:

1️⃣ Pegue o que precisar nas prateleiras e geladeiras
2️⃣ Passe os produtos no totem de autoatendimento
3️⃣ Pague com Pix ou cartão (aproximação ou chip)

Sem app, sem cadastro, sem fila. 24h por dia, dentro do seu condomínio.

Salva esse post para mostrar para quem ainda não conhece a Mio do prédio 😉

#mioexpress #mercadoautonomo #autoatendimento #condominio #saojosedoscampos`,
  },
  {
    id: "04-duvidas-sindico",
    slides: (n = 6) => {
      const qs = [
        ["Qual o custo para o condomínio?", "Zero. E alguns condomínios ainda podem ter retorno financeiro (cashback), conforme as condições de cada unidade."],
        ["E se alguém furtar?", "A responsabilidade é 100% da Mio. O condomínio só ajuda com a identificação dos moradores."],
        ["Tem câmera de segurança?", "Instalamos a nossa câmera ou usamos a do próprio condomínio. A escolha é do síndico."],
        ["Quanto tempo leva a instalação?", "Em média 20 dias corridos, porque cada projeto é feito sob medida para o espaço."],
        ["Qual o tamanho mínimo?", "Atendemos condomínios a partir de 80 apartamentos, para garantir variedade e reposição constante."],
      ];
      return [
        `<div class="s vinho"><p class="eyebrow">Síndico pergunta, a Mio responde</p>
          <h1 class="mt1">5 dúvidas sobre ter um mercado no condomínio</h1>
          <p class="arraste mt2">Arraste →</p>
          <div class="foto" style="top:auto;height:560px;background-image:url(${R3D("armario")});border-radius:36px;left:84px;right:84px;bottom:170px"></div>${rodape()}</div>`,
        ...qs.map(([q, a], i) => `<div class="s bege">${tag(i + 2, n)}<p class="q">Dúvida ${i + 1}</p><h2 class="mt1">${q}</h2>
          <div class="card mt2"><p class="lead" style="opacity:1">${a}</p></div>
          <div class="foto" style="top:auto;height:440px;background-image:url(${[FOTO("loja-frente"), FOTO("loja-detalhe"), FOTO("loja-angulo"), R3D("geladeiras"), FOTO("freezer-geladeira")][i]});border-radius:36px;left:84px;right:84px;bottom:170px"></div>${rodape(false)}</div>`),
      ];
    },
    legenda: `As 5 perguntas que mais ouvimos de síndicos (e as respostas diretas) 👇

💰 Custo: zero
🔒 Furto: responsabilidade 100% da Mio
📹 Câmera: a nossa ou a do condomínio
⏱️ Instalação: ~20 dias
🏢 Tamanho mínimo: 80 apartamentos

Ficou alguma dúvida? Manda nos comentários ou chama no WhatsApp pelo link na bio.

Envie para o síndico do seu prédio! 📲

#sindico #sindicoprofissional #condominio #mercadoautonomo #saojosedoscampos #jacarei #mioexpress`,
  },
  {
    id: "05-picole-los-los",
    slides: () => [
      `<div class="s" style="background:#7a1f2b;color:#fffdf9">
        <p class="eyebrow">Calor de verão no Vale</p>
        <h1 class="mt1">Picolé às 22h?<br><em>Tem.</em></h1>
        <p class="lead mt1">Los Los no freezer da sua Mio. Escolha o seu sabor.</p>
        <div class="produtos" style="left:30px;right:30px;bottom:170px;justify-content:center">
          ${["pistache", "choco_dubai", "ovomaltine", "doce_leite", "speculoos"].map((s, i) => `<img src="${PROD("picole_" + s)}" style="height:520px;margin:0 -40px;transform:rotate(${[-12, -5, 0, 5, 12][i]}deg) translateY(${[30, 8, 0, 8, 30][i]}px)">`).join("")}
        </div>${rodape()}</div>`,
    ],
    legenda: `Pistache, choco dubai, ovomaltine, doce de leite, speculoos… 🍦

Os picolés Los Los estão no freezer da sua Mio, 24h por dia. Qual é o seu favorito? Vota aqui embaixo 👇

#loslos #picole #sorvete #mioexpress #condominio #saojosedoscampos #verao`,
  },
  {
    id: "06-do-vale-para-o-vale",
    slides: () => [
      `<div class="s"><div class="foto escura" style="background-image:url(${FOTO("geladeiras")})"></div>
        <div class="z mt-a" style="margin-bottom:110px"><span class="pill">Do Vale, para o Vale</span>
        <h2 class="mt1" style="color:#fffdf9">Somos uma empresa de São José dos Campos. <em>Sem franquia, com equipe própria.</em></h2>
        <p class="lead mt1" style="color:#fffdf9">Quem instala, abastece e atende o síndico é a própria Mio. Suporte rápido, de quem está aqui do lado.</p></div>${rodape()}</div>`,
    ],
    legenda: `A Mio Express nasceu em São José dos Campos. 💛

Não somos franquia: quem projeta, instala, abastece e atende cada condomínio é o nosso próprio time. Isso quer dizer reposição rápida, conversa direta com o síndico e um mix pensado para os moradores daqui.

Hoje já são 20 condomínios em SJC e chegamos em Jacareí. Bora pro próximo? 🚀

#saojosedoscampos #jacarei #valedoparaiba #empresalocal #mercadoautonomo #condominio #mioexpress`,
  },
];

const only = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const post of POSTS.filter((p) => !only || p.id.startsWith(only))) {
  const dir = join(OUT, post.id);
  mkdirSync(dir, { recursive: true });
  const slides = post.slides();
  for (let i = 0; i < slides.length; i++) {
    const html = join(dir, ".slide.html");
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>${slides[i]}</body>`);
    await page.goto("file://" + html);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(dir, `${String(i + 1).padStart(2, "0")}.png`) });
  }
  writeFileSync(join(dir, "legenda.txt"), post.legenda + "\n");
  console.log(post.id, slides.length, "slides");
}
await browser.close();
