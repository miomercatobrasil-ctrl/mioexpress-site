"use client";

import { useEffect, useMemo, useState } from "react";
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

// Iluminação assada no Blender (scripts/blender/mio_build.py): uma textura por objeto de primeiro nível,
// no UV2 ("lightmap"), gravada como luz/2 em sRGB -> lightMapIntensity 2.
const LIGHTMAPPED = [
  "armario_mio", "totem_pagamento", "geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3", "geladeira_coca",
  "freezer_loslos", "divisoria_ripada_1", "divisoria_ripada_2", "banco", "jardim", "piso", "paredes",
];

function useLightmaps(scene: THREE.Object3D, url: string) {
  const [, setDone] = useState(false);
  useEffect(() => {
    const base = url.replace(/[^/]+$/, "lightmaps/");
    const loader = new THREE.TextureLoader();
    let alive = true;
    Promise.all(
      LIGHTMAPPED.map(async (name) => {
        const obj = scene.getObjectByName(name);
        if (!obj) return;
        const tex = await loader.loadAsync(`${base}${name}.webp`).catch(() => null);
        if (!tex || !alive) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.channel = 1;
        tex.flipY = false;
        const cache = new Map<THREE.Material, THREE.Material>();
        obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.geometry.attributes.uv1) return;
          const swap = (mat: THREE.Material) => {
            if (!cache.has(mat)) {
              const c = mat.clone() as THREE.MeshStandardMaterial;
              c.lightMap = tex;
              c.lightMapIntensity = 2;
              c.envMapIntensity = 0;
              cache.set(mat, c);
            }
            return cache.get(mat)!;
          };
          m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
        });
      }),
    ).then(() => alive && setDone(true));
    return () => {
      alive = false;
    };
  }, [scene, url]);
}

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
  useLightmaps(scene, url);

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
