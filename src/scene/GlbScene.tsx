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
const STICKER_URL = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/") .replace(/models\/$/, "") + "textures/adesivo-como-funciona.png";
const KTX2_PATH = "/libs/basis/";
const DRACO_PATH = "/libs/draco/";

// Iluminação assada no Blender (scripts/blender/mio_bake2.py): por objeto, até 4 variantes no UV2 ("lightmap"):
// dia, noite, dia_semled, noite_semled. O shader mistura as variantes conforme os botões Dia/Noite e LED.
// Ligado quando existe lightmaps.json ao lado do modelo.
const LIGHTMAP_EXPOSURE = 1.45;

// GPUs que calculam em meia precisão (Macs, celulares) estouram o brilho especular de superfícies muito lisas
// perto das luzes pontuais: o pixel vira infinito e o bloom espalha manchas brancas. Limita a luz de saída.
if (!THREE.ShaderChunk.opaque_fragment.includes("mio-clamp")) {
  THREE.ShaderChunk.opaque_fragment =
    "// mio-clamp\noutgoingLight = clamp( outgoingLight, vec3( 0.0 ), vec3( 16.0 ) );\n" + THREE.ShaderChunk.opaque_fragment;
}

/** Nenhum material do projeto é espelhado: rugosidade mínima evita reflexos pontuais estourados. */
function tameSpecular(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) std.roughness = Math.max(std.roughness, 0.3);
    }
  });
}
const VARIANTS = ["dia", "noite", "dia_semled", "noite_semled"] as const;
type Variant = (typeof VARIANTS)[number];

// uniforms compartilhados por todos os materiais com lightmap
export const lightmapUniforms = { uNight: { value: 0 }, uLedOff: { value: 0 } };

async function loadBitmapTexture(src: string) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(String(res.status));
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: "none" });
  const t = new THREE.Texture(bmp as unknown as HTMLImageElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.channel = 1;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

function patchLightmapMaterial(mat: THREE.MeshStandardMaterial, tex: Record<Variant, THREE.Texture>) {
  mat.lightMap = tex.dia;
  mat.lightMapIntensity = LIGHTMAP_EXPOSURE;
  mat.envMapIntensity = 0;
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLmNight = { value: tex.noite };
    shader.uniforms.uLmDayOff = { value: tex.dia_semled };
    shader.uniforms.uLmNightOff = { value: tex.noite_semled };
    shader.uniforms.uNight = lightmapUniforms.uNight;
    shader.uniforms.uLedOff = lightmapUniforms.uLedOff;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <lights_fragment_maps>",
        `#ifdef USE_LIGHTMAP
          // superfície com luz assada: ignora as luzes dinâmicas (só a luz do bake)
          irradiance = vec3( 0.0 );
          reflectedLight.directDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular *= 0.15;
          // LED: parte da luz que vem só da fita (aceso − apagado), reforçada para o botão ter efeito visível
          vec3 dOff = texture2D( uLmDayOff, vLightMapUv ).rgb;
          vec3 nOff = texture2D( uLmNightOff, vLightMapUv ).rgb;
          vec3 dLed = max( texture2D( lightMap, vLightMapUv ).rgb - dOff, vec3( 0.0 ) );
          vec3 nLed = max( texture2D( uLmNight, vLightMapUv ).rgb - nOff, vec3( 0.0 ) );
          vec4 lmD = vec4( dOff * mix( 1.0, 0.9, uLedOff ) + dLed * 1.4 * ( 1.0 - uLedOff ), 1.0 );
          vec4 lmN = vec4( nOff * mix( 1.0, 0.75, uLedOff ) + nLed * 1.8 * ( 1.0 - uLedOff ), 1.0 );
          // dia: leve curva de contraste; noite: mais escura, quente e contrastada (poças de luz dos spots/LED)
          vec3 dayL = pow( lmD.rgb, vec3( 1.12 ) );
          vec3 nightL = pow( lmN.rgb, vec3( 1.4 ) ) * vec3( 1.25, 1.0, 0.72 ) * 1.35;
          // luz rebatida: teto e cantos ficam numa penumbra quente, nunca pretos
          nightL += lmD.rgb * vec3( 0.2, 0.15, 0.1 );
          irradiance += mix( dayL, nightL, uNight ) * lightMapIntensity;
        #endif
        #include <lights_fragment_maps>`,
      )
      .replace("#include <common>", "#include <common>\nuniform sampler2D uLmNight;\nuniform sampler2D uLmDayOff;\nuniform sampler2D uLmNightOff;\nuniform float uNight;\nuniform float uLedOff;")
      // o bloco original do lightmap fica desligado (já somado acima)
      .replace("vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );", "vec4 lightMapTexel = vec4( 0.0 );");
  };
  mat.customProgramCacheKey = () => "mio-lm5";
  mat.needsUpdate = true;
}

/** Aplica os lightmaps; retorna true se a cena tem luz assada. */
async function applyLightmaps(scene: THREE.Object3D, base: string) {
  const res = await fetch(base + "lightmaps.json").catch(() => null);
  if (!res || !res.ok) return false;
  const manifest = (await res.json()) as { objects: Record<string, Variant[]> };
  await Promise.all(
    Object.entries(manifest.objects).map(async ([name, variants]) => {
      const obj = scene.getObjectByName(name);
      if (!obj) return;
      const loaded: Partial<Record<Variant, THREE.Texture>> = {};
      await Promise.all(
        variants.map(async (v) => {
          loaded[v] = await loadBitmapTexture(`${base}lightmaps/${name}__${v}.webp`).then(
            (t) => (diag.lmOk++, t),
            (e) => {
              diag.lmFail++;
              diagError(`lightmap ${name} ${v}`, e);
              return undefined;
            },
          );
        }),
      );
      if (!loaded.dia) return;
      const tex: Record<Variant, THREE.Texture> = {
        dia: loaded.dia,
        noite: loaded.noite ?? loaded.dia,
        dia_semled: loaded.dia_semled ?? loaded.dia,
        noite_semled: loaded.noite_semled ?? loaded.noite ?? loaded.dia,
      };
      const cache = new Map<THREE.Material, THREE.Material>();
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry.attributes.uv1) return;
        const swap = (mat: THREE.Material) => {
          // materiais com transparência (rótulos recortados, vidros, logos) saem pretos no bake: ficam com luz dinâmica
          const std = mat as THREE.MeshStandardMaterial;
          if (!std.isMeshStandardMaterial || mat.transparent || mat.alphaTest > 0) return mat;
          if (!cache.has(mat)) {
            const c = (mat as THREE.MeshStandardMaterial).clone();
            patchLightmapMaterial(c, tex);
            cache.set(mat, c);
          }
          return cache.get(mat)!;
        };
        m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
      });
    }),
  );
  return true;
}

// pasta com lightmaps/ e plants.json (padrão: a mesma do .glb)
const assetsBase = (url: string) => process.env.NEXT_PUBLIC_SCENE_ASSETS || url.replace(/[^/]+$/, "");

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

/** Painel lateral do totem: os adesivos do SketchUp perderam a imagem na conversão (saem brancos);
 *  entram como um adesivo único. A tela do totem usava a arte "Como funciona" repetida: vira tela escura. */
async function fixTotem(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some((x) => /^Material_25[3-7]/.test(x.name))) m.visible = false;
    if (mats.some((x) => x.name === "Color_G06")) {
      m.material = new THREE.MeshStandardMaterial({ color: "#14181c", emissive: "#2a3f55", emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.1 });
    }
  });
  try {
    const res = await fetch(STICKER_URL);
    // ImageBitmap ignora texture.flipY: a imagem já vem virada para o UV do three
    const bmp = await createImageBitmap(await res.blob(), { imageOrientation: "flipY" });
    const tex = new THREE.Texture(bmp as unknown as HTMLImageElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    // painel: frente em x = 0,41; z 1,22–1,47; arte 512×1450
    const w = 0.24;
    const h = w * (1450 / 512);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, transparent: true, alphaTest: 0.04, depthWrite: false }));
    plane.name = "adesivo_como_funciona";
    plane.position.set(0.425, 1.99 - h / 2, 1.345);
    plane.renderOrder = 2;
    plane.rotation.y = Math.PI / 2;
    scene.add(plane);
  } catch (e) {
    diagError("adesivo", e);
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
    tameSpecular(gltf.scene);
    tintMioFridges(gltf.scene);
    await fixTotem(gltf.scene);
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
  useEffect(() => {
    let alive = true;
    applyLightmaps(scene, assetsBase(url)).then((baked) => alive && sceneStore.set({ baked }));
    return () => {
      alive = false;
    };
  }, [scene, url]);

  // hover: brilho vinho suave no objeto (troca temporária dos materiais)
  useEffect(() => {
    if (!hovered) return;
    const target = scene.getObjectByName(hovered);
    if (!target) return;
    const restore: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const glow = (mat: THREE.Material) => {
      const m = mat as THREE.MeshStandardMaterial;
      if (!("emissive" in m)) return mat;
      const c = m.clone();
      // clone() não copia o patch do shader de lightmap
      c.onBeforeCompile = m.onBeforeCompile;
      c.customProgramCacheKey = m.customProgramCacheKey;
      c.emissive = new THREE.Color(COLORS.vinho);
      c.emissiveIntensity = 0.22;
      return c;
    };
    target.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      restore.push([mesh, mesh.material]);
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(glow) : glow(mesh.material);
    });
    return () =>
      restore.forEach(([mesh, mat]) => {
        const cur = mesh.material;
        (Array.isArray(cur) ? cur : [cur]).forEach((m) => m.dispose());
        mesh.material = mat;
      });
  }, [hovered, scene]);

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
