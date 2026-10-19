"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
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

/** Atlas 2×2 com folhagens desenhadas em canvas (sem download de imagem). */
function useLeafAtlas() {
  return useMemo(() => {
    const S = 512;
    const H = S / 2;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d")!;
    const r = rng(11);
    const leaf = (x: number, y: number, len: number, wid: number, ang: number, fill: string, rib: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wid, -len * 0.45, 0, -len);
      ctx.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = rib;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len * 0.92);
      ctx.stroke();
      ctx.restore();
    };
    const cell = (cx: number, cy: number, draw: () => void) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, H, H);
      ctx.clip();
      ctx.translate(cx, cy);
      draw();
      ctx.restore();
    };
    const greens = ["#2f5e25", "#3d7330", "#4f8a38", "#5f9c40", "#6fae48", "#2a5221"];
    // 0: folhas largas (arbusto)
    cell(0, 0, () => {
      for (let i = 0; i < 70; i++) {
        const x = H * (0.15 + r() * 0.7);
        const y = H * (0.25 + r() * 0.72);
        leaf(x, y, 34 + r() * 30, 12 + r() * 9, (r() - 0.5) * 2.6, greens[Math.floor(r() * greens.length)], "rgba(20,40,10,.35)");
      }
    });
    // 1: samambaia / folhagem fina
    cell(H, 0, () => {
      for (let f = 0; f < 9; f++) {
        const bx = H * (0.3 + r() * 0.4);
        const ang = (r() - 0.5) * 1.6;
        const len = H * (0.55 + r() * 0.35);
        ctx.save();
        ctx.translate(bx, H);
        ctx.rotate(ang);
        ctx.strokeStyle = "#35602a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.stroke();
        for (let k = 0.1; k < 1; k += 0.07) {
          const l = 22 * (1 - k * 0.7);
          const g = greens[Math.floor(r() * greens.length)];
          leaf(0, -len * k, l, 4, 1.2, g, "rgba(0,0,0,0)");
          leaf(0, -len * k, l, 4, -1.2, g, "rgba(0,0,0,0)");
        }
        ctx.restore();
      }
    });
    // 2: folhas vermelhas (como a planta vermelha dos renders)
    cell(0, H, () => {
      const reds = ["#8e1b22", "#a8242c", "#b8323a", "#7a1f2b", "#c4434a"];
      for (let i = 0; i < 60; i++) {
        const x = H * (0.15 + r() * 0.7);
        const y = H * (0.3 + r() * 0.68);
        leaf(x, y, 30 + r() * 26, 8 + r() * 6, (r() - 0.5) * 2.4, reds[Math.floor(r() * reds.length)], "rgba(60,0,0,.4)");
      }
    });
    // 3: capim / agave (folhas longas)
    cell(H, H, () => {
      for (let i = 0; i < 26; i++) {
        const ang = (r() - 0.5) * 1.9;
        leaf(H * (0.42 + r() * 0.16), H, H * (0.5 + r() * 0.45), 7 + r() * 5, ang, greens[Math.floor(r() * greens.length)], "rgba(255,255,255,.15)");
      }
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
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
        // a cena final tem luz assada; as folhas se iluminam pela própria textura
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: map,
        emissiveIntensity: 0.55,
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
  return (
    <group name="vegetacao">
      {byKind.map((cards, k) => (
        <Cards key={k} kind={k as Kind} cards={cards} map={map} />
      ))}
    </group>
  );
}
