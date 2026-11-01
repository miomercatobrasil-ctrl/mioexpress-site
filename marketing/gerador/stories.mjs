// Stories da Mio (1080×1920). Uso: node marketing/gerador/stories.mjs → PNGs em marketing/stories/<id>.png
import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "marketing", "stories");
const f = (p) => "file://" + join(ROOT, p);
const HW = (n) => f(`assets/source/halloween/${n}.webp`);
const FOTO = (n) => (n.startsWith("life:") ? f(`assets/source/lifestyle/${n.slice(5)}.png`) : f(`assets/source/fotos/${n}.jpg`));
const BF_PCT = process.env.BF_PCT || "10";
const BF_CUPOM = process.env.BF_CUPOM || "MIOBLACK10";
const LOGO_W = f("public/brand/logo-white.svg");

const CSS = `
@font-face { font-family: M; src: url("${f("marketing/gerador/montserrat.ttf")}"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1080px; height: 1920px; font-family: M, sans-serif; color: #fffdf9; overflow: hidden; background: #3b0d14; }
.bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.bg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(59,13,20,.85) 0%, rgba(59,13,20,0) 28%, rgba(59,13,20,0) 55%, rgba(59,13,20,.92) 78%); }
.top { position: absolute; left: 90px; right: 90px; top: 250px; text-align: center; z-index: 2; }
.eyebrow { font-size: 34px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #e2c48f; }
h1 { font-size: 104px; line-height: 1; font-weight: 800; letter-spacing: -.03em; margin-top: 18px; }
.cupom { position: absolute; left: 110px; right: 110px; bottom: 330px; z-index: 2; text-align: center; border: 3px dashed #e2c48f; border-radius: 36px; padding: 36px 40px; background: rgba(59,13,20,.55); }
.cupom .l { font-size: 30px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #e2c48f; }
.cupom .c { font-size: 104px; font-weight: 800; letter-spacing: .04em; margin-top: 8px; }
.cupom .d { font-size: 38px; font-weight: 600; margin-top: 6px; }
.logo { position: absolute; left: 0; right: 0; bottom: 200px; display: flex; justify-content: center; z-index: 2; }
.logo img { height: 70px; }
/* fotos reais: topo bordô quase sólido sob o título (igual ao feed) e base escura sob o texto */
.bg.real::after { background: linear-gradient(180deg, rgba(59,13,20,.97) 0%, rgba(59,13,20,.92) 24%, rgba(59,13,20,.3) 40%, rgba(59,13,20,0) 52%, rgba(59,13,20,.2) 62%, rgba(59,13,20,.9) 76%, #3b0d14 88%); }
.cupom small { display: block; font-size: 24px; font-weight: 500; opacity: .7; margin-top: 18px; }
`;

const STORIES = [
  { id: "halloween-post-novo", foto: "mumia", eyebrow: "Post novo no feed", titulo: "Os produtos se fantasiaram.", cupom: false,
    rodape: "Vem ver no nosso perfil 👻<br><span style='color:#e2c48f'>E sexta e sábado tem cupom de 10% em doces.</span>" },
  { id: "halloween-sexta", foto: "carrinho-fantasma", eyebrow: "Halloween na Mio", titulo: "Começou!", dias: "10% off em doces · hoje e amanhã" },
  { id: "halloween-sabado", foto: "lata-abobora", eyebrow: "Halloween na Mio", titulo: "Último dia!", dias: "10% off em doces · só hoje" },
  // novembro (fotos reais): chamada para o post do dia e lembretes do 24h
  { id: "nov-05-jogo", real: "life:jogo-heineken", pos: "50% 50%", eyebrow: "Hoje tem jogo?", titulo: "A geladeira<br>tá logo ali.", rodape: "Cerveja gelada, refri e snacks 24h,<br>dentro do condomínio. ⚽<br><small>Beba com moderação. Proibido para menores de 18 anos.</small>" },
  { id: "nov-10-franquia", real: "loja3-frente-b", pos: "50% 60%", eyebrow: "Post novo no feed", titulo: "A Mio não<br>é franquia.", rodape: "E por isso o preço é mais justo.<br>Vem ver no nosso perfil 👀" },
  { id: "nov-12-picole", real: "loslos-picoles", pos: "50% 50%", eyebrow: "Calor?", titulo: "Picolé Los Los<br>a poucos passos.", rodape: "Pistache, choco dubai, ovomaltine…<br>Qual é o seu? 🍦" },
  { id: "nov-15-feriado", real: "loja4-ambiente", pos: "50% 50%", eyebrow: "Feriado", titulo: "A Mio<br>não fecha.", rodape: "Esqueceu algo? Desce ali.<br>Aberto 24h, todos os dias." },
  { id: "nov-17-sindico", real: "loja3-totem", pos: "50% 40%", eyebrow: "Síndico, post novo", titulo: "5 dúvidas<br>respondidas.", rodape: "Custo, furto, câmera, instalação…<br>Tá tudo no nosso perfil. 📲" },
  { id: "nov-19-leite", real: "life:leite-italac", pos: "50% 50%", eyebrow: "23h47", titulo: "Acabou o leite?<br>Desce ali.", rodape: "Sem fila, sem trânsito,<br>sem sair de chinelo. 🌙" },
  { id: "nov-24-custo-zero", real: "loja4-frente", pos: "50% 45%", eyebrow: "Para síndicos", titulo: "Mercado 24h.<br>Custo zero.", rodape: "A Mio instala, abastece<br>e cuida de tudo.<br>Fale com a gente: link na bio." },
  { id: "nov-27-black-friday", bf: true },
  { id: "nov-30-sindico", real: "loja4-frente", pos: "50% 62%", eyebrow: "30 de novembro", titulo: "Feliz Dia<br>do Síndico!", rodape: "Obrigado a quem cuida<br>de onde a gente mora. 💛" },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of STORIES.filter((x) => !process.argv[2] || x.id.startsWith(process.argv[2]))) {
  const html = join(OUT, ".s.html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>
    <div class="bg${s.real ? " real" : ""}" style="background-image:url(${s.real ? FOTO(s.real) : HW(s.foto)});${s.pos ? `background-position:${s.pos}` : ""}"></div>
    <div class="top"><p class="eyebrow">${s.eyebrow}</p><h1>${s.titulo}</h1></div>
    ${s.real
      ? `<div class="cupom" style="border:0;background:none;bottom:300px"><p class="d" style="font-size:44px;line-height:1.35">${s.rodape}</p></div>`
      : s.cupom === false
      ? `<div class="cupom" style="border-style:solid;border-color:rgba(226,196,143,.5)"><p class="d" style="font-size:40px;line-height:1.35">${s.rodape}</p></div>`
      : `<div class="cupom"><p class="l">Cupom no totem</p><p class="c">MIOWEEN10</p><p class="d">${s.dias}</p></div>`}
    <div class="logo"><img src="${LOGO_W}"></div></body>`);
  if (s.bf) writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body style="background:#120709">
    <div class="bg" style="background-image:url(${FOTO("loja3-letreiro")});background-position:50% 40%;opacity:.5"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 95% 70% at 50% 50%, rgba(122,31,43,.5) 0%, rgba(59,13,20,.93) 57%, #120608 100%)"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:260px;z-index:2">
      <p class="eyebrow" style="letter-spacing:.32em">É hoje!</p>
      <p style="font-size:150px;font-weight:800;line-height:1;margin-top:24px;letter-spacing:-.02em">BLACK<br>FRIDAY</p>
      <div style="display:flex;align-items:flex-start;margin-top:50px"><span style="font-size:340px;font-weight:800;line-height:1.02;padding-bottom:.04em;letter-spacing:-.06em;background:linear-gradient(180deg,#f3dcaa 0%,#b08d57 60%,#8a6a3a 100%);-webkit-background-clip:text;color:transparent">${BF_PCT}</span><span style="font-size:140px;font-weight:800;color:#e2c48f;margin-top:10px">%</span></div>
      <p style="font-size:66px;font-weight:700;letter-spacing:.06em">OFF EM TUDO</p>
      <p style="font-size:38px;font-weight:600;opacity:.85;margin-top:16px">Só hoje, até 23h59</p></div>
    <div class="cupom"><p class="l">Cupom no totem</p><p class="c" style="font-size:96px">${BF_CUPOM}</p></div>
    <div class="logo"><img src="${LOGO_W}"></div></body>`);
  await page.goto("file://" + html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, `${s.id}.png`) });
  console.log(s.id);
}
await browser.close();
