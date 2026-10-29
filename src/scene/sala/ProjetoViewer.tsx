"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { freezerPicoles, fridgeRows } from "../Products";

type V3 = [number, number, number];
export type ProjetoPlan = {
  /** pasta com sala.glb, lightmaps.json e lightmaps/ (gerados por scripts/blender/sala_bake.py) */
  base: string;
  /** limites da câmera (m): x, z e o recorte em L (acima de zNotch, x máximo vira xNotch) */
  bounds: { x: [number, number]; z: [number, number]; h: number; zNotch?: number; xNotch?: number };
  /** piso em L para o reflexo (pontos x, z) */
  floor: [number, number][];
  views: { label: string; position: V3; target: V3 }[];
  /** imagem vista pelas janelas (panorama em volta da loja; horizonte a 30% da altura) */
  backdrop?: string;
  /** fitas de LED visíveis (a luz que elas jogam já está no bake): segmento de a até b, cor quente ou fria */
  leds?: { a: V3; b: V3; cool?: boolean }[];
  /** freezer horizontal para encher com os picolés Los Los do site */
  freezer?: { x: [number, number]; z: [number, number]; y: number; rows: number; cols: number };
  /** bebidas do site nas geladeiras (no lugar das garrafas ocas do projeto, escondidas por nome de material) */
  fridges?: { hide: RegExp; list: Parameters<typeof fridgeRows>[0] };
  /** sacos (ex.: carvão) deitados nas prateleiras de baixo, no lugar dos sacos amassados do projeto */
  sacks?: { hide: RegExp; image: string; size: V3; at: V3[] };
};

/** Saco cheio deitado: caixa estufada (pontas achatadas), foto da embalagem em cima e papel kraft nos lados. */
async function addSacks(scene: THREE.Scene, k: NonNullable<ProjetoPlan["sacks"]>) {
  const tex = await new THREE.TextureLoader().loadAsync(k.image);
  tex.colorSpace = THREE.SRGBColorSpace;
  const [w, h, d] = k.size;
  const g = new THREE.BoxGeometry(w, h, d, 16, 2, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const fx = 1 - Math.pow((2 * p.getX(i)) / w, 6), fz = 1 - Math.pow((2 * p.getZ(i)) / d, 6);
    p.setY(i, p.getY(i) * Math.max(0.25, Math.sqrt(Math.max(0, fx * fz))));
  }
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  const kraft = new THREE.MeshStandardMaterial({ color: "#b48a5e", roughness: 0.85 });
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  for (const at of k.at) {
    const m = new THREE.Mesh(g, [kraft, kraft, top, kraft, kraft, kraft]);
    m.position.set(...at);
    m.rotation.y = (Math.sin(at[0] * 12.9 + at[1] * 7.1) * 0.06);
    scene.add(m);
  }
}

/** Fitas de LED acesas: barra fina brilhante + halo suave (soma de luz), como numa foto de loja à noite. */
function addLeds(scene: THREE.Scene, leds: NonNullable<ProjetoPlan["leds"]>) {
  const warm = new THREE.Color(1.0, 0.86, 0.66).multiplyScalar(2.2);
  const cool = new THREE.Color(0.9, 0.96, 1.0).multiplyScalar(2.2);
  const core = { warm: new THREE.MeshBasicMaterial({ color: warm, toneMapped: false }), cool: new THREE.MeshBasicMaterial({ color: cool, toneMapped: false }) };
  const halo = (c: THREE.Color) =>
    new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.08), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const haloMat = { warm: halo(warm), cool: halo(cool) };
  const up = new THREE.Vector3(0, 1, 0);
  for (const l of leds) {
    const a = new THREE.Vector3(...l.a), b = new THREE.Vector3(...l.b);
    const len = a.distanceTo(b);
    const q = new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize());
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const k = l.cool ? "cool" : "warm";
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, len, 0.006), core[k]);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.03, len + 0.02, 0.03), haloMat[k]);
    for (const m of [bar, glow]) {
      m.position.copy(mid);
      m.quaternion.copy(q);
      scene.add(m);
    }
  }
}

// luz assada: o PNG/WebP guarda a luz em gama 2.2; o shader volta para linear (decodificação da GPU varia entre aparelhos)
const LM_EXPOSURE = 1.5;

async function loadLightmap(src: string) {
  // <img> em vez de ImageBitmap: no Chrome do Mac o ImageBitmap de WebP chegava zerado na GPU
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.NoColorSpace;
  t.channel = 1;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

/** UV do lightmap quantizado (meshopt) era lido como zero no Chrome do Mac; em float funciona em todos. */
function floatUv1(g: THREE.BufferGeometry) {
  const a = g.attributes.uv1 as THREE.BufferAttribute | undefined;
  if (!a || (a.array instanceof Float32Array && !a.normalized)) return;
  const out = new Float32Array(a.count * 2);
  for (let i = 0; i < a.count; i++) {
    out[i * 2] = a.getX(i);
    out[i * 2 + 1] = a.getY(i);
  }
  g.setAttribute("uv1", new THREE.BufferAttribute(out, 2));
}

function bakeMaterial(mat: THREE.MeshStandardMaterial, lm: THREE.Texture) {
  mat.lightMap = lm;
  mat.lightMapIntensity = LM_EXPOSURE;
  mat.side = THREE.DoubleSide;
  // embalagens 100% metal mostrariam só reflexo e ignorariam a luz assada
  mat.metalness = Math.min(mat.metalness, 0.5);
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <lights_fragment_maps>",
        `#ifdef USE_LIGHTMAP
          irradiance = vec3( 0.0 );
          reflectedLight.directDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular = vec3( 0.0 );
          vec3 lm = pow( max( texture2D( lightMap, vLightMapUv ).rgb, vec3( 1e-4 ) ), vec3( 2.2 ) );
          irradiance += lm * lightMapIntensity;
        #endif
        #include <lights_fragment_maps>
        #ifdef USE_LIGHTMAP
          // reflexo do ambiente (a própria sala) por cima do bake, só em superfícies lisas: em paredes e teto
          // foscos o mapa de reflexo, de baixa resolução, aparecia como manchas (placas de vídeo de verdade)
          iblIrradiance = vec3( 0.0 );
          radiance *= 0.6 * pow( clamp( 1.0 - roughnessFactor, 0.0, 1.0 ), 3.0 );
        #endif`,
      )
      .replace("vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );", "vec4 lightMapTexel = vec4( 0.0 );");
  };
  mat.customProgramCacheKey = () => "mio-sala-lm2";
  mat.needsUpdate = true;
}

/** Vidro de verdade: transparente, mas o reflexo aparece inteiro (num material transparente comum o reflexo
 *  também é multiplicado pela opacidade e some). Mais forte de lado (Fresnel), como num expositor. */
function glassMaterial(s: THREE.MeshStandardMaterial) {
  s.depthWrite = false;
  s.roughness = 0.02;
  s.metalness = 0;
  s.color.set("#1a1d1f");
  s.opacity = 0.14;
  s.envMapIntensity = 2.6;
  s.premultipliedAlpha = true;
  s.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <opaque_fragment>",
        "gl_FragColor = vec4( totalDiffuse * diffuseColor.a + totalSpecular + totalEmissiveRadiance, diffuseColor.a );",
      )
      .replace("#include <premultiplied_alpha_fragment>", "");
  };
  s.customProgramCacheKey = () => "mio-vidro1";
  s.needsUpdate = true;
}

/** Loja do projeto da arquiteta, com luz assada, navegável (girar, aproximar e vistas prontas). */
export default function ProjetoViewer({ plan }: { plan: ProjetoPlan }) {
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const goRef = useRef<(i: number) => void>(() => {});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  // no celular, o 3D só captura o toque depois de "Explorar" (senão trava a rolagem da página)
  const [on, setOn] = useState(false);

  // explorar = tela cheia (API do navegador; no iPhone, que não tem a API para elementos, ocupa a tela via CSS)
  const enter = () => {
    setOn(true);
    const el = wrap.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  const leave = () => {
    setOn(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    // Esc ou o botão de voltar do sistema saem da tela cheia: volta ao modo normal
    const onChange = () => {
      if (!document.fullscreenElement) setOn(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    // tela cheia via CSS (iPhone): trava a rolagem da página por baixo
    document.documentElement.classList.toggle("sala3d-lock", on);
    return () => document.documentElement.classList.remove("sala3d-lock");
  }, [on]);

  useEffect(() => {
    const el = box.current!;
    const mobile = matchMedia("(pointer: coarse)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // lá fora (janela e porta): claro, como numa foto de interior
    scene.background = new THREE.Color("#f3eee6");
    const pmrem = new THREE.PMREMGenerator(renderer);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.6;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.rotateSpeed = 0.6;

    let dirty = true;
    const request = () => (dirty = true);
    controls.addEventListener("change", request);
    let disposed = false;

    const setView = (i: number, animate: boolean) => {
      const v = plan.views[i];
      if (!animate) {
        camera.position.set(...v.position);
        controls.target.set(...v.target);
        controls.update();
        return request();
      }
      const p0 = camera.position.clone(), t0 = controls.target.clone();
      const p1 = new THREE.Vector3(...v.position), t1 = new THREE.Vector3(...v.target);
      const start = performance.now(), dur = 1100;
      const step = (now: number) => {
        if (disposed) return;
        const k = Math.min(1, (now - start) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(p0, p1, e);
        controls.target.lerpVectors(t0, t1, e);
        controls.update();
        request();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    goRef.current = (i) => setView(i, true);
    setView(0, false);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 74 : 60;
      camera.updateProjectionMatrix();
      request();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    (async () => {
      await MeshoptDecoder.ready;
      // manifesto sempre fresco; o resto vai com ?v=<versão> (o navegador não reaproveita luz de uma versão antiga)
      const manifest = (await fetch(plan.base + "lightmaps.json", { cache: "no-store" }).then((r) => r.json())) as { objects: string[]; version?: string };
      const v = manifest.version ? `?v=${manifest.version}` : "";
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(plan.base + "sala.glb" + v);
      if (disposed) return;
      const root = gltf.scene;
      const half = mobile ? "m/" : "";
      await Promise.all(
        manifest.objects.map(async (name) => {
          const obj = root.getObjectByName(name);
          if (!obj) return;
          const lm = await loadLightmap(`${plan.base}lightmaps/${half}${name}.webp${v}`).catch(() => null);
          if (!lm) return;
          // o mesmo material aparece em vários objetos (MDF no armário, na gôndola…) e cada objeto tem o seu
          // lightmap: cada objeto recebe a sua cópia do material
          const own = new Map<THREE.Material, THREE.Material>();
          const done = new Set<THREE.Material>();
          obj.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            floatUv1(m.geometry);
            const mats = ([] as THREE.Material[]).concat(m.material).map((x) => {
              if (!own.has(x)) own.set(x, x.clone());
              return own.get(x)!;
            });
            m.material = Array.isArray(m.material) ? mats : mats[0];
            for (const mat of mats) {
              if (done.has(mat)) continue;
              done.add(mat);
              const s = mat as THREE.MeshStandardMaterial;
              // embalagens com PNG transparente (Milka, rótulos, logos): sólidas; só o fundo vazio do PNG some
              if (s.map && s.transparent && !/vidro|glass|transparente|acrylic/i.test(s.name)) {
                s.transparent = false;
                s.opacity = 1;
                s.alphaTest = 0.5;
                s.depthWrite = true;
              }
              // plástico das garrafas (água): quase opaco, levemente azulado, com brilho. Nas geladeiras, todo
              // material transparente que não é a porta de vidro é garrafa
              const inFridge = name === "geladeiras" || name === "geladeiras2";
              if (/acrylic|^__auto_$/i.test(s.name) || (inFridge && s.transparent && !/glass|vidro/i.test(s.name))) {
                s.color.set("#dfe9ee");
                s.transparent = true;
                s.opacity = 0.88;
                s.roughness = 0.12;
                s.metalness = 0;
                s.envMapIntensity = 1.4;
                s.depthWrite = false;
                continue;
              }
              // divisória de vidro azulado (só na estrutura; a porta da Coca usa um material de mesmo nome):
              // atrás dela não há nada modelado, então vira vidro jateado (fosco, claro)
              if (name === "estrutura" && /translucent_glass/i.test(s.name)) {
                s.color.set("#ece8e1");
                s.transparent = true;
                s.opacity = 0.9;
                s.roughness = 0.35;
                s.metalness = 0;
                continue;
              }
              // o export do SketchUp perde a transparência de alguns vidros: reconhece também pelo nome
              if (/vidro|glass|transparente/i.test(s.name)) {
                s.transparent = true;
                s.opacity = Math.min(s.opacity, 0.12);
              }
              if (s.transparent && s.opacity < 0.6) {
                glassMaterial(s);
                continue;
              }
              if (s.emissive && s.emissive.getHex() !== 0) continue;
              bakeMaterial(s, lm);
              // dentro das geladeiras: as bebidas ficam iluminadas pelo LED interno (luz fria por cima do bake)
              if (inFridge && !/270920128|skol|A06|M08|METAL|Grate|Gray|Branco|Color_00[18]/i.test(s.name)) {
                s.emissive.setRGB(0.85, 0.92, 1.0);
                s.emissiveIntensity = s.map ? 0.45 : 0.3;
                if (s.map) s.emissiveMap = s.map;
              }
            }
          });
        }),
      );
      if (disposed) return;
      scene.add(root);

      if (plan.leds) addLeds(scene, plan.leds);
      if (plan.sacks) {
        const hide = plan.sacks.hide;
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && ([] as THREE.Material[]).concat(m.material).every((x) => hide.test(x.name))) m.visible = false;
        });
        await addSacks(scene, plan.sacks).catch(() => {});
      }
      if (plan.fridges) {
        const hide = plan.fridges.hide;
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && /geladeiras/.test(m.parent?.name ?? "") && ([] as THREE.Material[]).concat(m.material).every((x) => hide.test(x.name))) m.visible = false;
        });
        for (const mesh of await fridgeRows(plan.fridges.list).catch(() => [])) scene.add(mesh);
      }
      if (plan.freezer) scene.add(await freezerPicoles(plan.freezer).catch(() => new THREE.Object3D()));

      if (plan.backdrop) {
        // lá fora: cilindro em volta da loja com a paisagem desfocada (como numa foto de interior)
        const tex = await new THREE.TextureLoader().loadAsync(plan.backdrop);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.repeat.x = 2;
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(14, 14, 10, 48, 1, true),
          new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, toneMapped: false }),
        );
        cyl.position.set((plan.bounds.x[0] + plan.bounds.x[1]) / 2, 2.5, (plan.bounds.z[0] + plan.bounds.z[1]) / 2);
        scene.add(cyl);
      }

      // piso: reflexo real (espelho fraco e desfocado pela rugosidade da madeira)
      const shape = new THREE.Shape(plan.floor.map(([x, z]) => new THREE.Vector2(x, -z)));
      const mirror = new Reflector(new THREE.ShapeGeometry(shape), {
        textureWidth: mobile ? 512 : 1024,
        textureHeight: mobile ? 512 : 1024,
        color: 0x777777,
      });
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.y = 0.003;
      const mm = mirror.material as THREE.ShaderMaterial;
      mm.transparent = true;
      mm.fragmentShader = mm.fragmentShader.replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "gl_FragColor = vec4( base.rgb, 0.1 );");
      scene.add(mirror);

      // reflexos: fotografa a própria sala num cubo e usa como ambiente (vidros, metais, piso)
      const cubeRT = new THREE.WebGLCubeRenderTarget(mobile ? 128 : 256, { type: THREE.HalfFloatType });
      const cubeCam = new THREE.CubeCamera(0.05, 30, cubeRT);
      cubeCam.position.set((plan.bounds.x[0] + plan.bounds.x[1]) / 2, 1.4, (plan.bounds.z[0] + plan.bounds.z[1]) / 2);
      mirror.visible = false;
      cubeCam.update(renderer, scene);
      mirror.visible = true;
      scene.environment = pmrem.fromCubemap(cubeRT.texture).texture;
      cubeRT.dispose();
      setLoading(false);
      request();
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });

    const b = plan.bounds;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (controls.update()) dirty = true;
      // mantém a câmera dentro da sala
      const c = camera.position;
      c.x = THREE.MathUtils.clamp(c.x, b.x[0], b.x[1]);
      c.y = THREE.MathUtils.clamp(c.y, 0.5, b.h - 0.25);
      c.z = THREE.MathUtils.clamp(c.z, b.z[0], b.z[1]);
      if (b.zNotch !== undefined && b.xNotch !== undefined && c.z > b.zNotch && c.x > b.xNotch) c.x = b.xNotch;
      if (dirty) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [plan]);

  return (
    <div ref={wrap} className={`sala3d${on ? " is-on" : ""}`}>
      <div ref={box} className="sala3d__canvas" />
      {!loading && !on && (
        <button type="button" className="sala3d__start" onClick={enter}>Explorar a loja</button>
      )}
      {on && (
        <button type="button" className="sala3d__close" onClick={leave}>Concluir</button>
      )}
      {loading && <div className="sala3d__loading">Montando a sua loja…</div>}
      {on && (
      <div className="sala3d__views" role="group" aria-label="Vistas da loja">
        {plan.views.map((v, i) => (
          <button
            key={v.label}
            type="button"
            className={i === active ? "is-on" : ""}
            onClick={() => {
              setActive(i);
              goRef.current(i);
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      )}
      {on && <p className="sala3d__hint">Arraste para olhar em volta · pinça para aproximar</p>}
    </div>
  );
}
