"""Embed shared-rig motion and a four-bone tail pass on the private scout.

Usage: blender -b --python animate-kobold-emberkeeper.py -- TEXTURED_BLEND OUTPUT_DIR
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
contact_meshes = [bpy.data.objects[name] for name in ("KoboldEmberkeeper_Body", "HangingBrazier")]
rig.animation_data_create()
clips = (
    ("General", "Idle_A", "Idle"),
    ("MovementBasic", "Walking_A", "Walking_A"),
    ("CombatRanged", "Ranged_Magic_Shoot", "Spellcast_Shoot"),
    ("CombatMelee", "Melee_Unarmed_Attack_Punch_A", "1H_Melee_Attack_Slice_Diagonal"),
    ("General", "Hit_A", "Hit_A"),
    ("General", "Death_B", "Death_A_Pose"),
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

def orient_tail(bone, direction, blend):
    current = (bone.tail - bone.head).normalized()
    turn = current.rotation_difference(direction.normalized())
    matrix = Quaternion().slerp(turn, blend).to_matrix().to_4x4() @ bone.matrix
    matrix.translation = bone.head
    bone.matrix = matrix
    bpy.context.view_layer.update()


brazier=rig.pose.bones["brazier"]
wings=[rig.pose.bones[name] for name in ("wing.l","wing.r")]
tails = [rig.pose.bones[f"tail{i}"] for i in range(1, 5)]
root = rig.pose.bones["root"]
settled = [(0.32, 0.93, -.16), (.49,.79,-.34), (.64,.72,-.22), (.79,.61,.01)]
grounded = {"Spellcast_Shoot", "Death_A_Pose", "Walking_A", "1H_Melee_Attack_Slice_Diagonal"}
feet = [rig.pose.bones[name] for name in ("foot.l", "toes.l", "foot.r", "toes.r")]
for action, _ in selected:
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    frames = range(math.floor(action.frame_range[0]), math.ceil(action.frame_range[1]) + 1)
    samples = []
    for frame in frames:
        scene.frame_set(frame)
        brazier.matrix_basis.identity()
        for wing in wings: wing.matrix_basis.identity()
        for tail in tails:
            tail.rotation_mode = "QUATERNION"
            tail.rotation_quaternion = Quaternion()
        bpy.context.view_layer.update()
        fraction = (frame - frames.start) / max(1, len(frames) - 1)
        if action.name == "Death_A_Pose":
            # Relax the narrow humanoid foot curls for the longer talons.
            plant = 1.0
            for foot in feet:
                if foot.name.startswith("foot"):
                    rotation = foot.matrix.to_quaternion().slerp(
                        foot.bone.matrix_local.to_quaternion(), plant
                    )
                    pose = rotation.to_matrix().to_4x4()
                    pose.translation = foot.head
                    foot.matrix = pose
                else:
                    foot.rotation_quaternion = foot.rotation_quaternion.slerp(Quaternion(), plant)
                bpy.context.view_layer.update()
            blend = max(0, min(1, (fraction - .48) / .45))
            blend = blend * blend * (3 - 2 * blend)
            for bone, direction in zip(tails, settled):
                orient_tail(bone, Vector(direction), blend)
        else:
            amplitude = .11 if action.name == "Walking_A" else .045
            for index, tail in enumerate(tails):
                angle = amplitude * math.sin(math.tau * fraction - index*.55)
                local_up = tail.bone.matrix_local.to_quaternion().inverted() @ Vector((0,0,1))
                tail.rotation_quaternion = Quaternion(local_up, angle)
        bpy.context.view_layer.update()
        # The chain stays gravity-aligned while its suspension follows the hand.
        bpy.context.view_layer.update()
        cup=brazier.bone.matrix_local.to_quaternion().to_matrix().to_4x4()
        cup.translation=brazier.head
        cup.translation.z=max(.452,cup.translation.z)
        brazier.matrix=cup
        bpy.context.view_layer.update()
        lift = 0
        if action.name in grounded:
            graph = bpy.context.evaluated_depsgraph_get()
            meshes = [mesh.evaluated_get(graph) for mesh in contact_meshes]
            floor = min(
                (mesh.matrix_world @ vertex.co).z
                for mesh in meshes for vertex in mesh.data.vertices
            )
            lift = max(0, .002 - floor)
            if lift > (.23 if action.name == "Death_A_Pose" else .13):
                raise ValueError(f"{action.name} frame {frame} needs excessive floor correction: {lift}")
        up = (rig.matrix_world @ root.bone.matrix_local).to_3x3().inverted() @ Vector((0,0,lift))
        samples.append((brazier.rotation_quaternion.copy(), brazier.location.copy(), frame, [tail.rotation_quaternion.copy() for tail in tails], root.location + up, [foot.rotation_quaternion.copy() for foot in feet]))
    for cup_rotation, cup_location, frame, rotations, location, foot_rotations in samples:
        brazier.rotation_quaternion=cup_rotation
        brazier.location=cup_location
        brazier.keyframe_insert(data_path="rotation_quaternion",frame=frame,group="Suspended brazier")
        brazier.keyframe_insert(data_path="location",frame=frame,group="Suspended brazier")
        if action.name == "Death_A_Pose":
            for foot, rotation in zip(feet, foot_rotations):
                foot.rotation_quaternion = rotation
                foot.keyframe_insert(data_path="rotation_quaternion", frame=frame, group="Talons in fall")
        for tail, rotation in zip(tails, rotations):
            tail.rotation_quaternion = rotation
            tail.keyframe_insert(data_path="rotation_quaternion", frame=frame, group="Trapkeeper tail")
        if action.name in grounded:
            root.location = location
            root.keyframe_insert(data_path="location", frame=frame, group="Ground contact")
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
bpy.ops.wm.save_as_mainfile(filepath=str(output / "kobold-emberkeeper.blend"))
bpy.ops.export_scene.gltf(filepath=str(output / "kobold-emberkeeper.glb"),
    export_format="GLB", export_extras=True, export_animations=True,
    export_animation_mode="NLA_TRACKS", export_force_sampling=True)
