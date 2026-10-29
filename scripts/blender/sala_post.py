"""
Ajustes finais na loja projetada já assada (sem refazer a luz; UVs e lightmaps continuam valendo).
Hoje: o topo do armário, com arco só no canto esquerdo, fica simétrico (a metade esquerda espelhada na direita).

Uso: python scripts/blender/sala_post.py <pasta build>  (lê e regrava <build>/sala.glb)
Coordenadas do site: x, y (altura), z = Blender (x, z, −y).
"""

import os
import sys

import bpy
import bmesh  # noqa: E402 (no bpy como módulo, bmesh só existe depois de importar bpy)
from mathutils import Matrix, Vector

SRC = os.path.join(sys.argv[1], "sala.glb")
ARC_Y = 1.98  # altura (site) a partir da qual fica o topo do armário (painel com o arco e o logo)
X0, X1 = 1.897, 5.276  # bordas externas do corpo do armário
KEEP = ("logo",)  # o logo fica como está (espelhado sairia invertido)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
o = bpy.data.objects["armario"]
me = o.data
mw, mwi = o.matrix_world, o.matrix_world.inverted()
cx = (X0 + X1) / 2
mats = [m.name.lower() if m else "" for m in me.materials]

bm = bmesh.new()
bm.from_mesh(me)


def site(v):
    p = mw @ v
    return p.x, p.z, -p.y


def top(f):
    return site(f.calc_center_median())[1] > ARC_Y and not any(k in mats[f.material_index] for k in KEEP)


# o topo vira simétrico: corta no meio, apaga a metade direita e põe no lugar a esquerda espelhada
faces = [f for f in bm.faces if top(f)]
geom = list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces
bmesh.ops.bisect_plane(bm, geom=geom, plane_co=mwi @ Vector((cx, 0, 0)), plane_no=(mwi.to_3x3() @ Vector((1, 0, 0))).normalized())
dead = [f for f in bm.faces if top(f) and site(f.calc_center_median())[0] > cx]
bmesh.ops.delete(bm, geom=dead, context="FACES")
left = [f for f in bm.faces if top(f) and site(f.calc_center_median())[0] < cx]
dup = bmesh.ops.duplicate(bm, geom=left)
new_faces = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMFace)]
new_verts = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMVert)]
mirror = mwi @ Matrix.Translation((2 * cx, 0, 0)) @ Matrix.Scale(-1, 4, (1, 0, 0)) @ mw
bmesh.ops.transform(bm, matrix=mirror, verts=new_verts)
bmesh.ops.reverse_faces(bm, faces=new_faces)  # espelhar inverte o lado das faces
# sobra da lateral direita (fita de borda que subia até o canto quadrado): corta na altura do arco
side = [f for f in bm.faces if site(f.calc_center_median())[0] > X1 + 0.002]
sgeom = list({v for f in side for v in f.verts}) + list({e for f in side for e in f.edges}) + side
bmesh.ops.bisect_plane(bm, geom=sgeom, plane_co=mwi @ Vector((0, 0, ARC_Y)), plane_no=(mwi.to_3x3() @ Vector((0, 0, 1))).normalized())
bmesh.ops.delete(bm, geom=[f for f in bm.faces if (lambda q: q[0] > X1 + 0.002 and q[1] > ARC_Y)(site(f.calc_center_median()))], context="FACES")
bmesh.ops.remove_doubles(bm, verts=list(set(new_verts) | {v for f in left for v in f.verts}), dist=0.0005)

bm.to_mesh(me)
bm.free()
me.update()
print(f"[post] topo do armário: {len(dead)} faces da direita trocadas por {len(new_faces)} espelhadas", flush=True)
bpy.ops.export_scene.gltf(filepath=SRC, export_format="GLB", export_yup=True, export_lights=False, export_cameras=False,
                          export_texcoords=True, export_normals=True, export_extras=True)
print("[post] ok", flush=True)
