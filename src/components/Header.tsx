"use client";

import Link from "next/link";
import { SITE } from "@/lib/site";
import { InstagramIcon } from "./Icons";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/#ambiente", label: "Ambiente 3D" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#sindicos", label: "Para síndicos" },
  { href: "/#moradores", label: "Para moradores" },
  { href: "/#unidades", label: "Unidades" },
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
  }, [open]);

  return (
    <header className={`header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="container header__row">
        <Link href="/" className="header__logo" aria-label="Mio Express — início" onClick={() => setOpen(false)}>
          <img src="/brand/logo.svg" alt="Mio Express mini mercado" width={150} height={42} />
        </Link>
        <nav className="header__nav" aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="link-sweep" onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
        </nav>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="header__insta" aria-label={`Instagram ${SITE.instagramHandle}`}>
          <InstagramIcon size={20} />
        </a>
        <a href="/#contato" className="btn btn--primary btn--sm header__cta" onClick={() => setOpen(false)}>
          Quero no meu condomínio
        </a>
        <button type="button" className="header__burger" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
