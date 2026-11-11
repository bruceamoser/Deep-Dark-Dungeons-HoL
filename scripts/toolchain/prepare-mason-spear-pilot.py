"""Private source-assembly test; never replaces runtime assets or edits sources.

Run in an isolated Blender process with SOURCE_DIR OUTPUT_DIR after --.
This tests the author's spear clips on the author's body, not a final creature.
"""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix

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
    '1H_Melee_Attack_Slice_Diagonal': 'Attack01_Spear.fbx',
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
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output / 'source-spear.blend'))
bpy.ops.export_scene.gltf(filepath=str(args.output / 'source-spear.glb'), export_format='GLB',
                         export_extras=True, export_animations=True,
                         export_animation_mode='NLA_TRACKS', export_force_sampling=True)
(args.output / 'source-spear-report.json').write_text(json.dumps({
    'source': str(args.source), 'bodyInventory': body_inventory,
    'sourceBoneCount': len(rig.data.bones), 'clipChecks': checks,
    'status': 'Source assembly; grip and visual acceptance still required',
}, indent=2) + '\n')
