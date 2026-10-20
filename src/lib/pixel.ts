type Fbq = (...args: unknown[]) => void;
type Gtag = (...args: unknown[]) => void;

const GA_NAME = { Lead: "generate_lead", Contact: "contact", PageView: "page_view" } as const;

/** Conversões: vão para o Pixel da Meta e para o Google Analytics (o que estiver ligado). */
export function track(event: "Lead" | "Contact" | "PageView", params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (fbq) fbq("track", event, params);
  if (event !== "PageView") ga(GA_NAME[event], params);
}

/** Evento só do Google Analytics (uso da experiência 3D: entrar, pegar produto, comprar…). */
export function ga(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (gtag) gtag("event", event, params);
}
