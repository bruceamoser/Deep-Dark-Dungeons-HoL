"""Winter Wolf: approved quadruped, icy coat/eyes and dedicated breath pose.
Usage: blender ... -- source-wolf.blend private-output
"""
from pathlib import Path
import bpy, numpy as np, math,sys
from mathutils import Vector,Quaternion
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
body=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
xyz=np.array([v.co[:] for v in body.data.vertices]);x,y,z=xyz.T
smooth=lambda a: np.clip(a,0,1)**2*(3-2*np.clip(a,0,1))
shade=smooth((z-.16)/.16)
color=np.array([.55,.68,.78])*(1-shade[:,None])+np.array([.94,.97,1.])*shade[:,None]
nose=smooth((-y-.223)/.012)*smooth((.307-z)/.012)*smooth((z-.263)/.012)
color=color*(1-nose[:,None])+np.array([.025,.045,.065])*nose[:,None]
linear=np.where(color<=.04045,color/12.92,((color+.055)/1.055)**2.4)
body.data.color_attributes['WolfCoat'].data.foreach_set('color',np.column_stack([linear,np.ones(len(linear))]).astype(np.float32).ravel())
body.data.materials[0].name='Winter Wolf snow and glacial blue'
for m in bpy.data.materials:
 if m.name=='Warm amber iris':
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.02,.48,.9,1);bs.inputs['Emission Color'].default_value=(.02,.3,.8,1);bs.inputs['Emission Strength'].default_value=.65;m.name='Winter Wolf icy iris'
for t in rig.animation_data.nla_tracks:
 if t.name=='Bite_Front':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
# A deliberate inhale then sustained open jaw; no humanoid casting gesture.
a=bpy.data.actions.new('Spellcast_Shoot');rig.animation_data.action=a
for frame,head,chest,jaw in [(1,0,0,0),(9,-7,-3,5),(15,3,4,28),(29,3,4,28),(40,0,0,0)]:
 for b in rig.pose.bones:
  b.matrix_basis.identity();b.rotation_mode='QUATERNION'
  deg={'Head':head,'Chest':chest,'Jaw':jaw}.get(b.name,0)
  axis=b.bone.matrix_local.to_3x3().inverted()@Vector((1,0,0))
  b.rotation_quaternion=Quaternion(axis,math.radians(deg));b.keyframe_insert('rotation_quaternion',frame=frame)
slot=rig.animation_data.action_slot;rig.animation_data.action=None
t=rig.animation_data.nla_tracks.new();t.name=a.name;t.strips.new(a.name,1,a).action_slot=slot;t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-winter-wolf'
bpy.context.view_layer.update()
# A real mouth socket follows Head; breath never launches from a generic hand.
socket=bpy.data.objects.new('BreathMuzzle',None);bpy.context.scene.collection.objects.link(socket)
socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='Head'
bpy.context.view_layer.update()
from mathutils import Matrix
socket.matrix_world=Matrix.Translation((0,-.244,.285))

bpy.ops.wm.save_as_mainfile(filepath=str(out/'winter-wolf.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'winter-wolf.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
