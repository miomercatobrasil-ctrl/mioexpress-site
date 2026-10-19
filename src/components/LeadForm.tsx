"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { whatsappLink } from "@/lib/site";
import { track } from "@/lib/pixel";
import { WhatsAppIcon } from "./Icons";

const UNIDADES = ["Até 50", "50 a 150", "150 a 300", "Mais de 300"];
const CARGOS = ["Síndico(a)", "Administradora", "Conselheiro(a)", "Morador(a)"];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function LeadForm() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nome = String(f.get("nome") || "").trim();
    const condominio = String(f.get("condominio") || "").trim();
    const unidades = String(f.get("unidades") || "");
    const cargo = String(f.get("cargo") || "");
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Informe um WhatsApp com DDD.");
      return;
    }
    setError("");
    const msg = [
      "Olá! Quero a Mio Express no meu condomínio.",
      "",
      `Nome: ${nome}`,
      `WhatsApp: ${phone}`,
      `Condomínio: ${condominio}`,
      `Nº de unidades: ${unidades}`,
      `Cargo: ${cargo}`,
    ].join("\n");
    track("Lead", { content_name: "Formulário síndicos", unidades, cargo });
    window.open(whatsappLink(msg), "_blank", "noopener");
    setSent(true);
  };

  return (
    <form className={`lead${sent ? " is-sent" : ""}`} onSubmit={submit} noValidate={false}>
      <div className="lead__grid">
        <label className="field">
          <span>Seu nome</span>
          <input name="nome" required autoComplete="name" placeholder="Seu nome" />
        </label>
        <label className="field">
          <span>WhatsApp</span>
          <input
            name="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(12) 90000-0000"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />
        </label>
        <label className="field field--full">
          <span>Condomínio</span>
          <input name="condominio" required placeholder="Nome do condomínio e bairro" />
        </label>
        <label className="field">
          <span>Nº de unidades</span>
          <select name="unidades" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {UNIDADES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Você é</span>
          <select name="cargo" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {CARGOS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="lead__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block">
        <WhatsAppIcon /> Enviar pelo WhatsApp
      </button>
      <p className="lead__legal">
        Ao enviar, abrimos uma conversa no WhatsApp com seus dados preenchidos. Veja nossa <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      {sent && (
        <p className="lead__ok" role="status">
          Pronto! Se o WhatsApp não abriu, <a href={whatsappLink("Olá! Quero a Mio Express no meu condomínio.")}>toque aqui</a>.
        </p>
      )}
    </form>
  );
}
