"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE, whatsappLink } from "@/lib/site";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function Footer() {
  const a = SITE.address;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cta">
          <Reveal as="p" className="footer__big" text={"Leve a Mio para\no seu condomínio."} accent={["Mio"]} />
          <a href="/#contato" className="btn btn--light">
            Quero no meu condomínio
          </a>
        </div>
        <div className="footer__grid">
          <div>
            <img src="/brand/logo-white.svg" alt="Mio Express mini mercado" width={170} height={48} className="footer__logo" />
            <p className="footer__muted">Mini mercado autônomo 24h dentro de condomínios em São José dos Campos – SP.</p>
          </div>
          <div>
            <p className="footer__h">Contato</p>
            <ul className="footer__list">
              <li>
                <a href={whatsappLink("Olá! Vim pelo site da Mio Express.")} target="_blank" rel="noopener noreferrer" className="link-sweep">
                  <WhatsAppIcon size={16} /> {SITE.whatsappDisplay}
                </a>
              </li>
              <li>
                <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="link-sweep">
                  <InstagramIcon size={16} /> {SITE.instagramHandle}
                </a>
              </li>
              <li>
                <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className="link-sweep">
                  <FacebookIcon size={16} /> Facebook
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="footer__h">Empresa</p>
            <address className="footer__muted">
              {SITE.legalName}
              <br />
              CNPJ {SITE.cnpj}
              <br />
              {a.street}, {a.district}
              <br />
              {a.city} – {a.state}, CEP {a.zip}
            </address>
          </div>
        </div>
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Mio Express. Todos os direitos reservados.</p>
          <p>Projeto de ambientação: {SITE.architectCredit}</p>
          <Link href="/privacidade" className="link-sweep">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat() {
  // celular: barra fixa com WhatsApp + "Quero no meu condomínio" depois do topo; computador: botão flutuante
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => {
      const contato = document.getElementById("contato");
      const nearForm = contato ? Math.abs(contato.getBoundingClientRect().top) < window.innerHeight * 0.9 : false;
      setShow(window.scrollY > window.innerHeight * 0.7 && !nearForm);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <a className="wa-float" href={whatsappLink("Olá! Vim pelo site da Mio Express.")} target="_blank" rel="noopener noreferrer" aria-label="Falar com a Mio Express no WhatsApp">
        <WhatsAppIcon size={26} />
      </a>
      <div className={`mobile-bar${show ? " is-visible" : ""}`} aria-hidden={!show}>
        <a href={whatsappLink("Olá! Vim pelo site da Mio Express.")} target="_blank" rel="noopener noreferrer" className="mobile-bar__wa" aria-label="WhatsApp" tabIndex={show ? 0 : -1}>
          <WhatsAppIcon size={22} />
        </a>
        <a href="/#contato" className="btn btn--primary mobile-bar__cta" tabIndex={show ? 0 : -1}>
          Quero no meu condomínio
        </a>
      </div>
    </>
  );
}
