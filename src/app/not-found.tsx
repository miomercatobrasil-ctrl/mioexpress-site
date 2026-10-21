import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="legal">
        <div className="container legal__inner" style={{ textAlign: "center", paddingBlock: "18vh 12vh" }}>
          <p className="eyebrow">Erro 404</p>
          <h1 className="h2">Essa prateleira está vazia.</h1>
          <p>A página que você procurou não existe ou mudou de lugar.</p>
          <p style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            <Link href="/" className="btn btn--primary">
              Voltar ao início
            </Link>
            <Link href="/experiencia" className="btn btn--ghost">
              Ver a Mio em 3D
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
