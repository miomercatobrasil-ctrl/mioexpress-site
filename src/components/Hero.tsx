import Image from "next/image";
import { Fx, Reveal } from "./Reveal";
import { ArrowIcon } from "./Icons";
import { unidades } from "@/lib/content";
import { CountUp } from "./CountUp";

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="container hero__grid">
        <div className="hero__copy">
          <Reveal as="p" className="eyebrow" text="Mini mercado autônomo · 24h" once />
          <Reveal as="h1" className="hero__title" text={"Um mini mercado 24h\ndentro do seu condomínio."} accent={["24h"]} delay={120} stagger={55} once />
          <Fx as="p" className="hero__lead" delay={650} once>
            A Mio instala, abastece e cuida de tudo. Para o condomínio, custo zero. Para quem mora, a despensa a poucos passos de
            casa, a qualquer hora.
          </Fx>
          <Fx className="hero__actions" delay={800} once>
            <a href="#contato" className="btn btn--primary">
              Quero no meu condomínio <ArrowIcon />
            </a>
            <a href="#moradores" className="btn btn--ghost">
              Sou morador
            </a>
          </Fx>
          <Fx as="ul" className="hero__facts" delay={950} once>
            <li>
              <strong><CountUp to={24} suffix="h" delay={1400} /></strong> aberto todos os dias
            </li>
            <li>
              <strong>R$ 0</strong> de implantação
            </li>
            <li>
              <strong><CountUp to={unidades.length} suffix=" condomínios" delay={1550} /></strong> já atendidos
            </li>
          </Fx>
        </div>
        <Fx variant="img" className="hero__media" delay={200} once>
          <Image
            src="/images/loja-frente.webp"
            alt="Armário Mio Express com prateleiras iluminadas, produtos e totem de autoatendimento"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 46vw"
            quality={80}
          />
          <div className="hero__badge">
            <span className="pulse" /> Aberto agora · 24h
          </div>
        </Fx>
      </div>
      <a href="#ambiente" className="hero__scroll" aria-label="Rolar para o ambiente 3D">
        <span />
      </a>
    </section>
  );
}
