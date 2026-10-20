import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AmbienteSection } from "@/components/AmbienteSection";

export const metadata: Metadata = {
  title: "Experiência Mio em 3D",
  description: "Entre em uma unidade Mio Express em 3D, conheça o mini mercado e experimente comprar no totem.",
  alternates: { canonical: "/experiencia" },
};

// Página do QR code: só o ambiente 3D, em tela cheia, entrando direto na loja.
export default function Experiencia() {
  return (
    <>
      <Header />
      <main>
        <AmbienteSection standalone />
      </main>
    </>
  );
}
