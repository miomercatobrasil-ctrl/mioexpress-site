"use client";

import dynamic from "next/dynamic";
import { PLAN_V8K3 } from "@/scene/sala/build";

const SalaViewer = dynamic(() => import("@/scene/sala/SalaViewer"), {
  ssr: false,
  loading: () => <div className="sala3d"><div className="sala3d__loading">Montando a sua loja…</div></div>,
});

export function SalaSection() {
  return <SalaViewer plan={PLAN_V8K3} />;
}
