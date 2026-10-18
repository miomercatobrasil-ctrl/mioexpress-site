# Pipeline 3D: SketchUp → Blender → .glb no site

Fonte: projeto **"Mio Express – Terraços"** (Daniele Faustino Arquitetura & Interiores, SketchUp Pro 2022, REV00 de 27/10/2025).
Meta: cena inteira com **até ~8 MB** (`public/models/mio-terracos.glb`), luz "assada" e o mínimo de luz dinâmica no navegador.

Enquanto o `.glb` não fica pronto, o site usa a **cena de placeholders** (`src/scene/Placeholders.tsx`), que segue as
medidas e posições da planta. Para trocar, basta definir `NEXT_PUBLIC_SCENE_GLB=/models/mio-terracos.glb`.

## Sistema de coordenadas (site)

Metros. Origem = canto interno entre a parede do armário e a parede das geladeiras.
`+X` → jardim/entrada · `+Z` → divisória 1 · `+Y` → cima. O glTF já usa Y para cima; no Blender (Z para cima),
o exportador converte (`export_yup=True`). Ou seja, **no Blender**: origem no mesmo canto, `+X` para o jardim,
`-Y` para a divisória 1 (o eixo Z do site vira -Y do Blender).

| Objeto | Posição na planta (site, m) | Medidas (PDF) |
|---|---|---|
| `armario_mio` | x 0 → 0,33 · z 1,45 → 4,54 (+ painel do totem z 1,15 → 1,45) | 309 × 230 cm, prof. 33, base metalon 10, vãos 42/28/26/26/25/33 |
| `totem_pagamento` | prateleira a 90 cm no painel lateral (z ≈ 1,30) | prat. 26 cm, ganho p/ sacolas abaixo |
| `geladeira_mio_1` | x 1,26 → 1,93 · z 0 → 0,64 (encostada na parede) | ~67 × 60 × 190 |
| `geladeira_coca` | x 1,97 → 2,63 · z 0 → 0,72 | ~66 × 68 × 195 |
| `divisoria_ripada_2` | x 2,92 → 3,02 · z 0 → 0,70 | 70 × 250 (30 base + 220 ripas), placa 70 × 40 a 1,35 m |
| `freezer_loslos` | x 3,61 → 4,11 · z 2,04 → 2,83 | ~79 × 52 × 92 |
| `geladeira_mio_2` / `_3` | x 3,55 → 4,15 · z 2,93 → 3,68 / 3,70 → 4,36 | ~72 / 66 × 60 × 190 |
| `divisoria_ripada_1` | x 4,33 → 4,43 · z 1,97 → 4,37 | 240 × 250, ripas 10 × 3 cm, espaçamento 5 cm |
| `banco`, `jardim`, `piso`, `paredes` | ver `src/scene/Placeholders.tsx` | |

> A planta tem 3 geladeiras vinho (1 ao lado da Coca e 2 junto ao freezer). Por isso há `geladeira_mio_3`
> além dos nomes da lista original. Os três abrem o mesmo card "Geladeiras Mio".

## 1. Exportar do SketchUp

1. No SketchUp, **nomeie os grupos/componentes** de cada equipamento com os nomes da tabela (economiza o passo 3).
2. Apague cenas/estilos não usados e oculte nada que deva sair (o script apaga o que estiver oculto).
3. Exporte em **glTF** (extensão "Khronos glTF Export" ou "SimLab glTF Exporter") ou, se não houver, **.dae (Collada)**
   ou **.fbx** (Pro). Unidade: metros. Salve em `assets/source/sketchup/`.

## 2. Abrir no Blender (4.x)

`File → Import → glTF 2.0 / Collada / FBX`. Confira a escala (o armário precisa medir 3,39 m de largura com o painel)
e salve como `assets/source/blender/mio_raw.blend` (fica fora do git).

## 3–4. Limpar, nomear, vegetação leve, UV e bake

O script `scripts/blender/mio_prepare.py` faz as etapas em ordem. **Revise a tabela `MAP`** no topo do script
(regex dos nomes vindos do SketchUp → nome final) antes de rodar:

```bash
blender assets/source/blender/mio_raw.blend --python scripts/blender/mio_prepare.py -- --step clean
blender ... -- --step name     # junta por equipamento, nomeia, decimate
blender ... -- --step veg      # troca plantas por "cards" cruzados com alpha (vegetacao/folhagem.png)
blender ... -- --step uv       # UV2 "lightmap"
blender ... -- --step bake     # Cycles: luz + AO assados -> materiais "unlit"
blender ... -- --step export   # assets/source/export/mio-terracos-raw.glb
```

Dicas para o bake ficar como os renders:

- **Sol** quente (≈ 4500 K) entrando pelo jardim (+X) e um **céu** HDRI suave.
- **Fitas LED** sob cada prateleira: planos finos com Emission 2700–3000 K, força alta; repetir no topo dos módulos.
- **Spots** e o **anel de LED** no teto como luzes de área/emissão.
- Para objetos pequenos e iguais (latas, pacotes), prefira poucos blocos com textura em vez de geometria detalhada.
- Vidro das geladeiras: material separado, **não** assar (fica transparente no site); o interior iluminado é assado.

## 5. Comprimir (Meshopt + KTX2)

Requer o `toktx` do [KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases) instalado no PATH.

```bash
npm run glb:optimize   # assets/source/export/mio-terracos-raw.glb -> public/models/mio-terracos.glb
npm run glb:inspect    # confira tamanho, nº de draw calls, texturas e se os materiais saíram como KHR_materials_unlit
```

Orçamento sugerido: geometria ≤ 1,5 MB (meshopt), texturas KTX2 ≤ 6 MB
(armário/piso/paredes 2048², demais 1024²), **≤ 60 draw calls**.
Os decodificadores Draco/Basis já ficam em `public/libs/` (servidos pelo próprio site).

## 6. Ligar no site

```bash
# .env.local (e nas variáveis do projeto na Vercel)
NEXT_PUBLIC_SCENE_GLB=/models/mio-terracos.glb
```

`src/scene/GlbScene.tsx` carrega o arquivo e procura os objetos pelo nome para o hover (contorno vinho) e o clique
(abre o card). Hotspots, enquadramentos e limites de câmera continuam em `src/scene/layout.ts`.

## Ajustar câmera e hotspots

- `?debug` na URL: ao soltar o mouse no modo exploração, o console mostra `{ position, target }` da câmera.
  Copie para `HOTSPOTS[].view` ou `OVERVIEW` em `src/scene/layout.ts`.
- `?view=px,py,pz,tx,ty,tz` testa uma visão geral sem recompilar.
- Limites: `clampCamera()` e `ORBIT` em `layout.ts` (não atravessar paredes, não ir abaixo do piso).
