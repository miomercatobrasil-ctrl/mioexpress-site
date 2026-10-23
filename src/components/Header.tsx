"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { SITE, whatsappLink } from "@/lib/site";
import { sceneStore } from "@/scene/store";
import { InstagramIcon, WhatsAppIcon } from "./Icons";

const NAV = [
  { href: "/#ambiente", label: "Ambiente 3D" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#sindicos", label: "Para síndicos" },
  { href: "/#moradores", label: "Para moradores" },
  { href: "/#unidades", label: "Unidades" },
  { href: "/#duvidas", label: "Dúvidas" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  // logo: sempre volta ao início (também já estando na página inicial, ou explorando o 3D)
  const goHome = (e: React.MouseEvent) => {
    close();
    sceneStore.set({ mode: "intro", introProgress: 0, active: null, touring: false, hovered: null, checkout: "off" });
    if (window.location.pathname !== "/") return;
    e.preventDefault();
    history.replaceState(null, "", "/");
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <header className={`header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="container header__row">
        <Link href="/" className="header__logo" aria-label="Mio Express — início" onClick={goHome}>
          <img src="/brand/logo.svg" alt="Mio Express mini mercado" width={150} height={42} className="header__logo-red" />
          <img src="/brand/logo-white.svg" alt="" width={150} height={42} className="header__logo-white" aria-hidden />
        </Link>
        <div className="header__actions">
          <a href="/#duvidas" className="header__link link-sweep" onClick={close}>
            Dúvidas frequentes
          </a>
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="header__insta" aria-label={`Instagram ${SITE.instagramHandle}`}>
            <InstagramIcon size={20} />
          </a>
          <a href="/#contato" className="btn btn--primary btn--sm header__cta" onClick={close}>
            Quero no meu condomínio
          </a>
          <button type="button" className="header__menu" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
            <span className="header__menu-label">
              <span>Menu</span>
              <span>Fechar</span>
            </span>
            <span className="header__menu-icon" aria-hidden>
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <div id="menu" className="menu" aria-hidden={!open} inert={!open}>
        <div className="container menu__grid">
          <nav className="menu__nav" aria-label="Seções">
            {NAV.map((n, i) => (
              <a key={n.href} href={n.href} onClick={close} style={{ "--i": i } as CSSProperties}>
                <span className="menu__n">{String(i + 1).padStart(2, "0")}</span>
                <span className="menu__label">{n.label}</span>
              </a>
            ))}
          </nav>
          <aside className="menu__side" style={{ "--i": NAV.length } as CSSProperties}>
            <p className="menu__h">Fale com a gente</p>
            <a href={whatsappLink("Olá! Vim pelo site da Mio Express.")} target="_blank" rel="noopener noreferrer" className="menu__contact">
              <WhatsAppIcon size={18} /> {SITE.whatsappDisplay}
            </a>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="menu__contact">
              <InstagramIcon size={18} /> {SITE.instagramHandle}
            </a>
            <a href="/#contato" className="btn btn--light menu__cta" onClick={close}>
              Quero no meu condomínio
            </a>
            <p className="menu__note">Mini mercado autônomo 24h dentro do condomínio. Implantação gratuita.</p>
          </aside>
        </div>
      </div>
    </header>
  );
}
