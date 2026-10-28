"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { COLORS } from "./layout";
import { sceneStore } from "./store";
import { lightmapUniforms, setLightmapVariant } from "./GlbScene";

// Iluminação em tempo real com dois controles: dia/noite e LED do armário.
// Dia: luz natural pelo jardim. Noite: céu escuro, spots/anéis do teto e luz das geladeiras acesos.

const LED = new THREE.Color(COLORS.led);
const DAY_BG = new THREE.Color("#ecd9c2");
// acima das paredes aparece o fundo (o modelo não tem laje): à noite, tom de teto claro com as luminárias acesas
const NIGHT_BG = new THREE.Color("#a39683");

// medidas do projeto (site, metros): frente do armário em x = 0,33; módulos z 1,52–4,57
const SHELF_Y = [0.53, 1.34, 1.61, 1.97];
const MODULES: [number, number][] = [
  [1.52, 2.53],
  [2.55, 3.55],
  [3.57, 4.57],
];
// poucas luzes dinâmicas (cada uma custa em todo pixel, pesa no celular); as do teto só existem à noite
const CEILING_LIGHTS: [number, number, number][] = [
  [1.3, 2.4, 2.0],
  [3.4, 2.4, 1.4],
];
// difusores das luminárias do modelo (plafons sobre a circulação): x, y (face de baixo), z, raio
// (logo abaixo do teto em y 2,505): 2 plafons redondos e 3 spots, os mesmos usados no cálculo da luz da noite
const FIXTURES: [number, number, number, number][] = [
  [1.23, 2.495, 2.21, 0.15],
  [3.22, 2.495, 2.21, 0.15],
  [1.6, 2.495, 0.9, 0.06],
  [3.7, 2.495, 1.0, 0.06],
  [1.0, 2.495, 3.9, 0.06],
];
const FRIDGE_LIGHTS: [number, number, number][] = [
  [1.95, 1.2, 0.45],
  [3.7, 1.2, 3.66],
];

const damp = THREE.MathUtils.damp;

export function LightRig({ reducedMotion }: { reducedMotion: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const leds = useRef<THREE.PointLight[]>([]);
  const variantKey = useRef("");
  const ceiling = useRef<THREE.PointLight[]>([]);
  const fridges = useRef<THREE.PointLight[]>([]);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  const fixtureMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff1d8", toneMapped: false, transparent: true, opacity: 0 }), []);
  // halo no teto em volta de cada luminária acesa (degradê radial, aditivo)
  const haloMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,226,180,0.9)");
    r.addColorStop(0.35, "rgba(255,214,160,0.35)");
    r.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  }, []);
  useEffect(() => () => fixtureMat.dispose(), [fixtureMat]);
  const stripMat = useMemo(() => new THREE.MeshBasicMaterial({ color: LED.clone(), toneMapped: false }), []);
  // brilho em volta das fitas de LED (efeito "bloom" sem pós-processamento): degradê aditivo para cima e para baixo
  const stripGlowMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createLinearGradient(0, 0, 0, 128);
    r.addColorStop(0, "rgba(255,214,150,0)");
    r.addColorStop(0.42, "rgba(255,214,150,0.35)");
    r.addColorStop(0.5, "rgba(255,226,175,0.9)");
    r.addColorStop(0.58, "rgba(255,214,150,0.35)");
    r.addColorStop(1, "rgba(255,214,150,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  }, []);
  useEffect(() => () => stripMat.dispose(), [stripMat]);

  useFrame((_, dt) => {
    const { night, led, baked } = sceneStore.get();
    const k = reducedMotion ? 100 : 4;
    const ledOn = led ? 1 : 0;
    // com luz assada, as variantes do lightmap fazem a transição; as luzes dinâmicas ficam só como
    // preenchimento leve para o que não tem lightmap (plantas, adesivo)
    // troca da variante assada (instantânea; o fundo e as luzes dinâmicas fazem a transição suave)
    const key = `${night}-${led}`;
    if (variantKey.current !== key) {
      variantKey.current = key;
      setLightmapVariant(night, led);
      lightmapUniforms.uNight.value = night ? 1 : 0;
    }
    const dyn = baked ? 0 : 1;
    if (hemi.current) hemi.current.intensity = damp(hemi.current.intensity, baked ? (night ? 1.0 : 1.1) : night ? 0.38 : 1.5, k, dt);
    if (amb.current) amb.current.intensity = damp(amb.current.intensity, dyn * (night ? 0.1 : 0.35), k, dt);
    if (sun.current) sun.current.intensity = damp(sun.current.intensity, dyn * (night ? 0 : 1.3), k, dt);
    leds.current.forEach((l) => {
      if (!l) return;
      // com luz assada só afeta o que não tem lightmap (rótulos recortados, sacola): o LED ilumina esses também
      l.intensity = damp(l.intensity, (baked ? 0.8 : 1) * ledOn * (night ? 2.2 : 1.2), k, dt);
      l.visible = l.intensity > 0.02;
    });
    ceiling.current.forEach((l) => {
      if (!l) return;
      l.intensity = damp(l.intensity, dyn * (night ? 4 : 0), k, dt);
      l.visible = l.intensity > 0.02;
    });
    fridges.current.forEach((l) => {
      if (!l) return;
      l.intensity = damp(l.intensity, dyn * (night ? 1.6 : 0.7), k, dt);
      l.visible = l.intensity > 0.02;
    });
    // fita de LED: acesa = cor quente forte, apagada = cinza
    const target = led ? 1 : 0.15;
    const cur = stripMat.userData.v ?? 1;
    const v = damp(cur, target, k, dt);
    stripMat.userData.v = v;
    const glow = night ? 3.2 : 2.2;
    stripMat.color.setRGB(0.35 + (LED.r * glow - 0.35) * v, 0.35 + (LED.g * glow * 0.88 - 0.35) * v, 0.35 + (LED.b * glow * 0.6 - 0.35) * v);
    stripGlowMat.opacity = v * (night ? 0.75 : 0.45);
    // luminárias do teto: acesas (brilho, pega no bloom) à noite
    // de dia (fim de tarde) já ficam acesas, mais fracas; à noite brilham
    fixtureMat.opacity = damp(fixtureMat.opacity, 1, k, dt);
    haloMat.opacity = damp(haloMat.opacity, night ? 0.9 : 0.25, k, dt);
    fixtureMat.color.setRGB(night ? 3 : 1.6, night ? 2.6 : 1.45, night ? 2 : 1.2);
    // fundo / névoa
    const bg = (scene.userData.bg as THREE.Color) ?? (scene.userData.bg = DAY_BG.clone());
    bg.lerp(night ? NIGHT_BG : DAY_BG, 1 - Math.exp(-k * dt));
    gl.setClearColor(bg);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(bg);
    gl.toneMappingExposure = damp(gl.toneMappingExposure, night ? 0.92 : 0.8, k, dt);
    // superfícies com lightmap descartam essa luz à noite no shader; ela fica só para os itens transparentes
    scene.environmentIntensity = damp(scene.environmentIntensity ?? 0.6, night ? (baked ? 0.45 : 0.1) : 0.6, k, dt);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffe2bd", "#b38a62", 1.5]} />
      <ambientLight ref={amb} intensity={0.35} color="#ffe2bd" />
      {/* luz do dia entrando pelo jardim */}
      <directionalLight ref={sun} position={[10, 6, 1.5]} intensity={1.3} color="#ffe6c2" />
      {/* LED do armário: uma luz por módulo + fitas visíveis */}
      {MODULES.map(([z0, z1], i) => (
        <pointLight
          key={i}
          ref={(l) => {
            if (l) leds.current[i] = l;
          }}
          position={[0.75, 1.3, (z0 + z1) / 2]}
          intensity={1.2}
          distance={2.2}
          decay={1.5}
          color={COLORS.led}
        />
      ))}
      {MODULES.flatMap(([z0, z1], m) =>
        SHELF_Y.map((y) => (
          <mesh key={`${m}-${y}`} position={[0.31, y, (z0 + z1) / 2]} material={stripMat} raycast={() => null}>
            <boxGeometry args={[0.012, 0.008, z1 - z0 - 0.04]} />
          </mesh>
        )),
      )}
      {MODULES.flatMap(([z0, z1], m) =>
        SHELF_Y.map((y) => (
          <mesh key={`g${m}-${y}`} position={[0.322, y, (z0 + z1) / 2]} rotation={[0, Math.PI / 2, 0]} material={stripGlowMat} raycast={() => null}>
            <planeGeometry args={[z1 - z0 - 0.02, 0.09]} />
          </mesh>
        )),
      )}
      {/* difusores das luminárias (brilham à noite) */}
      {FIXTURES.map(([x, y, z, r], i) => (
        <mesh key={`fx${i}`} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]} material={fixtureMat} raycast={() => null}>
          <circleGeometry args={[r, 32]} />
        </mesh>
      ))}
      {FIXTURES.map(([x, y, z, r], i) => (
        <mesh key={`hl${i}`} position={[x, y + 0.004, z]} rotation={[Math.PI / 2, 0, 0]} material={haloMat} raycast={() => null}>
          <planeGeometry args={[r * 7, r * 7]} />
        </mesh>
      ))}
      {/* teto (acendem à noite) */}
      {CEILING_LIGHTS.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            if (l) ceiling.current[i] = l;
          }}
          position={p}
          intensity={0}
          distance={4.5}
          decay={1.4}
          color="#ffdcae"
        />
      ))}
      {/* luz interna das geladeiras */}
      {FRIDGE_LIGHTS.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            if (l) fridges.current[i] = l;
          }}
          position={p}
          intensity={0.7}
          distance={1.6}
          decay={1.2}
          color="#f2f6ff"
        />
      ))}
    </>
  );
}
