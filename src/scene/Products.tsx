"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "./store";

// Produtos de verdade nas geladeiras, no freezer e no armário: rótulos recortados das fotos da loja (scripts/products-atlas.mjs)
// "vestidos" em formas simples (lata, garrafa, caixa). A textura é projetada de frente sobre a forma,
// como numa foto: o gargalo usa só o meio da imagem e a forma ganha volume e luz da cena.

const BASE = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/").replace(/models\/$/, "") + "textures/";

type Shape =
  | { kind: "lathe"; profile: [number, number][]; H: number; R: number }
  | { kind: "box"; w: number; h: number; d: number }
  | { kind: "pillow"; w: number; h: number; d: number };

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
  pet15: bottle(0.235, 0.045, 0.62, 0.85, 0.013),
  petPequena: bottle(0.21, 0.034, 0.78, 0.9, 0.017),
  agua: bottle(0.28, 0.044, 0.7, 0.88, 0.014),
  caixa1l: { kind: "box", w: 0.07, h: 0.2, d: 0.07 },
  yopro: { kind: "box", w: 0.05, h: 0.13, d: 0.036 },
  toddynho: { kind: "box", w: 0.063, h: 0.075, d: 0.04 },
  pote: tub(0.07, 0.045),
  pizza: { kind: "box", w: 0.27, h: 0.25, d: 0.04 },
  marmita: { kind: "box", w: 0.2, h: 0.14, d: 0.045 },
  escondidinho: { kind: "box", w: 0.21, h: 0.14, d: 0.05 },
  picole: { kind: "pillow", w: 0.072, h: 0.2, d: 0.03 },
  // armário
  salgadinho: { kind: "pillow", w: 0.19, h: 0.27, d: 0.08 },
  pouchMedio: { kind: "pillow", w: 0.15, h: 0.21, d: 0.06 },
  pouch: { kind: "pillow", w: 0.13, h: 0.17, d: 0.05 },
  pouchPequeno: { kind: "pillow", w: 0.11, h: 0.16, d: 0.035 },
  lamen: { kind: "pillow", w: 0.19, h: 0.12, d: 0.045 },
  pringles: can(0.235, 0.038),
  copoLamen: tub(0.105, 0.046),
  omo: { kind: "box", w: 0.17, h: 0.14, d: 0.06 },
  neve: { kind: "pillow", w: 0.23, h: 0.21, d: 0.11 },
  condensado: { kind: "box", w: 0.065, h: 0.12, d: 0.045 },
  chocolate: { kind: "box", w: 0.15, h: 0.094, d: 0.02 },
  bis: { kind: "box", w: 0.06, h: 0.135, d: 0.03 },
  detergente: bottle(0.24, 0.031, 0.72, 0.86, 0.013),
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
  pizza_frango: "pizza", pizza_calabresa: "pizza", escondidinho: "escondidinho",
  marmita_frango: "marmita", marmita_lentilha: "marmita", marmita_almondega: "marmita",
  picole_7belo: "picole", picole_doce_leite: "picole", picole_speculoos: "picole", picole_banoffee: "picole",
  arm_ruffles: "salgadinho", arm_ruffles_churrasco: "salgadinho", arm_doritos: "salgadinho", arm_cheetos: "salgadinho",
  arm_yoki_palha: "pouchMedio", arm_yoki_japones: "pouchMedio",
  arm_mms_amendoim: "pouch", arm_mms_chocolate: "pouch", arm_mms_crispy: "pouch",
  arm_fini_dentadura: "pouchPequeno", arm_fini_tubes: "pouchPequeno", arm_heinz: "pouchPequeno",
  arm_nissin_galinha: "lamen", arm_nissin_carne: "lamen", arm_cupnoodles: "copoLamen",
  arm_pringles: "pringles", arm_pringles_creme: "pringles",
  arm_omo: "omo", arm_neve: "neve", arm_italac_leite: "caixa1l", arm_italac_condensado: "condensado",
  arm_kitkat: "chocolate", arm_kitkat_white: "chocolate", arm_bis: "bis", arm_ype_neutro: "detergente", arm_ype_limao: "detergente",
  picole_pudim: "picole", picole_ovomaltine: "picole", picole_choco_dubai: "picole", picole_pistache: "picole", picole_nuts: "picole",
};

function footprint(s: Shape) {
  return s.kind === "lathe" ? { w: s.R * 2, d: s.R * 2, h: s.H } : { w: s.w, d: s.d, h: s.h };
}

function buildGeometry(s: Shape) {
  let g: THREE.BufferGeometry;
  let W: number, H: number;
  if (s.kind === "pillow") {
    // embalagem flexível: estufada no meio, achatada nas bordas e soldada nas pontas
    g = new THREE.BoxGeometry(s.w, s.h, s.d, 12, 16, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const fx = 1 - Math.pow((2 * p.getX(i)) / s.w, 2);
      const fy = 1 - Math.pow((2 * p.getY(i)) / s.h, 8);
      p.setZ(i, p.getZ(i) * Math.max(0.08, fx * fy));
    }
    g.translate(0, s.h / 2, 0);
    W = s.w;
    H = s.h;
  } else if (s.kind === "box") {
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
type Fridge = {
  front: [number, number];
  inward: [number, number];
  layout: Item[][];
  levels?: number[];
  shape?: Partial<Record<string, ShapeId>>;
  /** profundidade útil da prateleira e recuo da primeira fileira (padrão: geladeira) */
  depth?: number;
  inset?: number;
};

// armário Mio: 3 módulos de 1 m (frente para +x), prateleiras de baixo para cima; arrumação da foto da loja
const ARM_LEVELS = [0.12, 0.56, 0.85, 1.09, 1.36, 1.62, 1.98];
const armModule = (z: number, layout: Item[][]): Fridge => ({ front: [0.25, z], inward: [-1, 0], levels: ARM_LEVELS, depth: 0.2, inset: 0.012, layout });
const ARMARIO: Fridge[] = [
  armModule(2.03, [
    [["arm_omo", 2, 2], ["arm_ype_neutro", 4], ["arm_ype_limao", 4]],
    [["arm_ruffles", 2], ["arm_ruffles_churrasco", 2]],
    [["arm_italac_leite", 6], ["arm_italac_condensado", 4]],
    [["arm_mms_amendoim", 2], ["arm_mms_chocolate", 2], ["arm_mms_crispy", 2]],
    [["arm_kitkat", 3, 2], ["arm_kitkat_white", 2, 2]],
    [["arm_nissin_galinha", 4, 2]],
    [["arm_cupnoodles", 8, 2]],
  ]),
  armModule(3.05, [
    [["arm_ype_neutro", 7], ["arm_ype_limao", 7]],
    [["arm_doritos", 2], ["arm_cheetos", 2]],
    [["arm_heinz", 4], ["arm_bis", 6]],
    [["arm_fini_dentadura", 3], ["arm_fini_tubes", 3]],
    [["arm_kitkat_white", 3, 2], ["arm_kitkat", 2, 2]],
    [["arm_nissin_carne", 4, 2]],
    [["arm_cupnoodles", 8, 2]],
  ]),
  armModule(4.07, [
    [["arm_ype_limao", 4], ["arm_ype_neutro", 4], ["arm_omo", 2, 2]],
    [["arm_yoki_palha", 3], ["arm_yoki_japones", 2]],
    [["arm_pringles", 6], ["arm_pringles_creme", 6]],
    [["arm_ruffles", 2], ["arm_doritos", 2]],
    [["arm_mms_chocolate", 3], ["arm_mms_amendoim", 3]],
    [["arm_pringles_creme", 6], ["arm_pringles", 6]],
    [["arm_cupnoodles", 8, 2]],
  ]),
];

const FRIDGES: Fridge[] = [
  {
    // geladeira da Coca (porta para +z): só produtos da linha Coca-Cola; prateleiras a cada ~30 cm
    front: [2.245, 0.6],
    inward: [0, -1],
    levels: [0.41, 0.66, 0.965, 1.255, 1.555, 1.815],
    shape: { coca_2l: "pet15", cocazero_2l: "pet15" },
    layout: [
      [["powerade", 6]],
      [["coca_2l", 3], ["cocazero_2l", 2]],
      [["fanta", 4], ["schweppes", 4]],
      [["coca_lata", 4, 2], ["cocazero_lata", 4, 2]],
      [["delvalle_uva", 3], ["delvalle_laranja", 3]],
      [["coca_lata", 4], ["cocazero_220", 4]],
    ],
  },
  {
    // geladeira_mio_1: usada como freezer (congelados Sadia e Liv Up); porta para +z
    front: [1.545, 0.62],
    inward: [0, -1],
    layout: [
      [["pizza_frango", 1], ["escondidinho", 1]],
      [["pizza_calabresa", 1], ["escondidinho", 1]],
      [["marmita_frango", 1], ["marmita_lentilha", 1]],
      [["marmita_almondega", 1], ["marmita_frango", 1]],
      [["marmita_lentilha", 1], ["marmita_almondega", 1]],
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

type Tile = { atlas: number; uv: number[] };
type Inst = { shape: ShapeId; tile: Tile; m: THREE.Matrix4 };

function layoutInstances(tiles: Record<string, Tile>) {
  const out: Inst[] = [];
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const o = new THREE.Object3D();
  for (const f of [...FRIDGES, ...ARMARIO]) {
    const [ix, iz] = f.inward;
    const rx = -iz, rz = ix; // direita de quem olha a porta
    const yaw = Math.atan2(-ix, -iz);
    f.layout.forEach((row, lv) => {
      const gap = 0.004;
      const widths = row.map(([n, c]) => footprint(SHAPES[f.shape?.[n] ?? PRODUCT[n]]).w * c + gap * c);
      let cursor = -widths.reduce((a, b) => a + b, 0) / 2;
      row.forEach(([n, count, stack = 1]) => {
        const shape = f.shape?.[n] ?? PRODUCT[n];
        const fp = footprint(SHAPES[shape]);
        const depthRows = Math.min(fp.d < 0.06 ? 5 : 2, Math.floor((f.depth ?? 0.34) / (fp.d + gap)));
        for (let k = 0; k < count; k++) {
          const across = cursor + fp.w / 2;
          cursor += fp.w + gap;
          for (let d = 0; d < depthRows; d++) {
            const inward = (f.inset ?? 0.03) + fp.d / 2 + d * (fp.d + gap);
            for (let s = 0; s < stack; s++) {
              o.position.set(
                f.front[0] + rx * across + ix * inward + (rnd() - 0.5) * 0.004,
                (f.levels ?? LEVELS)[lv] + s * fp.h,
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
  // freezer Los Los (frente para −x, tampa de vidro em y ≈ 0,87): picolés deitados nas cestas, um sabor por pilha
  const flavors = ["7belo", "doce_leite", "speculoos", "banoffee", "pudim", "ovomaltine", "choco_dubai", "pistache", "nuts"];
  let f = 0;
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 2; row++)
      for (let side = 0; side < 2; side++) {
        const n = "picole_" + flavors[f++ % flavors.length];
        const z = 2.22 + col * 0.155 + (side - 0.5) * 0.076;
        for (let layer = 0; layer < 3; layer++) {
          o.position.set(3.86 + row * 0.2 + (rnd() - 0.5) * 0.01, 0.6 + layer * 0.028, z + (rnd() - 0.5) * 0.008);
          // deitado com a frente para cima e o comprimento ao longo de x; leve inclinação dentro da cesta
          o.rotation.set(-Math.PI / 2 + 0.18 + (rnd() - 0.5) * 0.1, Math.PI / 2 + (rnd() - 0.5) * 0.12, 0, "YXZ");
          o.updateMatrix();
          out.push({ shape: "picole", tile: tiles[n], m: o.matrix.clone() });
        }
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

const ATLASES = ["produtos", "produtos-armario"];

function useAtlases() {
  const [data, setData] = useState<{ maps: THREE.Texture[]; tiles: Record<string, Tile> } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      ATLASES.map(async (name, atlas) => {
        const json = (await (await fetch(BASE + name + ".json")).json()) as Record<string, number[]>;
        const img = new Image();
        img.decoding = "async";
        img.src = BASE + name + ".webp";
        await img.decode();
        const map = new THREE.Texture(img);
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        map.needsUpdate = true;
        return { map, tiles: Object.fromEntries(Object.entries(json).map(([k, uv]) => [k, { atlas, uv }])) };
      }),
    )
      .then((list) => alive && setData({ maps: list.map((l) => l.map), tiles: Object.assign({}, ...list.map((l) => l.tiles)) }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/** Esconde as latas genéricas do projeto SketchUp dentro das geladeiras. */
export function hideGenericFridgeProducts(scene: THREE.Object3D) {
  // latas/garrafas do SketchUp: das geladeiras Mio e da Coca (parte das latas da Coca caiu no grupo da Mio 1)
  const generic =
    /^(Color_A05\.001|Color_A3|__Color_006_3|Color_A10|coca-cola-fanta-sprite-cans.*|Metal_Aluminum_Anodized|__Color_007_1|_20124204932-Coca_Zero_Lata|images|Acrylic_Trasparent_Green|__auto_\d?)$/;
  for (const name of ["geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3", "geladeira_coca"]) {
    scene.getObjectByName(name)?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material) && generic.test(m.material.name)) m.visible = false;
    });
  }
  // armário: fica só a marcenaria (o resto são os produtos genéricos do projeto)
  const structure = /^(Color_A07|Color_B03|__Wood_Bamboo_2|Color_E01|__Color_E01_1|logo_novo-removebg-preview|ModelUp_Tote-bag.*|Color_008|Color_007|Translucent_Glass_Blue\.001|_0131_Silver)$/;
  scene.getObjectByName("armario_mio")?.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material) && !structure.test(m.material.name)) m.visible = false;
  });
}

export function Products() {
  const atlas = useAtlases();
  const meshes = useMemo(() => {
    if (!atlas) return [];
    const inst = layoutInstances(atlas.tiles).filter((i) => i.tile);
    const mats = atlas.maps.map(makeMaterial);
    const groups = new Map<string, Inst[]>();
    inst.forEach((i) => {
      const k = `${i.tile.atlas}:${i.shape}`;
      groups.set(k, [...(groups.get(k) ?? []), i]);
    });
    return [...groups].map(([key, list]) => {
      const shape = list[0].shape;
      const g = buildGeometry(SHAPES[shape]);
      const tile = new Float32Array(list.length * 4);
      list.forEach((i, k) => tile.set(i.tile.uv, k * 4));
      g.setAttribute("aTile", new THREE.InstancedBufferAttribute(tile, 4));
      const mesh = new THREE.InstancedMesh(g, mats[list[0].tile.atlas], list.length);
      list.forEach((i, k) => mesh.setMatrixAt(k, i.m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.raycast = () => {};
      mesh.name = `produtos_${key}`;
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
