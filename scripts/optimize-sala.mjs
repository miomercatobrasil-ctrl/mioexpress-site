// Comprime a loja projetada (scripts/blender/sala_bake.py) para o site: .glb com meshopt e lightmaps em WebP.
// Uso: node scripts/optimize-sala.mjs <pasta build> <saída em public/models/p/<código>>
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const [BUILD, OUT] = process.argv.slice(2);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "lightmaps", "m"), { recursive: true });

// texturas que são foto do produto com fundo branco (ex.: saco de carvão): recorta só a embalagem, senão o branco
// em volta cobre parte da peça e ela parece transparente. Regras em <build>/../sala.json, "texture_crops":
// { "trecho do nome do material": [x0, y0, x1, y1] em frações da imagem }
const cfgPath = join(BUILD, "..", "sala.json");
const crops = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")).texture_crops || {} : {};
let src = join(BUILD, "sala.glb");
if (Object.keys(crops).length) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(src);
  const done = new Set();
  for (const m of doc.getRoot().listMaterials()) {
    const rule = Object.entries(crops).find(([k]) => m.getName().toLowerCase().includes(k.toLowerCase()));
    const tex = m.getBaseColorTexture();
    if (!rule || !tex || done.has(tex)) continue;
    done.add(tex);
    const img = sharp(Buffer.from(tex.getImage()));
    const { width, height } = await img.metadata();
    const [x0, y0, x1, y1] = rule[1];
    const out = await img
      .extract({ left: Math.round(x0 * width), top: Math.round(y0 * height), width: Math.round((x1 - x0) * width), height: Math.round((y1 - y0) * height) })
      .resize(width, height, { fit: "fill" })
      .png()
      .toBuffer();
    tex.setImage(new Uint8Array(out)).setMimeType("image/png");
  }
  src = join(BUILD, "sala-crop.glb");
  await io.write(src, doc);
  console.log(`texturas recortadas: ${done.size}`);
}

// muitas texturas pequenas (embalagens): 512 px bastam e o celular agradece
execFileSync("node", ["scripts/textures-jpg.mjs", src, join(BUILD, "sala-1k.glb")], { stdio: "inherit", env: { ...process.env, TEX_MAX: "512" } });
execFileSync(
  "npx",
  [
    "-y", "@gltf-transform/cli@4", "optimize",
    join(BUILD, "sala-1k.glb"), join(OUT, "sala.glb"),
    "--compress", "meshopt",
    "--texture-compress", "false",
    "--flatten", "false", // mantém os objetos nomeados (cada um tem o seu lightmap)
    "--join-named", "false",
    "--instance", "false",
    "--palette", "false",
    "--simplify", "false", // preserva o UV2 do lightmap
    "--prune-attributes", "false",
  ],
  { stdio: "inherit" },
);

let total = statSync(join(OUT, "sala.glb")).size;
// versão no manifesto: o visualizador pede os arquivos com ?v=, e o navegador nunca usa luz de uma versão antiga
const manifest = JSON.parse(readFileSync(join(BUILD, "lightmaps.json"), "utf8"));
manifest.version = Date.now().toString(36);
writeFileSync(join(OUT, "lightmaps.json"), JSON.stringify(manifest));
for (const f of readdirSync(join(BUILD, "lightmaps")).filter((f) => f.endsWith(".png"))) {
  const src = join(BUILD, "lightmaps", f);
  const out = join(OUT, "lightmaps", f.replace(/\.png$/, ".webp"));
  // mediana 3 tira o ruído do bake sem misturar ilhas com o fundo
  await sharp(src).median(3).webp({ quality: 85 }).toFile(out);
  const meta = await sharp(src).metadata();
  await sharp(src).median(3).resize(Math.max(256, meta.width >> 1)).webp({ quality: 82 }).toFile(join(OUT, "lightmaps", "m", f.replace(/\.png$/, ".webp")));
  total += statSync(out).size;
}
console.log(`total: ${(total / 1e6).toFixed(1)} MB`);
