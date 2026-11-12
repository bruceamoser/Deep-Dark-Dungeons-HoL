"""Bind and animate the freshly reconstructed Goblin Boss mesh in Blender."""
import math
from pathlib import Path
import sys

import bpy
from mathutils import Euler, Matrix, Vector
import numpy as np

source, sword_source, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
body, = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
body.data.transform(body.matrix_world)
body.parent = None
body.matrix_world = Matrix.Identity(4)
rotation = Matrix.Rotation(math.pi, 4, "Z")
body.data.transform(rotation)
lo = Vector([min(v.co[i] for v in body.data.vertices) for i in range(3)])
hi = Vector([max(v.co[i] for v in body.data.vertices) for i in range(3)])
factor = 1.65 / (hi.z - lo.z)
offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
body.data.transform(Matrix.Diagonal((factor, factor, factor, 1)) @ Matrix.Translation(-offset))
body.name = "Goblin Boss reconstructed anatomy"

rig = bpy.data.objects.new("Goblin Boss", bpy.data.armatures.new("Goblin Boss"))
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
segments = {}


def chain(names, points, parent=None):
    for name, start, end in zip(names, points, points[1:]):
        bone = rig.data.edit_bones.new(name)
        bone.head, bone.tail = start, end
        if parent:
            bone.parent = rig.data.edit_bones[parent]
        segments[name] = (np.array(start), np.array(end))
        parent = name


chain(["Root"], [(0, 0, 0), (0, 0, .12)])
chain(["Pelvis", "Spine", "Chest", "Neck", "Head"],
      [(0, .045, .74), (0, .04, .89), (0, .035, 1.08),
       (0, .025, 1.31), (0, .005, 1.40), (0, -.025, 1.65)], "Root")
for side, sign in [("R", -1), ("L", 1)]:
    chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
          [(sign*.24, .035, 1.28), (sign*.43, .015, 1.10),
           (sign*.63, -.028, .94), (sign*.76, -.034, .82)], "Chest")
    chain([side + name for name in ("Thigh", "Shin", "Foot")],
          [(sign*.17, .035, .75), (sign*.22, .035, .42),
           (sign*.25, .055, .13), (sign*.29, -.105, .04)], "Pelvis")
    chain([side+"Coat"], [(sign*.29, .10, .83), (sign*.41, .12, .31)], "Pelvis")
bpy.ops.object.mode_set(mode="OBJECT")

positions = np.empty(len(body.data.vertices) * 3, dtype=np.float32)
body.data.vertices.foreach_get("co", positions)
positions = positions.reshape(-1, 3)
x, y, z = positions.T
names = [name for name in segments if name != "Root"]
distance_fields = []
for name in names:
    start, end = segments[name]
    delta = end - start
    projection = np.clip(((positions-start) @ delta)/(delta@delta), 0, 1)
    distance = np.linalg.norm(positions-start-projection[:, None]*delta, axis=1)
    if name.startswith(("L", "R")):
        sign = 1 if name.startswith("L") else -1
        distance += np.maximum(0, -sign*x)*2
    if name.endswith(("UpperArm", "Forearm", "Hand")):
        distance += np.maximum(0, .31-abs(x))*2 + np.maximum(0, .75-z)*3
    if name.endswith("Coat"):
        distance += np.maximum(0, .26-abs(x))*4 + np.maximum(0, z-.88)*2
    if name in {"Chest", "Spine", "Pelvis"}:
        distance += np.maximum(0, abs(x)-.35)*2
    if name != "Head":
        distance += np.maximum(0, z-1.38)*4
    else:
        distance += np.maximum(0, 1.33-z)*3
    distance_fields.append(distance)
distances = np.stack(distance_fields, axis=1)
indices = np.argsort(distances, axis=1)[:, :3]
values = np.take_along_axis(distances, indices, axis=1)
weights = np.exp(-((values-values[:, :1])/.035)**2)
weights /= weights.sum(axis=1, keepdims=True)
groups = [body.vertex_groups.new(name=name) for name in names]
for index, (bones, influences) in enumerate(zip(indices, weights)):
    for bone, influence in zip(bones, influences):
        if influence > 1e-6:
            groups[bone].add([index], float(influence), "REPLACE")
body.parent = rig
modifier = body.modifiers.new("Goblin Boss skeleton", "ARMATURE")
modifier.object = rig

# Keep the officer's blade as a rigid part on the reconstructed right hand.
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=str(sword_source))
sword, = [obj for obj in set(bpy.data.objects)-before if obj.type == "MESH"]
sword.data.transform(sword.matrix_world)
sword.parent = None
sword.matrix_world = Matrix.Identity(4)
blade_direction = Vector((-.52, -.23, .82)).normalized()
blade_rotation = Vector((0, 0, 1)).rotation_difference(blade_direction).to_matrix().to_4x4()
grip = Vector((-.705, -.043, .872))
sword.data.transform(Matrix.Translation(grip) @ blade_rotation @ Matrix.Diagonal((.8,.8,.8,1)))
sword.name = "Goblin Boss officer sword"
material = bpy.data.materials.new("Officer sword steel")
material.use_nodes = True
surface = material.node_tree.nodes.get("Principled BSDF")
surface.inputs["Base Color"].default_value = (.44, .47, .46, 1)
surface.inputs["Metallic"].default_value = .63
surface.inputs["Roughness"].default_value = .34
sword.data.materials.clear()
sword.data.materials.append(material)
sword.vertex_groups.new(name="RHand").add(list(range(len(sword.data.vertices))), 1, "REPLACE")
sword.parent = rig
modifier = sword.modifiers.new("Rigid officer sword grip", "ARMATURE")
modifier.object = rig
for obj in set(bpy.data.objects)-before-{sword}:
    if obj.type != "MESH":
        bpy.data.objects.remove(obj, do_unlink=True)

scene = bpy.context.scene
scene.render.fps = 24
rig.animation_data_create()
basis = {bone.name: bone.bone.matrix_local.to_quaternion() for bone in rig.pose.bones}


def orient(name, x=0, y=0, z=0):
    rotation = Euler(tuple(map(math.radians, (x, y, z)))).to_quaternion()
    bone = rig.pose.bones[name]
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = basis[name].inverted() @ rotation @ basis[name]


def pose(clip, t):
    wave = math.sin(math.tau*t)
    pulse = math.sin(math.pi*t)**2
    orient("Chest", x=1.5*wave)
    orient("Head", z=4*wave)
    orient("RUpperArm", y=-13)
    orient("LUpperArm", y=20)
    orient("RForearm", x=-8)
    if clip == "Walking_A":
        for side, sign in [("R", -1), ("L", 1)]:
            orient(side+"Thigh", x=sign*16*wave)
            orient(side+"Shin", x=16*max(0, sign*wave))
            orient(side+"Foot", x=-sign*8*wave)
            orient(side+"Coat", x=sign*6*wave)
        orient("LUpperArm", x=13*wave, y=20)
        orient("RUpperArm", x=-7*wave, y=-13)
    elif clip == "1H_Melee_Attack_Slice_Diagonal":
        sweep = math.sin(math.tau*t)*pulse
        orient("Chest", x=10*pulse, z=-24*sweep)
        orient("RUpperArm", x=-28*pulse, y=8*pulse-13, z=60*sweep)
        orient("RForearm", x=-22*pulse-8, z=30*sweep)
        orient("LUpperArm", x=16*pulse, y=18)
    elif clip == "Hit_A":
        orient("Chest", x=-18*pulse, y=12*pulse)
        orient("Head", x=-12*pulse, z=10*pulse)
    elif clip == "Death_A_Pose":
        settle = t*t*(3-2*t)
        orient("Root", x=88*settle, y=4*settle)
        orient("Neck", x=-16*settle)
        orient("RUpperArm", y=-13+30*settle)
        orient("LUpperArm", y=20-35*settle)
        orient("RThigh", x=-8*settle)


clips = {"Idle": 38, "Walking_A": 27, "1H_Melee_Attack_Slice_Diagonal": 28,
         "Hit_A": 17, "Death_A_Pose": 39}
for clip, length in clips.items():
    action = bpy.data.actions.new(clip)
    rig.animation_data.action = action
    for frame in range(1, length+1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis.identity()
        pose(clip, (frame-1)/(length-1))
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = body.evaluated_get(graph)
        points = np.empty(len(evaluated.data.vertices)*3, dtype=np.float32)
        evaluated.data.vertices.foreach_get("co", points)
        sword_eval = sword.evaluated_get(graph)
        sword_floor = min((sword_eval.matrix_world @ vertex.co).z for vertex in sword_eval.data.vertices)
        floor = min(float(points.reshape(-1, 3)[:, 2].min()), sword_floor)
        rig.pose.bones["Root"].location = basis["Root"].inverted() @ Vector((0, 0, .002-floor))
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion", frame=frame)
        rig.pose.bones["Root"].keyframe_insert("location", frame=frame)
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(clip, 1, action)
    track.mute = True
for track in rig.animation_data.nla_tracks:
    track.mute = False
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(output/"goblin-boss.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(output/"goblin-boss.glb"), export_format="GLB",
    export_animations=True, export_animation_mode="NLA_TRACKS",
    export_force_sampling=True, export_extras=True,
)
