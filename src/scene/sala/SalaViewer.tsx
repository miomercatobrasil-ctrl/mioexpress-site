"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildSala, SALA_VIEWS, type SalaPlan } from "./build";

/** Loja Mio projetada para o espaço de um condomínio, navegável (girar, aproximar e vistas prontas). */
export default function SalaViewer({ plan }: { plan: SalaPlan }) {
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
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e6e9ea");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.6;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.rotateSpeed = 0.6;

    let dirty = true;
    const request = () => (dirty = true);
    controls.addEventListener("change", request);

    const sala = buildSala(scene, plan, { shadows: !mobile });
    let disposed = false;

    // câmera: começa na porta
    const setView = (i: number, animate: boolean) => {
      const v = SALA_VIEWS[i];
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
      camera.fov = w / h < 0.8 ? 72 : 58;
      camera.updateProjectionMatrix();
      request();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // móveis Mio (mesmo modelo da experiência do site)
    (async () => {
      await MeshoptDecoder.ready;
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(plan.glb);
      if (disposed) return;
      sala.placeFurniture(gltf.scene);
      setLoading(false);
      request();
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (controls.update()) dirty = true;
      // mantém a câmera dentro da sala
      const c = camera.position;
      c.x = THREE.MathUtils.clamp(c.x, 0.25, plan.xr - 0.25);
      c.y = THREE.MathUtils.clamp(c.y, 0.5, plan.h - 0.2);
      c.z = THREE.MathUtils.clamp(c.z, 0.25, plan.zb - 0.15);
      if (c.z < plan.zs && c.x > plan.xr - 0.25) c.x = plan.xr - 0.25;
      if (c.z > plan.zs && c.x > plan.xl - 0.2) c.x = plan.xl - 0.2;
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
        {SALA_VIEWS.map((v, i) => (
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
