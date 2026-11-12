"""Bind and animate the freshly reconstructed Cinder Imp mesh in Blender."""
import math
from pathlib import Path
import sys

import bpy
from mathutils import Euler, Matrix, Vector
import numpy as np

source, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
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
factor = 1.2 / (hi.z - lo.z)
offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
body.data.transform(Matrix.Diagonal((factor, factor, factor, 1)) @ Matrix.Translation(-offset))
body.name = "Cinder Imp reconstructed anatomy"

rig = bpy.data.objects.new("Cinder Imp", bpy.data.armatures.new("Cinder Imp"))
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
      [(0, -.015, .53), (0, -.02, .60), (0, -.045, .69),
       (0, -.04, .82), (0, -.065, .91), (0, -.065, 1.18)], "Root")
for side, sign in [("R", -1), ("L", 1)]:
    chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
          [(sign*.16, -.035, .77), (sign*.27, -.055, .65),
           (sign*.39, -.08, .53), (sign*.47, -.08, .43)], "Chest")
    chain([side + name for name in ("Thigh", "Shin", "Foot")],
          [(sign*.09, -.02, .54), (sign*.14, -.055, .32),
           (sign*.18, -.01, .10), (sign*.18, -.115, .026)], "Pelvis")
    chain([side + name for name in ("Wing", "WingTip")],
          [(sign*.105, .062, .76), (sign*.37, .16, .96),
           (sign*.85, .11, .71)], "Chest")
chain(["TailBase", "TailMid", "TailTip"],
      [(0, .045, .54), (.15, .20, .27),
       (.39, .18, .18), (.70, .11, .28)], "Pelvis")
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
    if "Wing" in name:
        distance += np.maximum(0, .045-y)*3 + np.maximum(0, .56-z)*2
    elif name.startswith("Tail"):
        distance += np.maximum(0, .07-y)*3 + np.maximum(0, z-.56)*2
    elif name != "Head":
        distance += np.maximum(0, z-.86)*3
    if name == "Head":
        distance += np.maximum(0, .79-z)*2
    distance_fields.append(distance)
distances = np.stack(distance_fields, axis=1)
indices = np.argsort(distances, axis=1)[:, :3]
values = np.take_along_axis(distances, indices, axis=1)
weights = np.exp(-((values-values[:, :1])/.025)**2)
weights /= weights.sum(axis=1, keepdims=True)
groups = [body.vertex_groups.new(name=name) for name in names]
for index, (bones, influences) in enumerate(zip(indices, weights)):
    for bone, influence in zip(bones, influences):
        if influence > 1e-6:
            groups[bone].add([index], float(influence), "REPLACE")
body.parent = rig
modifier = body.modifiers.new("Cinder Imp skeleton", "ARMATURE")
modifier.object = rig

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
    orient("Chest", x=2*wave)
    orient("Head", x=-2*wave, z=5*wave if clip == "Idle" else 0)
    for side, sign in [("R", -1), ("L", 1)]:
        orient(side+"Wing", y=sign*(10+10*wave), z=sign*(-11+6*wave))
        orient(side+"WingTip", y=sign*8*wave)
        orient(side+"UpperArm", y=sign*16)
    orient("TailBase", z=8*wave)
    orient("TailMid", z=12*wave)
    orient("TailTip", z=15*wave)
    if clip == "Walking_A":
        for side, sign in [("R", -1), ("L", 1)]:
            orient(side+"Thigh", x=sign*22*wave)
            orient(side+"Shin", x=18*max(0, sign*wave))
            orient(side+"Foot", x=-sign*12*wave)
            orient(side+"UpperArm", x=-sign*14*wave, y=sign*16)
    elif clip == "1H_Melee_Attack_Slice_Diagonal":
        turn = math.sin(math.tau*t)*pulse
        orient("Chest", x=18*pulse, z=28*turn)
        orient("RUpperArm", x=-33*pulse, y=-10, z=65*turn)
        orient("RForearm", x=-22*pulse, z=30*turn)
        orient("LUpperArm", x=18*pulse, y=20)
    elif clip == "Spellcast_Shoot":
        orient("Chest", x=-10*pulse)
        orient("RUpperArm", x=-45*pulse, y=-15, z=20*pulse)
        orient("RForearm", x=-30*pulse)
        orient("LUpperArm", x=-24*pulse, y=20)
    elif clip == "Hit_A":
        orient("Chest", x=-22*pulse, y=-12*pulse)
        orient("Head", x=-15*pulse, z=12*pulse)
    elif clip == "Death_A_Pose":
        settle = t*t*(3-2*t)
        orient("Root", x=88*settle, y=6*settle)
        orient("Neck", x=-24*settle)
        orient("RWing", y=-22*settle, z=18*settle)
        orient("LWing", y=22*settle, z=-18*settle)
        orient("RThigh", x=-10*settle)
        orient("LThigh", x=-15*settle)


clips = {
    "Idle": 41, "Walking_A": 25, "1H_Melee_Attack_Slice_Diagonal": 26,
    "Spellcast_Shoot": 34, "Hit_A": 16, "Death_A_Pose": 39,
}
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
        floor = float(points.reshape(-1, 3)[:, 2].min())
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
bpy.ops.wm.save_as_mainfile(filepath=str(output/"cinder-imp.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(output/"cinder-imp.glb"), export_format="GLB",
    export_animations=True, export_animation_mode="NLA_TRACKS",
    export_force_sampling=True, export_extras=True,
)
