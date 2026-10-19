"""
Ajustes finais na geometria assada (sem mexer nos UVs/lightmaps):
remove os adesivos do painel do totem que perderam a imagem na conversão do SketchUp (saem brancos);
o site coloca o adesivo "Como funciona" no lugar.

Uso: python scripts/blender/mio_post.py assets/source/export/build/mio-terracos-baked.glb
"""

import sys

import bpy
import bmesh  # noqa: E402

SRC = sys.argv[1]
# região do painel lateral (site: x, y, z) -> faces planas brancas dos adesivos
X = (0.385, 0.43)
Y = (1.05, 2.02)
Z = (1.19, 1.50)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
total = 0
for o in bpy.data.objects:
    if o.type != "MESH" or o.name not in ("armario_mio", "totem_pagamento"):
        continue
    bm = bmesh.new()
    bm.from_mesh(o.data)
    mw = o.matrix_world
    mats = o.data.materials
    dead = []
    for f in bm.faces:
        c = mw @ f.calc_center_median()
        sx, sy, sz = c.x, c.z, -c.y
        if not (X[0] <= sx <= X[1] and Y[0] <= sy <= Y[1] and Z[0] <= sz <= Z[1]):
            continue
        n = (mw.to_3x3() @ f.normal).normalized()
        if abs(n.x) < 0.9:  # só faces viradas para frente (+/-X)
            continue
        m = mats[f.material_index] if f.material_index < len(mats) else None
        name = (m.name if m else "").lower()
        if "b03" in name or "mdf" in name:  # o MDF do painel fica
            continue
        dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bm.to_mesh(o.data)
    bm.free()
    total += len(dead)
    print(f"[post] {o.name}: {len(dead)} faces de adesivo removidas", flush=True)
bpy.ops.export_scene.gltf(filepath=SRC, export_format="GLB", export_yup=True, export_lights=False, export_cameras=False, export_texcoords=True, export_normals=True)
print("[post] ok", total, flush=True)
