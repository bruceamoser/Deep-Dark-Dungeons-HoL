"""Blender GLB import/export/reimport probe, using only an isolated process."""
import json
from pathlib import Path
import sys
import bpy
source, destination = map(Path, sys.argv[sys.argv.index('--') + 1:])
destination.mkdir(parents=True, exist_ok=True)
def snapshot():
    return {
        'bones': sorted(len(o.data.bones) for o in bpy.context.scene.objects if o.type == 'ARMATURE'),
        'actions': sorted(a.name for a in bpy.data.actions),
        'skinned_meshes': sum(any(m.type == 'ARMATURE' for m in o.modifiers) for o in bpy.context.scene.objects if o.type == 'MESH'),
        'images': sum(i.source == 'FILE' and i.size[0] > 0 for i in bpy.data.images),
    }
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
before = snapshot()
output = destination / (source.stem + '-roundtrip.glb')
assert output.resolve() != source.resolve()
bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_skins=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(output.resolve()))
after = snapshot()
assert before['bones'] == after['bones'], (before, after)
assert len(before['actions']) == len(after['actions']), (before, after)
assert before['skinned_meshes'] == after['skinned_meshes'], (before, after)
assert before['images'] == after['images'], (before, after)
(destination / 'roundtrip.json').write_text(json.dumps({'source': str(source), 'before': before, 'after': after, 'note': 'Structural preservation only; no claim of full deformation/render equivalence.'}, indent=2)+'\n')
print('GLB_ROUNDTRIP_PASS', before)
