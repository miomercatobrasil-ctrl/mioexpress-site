// Monta o atlas de produtos (rótulos recortados das fotos da loja) para as geladeiras do 3D.
// Entrada: assets/source/produtos/crop_<nome>.png  →  public/textures/produtos.webp + produtos.json
import { readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "assets/source/produtos";
const CW = 256, CH = 512, COLS = 8;
const names = readdirSync(SRC).filter((f) => f.startsWith("crop_")).map((f) => f.slice(5, -4)).sort();
const rows = Math.ceil(names.length / COLS);
const W = CW * COLS, H = CH * rows;
const tiles = {};
const comp = [];
for (const [i, n] of names.entries()) {
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  comp.push({ input: await sharp(`${SRC}/crop_${n}.png`).ensureAlpha().resize(CW, CH, { fit: "fill" }).toBuffer(), left: x, top: y });
  // UV com origem embaixo (textura com flipY): [u0, v0, largura, altura]
  tiles[n] = [x / W, 1 - (y + CH) / H, CW / W, CH / H].map((v) => +v.toFixed(5));
}
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 0 } } }).composite(comp).webp({ quality: 84, alphaQuality: 90 }).toFile("public/textures/produtos.webp");
writeFileSync("public/textures/produtos.json", JSON.stringify(tiles));
console.log(names.length, "produtos", W + "x" + H);
