"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { HOTSPOTS, TOUR_ORDER } from "@/scene/layout";
import { sceneStore, useScene } from "@/scene/store";
import { Reveal } from "./Reveal";
import { CartBar, TotemOverlay } from "./Shop";

/** Se o 3D falhar (WebGL, rede, modelo), a página segue normal e mostra a foto no lugar. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error("[mio] cena 3D desativada:", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const iconProps = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function DiagPanel() {
  const [on, setOn] = useState(false);
  const [, tick] = useState(0);
  const thumbs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const check = () => setOn(location.hash.includes("debug3d"));
    check();
    window.addEventListener("hashchange", check);
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      window.removeEventListener("hashchange", check);
      window.clearInterval(id);
    };
  }, []);
  const [d, setD] = useState<typeof import("@/scene/diag") | null>(null);
  useEffect(() => {
    if (on) import("@/scene/diag").then(setD);
  }, [on]);
  useEffect(() => {
    const el = thumbs.current;
    if (!el || !d) return;
    el.innerHTML = "";
    d.diag.samples.forEach((b) => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      c.style.cssText = "background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/12px 12px;margin-right:4px";
      c.getContext("2d")?.drawImage(b, 0, 0, 64, 64);
      el.appendChild(c);
    });
  });
  if (!on || !d) return null;
  const x = d.diag;
  return (
    <div style={{ position: "absolute", left: 12, top: 90, zIndex: 9, background: "rgba(0,0,0,.8)", color: "#fff", font: "12px/1.5 monospace", padding: 12, borderRadius: 8, maxWidth: 420 }}>
      <div>build {d.BUILD_TAG} · modelo: {x.model}</div>
      <div>texturas ok {x.texOk} · falhas {x.texFail}</div>
      <div>lightmaps ok {x.lmOk} · falhas {x.lmFail} · materiais {x.lmPatched} · shaders {x.lmCompiled} · assada {String(sceneStore.get().baked)}</div>
      <div>sonda luz assada: {x.lmProbe || "…"}</div>
      <div>gpu: {x.gpu}</div>
      <div style={{ wordBreak: "break-all" }}>{navigator.userAgent.slice(0, 120)}</div>
      {x.errors.map((e, i) => (
        <div key={i} style={{ color: "#ffb4b4" }}>
          {e}
        </div>
      ))}
      <div ref={thumbs} style={{ marginTop: 6 }} />
    </div>
  );
}

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
  const checkout = useScene((s) => s.checkout);
  const active = useScene((s) => (checkout === "off" ? s.active : null));
  const touring = useScene((s) => s.touring);
  const night = useScene((s) => s.night);
  const led = useScene((s) => s.led);
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
  const night = useScene((s) => s.night);
  const led = useScene((s) => s.led);
  const progress = useScene((s) => s.introProgress);
  const checkout = useScene((s) => s.checkout);

  useEffect(() => {
    setSupport(detectSupport());
    setMobile(window.matchMedia("(max-width: 760px), (pointer: coarse)").matches);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // prepara a cena cedo, com a página parada no topo (o trabalho pesado do 3D não cai no meio da rolagem),
  // ou antes disso se a seção chegar perto da tela
  useEffect(() => {
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500);
    const t = window.setTimeout(() => idle(() => setLoad(true)), 1500);
    return () => window.clearTimeout(t);
  }, []);
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
    sceneStore.set({ mode: "intro", active: null, touring: false, hovered: null, checkout: "off" });
    const next = document.getElementById("como-funciona");
    next?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  const show3D = (support === "ok" || (support === "weak" && force)) && load;
  const showFallback = support === "none" || (support === "weak" && !force);

  return (
    <section id="ambiente" ref={wrapRef} className={`ambiente${mode === "explore" ? " is-explore" : ""}${showFallback ? " is-fallback" : ""}`} aria-label="Ambiente 3D interativo">
      <div className="scene-stage">
        {show3D ? (
          <>
            <SceneBoundary
              fallback={
                <div className="scene-fallback">
                  <Image src="/images/loja-angulo.webp" alt="Mini mercado Mio Express instalado em um condomínio" fill sizes="100vw" quality={70} />
                </div>
              }
            >
              <div className={`scene-gl${mode === "explore" ? " is-interactive" : ""}`}>
                <Experience mobile={mobile} reducedMotion={reduced} running={visible} />
              </div>
            </SceneBoundary>
            <Loader />
          </>
        ) : (
          <div className="scene-fallback">
            <Image src="/images/loja-angulo.webp" alt="Mini mercado Mio Express instalado em um condomínio" fill sizes="100vw" quality={70} />
          </div>
        )}

        <DiagPanel />
        <div className="scene-ui">
          <div className={`scene-intro${mode === "intro" ? " is-visible" : ""}`} style={{ opacity: mode === "intro" ? Math.max(0, 1 - progress * 1.6) : 0 }}>
            <Reveal as="p" className="eyebrow eyebrow--pill" text="Ambiente 3D" />
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
              <div className={`scene-actions${checkout !== "off" ? " is-hidden" : ""}`}>
                <button
                  type="button"
                  className={`btn btn--light btn--sm${touring ? " is-on" : ""}`}
                  onClick={() => sceneStore.set({ touring: !touring, interacted: true, active: touring ? null : sceneStore.get().active })}
                >
                  {touring ? "Parar tour" : "▶ Fazer tour"}
                </button>
                <button
                  type="button"
                  className={`btn btn--light btn--sm btn--icon${night ? " is-on" : ""}`}
                  aria-pressed={night}
                  onClick={() => sceneStore.set({ night: !night, interacted: true, lastInteraction: performance.now() })}
                >
                  {night ? <SunIcon /> : <MoonIcon />} {night ? "Dia" : "Anoitecer"}
                </button>
                <button
                  type="button"
                  className={`btn btn--light btn--sm btn--icon${led ? " is-on" : ""}`}
                  aria-pressed={led}
                  onClick={() => sceneStore.set({ led: !led, interacted: true, lastInteraction: performance.now() })}
                >
                  <BulbIcon /> LED {led ? "aceso" : "apagado"}
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
              <div className={`scene-hint scene-hint--raised${interacted ? " is-hidden" : ""}`} aria-hidden>
                <span className="scene-hint__icon" />
                {mobile ? "Arraste para explorar · pinça para zoom" : "Arraste para explorar · Ctrl + rolagem para zoom"}
              </div>
              <Card />
              <CartBar />
              <TotemOverlay />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
