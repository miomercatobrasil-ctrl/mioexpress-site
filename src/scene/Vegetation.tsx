"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Plantas leves no lugar dos blocos de vegetação do SketchUp: cada planta é um maço de "cards"
// (planos com folhas desenhadas e fundo recortado). Posição e tamanho vêm de plants.json,
// gerado por scripts/blender/mio_build.py a partir do projeto.

export type PlantSpot = { x: number; y: number; z: number; w: number; h: number };

type Kind = 0 | 1 | 2 | 3; // 0 folhas largas, 1 samambaia, 2 folhas vermelhas, 3 capim/agave

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Atlas 2×2 de folhagem fotográfica (folha de fícus do próprio projeto SketchUp, recortada e montada
 *  por scripts: folhas largas, finas, vermelhas e longas). */
const ATLAS_URL = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/").replace(/models\/$/, "") + "textures/folhagem.webp";

function useLeafAtlas() {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(ATLAS_URL)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b, { imageOrientation: "flipY" }))
      .then((bmp) => {
        if (!alive) return;
        const t = new THREE.Texture(bmp as unknown as HTMLImageElement);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.needsUpdate = true;
        setTex(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return tex;
}

function cardGeometry(kind: Kind) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.translate(0, 0.5, 0); // base no chão do card
  const u0 = kind % 2 === 0 ? 0 : 0.5;
  const v0 = kind < 2 ? 0.5 : 0; // canvas tem Y para baixo; UV do three tem Y para cima
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  return g;
}

type Card = { p: THREE.Vector3; s: number; yaw: number; tilt: number; tint: number };

// brisa leve: o topo das folhas balança devagar (cada planta num ritmo)
const wind = { value: 0 };

function Cards({ kind, cards, map }: { kind: Kind; cards: Card[]; map: THREE.Texture }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => cardGeometry(kind), [kind]);
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      map,
      alphaTest: 0.45,
      // bordas das folhas suavizadas (com antisserrilhado ligado), sem o contorno "serrilhado" de recorte
      alphaToCoverage: true,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = wind;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uWind;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 2.3;
            transformed.x += sin( uWind * 1.1 + ph ) * 0.035 * position.y * position.y;
            transformed.z += cos( uWind * 0.8 + ph ) * 0.02 * position.y * position.y;
          #endif`,
        );
    };
    m.customProgramCacheKey = () => "mio-folhas";
    return m;
  }, [map]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    cards.forEach((c, i) => {
      o.position.copy(c.p);
      o.rotation.set(c.tilt, c.yaw, 0, "YXZ");
      o.scale.setScalar(c.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // variação de tom entre as folhas (mais amarelada / mais azulada), como numa planta de verdade
      const h = ((i * 0.6180339887) % 1) - 0.5;
      m.setColorAt(i, col.setRGB(c.tint * (1 + h * 0.12), c.tint * (1 + h * 0.04), c.tint * (1 - h * 0.1)));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cards]);
  if (!cards.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, cards.length]} raycast={() => null} />;
}

export function Vegetation({ spots }: { spots: PlantSpot[] }) {
  const map = useLeafAtlas();
  const still = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useFrame((_, dt) => {
    if (!still) wind.value += dt;
  });
  const byKind = useMemo(() => {
    const r = rng(29);
    const out: Card[][] = [[], [], [], []];
    spots.forEach((s, idx) => {
      // restos minúsculos do projeto (hastes finas, tufos soltos flutuando nas paredes) não viram planta;
      // o sorteio continua o mesmo para as outras (mesma cor e formato de antes)
      const skip = s.w < 0.25 || s.h < 0.25;
      // jardim do lado do banco (z < 0,2) tem a planta vermelha e capim; o outro lado, arbustos verdes
      const redSide = s.z < 0.2;
      const tall = s.h > 1.2;
      const n = Math.round(Math.min(46, Math.max(10, s.w * s.h * 38)));
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * s.w * 0.38;
        const kind: Kind = redSide ? (idx % 3 === 0 ? 3 : r() < 0.6 ? 2 : 0) : tall ? (r() < 0.7 ? 0 : 1) : r() < 0.55 ? 0 : 1;
        const size = (0.45 + r() * 0.35) * Math.min(s.h, s.w * 1.2) * (kind === 3 ? 1.1 : 0.85);
        const baseY = s.y + r() * Math.max(0, s.h - size) * 0.6;
        const card = {
          p: new THREE.Vector3(s.x + Math.cos(a) * rad, baseY, s.z + Math.sin(a) * rad),
          s: size,
          yaw: r() * Math.PI,
          tilt: (r() - 0.5) * 0.5,
          tint: 0.78 + r() * 0.3,
        };
        if (!skip) out[kind].push(card);
      }
    });
    return out;
  }, [spots]);
  if (!map) return null;
  return (
    <group name="vegetacao">
      {byKind.map((cards, k) => (
        <Cards key={k} kind={k as Kind} cards={cards} map={map} />
      ))}
    </group>
  );
}
