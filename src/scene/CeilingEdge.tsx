"use client";

import { useMemo } from "react";
import * as THREE from "three";

// Acabamento da borda do teto do lado do jardim (sanca/viga): sem ela a laje parecia uma placa fina flutuando.
// Teto: x −0,25…4,58, z −0,2…6,6, face de baixo em y 2,505 (scripts/blender/mio_bake2.py, add_ceiling).
export function CeilingEdge() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e4ddd3", roughness: 0.9 }), []);
  return (
    <group name="borda_teto">
      <mesh material={mat} position={[4.58 + 0.04, 2.505 - 0.09 + 0.06, 3.2]} raycast={() => null}>
        <boxGeometry args={[0.08, 0.3, 6.8]} />
      </mesh>
      <mesh material={mat} position={[2.165, 2.505 - 0.09 + 0.06, -0.2 - 0.04]} raycast={() => null}>
        <boxGeometry args={[4.91, 0.3, 0.08]} />
      </mesh>
    </group>
  );
}
