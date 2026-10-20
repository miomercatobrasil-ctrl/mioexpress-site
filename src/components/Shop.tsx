"use client";

import { useEffect, useRef, useState } from "react";
import { sceneStore, useScene } from "@/scene/store";
import { whatsappLink } from "@/lib/site";
import { ga, track } from "@/lib/pixel";

// Simulação de compra no ambiente 3D: o visitante pega produtos das prateleiras (Products.tsx), vai ao
// totem, "passa" os itens e paga. Tudo simulado, sem valores: só mostra como é simples comprar na Mio.

let audio: AudioContext | null = null;
function beep(freq = 1850, ms = 90) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + ms / 1000 + 0.02);
  } catch {}
}

const itens = (n: number) => `${n} ${n === 1 ? "item" : "itens"}`;
const THUMBS = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/").replace(/models\/$/, "") + "textures/miniaturas/";

/** Agrupa os itens já passados por produto (foto + quantidade), na ordem em que apareceram. */
function group(list: { key: string; label: string }[]) {
  const out: { key: string; label: string; qty: number }[] = [];
  for (const c of list) {
    const g = out.find((o) => o.key === c.key);
    if (g) g.qty++;
    else out.push({ ...c, qty: 1 });
  }
  return out;
}

/** Tira uma unidade do produto da cesta (ela volta para a prateleira). */
function removeOne(key: string) {
  const cart = sceneStore.get().cart;
  const i = cart.map((c) => c.key).lastIndexOf(key);
  if (i < 0) return;
  const next = [...cart.slice(0, i), ...cart.slice(i + 1)];
  sceneStore.set({ cart: next, lastAdded: null, ...(next.length === 0 ? { checkout: "off" as const, active: null } : {}) });
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" />
      <circle cx="9.5" cy="20" r="1.2" />
      <circle cx="17.5" cy="20" r="1.2" />
    </svg>
  );
}

/** Barra da cesta (modo exploração): dica, contador, último produto e "Ir ao totem". */
export function CartBar() {
  const cart = useScene((s) => s.cart);
  const checkout = useScene((s) => s.checkout);
  const last = useScene((s) => s.lastAdded);
  const nudge = useScene((s) => s.nudge);
  const [bump, setBump] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (cart.length === 0) setOpen(false);
  }, [cart.length]);
  useEffect(() => {
    if (!last) return;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 1400);
    return () => window.clearTimeout(t);
  }, [last]);
  if (checkout !== "off") return null;
  const goTotem = () => {
    ga("experiencia_3d_totem", { itens: cart.length });
    sceneStore.set({ checkout: "scan", active: "totem", touring: false, hovered: null, lastInteraction: performance.now() });
  };
  return (
    <div className="shop-bar" role="status" aria-live="polite">
      {cart.length === 0 ? (
        <p key={nudge} className={`shop-bar__tip${nudge ? " is-nudge" : ""}`}>
          <span className="shop-bar__pulse">
            <CartIcon />
          </span>
          <span>
            <strong>{nudge ? "Agora é sua vez: experimente comprar" : "Experimente comprar"}</strong>
            <br />
            Toque nos produtos para colocar na cesta
          </span>
        </p>
      ) : (
        <>
          {open && (
            <ul className="shop-bar__list">
              {group(cart).map((c) => (
                <li key={c.key}>
                  <img src={`${THUMBS}${c.key}.webp`} alt="" width={28} height={28} />
                  <span>{c.label}</span>
                  <strong>{c.qty}×</strong>
                  <button type="button" aria-label={`Tirar ${c.label}`} onClick={() => removeOne(c.key)}>
                    −
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`shop-bar__count${bump ? " is-bump" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
            <CartIcon /> {itens(cart.length)} <span className="shop-bar__caret">{open ? "▾" : "▴"}</span>
          </button>
          <span key={last?.t} className="shop-bar__last">
            {cart.length >= 12 ? "Cesta cheia (12 itens)" : last ? `+ ${last.label}` : "Toque para ver a cesta"}
          </span>
          <button type="button" className="shop-bar__clear" aria-label="Esvaziar a cesta" title="Esvaziar a cesta" onClick={() => sceneStore.set({ cart: [], lastAdded: null })}>
            ×
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={goTotem}>
            Ir ao totem →
          </button>
        </>
      )}
    </div>
  );
}

/** Tela do totem (desenhada na própria tela do totem 3D, ver scene/TotemScreen.tsx): passar os produtos, escolher Pix ou cartão e compra concluída. */
export function Checkout() {
  const cart = useScene((s) => s.cart);
  const checkout = useScene((s) => s.checkout);
  const [scanned, setScanned] = useState(0);
  const [method, setMethod] = useState<"pix" | "cartao">("cartao");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (checkout !== "scan") return;
    setScanned(0);
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setScanned(i);
      beep();
      if (i >= sceneStore.get().cart.length) {
        window.clearInterval(id);
        window.setTimeout(() => sceneStore.get().checkout === "scan" && sceneStore.set({ checkout: "pay" }), 500);
      }
    }, 650);
    return () => window.clearInterval(id);
  }, [checkout]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [scanned]);

  useEffect(() => {
    if (checkout !== "paying") return;
    const t = window.setTimeout(() => {
      sceneStore.set({ checkout: "done" });
      ga("experiencia_3d_compra", { itens: sceneStore.get().cart.length, pagamento: method });
      beep(1400, 120);
      window.setTimeout(() => beep(2100, 160), 140);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [checkout]);

  if (checkout === "off") return null;
  const close = () => sceneStore.set({ checkout: "off", active: null, lastInteraction: performance.now() });
  const restart = () => sceneStore.set({ checkout: "off", active: null, cart: [], lastAdded: null, lastInteraction: performance.now() });
  const pay = (m: "pix" | "cartao") => {
    setMethod(m);
    sceneStore.set({ checkout: "paying" });
  };

  return (
    <div className="totem-screen" role="dialog" aria-label="Totem de autoatendimento">
      <div className="totem-screen__head">
        <img src="/brand/logo.svg" alt="Mio Express" width={120} height={34} />
        {checkout !== "done" && (
          <button type="button" className="totem-screen__close" aria-label="Fechar" onClick={close}>
            ×
          </button>
        )}
      </div>

      {(checkout === "scan" || checkout === "pay") && (
        <>
          <p className="totem-screen__title">{checkout === "scan" ? "Passando os produtos…" : "Tudo certo! Como quer pagar?"}</p>
          <ol ref={listRef} className="totem-screen__list">
            {group(cart.slice(0, checkout === "pay" ? cart.length : scanned)).map((c) => (
              <li key={c.key}>
                <img src={`${THUMBS}${c.key}.webp`} alt="" width={36} height={36} />
                <span className="totem-screen__name">{c.label}</span>
                <span key={c.qty} className="totem-screen__qty">
                  {c.qty}×
                </span>
                {checkout === "pay" && (
                  <button type="button" className="totem-screen__del" aria-label={`Tirar ${c.label}`} onClick={() => removeOne(c.key)}>
                    −
                  </button>
                )}
              </li>
            ))}
          </ol>
          <p className="totem-screen__total">
            Total: <strong>{itens(checkout === "pay" ? cart.length : scanned)}</strong>
          </p>
          {checkout === "pay" && (
            <div className="totem-screen__pay">
              <button type="button" className="btn btn--primary" onClick={() => pay("pix")}>
                Pix
              </button>
              <button type="button" className="btn btn--primary" onClick={() => pay("cartao")}>
                Cartão
              </button>
            </div>
          )}
        </>
      )}

      {checkout === "paying" && (
        <div className="totem-screen__center">
          <span className="totem-screen__spinner" aria-hidden />
          <p className="totem-screen__title">{method === "pix" ? "Lendo o QR Code Pix…" : "Aproxime ou insira o cartão…"}</p>
        </div>
      )}

      {checkout === "done" && (
        <div className="totem-screen__center">
          <span className="totem-screen__ok" aria-hidden>
            <svg viewBox="0 0 52 52" width="64" height="64">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-16" />
            </svg>
          </span>
          <p className="totem-screen__title">Compra concluída!</p>
          <p className="totem-screen__sub">Simples assim: pegou, passou, pagou. A qualquer hora, sem sair do condomínio.</p>
          <div className="totem-screen__pay">
            <a
              href={whatsappLink("Olá! Fiz uma compra na experiência Mio em 3D e quero uma Mio no meu condomínio.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
              onClick={() => track("Lead", { content_name: "experiencia_3d" })}
            >
              Quero uma Mio no meu condomínio
            </a>
            <button type="button" className="btn totem-screen__again" onClick={restart}>
              Comprar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Camada da tela do totem: posicionada e escalada pela cena (scene/TotemScreen.tsx). */
export function TotemOverlay() {
  const checkout = useScene((s) => s.checkout);
  if (checkout === "off") return null;
  return (
    <div className="totem-overlay">
      <Checkout />
    </div>
  );
}
