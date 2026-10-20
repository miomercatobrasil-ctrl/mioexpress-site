// Diagnóstico do carregamento 3D. Abra a página com "#debug3d" no fim do endereço para ver o painel.
export const BUILD_TAG = "v52";

export const diag = {
  model: "aguardando",
  texOk: 0,
  texFail: 0,
  lmOk: 0,
  lmFail: 0,
  lmPatched: 0,
  lmCompiled: 0,
  lmProbe: "",
  errors: [] as string[],
  gpu: "",
  samples: [] as ImageBitmap[],
};

export function diagError(where: string, e: unknown) {
  const msg = `${where}: ${e instanceof Error ? e.message : String(e)}`;
  if (diag.errors.length < 8) diag.errors.push(msg.slice(0, 160));
  console.warn("[mio]", msg);
}

/** Chaves de teste pelo endereço (?lm=0 sem luz assada, ?fx=0 sem pós-processamento, ?lmuv=1 só a luz assada em cinza). */
const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
export const FLAGS = {
  lightmaps: params?.get("lm") !== "0",
  effects: params?.get("fx") !== "0",
  lightOnly: params?.get("lmuv") === "1",
  nightZero: params?.get("lmzero") === "1",
  // ajuste fino da noite pelo endereço (?ng=ganho&ne=curva), para comparar opções no aparelho real
  nightGain: Number(params?.get("ng")) || 1.5,
  nightExp: Number(params?.get("ne")) || 1.15,
};
