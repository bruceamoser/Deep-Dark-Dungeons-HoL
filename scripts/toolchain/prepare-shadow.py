"""Preserve multiview Shadow geometry/rig; separate coal, flames and smoke, ground clips."""
from pathlib import Path
import bpy,numpy as np,sys
from mathutils import Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=bpy.data.objects['geometry_0'];rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
image=next(n.image for n in body.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');w,h=image.size;pixels=np.array(image.pixels[:]).reshape(h,w,4);uv=body.data.uv_layers.active.data
for name in ['ShadowEdges','PaleEyes']:
 m=body.data.materials[0].copy();m.name=name;body.data.materials.append(m)
counts=[0,0,0]
for p in body.data.polygons:
 u,v=np.mean([uv[i].uv[:] for i in p.loop_indices],axis=0);r,g,b=pixels[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w))),:3]
 p.material_index=2 if r>.7 else 1 if b>.5 else 0;counts[p.material_index]+=1
assert min(counts)>20,counts
print('Material faces',counts)
m=body.data.materials[2];m.node_tree.nodes.clear();n=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');n.inputs['Base Color'].default_value=(.8,.85,.56,1);n.inputs['Emission Color'].default_value=(.8,.85,.56,1);n.inputs['Emission Strength'].default_value=2;n.inputs['Roughness'].default_value=.4;output=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(n.outputs[0],output.inputs['Surface']);m['preserveAuthoredRoughness']=True
for t in rig.animation_data.nla_tracks:
 if t.name=='Unarmed_Melee_Attack_Punch_A':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0]
 if t.name=='1H_Melee_Attack_Slice_Diagonal':
  from mathutils import Matrix
  bpy.context.scene.frame_set(1)
  rest_rot={name:rig.pose.bones[name].rotation_quaternion.copy() for name in ['RUpperArm','RForearm']}
  bag=a.layers[0].strips[0].channelbag(a.slots[0])
  for curve in list(bag.fcurves):
   if any(curve.data_path==f'pose.bones["{name}"].rotation_quaternion' for name in rest_rot):bag.fcurves.remove(curve)
  for f in [1,32]:
   bpy.context.scene.frame_set(f)
   for name,rotation in rest_rot.items():
    bone=rig.pose.bones[name];bone.rotation_quaternion=rotation;bone.keyframe_insert('rotation_quaternion',frame=f)
  for f,upper,fore in [(8,(-.3,.3,-1),(0,-.8,.25)),(14,(-.12,-1,-.10),(0,-1,.12)),(20,(-.1,-1,-.15),(0,-1,.1))]:
   bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
   for name,direction in [('RUpperArm',upper),('RForearm',fore)]:
    bone=rig.pose.bones[name];rest=bone.bone;rotation=(rest.tail_local-rest.head_local).normalized().rotation_difference(Vector(direction).normalized())@rest.matrix_local.to_quaternion()
    bone.matrix=Matrix.Translation(bone.head)@rotation.to_matrix().to_4x4();bpy.context.view_layer.update();bone.keyframe_insert('rotation_quaternion',frame=f)
 start,end=int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)
 # Sample original values before inserting keys to avoid interpolation feedback.
 poses=[]
 for f in range(start,end+1):
  bpy.context.scene.frame_set(f);poses.append((f,rig.pose.bones['Root'].location.copy()))
 for f,original in poses:
  bpy.context.scene.frame_set(f);root=rig.pose.bones['Root'];root.location=original;root.scale=(max(.03,1-(f-start)/max(1,end-start)),)*3 if t.name=='Death_A_Pose' else (1,1,1);root.keyframe_insert('scale',frame=f);basis=root.bone.matrix_local.to_3x3().inverted()
  bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);root.location+=basis@Vector((0,0,.001-low))
  root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-shadow';rig.scale=(.85,1,1.08)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'shadow-base.blend'))
