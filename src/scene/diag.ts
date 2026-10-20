// Erros do carregamento 3D vão para o console (a página segue com a foto se o 3D falhar).
export function diagError(where: string, e: unknown) {
  console.warn("[mio]", `${where}: ${e instanceof Error ? e.message : String(e)}`);
}

// ajuste da luz da noite (ver patchLightmapMaterial)
export const NIGHT = { gain: 1.5, exp: 1.15 };
