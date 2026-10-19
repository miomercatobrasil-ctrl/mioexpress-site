"""
Mio Express – assa a iluminação (lightmaps) do .glb gerado por mio_build.py.

Uso:
    python scripts/blender/mio_bake.py assets/source/export/build [--samples 64] [--scale 1] [--only armario_mio,paredes]

Entrada:  build/mio-terracos-nobake.glb (objetos já nomeados)
Saída:    build/mio-terracos.glb (com UV2 "lightmap") e build/lightmaps/<objeto>.png

Luzes (como nos renders): sol quente pelo jardim, céu suave, spots/anel no teto, LED sob cada prateleira
do armário e luz interna das geladeiras. Só a iluminação é assada (sem a cor do material): no site ela
entra como lightMap por cima das texturas originais, que continuam nítidas (rótulos, MDF).
A luz é gravada como luz/2 com gama 2.2 (8 bits); o site usa lightMapIntensity = 2.
"""

import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Vector

args = sys.argv[1:]
OUT = args[0]
SAMPLES = int(args[args.index("--samples") + 1]) if "--samples" in args else 64
SCALE = float(args[args.index("--scale") + 1]) if "--scale" in args else 1.0
ONLY = args[args.index("--only") + 1].split(",") if "--only" in args else None
SRC = os.path.join(OUT, "mio-terracos-nobake.glb")
os.makedirs(os.path.join(OUT, "lightmaps"), exist_ok=True)

SIZE = {"armario_mio": 2048, "paredes": 2048, "piso": 1024, "jardim": 1024, "totem_pagamento": 512, "banco": 512}
CEILING = 2.45  # luzes logo abaixo do forro (spots do modelo ficam a ~2,5 m)


def log(*a):
    print(f"[bake {time.strftime('%H:%M:%S')}]", *a, flush=True)


def S(x, y, z):
    """coordenadas do site -> Blender"""
    return Vector((x, -z, y))


def aim(o, direction):
    o.rotation_euler = Vector(direction).normalized().to_track_quat("-Z", "Y").to_euler()


def area(name, loc, size, power, color, direction=(0, 0, -1), shape="RECTANGLE", size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = shape
    d.size = size
    if size_y:
        d.size_y = size_y
    d.energy = power
    d.color = color
    o = bpy.data.objects.new(name, d)
    o.location = loc
    aim(o, direction)
    bpy.context.scene.collection.objects.link(o)


def rig():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("mio")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1.0, 0.95, 0.88, 1)
    bg.inputs["Strength"].default_value = 0.6
    sc.world = w
    sun_d = bpy.data.lights.new("sol", "SUN")
    sun_d.energy = 3.0
    sun_d.color = (1.0, 0.9, 0.76)
    sun_d.angle = math.radians(5)
    sun = bpy.data.objects.new("sol", sun_d)
    aim(sun, (-1.0, 0.25, -0.75))  # Blender: vindo do jardim (+X), de cima
    sc.collection.objects.link(sun)
    warm = (1.0, 0.78, 0.52)
    for i, (x, z) in enumerate([(1.23, 2.21), (3.22, 2.21), (1.6, 0.9), (3.7, 1.0), (1.0, 3.9), (5.4, 1.0)]):
        area(f"spot{i}", S(x, CEILING, z), 0.3, 90, (1.0, 0.86, 0.68), shape="DISK")
    for i, y in enumerate([0.52, 0.80, 1.06, 1.32, 1.57, 1.90]):
        # faixa de 3 m ao longo do armário (eixo Z do site = -Y do Blender)
        area(f"led{i}", S(0.27, y - 0.035, 2.995), 0.03, 45, warm, size_y=3.0)
    for name, x, z, n in [("g1", 1.6, 0.45, (0, -1, 0)), ("coca", 2.3, 0.5, (0, -1, 0)), ("g2", 3.7, 3.3, (-1, 0, 0)), ("g3", 3.7, 4.03, (-1, 0, 0))]:
        area(f"luz_{name}", S(x, 1.1, z), 0.45, 40, (0.95, 0.97, 1.0), direction=n, size_y=1.3)
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.max_bounces = 4
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    sc.render.bake.margin = 4


def lightmap_uv(o):
    me = o.data
    if len(me.uv_layers) == 0:
        me.uv_layers.new(name="UVMap")
    lm = me.uv_layers.get("lightmap") or me.uv_layers.new(name="lightmap")
    me.uv_layers.active = lm
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # o SketchUp exporta cada face solta; soldar vértices junta as faces em ilhas maiores no UV
    bpy.ops.mesh.remove_doubles(threshold=0.001, use_sharp_edge_from_normals=True)
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.002, area_weight=0.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake(o):
    size = int(SIZE.get(o.name, 1024) * SCALE)
    me = o.data
    lm = me.uv_layers["lightmap"]
    # o bake grava no UV ativo; durante o bake ele também é o de render
    me.uv_layers.active = lm
    for layer in me.uv_layers:
        layer.active_render = layer.name == "lightmap"
    img = bpy.data.images.new(f"lm_{o.name}", size, size, float_buffer=True)
    for slot in o.material_slots:
        m = slot.material
        if not m:
            continue
        nt = m.node_tree
        n = nt.nodes.get("BAKE_TARGET") or nt.nodes.new("ShaderNodeTexImage")
        n.name = "BAKE_TARGET"
        n.image = img
        nt.nodes.active = n
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=4)
    px = np.empty(size * size * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = np.clip(px[:, :3] / 2.0, 0, 1) ** (1 / 2.2)
    out = np.concatenate([rgb, np.ones((rgb.shape[0], 1), np.float32)], axis=1).ravel()
    save = bpy.data.images.new(f"lm8_{o.name}", size, size)
    save.pixels.foreach_set(out)
    save.filepath_raw = os.path.join(OUT, "lightmaps", f"{o.name}.png")
    save.file_format = "PNG"
    save.save()
    for layer in me.uv_layers:
        layer.active_render = layer.name == "UVMap"
    me.uv_layers.active = me.uv_layers["UVMap"]
    log(f"{o.name}: {size}px, média {rgb.mean() * 255:.0f}/255, {time.time() - t:.0f}s")


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
objs = [o for o in bpy.data.objects if o.type == "MESH" and o.parent is None]
log("objetos:", [o.name for o in objs])
rig()
for o in objs:
    if ONLY and o.name not in ONLY:
        continue
    lightmap_uv(o)
    bake(o)
for o in list(bpy.data.objects):
    if o.type == "LIGHT":
        bpy.data.objects.remove(o, do_unlink=True)
for m in bpy.data.materials:
    if m.node_tree and m.node_tree.nodes.get("BAKE_TARGET"):
        m.node_tree.nodes.remove(m.node_tree.nodes["BAKE_TARGET"])
if not ONLY:
    glb = os.path.join(OUT, "mio-terracos.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_yup=True, export_lights=False, export_cameras=False, export_texcoords=True, export_normals=True)
    log("exportado", glb, f"{os.path.getsize(glb) / 1e6:.1f} MB")
