"""
Mio Express – Terraços: .glb bruto (convertido do .dae do SketchUp) -> .glb do site + lightmaps.

Uso (Blender 5.x como módulo Python, `pip install bpy`):
    python scripts/blender/mio_build.py assets/source/export/terracos-raw.glb assets/source/export/build [--bake] [--samples 96]

Etapas:
  1. importa e desloca para as coordenadas do site (origem no canto armário/geladeiras; ver src/scene/layout.ts)
  2. apaga o que está fora da área da loja
  3. classifica cada malha pelo volume que ocupa (caixas da planta) e junta por equipamento,
     com os nomes usados no site (armario_mio, totem_pagamento, geladeira_mio_1…)
  4. vegetação de referência (blocos brancos do SketchUp) vira verde
  5. reduz polígonos (cada equipamento tem um orçamento de triângulos)
  6. --bake: cria UV2 "lightmap" e assa a iluminação (sol pelo jardim, spots, LED das prateleiras,
     luz interna das geladeiras) com o Cycles -> build/lightmaps/<objeto>.png
  7. exporta build/mio-terracos.glb (sem compressão; a compressão é feita depois com gltf-transform)
"""

import json
import math
import os
import random
import sys
import time

import bpy
import numpy as np
from mathutils import Vector

args = [a for a in sys.argv[1:]]
SRC, OUT = args[0], args[1]
BAKE = "--bake" in args
SAMPLES = int(args[args.index("--samples") + 1]) if "--samples" in args else 96
ONLY = args[args.index("--only") + 1].split(",") if "--only" in args else None
os.makedirs(os.path.join(OUT, "lightmaps"), exist_ok=True)

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
BUDGET = {
    "armario_mio": 90000,
    "geladeira_coca": 40000,
    "geladeira_mio_1": 26000,
    "geladeira_mio_2": 26000,
    "geladeira_mio_3": 26000,
    "freezer_loslos": 16000,
    "totem_pagamento": 10000,
    "jardim": 30000,
    "paredes": 30000,
}
LIGHTMAP_SIZE = {"armario_mio": 2048, "paredes": 2048, "piso": 2048, "jardim": 1024, "totem_pagamento": 512, "banco": 512}


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

# vegetação de referência: o material branco "material" no jardim vira tons de verde
greens = ["#4f7d36", "#5f8f3e", "#6c9b3c", "#3f6e33", "#7fae46"]
veg_mats = []
for hexc in greens:
    m = bpy.data.materials.new("vegetacao_" + hexc[1:])
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    rgb = [int(hexc[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    bsdf.inputs["Base Color"].default_value = [c ** 2.2 for c in rgb] + [1]
    bsdf.inputs["Roughness"].default_value = 0.9
    veg_mats.append(m)
random.seed(3)
for o in groups.get("jardim", []):
    for slot in o.material_slots:
        if slot.material and slot.material.name.lower() in ("material", "material_90"):
            slot.material = random.choice(veg_mats)


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
    heavy = [(o, t) for o, t in counts if t > 24]  # caixa simples = 12 triângulos
    light = total - sum(t for _, t in heavy)
    ratio = max(0.04, (budget - light) / max(1, sum(t for _, t in heavy)))
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


final = {}
for name, objs in groups.items():
    decimate_group(name, objs)
    o = join(name, objs)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0003)
    bpy.ops.object.mode_set(mode="OBJECT")
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


# ───────────────────────── 5. bake de iluminação ─────────────────────────
def S(x, y, z):
    """site -> Blender"""
    return Vector((x, -z, y))


def add_area(name, loc, size, power, color, rot=(0, 0, 0), shape="RECTANGLE", size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = shape
    d.size = size
    if size_y:
        d.size_y = size_y
    d.energy = power
    d.color = color
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return o


def light_rig():
    sc = bpy.context.scene
    world = bpy.data.worlds.new("mio_world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1.0, 0.95, 0.88, 1)
    bg.inputs["Strength"].default_value = 0.5
    sc.world = world
    # sol entrando pelo jardim (+X), quente
    sun_d = bpy.data.lights.new("sol", "SUN")
    sun_d.energy = 3.2
    sun_d.color = (1.0, 0.9, 0.76)
    sun_d.angle = math.radians(6)
    sun = bpy.data.objects.new("sol", sun_d)
    direction = Vector((-1.0, 0.25, -0.75)).normalized()
    sun.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(sun)
    warm = (1.0, 0.78, 0.52)
    # spots e anel de LED no teto (voltados para baixo)
    for i, (x, z) in enumerate([(1.6, 2.6), (1.6, 1.0), (3.6, 1.05), (5.4, 1.0), (0.9, 3.8)]):
        add_area(f"spot{i}", S(x, 2.66, z), 0.25, 70, (1.0, 0.86, 0.68), shape="DISK")
    # LED sob cada prateleira do armário (faixa de 3 m, voltada para baixo)
    for i, y in enumerate([0.52, 0.80, 1.06, 1.32, 1.57, 1.90]):
        add_area(f"led{i}", S(0.27, y - 0.035, 2.995), 3.0, 55, warm, size_y=0.02, rot=(0, 0, math.radians(90)))
    # luz interna das geladeiras (faixa vertical atrás do vidro, voltada para fora)
    fridges = {
        "geladeira_mio_1": ((1.6, 0.5), (0, 0, 1)),
        "geladeira_coca": ((2.3, 0.55), (0, 0, 1)),
        "geladeira_mio_2": ((3.65, 3.3), (-1, 0, 0)),
        "geladeira_mio_3": ((3.65, 4.03), (-1, 0, 0)),
    }
    for name, ((x, z), n) in fridges.items():
        normal = Vector((n[0], -n[2], n[1]))  # site -> Blender
        o = add_area(f"luz_{name}", S(x, 1.15, z), 0.5, 45, (0.95, 0.97, 1.0), size_y=1.4)
        o.rotation_euler = normal.to_track_quat("-Z", "Y").to_euler()
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = False
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    sc.render.bake.margin = 6
    sc.render.bake.margin_type = "EXTEND"


def lightmap_uv(o):
    if "lightmap" not in o.data.uv_layers:
        if len(o.data.uv_layers) == 0:
            o.data.uv_layers.new(name="UVMap")
        o.data.uv_layers.new(name="lightmap")
    o.data.uv_layers.active = o.data.uv_layers["lightmap"]
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    # o UV original continua sendo o primeiro (TEXCOORD_0) e o de render
    o.data.uv_layers.active = o.data.uv_layers["lightmap"]
    for layer in o.data.uv_layers:
        layer.active_render = layer.name == "UVMap"


def bake(o):
    size = LIGHTMAP_SIZE.get(o.name, 1024)
    img = bpy.data.images.new(f"lm_{o.name}", size, size, float_buffer=True)
    for slot in o.material_slots:
        m = slot.material
        if not m:
            continue
        m.use_nodes = True
        nt = m.node_tree
        n = nt.nodes.get("BAKE_TARGET") or nt.nodes.new("ShaderNodeTexImage")
        n.name = "BAKE_TARGET"
        n.image = img
        nt.nodes.active = n
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=6)
    # luz em HDR -> 8 bits: guarda luz/2 (o site usa lightMapIntensity = 2)
    px = np.empty(size * size * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = np.clip(px[:, :3] / 2.0, 0, 1) ** (1 / 2.2)  # gama para não perder as sombras em 8 bits
    out = np.concatenate([rgb, np.ones((rgb.shape[0], 1), np.float32)], axis=1).ravel()
    save = bpy.data.images.new(f"lm8_{o.name}", size, size)
    save.pixels.foreach_set(out)
    save.filepath_raw = os.path.join(OUT, "lightmaps", f"{o.name}.png")
    save.file_format = "PNG"
    save.save()
    log(f"bake {o.name} {size}px em {time.time() - t:.0f}s")


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


# versão sem bake para conferir a geometria enquanto o bake roda
export(os.path.join(OUT, "mio-terracos-nobake.glb"))

if BAKE:
    light_rig()
    for name, o in final.items():
        lightmap_uv(o)
    for name, o in final.items():
        if ONLY and name not in ONLY:
            continue
        bake(o)
    for o in list(bpy.data.objects):
        if o.type == "LIGHT":
            bpy.data.objects.remove(o, do_unlink=True)
    for m in bpy.data.materials:
        if m.node_tree and m.node_tree.nodes.get("BAKE_TARGET"):
            m.node_tree.nodes.remove(m.node_tree.nodes["BAKE_TARGET"])

# ───────────────────────── 6. exportar ─────────────────────────
export(os.path.join(OUT, "mio-terracos.glb"))
json.dump({k: {"tris": tris(o), "materials": len(o.material_slots)} for k, o in final.items()}, open(os.path.join(OUT, "objects.json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "mio-terracos.blend"))
