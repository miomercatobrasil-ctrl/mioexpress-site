"use client";

import { useEffect, useRef, useState } from "react";

// Um único IntersectionObserver para todas as animações de entrada/saída.
type Phase = "before" | "in" | "after";
type Cb = (phase: Phase) => void;

let io: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Cb>();

function getObserver() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const cb = callbacks.get(e.target);
        if (!cb) continue;
        if (e.isIntersecting) cb("in");
        else cb(e.boundingClientRect.top < 0 ? "after" : "before");
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  return io;
}

export function useInView<T extends Element>(once = false) {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<Phase>("before");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getObserver();
    callbacks.set(el, (p) => {
      setPhase(p);
      if (once && p === "in") {
        obs.unobserve(el);
        callbacks.delete(el);
      }
    });
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      callbacks.delete(el);
    };
  }, [once]);
  return [ref, phase] as const;
}
