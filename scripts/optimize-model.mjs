// Comprime o .glb gerado pelo Blender e converte os lightmaps para WebP.
// Uso: node scripts/optimize-model.mjs [assets/source/export/build]
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BUILD = process.argv[2] || "assets/source/export/build";
const OUT = "public/models";
mkdirSync(join(OUT, "lightmaps"), { recursive: true });

// texturas: JPEG (opacas) / PNG (transparentes), no máximo 1024 px
// com luz assada (mio_bake2.py -> lightmaps.json) usa a geometria limpa com UV2; senão a geometria intacta
const BAKED = existsSync(join(BUILD, "lightmaps.json")) && process.env.SRC !== "nobake";
const SRC = BAKED ? "mio-terracos-baked.glb" : "mio-terracos-nobake.glb";
execFileSync("node", ["scripts/textures-jpg.mjs", join(BUILD, SRC), join(BUILD, "mio-terracos-1k.glb")], { stdio: "inherit" });

execFileSync(
  "npx",
  [
    "-y", "@gltf-transform/cli@4", "optimize",
    join(BUILD, "mio-terracos-1k.glb"), join(OUT, "mio-terracos.glb"),
    "--compress", "meshopt",
    // texturas ficam em JPG/PNG: o WebP no .glb depende de um teste de suporte que o visualizador
    // de artifacts bloqueia (as imagens sumiam); o redimensionamento é feito antes, abaixo
    "--texture-compress", "false",
    "--flatten", "false",      // mantém os objetos nomeados (hover/clique no site)
    "--join-named", "false",
    "--instance", "false",
    "--palette", "false",      // mantém os materiais com nome (o site ajusta cores por material)
    "--simplify", BAKED ? "false" : "true", // com lightmap não simplifica (preserva o UV2)
    "--simplify-error", "0.0001",
    "--prune-attributes", "false", // mantém o UV2 (TEXCOORD_1) usado pelos lightmaps
  ],
  { stdio: "inherit" },
);

if (existsSync(join(BUILD, "plants.json"))) copyFileSync(join(BUILD, "plants.json"), join(OUT, "plants.json"));
let total = statSync(join(OUT, "mio-terracos.glb")).size;
rmSync(join(OUT, "lightmaps"), { recursive: true, force: true });
mkdirSync(join(OUT, "lightmaps"), { recursive: true });
rmSync(join(OUT, "lightmaps.json"), { force: true });
if (BAKED) copyFileSync(join(BUILD, "lightmaps.json"), join(OUT, "lightmaps.json"));
for (const f of BAKED ? readdirSync(join(BUILD, "lightmaps")).filter((f) => f.includes("__") && f.endsWith(".png")) : []) {
  const out = join(OUT, "lightmaps", f.replace(/\.png$/, ".webp"));
  // mediana 3 tira o ruído do bake sem misturar ilhas com o fundo (o desfoque escurecia bordas)
  await sharp(join(BUILD, "lightmaps", f)).median(3).webp({ quality: 85 }).toFile(out);
  total += statSync(out).size;
}
console.log(`total da cena: ${(total / 1e6).toFixed(1)} MB`);
