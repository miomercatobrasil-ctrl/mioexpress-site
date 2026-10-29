"use client";

import dynamic from "next/dynamic";
import type { ProjetoPlan } from "@/scene/sala/ProjetoViewer";

const ProjetoViewer = dynamic(() => import("@/scene/sala/ProjetoViewer"), {
  ssr: false,
  loading: () => <div className="sala3d"><div className="sala3d__loading">Montando a sua loja…</div></div>,
});

type V3 = [number, number, number];
// fitas de LED: embaixo de cada prateleira do armário (4 módulos) e nas laterais internas das geladeiras
const ARMARIO: [number, number][] = [[1.95, 2.7], [2.78, 3.53], [3.61, 4.37], [4.45, 5.21]];
const LEDS: { a: V3; b: V3; cool?: boolean }[] = [
  ...[0.52, 0.82, 1.06, 1.33, 1.6, 1.95].flatMap((y) => ARMARIO.map(([x0, x1]) => ({ a: [x0, y, 0.43] as V3, b: [x1, y, 0.43] as V3 }))),
  // parede esquerda (frente para +x) e geladeira ao lado do totem (frente para −x)
  ...[0.99, 1.53, 1.77, 2.3].map((z) => ({ a: [0.85, 0.38, z] as V3, b: [0.85, 1.94, z] as V3, cool: true })),
  ...[3.24, 3.66].map((z) => ({ a: [3.845, 0.38, z] as V3, b: [3.845, 1.94, z] as V3, cool: true })),
  // parede da entrada (frente para −z)
  ...[0.15, 0.71, 0.86, 1.42, 1.57, 2.13, 2.28, 2.84].map((x) => ({ a: [x, 0.38, 5.07] as V3, b: [x, 1.94, 5.07] as V3, cool: true })),
];

// geladeiras do projeto: as garrafas (copiadas no bake) ficavam ocas; viram as garrafas de água do site
const AGUA = [0.567, 0.877].map((y) => ({ y, product: "crystal" }));
const FRIDGES = {
  hide: /acrylic|^__auto_\d*$/i,
  list: [
    ...[1.259, 2.035].map((z) => ({ front: [0.82, z] as [number, number], inward: [-1, 0] as [number, number], width: 0.5, rows: AGUA })),
    { front: [3.87, 3.447] as [number, number], inward: [1, 0] as [number, number], width: 0.42, rows: AGUA },
    ...[0.43, 1.14, 1.85, 2.56].map((x) => ({ front: [x, 5.1] as [number, number], inward: [0, 1] as [number, number], width: 0.5, rows: AGUA })),
    // geladeira da Coca: cheia, do fundo até a porta
    {
      front: [0.99, 0.535] as [number, number],
      inward: [-1, 0] as [number, number],
      width: 0.58,
      deep: 7,
      rows: [
        { y: 0.47, product: "cocazero_lata", stack: 2 },
        { y: 0.675, product: "coca_lata", stack: 2 },
        { y: 0.975, product: "fanta", stack: 2 },
        { y: 1.275, product: "guarana_lata", stack: 2 },
        { y: 1.565, product: "coca_lata", stack: 2 },
        { y: 1.835, product: "cocazero_220" },
      ],
    },
  ],
};

// sacos de carvão: os do projeto vinham amassados e furados; viram sacos cheios, 2 por módulo do armário
const SACKS = {
  hide: /carv/i,
  image: "/images/p/carvao.jpg",
  size: [0.62, 0.11, 0.34] as V3,
  at: [2.325, 3.155, 3.99, 4.83].flatMap((x) => [[x, 0.125, 0.27], [x, 0.235, 0.28]] as V3[]),
};

// projeto da arquiteta (modelo SketchUp convertido e com luz assada: scripts/blender/sala_bake.py)
const PLAN_V8K3: ProjetoPlan = {
  base: "/models/p/v8k3/",
  backdrop: "/images/p/janela.jpg",
  leds: LEDS,
  fridges: FRIDGES,
  sacks: SACKS,
  freezer: { x: [0.12, 0.6], z: [2.62, 3.72], y: 0.62, rows: 2, cols: 7 },
  bounds: { x: [0.35, 5.0], z: [0.6, 5.35], h: 2.9 },
  floor: [[0, 0], [5.45, 0], [5.45, 5.7], [0, 5.7]],
  views: [
    { label: "Entrada", position: [3.3, 1.6, 5.3], target: [3.1, 1.1, 0.5] },
    { label: "Armário", position: [3.6, 1.55, 2.3], target: [3.6, 1.2, 0] },
    { label: "Geladeiras", position: [3.0, 1.55, 2.4], target: [0, 1.1, 1.5] },
    { label: "Gôndola", position: [1.3, 1.6, 4.6], target: [2.5, 0.8, 2.3] },
    { label: "Sorvetes", position: [1.25, 1.75, 3.15], target: [0.35, 0.5, 3.15] },
    { label: "Totens", position: [1.4, 1.55, 3.4], target: [3.7, 0.75, 4.75] },
    { label: "Janela", position: [1.5, 1.6, 3.0], target: [5.3, 1.1, 2.6] },
  ],
};

export function SalaSection() {
  return <ProjetoViewer plan={PLAN_V8K3} />;
}
