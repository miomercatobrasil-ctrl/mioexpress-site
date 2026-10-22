import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { SITE } from "@/lib/site";
import { faq } from "@/lib/content";
import { MetaPixel } from "@/components/MetaPixel";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

const font = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font" });

const title = "Mio Express | Mini mercado 24h no seu condomínio em São José dos Campos e Jacareí";
const description =
  "Mini mercado autônomo 24h dentro do condomínio. Implantação gratuita: a Mio instala, abastece e faz a manutenção. Atendemos condomínios em São José dos Campos e Jacareí – SP.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: title, template: "%s | Mio Express" },
  description,
  keywords: [
    "mini mercado em condomínio",
    "mini mercado em condomínio São José dos Campos",
    "mercado autônomo condomínio",
    "market autônomo 24h",
    "conveniência condomínio São José dos Campos",
    "mini mercado em condomínio Jacareí",
    "mercado autônomo condomínio Jacareí",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE.url,
    siteName: "Mio Express",
    title,
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Mini mercado Mio Express em um condomínio" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  icons: { icon: "/icon.svg" },
  robots: SITE.launched ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#7a1f2b",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE.url}/#business`,
  name: "Mio Express Mini Mercado",
  legalName: SITE.legalName,
  description,
  url: SITE.url,
  image: `${SITE.url}/og.jpg`,
  logo: `${SITE.url}/brand/logo.svg`,
  telephone: "+55-12-99739-7730",
  taxID: SITE.cnpj,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.state,
    postalCode: SITE.address.zip,
    addressCountry: "BR",
  },
  areaServed: [
    { "@type": "City", name: "São José dos Campos" },
    { "@type": "City", name: "Jacareí" },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  sameAs: [SITE.instagram, SITE.facebook],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

// Tela de carregamento: fica até a página carregar (mín. 0,7 s para a animação aparecer, máx. 1,6 s).
const SPLASH = `(function(){var d=document.documentElement,t0=Date.now(),done=0;function end(){if(done)return;done=1;setTimeout(function(){d.classList.add('splash-out');setTimeout(function(){var e=document.getElementById('splash');e&&e.remove()},450)},Math.max(0,700-(Date.now()-t0)))}if(document.readyState==='complete')end();else addEventListener('load',end);setTimeout(end,1600)})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      </head>
      <body>
        <div id="splash" aria-hidden="true">
          <svg className="splash__cart" viewBox="0 0 64 56" width="96" height="84">
            <rect className="splash__item splash__item--1" x="24" y="2" width="9" height="13" rx="2" />
            <rect className="splash__item splash__item--2" x="35" y="4" width="11" height="9" rx="2" />
            <rect className="splash__item splash__item--3" x="29" y="0" width="7" height="15" rx="3" />
            <path className="splash__body" d="M4 8h7l6 27a3 3 0 0 0 3 2.4h26a3 3 0 0 0 2.9-2.2L55 16H14" />
            <circle className="splash__wheel" cx="22" cy="47" r="4" />
            <circle className="splash__wheel" cx="45" cy="47" r="4" />
          </svg>
          <span className="splash__name">
            <strong>mio express</strong>
            mini mercado
          </span>
          <span className="splash__bar">
            <span />
          </span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SPLASH }} />
        {children}
        <MetaPixel />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
