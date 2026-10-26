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
const LOGO_W = f("public/brand/logo-white.svg");

const CSS = `
@font-face { font-family: M; src: url("${f("marketing/gerador/montserrat.ttf")}"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1080px; height: 1920px; font-family: M, sans-serif; color: #fffdf9; overflow: hidden; background: #3b0d14; }
.bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.bg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(59,13,20,.85) 0%, rgba(59,13,20,0) 28%, rgba(59,13,20,0) 55%, rgba(59,13,20,.92) 78%); }
.top { position: absolute; left: 90px; right: 90px; top: 250px; text-align: center; z-index: 2; }
.eyebrow { font-size: 34px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: #e2c48f; }
h1 { font-size: 112px; line-height: 1; font-weight: 800; letter-spacing: -.03em; margin-top: 18px; }
.cupom { position: absolute; left: 110px; right: 110px; bottom: 330px; z-index: 2; text-align: center; border: 3px dashed #e2c48f; border-radius: 36px; padding: 36px 40px; background: rgba(59,13,20,.55); }
.cupom .l { font-size: 30px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #e2c48f; }
.cupom .c { font-size: 104px; font-weight: 800; letter-spacing: .04em; margin-top: 8px; }
.cupom .d { font-size: 38px; font-weight: 600; margin-top: 6px; }
.logo { position: absolute; left: 0; right: 0; bottom: 200px; display: flex; justify-content: center; z-index: 2; }
.logo img { height: 70px; }
`;

const STORIES = [
  { id: "halloween-sexta", foto: "carrinho-fantasma", eyebrow: "Halloween na Mio", titulo: "Começou!", dias: "10% off em doces · hoje e amanhã" },
  { id: "halloween-sabado", foto: "lata-abobora", eyebrow: "Halloween na Mio", titulo: "Último dia!", dias: "10% off em doces · só hoje" },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of STORIES) {
  const html = join(OUT, ".s.html");
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>
    <div class="bg" style="background-image:url(${HW(s.foto)})"></div>
    <div class="top"><p class="eyebrow">${s.eyebrow}</p><h1>${s.titulo}</h1></div>
    <div class="cupom"><p class="l">Cupom no totem</p><p class="c">MIOWEEN10</p><p class="d">${s.dias}</p></div>
    <div class="logo"><img src="${LOGO_W}"></div></body>`);
  await page.goto("file://" + html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, `${s.id}.png`) });
  console.log(s.id);
}
await browser.close();
