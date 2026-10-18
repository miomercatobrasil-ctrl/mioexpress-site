import { categorias } from "@/lib/content";

export function Marquee() {
  const items = [...categorias, ...categorias];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__track">
        {items.map((c, i) => (
          <span key={i}>
            {c} <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
