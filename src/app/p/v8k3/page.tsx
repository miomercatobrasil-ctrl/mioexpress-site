import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { whatsappLink } from "@/lib/site";
import { depoimentos } from "@/lib/content";

// Proposta exclusiva para um condomínio em negociação (link do folder/QR code).
// Não citar o nome do condomínio aqui: o repositório é público. Fora do sitemap e sem indexação.
export const metadata: Metadata = {
  title: "Uma Mio feita para o seu condomínio",
  description: "Conheça a proposta da Mio Express para o seu condomínio.",
  robots: { index: false, follow: false },
};

const APTOS = 876;
const MORADORES = Math.floor((APTOS * 3) / 100) * 100;

const NUMEROS = [
  [APTOS.toLocaleString("pt-BR"), "apartamentos atendidos"],
  [`+${MORADORES.toLocaleString("pt-BR")}`, "moradores (estimativa)"],
  ["24h", "aberto todos os dias"],
  ["R$ 0", "de custo para o condomínio"],
];

const MOTIVOS = [
  ["Prateleira sempre cheia", "Equipe própria repõe com frequência. Sem franquia, sem depender de outra cidade."],
  ["Loja organizada e bonita", "Projeto sob medida para o espaço, num visual só, com manutenção e limpeza por nossa conta."],
  ["Sem app e sem cadastro", "O morador pega, passa no totem e paga com Pix ou cartão. Nenhuma porta trancada por aplicativo."],
  ["Preço mais justo", "Sem royalties de franquia, a diferença fica no preço da prateleira."],
];

const MIX = [
  ["Bebidas geladas", "Água, refrigerante, sucos, energéticos e isotônicos"],
  ["Cervejas", "Heineken, long necks e latas sempre geladas"],
  ["Sorvetes e picolés", "Freezer Los Los com vários sabores"],
  ["Congelados e refeições", "Pizzas Sadia, pratos prontos e marmitas Liv Up"],
  ["Snacks e doces", "Salgadinhos, chocolates, biscoitos e balas"],
  ["Café da manhã", "Leite, café, pão, achocolatado e frios"],
  ["Mercearia", "Básicos para a cozinha, molhos e enlatados"],
  ["Limpeza e higiene", "Detergente, sabão, papel higiênico, higiene pessoal"],
  ["Pet", "Ração e petiscos para quem tem pet em casa"],
];

const FOTOS = [
  ["loja3-frente-b", "Armário Mio com iluminação"],
  ["loja3-geladeiras", "Geladeiras de bebidas"],
  ["loslos-picoles", "Freezer de picolés"],
  ["loja3-totem", "Totem de pagamento"],
  ["loja4-frente", "Loja Mio em condomínio"],
  ["loja3-prateleiras", "Prateleiras abastecidas"],
];

const PASSOS = [
  ["Pegue o que precisar", "Bebidas, snacks, congelados, limpeza. Tudo à mão, 24h."],
  ["Passe no totem", "Leia o código de barras de cada produto."],
  ["Pague e pronto", "Pix ou cartão por aproximação. Menos de 1 minuto."],
];

const CONDOMINIO = [
  "Instalação sob medida em cerca de 20 dias",
  "Abastecimento e reposição pela nossa equipe",
  "Manutenção e limpeza da loja e dos equipamentos",
  "Segurança com câmera nossa ou do condomínio",
  "Furto é responsabilidade 100% da Mio",
  "Possibilidade de cashback para o condomínio",
];

export default function Proposta() {
  const wa = whatsappLink("Olá! Vi a proposta da Mio para o nosso condomínio e quero conversar.");
  const dep = depoimentos[0];
  return (
    <>
      <Header />
      <main className="proposta">
        <section className="proposta__hero">
          <div className="container">
            <p className="eyebrow">Proposta exclusiva</p>
            <h1 className="h2">
              Uma Mio feita <span className="is-accent">para o seu condomínio.</span>
            </h1>
            <p className="proposta__lead">
              Um mercado 24h organizado, sempre abastecido e sem aplicativo, pensado para os {APTOS} apartamentos do seu condomínio. Entre em
              uma loja Mio em 3D e veja como funciona.
            </p>
            <div className="proposta__ctas">
              <Link className="btn btn--primary" href="/experiencia">Entrar na loja em 3D</Link>
              <a className="btn btn--ghost proposta__ghost" href={wa} target="_blank" rel="noopener">Falar no WhatsApp</a>
            </div>
          </div>
        </section>

        <section className="container proposta__sec">
          <ul className="proposta__nums">
            {NUMEROS.map(([n, l]) => (
              <li key={l}><b>{n}</b><span>{l}</span></li>
            ))}
          </ul>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">O que muda</p>
          <h2 className="h2">O mercado que o morador <span className="is-accent">gosta de usar.</span></h2>
          <ul className="proposta__cards">
            {MOTIVOS.map(([t, d]) => (
              <li key={t}><strong>{t}</strong><span>{d}</span></li>
            ))}
          </ul>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">Tudo o que tem na Mio</p>
          <h2 className="h2">Do café da manhã <span className="is-accent">à noite de jogo.</span></h2>
          <ul className="proposta__mix">
            {MIX.map(([t, d]) => (
              <li key={t}><strong>{t}</strong><span>{d}</span></li>
            ))}
          </ul>
          <p className="proposta__nota">Marcas parceiras como Coca-Cola, Heineken, Sadia, Liv Up e Los Los. O mix é ajustado ao que os moradores mais compram.</p>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">Lojas Mio de verdade</p>
          <h2 className="h2">É assim que fica <span className="is-accent">dentro do condomínio.</span></h2>
          <div className="proposta__fotos">
            {FOTOS.map(([f, alt]) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f} src={`/images/p/${f}.jpg`} alt={alt} loading="lazy" />
            ))}
          </div>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">Como o morador compra</p>
          <h2 className="h2">Pegou. Passou. <span className="is-accent">Pagou.</span></h2>
          <ol className="proposta__passos">
            {PASSOS.map(([t, d], i) => (
              <li key={t}><i>{i + 1}</i><div><strong>{t}</strong><span>{d}</span></div></li>
            ))}
          </ol>
        </section>

        <section className="proposta__escuro">
          <div className="container">
            <p className="eyebrow eyebrow--light">Para o condomínio</p>
            <h2 className="h2 h2--light">Custo zero. <span className="is-accent">A Mio cuida de tudo.</span></h2>
            <ul className="proposta__check">
              {CONDOMINIO.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">Quem já tem uma Mio</p>
          <h2 className="h2"><span className="is-accent">21 condomínios</span> em São José dos Campos e Jacareí.</h2>
          <p className="proposta__lead2">+1.800 apartamentos atendidos. Empresa do Vale, com equipe própria e sem franquia.</p>
          <blockquote className="proposta__dep">
            <strong>“{dep.destaque}”</strong>
            <p>{dep.texto}</p>
            <cite>{dep.condominio}</cite>
          </blockquote>
        </section>

        <section className="container proposta__sec proposta__final">
          <h2 className="h2">Vamos montar a Mio <span className="is-accent">do seu condomínio?</span></h2>
          <p className="proposta__lead2">A gente apresenta o projeto do espaço, tira as dúvidas do conselho e combina os próximos passos.</p>
          <a className="btn btn--primary" href={wa} target="_blank" rel="noopener">Agendar uma conversa</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
