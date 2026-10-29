"use client";

import dynamic from "next/dynamic";
import type { ProjetoPlan } from "@/scene/sala/ProjetoViewer";

const ProjetoViewer = dynamic(() => import("@/scene/sala/ProjetoViewer"), {
  ssr: false,
  loading: () => <div className="sala3d"><div className="sala3d__loading">Montando a sua loja…</div></div>,
});

// projeto da arquiteta (modelo SketchUp convertido e com luz assada: scripts/blender/sala_bake.py)
const PLAN_V8K3: ProjetoPlan = {
  base: "/models/p/v8k3/",
  backdrop: "/images/p/janela.jpg",
  bounds: { x: [0.35, 5.0], z: [0.6, 5.35], h: 2.9 },
  floor: [[0, 0], [5.45, 0], [5.45, 5.7], [0, 5.7]],
  views: [
    { label: "Entrada", position: [3.3, 1.6, 5.3], target: [3.1, 1.1, 0.5] },
    { label: "Armário", position: [3.6, 1.55, 2.3], target: [3.6, 1.2, 0] },
    { label: "Geladeiras", position: [3.0, 1.55, 2.4], target: [0, 1.1, 1.5] },
    { label: "Gôndola", position: [1.3, 1.6, 4.6], target: [2.5, 0.8, 2.3] },
    { label: "Totem", position: [1.5, 1.6, 3.0], target: [5.3, 1.1, 2.6] },
  ],
};

export function SalaSection() {
  return <ProjetoViewer plan={PLAN_V8K3} />;
}
