"use client";

import { useEffect, useState } from "react";
import { unidades, depoimentos, MORADORES_POR_APTO } from "@/lib/content";
import { CountUp } from "./CountUp";
import { Fx, Reveal } from "./Reveal";

const apartamentos = unidades.reduce((t, u) => t + (u.apartamentos ?? 0), 0);
// números arredondados para baixo ("mais de"): apartamentos de 100 em 100, moradores de mil em mil
const NUMEROS = [
  { valor: unidades.length, prefixo: "", rotulo: "condomínios atendidos" },
  { valor: Math.floor(apartamentos / 100) * 100, prefixo: "+", rotulo: "apartamentos com uma Mio" },
  { valor: Math.floor((apartamentos * MORADORES_POR_APTO) / 1000) * 1000, prefixo: "+", rotulo: "moradores atendidos (estimativa)" },
];

export function Unidades() {
  return (
    <section className="section unidades" id="unidades">
      <div className="container">
        <div className="section__head">
          <Reveal as="p" className="eyebrow" text="Nossas unidades" />
          <Reveal as="h2" className="h2" text={"Condomínios que já têm\numa Mio."} accent={["Mio"]} />
          <Fx as="p" className="section__lead units__count" delay={150}>
            Em São José dos Campos, com uma Mio a poucos passos de casa, 24 horas por dia.
          </Fx>
        </div>
        <ul className="units units--stats">
          {NUMEROS.map((n, i) => (
            <Fx as="li" key={n.rotulo} className="unit unit--stat" delay={i * 90}>
              <strong>
                <CountUp to={n.valor} prefix={n.prefixo} delay={300 + i * 120} />
              </strong>
              <span>{n.rotulo}</span>
            </Fx>
          ))}
          <Fx as="li" className="unit unit--next" delay={300}>
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
  const lista = depoimentos.filter((x) => !x.rascunho);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || lista.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % lista.length), 9000);
    return () => window.clearTimeout(t);
  }, [i, paused, lista.length]);
  if (!lista.length) return null;
  const d = lista[i];
  const go = (n: number) => setI((n + lista.length) % lista.length);
  return (
    <section className="section depo" aria-labelledby="depo-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="container depo__inner">
        <Reveal as="p" className="eyebrow" text="Quem tem, recomenda" />
        <h2 id="depo-title" className="sr-only">
          Depoimentos de síndicos
        </h2>
        <figure className="depo__card" key={i} aria-live="polite">
          <div className="depo__stars" aria-label="5 de 5 estrelas">
            {"★★★★★".split("").map((s, k) => (
              <span key={k} style={{ animationDelay: `${k * 70}ms` }}>
                {s}
              </span>
            ))}
          </div>
          <Reveal as="blockquote" className="depo__quote" text={`“${d.destaque}”`} stagger={40} once />
          <p className="depo__text">{d.texto}</p>
          <figcaption>
            <strong>{d.condominio}</strong>
            {d.autor ? ` · ${d.autor}` : ""}
          </figcaption>
        </figure>
        {lista.length > 1 && (
          <div className="depo__nav">
            <button type="button" className="depo__arrow" aria-label="Depoimento anterior" onClick={() => go(i - 1)}>
              ←
            </button>
            <div className="depo__dots" role="tablist">
              {lista.map((x, k) => (
                <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Depoimento ${k + 1}`} className={k === i ? "is-on" : ""} onClick={() => go(k)} />
              ))}
            </div>
            <button type="button" className="depo__arrow" aria-label="Próximo depoimento" onClick={() => go(i + 1)}>
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
