"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { DRACOLoader, GLTFLoader, KTX2Loader, MeshoptDecoder } from "three-stdlib";
import { suspend } from "suspend-react";
import { COLORS, OBJECT_TO_HOTSPOT, type ObjectId } from "./layout";
import { sceneStore, useScene } from "./store";
import { Vegetation, type PlantSpot } from "./Vegetation";
import { diag, diagError } from "./diag";

// Cena final exportada do Blender (ver docs/PIPELINE-3D.md).
// Os objetos de primeiro nível precisam ter os nomes de `ObjectId` (armario_mio, totem_pagamento…).

// decodificadores servidos localmente (copiados de three/examples/jsm/libs)
const KTX2_PATH = "/libs/basis/";
const DRACO_PATH = "/libs/draco/";

// Iluminação assada no Blender (scripts/blender/mio_build.py): uma textura por objeto de primeiro nível,
// no UV2 ("lightmap"), gravada como luz/2 em sRGB. A exposição compensa a luz física (fraca) do bake.
const LIGHTMAP_EXPOSURE = 3;
// pasta com lightmaps/ e plants.json (padrão: a mesma do .glb)
const assetsBase = (url: string) => process.env.NEXT_PUBLIC_SCENE_ASSETS || url.replace(/[^/]+$/, "");

const LIGHTMAPPED = [
  "armario_mio", "totem_pagamento", "geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3", "geladeira_coca",
  "freezer_loslos", "divisoria_ripada_1", "divisoria_ripada_2", "banco", "jardim", "piso", "paredes",
];

function useLightmaps(scene: THREE.Object3D, url: string) {
  const [, setDone] = useState(false);
  useEffect(() => {
    const base = assetsBase(url) + "lightmaps/";
    let alive = true;
    const load = async (src: string) => {
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: "none" });
      const t = new THREE.Texture(bmp as unknown as HTMLImageElement);
      t.needsUpdate = true;
      return t;
    };
    Promise.all(
      LIGHTMAPPED.map(async (name) => {
        const obj = scene.getObjectByName(name);
        if (!obj) return;
        const tex = await load(`${base}${name}.webp`).catch((e) => {
          diag.lmFail++;
          diagError(`lightmap ${name}`, e);
          return null;
        });
        if (!tex || !alive) return;
        diag.lmOk++;
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
              c.lightMapIntensity = LIGHTMAP_EXPOSURE;
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

/** As geladeiras Mio são vinho; no SketchUp o corpo saiu com materiais pretos ("Color M08", "METAL PRETO"). */
function tintMioFridges(scene: THREE.Object3D) {
  const vinho = new THREE.Color("#6e1c24");
  for (const name of ["geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3"]) {
    scene.getObjectByName(name)?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const out = mats.map((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        const dark = std.color && !std.map && std.color.r + std.color.g + std.color.b < 0.25;
        if (!dark || !/m08|preto/i.test(std.name)) return mat;
        const c = std.clone();
        c.color.copy(vinho);
        c.roughness = 0.55;
        return c;
      });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
  }
}

/** Carrega o .glb (ou o .glb em base64 num ".b64.txt", usado na prévia publicada, que não serve .glb)
 *  com fetch + parse. As texturas embutidas são lidas por <img> (TextureLoader), que funciona também
 *  em páginas com política de segurança restrita. */
function useModel(url: string, gl: THREE.WebGLRenderer) {
  return suspend(async () => {
    diag.model = "baixando";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`modelo 3D: ${res.status}`);
    let buf: ArrayBuffer;
    if (url.endsWith(".b64.txt")) {
      const bin = Uint8Array.from(atob((await res.text()).trim()), (c) => c.charCodeAt(0));
      buf = bin.buffer;
    } else buf = await res.arrayBuffer();
    const loader = new GLTFLoader();
    // no three-stdlib o decoder é uma fábrica
    const meshopt = MeshoptDecoder as unknown;
    loader.setMeshoptDecoder((typeof meshopt === "function" ? meshopt() : meshopt) as never);
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_PATH));
    loader.setKTX2Loader(new KTX2Loader().setTranscoderPath(KTX2_PATH).detectSupport(gl) as never);
    loader.register((parser) => {
      // decodifica as imagens embutidas direto dos bytes (createImageBitmap), sem criar URLs de imagem:
      // funciona também em páginas com política de segurança restrita (prévia publicada)
      const p = parser as unknown as {
        json: { images: { bufferView?: number; mimeType?: string; uri?: string }[] };
        getDependency: (type: string, index: number) => Promise<ArrayBuffer>;
        sourceCache: Record<string, Promise<THREE.Texture>>;
        loadImageSource: (i: number, loader: THREE.Loader) => Promise<THREE.Texture>;
      };
      const original = p.loadImageSource.bind(parser);
      p.loadImageSource = (index, ldr) => {
        const src = p.json.images[index];
        if (src.bufferView === undefined) return original(index, ldr);
        const key = `mio-${index}`;
        p.sourceCache[key] ??= p.getDependency("bufferView", src.bufferView).then(async (bytes) => {
          try {
            const bmp = await createImageBitmap(new Blob([bytes], { type: src.mimeType }), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
            diag.texOk++;
            if (src.mimeType === "image/png" && diag.samples.length < 4) diag.samples.push(bmp);
            const tex = new THREE.Texture(bmp as unknown as HTMLImageElement);
            tex.needsUpdate = true;
            return tex;
          } catch (e) {
            diag.texFail++;
            diagError(`textura ${index} (${src.mimeType})`, e);
            throw e;
          }
        });
        return p.sourceCache[key].then((t) => t.clone());
      };
      return { name: "mio_bitmap_textures" } as never;
    });
    diag.model = "lendo";
    const gltf = await loader.parseAsync(buf, "").catch((e) => {
      diagError("modelo", e);
      diag.model = "erro";
      throw e;
    });
    diag.model = "ok";
    tintMioFridges(gltf.scene);
    return gltf.scene;
  }, [url, "mio-model"]);
}

export function GlbScene({ url }: { url: string }) {
  return <GlbModel url={url} />;
}

function GlbModel({ url }: { url: string }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    try {
      const ctx = gl.getContext();
      const ext = ctx.getExtension("WEBGL_debug_renderer_info");
      diag.gpu = String(ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)).slice(0, 80);
    } catch {}
  }, [gl]);
  const scene = useModel(url, gl);
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

  const [plants, setPlants] = useState<PlantSpot[]>([]);
  useEffect(() => {
    fetch(assetsBase(url) + "plants.json")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlants)
      .catch(() => setPlants([]));
  }, [url]);

  return (
    <>
      <primitive object={scene} onPointerOver={over} onPointerOut={out} onClick={click} />
      <Vegetation spots={plants} />
    </>
  );
}
