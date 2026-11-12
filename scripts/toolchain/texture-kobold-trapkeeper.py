"""Apply TextureCraft materials to a private rigged Kobold Scout scene."""
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
targets = {
    "KoboldTrapkeeper_Body": {0:"CopperScales", 2:"Throat", 3:"ScoutCloth", 4:"ScoutLeather", 5:"Bronze", 8:"Apron"},
}
temporary = []
for name, slots in targets.items():
    obj = bpy.data.objects[name]
    for index, label in slots.items():
        obj.data.materials[index].name = label
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.data.uv_layers.active = obj.data.uv_layers.new(name="PaintSurface")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.03)
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

def surface(preset, color, roughness, relief, strength):
    add("material.apply", material=preset)
    kind, scale, seed, low, high = color
    add("layer.fill.set", channel="baseColor", procedural=kind, scale=scale,
        seed=seed, low=low, high=high, contrast=1.7)
    kind, scale, seed, low, high = relief
    add("layer.fill.set", channel="height", procedural=kind, scale=scale,
        seed=seed, low=[low]*3, high=[high]*3)
    add("layer.fill.set", channel="roughness", value=roughness)
    add("textureSet.settings", heightStrength=strength)

assert set(info["textureSets"]) == {label for slots in targets.values() for label in slots.values()}
for index, name in enumerate(info["textureSets"]):
    add("textureSet.select", ts=index)
    if name == "CopperScales":
        surface("leather", ("Leather grain", 60, 2, [.44,.036,.023], [.44,.036,.023]),
            .78, ("Leather grain", 60, 2, -.012,.002), 3.2)
        add("layer.fill.set", channel="baseColor", color="#ad352d")
    elif name == "Throat":
        surface("clay", ("Clouds", 5, 24, [.44,.036,.023], [.44,.036,.023]),
            .84, ("Fine noise", 10, 6, -.004,.002), 3.2)
        add("layer.fill.set", channel="baseColor", color="#ad352d")
    elif name == "ScoutCloth":
        add("layer.add.fill", name="Smooth matte field shirt", color="#527343", roughness=.89, metallic=0)
    elif name == "ScoutLeather":
        surface("leather", ("Leather grain", 18, 32, [.049,.019,.008], [.21,.094,.039]),
            .83, ("Leather grain", 18, 32, -.014,.002), 3.4)
    elif name == "Apron":
        add("layer.add.fill", name="Smooth work apron", color="#bd9c60", roughness=.86, metallic=0)
    else:
        surface("copper_hammered", ("Grunge", 6, 24, [.13,.056,.014], [.62,.345,.084]),
            .57, ("Hammered", 12, 24, -.014,.003), 3.4)

maps = out / "maps"
add("file.exportTextures", dir=str(maps), format="png", size=512, padding="infinite")
recipe = out / "recipe.json"
recipe.write_text(json.dumps({"open":str(mesh), "steps":steps, "save":str(out/"kobold-trapkeeper.tcraft")}, indent=2))
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
            image.colorspace_settings.name = "sRGB" if channel == "baseColor" else "Non-Color"
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
        mat["preserveAuthoredRoughness"] = True

body = bpy.data.objects["KoboldTrapkeeper_Body"]
eye = body.data.materials[7].node_tree.nodes["Principled BSDF"]
eye.inputs["Base Color"].default_value = (.99,.53,.032,1)
eye.inputs["Emission Color"].default_value = (.99,.29,.01,1)
eye.inputs["Emission Strength"].default_value = .39
bpy.ops.wm.save_as_mainfile(filepath=str(out/"kobold-trapkeeper.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"kobold-trapkeeper.glb"), export_format="GLB",
    export_extras=True, export_animations=False)
