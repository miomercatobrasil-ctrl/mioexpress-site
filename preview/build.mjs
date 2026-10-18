// Gera uma prévia do site em UM arquivo HTML (JS, CSS, imagens e logo embutidos).
// Uso: node preview/build.mjs  ->  preview/dist/mio-express-preview.html
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const shims = { "next/image": "image.tsx", "next/link": "link.tsx", "next/dynamic": "dynamic.tsx", "next/script": "script.tsx" };

const result = await build({
  entryPoints: [resolve(root, "preview/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  jsx: "automatic",
  target: "es2020",
  tsconfig: resolve(root, "tsconfig.json"),
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_META_PIXEL_ID": '""',
    "process.env.NEXT_PUBLIC_SCENE_GLB": '""',
  },
  loader: { ".css": "empty" },
  logLevel: "warning",
  plugins: [
    {
      name: "next-shims",
      setup(b) {
        b.onResolve({ filter: /^next\/(image|link|dynamic|script)$/ }, (a) => ({ path: resolve(root, "preview/shims", shims[a.path]) }));
      },
    },
  ],
});

let js = result.outputFiles[0].text;
let css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

// caminhos absolutos de arquivos públicos -> data URIs
const mime = { svg: "image/svg+xml", webp: "image/webp", jpg: "image/jpeg", png: "image/png" };
const assets = [
  ...["logo.svg", "logo-white.svg"].map((f) => `/brand/${f}`),
  ...readdirSync(resolve(root, "public/images")).map((f) => `/images/${f}`),
];
for (const p of assets) {
  const ext = p.split(".").pop();
  const data = `data:${mime[ext]};base64,${readFileSync(resolve(root, "public" + p)).toString("base64")}`;
  js = js.split(`"${p}"`).join(`"${data}"`);
}
// links internos
js = js.split('"/privacidade"').join('"#privacidade"').split('"/#').join('"#').split('href:"/"').join('href:"#inicio"');

css = `:root{--font:"Montserrat"}\n` + css;
const html = `<title>Mio Express</title>
<meta name="description" content="Prévia do novo site da Mio Express">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<style>
${css}
:root{color-scheme:light}
</style>
<div id="mio-root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`;
mkdirSync(resolve(root, "preview/dist"), { recursive: true });
const out = resolve(root, "preview/dist/mio-express-preview.html");
writeFileSync(out, html);
console.log(out, (html.length / 1024 / 1024).toFixed(2) + " MB");
