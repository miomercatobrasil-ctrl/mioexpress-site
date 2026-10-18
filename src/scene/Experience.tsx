"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows, PerformanceMonitor, useProgress } from "@react-three/drei";
import { CameraRig } from "./CameraRig";
import { GlbScene } from "./GlbScene";
import { Hotspots } from "./Hotspots";
import { COLORS, INTRO_PATH } from "./layout";
import { PlaceholderScene } from "./Placeholders";
import { sceneStore } from "./store";

const GLB_URL = process.env.NEXT_PUBLIC_SCENE_GLB || "";

function Lights() {
  return (
    <>
      <hemisphereLight args={["#fff4e2", "#b79a77", 0.9]} />
      <ambientLight intensity={0.25} color="#ffe9cc" />
      {/* luz do dia entrando pelo jardim */}
      <directionalLight position={[10, 6, 1.5]} intensity={1.3} color="#fff1d6" />
      {/* LED das prateleiras (uma luz por módulo) */}
      {[2.0, 3.0, 4.0].map((z) => (
        <pointLight key={z} position={[0.55, 1.35, z]} intensity={1.4} distance={2.4} decay={1.6} color={COLORS.led} />
      ))}
      <pointLight position={[2.2, 2.4, 2.0]} intensity={1.6} distance={5} decay={1.4} color="#ffe7c4" />
    </>
  );
}

function Ready() {
  useEffect(() => {
    sceneStore.set({ ready: true });
  }, []);
  return null;
}

function ProgressBridge() {
  const { progress } = useProgress();
  useEffect(() => {
    sceneStore.set({ loadProgress: progress });
  }, [progress]);
  return null;
}

export default function Experience({ mobile, reducedMotion, running }: { mobile: boolean; reducedMotion: boolean; running: boolean }) {
  const [dprMax, setDprMax] = useState(mobile ? 1.5 : 2);
  const aspect = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1.6;
  // celular em pé: FOV vertical maior para não "cortar" o ambiente nas laterais
  const fov = aspect < 0.8 ? 80 : aspect < 1.2 ? 62 : 52;

  return (
    <>
    <ProgressBridge />
    <Canvas
      className="scene-canvas"
      dpr={[1, dprMax]}
      // fora da tela não renderiza (bateria/CPU no celular)
      frameloop={running ? "always" : "never"}
      gl={{ antialias: !mobile, powerPreference: "high-performance", alpha: false }}
      camera={{ fov, near: 0.05, far: 60, position: INTRO_PATH.position[0] }}
      onPointerMissed={() => sceneStore.set({ hovered: null })}
      onCreated={({ gl }) => gl.setClearColor("#efe6d8")}
    >
      <PerformanceMonitor onDecline={() => setDprMax(1)} />
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={["#efe6d8", 9, 20]} />
      <Lights />
      <Suspense fallback={null}>
        {GLB_URL ? <GlbScene url={GLB_URL} /> : <PlaceholderScene />}
        <ContactShadows position={[2.5, 0.006, 1.7]} scale={[10, 8]} resolution={mobile ? 512 : 1024} blur={2.4} opacity={0.45} far={2.2} frames={1} />
        <Hotspots />
        <Ready />
      </Suspense>
      <CameraRig reducedMotion={reducedMotion} />
    </Canvas>
    </>
  );
}
