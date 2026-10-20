"use client";

import { Html } from "@react-three/drei";
import { HOTSPOTS } from "./layout";
import { sceneStore, useScene } from "./store";

export function Hotspots() {
  const mode = useScene((s) => s.mode);
  const active = useScene((s) => s.active);
  const checkout = useScene((s) => s.checkout);
  if (mode !== "explore" || checkout !== "off") return null;
  return (
    <>
      {HOTSPOTS.map((h) => (
        <Html key={h.id} position={h.anchor} center zIndexRange={[20, 0]}>
          <button
            type="button"
            className={`hotspot${active === h.id ? " is-active" : ""}`}
            aria-label={h.title}
            onClick={(e) => {
              e.stopPropagation();
              sceneStore.set({ active: h.id, touring: false, interacted: true, lastInteraction: performance.now() });
            }}
          >
            <span className="hotspot__dot" />
            <span className="hotspot__label">{h.title}</span>
          </button>
        </Html>
      ))}
    </>
  );
}
