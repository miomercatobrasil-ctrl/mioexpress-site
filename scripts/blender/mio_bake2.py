"""
Mio Express – luz assada (lightmaps) sem estragar a geometria.

Uso:
    python scripts/blender/mio_bake2.py assets/source/export/build [--samples 96] [--only armario_mio] [--scale 1]

Entrada:  build/mio-terracos-nobake.glb (gerado por mio_build.py)
Saída:    build/mio-terracos-baked.glb  (geometria limpa + UV2 "lightmap", materiais dupla face)
          build/lightmaps/<objeto>__<variante>.png   variantes: dia, noite, dia_semled, noite_semled
          build/lightmaps.json                       quais variantes cada objeto tem

Por que o bake anterior quebrava: o SketchUp exporta cada face duas vezes (frente e verso, coincidentes).
Ao juntar vértices, o Blender apagava uma delas — às vezes a da frente, com a textura (painel MDF, rótulos,
geladeiras). Aqui, de cada par coincidente fica a face virada para a área da câmera, e os materiais passam a
ser dupla face no site. Resultado: mesma aparência, metade dos triângulos, e UVs de lightmap contínuos.
"""

import json
import math
import os
import sys
import time

import bpy
import bmesh  # noqa: E402 (no bpy como módulo, bmesh só existe depois de importar bpy)
import numpy as np
from mathutils import Vector

args = sys.argv[1:]
OUT = args[0]
SAMPLES = int(args[args.index("--samples") + 1]) if "--samples" in args else 96
VARIANTS = args[args.index("--variants") + 1].split(",") if "--variants" in args else None
REUSE = "--reuse-geometry" in args  # refaz só a luz, sobre o mio-terracos-baked.glb existente (mesmos UVs)
ONLY = args[args.index("--only") + 1].split(",") if "--only" in args else None
SCALE = float(args[args.index("--scale") + 1]) if "--scale" in args else 1.0
CEILING = "--ceiling" in args  # cria o teto (laje) sobre a loja; o SketchUp não tinha teto, aparecia o fundo da cena
SUNSET = "--sunset" in args  # sol baixo de fim de tarde (sombras das ripas no piso) e luminárias acesas também de dia
os.makedirs(os.path.join(OUT, "lightmaps"), exist_ok=True)

SIZE = {"teto": 1024, "armario_mio": 2048, "paredes": 2048, "piso": 1024, "jardim": 1024, "totem_pagamento": 512, "banco": 512}
SMALL_PIECE = 0.05  # m²: peças (faces conectadas) menores que isso usam a luz média
STRIPE = 0.97  # u > STRIPE: faixa da luz média
LED_OBJECTS = {"armario_mio", "totem_pagamento", "piso", "teto"}  # objetos em que o LED do armário faz diferença visível
# centro da área por onde a câmera anda (site: x, y, z)
CAM = Vector((3.2, 1.4, 1.6))


def log(*a):
    print(f"[bake2 {time.strftime('%H:%M:%S')}]", *a, flush=True)


def S(x, y, z):
    """site -> Blender"""
    return Vector((x, -z, y))


CAM_B = S(*CAM)


# ───────────────────────── geometria ─────────────────────────
def clean(o):
    """Remove o verso das faces duplicadas (fica a face virada para a câmera) e junta vértices."""
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    mw = o.matrix_world
    groups = {}
    for f in bm.faces:
        key = tuple(sorted(tuple(round(c, 3) for c in (mw @ v.co)) for v in f.verts))
        groups.setdefault(key, []).append(f)
    dead = []
    for fs in groups.values():
        if len(fs) < 2:
            continue
        def score(f):
            c = mw @ f.calc_center_median()
            n = (mw.to_3x3() @ f.normal).normalized()
            return n.dot((CAM_B - c).normalized())
        fs.sort(key=score, reverse=True)
        dead += fs[1:]
    bmesh.ops.delete(bm, geom=list(set(dead)), context="FACES_ONLY")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.update()
    # normais: sombreamento plano/suave por ângulo (as normais custom do import não valem mais)
    try:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    except Exception as e:  # noqa: BLE001
        log("normais:", e)
    for slot in o.material_slots:
        if slot.material:
            slot.material.use_backface_culling = False
    return len(dead)


def lightmap_uv(o):
    me = o.data
    if len(me.uv_layers) == 0:
        me.uv_layers.new(name="UVMap")
    if "lightmap" not in me.uv_layers:
        me.uv_layers.new(name="lightmap")
    me.uv_layers.active = me.uv_layers["lightmap"]
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # só faces grandes ganham espaço no lightmap; faces pequenas (produtos, latas) apontam para uma
    # faixa "média" no canto (preenchida depois do bake com a luz média da variante)
    bm = bmesh.from_edit_mesh(me)
    mw = o.matrix_world
    k2 = mw.to_scale().x ** 2
    # peças = conjuntos de faces conectadas; peça pequena (produto, lata, garrafa) usa a luz média
    seen = set()
    small = []
    for f0 in bm.faces:
        if f0.index in seen:
            continue
        stack, island, area = [f0], [], 0.0
        seen.add(f0.index)
        while stack:
            f = stack.pop()
            island.append(f)
            area += f.calc_area() * k2
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        if area < SMALL_PIECE:
            small += island
    for f in bm.faces:
        f.select = True
    smallset_sel = set(small)
    for f in small:
        f.select = False
    bmesh.update_edit_mesh(me)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003, area_weight=0.0, scale_to_bounds=True)
    bm = bmesh.from_edit_mesh(me)
    uv = bm.loops.layers.uv["lightmap"]
    smallset = smallset_sel
    for f in bm.faces:
        for loop in f.loops:
            if f in smallset:
                loop[uv].uv = (STRIPE + (1 - STRIPE) / 2, 0.5)
            else:
                loop[uv].uv = (loop[uv].uv.x * (STRIPE - 0.01), loop[uv].uv.y)
    bmesh.update_edit_mesh(me)
    bpy.ops.object.mode_set(mode="OBJECT")
    me.uv_layers.active = me.uv_layers["UVMap"]
    return len(small)


# ───────────────────────── luzes ─────────────────────────
LIGHTS = {"dia": [], "noite": [], "led": [], "sempre": []}


def aim(o, d):
    o.rotation_euler = Vector(d).normalized().to_track_quat("-Z", "Y").to_euler()


def area(group, name, loc, size, power, color, direction=(0, 0, -1), shape="RECTANGLE", size_y=None):
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
    LIGHTS[group].append(o)


def rig():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("mio")
    w.use_nodes = True
    sc.world = w
    sun_d = bpy.data.lights.new("sol", "SUN")
    # sol suave (disco grande = sombra com degradê, sem recorte duro na parede da janela)
    sun_d.energy = 2.4
    sun_d.color = (1.0, 0.9, 0.76)
    sun_d.angle = math.radians(24)
    sun = bpy.data.objects.new("sol", sun_d)
    aim(sun, (-1.0, 0.3, -0.7))
    if SUNSET:
        # fim de tarde: sol baixo (~22°), dourado e com disco menor (faixas de sombra das ripas definidas)
        sun_d.energy = 3.6
        sun_d.color = (1.0, 0.7, 0.42)
        sun_d.angle = math.radians(7)
        aim(sun, (-1.0, 0.42, -0.45))
    sc.collection.objects.link(sun)
    LIGHTS["dia"].append(sun)
    warm = (1.0, 0.8, 0.56)
    # anéis/plafons do teto (posições do modelo) e spots da circulação
    for i, (x, z) in enumerate([(1.23, 2.21), (3.22, 2.21)]):
        area("noite", f"anel{i}", S(x, 2.44, z), 0.32, 55, (1.0, 0.78, 0.55), shape="DISK")
    for i, (x, z) in enumerate([(1.6, 0.9), (3.7, 1.0), (1.0, 3.9), (5.4, 1.0)]):
        area("noite", f"spot{i}", S(x, 2.46, z), 0.12, 28, (1.0, 0.8, 0.6), shape="DISK")
    # fitas de LED sob as prateleiras (faixa de 1 m por módulo, voltada para baixo)
    for zc in (2.025, 3.05, 4.07):
        for y in (0.53, 1.34, 1.61, 1.97):
            area("led", f"led_{zc}_{y}", S(0.30, y - 0.012, zc), 0.025, 22, warm, size_y=0.98)
    # luz interna das geladeiras (sempre acesa)
    for name, x, z, n in [("g1", 1.6, 0.42, (0, -1, 0)), ("coca", 2.3, 0.5, (0, -1, 0)), ("g2", 3.72, 3.3, (-1, 0, 0)), ("g3", 3.72, 4.03, (-1, 0, 0))]:
        area("sempre", f"gel_{name}", S(x, 1.1, z), 0.45, 30, (0.95, 0.97, 1.0), direction=n, size_y=1.3)
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.max_bounces = 4
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    sc.render.bake.margin = 6


def set_variant(night: bool, led: bool):
    bg = bpy.context.scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = ((1.0, 0.82, 0.62, 1) if SUNSET else (1.0, 0.95, 0.88, 1)) if not night else (0.25, 0.3, 0.45, 1)
    bg.inputs["Strength"].default_value = 1.1 if not night else 0.015
    for o in LIGHTS["dia"]:
        o.hide_render = night
    for o in LIGHTS["noite"]:
        # fim de tarde: luminárias do teto já acesas (mais fracas que à noite), como na loja de verdade
        base = o.get("base_energy") or o.data.energy
        o["base_energy"] = base
        o.data.energy = base if night else base * 0.45
        o.hide_render = not night and not SUNSET
    for o in LIGHTS["led"]:
        o.hide_render = not led


# ───────────────────────── bake ─────────────────────────
GAIN = {}


def bake(o, variant):
    size = int(SIZE.get(o.name, 1024) * SCALE)
    me = o.data
    me.uv_layers.active = me.uv_layers["lightmap"]
    img = bpy.data.images.new(f"lm_{o.name}_{variant}", size, size, float_buffer=True)
    for slot in o.material_slots:
        m = slot.material
        if not m or not m.node_tree:
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
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=6)
    px = np.empty(size * size * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    rgb = px.reshape(-1, 4)[:, :3]
    # ganho único (calibrado no dia): mantém a proporção entre dia e noite
    if "g" not in GAIN:
        lit = rgb[rgb.max(axis=1) > 1e-4]
        GAIN["g"] = float(0.8 / max(1e-4, np.percentile(lit.max(axis=1), 92))) if len(lit) else 1.0
        log("ganho", GAIN["g"])
    # faixa da luz média: média das superfícies iluminadas (mais clara que a média geral, como um produto na prateleira)
    img2 = rgb.reshape(size, size, 3)
    cut = int(size * STRIPE)
    body = img2[:, :cut].reshape(-1, 3)
    lit_px = body[body.max(axis=1) > 1e-4]
    avg = np.percentile(lit_px, 70, axis=0) if len(lit_px) else np.zeros(3)
    img2[:, cut:] = avg
    rgb = img2.reshape(-1, 3)
    enc = np.clip(rgb * GAIN["g"], 0, 1) ** (1 / 2.2)
    out = np.concatenate([enc, np.ones((enc.shape[0], 1), np.float32)], axis=1).ravel()
    save = bpy.data.images.new(f"lm8_{o.name}_{variant}", size, size)
    save.pixels.foreach_set(out)
    save.filepath_raw = os.path.join(OUT, "lightmaps", f"{o.name}__{variant}.png")
    save.file_format = "PNG"
    save.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(save)
    me.uv_layers.active = me.uv_layers["UVMap"]
    log(f"{o.name} [{variant}] {size}px média {enc.mean() * 255:.0f}/255 em {time.time() - t:.0f}s")


# ───────────────────────── execução ─────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, "mio-terracos-baked.glb" if REUSE else "mio-terracos-nobake.glb"))
objs = [o for o in bpy.data.objects if o.type == "MESH" and o.parent is None]
for o in ([] if REUSE else objs):
    before = len(o.data.polygons)
    removed = clean(o)
    nsmall = lightmap_uv(o)
    log(f"{o.name}: {before} -> {len(o.data.polygons)} faces ({removed} versos removidos, {nsmall} pequenas com luz média)")

glb = os.path.join(OUT, "mio-terracos-baked.glb")
if REUSE:
    for o in objs:
        for slot in o.material_slots:
            if slot.material:
                slot.material.use_backface_culling = False
        if "lightmap" not in o.data.uv_layers:
            # o exportador grava o UV2 como TEXCOORD_1 sem nome; no reimport ele vira o 2º layer
            o.data.uv_layers[1].name = "lightmap"
        o.data.uv_layers[0].name = "UVMap"
        o.data.uv_layers.active = o.data.uv_layers[0]
def add_ceiling():
    """Laje lisa sobre a loja (site: x −0,25…4,58; z −0,2…6,6; y 2,505), com UV de lightmap próprio."""
    x0, x1, z0, z1, y = -0.25, 4.58, -0.2, 6.6, 2.505
    me = bpy.data.meshes.new("teto")
    verts = [S(x0, y, z0), S(x1, y, z0), S(x1, y, z1), S(x0, y, z1)]
    me.from_pydata([tuple(v) for v in verts], [], [(0, 1, 2, 3)])  # normal para baixo (para dentro da loja)
    me.update()
    o = bpy.data.objects.new("teto", me)
    bpy.context.scene.collection.objects.link(o)
    # subdivide para a luz (bake por pixel não precisa, mas ajuda a normal/sombra ficar estável)
    bpy.context.view_layer.objects.active = o
    uv = me.uv_layers.new(name="UVMap")
    lm = me.uv_layers.new(name="lightmap")
    for loop in me.loops:
        co = verts[loop.vertex_index]
        u = (co.x - x0) / (x1 - x0)
        v = (-co.y - z0) / (z1 - z0)
        uv.data[loop.index].uv = (u, v)
        lm.data[loop.index].uv = (0.01 + u * (STRIPE - 0.02), 0.01 + v * 0.98)
    mat = bpy.data.materials.new("teto_gelo")
    mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (0.83, 0.79, 0.74, 1)
    b.inputs["Roughness"].default_value = 0.9
    me.materials.append(mat)
    return o


if CEILING and not any(o.name == "teto" for o in objs):
    objs.append(add_ceiling())
    log("teto criado")
if not REUSE or CEILING:
  bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_yup=True, export_lights=False, export_cameras=False, export_texcoords=True, export_normals=True)
log("geometria exportada", glb, f"{os.path.getsize(glb) / 1e6:.1f} MB")

rig()
manifest = {}
# a ordem importa: o primeiro bake ("dia", paredes) calibra o ganho
order = sorted(objs, key=lambda o: 0 if o.name == "paredes" else 1)
if VARIANTS and os.path.exists(os.path.join(OUT, "lightmaps.json")):
    prev = json.load(open(os.path.join(OUT, "lightmaps.json")))
    GAIN["g"] = prev["gain"]
    manifest = prev["objects"]
for variant, night, led in [("dia", False, True), ("noite", True, True), ("dia_semled", False, False), ("noite_semled", True, False)]:
    if VARIANTS and variant not in VARIANTS:
        continue
    set_variant(night, led)
    for o in order:
        if ONLY and o.name not in ONLY and o.name != "paredes":
            continue
        if "semled" in variant and o.name not in LED_OBJECTS:
            continue
        bake(o, variant)
        if variant not in manifest.setdefault(o.name, []):
            manifest[o.name].append(variant)
json.dump({"gain": GAIN.get("g", 1.0), "objects": manifest}, open(os.path.join(OUT, "lightmaps.json"), "w"), indent=1)
log("pronto")
