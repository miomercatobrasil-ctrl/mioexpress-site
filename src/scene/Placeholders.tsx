"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { Box, HoverOutline, Interactive } from "./Interactive";
import { ARMARIO, CEILING_Y, COLORS, DIVISORIA, type Vec3 } from "./layout";
import { useFloorTexture, useHowItWorksPanel } from "./textures";

// Cena provisória: blocos nas medidas e posições da planta, com a cor de cada equipamento.
// Cada grupo usa o mesmo nome que o objeto terá no .glb (ver docs/PIPELINE-3D.md).

const HALF_PI = Math.PI / 2;

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const PRODUCT_COLORS = ["#e8b923", "#d8392b", "#2f6fb5", "#f0a01c", "#3c9a4a", "#f4e7c8", "#7d2f8a", "#e2622a", "#1f3f7a", "#ffffff", "#c9a227"];

type Item = { p: Vec3; s: Vec3; c: string };

/** Produtos como caixas instanciadas (uma única draw call). */
function Products({ items }: { items: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

function roundedPanelGeometry(w: number, h: number, r: number, depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - r);
  s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h);
  s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
}

function Logo({ position, width, white, rotation }: { position: Vec3; width: number; white?: boolean; rotation?: Vec3 }) {
  const tex = useTexture(white ? "/brand/logo-white.svg" : "/brand/logo.svg");
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width / 3.53]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/* ───────────────────────── Armário Mio + totem ───────────────────────── */

function Armario() {
  const { larguraTotal: W, painelTotem: P, profundidade: D, alturaCorpo: H, alturaTotal: HT, base: B, vaos, raioTopo } = ARMARIO;
  const total = W + P;
  const x0 = -total / 2; // borda esquerda (vista de frente)
  const xModEnd = x0 + W;
  const panelGeo = useMemo(() => roundedPanelGeometry(total, HT, raioTopo, 0.025), [total, HT, raioTopo]);
  const howTex = useHowItWorksPanel();

  const shelvesY = useMemo(() => {
    const ys: number[] = [];
    let y = B;
    for (const v of vaos.slice(0, -1)) {
      y += v;
      ys.push(y);
    }
    return ys; // 0.52, 0.80, 1.06, 1.32, 1.57
  }, [B, vaos]);

  const products = useMemo(() => {
    const r = rng(7);
    const items: Item[] = [];
    const levels = [B, ...shelvesY];
    for (let m = 0; m < 3; m++) {
      const mx0 = x0 + 0.02 + m * 1.02;
      levels.forEach((ly, li) => {
        const gap = vaos[li];
        let x = mx0 + 0.03;
        const palette = PRODUCT_COLORS[(m * 5 + li * 3) % PRODUCT_COLORS.length];
        while (x < mx0 + 0.95) {
          const w = 0.07 + r() * 0.1;
          if (x + w > mx0 + 0.96) break;
          const h = Math.min(gap - 0.05, gap * (0.3 + r() * 0.25) + w * 0.4);
          const c = r() < 0.6 ? palette : PRODUCT_COLORS[Math.floor(r() * PRODUCT_COLORS.length)];
          const dz = 0.1 + r() * 0.1;
          items.push({ p: [x + w / 2, ly + 0.02 + h / 2, 0.29 - dz / 2], s: [w * 0.94, h, dz], c });
          x += w + 0.005;
        }
      });
    }
    return items;
  }, [B, shelvesY, vaos, x0]);

  return (
    <Interactive id="armario_mio" position={[0, 0, ARMARIO.zCentroGrupo]} rotation={[0, HALF_PI, 0]}>
      {/* painel de fundo com topo arredondado (MDF Antuérpia) */}
      <mesh geometry={panelGeo}>
        <meshStandardMaterial color={COLORS.madeiraClara} emissive="#ffb35c" emissiveIntensity={0.12} roughness={0.8} />
        <HoverOutline />
      </mesh>
      <Logo position={[x0 + W / 2, H + (HT - H) / 2 - 0.01, 0.03]} width={1.05} />
      {/* base metalon */}
      <Box size={[W, B, D - 0.03]} position={[x0 + W / 2, B / 2, D / 2]} color={COLORS.preto} />
      {/* laterais e divisões (MDF Marsala) */}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          size={[0.02, H - B, D]}
          position={[x0 + 0.01 + i * 1.02 - (i === 3 ? 0.0 : 0), B + (H - B) / 2, D / 2]}
          color={COLORS.marsala}
          outline
        />
      ))}
      <Box size={[W, 0.1, D]} position={[x0 + W / 2, H - 0.05, D / 2]} color={COLORS.marsala} outline />
      <Box size={[W, 0.02, D]} position={[x0 + W / 2, B + 0.01, D / 2]} color={COLORS.marsala} />
      {/* prateleiras inclinadas com borda + perfil LED */}
      {shelvesY.map((y) => (
        <group key={y} position={[x0 + W / 2, y, 0.03]}>
          <Box size={[W - 0.04, 0.02, 0.25]} position={[0, 0, 0.125]} rotation={[0.06, 0, 0]} color="#cfc6b8" />
          <Box size={[W - 0.04, 0.04, 0.01]} position={[0, 0.01, 0.255]} color="#bdb3a3" />
          <Box size={[W - 0.06, 0.008, 0.012]} position={[0, -0.018, 0.23]} color={COLORS.led} emissive={COLORS.led} emissiveIntensity={3} />
        </group>
      ))}
      <Box size={[W - 0.06, 0.008, 0.012]} position={[x0 + W / 2, H - 0.105, 0.26]} color={COLORS.led} emissive={COLORS.led} emissiveIntensity={3} />
      <Products items={products} />

      {/* painel lateral "Como funciona" */}
      <mesh position={[xModEnd + P / 2, 1.5, 0.027]}>
        <planeGeometry args={[0.24, 0.94]} />
        <meshStandardMaterial map={howTex} roughness={0.9} />
      </mesh>
      <Totem x={xModEnd + P / 2} />
    </Interactive>
  );
}

function Totem({ x }: { x: number }) {
  return (
    <Interactive id="totem_pagamento" position={[x, 0, 0]}>
      {/* prateleira p/ totem a 90 cm */}
      <Box size={[0.3, 0.025, 0.25]} position={[0, 0.9, 0.15]} color={COLORS.madeiraClara} outline />
      {/* leitor/totem */}
      <Box size={[0.2, 0.06, 0.18]} position={[0, 0.945, 0.16]} color={COLORS.preto} outline roughness={0.4} />
      <group position={[0, 1.04, 0.13]} rotation={[-0.45, 0, 0]}>
        <Box size={[0.2, 0.16, 0.03]} color={COLORS.preto} outline roughness={0.3} />
        <Box size={[0.16, 0.11, 0.004]} position={[0, 0.005, 0.017]} color="#5d8fd6" emissive="#7fb2ff" emissiveIntensity={0.9} />
      </group>
      {/* ganho p/ sacolas + ecobag */}
      <Box size={[0.02, 0.02, 0.06]} position={[0, 0.78, 0.04]} color="#9a9a9a" metalness={0.6} roughness={0.3} />
      <Box size={[0.26, 0.32, 0.03]} position={[0, 0.55, 0.08]} rotation={[0.05, 0, 0]} color="#efe6d4" outline />
      <Box size={[0.012, 0.12, 0.012]} position={[-0.07, 0.74, 0.07]} color="#efe6d4" />
      <Box size={[0.012, 0.12, 0.012]} position={[0.07, 0.74, 0.07]} color="#efe6d4" />
    </Interactive>
  );
}

/* ───────────────────────── Geladeiras e freezer ───────────────────────── */

type FridgeProps = {
  id: "geladeira_mio_1" | "geladeira_mio_2" | "geladeira_mio_3" | "geladeira_coca";
  position: Vec3;
  rotationY: number;
  width: number;
  depth?: number;
  height?: number;
  body: string;
  seed: number;
  brand?: "mio" | "none";
};

function Fridge({ id, position, rotationY, width: w, depth: d = 0.6, height: h = 1.9, body, seed, brand = "mio" }: FridgeProps) {
  const base = 0.22;
  const head = 0.2;
  const cans = useMemo(() => {
    const r = rng(seed);
    const items: Item[] = [];
    const shelves = 5;
    const inner = h - base - head - 0.06;
    const canColors = ["#c8141b", "#e7e2d5", "#2c7a3d", "#d9a21b", "#1d3f8f", "#7a1f2b", "#111111"];
    for (let s = 0; s < shelves; s++) {
      const y = base + 0.04 + (s * inner) / shelves;
      const c = canColors[Math.floor(r() * canColors.length)];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const tall = r() < 0.35;
        const ch = tall ? 0.26 : 0.13;
        items.push({ p: [-w / 2 + 0.08 + (i * (w - 0.16)) / (n - 1), y + 0.005 + ch / 2, d * 0.62], s: [0.065, ch, 0.065], c: tall ? "#3d6b4a" : c });
      }
    }
    return items;
  }, [seed, w, d, h]);

  return (
    <Interactive id={id} position={position} rotation={[0, rotationY, 0]}>
      {/* corpo oco: fundo, laterais, topo e base (o interior fica visível pelo vidro) */}
      <Box size={[w, h, 0.04]} position={[0, h / 2, 0.02]} color={body} outline roughness={0.5} />
      <Box size={[0.04, h, d - 0.04]} position={[-w / 2 + 0.02, h / 2, (d - 0.04) / 2]} color={body} outline roughness={0.5} />
      <Box size={[0.04, h, d - 0.04]} position={[w / 2 - 0.02, h / 2, (d - 0.04) / 2]} color={body} outline roughness={0.5} />
      <Box size={[w, head, d - 0.04]} position={[0, h - head / 2, (d - 0.04) / 2]} color={body} outline roughness={0.5} />
      <Box size={[w, base, d - 0.04]} position={[0, base / 2, (d - 0.04) / 2]} color={body} outline roughness={0.5} />
      {/* fundo iluminado */}
      <Box size={[w - 0.08, h - base - head, 0.01]} position={[0, base + (h - base - head) / 2, 0.045]} color="#f6f3ee" emissive="#fff4e4" emissiveIntensity={0.45} />
      {/* prateleiras aramadas */}
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} size={[w - 0.08, 0.01, d - 0.12]} position={[0, base + 0.035 + (i * (h - base - head - 0.06)) / 5, (d - 0.04) / 2]} color="#c9c9c9" metalness={0.6} roughness={0.4} />
      ))}
      <Products items={cans} />
      {/* vidro */}
      <Box size={[w - 0.06, h - base - head, 0.008]} position={[0, base + (h - base - head) / 2, d - 0.03]} color="#cfe3ea" opacity={0.14} roughness={0.05} />
      {/* frente: cabeçote e grade */}
      {brand === "mio" ? (
        <Logo white position={[0, h - head / 2, d - 0.035]} width={w * 0.62} />
      ) : (
        <Box size={[w - 0.04, 0.03, 0.005]} position={[0, h - head / 2, d - 0.0375]} color="#ffffff" />
      )}
    </Interactive>
  );
}

function Freezer() {
  const w = 0.79;
  const d = 0.52;
  const h = 0.86;
  return (
    <Interactive id="freezer_loslos" position={[4.12, 0, 2.43]} rotation={[0, -HALF_PI, 0]}>
      <Box size={[w, h, d]} position={[0, 0.06 + h / 2, d / 2]} color="#141414" outline roughness={0.45} />
      <Box size={[w + 0.02, 0.06, d + 0.02]} position={[0, 0.06 + h + 0.02, d / 2]} color="#b9b9b9" metalness={0.5} roughness={0.35} outline />
      <Box size={[w - 0.06, 0.02, d - 0.06]} position={[0, 0.06 + h + 0.055, d / 2]} color="#dceaf0" opacity={0.45} roughness={0.05} />
      {/* painel frontal (logo do fabricante no ambiente real) */}
      <Box size={[0.42, 0.36, 0.005]} position={[0, 0.48, d + 0.003]} color="#efe3cf" />
      {/* display no topo */}
      <Box size={[0.6, 0.2, 0.02]} position={[0, 1.08, 0.04]} color="#f4ead6" outline />
      {[0.1, 0.4].map((z) =>
        [-0.3, 0.3].map((x) => <Box key={`${x}${z}`} size={[0.04, 0.06, 0.04]} position={[x, 0.03, z]} color="#777" />),
      )}
    </Interactive>
  );
}

/* ───────────────────────── Divisórias ripadas ───────────────────────── */

const SLAT_COLORS = { W: COLORS.madeiraRipa, V: COLORS.vinho, P: COLORS.preto } as const;
// sequência aproximada da prancha 03 (madeira clara, vinho e preto)
const PATTERN_1 = "WWVWWWPWWVWWWPWWVWWWPWWVWWPWVW";
const PATTERN_2 = "WWVWWWPWW";

function Divisoria({ id, position, length, pattern, sign }: { id: "divisoria_ripada_1" | "divisoria_ripada_2"; position: Vec3; length: number; pattern: string; sign?: boolean }) {
  const { ripaLargura, ripaProf, passo, alturaRipa, base } = DIVISORIA;
  const n = Math.floor((length + passo - ripaLargura) / passo);
  const offset = (length - ((n - 1) * passo + ripaLargura)) / 2;
  return (
    // local: comprimento ao longo de +X; rotação de 90° aponta a face para o jardim (+X do mundo)
    <Interactive id={id} position={position} rotation={[0, HALF_PI, 0]}>
      <Box size={[length, base, ripaProf]} position={[length / 2, base / 2, 0]} color={COLORS.preto} outline roughness={0.6} />
      {Array.from({ length: n }, (_, i) => {
        const c = SLAT_COLORS[(pattern[i % pattern.length] as keyof typeof SLAT_COLORS) ?? "W"];
        return (
          <Box
            key={i}
            size={[ripaLargura, alturaRipa, ripaProf]}
            position={[offset + ripaLargura / 2 + i * passo, base + alturaRipa / 2, 0]}
            color={c}
            outline
            roughness={0.75}
          />
        );
      })}
      {sign && (
        <group position={[length / 2, 1.55, ripaProf / 2 + 0.012]}>
          <Box size={[0.7, 0.4, 0.02]} color={COLORS.madeiraClara} outline />
          <Logo position={[0, 0, 0.011]} width={0.56} />
        </group>
      )}
    </Interactive>
  );
}

/* ───────────────────────── Banco, jardim, piso, paredes ───────────────────────── */

function Banco() {
  return (
    <Interactive id="banco" position={[3.47, 0, -0.8]}>
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} size={[0.06, 0.035, 1.2]} position={[-0.14 + i * 0.07, 0.45, 0]} color={COLORS.madeiraEscura} outline />
      ))}
      {[-0.55, 0.55].map((z) => (
        <group key={z}>
          <Box size={[0.04, 0.43, 0.04]} position={[-0.14, 0.215, z]} color={COLORS.madeiraEscura} />
          <Box size={[0.04, 0.43, 0.04]} position={[0.14, 0.215, z]} color={COLORS.madeiraEscura} />
        </group>
      ))}
    </Interactive>
  );
}

function Plant({ position, scale = 1, color = "#4f7d36", kind = "bush" }: { position: Vec3; scale?: number; color?: string; kind?: "bush" | "bamboo" | "spiky" }) {
  if (kind === "bamboo") {
    return (
      <group position={position} scale={scale}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[Math.sin(i * 2.1) * 0.12, 0, Math.cos(i * 2.1) * 0.12]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.015, 0.02, 1.8, 5]} />
              <meshStandardMaterial color="#6f8a3a" />
            </mesh>
            <mesh position={[0, 1.6 + i * 0.12, 0]} scale={[0.18, 0.32, 0.18]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#2f5e2a" flatShading />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
  if (kind === "spiky") {
    return (
      <group position={position} scale={scale}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[0, 0.3, 0]} rotation={[Math.sin(i) * 0.5, i, Math.cos(i * 1.7) * 0.5]}>
            <coneGeometry args={[0.05, 0.7, 4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <mesh position={position} scale={scale}>
      <icosahedronGeometry args={[0.22, 1]} />
      <meshStandardMaterial color={color} flatShading roughness={0.9} />
    </mesh>
  );
}

function Jardim() {
  const grass = COLORS.grama;
  return (
    <group name="jardim">
      {/* canteiro esquerdo (diante da divisória 1) */}
      <Box size={[4.3, 0.05, 2.65]} position={[4.48 + 2.15, 0.025, 1.97 + 1.325]} color={grass} roughness={1} />
      <Box size={[4.3, 0.08, 0.06]} position={[4.48 + 2.15, 0.04, 1.97]} color={COLORS.meioFio} />
      <Box size={[0.06, 0.08, 2.65]} position={[4.48, 0.04, 1.97 + 1.325]} color={COLORS.meioFio} />
      {/* canteiro direito (banco) */}
      <Box size={[4.44, 0.05, 1.72]} position={[4.36 + 2.22, 0.025, -1.6 + 0.86]} color={grass} roughness={1} />
      <Box size={[4.44, 0.08, 0.06]} position={[4.36 + 2.22, 0.04, 0.12]} color={COLORS.meioFio} />
      <Box size={[0.06, 0.08, 1.72]} position={[4.36, 0.04, -0.74]} color={COLORS.meioFio} />
      {/* vegetação leve (low-poly) */}
      <Plant kind="bamboo" position={[4.75, 0, 2.5]} />
      <Plant kind="bamboo" position={[4.8, 0, 3.6]} scale={0.9} />
      <Plant position={[5.6, 0.18, 2.4]} color="#7fae46" />
      <Plant position={[6.1, 0.15, 2.9]} scale={0.8} color="#6c9b3c" />
      <Plant position={[5.2, 0.15, 3.1]} scale={0.7} color="#4f7d36" />
      <Plant position={[7.2, 0.2, 2.5]} scale={1.1} color="#86b54c" />
      <Plant kind="spiky" position={[5.3, 0, -0.5]} color="#3f7a3a" />
      <Plant kind="spiky" position={[5.9, 0, -0.9]} scale={1.3} color="#a3202a" />
      <Plant kind="spiky" position={[6.6, 0, -0.4]} scale={1.1} color="#b8323a" />
      <Plant position={[7.4, 0.2, -0.6]} color="#5b8b3a" />
      {/* vasos junto à divisória 2 */}
      {[0.15, 0.5].map((z) => (
        <group key={z} position={[2.78, 0, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.12, 0.1, 0.3, 10]} />
            <meshStandardMaterial color="#3b2a22" />
          </mesh>
          <Plant position={[0, 0.5, 0]} scale={0.7} color="#4e8a3a" />
        </group>
      ))}
    </group>
  );
}

function Piso() {
  const tex = useFloorTexture(6, 4.5);
  return (
    <mesh name="piso" rotation={[-HALF_PI, 0, 0]} position={[4.35, 0, 1.675]}>
      <planeGeometry args={[9.1, 6.55]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
}

function Paredes() {
  const p = COLORS.parede;
  return (
    <group name="paredes">
      <Box size={[0.1, CEILING_Y, 5.1]} position={[-0.05, CEILING_Y / 2, 2.45]} color={p} />
      <Box size={[2.97, CEILING_Y, 0.1]} position={[1.435, CEILING_Y / 2, -0.05]} color={p} />
      <Box size={[0.1, CEILING_Y, 1.6]} position={[3.07, CEILING_Y / 2, -0.8]} color={p} />
      <Box size={[2.7, CEILING_Y, 0.1]} position={[1.3, CEILING_Y / 2, 5.0]} color={p} />
      <Box size={[0.1, CEILING_Y, 0.6]} position={[2.65, CEILING_Y / 2, 4.7]} color={p} />
      <Box size={[1.73, CEILING_Y, 0.1]} position={[3.47, CEILING_Y / 2, 4.45]} color={p} />
      {/* mureta branca em primeiro plano (render externo) */}
      <Box size={[2.6, 1.2, 0.18]} position={[7.4, 0.6, 4.68]} color="#f4f1ea" />
      {/* porta branca à direita do armário */}
      <Box size={[0.03, 2.1, 0.82]} position={[0.015, 1.05, 0.6]} color="#f8f6f1" />
      <Box size={[0.04, 0.02, 0.12]} position={[0.04, 1.0, 0.3]} color="#8d8d8d" metalness={0.7} roughness={0.3} />
      {/* janela basculante na parede do banco */}
      <Box size={[0.03, 0.45, 0.6]} position={[3.135, 2.05, -1.0]} color="#cfe2e6" emissive="#e8f4f6" emissiveIntensity={0.5} />
      {/* teto */}
      <Box size={[7.0, 0.05, 6.6]} position={[3.4, CEILING_Y + 0.025, 1.675]} color={COLORS.teto} emissive="#efe5d4" emissiveIntensity={0.55} />
      {/* spots e anel de LED */}
      {(
        [
          [1.6, 2.6],
          [1.6, 1.0],
          [3.6, 1.05],
          [5.4, 1.0],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, CEILING_Y - 0.002, z]} rotation={[HALF_PI, 0, 0]}>
          {i === 0 ? <torusGeometry args={[0.22, 0.015, 6, 40]} /> : <circleGeometry args={[0.07, 20]} />}
          <meshBasicMaterial color="#fff6e0" side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function PlaceholderScene() {
  return (
    <group name="mio_terracos">
      <Piso />
      <Paredes />
      <Jardim />
      <Armario />
      <Fridge id="geladeira_mio_1" position={[1.595, 0, 0.03]} rotationY={0} width={0.67} body={COLORS.geladeiraVinho} seed={11} />
      <Fridge id="geladeira_coca" position={[2.3, 0, 0.0]} rotationY={0} width={0.66} depth={0.68} height={1.95} body={COLORS.coca} seed={23} brand="none" />
      <Freezer />
      <Fridge id="geladeira_mio_2" position={[4.15, 0, 3.305]} rotationY={-HALF_PI} width={0.72} body={COLORS.geladeiraVinho} seed={31} />
      <Fridge id="geladeira_mio_3" position={[4.15, 0, 4.03]} rotationY={-HALF_PI} width={0.66} body={COLORS.geladeiraVinho} seed={47} />
      <Divisoria id="divisoria_ripada_1" position={[4.38, 0, 4.37]} length={2.4} pattern={PATTERN_1} />
      <Divisoria id="divisoria_ripada_2" position={[2.97, 0, 0.7]} length={0.7} pattern={PATTERN_2} sign />
      <Banco />
    </group>
  );
}
