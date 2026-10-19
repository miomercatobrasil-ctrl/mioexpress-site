import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { SITE } from "@/lib/site";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

const font = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font" });

const title = "Mio Express | Mini mercado 24h no seu condomínio em São José dos Campos";
const description =
  "Mini mercado autônomo 24h dentro do condomínio. Implantação gratuita: a Mio instala, abastece e faz a manutenção. Atendemos condomínios em São José dos Campos – SP.";

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
  robots: { index: true, follow: true },
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
  areaServed: { "@type": "City", name: "São José dos Campos" },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  sameAs: [SITE.instagram, SITE.facebook],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
