import { Fx, Reveal } from "./Reveal";
import { LeadForm } from "./LeadForm";
import { VideoCard } from "./VideoCard";

const BENEFITS = [
  { title: "Implantação gratuita", text: "Instalamos mobiliário, geladeiras e totem sem custo para o condomínio." },
  { title: "Sem custo de manutenção", text: "Manutenção dos equipamentos e suporte ficam por nossa conta." },
  { title: "Abastecimento por nossa conta", text: "Repomos os produtos com frequência, de acordo com o que os moradores mais compram." },
  { title: "Valoriza o condomínio", text: "Uma comodidade 24h que os moradores usam todo dia e que valoriza o empreendimento." },
];

export function Sindicos() {
  return (
    <section className="section sindicos" id="sindicos">
      <div className="container">
        <div className="sindicos__grid">
          <div className="sindicos__copy">
            <Reveal as="p" className="eyebrow eyebrow--light" text="Para síndicos e administradoras" />
            <Reveal as="h2" className="h2 h2--light" text={"Mais conveniência para os moradores.\nZero trabalho para você."} accent={["Zero"]} />
            <ul className="benefits">
              {BENEFITS.map((b, i) => (
                <Fx as="li" key={b.title} className="benefit" delay={i * 90}>
                  <span className="benefit__n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.text}</p>
                  </div>
                </Fx>
              ))}
            </ul>
            <Fx className="sindicos__video">
              <VideoCard src="/video/sindicos.mp4" poster="/video/sindicos.jpg" label="Vídeo: carro da Mio Express e geladeiras instaladas em condomínio" />
              <div className="sindicos__video-text">
                <p className="eyebrow eyebrow--light">Equipe própria</p>
                <h3>Abastecimento pelo time da Mio</h3>
                <p>Um sistema de gestão acompanha o consumo de cada unidade, e a reposição é feita pela nossa equipe, de forma independente e discreta. Empresa local de São José dos Campos, com suporte rápido.</p>
              </div>
            </Fx>
          </div>
          <Fx className="sindicos__form" variant="scale">
            <div id="contato" className="anchor" />
            <h3 className="form-title">Quero no meu condomínio</h3>
            <p className="form-sub">Conte um pouco sobre o condomínio. Respondemos pelo WhatsApp.</p>
            <LeadForm />
          </Fx>
        </div>
      </div>
    </section>
  );
}
