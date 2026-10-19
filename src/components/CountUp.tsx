"use client";

import { useEffect, useRef, useState } from "react";

/** Número que conta de 0 até o valor quando entra na tela (delay: esperar a animação de entrada do bloco). */
export function CountUp({ to, prefix = "", suffix = "", duration = 1800, delay = 0 }: { to: number; prefix?: string; suffix?: string; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setV(0);
    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = window.setTimeout(() => {
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, Math.max(0, (t - t0) / duration));
          setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, delay);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);
  return (
    <span ref={ref} className="countup">
      {prefix}
      {v.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
