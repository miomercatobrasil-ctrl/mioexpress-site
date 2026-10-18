# Apontar mioexpress.com.br (GoDaddy) para a Vercel sem perder o e-mail

O domínio está registrado na GoDaddy e hoje aponta para o Website Builder. A ideia é **manter o DNS na GoDaddy**
e trocar **apenas** os registros do site (A do `@` e CNAME do `www`). MX, TXT (SPF/DKIM/DMARC/verificações)
e demais registros ficam como estão.

## 0. Antes de mexer: fotografar o DNS atual

1. GoDaddy → **Meus produtos** → domínio `mioexpress.com.br` → **DNS** → **Gerenciar DNS**.
2. Tire print/exporte todos os registros. Anote principalmente:
   - **MX** (ex.: `mailstore1.secureserver.net` / `smtp.secureserver.net` para e-mail GoDaddy, ou `*.google.com`, `*.outlook.com`).
   - **TXT** (SPF `v=spf1 ...`, `google-site-verification`, `MS=...`, DMARC em `_dmarc`).
   - **CNAME** de e-mail (`email`, `autodiscover`, `selector1._domainkey`, etc.).
3. Se houver e-mail **"Website Builder / GoDaddy Email"** vinculado ao plano do site, confirme que o plano de e-mail
   continua ativo mesmo após cancelar o Website Builder (são produtos separados; só cancele o Builder depois do passo 4).

## 1. Adicionar o domínio na Vercel

1. Vercel → projeto `mioexpress-site` → **Settings → Domains** → adicionar `mioexpress.com.br` e `www.mioexpress.com.br`.
2. Escolha o **www redirecionar para o domínio raiz** (ou o inverso; o site usa `https://mioexpress.com.br` como canônico).
3. A Vercel mostra os valores esperados. Normalmente:
   - `@` → **A** `76.76.21.21`
   - `www` → **CNAME** `cname.vercel-dns.com`
   (use os valores que a Vercel exibir, eles podem mudar).

## 2. Desconectar o Website Builder do domínio

No Website Builder: **Configurações → Domínio** → desconectar `mioexpress.com.br` (ou, em "Gerenciar DNS",
a GoDaddy avisa que o registro `@` é gerenciado pelo Builder). Isso libera o registro A do `@`.

## 3. Editar SOMENTE estes registros na GoDaddy

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| A | `@` | `76.76.21.21` (valor da Vercel) | 1/2 hora |
| CNAME | `www` | `cname.vercel-dns.com` | 1/2 hora |

- **Apague** outros registros A do `@` que apontem para a GoDaddy (ex.: IPs do Website Builder) e o
  **Forwarding/Encaminhamento** do domínio, se houver.
- **Não toque** em MX, TXT, `_dmarc`, `_domainkey`, `autodiscover`, `email`, `ftp` etc.
- Não troque os **nameservers** para os da Vercel (isso apagaria o DNS da GoDaddy, incluindo o e-mail, se não
  forem recriados).

## 4. Verificar

1. Na Vercel, os domínios ficam **Valid Configuration** e o HTTPS é emitido sozinho (minutos até algumas horas).
2. Teste o e-mail: envie e receba uma mensagem de/para um endereço `@mioexpress.com.br`.
3. Confira os registros de fora: `dig mioexpress.com.br A +short`, `dig mioexpress.com.br MX +short`,
   `dig mioexpress.com.br TXT +short` (ou dnschecker.org) e compare MX/TXT com o print do passo 0.
4. Só então cancele o Website Builder.

## 5. Depois da migração

- Google Search Console: adicionar a propriedade de domínio (registro TXT, **somando** aos existentes) e enviar
  `https://mioexpress.com.br/sitemap.xml`.
- Atualizar o link do site no Instagram/Facebook/Google Meu Negócio se necessário.
- Caminhos antigos comuns (`/fale-conosco`, `/contato`) já redirecionam para `/#contato` (`next.config.ts`).
  Se o Google Search Console listar outras URLs antigas com tráfego, adicione redirects lá.
