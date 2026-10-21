"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// Sol de fim de tarde entrando pelo jardim (+x): mancha de luz quente no piso, com as sombras das ripas
// da divisória em faixas. Plano aditivo com textura (sem luz dinâmica nem sombra em tempo real: leve).

/** Desfoque feito à mão (o Safari do iPhone ignora o filtro "blur" do canvas): várias cópias deslocadas
 *  e semitransparentes, em resolução baixa; a textura ampliada suaviza o resto. */
function blurred(src: HTMLCanvasElement, r: number) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d")!;
  const steps = 8;
  g.globalAlpha = 1 / (steps + 1);
  g.drawImage(src, 0, 0);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.drawImage(src, Math.cos(a) * r, Math.sin(a) * r);
  }
  g.globalAlpha = 1;
  return c;
}

function sunTexture() {
  const W = 128, H = 128, k = W / 512;
  const shape = document.createElement("canvas");
  shape.width = W;
  shape.height = H;
  const g = shape.getContext("2d")!;
  // forma: paralelogramo (luz baixa vindo de lado)
  g.fillStyle = "rgba(255,196,120,1)";
  g.beginPath();
  g.moveTo(40 * k, 40 * k);
  g.lineTo((512 - 20) * k, 70 * k);
  g.lineTo((512 - 70) * k, (512 - 30) * k);
  g.lineTo(90 * k, (512 - 60) * k);
  g.closePath();
  g.fill();
  const soft = blurred(blurred(shape, 3), 2);
  // faixas de sombra das ripas (só na metade de cima, que passa pela divisória), com bordas suaves
  const bars = document.createElement("canvas");
  bars.width = W;
  bars.height = H;
  const b = bars.getContext("2d")!;
  b.fillStyle = "rgba(0,0,0,0.7)";
  for (let y = 30; y < 512 * 0.52; y += 26) b.fillRect(0, y * k, W, 11 * k);
  const sg = soft.getContext("2d")!;
  sg.globalCompositeOperation = "destination-out";
  sg.drawImage(blurred(bars, 0.8), 0, 0);
  const t = new THREE.CanvasTexture(soft);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// manchas de sol no piso: entrada (entre o jardim e o armário) e corredor do armário, até a porta de vidro
const PATCHES = [
  { x: 3.1, z: 1.95, w: 2.6, d: 2.1, rot: 0 },
  { x: 1.75, z: 3.75, w: 1.9, d: 1.5, rot: 0.35 },
];

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
    <group name="sol">
      {PATCHES.map((p, i) => (
        <mesh key={i} material={mat} position={[p.x, 0.004, p.z]} rotation={[-Math.PI / 2, 0, p.rot]} raycast={() => null}>
          <planeGeometry args={[p.w, p.d]} />
        </mesh>
      ))}
    </group>
  );
}
