import * as THREE from "three";

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

// vista do jardim pela janela (desfocada, sem foto do local)
function gardenTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#dfeaf0");
  sky.addColorStop(0.55, "#cfe0d4");
  sky.addColorStop(1, "#8fa982");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 256);
  g.filter = "blur(10px)";
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `hsla(${95 + rnd() * 40},${35 + rnd() * 25}%,${28 + rnd() * 25}%,0.55)`;
    g.beginPath();
    g.arc(rnd() * 512, 40 + rnd() * 170, 18 + rnd() * 40, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "rgba(90,70,55,0.5)";
  for (let i = 0; i < 6; i++) g.fillRect(40 + i * 85 + rnd() * 30, 120, 8, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildSala(scene: THREE.Scene, p: SalaPlan, opts: { shadows: boolean }) {
  const { h: H, zb: ZB, xr: XR, xl: XL, zs: ZS, xw: XW, zw: ZW } = p;
  const room = new THREE.Group();
  scene.add(room);
  const M = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const mat = {
    piso: M({ map: plankTexture(XR, ZB), roughness: 0.55 }),
    parede: M({ color: "#efe7da", roughness: 0.9 }),
    bordo: M({ color: "#7a1f2b", roughness: 0.85 }),
    teto: M({ color: "#f4f1ea", roughness: 0.95, side: THREE.DoubleSide }),
    caixilho: M({ color: "#f4f4f2", roughness: 0.4, metalness: 0.2 }),
    vidro: new THREE.MeshPhysicalMaterial({ color: "#fff", roughness: 0.05, transparent: true, opacity: 0.22 }),
    jateado: M({ color: "#f3f5f6", roughness: 0.6, transparent: true, opacity: 0.85 }),
    escritorio: M({ color: "#a7abaf", roughness: 0.9 }),
    madeira: M({ color: "#dcc7a6", roughness: 0.7 }),
    vinho: M({ color: "#6a1a24", roughness: 0.6 }),
    branco: M({ color: "#f6f6f4", roughness: 0.4 }),
    jardim: new THREE.MeshBasicMaterial({ map: gardenTexture() }),
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
    const l = new THREE.PointLight("#fff1dc", 2.6, 5.5, 1.6);
    l.position.set(x, H - 0.1, z);
    scene.add(l);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: "#fffaf0" }));
    disk.rotation.x = Math.PI / 2;
    disk.position.set(x, H - 0.001, z);
    room.add(disk);
  }
  const sun = new THREE.DirectionalLight("#fff4e2", 2.0);
  sun.position.set(XR + 6, 5, 2.5);
  sun.target.position.set(2, 0, 3);
  sun.castShadow = opts.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target, new THREE.HemisphereLight("#eef3ff", "#5a5a5a", 0.45));

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
    box(w, 0.08, d, mat.vinho, 0, 0.04, 0, g);
    box(w, 0.04, d, mat.madeira, 0, h, 0, g);
    box(0.03, h, d, mat.vinho, -w / 2, h / 2, 0, g);
    box(0.03, h, d, mat.vinho, w / 2, h / 2, 0, g);
    box(w, h, 0.02, mat.madeira, 0, h / 2, -d / 2 + 0.01, g);
    prateleiras(g, w, d, 0.1, 2, 0.4);
    g.rotation.y = Math.PI / 2;
    g.position.set(XR - d / 2, 0, 0.52 + w / 2);
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
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = opts.shadows;
    });
    const put = (name: string, from: string, to: string, x: number, z: number) => {
      const base = src.getObjectByName(name);
      if (!base) return;
      const o = base.clone(true);
      const holder = new THREE.Group();
      holder.add(o);
      o.position.set(0, 0, 0);
      o.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3());
      o.position.set(-c.x, -bb.min.y, -c.z);
      holder.rotation.y = ang[to] - ang[from];
      holder.position.set(x, 0, z);
      room.add(holder);
    };
    const arm = src.getObjectByName("armario_mio");
    arm?.updateMatrixWorld(true);
    const A = arm ? new THREE.Box3().setFromObject(arm).getSize(new THREE.Vector3()) : new THREE.Vector3(0.72, 2.3, 3.6);
    put("armario_mio", "+x", "+z", 1.73 + A.z / 2, A.x / 2);
    put("geladeira_coca", "+z", "+x", XW + 0.4, 0.37);
    put("geladeira_mio_1", "+z", "+x", XW + 0.36, 1.08);
    put("geladeira_mio_1", "+z", "+x", XW + 0.36, 1.79);
    put("freezer_loslos", "-x", "+x", 0.36, 2.76);
    for (const x of [0.36, 1.08, 1.81, 2.51]) put("geladeira_mio_1", "+z", "-z", x, ZB - 0.36);
    put("totem_pagamento", "+x", "+z", 2.59, 3.1);
    put("totem_pagamento", "+x", "-x", XL - 0.2, 3.5);
    // LED do armário
    const led = new THREE.PointLight("#ffd79a", 1.6, 3, 2);
    led.position.set(1.73 + A.z / 2, 2.1, 0.8);
    scene.add(led);
  }

  return { placeFurniture };
}
