"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

type V3 = [number, number, number];
export type ProjetoPlan = {
  /** pasta com sala.glb, lightmaps.json e lightmaps/ (gerados por scripts/blender/sala_bake.py) */
  base: string;
  /** limites da câmera (m): x, z e o recorte em L (acima de zNotch, x máximo vira xNotch) */
  bounds: { x: [number, number]; z: [number, number]; h: number; zNotch?: number; xNotch?: number };
  /** piso em L para o reflexo (pontos x, z) */
  floor: [number, number][];
  views: { label: string; position: V3; target: V3 }[];
};

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
          // reflexo do ambiente (a própria sala) por cima do bake, sem somar luz difusa extra
          iblIrradiance = vec3( 0.0 );
          radiance *= 0.6;
        #endif`,
      )
      .replace("vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );", "vec4 lightMapTexel = vec4( 0.0 );");
  };
  mat.customProgramCacheKey = () => "mio-sala-lm1";
  mat.needsUpdate = true;
}

/** Loja do projeto da arquiteta, com luz assada, navegável (girar, aproximar e vistas prontas). */
export default function ProjetoViewer({ plan }: { plan: ProjetoPlan }) {
  const box = useRef<HTMLDivElement>(null);
  const goRef = useRef<(i: number) => void>(() => {});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  // no celular, o 3D só captura o toque depois de "Explorar" (senão trava a rolagem da página)
  const [on, setOn] = useState(false);

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
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(plan.base + "sala.glb");
      if (disposed) return;
      const root = gltf.scene;
      const manifest = (await fetch(plan.base + "lightmaps.json").then((r) => r.json())) as { objects: string[] };
      const half = mobile ? "m/" : "";
      await Promise.all(
        manifest.objects.map(async (name) => {
          const obj = root.getObjectByName(name);
          if (!obj) return;
          const lm = await loadLightmap(`${plan.base}lightmaps/${half}${name}.webp`).catch(() => null);
          if (!lm) return;
          obj.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            floatUv1(m.geometry);
            for (const mat of ([] as THREE.Material[]).concat(m.material)) {
              const s = mat as THREE.MeshStandardMaterial;
              if (s.transparent && s.opacity < 0.6) {
                // vidro: quase invisível, só o reflexo
                s.depthWrite = false;
                s.roughness = 0.03;
                s.metalness = 0;
                s.envMapIntensity = 1.6;
                continue;
              }
              if (s.emissive && s.emissive.getHex() !== 0) continue;
              bakeMaterial(s, lm);
            }
          });
        }),
      );
      if (disposed) return;
      scene.add(root);

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
      mm.fragmentShader = mm.fragmentShader.replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "gl_FragColor = vec4( base.rgb, 0.16 );");
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
    <div className={`sala3d${on ? " is-on" : ""}`}>
      <div ref={box} className="sala3d__canvas" />
      {!loading && !on && (
        <button type="button" className="sala3d__start" onClick={() => setOn(true)}>Explorar a loja</button>
      )}
      {on && (
        <button type="button" className="sala3d__close" onClick={() => setOn(false)}>Concluir</button>
      )}
      {loading && <div className="sala3d__loading">Montando a sua loja…</div>}
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
      {on && <p className="sala3d__hint">Arraste para olhar em volta · pinça para aproximar</p>}
    </div>
  );
}
