"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { sceneStore } from "./store";

// Tela do totem 3D (material "Color_G06"): x 0,437–0,500, y 0,985–1,164, z 1,297–1,432, voltada para +x e
// inclinada ~19° para cima. Na compra a câmera para de frente para ela e a interface (HTML, .totem-overlay)
// é encaixada sobre a tela projetando os quatro cantos a cada quadro.
export const TOTEM_SCREEN = {
  center: [0.4705, 1.0755, 1.3645] as [number, number, number],
  normal: [0.946, 0.324, 0] as [number, number, number],
};
const C = new THREE.Vector3(...TOTEM_SCREEN.center);
const RIGHT = new THREE.Vector3(0, 0, -1).multiplyScalar(0.0675);
const UP = new THREE.Vector3(-0.324, 0.946, 0).multiplyScalar(0.095);
const CORNERS = [
  C.clone().add(RIGHT).add(UP),
  C.clone().sub(RIGHT).add(UP),
  C.clone().add(RIGHT).sub(UP),
  C.clone().sub(RIGHT).sub(UP),
];
const v = new THREE.Vector3();

export function TotemScreen() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    if (sceneStore.get().checkout === "off") return;
    const el = document.querySelector<HTMLElement>(".totem-overlay");
    if (!el) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of CORNERS) {
      v.copy(c).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    el.style.transform = `translate(${x0}px, ${y0}px) scale(${(x1 - x0) / 320}, ${(y1 - y0) / 450})`;
  });
  return null;
}
