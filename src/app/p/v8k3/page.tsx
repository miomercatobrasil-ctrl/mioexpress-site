import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { whatsappLink } from "@/lib/site";

// Proposta exclusiva para um condomínio em negociação (link do folder/QR code).
// Não citar o nome do condomínio aqui: o repositório é público. Fora do sitemap e sem indexação.
export const metadata: Metadata = {
  title: "Uma Mio feita para o seu condomínio",
  description: "Conheça a proposta da Mio Express para o seu condomínio.",
  robots: { index: false, follow: false },
};

const MOTIVOS = [
  ["Prateleira sempre cheia", "Equipe própria repõe com frequência. Sem franquia, sem depender de outra cidade."],
  ["Loja organizada e bonita", "Projeto sob medida para o espaço, num visual só, com manutenção e limpeza por nossa conta."],
  ["Sem app e sem cadastro", "O morador pega, passa no totem e paga com Pix ou cartão. Nenhuma porta trancada por aplicativo."],
  ["Custo zero", "A Mio instala, abastece e cuida da segurança. Furto é responsabilidade 100% nossa, e pode ter cashback."],
];

export default function Proposta() {
  const wa = whatsappLink("Olá! Recebi o folder da Mio e quero conversar sobre a proposta para o nosso condomínio.");
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
              Entre em uma loja Mio em 3D e veja como funciona: do armário iluminado ao totem de pagamento. Em breve, aqui mesmo, o projeto do
              seu espaço.
            </p>
            <div className="proposta__ctas">
              <Link className="btn btn--primary" href="/experiencia">Entrar na loja em 3D</Link>
              <a className="btn btn--ghost proposta__ghost" href={wa} target="_blank" rel="noopener">Falar no WhatsApp</a>
            </div>
          </div>
        </section>
        <section className="proposta__motivos container">
          <p className="eyebrow">Por que a Mio</p>
          <h2 className="h2">O mercado que o morador <span className="is-accent">gosta de usar.</span></h2>
          <ul>
            {MOTIVOS.map(([t, d]) => (
              <li key={t}><strong>{t}</strong><span>{d}</span></li>
            ))}
          </ul>
          <p className="proposta__nums"><b>21</b> condomínios · <b>+1.800</b> apartamentos · empresa do Vale, sem franquia</p>
          <a className="btn btn--primary" href={wa} target="_blank" rel="noopener">Agendar uma conversa</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
