"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { DRACOLoader, GLTFLoader, KTX2Loader, MeshoptDecoder } from "three-stdlib";
import { suspend } from "suspend-react";
import { COLORS, OBJECT_TO_HOTSPOT, type ObjectId } from "./layout";
import { sceneStore, useScene } from "./store";
import { Vegetation, type PlantSpot } from "./Vegetation";
import { Products, hideGenericFridgeProducts } from "./Products";
import { FLAGS, diag, diagError } from "./diag";

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
    "// mio-clamp\noutgoingLight = clamp( outgoingLight, vec3( 1e-4 ), vec3( 16.0 ) );\n" + THREE.ShaderChunk.opaque_fragment;
}

/** UV do lightmap vem quantizado (inteiro normalizado, meshopt); o Chrome do Mac lia esse atributo como zero
 *  e a luz assada saía do canto preto da textura. Em float funciona em qualquer navegador. */
function floatLightmapUvs(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const a = g?.attributes.uv1 as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
    if (!g || !a || (a.array instanceof Float32Array && !a.normalized && !(a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute)) return;
    const out = new Float32Array(a.count * 2);
    for (let i = 0; i < a.count; i++) {
      out[i * 2] = a.getX(i);
      out[i * 2 + 1] = a.getY(i);
    }
    g.setAttribute("uv1", new THREE.BufferAttribute(out, 2));
  });
}

/** Nenhum material do projeto é espelhado: rugosidade mínima evita reflexos pontuais estourados. */
function tameSpecular(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) std.roughness = Math.max(std.roughness, 0.3);
      // sacola: recorte em vez de mistura (a ordenação da transparência deixava o tecido picotado e escuro)
      if (/sacolinha/i.test(std.name)) {
        std.transparent = false;
        std.alphaTest = 0.5;
        std.depthWrite = true;
      }
    }
  });
}
const VARIANTS = ["dia", "noite", "dia_semled", "noite_semled"] as const;
type Variant = (typeof VARIANTS)[number];

// uniforms compartilhados por todos os materiais com lightmap
export const lightmapUniforms = { uNight: { value: 0 } };

async function loadBitmapTexture(src: string) {
  // <img> em vez de ImageBitmap: no Chrome do Mac o ImageBitmap de WebP chegava zerado na GPU
  // (no Safari funcionava), e a noite/LED ficavam sem a luz assada
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  const t = new THREE.Texture(img);
  // valores crus; a conversão sRGB → linear é feita no shader (a decodificação da GPU variava entre aparelhos)
  t.colorSpace = THREE.NoColorSpace;
  t.channel = 1;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

// à noite, o que vende fica em destaque: armário e geladeiras recebem mais luz que paredes e piso
const NIGHT_BOOST: Record<string, number> = {
  armario_mio: 1.6,
  totem_pagamento: 1.3,
  geladeira_mio_1: 1.25,
  geladeira_mio_2: 1.25,
  geladeira_mio_3: 1.25,
  geladeira_coca: 1.25,
  freezer_loslos: 1.2,
};

// Materiais com luz assada e as 4 variantes de cada um. Dia/noite/LED trocam a textura do lightMap
// (caminho padrão do three): texturas extras em uniforms próprios chegavam zeradas na GPU do Mac.
const lmMaterials: { mat: THREE.MeshStandardMaterial; tex: Record<Variant, THREE.Texture>; dayAtNight: boolean }[] = [];

// o bake da noite deixou os produtos pequenos do armário quase pretos; à noite o armário e o totem usam a luz
// do dia (com o tom quente da noite no shader), mantendo a diferença de LED aceso/apagado
const DAY_AT_NIGHT = new Set(["armario_mio", "totem_pagamento"]);

function variantFor(night: boolean, led: boolean, dayAtNight: boolean): Variant {
  const n = night && !dayAtNight;
  return n ? (led ? "noite" : "noite_semled") : led ? "dia" : "dia_semled";
}

/** Diagnóstico: brilho médio (0–255) de cada variante lida pela própria GPU, desenhando a textura num alvo 8×8. */
function probeLightmaps(gl: THREE.WebGLRenderer) {
  const first = lmMaterials[0];
  if (!first) return;
  const rt = new THREE.WebGLRenderTarget(8, 8);
  const mat = new THREE.MeshBasicMaterial();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.position.z = -0.5;
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const buf = new Uint8Array(8 * 8 * 4);
  const out: string[] = [];
  const prev = gl.getRenderTarget();
  for (const v of VARIANTS) {
    const t = first.tex[v];
    // o lightmap usa o UV 2 (channel 1); o quadrado de teste só tem o UV 1
    t.channel = 0;
    mat.map = t;
    mat.needsUpdate = true;
    gl.setRenderTarget(rt);
    gl.render(quad, cam);
    t.channel = 1;
    gl.readRenderTargetPixels(rt, 0, 0, 8, 8, buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i += 4) sum += buf[i] + buf[i + 1] + buf[i + 2];
    out.push(`${v} ${Math.round(sum / 192)}`);
  }
  gl.setRenderTarget(prev);
  rt.dispose();
  mat.dispose();
  quad.geometry.dispose();
  diag.lmProbe = out.join(" · ");
}

export function setLightmapVariant(night: boolean, led: boolean) {
  for (const { mat, tex, dayAtNight } of lmMaterials) mat.lightMap = tex[variantFor(night, led, dayAtNight)];
}

function patchLightmapMaterial(mat: THREE.MeshStandardMaterial, tex: Record<Variant, THREE.Texture>, nightBoost = 1, dayAtNight = false) {
  const { night, led } = sceneStore.get();
  lmMaterials.push({ mat, tex, dayAtNight });
  if (typeof window !== "undefined" && location.hash.includes("debug3d")) (window as unknown as { __mioLm: unknown }).__mioLm = lmMaterials;
  mat.lightMap = tex[variantFor(night, led, dayAtNight)];
  mat.lightMapIntensity = LIGHTMAP_EXPOSURE;
  mat.envMapIntensity = 0;
  mat.side = THREE.DoubleSide;
  // embalagens metalizadas (100% metal) só mostram reflexo e ignoram a luz assada: à noite ficavam pretas
  mat.metalness = Math.min(mat.metalness, 0.35);
  mat.defines = {
    ...mat.defines,
    MIO_NIGHT_GAIN: FLAGS.nightGain.toFixed(3),
    MIO_NIGHT_EXP: FLAGS.nightExp.toFixed(3),
    MIO_NIGHT_BOOST: nightBoost.toFixed(3),
  };
  if (nightBoost === 1) mat.defines.MIO_CEILING_BOUNCE = "";
  if (dayAtNight) mat.defines.MIO_KEEP_AMBIENT = "";
  if (FLAGS.lightOnly) mat.defines.MIO_LIGHT_ONLY = "";
  diag.lmPatched++;
  mat.onBeforeCompile = (shader) => {
    diag.lmCompiled++;
    shader.uniforms.uNight = lightmapUniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vMioY;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvMioY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <lights_fragment_maps>",
        `#ifdef USE_LIGHTMAP
          // superfície com luz assada: ignora as luzes dinâmicas (só a luz do bake)
          irradiance = vec3( 0.0 );
          reflectedLight.directDiffuse = vec3( 0.0 );
          reflectedLight.directSpecular *= 0.15;
          // pow com base 0 é indefinido em GPUs com matemática rápida (Metal/Mac)
          vec3 lm = pow( max( texture2D( lightMap, vLightMapUv ).rgb, vec3( 1e-4 ) ), vec3( 2.2 ) );
          // dia: leve curva de contraste
          vec3 dayL = pow( lm, vec3( 1.12 ) );
          // noite: luminárias do teto e LED (variante já trocada no lightMap), em tom quente
          vec3 nightL = pow( lm, vec3( MIO_NIGHT_EXP ) ) * vec3( 1.25, 1.0, 0.72 ) * MIO_NIGHT_GAIN;
          #ifdef MIO_CEILING_BOUNCE
            // teto claro: as luminárias apontam para baixo, o teto recebe a luz rebatida do piso
            nightL += vec3( 0.34, 0.3, 0.24 ) * smoothstep( 2.25, 2.55, vMioY );
          #endif
          // o que vende (armário, geladeiras) fica em destaque
          nightL *= MIO_NIGHT_BOOST;
          // piso de luz: peças pequenas (produtos) que saíram escuras no bake não viram manchas pretas
          nightL += vec3( 0.07, 0.056, 0.042 ) * MIO_NIGHT_BOOST * MIO_NIGHT_BOOST;
          irradiance += mix( dayL, nightL, uNight ) * lightMapIntensity;
          #ifdef MIO_LIGHT_ONLY
            diffuseColor.rgb = vec3( 0.6 );
            material.diffuseColor = vec3( 0.6 );
            material.diffuseContribution = vec3( 0.6 );
          #endif
        #endif
        #include <lights_fragment_maps>
        #ifdef USE_LIGHTMAP
          // a luz de ambiente da cena (RoomEnvironment) soma por cima do bake: de dia mantém um pouco de
          // preenchimento e reflexo; à noite some, senão a loja continua iluminada como de dia
          #ifdef MIO_KEEP_AMBIENT
            // armário/totem: peças que saíram pretas no bake (pacotes) dependem dessa luz também à noite
            radiance *= 0.35;
          #else
            iblIrradiance *= 1.0 - uNight;
            radiance *= mix( 0.35, 0.2, uNight );
          #endif
        #endif`,
      )
      .replace("#include <common>", "#include <common>\nvarying float vMioY;\nuniform float uNight;")
      // o bloco original do lightmap fica desligado (já somado acima)
      .replace("vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );", "vec4 lightMapTexel = vec4( 0.0 );");
  };
  mat.customProgramCacheKey = () => "mio-lm19";
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
          loaded[v] = await loadBitmapTexture(`${base}lightmaps/${MOBILE_LM ? "m/" : ""}${name}__${v}.webp`).then(
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
            patchLightmapMaterial(c, tex, DAY_AT_NIGHT.has(name) ? 0.8 : (NIGHT_BOOST[name] ?? 1), DAY_AT_NIGHT.has(name));
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

// celular: lightmaps com metade da resolução (lightmaps/m/)
const MOBILE_LM = typeof window !== "undefined" && window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

/** Envia as texturas à GPU aos poucos, devolvendo o controle ao navegador entre lotes: no celular o envio
 *  de tudo no primeiro quadro travava a rolagem por mais de um segundo. */
async function uploadGradually(gl: THREE.WebGLRenderer, scene: THREE.Object3D) {
  const set = new Set<THREE.Texture>();
  const keys = ["map", "lightMap", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap"] as const;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      for (const k of keys) {
        const t = (mat as unknown as Record<string, THREE.Texture | null>)[k];
        if (t && (t as THREE.Texture).isTexture) set.add(t);
      }
    }
  });
  let i = 0;
  for (const t of set) {
    gl.initTexture(t);
    if (++i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
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

const LOGO_URL = (process.env.NEXT_PUBLIC_SCENE_ASSETS || "/").replace(/models\/$/, "") + "brand/logo-white.svg";

/** Tela do totem acesa: fundo vinho com o logo Mio e a instrução de uso (MeshBasic: não recebe a luz assada). */
async function lightTotemScreen(mesh: THREE.Mesh) {
  const W = 360, H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#8a2430");
  grad.addColorStop(1, "#5a141c");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  try {
    const img = new Image();
    img.src = LOGO_URL;
    await img.decode();
    const lw = W * 0.8, lh = (lw * 204) / 720;
    g.drawImage(img, (W - lw) / 2, H * 0.3, lw, lh);
  } catch {}
  g.fillStyle = "rgba(255,255,255,.9)";
  g.font = "600 26px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText("Passe o código", W / 2, H * 0.68);
  g.fillText("de barras", W / 2, H * 0.68 + 32);
  g.fillStyle = "rgba(255,255,255,.55)";
  g.font = "500 20px system-ui, sans-serif";
  g.fillText("Pix ou cartão", W / 2, H * 0.86);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // UV pela posição: a tela olha para +x (inclinada); direita de quem olha = −z
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const pts = Array.from({ length: pos.count }, (_, i) => v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).clone());
  const zs = pts.map((p) => p.z), ys = pts.map((p) => p.y);
  const [z0, z1, y0, y1] = [Math.min(...zs), Math.max(...zs), Math.min(...ys), Math.max(...ys)];
  const uv = new Float32Array(pos.count * 2);
  pts.forEach((p, i) => uv.set([(z1 - p.z) / (z1 - z0), (p.y - y0) / (y1 - y0)], i * 2));
  mesh.geometry = mesh.geometry.clone();
  mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  mesh.material = new THREE.MeshBasicMaterial({ map: tex });
}

/** Painel lateral do totem: os adesivos do SketchUp perderam a imagem na conversão (saem brancos);
 *  entram como um adesivo único. A tela do totem usava a arte "Como funciona" repetida: vira tela escura. */
async function fixTotem(scene: THREE.Object3D) {
  let screen: THREE.Mesh | null = null as THREE.Mesh | null;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some((x) => /^Material_25[3-7]/.test(x.name))) m.visible = false;
    if (mats.some((x) => x.name === "Color_G06")) screen = m;
  });
  if (screen) await lightTotemScreen(screen);
  try {
    const res = await fetch(STICKER_URL);
    // ImageBitmap ignora texture.flipY: a imagem já vem virada para o UV do three
    const bmp = await createImageBitmap(await res.blob(), { imageOrientation: "flipY" });
    const tex = new THREE.Texture(bmp as unknown as HTMLImageElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    // painel de madeira da ponta do armário: frente em x = 0,330 (z 1,195–1,525); arte 512×1450
    const w = 0.24;
    const h = w * (1450 / 512);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, transparent: true, alphaTest: 0.04, depthWrite: false }));
    plane.name = "adesivo_como_funciona";
    plane.position.set(0.3315, 1.99 - h / 2, 1.346);
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
function useModel(url: string, gl: THREE.WebGLRenderer, root: THREE.Scene, camera: THREE.Camera) {
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
    floatLightmapUvs(gltf.scene);
    tameSpecular(gltf.scene);
    tintMioFridges(gltf.scene);
    hideGenericFridgeProducts(gltf.scene);
    await fixTotem(gltf.scene);
    // tudo pronto antes de entrar na cena: luz assada aplicada, texturas na GPU aos poucos e shaders
    // compilados em paralelo (sem isso o primeiro quadro compilava ~200 materiais de uma vez)
    gltf.scene.userData.baked = FLAGS.lightmaps ? await applyLightmaps(gltf.scene, assetsBase(url)) : false;
    await uploadGradually(gl, gltf.scene);
    await gl.compileAsync(gltf.scene, camera, root).catch(() => undefined);
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
  const root = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const scene = useModel(url, gl, root, camera);
  const hovered = useScene((s) => s.hovered);
  useEffect(() => {
    sceneStore.set({ baked: !!scene.userData.baked });
    if (!location.hash.includes("debug3d")) return;
    (window as unknown as { __mioScene: unknown }).__mioScene = scene;
    try {
      probeLightmaps(gl);
    } catch (e) {
      diagError("sonda", e);
    }
  }, [scene, gl]);

  // hover: brilho vinho suave no objeto (troca temporária dos materiais)
  useEffect(() => {
    if (!hovered) return;
    const target = scene.getObjectByName(hovered);
    if (!target) return;
    // brilho no próprio material (sem clonar: o clone recompilava o shader e o objeto sumia no Mac)
    const saved = new Map<THREE.MeshStandardMaterial, [THREE.Color, number]>();
    target.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const m = mat as THREE.MeshStandardMaterial;
        if (!m.isMeshStandardMaterial || saved.has(m)) continue;
        saved.set(m, [m.emissive.clone(), m.emissiveIntensity]);
        m.emissive.set(COLORS.vinho);
        m.emissiveIntensity = 0.22;
      }
    });
    return () =>
      saved.forEach(([color, intensity], m) => {
        m.emissive.copy(color);
        m.emissiveIntensity = intensity;
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
      <Products />
    </>
  );
}
