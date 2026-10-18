"use client";

import Script from "next/script";
import { useEffect } from "react";
import { track } from "@/lib/pixel";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Pixel da Meta: PageView no carregamento, Contact em qualquer clique para o WhatsApp. Lead é disparado pelo formulário. */
export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (a && /wa\.me|whatsapp\.com/.test(a.href)) track("Contact");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="lazyOnload">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}</Script>
      <noscript>
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
