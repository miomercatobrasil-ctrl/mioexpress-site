"""
Mio Express – preparação da cena exportada do SketchUp para o site.

Uso (Blender 4.x, cena importada do .dae/.fbx/.glb do SketchUp já aberta):
    blender mio_raw.blend --python scripts/blender/mio_prepare.py -- --step all
ou rode por etapas:  --step clean | name | veg | uv | bake | export

O que faz:
  clean  – apaga objetos ocultos, vazios sem filhos e geometria fora da área da cena
  name   – agrupa/junta as malhas de cada equipamento e dá o nome usado no site
  veg    – troca a vegetação pesada por "cards" cruzados com textura alpha
  uv     – cria o UV2 "lightmap" para o bake
  bake   – assa luz + AO (Cycles) numa textura por objeto
  export – exporta assets/source/export/mio-terracos-raw.glb (compressão é feita depois com gltf-transform)

ATENÇÃO: os padrões de nome em MAP dependem de como os grupos/componentes foram nomeados no SketchUp.
Antes de rodar, confira os nomes no Outliner e ajuste MAP. Script não testado contra o arquivo real.
"""

import re
import sys
import bpy
import bmesh
from mathutils import Vector

# ───────────────────────── configuração ─────────────────────────

# nome final no site -> regex (case-insensitive) dos objetos/coleções vindos do SketchUp
MAP = {
    "armario_mio": r"arm[aá]rio|movel|m[oó]vel|prateleira|produto",
    "totem_pagamento": r"totem|pos|leitor|sacola|ecobag",
    "geladeira_mio_1": r"geladeira.*1|refrigerador.*1",
    "geladeira_mio_2": r"geladeira.*2|refrigerador.*2",
    "geladeira_mio_3": r"geladeira.*3|refrigerador.*3",
    "geladeira_coca": r"coca|visa",
    "freezer_loslos": r"freezer|loslos|sorvete",
    "divisoria_ripada_1": r"divis[oó]ria.*1|ripad.*1",
    "divisoria_ripada_2": r"divis[oó]ria.*2|ripad.*2|placa",
    "banco": r"banco",
    "jardim": r"grama|jardim|canteiro|meio.?fio",
    "piso": r"piso|ch[aã]o|floor",
    "paredes": r"parede|teto|porta|janela|wall|ceiling|spot|luminaria",
}
VEGETATION = r"planta|vegeta|arbust|bambu|palmeira|folha|tree|plant|grass_tuft"
# área útil (metros, eixos do Blender: X, Y no chão, Z para cima). Fora disso é apagado.
BOUNDS_MIN = Vector((-2.0, -3.0, -0.5))
BOUNDS_MAX = Vector((12.0, 8.0, 3.5))
# fração de polígonos mantida por objeto (Decimate "collapse"); arquitetura usa "planar"
DECIMATE = {"armario_mio": 0.6, "geladeira_coca": 0.5, "freezer_loslos": 0.5, "totem_pagamento": 0.5}
BAKE_SIZE = {"armario_mio": 2048, "piso": 2048, "paredes": 2048}
BAKE_DEFAULT = 1024
VEG_TEXTURE = bpy.path.abspath("//vegetacao/folhagem.png")  # PNG com alpha (opcional)
EXPORT_PATH = bpy.path.abspath("//export/mio-terracos-raw.glb")


def log(*a):
    print("[mio]", *a)


def world_bbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector(map(min, zip(*pts))), Vector(map(max, zip(*pts)))


# ───────────────────────── etapas ─────────────────────────


def step_clean():
    removed = 0
    for o in list(bpy.data.objects):
        hidden = o.hide_get() or o.hide_viewport or o.hide_render
        outside = False
        if o.type == "MESH":
            lo, hi = world_bbox(o)
            outside = any(hi[i] < BOUNDS_MIN[i] or lo[i] > BOUNDS_MAX[i] for i in range(3))
        empty_leaf = o.type == "EMPTY" and not o.children
        if hidden or outside or empty_leaf or o.type in {"CAMERA", "LIGHT"} and o.name.startswith("SketchUp"):
            bpy.data.objects.remove(o, do_unlink=True)
            removed += 1
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    log("clean: removidos", removed)


def _owner_name(o):
    """Nome do objeto + nomes dos pais/coleções, para casar com MAP."""
    names = [o.name]
    p = o.parent
    while p:
        names.append(p.name)
        p = p.parent
    names += [c.name for c in o.users_collection]
    return " ".join(names)


def step_name():
    # aplica transformações dos pais para poder desfazer a hierarquia
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    groups = {k: [] for k in MAP}
    for o in meshes:
        if re.search(VEGETATION, _owner_name(o), re.I):
            continue
        for target, pat in MAP.items():
            if re.search(pat, _owner_name(o), re.I):
                groups[target].append(o)
                break
        else:
            groups.setdefault("paredes", []).append(o)  # sobra vai para o ambiente

    for target, objs in groups.items():
        if not objs:
            log("name: AVISO nada encontrado para", target)
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.make_single_user(object=True, obdata=True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if len(objs) > 1:
            bpy.ops.object.join()
        o = bpy.context.view_layer.objects.active
        o.name = o.data.name = target
        # origem no centro da base (o contorno de hover escala a partir dela)
        lo, hi = world_bbox(o)
        bpy.context.scene.cursor.location = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        # junta materiais iguais e remove duplicados
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.remove_doubles(threshold=0.0005)
        bpy.ops.mesh.dissolve_limited(angle_limit=0.0175)
        bpy.ops.object.mode_set(mode="OBJECT")
        ratio = DECIMATE.get(target)
        mod = o.modifiers.new("decimate", "DECIMATE")
        if ratio:
            mod.ratio = ratio
        else:
            mod.decimate_type = "DISSOLVE"
            mod.angle_limit = 0.02
        bpy.ops.object.modifier_apply(modifier=mod.name)
        log(f"name: {target} <- {len(objs)} objetos, {len(o.data.polygons)} faces")
    bpy.ops.object.select_all(action="DESELECT")


def _veg_material():
    mat = bpy.data.materials.get("veg_card") or bpy.data.materials.new("veg_card")
    mat.use_nodes = True
    mat.blend_method = "CLIP"
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    try:
        img = bpy.data.images.load(VEG_TEXTURE, check_existing=True)
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = img
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    except Exception:
        bsdf.inputs["Base Color"].default_value = (0.2, 0.38, 0.16, 1)
        log("veg: sem textura em", VEG_TEXTURE, "- usando verde liso")
    return mat


def step_veg():
    mat = _veg_material()
    plants = [o for o in bpy.data.objects if o.type == "MESH" and re.search(VEGETATION, _owner_name(o), re.I)]
    cards = []
    for o in plants:
        lo, hi = world_bbox(o)
        w = max(hi.x - lo.x, hi.y - lo.y)
        h = hi.z - lo.z
        c = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
        bm = bmesh.new()
        for ang in (0, 1.5708):  # dois planos cruzados
            ca, sa = __import__("math").cos(ang), __import__("math").sin(ang)
            vs = [bm.verts.new((c.x + s * w / 2 * ca, c.y + s * w / 2 * sa, c.z + z)) for s, z in ((-1, 0), (1, 0), (1, h), (-1, h))]
            f = bm.faces.new(vs)
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for loop, co in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
                loop[uv].uv = co
        me = bpy.data.meshes.new("veg_card")
        bm.to_mesh(me)
        bm.free()
        card = bpy.data.objects.new("veg_card", me)
        card.data.materials.append(mat)
        bpy.context.scene.collection.objects.link(card)
        cards.append(card)
        bpy.data.objects.remove(o, do_unlink=True)
    if cards:
        bpy.ops.object.select_all(action="DESELECT")
        for c in cards:
            c.select_set(True)
        bpy.context.view_layer.objects.active = cards[0]
        bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active
        j.name = "vegetacao"
        # a vegetação faz parte do "jardim" no site
        jardim = bpy.data.objects.get("jardim")
        if jardim:
            j.parent = jardim
    log("veg: plantas substituídas", len(plants))


def step_uv():
    for o in bpy.data.objects:
        if o.type != "MESH" or o.name == "vegetacao":
            continue
        if "lightmap" not in o.data.uv_layers:
            o.data.uv_layers.new(name="lightmap")
        o.data.uv_layers.active = o.data.uv_layers["lightmap"]
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004)
        bpy.ops.object.mode_set(mode="OBJECT")
    log("uv: lightmap criado")


def step_bake():
    """Assa iluminação completa (luz quente, LED, AO) na cor base -> material 'unlit' no site.
    Ajuste antes as luzes da cena para ficar como os renders: sol quente pelo jardim,
    fitas LED (emissão ~3000K) sob as prateleiras e spots/anel no teto."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 256
    sc.cycles.use_denoising = True
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.margin = 8
    for o in bpy.data.objects:
        if o.type != "MESH" or o.name == "vegetacao":
            continue
        size = BAKE_SIZE.get(o.name, BAKE_DEFAULT)
        img = bpy.data.images.new(f"{o.name}_bake", size, size)
        for mat in o.data.materials:
            if not mat:
                continue
            mat.use_nodes = True
            n = mat.node_tree.nodes.new("ShaderNodeTexImage")
            n.image = img
            n.name = "BAKE_TARGET"
            mat.node_tree.nodes.active = n
        o.data.uv_layers.active = o.data.uv_layers["lightmap"]
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="COMBINED")
        img.filepath_raw = bpy.path.abspath(f"//export/textures/{o.name}.png")
        img.file_format = "PNG"
        img.save()
        _make_unlit(o, img)
        log("bake:", o.name, size)


def _make_unlit(o, img):
    """Troca os materiais do objeto por um só, sem iluminação, com a textura assada no UV 'lightmap'."""
    mat = bpy.data.materials.new(f"{o.name}_baked")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeBackground")  # o exportador glTF converte em KHR_materials_unlit
    tex = nt.nodes.new("ShaderNodeTexImage")
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "lightmap"
    tex.image = img
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Background"], out.inputs["Surface"])
    o.data.materials.clear()
    o.data.materials.append(mat)
    # remove o UV original, só o lightmap vai para o site
    for layer in list(o.data.uv_layers):
        if layer.name != "lightmap":
            o.data.uv_layers.remove(layer)


def step_export():
    bpy.ops.export_scene.gltf(
        filepath=EXPORT_PATH,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_draco_mesh_compression_enable=False,  # compressão no gltf-transform
    )
    log("export:", EXPORT_PATH)


STEPS = {"clean": step_clean, "name": step_name, "veg": step_veg, "uv": step_uv, "bake": step_bake, "export": step_export}

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    step = argv[argv.index("--step") + 1] if "--step" in argv else "all"
    for name in STEPS if step == "all" else [step]:
        log("==>", name)
        STEPS[name]()
