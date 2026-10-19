// Texturas extraídas do projeto SketchUp "Terraços" (assets/source/sketchup/Terracos.skp).
// Imagens de rótulos reduzidas para 256 px: são vistas de longe na cena.

export const TEX = {
  mdf: "/textures/mdf-antuerpia.jpg",
  piso: "/textures/piso.jpg",
  comoFunciona: "/textures/como-funciona.jpg",
  ecobag: "/textures/ecobag.jpg",
  loslos: "/textures/loslos.jpg",
  cocaLogo: "/textures/coca-logo.jpg",
} as const;

export type ProductDef = {
  tex: string;
  /** largura/altura da frente (proporção da imagem) */
  aspect: number;
  /** altura real aproximada em metros */
  height: number;
  depth: number;
  side: string;
};

export const PRODUCTS = {
  ruffles: { tex: "/textures/p-ruffles.jpg", aspect: 0.64, height: 0.22, depth: 0.07, side: "#e8b923" },
  lays: { tex: "/textures/p-lays.jpg", aspect: 0.67, height: 0.21, depth: 0.07, side: "#f2c230" },
  chips: { tex: "/textures/p-chips-ahoy.jpg", aspect: 1.68, height: 0.07, depth: 0.05, side: "#1d5fae" },
  club: { tex: "/textures/p-club.jpg", aspect: 0.61, height: 0.17, depth: 0.05, side: "#1f6a35" },
  dallas: { tex: "/textures/p-dallas.jpg", aspect: 2.0, height: 0.07, depth: 0.03, side: "#e39a1e" },
  milka: { tex: "/textures/p-milka.jpg", aspect: 2.05, height: 0.08, depth: 0.02, side: "#7d5aa6" },
  nutry: { tex: "/textures/p-nutry.jpg", aspect: 0.74, height: 0.2, depth: 0.06, side: "#5a3a2a" },
  macarrao: { tex: "/textures/p-macarrao.jpg", aspect: 1.28, height: 0.12, depth: 0.06, side: "#f0d36a" },
  camilBranco: { tex: "/textures/p-camil-branco.jpg", aspect: 0.65, height: 0.24, depth: 0.08, side: "#dfe8f2" },
  camilIntegral: { tex: "/textures/p-camil-integral.jpg", aspect: 0.65, height: 0.24, depth: 0.08, side: "#d9c38d" },
  camilItaliana: { tex: "/textures/p-camil-italiana.jpg", aspect: 0.65, height: 0.24, depth: 0.08, side: "#e7d27a" },
  omo: { tex: "/textures/p-omo.jpg", aspect: 0.96, height: 0.2, depth: 0.08, side: "#1c56b5" },
  aguaSanitaria: { tex: "/textures/p-agua-sanitaria.jpg", aspect: 0.3, height: 0.3, depth: 0.08, side: "#e9efe9" },
  ingleza: { tex: "/textures/p-ingleza.jpg", aspect: 0.84, height: 0.26, depth: 0.09, side: "#2a63b8" },
  carvao: { tex: "/textures/p-carvao.jpg", aspect: 1.52, height: 0.22, depth: 0.12, side: "#b5442b" },
} satisfies Record<string, ProductDef>;

export type ProductKey = keyof typeof PRODUCTS;

/** Planograma provisório: [módulo][nível, de baixo para cima] (até termos as fotos de frente de cada prateleira). */
export const PLANOGRAMA: ProductKey[][][] = [
  // módulo esquerdo
  [["camilBranco", "camilIntegral"], ["macarrao"], ["club"], ["chips", "dallas"], ["nutry"], ["ruffles"]],
  // módulo central
  [["camilItaliana", "camilBranco"], ["club", "macarrao"], ["dallas", "milka"], ["milka"], ["chips"], ["lays"]],
  // módulo direito
  [["omo", "aguaSanitaria", "ingleza"], ["macarrao"], ["nutry"], ["dallas"], ["club"], ["ruffles", "lays"]],
];

export const CANS = {
  coca: { tex: "/textures/c-coca.jpg", side: "#c8141b" },
  cocaZero: { tex: "/textures/c-coca-zero.jpg", side: "#111111" },
  fanta: { tex: "/textures/c-fanta.jpg", side: "#6a2c8a" },
  heineken: { tex: "/textures/c-heineken.jpg", side: "#1f6b3a" },
} as const;

export type CanKey = keyof typeof CANS;
