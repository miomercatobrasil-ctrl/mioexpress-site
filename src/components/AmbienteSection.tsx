"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HOTSPOTS, TOUR_ORDER } from "@/scene/layout";
import { sceneStore, useScene } from "@/scene/store";
import { Reveal } from "./Reveal";

const Experience = dynamic(() => import("@/scene/Experience"), { ssr: false });

type Support = "checking" | "ok" | "weak" | "none";

function detectSupport(): Support {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return "none";
  } catch {
    return "none";
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const lowMem = nav.deviceMemory !== undefined && nav.deviceMemory <= 2;
  const lowCpu = nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2;
  if (lowMem || lowCpu || nav.connection?.saveData) return "weak";
  return "ok";
}

function Loader() {
  const progress = useScene((s) => s.loadProgress);
  const ready = useScene((s) => s.ready);
  return (
    <div className={`scene-loader${ready ? " is-done" : ""}`} aria-hidden={ready}>
      <img src="/brand/logo.svg" alt="" width={180} height={51} />
      <div className="scene-loader__bar">
        <span style={{ transform: `scaleX(${ready ? 1 : Math.max(0.08, progress / 100)})` }} />
      </div>
      <p>Montando o ambiente…</p>
    </div>
  );
}

function Card() {
  const active = useScene((s) => s.active);
  const touring = useScene((s) => s.touring);
  const h = HOTSPOTS.find((x) => x.id === active);
  const step = active ? TOUR_ORDER.indexOf(active) : -1;
  return (
    <div className={`scene-card${h ? " is-open" : ""}`} role="dialog" aria-live="polite" aria-hidden={!h}>
      {h && (
        <div key={h.id} className="scene-card__inner">
          {touring && (
            <p className="scene-card__step">
              Tour {step + 1}/{TOUR_ORDER.length}
            </p>
          )}
          <h3>{h.title}</h3>
          <p>{h.text}</p>
          <div className="scene-card__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => sceneStore.set({ active: null, touring: false, lastInteraction: performance.now() })}>
              ← Voltar à visão geral
            </button>
            {touring && step < TOUR_ORDER.length - 1 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => sceneStore.set({ touring: false })}>
                Parar tour
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AmbienteSection() {
  const wrapRef = useRef<HTMLElement>(null);
  const [support, setSupport] = useState<Support>("checking");
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [force, setForce] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [reduced, setReduced] = useState(false);
  const mode = useScene((s) => s.mode);
  const interacted = useScene((s) => s.interacted);
  const touring = useScene((s) => s.touring);
  const progress = useScene((s) => s.introProgress);

  useEffect(() => {
    setSupport(detectSupport());
    setMobile(window.matchMedia("(max-width: 760px), (pointer: coarse)").matches);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // carrega a cena só quando a seção estiver chegando na tela
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // pausa o render quando a seção sai da tela
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // progresso da rolagem na seção alta -> câmera da abertura
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / (total * 0.8)));
        if (sceneStore.get().mode === "intro") sceneStore.set({ introProgress: p });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Esc volta para a visão geral / sai do modo exploração
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = sceneStore.get();
      if (s.active) sceneStore.set({ active: null, touring: false });
      else if (s.mode === "explore") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const explore = () => {
    sceneStore.set({ mode: "explore", introProgress: 1, lastInteraction: performance.now() });
    const el = wrapRef.current;
    if (el) {
      // posiciona a rolagem no fim do trajeto para o palco ficar fixo na tela
      const top = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight);
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    }
  };
  function exit() {
    sceneStore.set({ mode: "intro", active: null, touring: false, hovered: null });
    const next = document.getElementById("como-funciona");
    next?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  const show3D = (support === "ok" || (support === "weak" && force)) && load;
  const showFallback = support === "none" || (support === "weak" && !force);

  return (
    <section id="ambiente" ref={wrapRef} className={`ambiente${mode === "explore" ? " is-explore" : ""}`} aria-label="Ambiente 3D interativo">
      <div className="scene-stage">
        {show3D ? (
          <>
            <div className={`scene-gl${mode === "explore" ? " is-interactive" : ""}`}>
              <Experience mobile={mobile} reducedMotion={reduced} running={visible} />
            </div>
            <Loader />
          </>
        ) : (
          <div className="scene-fallback">
            <Image src="/images/loja-angulo.webp" alt="Mini mercado Mio Express instalado no hall de um condomínio" fill sizes="100vw" quality={70} />
          </div>
        )}

        <div className="scene-ui">
          <div className={`scene-intro${mode === "intro" ? " is-visible" : ""}`} style={{ opacity: mode === "intro" ? Math.max(0, 1 - progress * 1.6) : 0 }}>
            <Reveal as="p" className="eyebrow eyebrow--light" text="Ambiente 3D" />
            <Reveal as="h2" className="scene-title" text="Entre e conheça uma unidade Mio." />
            <p className="scene-sub">Role para entrar pelo jardim ou explore livremente.</p>
          </div>

          {showFallback && (
            <div className="scene-fallback__cta">
              <p>{support === "none" ? "Seu navegador não suporta o ambiente 3D." : "Para economizar bateria e dados, mostramos uma foto."}</p>
              {support === "weak" && (
                <button type="button" className="btn btn--light" onClick={() => setForce(true)}>
                  Ver em 3D mesmo assim
                </button>
              )}
            </div>
          )}

          {show3D && mode === "intro" && (
            <div className="scene-actions scene-actions--intro">
              <button type="button" className="btn btn--primary" onClick={explore}>
                Explorar o ambiente
              </button>
            </div>
          )}

          {show3D && mode === "explore" && (
            <>
              <div className="scene-actions">
                <button
                  type="button"
                  className={`btn btn--light btn--sm${touring ? " is-on" : ""}`}
                  onClick={() => sceneStore.set({ touring: !touring, interacted: true, active: touring ? null : sceneStore.get().active })}
                >
                  {touring ? "Parar tour" : "▶ Fazer tour"}
                </button>
                <div className="scene-zoom" role="group" aria-label="Zoom">
                  <button type="button" aria-label="Aproximar" onClick={() => sceneStore.set({ zoomRequest: sceneStore.get().zoomRequest + 1 })}>
                    +
                  </button>
                  <button type="button" aria-label="Afastar" onClick={() => sceneStore.set({ zoomRequest: sceneStore.get().zoomRequest - 1 })}>
                    −
                  </button>
                </div>
                <button type="button" className="btn btn--light btn--sm" onClick={exit}>
                  Continuar ↓
                </button>
              </div>
              <div className={`scene-hint${interacted ? " is-hidden" : ""}`} aria-hidden>
                <span className="scene-hint__icon" />
                {mobile ? "Arraste para explorar · pinça para zoom" : "Arraste para explorar · Ctrl + rolagem para zoom"}
              </div>
              <Card />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
