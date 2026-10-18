# Mio Express — site

Mini mercado autônomo 24h em condomínios de São José dos Campos – SP.
Site com **ambiente 3D interativo** (react-three-fiber) para gerar leads de síndicos e apresentar a Mio aos moradores.

- **Stack:** Next.js 16 (App Router) · React 19 · three.js 0.186 + @react-three/fiber 9 + drei 10 · CSS puro (sem framework)
- **Hospedagem:** Vercel · domínio na GoDaddy (ver [docs/DNS-GODADDY.md](docs/DNS-GODADDY.md))
- **3D:** cena provisória em blocos nas medidas da planta; pipeline do `.glb` em [docs/PIPELINE-3D.md](docs/PIPELINE-3D.md)

> Base da Onlu: não havia repositório local disponível, então o setup de WebGL foi montado do zero com a mesma linha
> (R3F + drei, cena carregada sob demanda). Se quiser alinhar com a base da Onlu, indique o caminho do repositório.

## Rodar

```bash
npm install
cp .env.example .env.local   # opcional: ID do Pixel e caminho do .glb
npm run dev                  # http://localhost:3000
npm run build && npm start   # produção local
npm run lint                 # checagem de tipos
```

## Estrutura

```
src/
  app/                 layout (SEO, JSON-LD LocalBusiness, fonte), página, /privacidade, robots, sitemap
  components/          seções do site, formulário (abre o WhatsApp), Pixel da Meta, animações (Reveal/Fx)
  scene/
    layout.ts          medidas, posições, cores, hotspots, enquadramentos e limites de câmera  ← editar aqui
    Placeholders.tsx   cena provisória (blocos com os nomes finais dos objetos)
    GlbScene.tsx       cena final (.glb com Draco/Meshopt/KTX2)
    CameraRig.tsx      abertura por rolagem, orbit limitado, transições, tour, rotação ociosa
    Experience.tsx     Canvas, luzes, sombras de contato, desempenho
  lib/
    site.ts            contatos, CNPJ, endereço, WhatsApp
    content.ts         unidades atendidas, depoimentos, categorias      ← editar aqui
public/
  brand/               logo.svg e logo-white.svg (do PDF original)
  images/              fotos otimizadas (WebP)
  libs/                decodificadores Draco e Basis (KTX2), servidos localmente
  models/              mio-terracos.glb (quando ficar pronto)
scripts/
  prepare-images.mjs   gera WebP e og.jpg a partir de assets/source/fotos
  blender/mio_prepare.py  limpeza, nomes, vegetação leve, UV, bake e export no Blender
```

## Experiência 3D

- Carrega **só quando a seção se aproxima da tela**; o resto do site vem antes. Fora da tela o render pausa.
- **Abertura:** a rolagem leva a câmera do jardim (como no render externo) para dentro do ambiente. "Explorar o
  ambiente" libera o orbit.
- **Orbit** com limites (não atravessa paredes nem vai abaixo do piso): 1 dedo gira, pinça dá zoom; no desktop,
  arrastar gira e **Ctrl/⌘ + rolagem** dá zoom (a rolagem simples continua descendo a página). Botões +/−.
- **Hotspots** pulsantes → a câmera vai até o item e abre o card. Clique nos próprios objetos também abre.
  Contorno vinho no hover. **Fazer tour** percorre os hotspots. Rotação lenta quando ocioso.
  "Arraste para explorar" some na 1ª interação. **Esc** volta à visão geral.
- **Fallback:** sem WebGL, ou aparelho fraco (≤ 2 GB de RAM, ≤ 2 núcleos, modo economia de dados) mostra uma foto,
  com o botão "Ver em 3D mesmo assim". Pixel ratio limitado no celular e reduzido automaticamente se o FPS cair.
- `prefers-reduced-motion`: sem rotação automática, transições de câmera instantâneas e textos sem animação.

## Lighthouse (local, build de produção, placeholders)

Mobile: **Performance 95 · Acessibilidade 100 · Boas práticas 100 · SEO 100** (LCP 2,8 s, TBT 130 ms, CLS 0).
Rodar de novo depois do `.glb` final e já na Vercel.

## Variáveis de ambiente

| Nome | Uso |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel da Meta. PageView no carregamento, **Lead** no envio do formulário, **Contact** em qualquer clique para o WhatsApp. Vazio = desligado. |
| `NEXT_PUBLIC_SCENE_GLB` | Caminho do `.glb` (ex.: `/models/mio-terracos.glb`). Vazio = cena de placeholders. |

## Pendências / a confirmar

- [ ] **Formas de pagamento** do totem (a sinalização da loja fala em cartão por chip/aproximação; Pix?) — `scene/layout.ts` e `components/HowItWorks.tsx`
- [ ] **Ambientação faz parte da implantação?** (card "Ambientação") — `scene/layout.ts`
- [ ] **Lista de condomínios** atendidos — `lib/content.ts`
- [ ] **Depoimento** real do Residencial Mediterrâneo (e autorização) — `lib/content.ts` (está marcado como rascunho)
- [ ] **Texto LGPD** definitivo — `app/privacidade/page.tsx` (hoje é um texto-base)
- [ ] URL da página do **Facebook** — `lib/site.ts`
- [ ] **Renders** e **.skp** em `assets/source/` (ver `assets/source/README.md`)
- [ ] Conferir textos do site antigo (o mioexpress.com.br não abriu deste ambiente; os blocos Origem/Produtos/Qualidade
      foram reescritos a partir do resumo enviado)

## Deploy (Vercel)

1. Suba o repositório no GitHub e importe na Vercel (framework detectado: Next.js, sem configuração extra).
2. Em **Settings → Environment Variables**, defina `NEXT_PUBLIC_META_PIXEL_ID` (e `NEXT_PUBLIC_SCENE_GLB` quando houver).
3. Domínio: siga [docs/DNS-GODADDY.md](docs/DNS-GODADDY.md) (preserva MX/TXT do e-mail).

Projeto de ambientação: Daniele Faustino Arquitetura & Interiores.
