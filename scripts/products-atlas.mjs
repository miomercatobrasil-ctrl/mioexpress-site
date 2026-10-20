// Monta os atlas de produtos (rótulos recortados) para o 3D.
// Entrada: assets/source/produtos/crop_<nome>.png. Os nomes "arm_*" vão para o atlas do armário
// (produtos-armario.*), o resto para o das geladeiras (produtos.*). Saída em public/textures/.
import { readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "assets/source/produtos";
const CW = 256, CH = 512, COLS = 8;
const all = readdirSync(SRC).filter((f) => f.startsWith("crop_")).map((f) => f.slice(5, -4)).sort();

async function build(out, names) {
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
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 0 } } })
    .composite(comp)
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(`public/textures/${out}.webp`);
  writeFileSync(`public/textures/${out}.json`, JSON.stringify(tiles));
  console.log(out, names.length, "produtos", W + "x" + H);
}

await build("produtos", all.filter((n) => !n.startsWith("arm_")));
await build("produtos-armario", all.filter((n) => n.startsWith("arm_")));
