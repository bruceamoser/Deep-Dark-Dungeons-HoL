"""Embed compatible five-state shared-rig motion on the refined Werebear.

Usage: blender -b --python animate-werebear.py -- TEXTURED_BLEND OUTPUT_DIR
"""

import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector


source, output = map(Path, sys.argv[sys.argv.index("--") + 1:])
output.mkdir(parents=True, exist_ok=True)
library = Path(__file__).resolve().parents[2] / "public/assets/animations"
bpy.ops.wm.open_mainfile(filepath=str(source))
scene = bpy.context.scene
scene.render.fps = 30
rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
for bone in rig.pose.bones:
    bone.rotation_mode = "QUATERNION"
    bone.custom_shape = None
for obj in list(scene.objects):
    if obj.type == "MESH" and obj.parent != rig:
        bpy.data.objects.remove(obj, do_unlink=True)
contact_meshes = [bpy.data.objects["Werebear_Body"]]
rig.animation_data_create()
clips = (
    ("General", "Idle_A", "Idle"),
    ("MovementBasic", "Walking_A", "Walking_A"),
    ("CombatMelee", "Melee_Unarmed_Attack_Punch_A", "1H_Melee_Attack_Slice_Diagonal"),
    ("General", "Hit_A", "Hit_A"),
    ("General", "Death_A", "Death_A_Pose"),
)
selected = []
for group in dict.fromkeys(row[0] for row in clips):
    objects = set(bpy.data.objects)
    actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(library / f"Rig_Medium_{group}.glb"))
    imported = set(bpy.data.objects) - objects
    donor = next(obj for obj in imported if obj.type == "ARMATURE")
    if len(donor.data.bones) != 23:
        raise ValueError("Expected the 23-bone shared rig")
    for bone in donor.data.bones:
        target = rig.data.bones[bone.name]
        parent = lambda item: item.parent.name if item.parent else None
        delta = target.matrix_local - bone.matrix_local
        if parent(target) != parent(bone) or max(abs(v) for row in delta for v in row) > 1e-5:
            raise ValueError(f"Incompatible shared bone: {bone.name}")
    for _, original, renamed in (row for row in clips if row[0] == group):
        action = next(action for action in set(bpy.data.actions) - actions if action.name == original)
        action.use_fake_user = True
        selected.append((action, renamed))
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

kept = {action for action, _ in selected}
for action in list(bpy.data.actions):
    if action not in kept:
        bpy.data.actions.remove(action)
for action, name in selected:
    action.name = name
    if action.name != name:
        raise ValueError(f"Unexpected clip name: {action.name}")

root = rig.pose.bones["root"]
for action, _ in selected:
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    frames = range(math.floor(action.frame_range[0]), math.ceil(action.frame_range[1]) + 1)
    samples = []
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        graph=bpy.context.evaluated_depsgraph_get()
        floor=min((o.matrix_world@v.co).z for mesh in contact_meshes for o in [mesh.evaluated_get(graph)] for v in o.data.vertices)
        lift=max(0,.002-floor)
        if lift>.25:raise ValueError((action.name,frame,lift))
        up = (rig.matrix_world @ root.bone.matrix_local).to_3x3().inverted() @ Vector((0,0,lift))
        samples.append((frame,root.location+up))
    for frame,location in samples:
        root.location=location
        root.keyframe_insert(data_path="location",frame=frame,group="Ground contact")
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)
    track.mute = True

for bone in rig.pose.bones:
    bone.matrix_basis.identity()
for track in rig.animation_data.nla_tracks:
    track.mute = False
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(output / "werebear.blend"))
bpy.ops.export_scene.gltf(filepath=str(output / "werebear.glb"),
    export_format="GLB", export_extras=True, export_animations=True,
    export_animation_mode="NLA_TRACKS", export_force_sampling=True)
