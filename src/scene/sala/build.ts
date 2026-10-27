import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

// Loja Mio projetada para um condomínio (planta em L). Metros.
// x: do vidro da administração (x = 0) para a direita; z: da parede do fundo (z = 0) até a porta (z = zb).
export type SalaPlan = {
  glb: string;
  h: number; // pé-direito
  zb: number; // profundidade total (fundo -> drywall da porta)
  xr: number; // largura no fundo (até a janela)
  xl: number; // largura na parte da frente (até o vidro externo)
  zs: number; // onde a parede recua (fim da janela de cima)
  xw: number; // coluna junto ao vidro da administração
  zw: number; // comprimento da parede das geladeiras
};

export const PLAN_V8K3: SalaPlan = { glb: "/models/mio-terracos.glb", h: 2.8, zb: 5.5, xr: 5.25, xl: 4.22, zs: 3.0, xw: 0.27, zw: 2.3 };

type V3 = [number, number, number];
export const SALA_VIEWS: { label: string; position: V3; target: V3 }[] = [
  { label: "Entrada", position: [3.7, 1.65, 5.2], target: [1.8, 1.0, 1.0] },
  { label: "Armário", position: [4.1, 1.6, 2.7], target: [2.7, 1.0, 0.2] },
  { label: "Geladeiras", position: [2.7, 1.6, 1.5], target: [0.3, 1.0, 1.1] },
  { label: "Congelados", position: [1.7, 1.6, 2.9], target: [1.4, 0.9, 5.4] },
  { label: "Janela", position: [1.2, 1.6, 4.3], target: [4.8, 1.0, 1.4] },
];

const CORES = ["#d63a2f", "#f2b632", "#2f6fd6", "#3aa35b", "#f4f1e8", "#8b4fc9", "#e97a2a", "#1f9bb3"];

function plankTexture(xr: number, zb: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const rows = 8, rh = 1024 / rows;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < rows; r++) {
    let x = -((r * 397) % 600);
    while (x < 1024) {
      const len = 500 + ((r * 131 + x) % 300), base = 98 + ((r * 37 + Math.floor(x)) % 12);
      g.fillStyle = `rgb(${base},${base + 2},${base + 4})`;
      g.fillRect(x, r * rh, len, rh);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = i % 2 ? "rgba(60,62,66,0.12)" : "rgba(150,152,156,0.12)";
        g.beginPath();
        const yy = r * rh + rnd() * rh;
        g.moveTo(x, yy);
        g.bezierCurveTo(x + len * 0.3, yy + 4, x + len * 0.6, yy - 4, x + len, yy);
        g.stroke();
      }
      g.fillStyle = "rgba(30,30,32,0.55)";
      g.fillRect(x, r * rh, 3, rh);
      x += len;
    }
    g.fillStyle = "rgba(30,30,32,0.5)";
    g.fillRect(0, r * rh, 1024, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(xr / 3.2, zb / 1.4);
  t.anisotropy = 8;
  return t;
}

// vista do jardim pela janela: céu, prédio ao fundo, árvores, gramado e caminho (pintado, sem foto do local)
function gardenTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const hz = H * 0.56; // horizonte (meio da janela)
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, "#b9d6ec");
  sky.addColorStop(1, "#eef3ef");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, hz);
  // nuvens leves
  g.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(rnd() * W, 60 + rnd() * 200, 120 + rnd() * 160, 30 + rnd() * 30, 0, 0, Math.PI * 2);
    g.fill();
  }
  // prédios ao fundo (tons do condomínio: bege e rosado)
  for (const [x, w, h, col] of [[180, 300, 420, "#e9d6c4"], [1350, 380, 520, "#e4cdbd"], [1780, 220, 360, "#ece0d0"]] as [number, number, number, string][]) {
    g.fillStyle = col;
    g.fillRect(x, hz - h, w, h);
    g.fillStyle = "rgba(120,140,155,0.45)";
    for (let yy = hz - h + 24; yy < hz - 20; yy += 46) for (let xx = x + 20; xx < x + w - 30; xx += 52) g.fillRect(xx, yy, 30, 22);
    g.fillStyle = "rgba(255,255,255,0.5)";
    for (let yy = hz - h + 64; yy < hz; yy += 92) g.fillRect(x, yy, w, 5);
  }
  // gramado e caminho
  const lawn = g.createLinearGradient(0, hz, 0, H);
  lawn.addColorStop(0, "#9bb878");
  lawn.addColorStop(1, "#6e9150");
  g.fillStyle = lawn;
  g.fillRect(0, hz, W, H - hz);
  g.fillStyle = "#e6dccb";
  g.beginPath();
  g.moveTo(W * 0.42, hz);
  g.lineTo(W * 0.5, hz);
  g.lineTo(W * 0.72, H);
  g.lineTo(W * 0.38, H);
  g.closePath();
  g.fill();
  // fileira de árvores ao fundo
  const canopy = (x: number, y: number, r: number, dark: string, light: string) => {
    for (let i = 0; i < 14; i++) {
      const cx = x + (rnd() - 0.5) * r * 1.4, cy = y + (rnd() - 0.6) * r * 0.9, rr = r * (0.35 + rnd() * 0.35);
      const gr = g.createRadialGradient(cx - rr * 0.3, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
      gr.addColorStop(0, light);
      gr.addColorStop(1, dark);
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, rr, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let x = 0; x < W; x += 110 + rnd() * 60) canopy(x, hz - 40 - rnd() * 40, 70 + rnd() * 40, "#4f6b3a", "#86a865");
  // árvores da frente com tronco
  for (const [x, r] of [[420, 230], [1180, 260], [1820, 210]] as [number, number][]) {
    g.fillStyle = "#6b5443";
    g.fillRect(x - 12, hz - 150, 24, 260);
    canopy(x, hz - 260, r, "#3f5d2e", "#9cc06f");
  }
  // canteiros baixos
  for (let x = 0; x < W; x += 60) canopy(x, H * 0.9 + rnd() * 30, 40, "#3d5a2b", "#7fa35a");
  // um desfoque só (vidro e profundidade), barato no celular
  const out = document.createElement("canvas");
  out.width = 1024;
  out.height = 512;
  const o = out.getContext("2d")!;
  o.filter = "blur(5px)";
  o.drawImage(c, 0, 0, 1024, 512);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildSala(scene: THREE.Scene, p: SalaPlan, opts: { shadows: boolean; reflections: number }) {
  const { h: H, zb: ZB, xr: XR, xl: XL, zs: ZS, xw: XW, zw: ZW } = p;
  const room = new THREE.Group();
  scene.add(room);
  const M = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const mat = {
    piso: M({ map: plankTexture(XR, ZB), roughness: 0.55 }),
    parede: M({ color: "#e6d9c4", roughness: 0.92 }),
    bordo: M({ color: "#7a1f2b", roughness: 0.85 }),
    teto: M({ color: "#e9e1d2", roughness: 0.95, side: THREE.DoubleSide }),
    caixilho: M({ color: "#f4f4f2", roughness: 0.4, metalness: 0.2 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: "#fff", roughness: 0.02, metalness: 0, transmission: 1, thickness: 0, ior: 1.5, envMapIntensity: 1.4 }),
    jateado: M({ color: "#f3f5f6", roughness: 0.6, transparent: true, opacity: 0.85 }),
    escritorio: M({ color: "#a7abaf", roughness: 0.9 }),
    madeira: M({ color: "#dcc7a6", roughness: 0.7 }),
    vinho: M({ color: "#6a1a24", roughness: 0.6 }),
    branco: M({ color: "#ece8e0", roughness: 0.45 }),
    jardim: new THREE.MeshBasicMaterial({ map: gardenTexture(), color: "#f2eee4" }),
  };
  const productMats = CORES.map((color) => M({ color, roughness: 0.5 }));

  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = room) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = opts.shadows;
    parent.add(b);
    return b;
  };
  const plane = (w: number, h: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    q.position.set(x, y, z);
    q.rotation.y = ry;
    room.add(q);
    return q;
  };
  const T = 0.12;

  // piso e teto em L
  const shape = new THREE.Shape(
    ([[0, 0], [XR, 0], [XR, ZS], [XL, ZS], [XL, ZB], [0, ZB]] as [number, number][]).map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const pisoG = new THREE.ShapeGeometry(shape);
  pisoG.rotateX(-Math.PI / 2);
  const uv = pisoG.attributes.uv, pos = pisoG.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / XR, pos.getZ(i) / ZB);
  const piso = new THREE.Mesh(pisoG, mat.piso);
  piso.receiveShadow = true;
  room.add(piso);
  // reflexo: espelho logo abaixo do piso, que fica levemente translúcido (vinílico acetinado)
  if (opts.reflections) {
    const ref = new Reflector(new THREE.ShapeGeometry(shape), {
      textureWidth: Math.round(innerWidth * opts.reflections),
      textureHeight: Math.round(innerHeight * opts.reflections),
      color: 0xb4b4b4,
    });
    ref.rotation.x = -Math.PI / 2;
    ref.position.y = -0.002;
    room.add(ref);
    mat.piso.transparent = true;
    mat.piso.opacity = 0.8;
    mat.piso.roughness = 0.38;
  }
  const teto = new THREE.Mesh(pisoG.clone(), mat.teto);
  teto.position.y = H;
  room.add(teto);

  // paredes
  box(XR + T, H, T, mat.parede, XR / 2, H / 2, -T / 2);
  box(T, H, ZW, mat.bordo, XW - T / 2, H / 2, ZW / 2);
  box(XW, H, T, mat.parede, XW / 2, H / 2, ZW + T / 2);
  const vl = ZB - ZW;
  for (let i = 0; i <= 3; i++) box(0.06, H, 0.04, mat.caixilho, 0, H / 2, ZW + (vl / 3) * i);
  plane(vl, H, mat.vidro, 0, H / 2, ZW + vl / 2, Math.PI / 2);
  plane(vl, 0.38, mat.jateado, 0.005, 1.3, ZW + vl / 2, Math.PI / 2);
  box(0.05, H, vl, mat.escritorio, -3, H / 2, ZW + vl / 2);
  const sill = 0.95, top = 2.55;
  box(T, sill, ZS, mat.parede, XR + T / 2, sill / 2, ZS / 2);
  box(T, H - top, ZS, mat.parede, XR + T / 2, (top + H) / 2, ZS / 2);
  box(T, top - sill, 0.5, mat.parede, XR + T / 2, (sill + top) / 2, 0.25);
  for (const z of [0.5, 1.75, ZS]) box(0.08, top - sill, 0.06, mat.caixilho, XR, (sill + top) / 2, z);
  box(0.08, 0.05, ZS - 0.5, mat.caixilho, XR, sill, 0.5 + (ZS - 0.5) / 2);
  box(0.08, 0.05, ZS - 0.5, mat.caixilho, XR, top, 0.5 + (ZS - 0.5) / 2);
  plane(ZS - 0.5, top - sill, mat.vidro, XR, (sill + top) / 2, 0.5 + (ZS - 0.5) / 2, -Math.PI / 2);
  plane(9, 5, mat.jardim, XR + 3.5, 1.6, ZS / 2, -Math.PI / 2);
  box(XR - XL, H, T, mat.parede, (XL + XR) / 2, H / 2, ZS + T / 2);
  for (const z of [ZS + 0.05, ZS + 1.25, ZB - 0.05]) box(0.06, H, 0.05, mat.caixilho, XL, H / 2, z);
  plane(ZB - ZS, H, mat.vidro, XL, H / 2, (ZS + ZB) / 2, -Math.PI / 2);
  plane(10, 5, mat.jardim, XL + 4, 1.6, (ZS + ZB) / 2, -Math.PI / 2);
  const d0 = 3.25, d1 = 4.12;
  box(d0, H, T, mat.parede, d0 / 2, H / 2, ZB + T / 2);
  box(XL - d1, H, T, mat.parede, (XL + d1) / 2, H / 2, ZB + T / 2);
  box(d1 - d0, H - 2.1, T, mat.parede, (d0 + d1) / 2, 2.1 + (H - 2.1) / 2, ZB + T / 2);

  // luz
  for (const [x, z] of [[1.2, 1.0], [3.2, 1.0], [1.2, 2.6], [3.2, 2.6], [1.2, 4.3], [3.0, 4.3], [4.6, 1.6]]) {
    const l = new THREE.PointLight("#ffdcae", 2.1, 5.5, 1.6);
    l.position.set(x, H - 0.1, z);
    scene.add(l);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: "#fff1d6" }));
    disk.rotation.x = Math.PI / 2;
    disk.position.set(x, H - 0.001, z);
    room.add(disk);
  }
  const sun = new THREE.DirectionalLight("#ffe6c2", 1.4);
  sun.position.set(XR + 6, 5, 2.5);
  sun.target.position.set(2, 0, 3);
  sun.castShadow = opts.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target, new THREE.HemisphereLight("#fff1dc", "#5e5850", 0.35));

  // estantes sem modelo próprio: produtos genéricos
  const prateleiras = (g: THREE.Object3D, w: number, d: number, y0: number, n: number, dy: number) => {
    for (let s = 0; s < n; s++) {
      const y = y0 + s * dy;
      box(w - 0.04, 0.025, d - 0.04, mat.madeira, 0, y, 0, g);
      let x = -w / 2 + 0.06, k = s * 5;
      while (x < w / 2 - 0.1) {
        const pw = 0.06 + ((k * 7) % 6) / 100, ph = 0.12 + ((k * 11) % 12) / 100;
        box(pw, ph, d * 0.6, productMats[k % productMats.length], x + pw / 2, y + 0.0125 + ph / 2, 0.02, g);
        x += pw + 0.012;
        k++;
      }
    }
  };
  {
    const g = new THREE.Group(), w = 2.44, d = 0.5, h = 0.9;
    box(w - 0.06, 0.08, d - 0.06, mat.vinho, 0, 0.04, 0.01, g);
    box(w, 0.04, d, mat.madeira, 0, h, 0, g);
    box(0.03, h, d, mat.vinho, -w / 2, h / 2, 0, g);
    box(0.03, h, d, mat.vinho, w / 2, h / 2, 0, g);
    box(w, h, 0.02, mat.madeira, 0, h / 2, -d / 2 + 0.01, g);
    prateleiras(g, w, d, 0.1, 2, 0.4);
    g.rotation.y = -Math.PI / 2;
    g.position.set(XR - d / 2 - 0.01, 0, 0.52 + w / 2);
    room.add(g);
  }
  {
    const g = new THREE.Group(), w = 1.5, d = 0.45, h = 1.45;
    for (const side of [-1, 1]) {
      const s = new THREE.Group();
      box(w, 0.1, d, mat.vinho, 0, 0.05, 0, s);
      box(0.03, h, d, mat.vinho, -w / 2, h / 2, 0, s);
      box(0.03, h, d, mat.vinho, w / 2, h / 2, 0, s);
      prateleiras(s, w, d, 0.12, 4, 0.33);
      s.position.z = (side * d) / 2;
      s.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(s);
    }
    box(w, h, 0.03, mat.madeira, 0, h / 2, 0, g);
    box(w + 0.04, 0.04, 2 * d, mat.madeira, 0, h, 0, g);
    g.rotation.y = Math.PI / 2;
    g.position.set(2.59, 0, 2.14);
    room.add(g);
  }
  {
    const g = new THREE.Group();
    box(0.69, 0.85, 0.69, mat.branco, 0, 0.425, 0, g);
    box(0.69, 0.04, 0.69, mat.vidro, 0, 0.87, 0, g);
    g.position.set(3.85, 0, 4.13);
    room.add(g);
  }

  // móveis do 3D do site, reposicionados
  const ang: Record<string, number> = { "+x": 0, "-z": Math.PI / 2, "-x": Math.PI, "+z": -Math.PI / 2 };
  function placeFurniture(src: THREE.Object3D) {
    src.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = opts.shadows;
      // portas de vidro das geladeiras: lisas e reflexivas
      for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
        if (mt.transparent && mt.opacity < 0.7) {
          mt.roughness = 0.03;
          mt.metalness = 0;
          mt.envMapIntensity = 1.8;
          mt.opacity = Math.max(mt.opacity, 0.18);
        }
      }
    });
    const put = (name: string, from: string, to: string, x: number, z: number, keep?: (m: THREE.Object3D) => boolean) => {
      const base = src.getObjectByName(name);
      if (!base) return;
      const o = base.clone(true);
      if (keep) {
        const drop: THREE.Object3D[] = [];
        o.traverse((m) => {
          if ((m as THREE.Mesh).isMesh && !keep(m)) drop.push(m);
        });
        drop.forEach((m) => m.removeFromParent());
      }
      const holder = new THREE.Group();
      holder.add(o);
      o.position.set(0, 0, 0);
      o.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3());
      o.position.set(-c.x, keep ? -bb.min.y + 0.8 : -bb.min.y, -c.z);
      holder.userData.c = new THREE.Vector3(c.x, bb.min.y, c.z);
      holder.rotation.y = ang[to] - ang[from];
      holder.position.set(x, 0, z);
      room.add(holder);
      return holder;
    };
    // totem em pé: só o terminal, a prateleira e a tela (sem o suporte de parede e as sacolas), sobre um pedestal
    const totem = (to: string, x: number, z: number) => {
      put("totem_pagamento", "+x", to, x, z, (m) => /_(1|2|7)$/.test(m.name));
      box(0.12, 0.8, 0.12, mat.vinho, x, 0.4, z);
      box(0.34, 0.03, 0.3, mat.vinho, x, 0.015, z);
    };
    const arm = src.getObjectByName("armario_mio");
    arm?.updateMatrixWorld(true);
    const A = arm ? new THREE.Box3().setFromObject(arm).getSize(new THREE.Vector3()) : new THREE.Vector3(0.72, 2.3, 3.6);
    put("armario_mio", "+x", "+z", 1.73 + A.z / 2, A.x / 2);
    // vidro das portas: LED no topo, fundo claro e reflexo em faixas (mesmo truque da experiência do site)
    const reflTex = (() => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 512;
      const g = c.getContext("2d")!;
      g.translate(128, 256);
      g.rotate(-0.5);
      for (const [x, w, a] of [[-70, 46, 0.55], [-8, 14, 0.35], [40, 70, 0.22]] as const) {
        const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        gr.addColorStop(0, "rgba(255,255,255,0)");
        gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(x - w / 2, -600, w, 1200);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const refl = new THREE.MeshBasicMaterial({ map: reflTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const glassTint = new THREE.MeshPhysicalMaterial({ color: "#dfe8ec", roughness: 0.02, metalness: 0, transparent: true, opacity: 0.08, envMapIntensity: 2, depthWrite: false });
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false });
    const back = new THREE.MeshBasicMaterial({ color: "#d9d3cb" });
    const DOORS = {
      geladeira_mio_1: { door: [1.545, 1.94, 0.665], w: 0.47, h: 1.3, glass: 0.042, back: 0.4 },
      geladeira_coca: { door: [2.245, 2.04, 0.655], w: 0.55, h: 1.6, glass: 0.032, back: 0 },
    } as const;
    const fridge = (name: keyof typeof DOORS, to: string, x: number, z: number) => {
      const holder = put(name, "+z", to, x, z);
      if (!holder) return;
      const d = DOORS[name], c = holder.userData.c as THREE.Vector3;
      const grp = new THREE.Group();
      grp.position.set(d.door[0] - c.x, d.door[1] - c.y, d.door[2] - c.z);
      holder.add(grp);
      const m = (geo: THREE.BufferGeometry, mt: THREE.Material, px: number, py: number, pz: number) => {
        const me = new THREE.Mesh(geo, mt);
        me.position.set(px, py, pz);
        grp.add(me);
      };
      m(new THREE.BoxGeometry(d.w, 0.012, 0.01), strip, 0, -0.006, 0);
      if (d.back) m(new THREE.PlaneGeometry(d.w, d.h), back, 0, -d.h / 2, -d.back);
      m(new THREE.PlaneGeometry(d.w + 0.02, d.h + 0.25), glassTint, 0, -d.h / 2 + 0.05, d.glass - 0.002);
      m(new THREE.PlaneGeometry(d.w + 0.02, d.h + 0.25), refl, 0, -d.h / 2 + 0.05, d.glass);
      const led = new THREE.PointLight("#fff4e0", 0.5, 1.2, 2);
      led.position.set(0, -0.15, d.glass + 0.15);
      grp.add(led);
    };
    fridge("geladeira_coca", "+x", XW + 0.4, 0.37);
    fridge("geladeira_mio_1", "+x", XW + 0.36, 1.08);
    fridge("geladeira_mio_1", "+x", XW + 0.36, 1.79);
    put("freezer_loslos", "-x", "+x", 0.36, 2.76);
    for (const x of [0.36, 1.08, 1.81, 2.51]) fridge("geladeira_mio_1", "-z", x, ZB - 0.36);
    totem("+z", 2.59, 3.1);
    totem("-x", XL - 0.25, 3.5);
    // LED do armário
    const led = new THREE.PointLight("#ffd79a", 1.6, 3, 2);
    led.position.set(1.73 + A.z / 2, 2.1, 0.8);
    scene.add(led);
  }

  return { placeFurniture };
}
