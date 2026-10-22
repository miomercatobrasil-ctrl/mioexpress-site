"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ANGLES, HOTSPOTS, INTRO_PATH, ORBIT, OVERVIEW, OVERVIEW_PORTRAIT, TOUR_ORDER, clampCamera, type View } from "./layout";
import { sceneStore, useScene } from "./store";
import { TOTEM_SCREEN } from "./TotemScreen";

const TOUR_STEP_MS = 5200;

type Tween = { from: View; to: View; t: number; duration: number };

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const v3 = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

// Ajuste fino de enquadramento sem recompilar:
//   ?view=px,py,pz,tx,ty,tz  substitui a visão geral
//   ?debug                    imprime no console a câmera atual ao soltar o mouse (copie para layout.ts)
function readOverride(): View | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("view");
  const n = v?.split(",").map(Number);
  if (!n || n.length !== 6 || n.some(Number.isNaN)) return null;
  return { position: [n[0], n[1], n[2]], target: [n[3], n[4], n[5]] };
}
const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

function azimuthOf(view: View) {
  return Math.atan2(view.position[0] - view.target[0], view.position[2] - view.target[2]);
}

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControlsImpl>(null);
  const tween = useRef<Tween | null>(null);
  const mode = useScene((s) => s.mode);
  const active = useScene((s) => s.active);
  const touring = useScene((s) => s.touring);
  const checkout = useScene((s) => s.checkout);
  const isTouch = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);

  const portrait = useThree((s) => s.size.width / s.size.height < 0.8);
  const overview = useMemo(() => readOverride() ?? (portrait ? OVERVIEW_PORTRAIT : OVERVIEW), [portrait]);
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([...INTRO_PATH.position.slice(0, -1), overview.position].map(v3), false, "centripetal"),
    [overview],
  );
  const targetFrom = useMemo(() => v3(INTRO_PATH.targetFrom), []);
  const targetTo = useMemo(() => v3(overview.target), [overview]);
  const smoothP = useRef(0);
  const tmpTarget = useRef(new THREE.Vector3());

  const goTo = (to: View) => {
    const c = controls.current;
    if (!c) return;
    const from: View = {
      position: camera.position.toArray() as View["position"],
      target: c.target.toArray() as View["target"],
    };
    const az = azimuthOf(to);
    // vistas de cima (freezer) precisam de um ângulo vertical maior que o padrão
    const polar = Math.acos(THREE.MathUtils.clamp((to.position[1] - to.target[1]) / v3(to.position).distanceTo(v3(to.target)), -1, 1));
    c.minPolarAngle = Math.min(ORBIT.minPolarAngle, polar - 0.05);
    c.minAzimuthAngle = az - (Math.PI - ORBIT.minAzimuthAngle * 2) / 2;
    c.maxAzimuthAngle = az + (Math.PI - ORBIT.minAzimuthAngle * 2) / 2;
    if (reducedMotion) {
      camera.position.set(...to.position);
      c.target.set(...to.target);
      c.update();
      tween.current = null;
      return;
    }
    const dist = v3(from.position).distanceTo(v3(to.position));
    tween.current = { from, to, t: 0, duration: Math.min(2.2, 0.9 + dist * 0.35) };
    // durante a transição os limites do orbit não podem "puxar" a câmera
    c.enabled = false;
  };

  // entrar no modo exploração / trocar de hotspot / compra: câmera de frente para a tela do totem
  const shopping = checkout !== "off";
  useEffect(() => {
    if (mode !== "explore") return;
    if (shopping) {
      const [cx, cy, cz] = TOTEM_SCREEN.center;
      const [nx, ny, nz] = TOTEM_SCREEN.normal;
      const d = portrait ? 0.5 : 0.4;
      goTo({ position: [cx + nx * d, cy + ny * d, cz + nz * d], target: [cx, cy + 0.045, cz] });
      return;
    }
    const h = active ? HOTSPOTS.find((x) => x.id === active) : null;
    if (h) sceneStore.set({ angle: null });
    const a = sceneStore.get().angle;
    goTo(h ? h.view : a !== null ? (portrait ? ANGLES[a].portrait : ANGLES[a].view) : overview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, active, shopping]);

  // botões de ângulo
  const angleSeq = useScene((s) => s.angleSeq);
  useEffect(() => {
    const a = sceneStore.get().angle;
    if (mode !== "explore" || shopping || a === null) return;
    goTo(portrait ? ANGLES[a].portrait : ANGLES[a].view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angleSeq]);

  // tour guiado
  useEffect(() => {
    if (!touring) return;
    let i = 0;
    sceneStore.set({ active: TOUR_ORDER[0], angle: null });
    const id = window.setInterval(() => {
      i += 1;
      if (i >= TOUR_ORDER.length) {
        window.clearInterval(id);
        // fim do tour: volta à visão geral e convida a experimentar a compra
        sceneStore.set({ touring: false, active: null, lastInteraction: performance.now(), nudge: sceneStore.get().nudge + 1 });
        return;
      }
      sceneStore.set({ active: TOUR_ORDER[i] });
    }, TOUR_STEP_MS);
    return () => window.clearInterval(id);
  }, [touring]);

  // zoom: pinça no toque; no desktop, Ctrl/⌘ + roda (a roda sozinha continua rolando a página)
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (sceneStore.get().mode !== "explore" || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      dolly(Math.exp(e.deltaY * 0.002));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  const dolly = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    const offset = camera.position.clone().sub(c.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, ORBIT.minDistance, ORBIT.maxDistance);
    camera.position.copy(c.target).add(offset.setLength(len));
    c.update();
    sceneStore.set({ interacted: true, lastInteraction: performance.now() });
  };

  // botões +/- da interface
  const zoomRequest = useScene((s) => s.zoomRequest);
  const lastZoom = useRef(0);
  useEffect(() => {
    const d = zoomRequest - lastZoom.current;
    lastZoom.current = zoomRequest;
    if (d !== 0) dolly(d > 0 ? 0.8 : 1.25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomRequest]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const s = sceneStore.get();

    if (s.mode === "intro") {
      const p = s.introProgress;
      smoothP.current = reducedMotion ? p : THREE.MathUtils.damp(smoothP.current, p, 4, delta);
      const k = easeInOut(Math.min(1, smoothP.current));
      curve.getPoint(k, camera.position);
      tmpTarget.current.lerpVectors(targetFrom, targetTo, easeInOut(Math.min(1, k * 1.15)));
      c.target.copy(tmpTarget.current);
      camera.lookAt(c.target);
      return;
    }

    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, tw.t + delta / tw.duration);
      const k = easeInOut(tw.t);
      camera.position.lerpVectors(v3(tw.from.position), v3(tw.to.position), k);
      c.target.lerpVectors(v3(tw.from.target), v3(tw.to.target), k);
      camera.lookAt(c.target);
      if (tw.t >= 1) {
        tween.current = null;
        c.enabled = s.checkout === "off";
        if (c.enabled) c.update();
      }
      return;
    }
    // na compra a câmera fica parada de frente para o totem
    if (s.checkout !== "off") return;

    // câmera parada quando ninguém mexe (a rotação automática de ocioso parecia que a cena "andava sozinha")
    c.autoRotate = false;
    c.update();
    clampCamera(camera.position);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={mode === "explore"}
      enablePan={false}
      enableZoom={isTouch}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      minDistance={ORBIT.minDistance}
      maxDistance={ORBIT.maxDistance}
      minPolarAngle={ORBIT.minPolarAngle}
      maxPolarAngle={ORBIT.maxPolarAngle}
      minAzimuthAngle={ORBIT.minAzimuthAngle}
      maxAzimuthAngle={ORBIT.maxAzimuthAngle}
      onStart={() => {
        sceneStore.set({ interacted: true, touring: false, angle: null, lastInteraction: performance.now() });
      }}
      onEnd={() => {
        sceneStore.set({ lastInteraction: performance.now() });
        if (DEBUG && controls.current) {
          const f = (v: THREE.Vector3) => `[${v.toArray().map((x) => +x.toFixed(2)).join(", ")}]`;
          console.info(`{ position: ${f(camera.position)}, target: ${f(controls.current.target)} }`);
        }
      }}
    />
  );
}
