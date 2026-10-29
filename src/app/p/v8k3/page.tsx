import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { whatsappLink } from "@/lib/site";
import { SalaSection } from "@/components/SalaSection";

// Link para o condomínio em negociação ver como a loja vai ficar (as condições estão na proposta comercial).
// Não citar o nome do condomínio aqui: o repositório é público. Fora do sitemap e sem indexação.
export const metadata: Metadata = {
  title: "Veja como vai ficar a Mio no seu condomínio",
  description: "A loja Mio projetada para o seu condomínio, em 3D.",
  robots: { index: false, follow: false },
};

const FOTOS = [
  ["loja3-frente-b", "Armário Mio com iluminação"],
  ["loja3-geladeiras", "Geladeiras de bebidas"],
  ["loslos-picoles", "Freezer de picolés"],
  ["loja3-totem", "Totem de pagamento"],
  ["loja4-frente", "Loja Mio em condomínio"],
  ["loja3-prateleiras", "Prateleiras abastecidas"],
];

export default function Proposta() {
  const wa = whatsappLink("Olá! Vi a loja Mio projetada para o nosso condomínio e quero conversar.");
  return (
    <>
      <Header />
      <main className="proposta">
        <section id="loja" className="proposta__hero">
          <div className="container">
            <p className="eyebrow">Projeto exclusivo</p>
            <h1 className="h2">
              Veja como vai ficar a Mio <span className="is-accent">no seu condomínio.</span>
            </h1>
            <p className="proposta__lead">Toque em Explorar e ande pela loja projetada para o seu espaço. Use as vistas para conhecer cada canto.</p>
            <SalaSection />
          </div>
        </section>

        <section className="container proposta__sec">
          <p className="eyebrow">O projeto</p>
          <h2 className="h2">A Mio pensada <span className="is-accent">para o seu espaço.</span></h2>
          <figure className="proposta__render">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/p/projeto.jpg" alt="Projeto da loja Mio para o condomínio: armário iluminado, geladeiras, gôndola e totem" width={1800} height={955} loading="lazy" />
            <figcaption>Projeto: Daniele Faustino Arquitetura &amp; Interiores · imagem ilustrativa</figcaption>
          </figure>
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
          <p className="proposta__nota">
            Quer ver como funciona a compra no totem? <Link href="/experiencia">Entre numa loja Mio de verdade em 3D</Link>.
          </p>
        </section>

        <section className="container proposta__sec proposta__final">
          <h2 className="h2">Gostou da <span className="is-accent">sua Mio?</span></h2>
          <p className="proposta__lead2">Fale com a gente para tirar dúvidas ou ajustar o projeto.</p>
          <a className="btn btn--primary" href={wa} target="_blank" rel="noopener">Falar no WhatsApp</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
