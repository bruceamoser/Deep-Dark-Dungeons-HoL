"""Author a bounded held-prop contact clip on the inspected source arm chain.
Preserves the source skeleton/weights/fingers; only arm poses are solved.
"""
import bpy,json,math
from mathutils import Matrix,Vector

def author_prop_strike(rig,cfg):
 for track in rig.animation_data.nla_tracks:track.mute=True
 source=next(t.strips[0].action for t in rig.animation_data.nla_tracks if t.name=='Idle')
 rig.animation_data.action=source;rig.animation_data.action_slot=source.slots[0]
 bpy.context.scene.frame_set(cfg['referenceFrame']);bpy.context.view_layer.update()
 base={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
 world=lambda name:rig.matrix_world@rig.pose.bones[name].matrix
 sockets={side:world('weapon_'+side).copy() for side in ['l','r']}
 hand_offsets={side:world('hand_'+side).inverted()@sockets[side] for side in ['l','r']}
 def landmark(part,key,bone):
  point=Vector(json.loads(bpy.data.objects[part]['fitLandmarks'])[key])
  return world(bone)@(rig.matrix_world@rig.data.bones[bone].matrix_local).inverted()@point
 pan=landmark(cfg['pan'],'strike','weapon_l');tip=landmark(cfg['mallet'],'tip','weapon_r');center=landmark(cfg['mallet'],'center','weapon_r')
 left=sockets['l'].copy();left.translation=Vector(cfg['leftSocket'])
 target=left@sockets['l'].inverted()@pan
 axis=tip-center;yaw=math.pi/2-math.atan2(axis.y,axis.x)
 right=sockets['r'].copy();right=Matrix.Rotation(yaw,4,'Z')@right
 tip_local=sockets['r'].inverted()@tip;right.translation=target-right.to_3x3()@tip_local
 contact={'l':left,'r':right}
 def arm(side,desired_socket):
  desired_hand=desired_socket@hand_offsets[side].inverted()
  names=['upperarm_'+side,'lowerarm_'+side,'hand_'+side]
  a,b,c=[world(n).translation.copy() for n in names];end=desired_hand.translation
  l1=(b-a).length;l2=(c-b).length;delta=end-a;distance=delta.length
  assert abs(l1-l2)+1e-5<distance<l1+l2-1e-5,('Unreachable authored wrist',side,distance,l1+l2)
  direction=delta.normalized();pole=b-a;pole= pole-direction*pole.dot(direction)
  if pole.length<1e-5:pole=Vector((1 if side=='l' else -1,.1,-.5));pole-=direction*pole.dot(direction)
  pole.normalize()
  along=(l1*l1-l2*l2+distance*distance)/(2*distance);elbow=a+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
  def rotate_joint(name,pivot,old,new):
   rotation=old.rotation_difference(new).to_matrix().to_4x4()
   rig.pose.bones[name].matrix=rig.matrix_world.inverted()@Matrix.Translation(pivot)@rotation@Matrix.Translation(-pivot)@world(name)
   bpy.context.view_layer.update()
  rotate_joint(names[0],a,b-a,elbow-a)
  b=world(names[1]).translation;c=world(names[2]).translation
  rotate_joint(names[1],b,c-b,end-b)
  actual=world(names[2]).translation.copy()
  assert (actual-end).length<.003,('Wrist solve drift',side,(actual-end).length)
  desired_hand.translation=actual;rig.pose.bones[names[2]].matrix=rig.matrix_world.inverted()@desired_hand;bpy.context.view_layer.update()
 action=bpy.data.actions.new(cfg['clip']);rig.animation_data.action=action
 for bone in rig.pose.bones:bone.rotation_mode='QUATERNION'
 max_gap=0
 for frame in range(1,cfg['frames']+1):
  for name,matrix in base.items():rig.pose.bones[name].matrix_basis=matrix
  bpy.context.view_layer.update()
  # Raise both props, one forward tap, then recover to the source idle pose.
  t=(frame-1)/(cfg['contactFrame']-1) if frame<=cfg['contactFrame'] else (cfg['frames']-frame)/(cfg['frames']-cfg['contactFrame'])
  t=max(0,min(1,t));weight=t*t*(3-2*t)
  for side in ['l','r']:
   desired=sockets[side].lerp(contact[side],weight)
   if side=='r' and frame<cfg['contactFrame']:
    desired.translation+=Vector((0,-.07,.05))*math.sin(math.pi*t)
   arm(side,desired)
  if frame==cfg['contactFrame']:
   gap=(landmark(cfg['mallet'],'tip','weapon_r')-landmark(cfg['pan'],'strike','weapon_l')).length;max_gap=max(max_gap,gap);assert gap<.005,('Prop contact mismatch',gap)
  for bone in rig.pose.bones:
   for channel in ['location','rotation_quaternion','scale']:bone.keyframe_insert(data_path=channel,frame=frame,group=bone.name)
 track=rig.animation_data.nla_tracks.new();track.name=cfg['clip'];track.strips.new(cfg['clip'],1,action);rig.animation_data.action=None
 for bone in rig.pose.bones:bone.matrix_basis.identity()
 for track in rig.animation_data.nla_tracks:track.mute=False
 return {'part':'arm pose','purpose':'Authored mallet-to-pan contact on preserved owned source rig','recipe':cfg,'contactGap':max_gap}
