import { unidades, depoimentos } from "@/lib/content";
import { Fx, Reveal } from "./Reveal";

export function Unidades() {
  return (
    <section className="section unidades" id="unidades">
      <div className="container">
        <div className="section__head">
          <Reveal as="p" className="eyebrow" text="Nossas unidades" />
          <Reveal as="h2" className="h2" text={"Condomínios que já têm\numa Mio no hall."} accent={["Mio"]} />
          <Fx as="p" className="section__lead units__count" delay={150}>
            {unidades.length} condomínios em São José dos Campos e mais de{" "}
            {(Math.floor(unidades.reduce((t, u) => t + (u.unidades ?? 0), 0) / 100) * 100).toLocaleString("pt-BR")} apartamentos com uma Mio a poucos passos de casa.
          </Fx>
        </div>
        <ul className="units">
          {unidades.map((u, i) => (
            <Fx as="li" key={u.nome} className="unit" delay={(i % 8) * 50}>
              <span className="unit__pin" aria-hidden />
              <div>
                <strong>{u.nome}</strong>
                <span>{u.unidades ? `${u.unidades} apartamentos` : "São José dos Campos – SP"}</span>
              </div>
            </Fx>
          ))}
          <Fx as="li" className="unit unit--next" delay={150}>
            <a href="#contato">
              <strong>Seu condomínio aqui</strong>
              <span>Fale com a gente →</span>
            </a>
          </Fx>
        </ul>
      </div>
    </section>
  );
}

export function Depoimentos() {
  const d = depoimentos[0];
  if (!d) return null;
  return (
    <section className="section depo" aria-labelledby="depo-title">
      <div className="container depo__inner">
        <Reveal as="p" className="eyebrow" text="Quem tem, recomenda" />
        <h2 id="depo-title" className="sr-only">
          Depoimentos
        </h2>
        {depoimentos.map((x) => (
          <figure key={x.condominio} className="depo__item">
            {x.rascunho && <span className="draft-tag">rascunho: substituir pelo depoimento real</span>}
            <Reveal as="blockquote" className="depo__quote" text={`“${x.texto}”`} stagger={22} />
            <Fx as="figcaption" delay={300}>
              <strong>{x.autor}</strong> · {x.papel}, {x.condominio}
            </Fx>
          </figure>
        ))}
      </div>
    </section>
  );
}
