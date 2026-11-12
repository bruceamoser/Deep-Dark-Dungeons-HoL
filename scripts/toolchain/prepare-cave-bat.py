"""Preserve the clean-sheet bat rig; separate existing green membranes for paint.
Lift flight clips and land the full death on the floor, without a new skeleton.
"""
from pathlib import Path
import bpy,numpy as np,sys
from mathutils import Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=bpy.data.objects['geometry_0'];rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
image=next(n.image for n in body.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');w,h=image.size;pixels=np.array(image.pixels[:]).reshape(h,w,4);uv=body.data.uv_layers.active.data
membrane=body.data.materials[0].copy();membrane.name='Bat forest leather';body.data.materials.append(membrane)
count=0
for p in body.data.polygons:
 u,v=np.mean([uv[i].uv[:] for i in p.loop_indices],axis=0);r,g,b=pixels[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w))),:3]
 if g>r*1.12 and b>r*1.08:p.material_index=1;count+=1
assert count>500,('Missing membrane mask',count)
print('Membrane faces',count)
for t in rig.animation_data.nla_tracks:
 if t.name=='Unarmed_Melee_Attack_Punch_A':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0]
 start,end=int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)
 # Sample original values before inserting keys to avoid interpolation feedback.
 poses=[]
 for f in range(start,end+1):
  bpy.context.scene.frame_set(f);poses.append((f,rig.pose.bones['Root'].location.copy()))
 for f,original in poses:
  bpy.context.scene.frame_set(f);root=rig.pose.bones['Root'];root.location=original;basis=root.bone.matrix_local.to_3x3().inverted()
  if t.name=='Death_A_Pose':
   bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);target=.13*(1-(f-start)/(end-start))**2+.001;root.location+=basis@Vector((0,0,target-low))
  else:root.location+=basis@Vector((0,0,.13))
  root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-cave-bat'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cave-bat-base.blend'))
