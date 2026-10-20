# Apontar mioexpress.com.br (GoDaddy) para o site na Cloudflare sem perder o e-mail

O domínio continua **registrado e pago na GoDaddy**. Só a "lista telefônica" do domínio (DNS) passa a ser
cuidada pela Cloudflare (plano grátis), que é onde o site está hospedado. A Cloudflare copia todos os
registros atuais (inclusive os de e-mail), então o e-mail continua funcionando.

Tempo: uns 20 minutos de cliques. A troca costuma valer em menos de 1 hora (pode levar até 24 h).

## 0. Antes de mexer: print do DNS atual

GoDaddy → **Meus produtos** → `mioexpress.com.br` → **DNS** → tire print de **todos** os registros
(principalmente **MX**, **TXT** e **CNAME**). Serve para conferir depois.

## 1. Adicionar o domínio na Cloudflare

1. Cloudflare (mesma conta do site) → **Add a domain / Adicionar domínio** → `mioexpress.com.br` → plano **Free**.
2. A Cloudflare busca os registros atuais. Na lista que aparecer, **compare com o print**: os **MX** e **TXT**
   precisam estar lá. Se faltar algum, clique em **Add record** e copie do print.
3. A Cloudflare mostra **2 nameservers** (ex.: `xxx.ns.cloudflare.com`). Deixe essa tela aberta.

> **Feito em 20/10/2026.** Registros conferidos (2 MX, SPF, DMARC, TXT T4207587, CNAME email) e todos em
> "DNS only". Nameservers da Cloudflare para este domínio: **donna.ns.cloudflare.com** e **ray.ns.cloudflare.com**.
> No GoDaddy hoje estão ns51/ns52.domaincontrol.com (trocar só no lançamento). DNSSEC: conferir se está desligado
> na GoDaddy antes da troca.
>
> Pode fazer o passo 1 com antecedência: enquanto os nameservers não mudam na GoDaddy, nada muda no ar.
> O passo 2 é o "botão de lançar".

## 2. Trocar os nameservers na GoDaddy

GoDaddy → `mioexpress.com.br` → **DNS** → **Nameservers** → **Alterar** → **Usar meus próprios nameservers**
→ cole os 2 da Cloudflare → salvar. (O Website Builder deixa de aparecer no domínio; pode cancelar depois.)

## 3. Ligar o domínio ao site

Quando a Cloudflare avisar que o domínio está **Active** (e-mail ou na tela inicial):
Cloudflare → **Workers & Pages** → projeto `mioexpress` → **Custom domains** → **Set up a domain** →
`mioexpress.com.br` e depois `www.mioexpress.com.br`. O HTTPS sai sozinho em alguns minutos.

## 4. Conferir

1. Abrir https://mioexpress.com.br e https://www.mioexpress.com.br.
2. Mandar e receber um e-mail `@mioexpress.com.br`.
3. Só então cancelar o Website Builder na GoDaddy.

## 5. Depois que o domínio estiver apontando

- Em `src/lib/site.ts`, trocar `url: "https://mioexpress.pages.dev"` por `url: "https://mioexpress.com.br"`
  (prévia de links no WhatsApp/Instagram, sitemap e canonical). Isso também libera o Google para indexar o site:
  enquanto o endereço for o pages.dev, o site fica fora das buscas (noindex).
- Google Search Console: adicionar o domínio e enviar `https://mioexpress.com.br/sitemap.xml`.
- Atualizar o link do site no Instagram, Facebook e Google Meu Negócio.
- O endereço mioexpress.pages.dev (e o QR code já impresso) continua funcionando.
