# Monta marketing/plano/index.html (plano de marketing da Mio) a partir das artes e legendas geradas.
import glob, html, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
POSTS = os.path.join(HERE, "..", "posts")

# Artes antigas (produto recortado / 3D) saem do plano; serão refeitas com foto real.
ANTIGOS = {"03-como-comprar", "07-halloween", "07b-halloween-minimal", "10-teste-foto-real"}
ORDEM = ["12-concurso-churrasco", "09-halloween-fantasias", "08-noite-de-jogo", "06-nao-somos-franquia", "05-picole-los-los", "04-duvidas-sindico", "02-morador-23h", "01-sindico-custo-zero"]

posts = []
for d in sorted(glob.glob(os.path.join(POSTS, "*/")), key=lambda d: ORDEM.index(os.path.basename(d.rstrip("/"))) if os.path.basename(d.rstrip("/")) in ORDEM else 99):
    pid = os.path.basename(d.rstrip("/"))
    if pid in ANTIGOS:
        continue
    imgs = [f"img/{pid}-{os.path.basename(f)[:-4]}.jpg" for f in sorted(glob.glob(d + "*.png")) if re.fullmatch(r"\d\d|story", os.path.basename(f)[:-4])]
    leg = open(os.path.join(d, "legenda.txt"), encoding="utf-8").read().strip()
    posts.append((pid, imgs, leg))

NOMES = {
    "01-sindico-custo-zero": ("Carrossel · Síndicos", "Mini mercado 24h, custo zero"),
    "02-morador-23h": ("Post · Moradores", "Acabou o leite? Desce ali."),
    "03-como-comprar": ("Carrossel · Moradores", "Pegou, passou, pagou"),
    "04-duvidas-sindico": ("Carrossel · Síndicos", "5 dúvidas de síndico"),
    "05-picole-los-los": ("Post · Produto parceiro", "Picolé Los Los a poucos passos de casa"),
    "06-nao-somos-franquia": ("Carrossel · Marca", "A Mio não é franquia"),
    "07-halloween": ("Post · Data comemorativa", "Halloween: os doces estão na Mio"),
    "08-noite-de-jogo": ("Post · Moradores", "Dia de jogo? A geladeira tá logo ali."),
    "09-halloween-fantasias": ("Carrossel · Data comemorativa", "Até os produtos se fantasiaram"),
    "10-teste-foto-real": ("Nova linha · Fotos reais", "Teste: capas com foto real das lojas"),
    "12-concurso-churrasco": ("Post + story · Concurso cultural", "Churrasco com os Vizinhos"),
}

cards = []
for pid, imgs, leg in posts:
    tipo, nome = NOMES.get(pid, ("Post", pid))
    strip = "".join(f'<img src="{i}" alt="{html.escape(nome)} — imagem {k+1} de {len(imgs)}" loading="lazy" width="720" height="900">' for k, i in enumerate(imgs))
    cards.append(f'''<article class="post" id="{pid}">
  <div class="post__strip">{strip}</div>
  <div class="post__body">
    <p class="kicker">{tipo}{" · " + str(len(imgs)) + " imagens" if len(imgs) > 1 else ""}</p>
    <h3>{html.escape(nome)}</h3>
    <details><summary>Ver legenda</summary><pre class="legenda">{html.escape(leg)}</pre></details>
    <button type="button" class="copiar" data-texto="{html.escape(leg, quote=True)}">Copiar legenda</button>
    <p class="arquivo">Arquivos: <code>marketing/posts/{pid}/</code></p>
  </div>
</article>''')

page = open(os.path.join(HERE, "template.html"), encoding="utf-8").read().replace("<!--POSTS-->", "\n".join(cards))
open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(page)
print("ok", len(posts), "posts")
