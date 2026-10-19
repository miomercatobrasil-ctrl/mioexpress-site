# assets/source

Arquivos-fonte (não são servidos pelo site). Pesados (.skp, .blend, exportações) ficam fora do git.

| Pasta | Conteúdo | Status |
|---|---|---|
| `logo/` | Logo vermelha (PDF original do Illustrator), SVG extraído e variante `currentColor` | ok |
| `planta/` | PDF "Mio Express – Terraços" REV00 (planta, móvel, divisórias, renders) | ok |
| `fotos/` | Fotos reais das lojas | ok (5 fotos) |
| `renders/` | Renders de referência (jardim/entrada, armário frontal, geladeiras, freezer) | **pendente**: vieram só como imagem no chat; salvar os arquivos aqui |
| `sketchup/` | `Terracos.skp` (SketchUp 2022, 32 MB; baixar da Release `fontes-3d` do GitHub) + exportação DAE/FBX | `.skp` ok, **exportação .dae pendente** |
| `blender/` | `mio_raw.blend` e versão final | a criar (ver docs/PIPELINE-3D.md) |
| `vegetacao/` | `folhagem.png` com alpha para os "cards" de vegetação | a criar |

Versões web das fotos: `npm run images` (gera `public/images/*.webp` e `public/og.jpg`).

## Texturas extraídas do .skp

O `.skp` do SketchUp 2022 é um ZIP com `model.dat` (geometria, formato fechado: só abre com o SketchUp/SDK) e a pasta
`materials/` (texturas). As texturas usadas no site foram extraídas e otimizadas para `public/textures/`
(MDF Antuérpia, piso, rótulos de produtos, latas, painel "Como funciona", ecobag, freezer).
A geometria precisa ser exportada pelo SketchUp: **Arquivo → Exportar → Modelo 3D → COLLADA (.dae)**.
