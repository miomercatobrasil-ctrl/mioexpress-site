import { Fx, Reveal } from "./Reveal";

const STEPS = [
  { n: "01", title: "Escolha", text: "Escolha os produtos que quiser nas prateleiras e geladeiras, no seu tempo e do seu jeito." },
  { n: "02", title: "Passe o código", text: "Passe o código de barras de cada produto no leitor do totem para registrar a compra." },
  // CONFIRMAR formas de pagamento aceitas no totem
  { n: "03", title: "Pague no totem", text: "Pague inserindo ou aproximando o cartão. Pronto! Sua compra foi concluída em segundos." },
];

export function HowItWorks() {
  return (
    <section className="section how" id="como-funciona">
      <div className="container">
        <div className="section__head">
          <Reveal as="p" className="eyebrow" text="Como funciona" />
          <Reveal as="h2" className="h2" text={"Comprar leva menos tempo\nque esperar o elevador."} accent={["elevador"]} />
        </div>
        <ol className="how__steps">
          {STEPS.map((s, i) => (
            <Fx as="li" key={s.n} className="how__step" delay={i * 120}>
              <span className="how__badge" aria-hidden>
                <svg viewBox="0 0 100 100">
                  <circle className="how__ring-base" cx="50" cy="50" r="47" />
                  <circle className="how__ring" cx="50" cy="50" r="47" pathLength="1" />
                </svg>
                <span className="how__n">{s.n}</span>
              </span>
              <div className="how__body">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </Fx>
          ))}
        </ol>
      </div>
    </section>
  );
}
