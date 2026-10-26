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
- **Números públicos:** 21 condomínios, +1.800 apartamentos, +5.000 moradores (estimativa de 3 por apartamento).
- **Regra:** nunca citar o nome de nenhum condomínio ou prédio, nem em depoimentos.
- **Modelo:** custo zero para o condomínio, que pode ter cashback. A Mio instala, abastece, faz a manutenção e cuida da segurança (câmera própria ou do condomínio). Furto é 100% responsabilidade da Mio. A instalação leva cerca de 20 dias. Mínimo de 80 apartamentos. Não é franquia: tem equipe própria e, sem royalties, pratica preço mais justo. Isso é diferencial e deve aparecer com frequência.
- **Compra:** totem de autoatendimento, Pix ou cartão (aproximação ou chip), sem app e sem cadastro.
- **Marcas parceiras:** Coca-Cola, Heineken, Sadia, Liv Up, Los Los (picolés) e outras.

## Identidade visual

- **Cores:**
  - Bordô `#7a1f2b` (escuro `#3b0d14`).
  - Bege `#f5eee4`.
  - Dourado `#b08d57`.
  - Tinta `#2b1d1a`.
  - Branco quente `#fffdf9`.
- **Cor principal:** o bordô do logo (decisão do João, 26/10). O feed antigo usava um vermelho mais vivo, mas daqui pra frente é bordô. Nos prompts de imagem (GPT), peça o fundo "bordô profundo #7a1f2b".
- **Fonte:** Montserrat. Títulos em 700, com o destaque em dourado (no fundo bege, o destaque é bordô).
- **Logos:** `public/brand/logo.svg` (bordô) e `public/brand/logo-white.svg`.
- **Fotos reais:** `assets/source/fotos/*.jpg`.
- **Produtos recortados:** `assets/source/produtos/crop_*.png`. Nem todos têm fundo transparente. Para ver quais têm, confira o alfa dos cantos.
- **Imagens do 3D:** `marketing/fotos-3d/`.
- **Tom de voz:** próximo, simples e local ("Do Vale, para o Vale"). Humor leve nas situações do morador. Direto e seguro com o síndico.

## Marketing (Instagram)

- **Plano completo:** https://claude.ai/artifact/UGP42GxHZJQssHrAYdgqJw. A fonte está em `marketing/plano/` (template.html + build.py).
- **Públicos e ritmo:** síndicos e moradores, equilibrados. 2 posts por semana (decisão do João, para não encher o feed): terça 10h para síndico, quinta 18h para morador. Stories todos os dias.
- **Pilares:** síndico 30%, dia a dia do morador 25%, produtos e parceiros 20%, marca e bastidores 15%, comunidade 10%.
- **Anúncios:** até R$ 500 por mês. R$ 300 em anúncio para síndicos com botão de WhatsApp (SJC e Jacareí) e R$ 200 para impulsionar posts de morador num raio de 1 km dos condomínios atendidos.
- **Material:** só o que já existe (fotos, vídeos `public/video/*.mp4`, 3D). Ninguém grava conteúdo novo por enquanto.
- **Artes:**
  - Gerador: `node marketing/gerador/posts.mjs [id]`, que gera 1080×1350 em `marketing/posts/<id>/` com `legenda.txt`.
  - Para um post novo, copie um item de `POSTS` no gerador.
  - Direção visual (João, 26/10): foto real da loja de fundo, com degradê bordô sob o texto. Nada de produto recortado solto no fundo, nem render 3D no feed. Fotos em `assets/source/fotos/` (loja2, loja3, loja4).
  - Se faltar uma foto que encaixe no tema (ex.: freezer de perto, produto específico), avise o João e peça; ele manda pelo link de upload https://claude.ai/artifact/277x3Jeh3JeTZBehGaqMxf.
  - Quebre as linhas dos títulos à mão (`<br>`): sem palavra sozinha na última linha, e o texto todo dentro da área escura do degradê.
- **Primeiro lote, em rascunho no Metricool desde 26/10/2026** (esperando aprovação do João). As imagens públicas ficam em `public/ig/<id>/` (noindex; ao mudar uma arte, use pasta nova, como `-v2`, por causa do cache):
  - Ter 27/10 18h (movido de seg 26/10): 09 Halloween "até os produtos se fantasiaram" (carrossel com imagens do GPT, aprovado pelo João, agendado de verdade, marcado como IA). Cupom MIOWEEN10, 10% em doces só na sexta e no sábado (30 e 31/10). Código no totem: mínimo de 8 caracteres, maiúsculas e números
  - Stories agendados: ter 27/10 18h10 (chamada para o post), sexta 30/10 10h e sábado 31/10 10h (cupom de Halloween). O gerador de stories fica em `marketing/gerador/stories.mjs`.
  - Seg 26/10 15h30: 12 concurso cultural "Churrasco com os Vizinhos" (agendado de verdade, uuid -8349506528234748637, marcado como IA). Vai até 02/11 23h59, com resultado em 03/11. Stories em 26/10 15h40 (uuid 27113977999476542) e 01/11 10h (id 406921405). O João impulsiona e fixa o post.
  - Os rascunhos abaixo vão ser refeitos na linha de fotos reais e reagendados (o João liberou mudar as datas em 26/10).
  - Qua 28/10 10h: 01 síndico custo zero (carrossel)
  - Sex 30/10 18h: 07 Halloween dos doces. Ficou em rascunho e não sai; o João vai apagar.
  - Ter 03/11 10h: 04 dúvidas de síndico (carrossel)
  - Qui 05/11 18h: 08 noite de jogo (substituiu o 03 como comprar, que repetia um post antigo do feed)
  - Ter 10/11 10h: 06 não somos franquia (carrossel)
  - Qui 12/11 18h: 05 picolé Los Los
  - Qui 19/11 18h: 02 morador 23h
- **Imagens criativas:** o João gera no GPT a partir dos prompts que eu escrevo (produto vira personagem, fundo bordô, uma luz só, sem marcas, estilo das campanhas do McDonald's). Eu monto com o logo e o texto. As imagens ficam em `assets/source/<campanha>/`. Marque `isAiGenerated: true`.
- **Datas comemorativas:** vale fazer post temático (Halloween, Dia do Síndico 30/11, Black Friday, Natal e Ano Novo, verão, Carnaval). O totem aceita cupom: porcentagem ou valor, por categoria, fabricante ou produto, com validade e limite de uso; o código precisa ter no mínimo 8 caracteres. Promoções vão para os stories; no feed, no máximo 1 por mês.
- **Melhor horário segundo o Metricool:** 10h e 18h nos dias de semana. Posts de síndico às 10h, de morador às 18h.
- **Segundo lote, a fazer:** noite de jogo (Heineken + snacks + pizza Sadia), depoimento de síndico (sem nome do condomínio), marmitas Liv Up, post de dados (top produtos), Reels com o vídeo dos síndicos e com o institucional, Reels do tour 3D.
- **Concorrentes:**
  - Market4u (tem página para SJC e paga até R$ 4 mil por indicação), InHouse, SmartStore, Minha Quitandinha (franqueado de SJC com Instagram fraco), Vale Market (local, parece parado).
  - Diferenciais da Mio: empresa local, sem app, marcas parceiras e a experiência 3D (mioexpress.com.br/experiencia).
- **Metricool (conector, conta id 7664969, fuso America/Sao_Paulo):** serve para analisar o Instagram e agendar. Fluxo combinado em 26/10: eu mostro as artes aqui na conversa; quando o João aprova na conversa, eu agendo direto como agendado (`draft: false`), sem rascunho. Sem aprovação, nada é publicado.

## Site (Next.js, export estático na Cloudflare Pages)

- **Deploy:** um push na `main` publica sozinho. Confira com `gh api repos/miomercatobrasil-ctrl/mioexpress-site/commits/<sha>/check-runs`.
- **DNS:** fica na Cloudflare, e o domínio continua registrado na GoDaddy (detalhes em `docs/DNS-GODADDY.md`).
- **Analytics e Google:** GA4 `G-066E2MVTX1`. Search Console verificado e sitemap enviado.
- **Experiência 3D:** fica em `src/scene/`. Lightmaps feitos no Blender (`scripts/blender/`). Modo leve para GPU fraca. A simulação de compra acontece na tela do totem.
