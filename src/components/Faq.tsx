"use client";

import { useState } from "react";
import { faq } from "@/lib/content";
import { Fx, Reveal } from "./Reveal";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section faq" id="duvidas" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="faq__head">
          <Reveal as="p" className="eyebrow" text="Dúvidas frequentes" />
          <Reveal as="h2" className="h2" text={"O que os síndicos\nperguntam pra gente."} accent={["síndicos"]} />
          <Fx as="p" className="section__lead" delay={150}>
            Ficou alguma dúvida? Fale com a gente pelo WhatsApp, respondemos rápido.
          </Fx>
          <h2 id="faq-title" className="sr-only">
            Dúvidas frequentes
          </h2>
        </div>
        <ul className="faq__list">
          {faq.map((item, i) => {
            const isOpen = open === i;
            return (
              <Fx as="li" key={item.q} className={`faq__item${isOpen ? " is-open" : ""}`} delay={(i % 5) * 60}>
                <button type="button" className="faq__q" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span>{item.q}</span>
                  <span className="faq__icon" aria-hidden />
                </button>
                <div className="faq__a" id={`faq-${i}`} role="region">
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </Fx>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
