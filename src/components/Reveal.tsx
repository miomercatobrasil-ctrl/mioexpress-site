"use client";

import { Fragment, createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "./inview";

/**
 * Texto que entra palavra por palavra subindo de uma máscara e sai para cima ao deixar a tela.
 * Use `\n` no texto para quebrar linha.
 */
export function Reveal({
  text,
  as = "p",
  className = "",
  delay = 0,
  stagger = 45,
  once = false,
  accent,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
  /** palavras (exatas) que recebem a cor de destaque */
  accent?: string[];
}) {
  const [ref, phase] = useInView<HTMLElement>(once);
  let i = 0;
  const lines = text.split("\n");
  const children = lines.map((line, li) => (
    <span key={li} className="rv__line">
      {line.split(" ").map((w, wi, arr) => {
        const n = i++;
        const clean = w.replace(/[.,!?:;]/g, "");
        return (
          <Fragment key={wi}>
            <span className="rv__w">
              <span className={`rv__i${accent?.includes(clean) ? " is-accent" : ""}`} style={{ "--d": `${delay + n * stagger}ms` } as CSSProperties}>
                {w}
              </span>
            </span>
            {wi < arr.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </span>
  ));
  return createElement(as, { ref, className: `rv rv--${phase} ${className}` }, children);
}

/** Bloco que aparece com fade + leve subida (ou imagem com máscara e zoom). */
export function Fx({
  children,
  as = "div",
  variant = "up",
  delay = 0,
  className = "",
  once = false,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  variant?: "up" | "fade" | "img" | "line" | "scale";
  delay?: number;
  className?: string;
  once?: boolean;
  style?: CSSProperties;
}) {
  const [ref, phase] = useInView<HTMLElement>(once);
  return createElement(
    as,
    { ref, className: `fx fx--${variant} fx--${phase} ${className}`, style: { ...style, "--d": `${delay}ms` } as CSSProperties },
    children,
  );
}
