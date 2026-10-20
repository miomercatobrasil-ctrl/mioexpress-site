"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// Produtos de verdade nas geladeiras Mio: rótulos recortados das fotos da loja (scripts/products-atlas.mjs)
// "vestidos" em formas simples (lata, garrafa, caixa). A textura é projetada de frente sobre a forma,
// como numa foto: o gargalo usa só o meio da imagem e a forma ganha volume e luz da cena.

const BASE = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/").replace(/models\/$/, "") + "textures/";

type Shape =
  | { kind: "lathe"; profile: [number, number][]; H: number; R: number }
  | { kind: "box"; w: number; h: number; d: number };

function can(H: number, R: number): Shape {
  const p: [number, number][] = [[0, 0], [R * 0.86, 0], [R, H * 0.06], [R, H * 0.88], [R * 0.84, H * 0.97], [R * 0.82, H], [0, H]];
  return { kind: "lathe", profile: p, H, R };
}
function bottle(H: number, R: number, shoulder: number, neckY: number, neckR: number): Shape {
  const p: [number, number][] = [
    [0, 0], [R * 0.9, 0], [R, H * 0.04], [R, H * shoulder], [neckR, H * neckY],
    [neckR, H * 0.94], [neckR * 1.18, H * 0.945], [neckR * 1.18, H], [0, H],
  ];
  return { kind: "lathe", profile: p, H, R };
}
const tub = (H: number, R: number): Shape => ({ kind: "lathe", profile: [[0, 0], [R * 0.84, 0], [R, H * 0.88], [R * 1.04, H * 0.9], [R * 1.04, H], [0, H]], H, R });

const SHAPES = {
  lata: can(0.122, 0.033),
  lataSlim: can(0.134, 0.0265),
  lata220: can(0.115, 0.029),
  lata290: can(0.125, 0.029),
  longneck: bottle(0.23, 0.031, 0.55, 0.8, 0.012),
  coronita: bottle(0.19, 0.027, 0.5, 0.78, 0.011),
  pet2l: bottle(0.28, 0.05, 0.62, 0.85, 0.014),
  petPequena: bottle(0.21, 0.034, 0.78, 0.9, 0.017),
  agua: bottle(0.28, 0.044, 0.7, 0.88, 0.014),
  caixa1l: { kind: "box", w: 0.07, h: 0.2, d: 0.07 },
  yopro: { kind: "box", w: 0.05, h: 0.13, d: 0.036 },
  toddynho: { kind: "box", w: 0.063, h: 0.075, d: 0.04 },
  pote: tub(0.07, 0.045),
} satisfies Record<string, Shape>;
type ShapeId = keyof typeof SHAPES;

const PRODUCT: Record<string, ShapeId> = {
  coca_lata: "lata", cocazero_lata: "lata", guarana_lata: "lata", heineken_lata: "lata", spaten: "lata",
  budweiser: "lata", brahma: "lata", eisenbahn: "lata",
  redbull: "lataSlim", fanta: "lata", cocazero_220: "lata220", schweppes: "lata220", delvalle_lata: "lata290",
  heineken_ln: "longneck", corona: "coronita",
  coca_2l: "pet2l", cocazero_2l: "pet2l", guarana_2l: "pet2l",
  gatorade: "petPequena", powerade: "petPequena", natural_one: "petPequena", crystal: "agua",
  puro_coco: "caixa1l", delvalle_uva: "caixa1l", delvalle_laranja: "caixa1l", kero_coco: "caixa1l",
  yopro: "yopro", toddynho: "toddynho", requeijao: "pote",
};

function footprint(s: Shape) {
  return s.kind === "box" ? { w: s.w, d: s.d, h: s.h } : { w: s.R * 2, d: s.R * 2, h: s.H };
}

function buildGeometry(s: Shape) {
  let g: THREE.BufferGeometry;
  let W: number, H: number;
  if (s.kind === "box") {
    g = new THREE.BoxGeometry(s.w, s.h, s.d);
    g.translate(0, s.h / 2, 0);
    W = s.w;
    H = s.h;
  } else {
    g = new THREE.LatheGeometry(s.profile.map(([r, y]) => new THREE.Vector2(r, y)), 20);
    W = s.R * 2;
    H = s.H;
  }
  // projeção frontal (como a foto): u pela largura, v pela altura
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, THREE.MathUtils.clamp(0.5 + pos.getX(i) / W, 0, 1), THREE.MathUtils.clamp(pos.getY(i) / H, 0, 1));
  }
  g.computeVertexNormals();
  return g;
}

// ─────────────── arrumação (fotos das geladeiras Mio) ───────────────
// prateleiras (altura da grade) de baixo para cima; a de cima tem ~15 cm livres
const LEVELS = [0.563, 0.873, 1.173, 1.483, 1.803];
type Item = [name: string, count: number, stack?: number];
type Fridge = { front: [number, number]; inward: [number, number]; layout: Item[][] };

const FRIDGES: Fridge[] = [
  {
    // geladeira_mio_1: porta para +z
    front: [1.545, 0.62],
    inward: [0, -1],
    layout: [
      [["guarana_2l", 2], ["crystal", 2]],
      [["redbull", 3], ["fanta", 1], ["cocazero_220", 1], ["schweppes", 1], ["delvalle_lata", 1]],
      [["coca_2l", 4]],
      [["budweiser", 1, 2], ["brahma", 1, 2], ["spaten", 1, 2], ["eisenbahn", 1, 2], ["heineken_lata", 2, 2]],
      [["toddynho", 2], ["requeijao", 1], ["coca_lata", 2], ["guarana_lata", 1]],
    ],
  },
  {
    // geladeira_mio_2: porta para −x
    front: [3.575, 3.32],
    inward: [1, 0],
    layout: [
      [["crystal", 3], ["powerade", 2]],
      [["puro_coco", 1], ["delvalle_uva", 1], ["delvalle_laranja", 1], ["kero_coco", 1], ["natural_one", 2]],
      [["cocazero_2l", 2], ["guarana_2l", 2]],
      [["heineken_lata", 2, 2], ["heineken_ln", 3], ["corona", 1]],
      [["yopro", 3], ["toddynho", 1], ["cocazero_lata", 3]],
    ],
  },
  {
    // geladeira_mio_3: porta para −x
    front: [3.575, 4.078],
    inward: [1, 0],
    layout: [
      [["guarana_2l", 2], ["crystal", 2]],
      [["powerade", 4], ["natural_one", 2]],
      [["coca_2l", 2], ["cocazero_2l", 2]],
      [["spaten", 2, 2], ["eisenbahn", 2, 2], ["brahma", 2, 2]],
      [["coca_lata", 6]],
    ],
  },
];

type Inst = { shape: ShapeId; tile: number[]; m: THREE.Matrix4 };

function layoutInstances(tiles: Record<string, number[]>) {
  const out: Inst[] = [];
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const o = new THREE.Object3D();
  for (const f of FRIDGES) {
    const [ix, iz] = f.inward;
    const rx = -iz, rz = ix; // direita de quem olha a porta
    const yaw = Math.atan2(-ix, -iz);
    f.layout.forEach((row, lv) => {
      const gap = 0.004;
      const widths = row.map(([n, c]) => footprint(SHAPES[PRODUCT[n]]).w * c + gap * c);
      let cursor = -widths.reduce((a, b) => a + b, 0) / 2;
      row.forEach(([n, count, stack = 1]) => {
        const shape = PRODUCT[n];
        const fp = footprint(SHAPES[shape]);
        const depthRows = Math.min(2, Math.floor(0.34 / (fp.d + gap)));
        for (let k = 0; k < count; k++) {
          const across = cursor + fp.w / 2;
          cursor += fp.w + gap;
          for (let d = 0; d < depthRows; d++) {
            const inward = 0.03 + fp.d / 2 + d * (fp.d + gap);
            for (let s = 0; s < stack; s++) {
              o.position.set(
                f.front[0] + rx * across + ix * inward + (rnd() - 0.5) * 0.004,
                LEVELS[lv] + s * fp.h,
                f.front[1] + rz * across + iz * inward + (rnd() - 0.5) * 0.004,
              );
              o.rotation.set(0, yaw + (rnd() - 0.5) * 0.18, 0);
              o.updateMatrix();
              out.push({ shape, tile: tiles[n], m: o.matrix.clone() });
            }
          }
        }
      });
    });
  }
  return out;
}

const glow = { value: 0.12 };

function makeMaterial(map: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aTile;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = aTile.xy + uv * aTile.zw;\n#endif");
    // luz interna da geladeira: os produtos brilham um pouco com a própria cor
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uGlow;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow;");
  };
  m.customProgramCacheKey = () => "mio-produtos";
  return m;
}

function useAtlas() {
  const [data, setData] = useState<{ map: THREE.Texture; tiles: Record<string, number[]> } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const tiles = (await (await fetch(BASE + "produtos.json")).json()) as Record<string, number[]>;
      const img = new Image();
      img.decoding = "async";
      img.src = BASE + "produtos.webp";
      await img.decode();
      const map = new THREE.Texture(img);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      map.needsUpdate = true;
      if (alive) setData({ map, tiles });
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/** Esconde as latas genéricas do projeto SketchUp dentro das geladeiras Mio. */
export function hideGenericFridgeProducts(scene: THREE.Object3D) {
  const generic = /^(Color_A05\.001|Color_A3|__Color_006_3|Color_A10)$/;
  for (const name of ["geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3"]) {
    scene.getObjectByName(name)?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material) && generic.test(m.material.name)) m.visible = false;
    });
  }
}

export function Products() {
  const atlas = useAtlas();
  const meshes = useMemo(() => {
    if (!atlas) return [];
    const inst = layoutInstances(atlas.tiles).filter((i) => i.tile);
    const mat = makeMaterial(atlas.map);
    const byShape = new Map<ShapeId, Inst[]>();
    inst.forEach((i) => byShape.set(i.shape, [...(byShape.get(i.shape) ?? []), i]));
    return [...byShape].map(([shape, list]) => {
      const g = buildGeometry(SHAPES[shape]);
      const tile = new Float32Array(list.length * 4);
      list.forEach((i, k) => tile.set(i.tile, k * 4));
      g.setAttribute("aTile", new THREE.InstancedBufferAttribute(tile, 4));
      const mesh = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((i, k) => mesh.setMatrixAt(k, i.m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.raycast = () => {};
      mesh.name = `produtos_${shape}`;
      return mesh;
    });
  }, [atlas]);
  useEffect(
    () => () =>
      meshes.forEach((m) => {
        m.geometry.dispose();
      }),
    [meshes],
  );
  useFrame((_, dt) => {
    const target = sceneStore.get().night ? 0.32 : 0.12;
    glow.value += (target - glow.value) * (1 - Math.exp(-4 * dt));
  });
  return (
    <group name="produtos">
      {meshes.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}
