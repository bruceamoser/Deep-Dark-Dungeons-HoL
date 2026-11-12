"""Reuse refined kobold anatomy and the owned Emberkeeper gear recipe.
Usage: blender -b --python THIS -- REFINED_SCOUT_GLB PRIVATE_OUTPUT
"""
import importlib.util
from pathlib import Path
import sys
import shutil
import bpy
root=Path(__file__).resolve().parents[2]
def load(name):
    spec=importlib.util.spec_from_file_location(name,root/f'scripts/toolchain/creature-workers/{name}.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module
m=load('kobold-emberkeeper')
trap=load('kobold-trapkeeper')
m.SOURCE,m.OUTPUT=map(Path,sys.argv[sys.argv.index('--')+1:])
m.OUTPUT.mkdir(parents=True,exist_ok=True)
m.add_head=lambda *args:None
m.add_render_setup=lambda *args:None
m.render_views=lambda *args:None
def adopt(obj,palette):
    trap.remove_scout_weapon_components(obj)
    if len(obj.data.materials)!=len(palette):raise ValueError('Expected eight donor slots')
    for index,mat in enumerate(palette):obj.data.materials[index]=mat
    for index in range(len(palette)):
        group=obj.vertex_groups.new(name=f'MAT_{index}')
        vertices=sorted({v for p in obj.data.polygons if p.material_index==index for v in p.vertices})
        if vertices:group.add(vertices,1,'REPLACE')
m.adopt_palette_by_slot=adopt
m.ROOT=m.OUTPUT
(m.ROOT/'input').mkdir(exist_ok=True)
shutil.copy2(root/'public/vendor/hol/assets/bestiary/creature-kobold-emberkeeper.webp',m.ROOT/'input/reference.webp')
shutil.copy2(root/'public/assets/characters/LICENSE.txt',m.ROOT/'input/LICENSE.txt')
from types import SimpleNamespace
m.os=SimpleNamespace(_exit=lambda code: None)
m.main()

# Give the suspended cup a controllable joint without changing source bones.
from mathutils import Vector
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
prop=bpy.data.objects['HangingBrazier']
world=prop.matrix_world.copy()
for i,mat in enumerate(prop.data.materials):
    prop.data.materials[i]=mat.copy()
    prop.data.materials[i].name='Brazier_'+mat.name
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
bone=rig.data.edit_bones.new('brazier')
bone.head=world.translation
bone.tail=world.translation+Vector((0,0,.10))
bone.parent=rig.data.edit_bones['hand.l']
bpy.ops.object.mode_set(mode='OBJECT')
prop.parent=None
prop.matrix_world=world
m.skin_rigid(prop,rig,'brazier')
bpy.ops.wm.save_as_mainfile(filepath=str(m.OUTPUT/'KoboldEmberkeeper.blend'))
