"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

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

function Cards({ kind, cards, map }: { kind: Kind; cards: Card[]; map: THREE.Texture }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => cardGeometry(kind), [kind]);
  const mat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      }),
    [map],
  );
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
      m.setColorAt(i, col.setScalar(c.tint));
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
  const byKind = useMemo(() => {
    const r = rng(29);
    const out: Card[][] = [[], [], [], []];
    spots.forEach((s, idx) => {
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
        out[kind].push({
          p: new THREE.Vector3(s.x + Math.cos(a) * rad, baseY, s.z + Math.sin(a) * rad),
          s: size,
          yaw: r() * Math.PI,
          tilt: (r() - 0.5) * 0.5,
          tint: 0.78 + r() * 0.3,
        });
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
