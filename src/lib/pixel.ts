type Fbq = (...args: unknown[]) => void;

export function track(event: "Lead" | "Contact" | "PageView", params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (fbq) fbq("track", event, params);
}
