import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { AmbienteSection } from "@/components/AmbienteSection";
import { HowItWorks } from "@/components/HowItWorks";
import { Sindicos } from "@/components/Sindicos";
import { Moradores } from "@/components/Moradores";
import { Depoimentos, Unidades } from "@/components/Unidades";
import { Footer, WhatsAppFloat } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Marquee />
        <AmbienteSection />
        <HowItWorks />
        <Sindicos />
        <Moradores />
        <Unidades />
        <Depoimentos />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
