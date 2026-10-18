import type { CSSProperties } from "react";

// next/image -> <img> (a prévia é um arquivo único, sem otimizador de imagens)
type Props = { src: string; alt: string; fill?: boolean; width?: number; height?: number; className?: string; priority?: boolean; style?: CSSProperties };

export default function Image({ src, alt, fill, width, height, className, priority, style }: Props) {
  const s: CSSProperties = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : { ...style };
  return <img src={src} alt={alt} width={width} height={height} className={className} style={s} loading={priority ? "eager" : "lazy"} decoding="async" />;
}
