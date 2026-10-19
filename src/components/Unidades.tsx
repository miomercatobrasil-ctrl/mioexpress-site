"use client";

import { useEffect, useState } from "react";
import { unidades, depoimentos } from "@/lib/content";
import { Fx, Reveal } from "./Reveal";

export function Unidades() {
  return (
    <section className="section unidades" id="unidades">
      <div className="container">
        <div className="section__head">
          <Reveal as="p" className="eyebrow" text="Nossas unidades" />
          <Reveal as="h2" className="h2" text={"Condomínios que já têm\numa Mio."} accent={["Mio"]} />
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
                {u.unidades ? <span>{u.unidades} apartamentos</span> : null}
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
                <button key={x.condominio} type="button" role="tab" aria-selected={k === i} aria-label={x.condominio} className={k === i ? "is-on" : ""} onClick={() => go(k)} />
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
