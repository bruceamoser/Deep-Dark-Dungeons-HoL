"""Refine the existing CC0-derived bear recipe without changing the donor rig."""
import bpy,sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
recipe=Path(__file__).parent/'creature-workers/werebear.py'
# Execute only the editable assembly, before its original export/render section.
namespace={'__file__':str(recipe.resolve())}
exec(compile(recipe.read_text().split('BODY = join_body()')[0],str(recipe),'exec'),namespace)
for obj in namespace['AUTHORED']:
 if obj.name.startswith('Fang_'):
  obj.scale.z*=.5
  obj.location.z+=.028 if 'Upper' in obj.name else -.019
 if obj.name.startswith('Eye_') and not obj.name.startswith('Eye_Socket'):
  mat=namespace['material']('Bear amber eyes',(.9,.36,.015),.3,emission=(.45,.12,.004))
  obj.data.materials.clear();obj.data.materials.append(mat)
 if obj.name.startswith('Pupil_'):obj.scale.x*=1.2
# Teeth/claws/buckle must not inherit eye glow.
namespace['IVORY'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=0
body=namespace['join_body']();rig=namespace['RIG']
for b in rig.pose.bones:b.custom_shape=None
for o in list(bpy.context.scene.objects):
 if o not in (body,rig):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'werebear.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'werebear.glb'),export_animations=False,export_extras=True)
