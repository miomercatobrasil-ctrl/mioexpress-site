// Layout da cena conforme a planta "Mio Express – Terraços" (Daniele Faustino, REV00, 1:50).
// Unidades em metros. Origem = canto interno entre a parede do armário (x = 0) e a parede
// das geladeiras (z = 0). +X aponta para o jardim/entrada, +Z para a divisória 1, +Y para cima.
//
//   z=0  ┌─────[gel.Mio][Coca]🌿|div2|  ← parede com janela + banco (z<0)
//        │ totem                       │
//   x=0  │ ARMÁRIO 309                  ╲ 173 (passagem)
//        │ (prof. 33)        [freezer] |div1| jardim
//        │                   [gel.Mio] |240 |
//        │                   [gel.Mio] |    |
//   z≈4.9└──────────────────────────────

export type ObjectId =
  | "armario_mio"
  | "totem_pagamento"
  | "geladeira_mio_1"
  | "geladeira_mio_2"
  | "geladeira_mio_3"
  | "geladeira_coca"
  | "freezer_loslos"
  | "divisoria_ripada_1"
  | "divisoria_ripada_2"
  | "banco"
  | "jardim"
  | "piso"
  | "paredes";

export type HotspotId = "armario" | "totem" | "geladeiras" | "coca" | "freezer" | "ambientacao";

export type Vec3 = [number, number, number];
export type View = { position: Vec3; target: Vec3 };

export const COLORS = {
  vinho: "#7a1f2b",
  marsala: "#6a2622",
  geladeiraVinho: "#561a1e",
  madeiraClara: "#d9c4a3",
  madeiraRipa: "#dcc7a6",
  madeiraEscura: "#4a2c20",
  preto: "#1c1a19",
  coca: "#c8141b",
  piso: "#d8c3a2",
  parede: "#f1ebdc",
  teto: "#f4efe6",
  grama: "#5d7a3a",
  meioFio: "#8e8a84",
  led: "#ffd79a",
};

// Medidas principais (PDF prancha 02/03)
export const ARMARIO = {
  modulos: 3,
  larguraModulo: 1.0,
  separador: 0.02,
  larguraTotal: 3.09,
  painelTotem: 0.3,
  profundidade: 0.33,
  alturaCorpo: 2.0,
  alturaTotal: 2.3,
  base: 0.1,
  // alturas livres entre prateleiras, de baixo para cima (cm): 42, 28, 26, 26, 25, 33
  vaos: [0.42, 0.28, 0.26, 0.26, 0.25, 0.33],
  raioTopo: 0.28,
  // posição: módulos ocupam z 1.45 → 4.54; painel do totem z 1.15 → 1.45
  zCentroGrupo: 2.845,
};

export const DIVISORIA = {
  ripaLargura: 0.03,
  ripaProf: 0.1,
  passo: 0.08, // 3 cm de ripa + 5 cm de espaçamento
  alturaRipa: 2.2,
  base: 0.3,
};

export const CEILING_Y = 2.7;

export const OBJECT_TO_HOTSPOT: Partial<Record<ObjectId, HotspotId>> = {
  armario_mio: "armario",
  totem_pagamento: "totem",
  geladeira_mio_1: "geladeiras",
  geladeira_mio_2: "geladeiras",
  geladeira_mio_3: "geladeiras",
  geladeira_coca: "coca",
  freezer_loslos: "freezer",
  divisoria_ripada_1: "ambientacao",
  divisoria_ripada_2: "ambientacao",
  banco: "ambientacao",
};

export type Hotspot = {
  id: HotspotId;
  title: string;
  text: string;
  anchor: Vec3;
  view: View;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "armario",
    title: "Armário Mio",
    text: "Mercearia, bebidas, limpeza e conveniência, tudo dentro do condomínio.",
    anchor: [0.4, 1.2, 3.0],
    view: { position: [2.75, 1.45, 3.05], target: [0.2, 1.15, 3.0] },
  },
  {
    id: "totem",
    title: "Totem de autoatendimento",
    text: "Passou o código, pagou. Pix ou cartão (aproximação ou chip), em segundos.",
    anchor: [0.55, 1.2, 1.3],
    view: { position: [1.55, 1.4, 1.0], target: [0.3, 1.0, 1.3] },
  },
  {
    id: "geladeiras",
    title: "Geladeiras Mio",
    text: "Bebidas sempre geladas, 24h.",
    anchor: [3.45, 1.3, 3.65],
    view: { position: [1.15, 1.55, 3.0], target: [3.85, 1.0, 3.65] },
  },
  {
    id: "coca",
    title: "Geladeira de refrigerantes",
    text: "Refrigerantes e bebidas geladas.",
    anchor: [2.3, 1.3, 0.8],
    view: { position: [2.2, 1.45, 2.7], target: [2.0, 1.0, 0.4] },
  },
  {
    id: "freezer",
    title: "Freezer de sorvetes",
    text: "Picolés Los Los para qualquer hora.",
    anchor: [3.55, 1.1, 2.45],
    // de cima, pelo vidro da tampa, para ver todos os sabores
    view: { position: [3.25, 1.75, 2.5], target: [3.9, 0.6, 2.5] },
  },
  {
    id: "ambientacao",
    // CONFIRMAR se o projeto de ambientação faz parte da implantação.
    title: "Ambientação",
    text: "Projeto que valoriza o espaço do condomínio.",
    anchor: [3.1, 1.4, 0.35],
    view: { position: [6.3, 1.55, 0.7], target: [3.0, 1.35, 1.3] },
  },
];

export const TOUR_ORDER: HotspotId[] = ["ambientacao", "armario", "totem", "coca", "geladeiras", "freezer"];

// Ângulos prontos (botões 1-2-3), para quem não consegue arrastar/dar zoom. portrait: celular em pé.
export const ANGLES: { label: string; view: View; portrait: View }[] = [
  {
    label: "Armário",
    view: { position: [3.25, 1.5, 2.8], target: [0, 1.05, 2.8] },
    portrait: { position: [3.25, 1.5, 2.3], target: [0, 1.05, 3.0] },
  },
  {
    label: "Coca e congelados",
    view: { position: [2.5, 1.4, 3.3], target: [1.6, 1.0, 0] },
    portrait: { position: [2.4, 1.4, 3.6], target: [1.9, 1.0, 0] },
  },
  {
    label: "Bebidas e sorvetes",
    view: { position: [0.9, 1.75, 2.3], target: [3.9, 0.85, 3.2] },
    portrait: { position: [0.85, 1.6, 2.0], target: [3.9, 0.9, 3.3] },
  },
];

// Visão geral (após a entrada) e trajeto de abertura (render externo -> dentro do ambiente)
export const OVERVIEW: View = { position: [4.1, 2.3, 0.55], target: [1.6, 0.65, 3.0] };

// Celular em pé: mesmo ponto, olhando mais para o centro do armário
export const OVERVIEW_PORTRAIT: View = { position: [4.1, 2.3, 0.55], target: [1.3, 0.7, 2.4] };

export const INTRO_PATH: { position: Vec3[]; targetFrom: Vec3 } = {
  position: [
    [8.8, 1.6, 1.05],
    [6.6, 1.6, 1.05],
    [5.1, 1.65, 1.1],
    OVERVIEW.position,
  ],
  targetFrom: [0, 1.35, 1.35],
};

// Limites da câmera para não atravessar paredes nem ir abaixo do piso
export function clampCamera(p: { x: number; y: number; z: number }) {
  p.y = Math.min(2.45, Math.max(0.45, p.y));
  p.x = Math.min(8.8, Math.max(0.75, p.x));
  const zMin = p.x < 3.1 ? 0.95 : -1.2;
  const zMax = p.x > 3.3 ? 1.85 : 4.1;
  p.z = Math.min(zMax, Math.max(zMin, p.z));
}

export const ORBIT = {
  minDistance: 1.1,
  maxDistance: 5.2,
  minPolarAngle: Math.PI * 0.26,
  maxPolarAngle: Math.PI * 0.53,
  // só olhar a partir do lado aberto (+X); evita girar para dentro das paredes
  minAzimuthAngle: Math.PI * 0.08,
  maxAzimuthAngle: Math.PI * 0.92,
};
