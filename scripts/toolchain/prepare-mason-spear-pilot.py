"""Private source-assembly test; never replaces runtime assets or edits sources.

Run in an isolated Blender process with SOURCE_DIR OUTPUT_DIR after --.
This tests the author's spear clips on the author's body, not a final creature.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(args.source / 'Mesh/AllBodiesCloaks.fbx'))
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
body_inventory = []
for o in list(bpy.context.scene.objects):
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        body_inventory.append({'name': o.name, 'triangles': len(o.data.loop_triangles)})
        if o.name != 'Body08':
            bpy.data.objects.remove(o, do_unlink=True)
if rig.animation_data:
    rig.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

for folder, name, bone in [
    ('HeadParts', 'Head01_Male', 'head'),
    ('HeadParts', 'Hair01', 'head'),
    ('HeadParts', 'Eye01', 'head'),
    ('HeadParts', 'Mouth01', 'head'),
    ('HeadParts', 'Eyebrow01', 'head'),
    ('Weapons', 'Spear02', 'weapon_r'),
]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(args.source / 'Mesh' / folder / (name + '.fbx')))
    for o in set(bpy.data.objects) - before:
        if o.type != 'MESH':
            continue
        o.name = name
        o.matrix_world = Matrix.Translation(rig.matrix_world @ rig.data.bones[bone].head_local) @ o.matrix_world
        group = o.vertex_groups.new(name=bone)
        group.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
        o.modifiers.new('Source skeleton', 'ARMATURE').object = rig

material = bpy.data.materials.new('Original palette, plastic finish')
material.use_nodes = True
material['preserveAuthoredRoughness'] = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .3
texture = material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(args.source / 'Texture/DefaultPolyart/Albedo.png'))
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.data.materials.clear()
        o.data.materials.append(material)

paths = {
    'Idle': 'Idle_Battle_Spear.fbx',
    'Walking_A': 'InPlace/MoveFWD_Battle_InPlace_Spear.fbx',
    # Legacy review-slot name; the motion is the author's forward spear thrust.
    '1H_Melee_Attack_Slice_Diagonal': 'Attack02_Spear.fbx',
    'Hit_A': 'GetHit01_Spear.fbx',
    'Death_A_Pose': 'Die01_Spear.fbx',
}
checks = []
for name, rel in paths.items():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(args.source / 'Animation/Spear' / rel))
    added = set(bpy.data.objects) - before
    donor = next(o for o in added if o.type == 'ARMATURE')
    assert set(rig.data.bones.keys()) == set(donor.data.bones.keys())
    delta = max(abs(x - y) for b in rig.data.bones
                for r1, r2 in zip(b.matrix_local, donor.data.bones[b.name].matrix_local)
                for x, y in zip(r1, r2))
    assert delta < 1e-5, (rel, delta)
    assert all((b.parent.name if b.parent else None) ==
               (donor.data.bones[b.name].parent.name if donor.data.bones[b.name].parent else None)
               for b in rig.data.bones)
    action = donor.animation_data.action
    action.name = name
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    rig.animation_data.action = None
    checks.append({'clip': name, 'source': rel, 'maxRestMatrixDelta': delta})
    for o in added:
        bpy.data.objects.remove(o, do_unlink=True)

# The separate weapon FBX is authored upright. Translation to the socket alone
# leaves it upright while the hand thrusts. Fit a single rigid bind-space rotation
# at the attack's extension pose; retain that same grip through every clip.
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = bpy.data.actions['1H_Melee_Attack_Slice_Diagonal']
rig.animation_data.action_slot = rig.animation_data.action.slots[0]
bpy.context.scene.frame_set(9)
bpy.context.view_layer.update()
rest = rig.matrix_world @ rig.data.bones['weapon_r'].matrix_local
posed = rig.matrix_world @ rig.pose.bones['weapon_r'].matrix
target = ((posed @ rest.inverted()).to_3x3().inverted() @ Vector((0, -1, 0))).normalized()
spear = bpy.data.objects['Spear02']
axis = (spear.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
rotation = axis.rotation_difference(target).to_matrix().to_4x4()
spear.matrix_world = Matrix.Translation(rest.translation) @ rotation @ Matrix.Translation(-rest.translation) @ spear.matrix_world
tip_index = max(range(len(spear.data.vertices)), key=lambda i: spear.data.vertices[i].co.y)
tail_index = min(range(len(spear.data.vertices)), key=lambda i: spear.data.vertices[i].co.y)
samples = {}
for frame in (5, 9):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated = spear.evaluated_get(bpy.context.evaluated_depsgraph_get())
    tip = evaluated.matrix_world @ evaluated.data.vertices[tip_index].co
    tail = evaluated.matrix_world @ evaluated.data.vertices[tail_index].co
    samples[frame] = (tip, (tip - tail).normalized())
forward = Vector((0, -1, 0))
extension = (samples[9][0] - samples[5][0]).dot(forward)
alignment = samples[9][1].dot(forward)
assert extension > .5, ('Spear must stab forward', extension)
assert alignment > .98, ('Spear point must lead the thrust', alignment)
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
for track in rig.animation_data.nla_tracks:
    track.mute = False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'source-spear.blend'))
bpy.ops.export_scene.gltf(filepath=str(args.output / 'source-spear.glb'), export_format='GLB',
                         export_extras=True, export_animations=True,
                         export_animation_mode='NLA_TRACKS', export_force_sampling=True)
(args.output / 'source-spear-report.json').write_text(json.dumps({
    'source': str(args.source), 'bodyInventory': body_inventory,
    'sourceBoneCount': len(rig.data.bones), 'clipChecks': checks,
    'spearGrip': {'extensionFrame': 9, 'worldForward': [0, -1, 0],
                  'bindAxis': list(target), 'method': 'constant rigid socket rotation',
                  'forwardTipTravel': extension, 'extensionAlignment': alignment},
    'status': 'Source assembly; grip and visual acceptance still required',
}, indent=2) + '\n')
