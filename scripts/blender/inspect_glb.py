"""Lista as malhas de um .glb com bbox em coordenadas do site (metros, Y para cima).
Uso: python inspect_glb.py entrada.glb saida.json [dx dz]"""
import sys, json, bpy
from mathutils import Vector

src, out = sys.argv[1], sys.argv[2]
DX, DZ = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (13.55, 50.2)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
rows = []
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    # Blender (x, y, z) -> site (x + DX, z, -y + DZ)
    sx = [p.x + DX for p in pts]; sy = [p.z for p in pts]; sz = [-p.y + DZ for p in pts]
    anc, p = [], o.parent
    while p:
        anc.append(p.name); p = p.parent
    tris = sum(len(poly.vertices) - 2 for poly in o.data.polygons)
    mats = [m.name for m in o.data.materials if m]
    imgs = []
    for m in o.data.materials:
        if m and m.use_nodes:
            imgs += [n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    rows.append({"n": o.name, "anc": anc[:6], "tris": tris, "mats": mats[:3], "imgs": imgs[:3],
                 "min": [round(min(sx), 2), round(min(sy), 2), round(min(sz), 2)],
                 "max": [round(max(sx), 2), round(max(sy), 2), round(max(sz), 2)]})
json.dump(rows, open(out, "w"))
print(len(rows), "meshes")
