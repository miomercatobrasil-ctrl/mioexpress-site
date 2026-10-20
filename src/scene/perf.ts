// Detecção de aparelho "leve": celular ou computador sem placa de vídeo dedicada (vídeo integrado Intel,
// renderização por software). Nesses o 3D usa texturas de luz menores, sem reflexo do piso e resolução menor.
let cached: boolean | null = null;

export function isWeakGpu() {
  if (typeof window === "undefined") return false;
  if (cached !== null) return cached;
  cached = false;
  try {
    if (new URLSearchParams(location.search).get("leve") === "1") return (cached = true);
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl && ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "").toLowerCase();
    cached = /intel|uhd|iris|swiftshader|llvmpipe|softpipe|microsoft basic|mali|adreno|powervr/.test(name);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {}
  return cached;
}

export const isLite = () =>
  typeof window !== "undefined" && (window.matchMedia("(max-width: 760px), (pointer: coarse)").matches || isWeakGpu());
