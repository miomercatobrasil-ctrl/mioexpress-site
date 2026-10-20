import { useSyncExternalStore } from "react";
import type { HotspotId, ObjectId } from "./layout";

export type SceneState = {
  mode: "intro" | "explore";
  introProgress: number;
  active: HotspotId | null;
  hovered: ObjectId | null;
  touring: boolean;
  interacted: boolean;
  lastInteraction: number;
  zoomRequest: number; // incrementa/decrementa a cada clique em +/-
  ready: boolean;
  loadProgress: number;
  night: boolean; // false = dia (luz natural), true = noite (todas as luzes acesas)
  led: boolean; // fita de LED do armário
  baked: boolean; // cena com luz assada (lightmaps)
  // simulação de compra: produtos pegos das prateleiras e etapa no totem
  cart: { key: string; label: string }[];
  checkout: "off" | "scan" | "pay" | "paying" | "done";
  lastAdded: { label: string; t: number } | null;
  nudge: number; // fim do tour: destaca o convite para comprar
};

let state: SceneState = {
  mode: "intro",
  introProgress: 0,
  active: null,
  hovered: null,
  touring: false,
  interacted: false,
  lastInteraction: 0,
  zoomRequest: 0,
  ready: false,
  loadProgress: 0,
  night: false,
  led: true,
  baked: false,
  cart: [],
  checkout: "off",
  lastAdded: null,
  nudge: 0,
};

const listeners = new Set<() => void>();

export const sceneStore = {
  get: () => state,
  set(partial: Partial<SceneState>) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useScene<T>(selector: (s: SceneState) => T): T {
  return useSyncExternalStore(
    sceneStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
