// Export estático não otimiza imagens: as fotos de public/images têm versões prontas em 640 e 960 px
// (arquivo-640.webp, arquivo-960.webp) e o celular baixa a menor que serve, em vez da original de 1500 px.
const SIZES = [640, 960];

export default function imageLoader({ src, width }: { src: string; width: number }) {
  if (!src.startsWith("/images/") || !src.endsWith(".webp")) return src;
  const w = SIZES.find((s) => s >= width);
  return w ? src.replace(/\.webp$/, `-${w}.webp`) : src;
}
