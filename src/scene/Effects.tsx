"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Reflexos suaves (vidros, metais, embalagens) a partir de um ambiente neutro. Barato: vale também no celular. */
export function SceneEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.6;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

// AgX faz log2 da cor com piso 1e-10; em meia precisão (GPU do Mac, celulares) esse piso vira 0 e o log2(0)
// dá lixo: os pixels mais escuros (sombras, frestas, noite) saem brancos. Piso representável em 16 bits.
if (THREE.ShaderChunk.tonemapping_pars_fragment.includes("max( color, 1e-10 )")) {
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace("max( color, 1e-10 )", "max( color, 1e-4 )");
}

/** Acabamento de câmera (só no computador): curva de tom ACES (mais contraste que AgX sem pós-processamento) aplicada direto nos materiais.
 *  Sem cadeia de pós-processamento: no Mac (Metal, meia precisão) ela transformava os pixels escuros em
 *  manchas brancas. A vinheta fica no CSS (.ambiente__stage::after). */
export function CameraLook() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const prev = gl.toneMapping;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    return () => {
      gl.toneMapping = prev;
    };
  }, [gl]);
  return null;
}

/** Reflexo do porcelanato (só no computador): plano translúcido sobre o piso da loja. */
export function FloorReflection() {
  return (
    <mesh position={[2.2, 0.004, 2.25]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[4.5, 4.7]} />
      <MeshReflectorMaterial
        transparent
        opacity={0.32}
        blur={[260, 80]}
        resolution={512}
        mixBlur={1}
        mixStrength={0.9}
        roughness={0.85}
        depthScale={0.6}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.2}
        color="#b9aa95"
        metalness={0.1}
        mirror={0.45}
      />
    </mesh>
  );
}
