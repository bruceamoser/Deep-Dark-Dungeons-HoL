"""Adapt the refined Scout anatomy with the reusable Trapkeeper outfit.

Usage: blender -b --python build-kobold-trapkeeper-refined.py -- SCOUT_GLB OUTPUT
Inputs and output are private; original donor files remain unchanged.
"""
import importlib.util
from pathlib import Path
import sys
import bpy
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('trap',root/'scripts/toolchain/creature-workers/kobold-trapkeeper.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.SOURCE,m.OUTPUT=map(Path,sys.argv[sys.argv.index('--')+1:])
m.OUTPUT.mkdir(parents=True,exist_ok=True)
m.add_render_setup=lambda:None
m.render_views=lambda camera:None
# Original cheek decorations float outside the refined inset-eye head.
m.add_face_marks=lambda *args:None
original=m.consolidate_rigid_props
def consolidate(props,mats):
    darts=[o for o in props if o.name.startswith('Readied_Dart')]
    original([o for o in props if o not in darts],mats)
    original(darts,mats)
    bpy.context.view_layer.objects.active.name='Loaded_Dart'
m.consolidate_rigid_props=consolidate
m.main()
body=bpy.data.objects['KoboldTrapkeeper_Body']
props=bpy.data.objects['Trapkeeper_Rigid_Props']
# Apron and throat share a legacy color, but must remain distinct surfaces.
props.data.materials[2]=props.data.materials[2].copy()
props.data.materials[2].name='Trapkeeper_Apron'
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
props.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
# Preserve polygon slot indices after joining.
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
marker=bpy.data.objects.new('TrapkeeperDartMuzzle',None)
bpy.context.collection.objects.link(marker)
marker.parent=rig
marker.parent_type='BONE'
marker.parent_bone='hand.r'
bpy.context.view_layer.update()
world=Vector((-1.030,-.295,.835))
rotation=(world-Vector((-.890,-.085,1.045))).to_track_quat('Y','Z').to_matrix().to_4x4()
rotation.translation=world
marker.matrix_world=rotation
bpy.ops.wm.save_as_mainfile(filepath=str(m.OUTPUT/'KoboldTrapkeeper.blend'))
bpy.ops.export_scene.gltf(filepath=str(m.OUTPUT/'KoboldTrapkeeper.glb'),export_extras=True,export_animations=False)
