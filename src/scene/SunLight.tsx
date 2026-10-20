"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// Sol de fim de tarde entrando pelo jardim (+x): mancha de luz quente no piso, com as sombras das ripas
// da divisória em faixas. Plano aditivo com textura (sem luz dinâmica nem sombra em tempo real: leve).

function sunTexture() {
  const W = 512, H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // forma: paralelogramo (luz baixa vindo de lado), bordas suaves
  g.filter = "blur(14px)";
  g.fillStyle = "rgba(255,196,120,1)";
  g.beginPath();
  g.moveTo(40, 40);
  g.lineTo(W - 20, 70);
  g.lineTo(W - 70, H - 30);
  g.lineTo(90, H - 60);
  g.closePath();
  g.fill();
  // faixas de sombra das ripas (só na metade de cima, que passa pela divisória)
  g.filter = "blur(5px)";
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "rgba(0,0,0,0.75)";
  for (let y = 30; y < H * 0.52; y += 26) g.fillRect(0, y, W, 11);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function SunLight() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sunTexture(),
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  useFrame((_, dt) => {
    const target = sceneStore.get().night ? 0 : 0.32;
    mat.opacity += (target - mat.opacity) * (1 - Math.exp(-3 * dt));
    mat.visible = mat.opacity > 0.01;
  });
  return (
    // piso entre a entrada e o armário: x 1,8–4,4 (luz vem do jardim), z 0,9–3,0
    <mesh material={mat} position={[3.1, 0.004, 1.95]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[2.6, 2.1]} />
    </mesh>
  );
}
