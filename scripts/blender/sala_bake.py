"""
Loja projetada (proposta exclusiva): modelo da arquiteta (SketchUp → .dae → .glb recortado) → luz assada.

Uso:
    python scripts/blender/sala_bake.py <pasta> [--samples 64] [--scale 1] [--prep-only]

Entrada:  <pasta>/loja-raw.glb        (recorte da loja exportado pelo three.js a partir do .dae)
          <pasta>/skp-materials.json  (materiais do .skp, com os parâmetros do Enscape)
          <pasta>/sala.json           (grupos, peças a remover e deslocamento; fica fora do repositório)
Saída:    <pasta>/build/sala.glb      (geometria limpa, materiais PBR, UV2 "lightmap")
          <pasta>/build/lightmaps/<objeto>.png

Coordenadas: o .glb está em metros, Y para cima (three). O deslocamento de sala.json leva o canto da loja para a origem.
"""

import json
import math
import os
import re
import sys
import time

import bpy
import bmesh  # noqa: E402
import numpy as np
from mathutils import Vector

args = sys.argv[1:]
DIR = args[0]
SAMPLES = int(args[args.index("--samples") + 1]) if "--samples" in args else 64
SCALE = float(args[args.index("--scale") + 1]) if "--scale" in args else 1.0
PREP_ONLY = "--prep-only" in args
CFG = json.load(open(os.path.join(DIR, "sala.json")))
SKP = json.load(open(os.path.join(DIR, "skp-materials.json")))
OUT = os.path.join(DIR, "build")
os.makedirs(os.path.join(OUT, "lightmaps"), exist_ok=True)

OFF = CFG["offset"]  # three: x += OFF[0], z += OFF[1]
SMALL_PIECE = 0.05  # m²: peças menores usam a luz média do objeto
STRIPE = 0.97


def log(*a):
    print(f"[sala {time.strftime('%H:%M:%S')}]", *a, flush=True)


def S(x, y, z):
    """three (já deslocado) -> Blender"""
    return Vector((x, -z, y))


CAM_B = S(*CFG["cam"])


# ───────────────────────── importação e grupos ─────────────────────────
def descendants(o):
    out = [o]
    for c in o.children:
        out += descendants(c)
    return out


def mesh_desc(o):
    return [m for m in descendants(o) if m.type == "MESH"]


def diag(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))) - Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))).length


def join(name, objs):
    objs = [o for o in objs if o.type == "MESH"]
    if not objs:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    return o


def decimate(o, target):
    n = len(o.data.polygons)
    if n <= target:
        return
    if o.data.users > 1:
        o.data = o.data.copy()
    m = o.modifiers.new("dec", "DECIMATE")
    m.ratio = max(0.05, target / n)
    bpy.context.view_layer.objects.active = o
    with bpy.context.temp_override(object=o, active_object=o):
        bpy.ops.object.modifier_apply(modifier=m.name)


def crop_structure(o, box):
    """Corta paredes/pisos que se estendem pelo prédio todo: fica só o entorno da loja."""
    x0, x1, z0, z1 = box
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for co, no in [((x0, 0, 0), (1, 0, 0)), ((x1, 0, 0), (1, 0, 0)), ((0, -z0, 0), (0, 1, 0)), ((0, -z1, 0), (0, 1, 0))]:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if not (x0 <= c.x <= x1 and z0 <= -c.y <= z1):
            dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context="FACES")
    bm.to_mesh(o.data)
    bm.free()


def clean(o):
    """Remove o verso das faces duplicadas do SketchUp (fica a face virada para a câmera) e junta vértices."""
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    groups = {}
    for f in bm.faces:
        key = tuple(sorted(tuple(round(c, 3) for c in v.co) for v in f.verts))
        groups.setdefault(key, []).append(f)
    dead = []
    for fs in groups.values():
        if len(fs) < 2:
            continue
        fs.sort(key=lambda f: f.normal.dot((CAM_B - f.calc_center_median()).normalized()), reverse=True)
        dead += fs[1:]
    bmesh.ops.delete(bm, geom=list(set(dead)), context="FACES_ONLY")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(me)
    bm.free()
    me.update()
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception:  # noqa: BLE001
        pass
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    except Exception as e:  # noqa: BLE001
        log("normais:", e)
    return len(dead)


# ───────────────────────── materiais ─────────────────────────
def key(x):
    return re.sub(r"_+", "_", re.sub(r"\W", "_", x)).strip("_").lower()


SKP_BY_KEY = {}
for n, v in SKP.items():
    SKP_BY_KEY.setdefault(key(n), v)


def skp_for(name):
    k = key(name)
    return SKP_BY_KEY.get(k) or SKP_BY_KEY.get(re.sub(r"_\d+$", "", k))


def hexrgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def bsdf(m):
    return next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.node_tree else None


EMISSIVE = []  # (material, cor, intensidade relativa)


def tune_material(m):
    b = bsdf(m)
    if not b:
        return
    name = m.name.lower()
    sk = skp_for(m.name)
    en = (sk or {}).get("enscape", {})
    rough, metal = 0.6, 0.0
    if any(w in name for w in ("metal", "aluminum", "alumin", "cromado", "inox", "aço", "steel", "gold")):
        rough, metal = 0.35, 0.85
    if "preto" in name and "metal" in name:
        rough, metal = 0.45, 0.6
    if any(w in name for w in ("wood_floor", "floor", "piso")):
        rough = 0.42
    if "tile" in name or "ceramic" in name:
        rough = 0.35
    if "acrylic" in name:
        rough = 0.08
    if en.get("Roughness"):
        rough = float(en["Roughness"]) if en.get("Type") != "SELF_ILLUMINATED" else rough
    if en.get("Metallic"):
        metal = max(metal, float(en["Metallic"]))
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    glass = any(w in name for w in ("vidro", "glass", "transparente")) or (m.blend_method == "BLEND" and b.inputs["Alpha"].default_value < 0.5)
    if glass:
        b.inputs["Roughness"].default_value = 0.03
        b.inputs["Metallic"].default_value = 0.0
        m["mio_glass"] = 1
    if en.get("Type") == "SELF_ILLUMINATED":
        col = hexrgb(en.get("EmissiveColor", "#FFFFFF"))
        warm = [1.0, 0.86, 0.68]
        col = [c * w for c, w in zip(col, warm)]
        b.inputs["Emission Color"].default_value = (*col, 1)
        b.inputs["Emission Strength"].default_value = CFG["emission"]
        m["mio_emissive"] = 1
        EMISSIVE.append(m.name)


def dedupe_materials(objs):
    """Materiais repetidos (mesma imagem ou mesma cor) viram um só."""
    seen = {}
    for o in objs:
        for slot in o.material_slots:
            m = slot.material
            if not m:
                continue
            b = bsdf(m)
            img = next((n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None) if m.node_tree else None
            col = tuple(round(v, 3) for v in b.inputs["Base Color"].default_value) if b else None
            k = (img, None if img else col, m.blend_method, round(b.inputs["Alpha"].default_value, 2) if b else 1)
            if k in seen and seen[k] is not m:
                slot.material = seen[k]
            else:
                seen.setdefault(k, m)


# ───────────────────────── UV do lightmap ─────────────────────────
def lightmap_uv(o):
    me = o.data
    if len(me.uv_layers) == 0:
        me.uv_layers.new(name="UVMap")
    me.uv_layers[0].name = "UVMap"
    if "lightmap" not in me.uv_layers:
        me.uv_layers.new(name="lightmap")
    me.uv_layers.active = me.uv_layers["lightmap"]
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(me)
    seen, small = set(), []
    for f0 in bm.faces:
        if f0.index in seen:
            continue
        stack, island, area = [f0], [], 0.0
        seen.add(f0.index)
        while stack:
            f = stack.pop()
            island.append(f)
            area += f.calc_area()
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        if area < SMALL_PIECE:
            small += island
    smallset = set(small)
    for f in bm.faces:
        f.select = f not in smallset
    bmesh.update_edit_mesh(me)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.003, area_weight=0.0, scale_to_bounds=True)
    bm = bmesh.from_edit_mesh(me)
    uv = bm.loops.layers.uv["lightmap"]
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
def aim(o, d):
    o.rotation_euler = Vector(d).normalized().to_track_quat("-Z", "Y").to_euler()


def area(name, loc, size, power, color, direction=(0, 0, -1), shape="DISK", size_y=None):
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
    return o


def rig():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("mio")
    w.use_nodes = True
    sc.world = w
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*CFG["sky_color"], 1)
    bg.inputs["Strength"].default_value = CFG["sky"]
    sun_d = bpy.data.lights.new("sol", "SUN")
    sun_d.energy = CFG["sun"]
    sun_d.color = (1.0, 0.86, 0.68)
    sun_d.angle = math.radians(CFG.get("sun_angle", 4))
    sun = bpy.data.objects.new("sol", sun_d)
    d = CFG["sun_dir"]  # direção dos raios em coordenadas three
    aim(sun, (d[0], -d[2], d[1]))
    sc.collection.objects.link(sun)
    for i, (x, y, z) in enumerate(CFG["plafons"]):
        area(f"plafon{i}", S(x, y, z), 0.3, CFG["plafon_w"], (1.0, 0.8, 0.58))
    for i, l in enumerate(CFG.get("extra_lights", [])):
        area(f"extra{i}", S(*l["pos"]), l["size"], l["w"], tuple(l.get("color", (1.0, 0.85, 0.65))), direction=(l["dir"][0], -l["dir"][2], l["dir"][1]), shape="RECTANGLE", size_y=l.get("size_y"))
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.max_bounces = 5
    sc.cycles.use_denoising = True
    sc.render.bake.margin = 6


# ───────────────────────── bake ─────────────────────────
GAIN = {}


def bake(o):
    size = int(CFG["sizes"].get(o.name, 1024) * SCALE)
    me = o.data
    me.uv_layers.active = me.uv_layers["lightmap"]
    img = bpy.data.images.new(f"lm_{o.name}", size, size, float_buffer=True)
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
    if "g" not in GAIN:
        lit = rgb[rgb.max(axis=1) > 1e-4]
        GAIN["g"] = float(CFG["target"] / max(1e-4, np.percentile(lit.max(axis=1), 92))) if len(lit) else 1.0
        log("ganho", GAIN["g"])
    img2 = rgb.reshape(size, size, 3)
    cut = int(size * STRIPE)
    body = img2[:, :cut].reshape(-1, 3)
    lit_px = body[body.max(axis=1) > 1e-4]
    img2[:, cut:] = np.percentile(lit_px, 70, axis=0) if len(lit_px) else np.zeros(3)
    enc = np.clip(img2.reshape(-1, 3) * GAIN["g"], 0, 1) ** (1 / 2.2)
    out = np.concatenate([enc, np.ones((enc.shape[0], 1), np.float32)], axis=1).ravel()
    save = bpy.data.images.new(f"lm8_{o.name}", size, size)
    save.pixels.foreach_set(out)
    save.filepath_raw = os.path.join(OUT, "lightmaps", f"{o.name}.png")
    save.file_format = "PNG"
    save.save()
    for slot in o.material_slots:
        if slot.material and slot.material.node_tree:
            n = slot.material.node_tree.nodes.get("BAKE_TARGET")
            if n:
                slot.material.node_tree.nodes.remove(n)
    bpy.data.images.remove(img)
    bpy.data.images.remove(save)
    me.uv_layers.active = me.uv_layers["UVMap"]
    log(f"{o.name} {size}px média {enc.mean() * 255:.0f}/255 em {time.time() - t:.0f}s")


# ───────────────────────── execução ─────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(DIR, "loja-raw.glb"))
log("importado", len(bpy.data.objects))

for n in CFG["remove"]:
    o = bpy.data.objects.get(n)
    if o:
        for d in descendants(o):
            bpy.data.objects.remove(d, do_unlink=True)
# materiais que não aparecem (costuras da sacola, pessoas)
drop = [m for m in bpy.data.materials if any(re.search(p, m.name) for p in CFG["drop_materials"])]
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    if o.material_slots and all(s.material in drop for s in o.material_slots):
        bpy.data.objects.remove(o, do_unlink=True)

# simplifica peças pesadas (latas, sacolas) antes de juntar
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    n = len(o.data.polygons)
    if n > 200:
        d = diag(o)
        decimate(o, 160 if d < 0.35 else 1500 if d < 1.2 else 20000)

top = bpy.data.objects
group_of = {}
for g, names in CFG["groups"].items():
    for n in names:
        group_of[n] = g
buckets = {}
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    p, g = o, None
    while p is not None and g is None:
        g = group_of.get(p.name)
        p = p.parent
    buckets.setdefault(g or "outros", []).append(o)
objs = []
for g, ms in buckets.items():
    o = join(g, ms)
    if o:
        objs.append(o)
for o in [o for o in bpy.data.objects if o.type != "MESH"]:
    bpy.data.objects.remove(o, do_unlink=True)

# desloca para a origem da loja
for o in objs:
    o.data.transform(__import__("mathutils").Matrix.Translation(Vector((OFF[0], -OFF[1], 0))))
    o.data.update()

est = next((o for o in objs if o.name == "estrutura"), None)
if est:
    crop_structure(est, CFG["structure_box"])

for o in objs:
    before = len(o.data.polygons)
    removed = clean(o)
    log(f"{o.name}: {before} -> {len(o.data.polygons)} faces ({removed} versos removidos)")

dedupe_materials(objs)
for m in {s.material for o in objs for s in o.material_slots if s.material}:
    tune_material(m)
    m.use_backface_culling = False
log("emissivos:", EMISSIVE)

for o in objs:
    nsmall = lightmap_uv(o)
    log(f"{o.name}: UV de lightmap ({nsmall} faces pequenas com luz média)")

glb = os.path.join(OUT, "sala.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_yup=True, export_lights=False, export_cameras=False,
                          export_texcoords=True, export_normals=True, export_extras=True)
log("geometria exportada", glb, f"{os.path.getsize(glb) / 1e6:.1f} MB", sum(len(o.data.polygons) for o in objs), "faces")
if PREP_ONLY:
    sys.exit(0)

rig()
order = sorted(objs, key=lambda o: 0 if o.name == "paredes" or o.name == "estrutura" else 1)
for o in order:
    bake(o)
json.dump({"gain": GAIN.get("g", 1.0), "objects": [o.name for o in objs]}, open(os.path.join(OUT, "lightmaps.json"), "w"), indent=1)
log("pronto")
