"""Bake book-inspired reference color into a denser halfling reconstruction.

The projection is calibrated to the two November 12 references and source
meshes. It applies to the forward-facing skin inside the facial mask.
"""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("reference", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("variant", choices=["male", "female"])
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.source))
body, = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
original = body.matrix_world.copy()
body.data.transform(Matrix.Rotation(math.pi, 4, "Z") @ original)
body.parent = None
body.matrix_world = Matrix.Identity(4)
for obj in list(bpy.context.scene.objects):
    if obj != body:
        bpy.data.objects.remove(obj, do_unlink=True)

points = np.array([tuple(vertex.co) for vertex in body.data.vertices])
low, high = points.min(axis=0), points.max(axis=0)
scale = 1.34 / (high[2]-low[2])
origin = Vector(((low[0]+high[0])/2, (low[1]+high[1])/2, low[2]))
body.data.transform(Matrix.Scale(scale, 4) @ Matrix.Translation(-origin))
mesh = body.data
mesh.update()
points = np.array([tuple(vertex.co) for vertex in mesh.vertices])

# Keep UV seams and smooth only the shading across coincident positions.
unique, index = np.unique(np.round(points, 5), axis=0, return_inverse=True)
normal = np.zeros_like(unique)
for face in mesh.polygons:
    weighted = np.array(face.normal)*face.area
    for vertex in face.vertices:
        normal[index[vertex]] += weighted
    face.use_smooth = True
normal /= np.maximum(np.linalg.norm(normal,axis=1)[:,None], 1e-8)
mesh.normals_split_custom_set_from_vertices(normal[index].tolist())

reference = bpy.data.images.load(str(args.reference))
width, height = reference.size
color = np.empty(width*height*4, dtype=np.float32)
reference.pixels.foreach_get(color)
color = color.reshape(height,width,4)
male = args.variant == "male"
center_x = 621 if male else 627
screen_rows = [225,370,443,507,590,625] if male else [223,357,417,482,543,572]
image_rows = [73,138,169,195,238,259] if male else [62,120,150,176,208,226]
rows = height-1-np.arange(height)[:,None]
cols = np.arange(width)[None,:]

# Broad enough for brows, lids, cheeks and lips. Fade before the hairline,
# ears and neck so the surrounding baked material supplies those surfaces.
face_y = 161 if male else 145
ellipse = ((cols-center_x)/98)**2 + ((rows-face_y)/109)**2
color[:,:,3] = np.clip((1-ellipse)/.41, 0, 1)
mask = bpy.data.images.new("Frontal face color and mask", width=width, height=height, alpha=True)
mask.colorspace_settings.name = "sRGB"
mask.pixels.foreach_set(color.ravel())
mask.update()
mask.pack()

old_uv = mesh.uv_layers.active
projection = mesh.uv_layers.new(name="Face reference projection")
screen_x = 360 + points[:,0]*720/.46
screen_y = 360 - (points[:,2]-1.205)*720/.46
image_x = center_x+(screen_x-(360 if male else 365))*(.48 if male else .56)
image_y = np.interp(screen_y, screen_rows, image_rows, left=-20, right=height)
# Front-ray visibility keeps the reference from painting through the head.
center_screen = 360 if male else 365
limit = np.interp(screen_y, [224,310,370,432,506,583], [58,91,123,126,113,67])
blend = np.clip((limit-abs(screen_x-center_screen))/30, 0, 1)
blend *= np.clip((screen_y-231)/55,0,1)*np.clip((592-screen_y)/43,0,1)
bvh = BVHTree.FromPolygons([vertex.co for vertex in mesh.vertices],
                           [tuple(face.vertices) for face in mesh.polygons])
for vertex in np.flatnonzero(blend):
    x, y, z = points[vertex]
    hit, _, _, _ = bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
    if hit is None:
        blend[vertex] = 0
    else:
        blend[vertex] *= np.clip((.015-abs(hit.y-y))/.010,0,1)
visibility = mesh.attributes.new("Face projection coverage","FLOAT","POINT")
visibility.data.foreach_set("value",blend.astype(np.float32))
for loop in mesh.loops:
    vertex = loop.vertex_index
    projection.data[loop.index].uv = (image_x[vertex]/width, 1-image_y[vertex]/height)
mesh.uv_layers.active = old_uv
old_uv.active_render = True

material, = body.data.materials
material.use_nodes = True
tree = material.node_tree
nodes, links = tree.nodes, tree.links
surface = nodes.get("Principled BSDF")
output = nodes.get("Material Output")
albedo = surface.inputs["Base Color"].links[0].from_socket
face_texture = nodes.new("ShaderNodeTexImage")
face_texture.image = mask
face_uv = nodes.new("ShaderNodeUVMap")
face_uv.uv_map = projection.name
links.new(face_uv.outputs["UV"], face_texture.inputs["Vector"])
coverage = nodes.new("ShaderNodeAttribute")
coverage.attribute_name = visibility.name
factor = nodes.new("ShaderNodeMath")
factor.operation = "MULTIPLY"
links.new(coverage.outputs["Fac"],factor.inputs[0])
links.new(face_texture.outputs["Alpha"],factor.inputs[1])
mix = nodes.new("ShaderNodeMixRGB")
links.new(factor.outputs[0],mix.inputs[0])
links.new(albedo,mix.inputs[1])
links.new(face_texture.outputs["Color"],mix.inputs[2])
emission = nodes.new("ShaderNodeEmission")
links.new(mix.outputs[0],emission.inputs["Color"])
links.new(emission.outputs[0],output.inputs["Surface"])

baked = bpy.data.images.new("Halfling hand-aligned face albedo",width=2048,height=2048)
target = nodes.new("ShaderNodeTexImage")
target.image = baked
nodes.active = target
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 1
bpy.ops.object.bake(type="EMIT",margin=4)
baked.filepath_raw = str(args.output/"face-albedo.png")
baked.file_format = "PNG"
baked.save()
baked.pack()
links.new(surface.outputs["BSDF"],output.inputs["Surface"])
links.new(target.outputs["Color"],surface.inputs["Base Color"])
for name, value in (("Metallic",0),("Roughness",.64)):
    socket = surface.inputs[name]
    for link in list(socket.links):
        links.remove(link)
    socket.default_value = value
for node in (face_texture,face_uv,coverage,factor,mix,emission):
    nodes.remove(node)
mesh.uv_layers.remove(projection)
mesh.attributes.remove(visibility)
body.name = "Halfling refined anatomy"
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/"refined.blend"))
bpy.ops.export_scene.gltf(filepath=str(args.output/"refined.glb"),export_format="GLB")
