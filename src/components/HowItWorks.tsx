import { Fx, Reveal } from "./Reveal";

const STEPS = [
  { n: "01", title: "Escolha", text: "Pegue o que precisar nas prateleiras e geladeiras, no seu tempo e do seu jeito." },
  { n: "02", title: "Passe o código", text: "Aproxime o código de barras de cada produto do leitor do totem." },
  // CONFIRMAR formas de pagamento aceitas no totem
  { n: "03", title: "Pague no totem", text: "Pague com cartão, por aproximação ou chip. Pronto, compra concluída em segundos." },
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
              <span className="how__n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Fx>
          ))}
        </ol>
      </div>
    </section>
  );
}
