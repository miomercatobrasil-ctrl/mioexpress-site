@AGENTS.md

# Mio Express: contexto para o Claude

Leia antes de qualquer trabalho. Vale para o site e para o marketing.

## Como trabalhar com o João

- Responda sempre em português do Brasil. Ele reclama quando a resposta vem em inglês.
- Ele quer opinião sincera e revisão proativa de UI e UX.
- O limite de uso dele às vezes é baixo. Agrupe as mudanças e escreva mensagens objetivas.
- Ele aprova as artes antes de postar. Nunca publique nada sem aprovação.

## Empresa

- **Mio Express Mini Mercado:** mini mercado autônomo 24h dentro de condomínios.
- **Razão social:** G2J Comércio de Bebidas e Alimentos Ltda, CNPJ 47.326.086/0001-00.
- **Onde atua:** São José dos Campos (sede) e Jacareí (expansão).
- **Contato:** WhatsApp (12) 99739-7730. Instagram @mioexpressbrasil. Site https://mioexpress.com.br (o antigo mioexpress.pages.dev continua no ar, por causa do QR code impresso).
- **Números públicos:** 20 condomínios, +1.800 apartamentos, +5.000 moradores (estimativa de 3 por apartamento).
- **Regra:** nunca citar o nome de nenhum condomínio ou prédio, nem em depoimentos.
- **Modelo:** custo zero para o condomínio, que pode ter cashback. A Mio instala, abastece, faz a manutenção e cuida da segurança (câmera própria ou do condomínio). Furto é 100% responsabilidade da Mio. A instalação leva cerca de 20 dias. Mínimo de 80 apartamentos. Não é franquia: tem equipe própria.
- **Compra:** totem de autoatendimento, Pix ou cartão (aproximação ou chip), sem app e sem cadastro.
- **Marcas parceiras:** Coca-Cola, Heineken, Sadia, Liv Up, Los Los (picolés) e outras.

## Identidade visual

- **Cores:**
  - Bordô `#7a1f2b` (escuro `#3b0d14`).
  - Bege `#f5eee4`.
  - Dourado `#b08d57`.
  - Tinta `#2b1d1a`.
  - Branco quente `#fffdf9`.
- **Fonte:** Montserrat. Títulos em 700, com o destaque em dourado (no fundo bege, o destaque é bordô).
- **Logos:** `public/brand/logo.svg` (bordô) e `public/brand/logo-white.svg`.
- **Fotos reais:** `assets/source/fotos/*.jpg`.
- **Produtos recortados:** `assets/source/produtos/crop_*.png`. Nem todos têm fundo transparente. Para ver quais têm, confira o alfa dos cantos.
- **Imagens do 3D:** `marketing/fotos-3d/`.
- **Tom de voz:** próximo, simples e local ("Do Vale, para o Vale"). Humor leve nas situações do morador. Direto e seguro com o síndico.

## Marketing (Instagram)

- **Plano completo:** https://claude.ai/artifact/UGP42GxHZJQssHrAYdgqJw. A fonte está em `marketing/plano/` (template.html + build.py).
- **Públicos e ritmo:** síndicos e moradores, equilibrados. 3 posts por semana: segunda e quarta às 12h, sexta às 19h. Stories todos os dias.
- **Pilares:** síndico 30%, dia a dia do morador 25%, produtos e parceiros 20%, marca e bastidores 15%, comunidade 10%.
- **Anúncios:** até R$ 500 por mês. R$ 300 em anúncio para síndicos com botão de WhatsApp (SJC e Jacareí) e R$ 200 para impulsionar posts de morador num raio de 1 km dos condomínios atendidos.
- **Material:** só o que já existe (fotos, vídeos `public/video/*.mp4`, 3D). Ninguém grava conteúdo novo por enquanto.
- **Artes:**
  - Gerador: `node marketing/gerador/posts.mjs [id]`, que gera 1080×1350 em `marketing/posts/<id>/` com `legenda.txt`.
  - Para um post novo, copie um item de `POSTS` no gerador.
- **Primeiro lote, em rascunho no Metricool desde 26/10/2026** (esperando aprovação do João). As imagens públicas ficam em `public/ig/<id>/` (noindex):
  - 28/10 10h: 01 síndico custo zero (carrossel)
  - 30/10 18h: 02 morador 23h
  - 03/11 10h: 04 dúvidas de síndico (carrossel)
  - 04/11 18h: 03 como comprar (carrossel)
  - 06/11 18h: 05 picolé Los Los
  - 09/11 10h: 06 Do Vale para o Vale
- **Melhor horário segundo o Metricool:** 10h e 18h nos dias de semana. Posts de síndico às 10h, de morador às 18h.
- **Segundo lote, a fazer:** noite de jogo (Heineken + snacks + pizza Sadia), depoimento de síndico (sem nome do condomínio), marmitas Liv Up, post de dados (top produtos), Reels com o vídeo dos síndicos e com o institucional, Reels do tour 3D.
- **Concorrentes:**
  - Market4u (tem página para SJC e paga até R$ 4 mil por indicação), InHouse, SmartStore, Minha Quitandinha (franqueado de SJC com Instagram fraco), Vale Market (local, parece parado).
  - Diferenciais da Mio: empresa local, sem app, marcas parceiras e a experiência 3D (mioexpress.com.br/experiencia).
- **Metricool (conector, conta id 7664969, fuso America/Sao_Paulo):** serve para analisar o Instagram e agendar. Agende sempre para revisão ou aprovação do João, nunca publique direto.

## Site (Next.js, export estático na Cloudflare Pages)

- **Deploy:** um push na `main` publica sozinho. Confira com `gh api repos/miomercatobrasil-ctrl/mioexpress-site/commits/<sha>/check-runs`.
- **DNS:** fica na Cloudflare, e o domínio continua registrado na GoDaddy (detalhes em `docs/DNS-GODADDY.md`).
- **Analytics e Google:** GA4 `G-066E2MVTX1`. Search Console verificado e sitemap enviado.
- **Experiência 3D:** fica em `src/scene/`. Lightmaps feitos no Blender (`scripts/blender/`). Modo leve para GPU fraca. A simulação de compra acontece na tela do totem.
