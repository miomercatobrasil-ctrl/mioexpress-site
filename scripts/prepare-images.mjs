// Gera versões web (WebP) das fotos em assets/source/fotos -> public/images
// e a imagem Open Graph (1200x630). Uso: node scripts/prepare-images.mjs
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";

const SRC = "assets/source/fotos";
const OUT = "public/images";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC)) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue;
  const { name } = parse(file);
  await sharp(join(SRC, file)).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(OUT, `${name}.webp`));
  console.log("ok", name);
}

await sharp(join(SRC, "loja-angulo.jpg"))
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("public/og.jpg");
console.log("ok og.jpg");
