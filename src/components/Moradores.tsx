import Image from "next/image";
import { SITE } from "@/lib/site";
import { Fx, Reveal } from "./Reveal";
import { InstagramIcon } from "./Icons";
import { VideoCard } from "./VideoCard";

const BLOCKS = [
  {
    k: "Origem",
    title: "Um mercado a poucos passos de casa",
    text: "A Mio nasceu para levar um mini mercado moderno e seguro para dentro do condomínio. Precisou de algo? É só descer, sem pegar o carro e sem fila.",
  },
  {
    k: "Produtos",
    title: "Do café da manhã à faxina",
    text: "Bebidas geladas, snacks, mercearia, limpeza, higiene, sorvetes e itens do dia a dia, com reposição constante.",
  },
  {
    k: "Qualidade",
    title: "A extensão da sua despensa",
    text: "Trabalhamos com marcas e fornecedores conhecidos para você encontrar o que já usa em casa.",
  },
];

export function Moradores() {
  return (
    <section className="section moradores" id="moradores">
      <div className="container">
        <div className="section__head section__head--split">
          <div>
            <Reveal as="p" className="eyebrow" text="Para moradores" />
            <Reveal as="h2" className="h2" text={"Esqueceu alguma coisa?\nA Mio está aberta."} accent={["aberta"]} />
          </div>
          <Fx as="p" className="section__lead" delay={200}>
            Aberto 24 horas, todos os dias. Você escolhe, passa o código no totem e paga em segundos, sem atendente e sem espera.
          </Fx>
        </div>

        <div className="cards3">
          {BLOCKS.map((b, i) => (
            <Fx as="article" key={b.k} className="card" delay={i * 110}>
              <p className="card__k">{b.k}</p>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </Fx>
          ))}
        </div>

        <div className="gallery gallery--video">
          <Fx variant="scale" className="gallery__video">
            <VideoCard src="/video/institucional.mp4" poster="/video/institucional.jpg" label="Vídeo: moradora compra na Mio Express à noite, dentro do condomínio" />
          </Fx>
          <Fx variant="img" className="gallery__item gallery__item--tall">
            <Image src="/images/loja-detalhe.webp" alt="Prateleiras com snacks, mercearia, café e produtos de limpeza" fill sizes="(max-width: 900px) 100vw, 50vw" quality={70} />
          </Fx>
          <Fx variant="img" className="gallery__item" delay={120}>
            <Image src="/images/freezer-geladeira.webp" alt="Freezer de sorvetes e geladeira Mio Express com congelados" fill sizes="(max-width: 900px) 100vw, 25vw" quality={70} />
          </Fx>
          <Fx className="gallery__insta" delay={220}>
            <InstagramIcon size={28} />
            <p>Novidades, produtos novos e promoções da sua unidade.</p>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--sm">
              Seguir {SITE.instagramHandle}
            </a>
          </Fx>
        </div>
      </div>
    </section>
  );
}
