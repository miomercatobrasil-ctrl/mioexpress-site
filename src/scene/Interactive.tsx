"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Outlines } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { COLORS, OBJECT_TO_HOTSPOT, type ObjectId, type Vec3 } from "./layout";
import { sceneStore, useScene } from "./store";

const Highlight = createContext(false);

/** Grupo nomeado (mesmo nome do objeto no .glb) com hover/click que abre o hotspot correspondente. */
export function Interactive({
  id,
  children,
  position,
  rotation,
}: {
  id: ObjectId;
  children: ReactNode;
  position?: Vec3;
  rotation?: Vec3;
}) {
  const hovered = useScene((s) => s.hovered === id);
  const hotspot = OBJECT_TO_HOTSPOT[id];

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!hotspot || sceneStore.get().mode !== "explore") return;
    e.stopPropagation();
    if (e.pointerType === "touch") return;
    sceneStore.set({ hovered: id });
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (sceneStore.get().hovered === id) sceneStore.set({ hovered: null });
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!hotspot || sceneStore.get().mode !== "explore") return;
    e.stopPropagation();
    if (e.delta > 6) return; // foi um arraste, não um clique
    sceneStore.set({ active: hotspot, touring: false, interacted: true, lastInteraction: performance.now() });
  };

  return (
    <group name={id} position={position} rotation={rotation} onPointerOver={over} onPointerOut={out} onClick={click}>
      <Highlight.Provider value={hovered}>{children}</Highlight.Provider>
    </group>
  );
}

export function useHighlight() {
  return useContext(Highlight);
}

export function HoverOutline() {
  const hl = useHighlight();
  if (!hl) return null;
  return <Outlines color={COLORS.vinho} thickness={0.012} />;
}

type BoxProps = {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  outline?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
};

export function Box({
  size,
  position,
  rotation,
  color,
  outline,
  emissive,
  emissiveIntensity = 1,
  roughness = 0.85,
  metalness = 0,
  opacity,
}: BoxProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? emissiveIntensity : 0}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
        depthWrite={opacity === undefined}
      />
      {outline && <HoverOutline />}
    </mesh>
  );
}
