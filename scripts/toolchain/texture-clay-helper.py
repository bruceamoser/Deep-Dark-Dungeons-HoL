"""Apply TextureCraft materials to a private rigged Clay Helper scene."""
import bmesh
import bpy
import json
import subprocess
import sys
from pathlib import Path

source, out = map(Path, sys.argv[sys.argv.index("--") + 1:])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))

for obj in list(bpy.context.scene.objects):
    if obj.type in {"CAMERA","LIGHT"} or obj.name.startswith("RENDER_ONLY"):
        bpy.data.objects.remove(obj, do_unlink=True)
targets = {"geometry_0":{0:"FiredClay",1:"PaleClay"}}
temporary = []
for name, slots in targets.items():
    obj = bpy.data.objects[name]
    for index, label in slots.items():
        obj.data.materials[index] = obj.data.materials[index].copy()
        obj.data.materials[index].name = label
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.data.uv_layers.active = obj.data.uv_layers.new(name="PaintSurface")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.001)
    bpy.ops.object.mode_set(mode="OBJECT")
    copy = obj.copy()
    copy.data = obj.data.copy()
    bpy.context.collection.objects.link(copy)
    for uv in list(copy.data.uv_layers):
        if uv.name != "PaintSurface":
            copy.data.uv_layers.remove(uv)
    bm = bmesh.new()
    bm.from_mesh(copy.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index not in slots], context="FACES")
    bm.to_mesh(copy.data)
    bm.free()
    temporary.append(copy)

bpy.ops.object.select_all(action="DESELECT")
for copy in temporary:
    copy.select_set(True)
mesh = out / "paint-input.glb"
bpy.ops.export_scene.gltf(filepath=str(mesh), use_selection=True, export_animations=False, export_skins=False)
for copy in temporary:
    bpy.data.objects.remove(copy, do_unlink=True)
info = json.loads(subprocess.check_output(["texturecraft-cli", "info", str(mesh)], text=True))
steps = []
def add(command, **params):
    steps.append(dict(id=command, params=params))

assert set(info["textureSets"]) == {label for slots in targets.values() for label in slots.values()}
for index, name in enumerate(info["textureSets"]):
    add("textureSet.select", ts=index)
    add("material.apply",material="clay")
    low,high=([.36,.10,.035],[.70,.28,.10]) if name=="FiredClay" else ([.42,.35,.22],[.76,.67,.45])
    add("layer.fill.set",channel="baseColor",procedural="Clouds",scale=4,seed=12,low=low,high=high,contrast=1.5)
    add("layer.fill.set",channel="height",procedural="Pores",scale=5,seed=11,low=[-.012]*3,high=[.004]*3,contrast=1.5)
    add("layer.fill.set",channel="roughness",value=.72)
    add("textureSet.settings",heightStrength=4)

maps = out / "maps"
add("file.exportTextures", dir=str(maps), format="png", size=512, padding="infinite")
recipe = out / "recipe.json"
recipe.write_text(json.dumps({"open":str(mesh), "steps":steps, "save":str(out/"clay-helper.tcraft")}, indent=2))
run = subprocess.run(["texturecraft-cli", "batch", str(recipe)], capture_output=True, text=True)
if run.returncode or json.loads(run.stdout)["failed"] is not None:
    raise RuntimeError(run.stderr + run.stdout)
(out / "texturecraft-result.json").write_text(run.stdout)

for name, slots in targets.items():
    obj = bpy.data.objects[name]
    for index, label in slots.items():
        mat = obj.data.materials[index]
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        shader = nodes.get("Principled BSDF")
        uv = nodes.new("ShaderNodeUVMap")
        uv.uv_map = "PaintSurface"
        for channel, socket in (("baseColor","Base Color"), ("roughness","Roughness"), ("normal","Normal")):
            image = bpy.data.images.load(str(maps / f"mesh_{label}_{channel}.png"))
            image.colorspace_settings.name = "sRGB" if channel in {"baseColor","emissive"} else "Non-Color"
            image.pack()
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = image
            links.new(uv.outputs["UV"], tex.inputs["Vector"])
            signal = tex.outputs["Color"]
            if channel == "normal":
                normal = nodes.new("ShaderNodeNormalMap")
                normal.uv_map = "PaintSurface"
                links.new(signal, normal.inputs["Color"])
                signal = normal.outputs["Normal"]
            links.new(signal, shader.inputs[socket])
        shader.inputs['Emission Strength'].default_value=0
        shader.inputs['Metallic'].default_value=0
        mat["preserveAuthoredRoughness"] = True

# Darken the sculpted eye hollows; keep them recessed rather than adding eyeballs.
from mathutils import Vector
body=bpy.data.objects['geometry_0']
mat=bpy.data.materials.new('Clay eye hollows');mat.use_nodes=True
shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.025,.012,.005,1);shader.inputs['Roughness'].default_value=.9
slot=len(body.data.materials);body.data.materials.append(mat)
count=0
for face in body.data.polygons:
    c=sum((body.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
    if c.y<-.025 and any(((c.x-x)/.009)**2+((c.z-.398)/.010)**2<1 for x in [-.012,.041]):
        face.material_index=slot;count+=1
assert count>20,('Missing eye regions',count)
print('Eye hollow faces',count)

# Two inspected near-coincident source triangles (areas below1e-14) carry no
# visible surface. Remove only these degenerates, preserving all other seams.
bm=bmesh.new();bm.from_mesh(body.data)
tiny=[f for f in bm.faces if f.calc_area()<=1e-12]
assert len(tiny)==2 and all(f.calc_area()<1e-14 for f in tiny)
vertices={v for f in tiny for v in f.verts}
bmesh.ops.delete(bm,geom=tiny,context='FACES_ONLY')
loose=[v for v in vertices if v.is_valid and not v.link_faces]
if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
bm.to_mesh(body.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(out/"clay-helper.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"clay-helper.glb"), export_format="GLB",
    export_extras=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True)
