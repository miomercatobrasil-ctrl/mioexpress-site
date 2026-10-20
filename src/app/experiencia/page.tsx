import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AmbienteSection } from "@/components/AmbienteSection";

export const metadata: Metadata = {
  title: "Experiência Mio em 3D",
  description: "Entre em uma unidade Mio Express em 3D, conheça o mini mercado e experimente comprar no totem.",
  alternates: { canonical: "/experiencia" },
  openGraph: {
    title: "Tenha uma experiência Mio em 3D",
    description: "Entre no mercado e experimente comprar no totem.",
    url: "/experiencia",
    images: [{ url: "/og-experiencia.jpg", width: 1200, height: 630, alt: "Armário Mio Express em 3D" }],
  },
  twitter: { card: "summary_large_image", title: "Tenha uma experiência Mio em 3D", images: ["/og-experiencia.jpg"] },
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
