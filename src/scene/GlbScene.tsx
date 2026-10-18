"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { KTX2Loader } from "three-stdlib";
import { COLORS, OBJECT_TO_HOTSPOT, type ObjectId } from "./layout";
import { sceneStore, useScene } from "./store";

// Cena final exportada do Blender (ver docs/PIPELINE-3D.md).
// Os objetos de primeiro nível precisam ter os nomes de `ObjectId` (armario_mio, totem_pagamento…).

// decodificadores servidos localmente (copiados de three/examples/jsm/libs)
const KTX2_PATH = "/libs/basis/";
const DRACO_PATH = "/libs/draco/";

function findObjectId(o: THREE.Object3D | null): ObjectId | null {
  while (o) {
    if (o.name in OBJECT_TO_HOTSPOT) return o.name as ObjectId;
    o = o.parent;
  }
  return null;
}

export function GlbScene({ url }: { url: string }) {
  const gl = useThree((s) => s.gl);
  const { scene } = useGLTF(url, DRACO_PATH, true, (loader) => {
    const ktx2 = new KTX2Loader().setTranscoderPath(KTX2_PATH).detectSupport(gl);
    loader.setKTX2Loader(ktx2 as never);
  });
  const hovered = useScene((s) => s.hovered);

  // contorno de hover: cópia do objeto com material de casco invertido
  const outlineMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.vinho, side: THREE.BackSide, transparent: true, opacity: 0.9 }),
    [],
  );
  useEffect(() => {
    if (!hovered) return;
    const target = scene.getObjectByName(hovered);
    if (!target) return;
    const shells: THREE.Mesh[] = [];
    target.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.isOutline) return;
      const shell = new THREE.Mesh(m.geometry, outlineMat);
      shell.userData.isOutline = true;
      shell.scale.setScalar(1.015);
      shell.raycast = () => {};
      m.add(shell);
      shells.push(shell);
    });
    return () => shells.forEach((s) => s.removeFromParent());
  }, [hovered, scene, outlineMat]);

  const over = (e: ThreeEvent<PointerEvent>) => {
    const id = findObjectId(e.object);
    if (!id || sceneStore.get().mode !== "explore" || e.pointerType === "touch") return;
    e.stopPropagation();
    sceneStore.set({ hovered: id });
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    sceneStore.set({ hovered: null });
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    const id = findObjectId(e.object);
    const hs = id && OBJECT_TO_HOTSPOT[id];
    if (!hs || sceneStore.get().mode !== "explore" || e.delta > 6) return;
    e.stopPropagation();
    sceneStore.set({ active: hs, touring: false, interacted: true, lastInteraction: performance.now() });
  };

  return <primitive object={scene} onPointerOver={over} onPointerOut={out} onClick={click} />;
}
