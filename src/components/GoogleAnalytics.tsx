"use client";

import Script from "next/script";
import { SITE } from "@/lib/site";

/** Google Analytics 4: visitas, origem (ex.: ?utm_source=qrcode) e os eventos da experiência 3D (lib/pixel.ts). */
export function GoogleAnalytics() {
  if (!SITE.gaId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${SITE.gaId}');`}</Script>
    </>
  );
}
