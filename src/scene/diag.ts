// Diagnóstico do carregamento 3D. Abra a página com "#debug3d" no fim do endereço para ver o painel.
export const BUILD_TAG = "v12";

export const diag = {
  model: "aguardando",
  texOk: 0,
  texFail: 0,
  lmOk: 0,
  lmFail: 0,
  errors: [] as string[],
  gpu: "",
  samples: [] as ImageBitmap[],
};

export function diagError(where: string, e: unknown) {
  const msg = `${where}: ${e instanceof Error ? e.message : String(e)}`;
  if (diag.errors.length < 8) diag.errors.push(msg.slice(0, 160));
  console.warn("[mio]", msg);
}
