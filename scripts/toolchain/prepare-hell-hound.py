"""Private Wolf donor into a furnace-jawed hound before TextureCraft surfacing."""
from pathlib import Path
import bpy,sys
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=bpy.data.objects['geometry_0']
for t in rig.animation_data.nla_tracks:
 if t.name=='Bite_Front':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
# Keep nose/lips black while the coat becomes heat-cracked charcoal.
black=bpy.data.materials['Obsidian eyes and lips'];body.data.materials.append(black)
for p in body.data.polygons:
 c=p.center
 if c.y<-.232 and .266<c.z<.301:p.material_index=1
for attr in list(body.data.color_attributes):body.data.color_attributes.remove(attr)
for mat in bpy.data.materials:
 if mat.name in {'Warm amber iris','Mouth interior'}:
  bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.15,.006,1);bs.inputs['Emission Color'].default_value=(1,.1,.002,1);bs.inputs['Emission Strength'].default_value=2
 if mat.name=='Ivory teeth':
  bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.7,.2,1);bs.inputs['Emission Color'].default_value=(1,.2,.005,1);bs.inputs['Emission Strength'].default_value=.6
rig['fldCreature']='creature-hell-hound';bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'hell-hound-base.blend'))
