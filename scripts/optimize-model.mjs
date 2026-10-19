// Comprime o .glb gerado pelo Blender e converte os lightmaps para WebP.
// Uso: node scripts/optimize-model.mjs [assets/source/export/build]
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BUILD = process.argv[2] || "assets/source/export/build";
const OUT = "public/models";
mkdirSync(join(OUT, "lightmaps"), { recursive: true });

execFileSync(
  "npx",
  [
    "-y", "@gltf-transform/cli@4", "optimize",
    join(BUILD, "mio-terracos.glb"), join(OUT, "mio-terracos.glb"),
    "--compress", "meshopt",
    "--texture-compress", "webp",
    "--texture-size", "1024",
    "--flatten", "false",      // mantém os objetos nomeados (hover/clique no site)
    "--join-named", "false",
    "--instance", "false",
    "--simplify", "false",     // a simplificação já foi feita no Blender
    "--prune-attributes", "false", // mantém o UV2 (TEXCOORD_1) usado pelos lightmaps
  ],
  { stdio: "inherit" },
);

if (existsSync(join(BUILD, "plants.json"))) copyFileSync(join(BUILD, "plants.json"), join(OUT, "plants.json"));
let total = statSync(join(OUT, "mio-terracos.glb")).size;
for (const f of readdirSync(join(BUILD, "lightmaps")).filter((f) => f.endsWith(".png"))) {
  const out = join(OUT, "lightmaps", f.replace(/\.png$/, ".webp"));
  // desfoque leve tira o granulado do bake (poucas amostras); a margem de 4 px evita vazamento
  await sharp(join(BUILD, "lightmaps", f)).blur(2).webp({ quality: 82 }).toFile(out);
  total += statSync(out).size;
}
console.log(`total da cena: ${(total / 1e6).toFixed(1)} MB`);
