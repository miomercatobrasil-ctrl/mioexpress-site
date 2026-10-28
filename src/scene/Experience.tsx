"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, useProgress } from "@react-three/drei";
import { CameraRig } from "./CameraRig";
import { GlbScene } from "./GlbScene";
import { Hotspots } from "./Hotspots";
import { INTRO_PATH } from "./layout";
import { sceneStore } from "./store";
import { LightRig } from "./LightRig";
import { isWeakGpu } from "./perf";
import { CameraLook, FloorReflection, RoomReflections, SceneEnvironment } from "./Effects";

const GLB_URL = process.env.NEXT_PUBLIC_SCENE_GLB || "/models/mio-terracos.glb";

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
  // computador sem placa de vídeo: mesmo pacote leve do celular (sem reflexo do piso, resolução menor)
  const [lite, setLite] = useState(() => mobile || isWeakGpu());
  const [dprMax, setDprMax] = useState(mobile ? 1.5 : lite ? 1.25 : 2);
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
      gl={{ antialias: !lite, powerPreference: "high-performance", alpha: false }}
      camera={{ fov, near: 0.05, far: 60, position: INTRO_PATH.position[0] }}
      onPointerMissed={() => sceneStore.set({ hovered: null })}
      onCreated={({ gl }) => gl.setClearColor("#ecd9c2")}
    >
      {/* se ainda assim ficar lento, cai para o pacote leve na hora */}
      <PerformanceMonitor
        onDecline={() => {
          setDprMax(1);
          setLite(true);
        }}
      />
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={["#ecd9c2", 9, 20]} />
      <LightRig reducedMotion={reducedMotion} />
      <SceneEnvironment />
      <Suspense fallback={null}>
        <GlbScene url={GLB_URL} />
        {!lite && <FloorReflection />}
        <RoomReflections size={lite ? 128 : 256} />
        <Hotspots />
        <Ready />
      </Suspense>
      <CameraRig reducedMotion={reducedMotion} />
      {!mobile && <CameraLook />}
    </Canvas>
    </>
  );
}
