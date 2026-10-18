import { unidades, depoimentos } from "@/lib/content";
import { Fx, Reveal } from "./Reveal";

export function Unidades() {
  return (
    <section className="section unidades" id="unidades">
      <div className="container">
        <div className="section__head">
          <Reveal as="p" className="eyebrow" text="Nossas unidades" />
          <Reveal as="h2" className="h2" text={"Condomínios que já têm\numa Mio no hall."} accent={["Mio"]} />
        </div>
        <ul className="units">
          {unidades.map((u, i) => (
            <Fx as="li" key={u.nome} className="unit" delay={i * 70}>
              <span className="unit__pin" aria-hidden />
              <div>
                <strong>{u.nome}</strong>
                <span>{u.bairro ?? "São José dos Campos – SP"}</span>
              </div>
            </Fx>
          ))}
          <Fx as="li" className="unit unit--next" delay={unidades.length * 70}>
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
