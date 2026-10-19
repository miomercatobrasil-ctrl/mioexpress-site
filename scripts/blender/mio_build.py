"""
Mio Express – Terraços: .glb bruto (convertido do .dae do SketchUp) -> .glb do site + lightmaps.

Uso (Blender 5.x como módulo Python, `pip install bpy`):
    python scripts/blender/mio_build.py assets/source/export/terracos-raw.glb assets/source/export/build

Etapas:
  1. importa e desloca para as coordenadas do site (origem no canto armário/geladeiras; ver src/scene/layout.ts)
  2. apaga o que está fora da área da loja
  3. classifica cada malha pelo volume que ocupa (caixas da planta) e junta por equipamento,
     com os nomes usados no site (armario_mio, totem_pagamento, geladeira_mio_1…)
  4. vegetação de referência (blocos brancos do SketchUp) vira verde
  5. reduz polígonos (cada equipamento tem um orçamento de triângulos)
  6. exporta build/mio-terracos-nobake.glb + plants.json (o bake é feito por mio_bake.py)
"""

import json
import math
import os
import random
import sys
import time

import bpy
from mathutils import Vector

args = [a for a in sys.argv[1:]]
SRC, OUT = args[0], args[1]
os.makedirs(OUT, exist_ok=True)

# deslocamento do modelo do SketchUp para as coordenadas do site (medido na planta)
DX, DZ = 13.55, 50.2

# caixas (coordenadas do site: x, y=altura, z) de cada equipamento; uma malha entra no grupo
# quando cabe inteira na caixa (com folga). A ordem importa: a primeira que servir vence.
BOXES = [
    ("totem_pagamento", (0.2, 0.8), (0.3, 1.45), (1.0, 1.6)),
    ("armario_mio", (-0.1, 0.78), (-0.05, 2.45), (1.05, 4.65)),
    ("geladeira_mio_1", (1.15, 1.98), (-0.05, 2.15), (-0.12, 0.8)),
    ("geladeira_coca", (1.9, 2.72), (-0.05, 2.25), (-0.12, 0.92)),
    ("divisoria_ripada_2", (2.85, 3.13), (-0.05, 2.65), (-0.12, 0.85)),
    ("freezer_loslos", (3.3, 4.32), (-0.05, 1.35), (1.88, 2.95)),
    ("geladeira_mio_2", (3.3, 4.32), (-0.05, 2.15), (2.85, 3.76)),
    ("geladeira_mio_3", (3.3, 4.32), (-0.05, 2.15), (3.64, 4.5)),
    ("divisoria_ripada_1", (4.2, 4.56), (-0.05, 2.65), (1.8, 4.5)),
]
TOL = 0.06
AREA = ((-0.3, 9.5), (-0.2, 3.6), (-2.6, 5.6))

# orçamento de triângulos por objeto
# só geladeiras (latas/garrafas muito detalhadas); armário, totem e ecobag ficam como no projeto
BUDGET = {
    "geladeira_coca": 60000,
    "geladeira_mio_1": 40000,
    "geladeira_mio_2": 40000,
    "geladeira_mio_3": 40000,
}


def log(*a):
    print(f"[mio {time.strftime('%H:%M:%S')}]", *a, flush=True)


def site_bbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    xs = [p.x for p in pts]
    ys = [p.z for p in pts]  # altura
    zs = [-p.y for p in pts]
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def inside(bb, box):
    return all(bb[i][0] >= box[i][0] - TOL and bb[i][1] <= box[i][1] + TOL for i in range(3))


def classify(o):
    bb = site_bbox(o)
    c = [(a + b) / 2 for a, b in bb]
    size = [b - a for a, b in bb]
    if not all(AREA[i][0] <= c[i] <= AREA[i][1] for i in range(3)) or bb[1][1] < -0.03:
        return None
    # objetos soltos no meio da circulação (figuras/props de referência do SketchUp)
    if 0.8 < c[0] < 3.3 and 0.95 < c[2] < 4.3 and 0.15 < c[1] < 2.4 and max(size) < 1.0:
        return None
    # esferas brancas de referência (marcadores de luz do SketchUp)
    mats = [m.name for m in o.data.materials if m]
    if mats == ["material"] and 0.2 < min(size) and max(size) < 0.4 and c[1] > 0.9:
        return None
    # banco de madeira junto à parede da janela
    if 2.95 < c[0] < 3.7 and -1.7 < c[2] < 0.0 and bb[1][1] < 0.6:
        return "banco"
    for name, *box in BOXES:
        if inside(bb, box):
            return name
    if size[1] < 0.08 and c[1] < 0.06 and size[0] * size[2] > 0.5:
        # canteiros (grama) ficam no jardim
        mats = " ".join(m.name.lower() for m in o.data.materials if m)
        return "jardim" if ("veget" in mats or "grass" in mats or "juniper" in mats or c[0] > 4.45) else "piso"
    if max(size) > 1.8:
        return "paredes"
    if c[0] > 4.45 or (c[0] > 3.12 and c[2] < 0.15 and c[1] < 1.6) or (2.6 < c[0] < 2.92 and c[2] < 0.85):
        return "jardim"
    if 3.1 < c[0] < 4.4 and c[2] < 0.1 and bb[1][1] < 0.6 and max(size[0], size[2]) > 0.6:
        return "banco"
    return "paredes"


# ───────────────────────── 1–3. importar, deslocar, classificar ─────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
log("importando", SRC)
bpy.ops.import_scene.gltf(filepath=SRC)
roots = [o for o in bpy.data.objects if o.parent is None]
for r in roots:
    r.location.x += DX
    r.location.y -= DZ  # site z = -y do Blender
bpy.context.view_layer.update()

groups: dict[str, list] = {}
removed = 0
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    g = classify(o)
    if g is None:
        bpy.data.objects.remove(o, do_unlink=True)
        removed += 1
        continue
    groups.setdefault(g, []).append(o)
log("fora da área:", removed, "| grupos:", {k: len(v) for k, v in groups.items()})

# vegetação de referência (blocos do SketchUp, material "material"): sai do modelo e vira
# plants.json com posição e tamanho; o site desenha plantas leves de folhas recortadas no lugar
plants = []
for o in list(groups.get("jardim", [])):
    names = {m.name.lower() for m in o.data.materials if m}
    if names and names <= {"material"}:
        (x0, x1), (y0, y1), (z0, z1) = site_bbox(o)
        plants.append({"x": round((x0 + x1) / 2, 3), "z": round((z0 + z1) / 2, 3), "y": round(y0, 3),
                       "w": round(max(x1 - x0, z1 - z0), 3), "h": round(y1 - y0, 3)})
        groups["jardim"].remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
json.dump(plants, open(os.path.join(OUT, "plants.json"), "w"))
log("plantas de referência substituídas:", len(plants))


# ───────────────────────── 4. juntar por equipamento + reduzir ─────────────────────────
def join(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = o.data.name = name
    return o


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def decimate_group(name, objs):
    """Reduz só as malhas densas (latas, garrafas, plantas); caixas simples ficam intactas."""
    budget = BUDGET.get(name)
    counts = [(o, tris(o)) for o in objs]
    total = sum(t for _, t in counts)
    if not budget or total <= budget:
        return
    # só peças pequenas e detalhadas (latas, garrafas, pacotes, folhas): carcaças e painéis ficam intactos
    def small(o):
        (x0, x1), (y0, y1), (z0, z1) = site_bbox(o)
        return math.dist((x0, y0, z0), (x1, y1, z1)) < 0.45
    heavy = [(o, t) for o, t in counts if t > 24 and small(o)]
    light = total - sum(t for _, t in heavy)
    ratio = max(0.08, (budget - light) / max(1, sum(t for _, t in heavy)))
    dg = bpy.context.evaluated_depsgraph_get()
    for o, _ in heavy:
        mod = o.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
    dg.update()
    for o, _ in heavy:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        o.modifiers.clear()
        o.data = me


# geladeiras Mio são vinho (o material "METAL PRETO" do SketchUp sai quase preto)
vinho = [(c / 255) ** 2.2 for c in (110, 28, 36)] + [1]
for name in ("geladeira_mio_1", "geladeira_mio_2", "geladeira_mio_3"):
    for o in groups.get(name, []):
        for slot in o.material_slots:
            m = slot.material
            if m and "metal_preto" in m.name.lower() and m.node_tree:
                b = m.node_tree.nodes.get("Principled BSDF")
                if b:
                    b.inputs["Base Color"].default_value = vinho

final = {}
for name, objs in groups.items():
    decimate_group(name, objs)
    o = join(name, objs)
    # origem no centro da base: o contorno de hover do site escala a partir dela
    (x0, x1), (y0, y1), (z0, z1) = site_bbox(o)
    bpy.context.scene.cursor.location = Vector(((x0 + x1) / 2, -(z0 + z1) / 2, y0))
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    final[name] = o
    log(f"{name}: {len(objs)} malhas, {tris(o)} triângulos, {len(o.material_slots)} materiais")

# empties e restos
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.outliner.orphans_purge(do_recursive=True)


def export(glb):
    for o in final.values():
        if o.data.uv_layers.get("UVMap"):
            o.data.uv_layers.active = o.data.uv_layers["UVMap"]
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        export_yup=True,
        export_lights=False,
        export_cameras=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_image_format="AUTO",
    )
    log("exportado", glb, f"{os.path.getsize(glb) / 1e6:.1f} MB")


export(os.path.join(OUT, "mio-terracos-nobake.glb"))
json.dump({k: {"tris": tris(o), "materials": len(o.material_slots)} for k, o in final.items()}, open(os.path.join(OUT, "objects.json"), "w"), indent=1)
