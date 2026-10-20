"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// LED interno das geladeiras: fita acesa no topo, logo atrás do vidro, e um brilho que desce pela porta
// (plano aditivo com degradê, sem luz dinâmica: não pesa no celular). À noite fica mais forte.
type Fridge = { c: [number, number, number]; w: number; h: number; ry: number };
// c = centro da porta por dentro do vidro (x, y do topo, z); ry: rotação para ficar paralelo ao vidro
const FRIDGES: Fridge[] = [
  { c: [1.545, 1.94, 0.665], w: 0.47, h: 1.3, ry: 0 }, // Mio 1 (freezer de congelados)
  { c: [2.245, 2.04, 0.655], w: 0.55, h: 1.6, ry: 0 }, // Coca
  { c: [3.53, 1.94, 3.32], w: 0.48, h: 1.3, ry: Math.PI / 2 }, // Mio 2
  { c: [3.53, 1.94, 4.078], w: 0.48, h: 1.3, ry: Math.PI / 2 }, // Mio 3
];

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,250,240,1)");
  grad.addColorStop(0.18, "rgba(255,248,235,0.45)");
  grad.addColorStop(0.6, "rgba(255,246,230,0.12)");
  grad.addColorStop(1, "rgba(255,246,230,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function FridgeLights() {
  const { strip, glow } = useMemo(
    () => ({
      strip: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({
        map: glowTexture(),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  );
  useFrame((_, dt) => {
    const target = sceneStore.get().night ? 1 : 0.5;
    glow.opacity += (target - glow.opacity) * (1 - Math.exp(-4 * dt));
  });
  return (
    <group name="led_geladeiras">
      {FRIDGES.map((f, i) => (
        <group key={i} position={f.c} rotation={[0, f.ry, 0]}>
          <mesh material={strip} position={[0, -0.006, 0]} raycast={() => null}>
            <boxGeometry args={[f.w, 0.012, 0.01]} />
          </mesh>
          <mesh material={glow} position={[0, -f.h / 2, 0.004]} raycast={() => null}>
            <planeGeometry args={[f.w, f.h]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
