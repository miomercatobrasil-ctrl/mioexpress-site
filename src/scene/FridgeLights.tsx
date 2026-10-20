"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// LED interno das geladeiras: fita acesa no topo, logo atrás do vidro, e um brilho que desce pela porta
// (plano aditivo com degradê, sem luz dinâmica: não pesa no celular). À noite fica mais forte.
type Fridge = { c: [number, number, number]; w: number; h: number; ry: number; glass: number; back?: number };
// c = centro da porta por dentro do vidro (x, y do topo, z); ry: rotação para ficar paralelo ao vidro
const FRIDGES: Fridge[] = [
  // glass: distância até a face de fora do vidro (eixo local +z aponta para fora da porta)
  { c: [1.545, 1.94, 0.665], w: 0.47, h: 1.3, ry: 0, glass: 0.042, back: 0.4 }, // Mio 1 (freezer de congelados)
  { c: [2.245, 2.04, 0.655], w: 0.55, h: 1.6, ry: 0, glass: 0.032 }, // Coca
  { c: [3.53, 1.94, 3.32], w: 0.48, h: 1.3, ry: -Math.PI / 2, glass: 0.036, back: 0.37 }, // Mio 2
  { c: [3.53, 1.94, 4.078], w: 0.48, h: 1.3, ry: -Math.PI / 2, glass: 0.036, back: 0.37 }, // Mio 3
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

/** Fundo interno claro das geladeiras Mio (o corpo vinho deixava o interior escuro: a luz não "aparecia"). */
function backTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#fffdf8");
  grad.addColorStop(0.35, "#efebe5");
  grad.addColorStop(1, "#cdc7c0");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Reflexo do vidro: faixas diagonais suaves (luz do ambiente batendo na porta). */
function reflectionTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.translate(128, 256);
  g.rotate(-0.5);
  for (const [x, w, a] of [[-70, 46, 0.55], [-8, 14, 0.35], [40, 70, 0.22]] as const) {
    const grad = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(x - w / 2, -600, w, 1200);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function FridgeLights() {
  const reflection = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: reflectionTexture(),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const back = useMemo(() => new THREE.MeshBasicMaterial({ map: backTexture() }), []);
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
    const target = sceneStore.get().night ? 1.1 : 0.65;
    glow.opacity += (target - glow.opacity) * (1 - Math.exp(-4 * dt));
    // o reflexo corre devagar pelo vidro (dá a percepção de vidro e chama o olhar para os produtos)
    reflection.map!.offset.x = (reflection.map!.offset.x + dt * 0.03) % 1;
    reflection.opacity = sceneStore.get().night ? 0.14 : 0.28;
    back.color.setScalar(sceneStore.get().night ? 0.92 : 0.82);
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
          {f.back && (
            <mesh material={back} position={[0, -f.h / 2, -f.back]} raycast={() => null}>
              <planeGeometry args={[f.w, f.h]} />
            </mesh>
          )}
          <mesh material={reflection} position={[0, -f.h / 2 + 0.05, f.glass]} raycast={() => null}>
            <planeGeometry args={[f.w + 0.02, f.h + 0.25]} />
          </mesh>
        </group>
      ))}
      {/* freezer Los Los (deitado, tampa de vidro em y ≈ 0,87): fita no fundo e brilho sobre as cestas */}
      <group position={[4.0, 0.835, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        {/* fita fina (5 mm) com halo suave em volta */}
        <mesh material={strip} raycast={() => null}>
          <boxGeometry args={[0.66, 0.005, 0.005]} />
        </mesh>
        <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.02]} raycast={() => null}>
          <planeGeometry args={[0.66, 0.05]} />
        </mesh>
        <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0.2]} raycast={() => null}>
          <planeGeometry args={[0.68, 0.4]} />
        </mesh>
      </group>
      {/* reflexo na tampa de vidro do freezer */}
      <mesh material={reflection} position={[3.815, 0.915, 2.5]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} raycast={() => null}>
        <planeGeometry args={[0.7, 0.44]} />
      </mesh>
    </group>
  );
}
