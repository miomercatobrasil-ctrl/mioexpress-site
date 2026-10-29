// Comprime a loja projetada (scripts/blender/sala_bake.py) para o site: .glb com meshopt e lightmaps em WebP.
// Uso: node scripts/optimize-sala.mjs <pasta build> <saída em public/models/p/<código>>
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const [BUILD, OUT] = process.argv.slice(2);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "lightmaps", "m"), { recursive: true });

// muitas texturas pequenas (embalagens): 512 px bastam e o celular agradece
execFileSync("node", ["scripts/textures-jpg.mjs", join(BUILD, "sala.glb"), join(BUILD, "sala-1k.glb")], { stdio: "inherit", env: { ...process.env, TEX_MAX: "512" } });
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
copyFileSync(join(BUILD, "lightmaps.json"), join(OUT, "lightmaps.json"));
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
