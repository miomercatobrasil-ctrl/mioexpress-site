import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "./layout";

// Texturas desenhadas em canvas para os placeholders (logo no armário, placa, painel "Como funciona").
// No .glb final elas vêm "assadas" do Blender.

function woodBackground(ctx: CanvasRenderingContext2D, w: number, h: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // veios suaves
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 60; i++) {
    const y = (i / 60) * h + Math.sin(i * 7.3) * 6;
    ctx.strokeStyle = i % 3 ? "#8a6a48" : "#ffffff";
    ctx.lineWidth = 1 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += w / 8) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function makeTexture(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Painel lateral "Como funciona" com os passos 1–4. */
export function useHowItWorksPanel() {
  const tex = useMemo(() => {
    const W = 256;
    const H = 1024;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    woodBackground(ctx, W, H, COLORS.madeiraClara);
    ctx.fillStyle = COLORS.vinho;
    ctx.beginPath();
    ctx.roundRect(28, 36, W - 56, 44, 22);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMO FUNCIONA", W / 2, 66);
    const steps = ["Escolha", "Passe o código", "Pague no totem", "Pronto!"];
    steps.forEach((s, i) => {
      const y = 150 + i * 190;
      ctx.fillStyle = COLORS.vinho;
      ctx.beginPath();
      ctx.arc(60, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "700 28px system-ui, sans-serif";
      ctx.fillText(String(i + 1), 60, y + 10);
      ctx.fillStyle = "#3a2a22";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(110, y - 40, 110, 80);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#4a2a22";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(s, W / 2, y + 80);
    });
    return makeTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Piso cerâmico bege em paginação mista (aproximação do piso dos renders). */
export function useFloorTexture(repeatX: number, repeatY: number) {
  const tex = useMemo(() => {
    const S = 512;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    const tones = ["#e2cfb0", "#d6bf9c", "#e9dac0", "#cfb690", "#ddc8a6"];
    ctx.fillStyle = "#c9b28d";
    ctx.fillRect(0, 0, S, S);
    const u = S / 4;
    let k = 0;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = tones[(k++ * 7 + y) % tones.length];
        if ((x + y) % 2) {
          ctx.fillRect(x * u + 2, y * u + 2, u - 4, u / 2 - 3);
          ctx.fillStyle = tones[(k * 3) % tones.length];
          ctx.fillRect(x * u + 2, y * u + u / 2 + 1, u - 4, u / 2 - 3);
        } else {
          ctx.fillRect(x * u + 2, y * u + 2, u / 2 - 3, u - 4);
          ctx.fillStyle = tones[(k * 5) % tones.length];
          ctx.fillRect(x * u + u / 2 + 1, y * u + 2, u / 2 - 3, u - 4);
        }
      }
    const t = makeTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    return t;
  }, [repeatX, repeatY]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
