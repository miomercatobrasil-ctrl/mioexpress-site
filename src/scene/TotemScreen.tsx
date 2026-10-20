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
// substituídos pelos vértices reais da tela quando o modelo carrega (GlbScene)
let corners = [CORNERS[1], CORNERS[0], CORNERS[3], CORNERS[2]];
export function setTotemCorners(c: THREE.Vector3[]) {
  corners = c;
}
const v = new THREE.Vector3();
const W = 320, H = 450;

/** Homografia que leva o retângulo W×H da interface aos 4 cantos projetados (perspectiva exata da tela). */
function homography(dst: [number, number][]) {
  const src: [number, number][] = [[0, 0], [W, 0], [0, H], [W, H]];
  const A: number[][] = [];
  src.forEach(([x, y], i) => {
    const [u, w] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -w * x, -w * y, w]);
  });
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  // matrix3d em ordem de coluna
  return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
}

export function TotemScreen() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    if (sceneStore.get().checkout === "off") return;
    const el = document.querySelector<HTMLElement>(".totem-overlay");
    if (!el) return;
    const p = corners.map((c) => {
      v.copy(c).project(camera);
      return [(v.x * 0.5 + 0.5) * size.width, (-v.y * 0.5 + 0.5) * size.height] as [number, number];
    });
    el.style.transform = homography(p);
  });
  return null;
}
