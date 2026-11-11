"""Deform the owned KayKit bow/string and nock its matching owned arrow.
Preserve source topology/UVs. Original hand motions drive the added prop bones.
"""
import bpy,math
from mathutils import Matrix,Vector
from mathutils.kdtree import KDTree

def add_owned_bow(rig,cfg,source,source_matrices):
 bow=bpy.data.objects[cfg['part']];source_world=source_matrices[cfg['part']]
 for t in rig.animation_data.nla_tracks:t.mute=True
 rig.animation_data.action=next(t for t in rig.animation_data.nla_tracks if t.name==cfg['clip']).strips[0].action;rig.animation_data.action_slot=rig.animation_data.action.slots[0]
 bpy.context.scene.frame_set(cfg['fitFrame']);bpy.context.view_layer.update()
 left='handslot.l';right='handslot.r';lh=rig.matrix_world@rig.pose.bones[left].head;rh=rig.matrix_world@rig.pose.bones[right].head;forward=(lh-rh).normalized();side=forward.cross(Vector((0,0,1))).normalized();up=side.cross(forward).normalized();basis=Matrix((forward,up,side)).transposed();basis=Matrix.Rotation(math.radians(cfg.get('cant',15)),3,forward)@basis
 delta=(rig.matrix_world@rig.pose.bones[left].matrix)@(rig.matrix_world@rig.data.bones[left].matrix_local).inverted();anchor=rig.matrix_world@rig.data.bones[left].head_local
 bow.matrix_world=Matrix.Translation(anchor)@delta.to_3x3().inverted().to_4x4()@basis.to_4x4()@Matrix.Diagonal((cfg['scale'],)*3+(1,))@source_world
 transform=bow.matrix_world@source_world.inverted();bow['restForward']=list((transform.to_3x3()@Vector((0,0,1))).normalized())
 # Compare the supplied bare-bow variant to identify ONLY the added cord/knots;
 # the many original disconnected UV seams are deliberately left untouched.
 bare=source(cfg['bare']);mesh=next(o for o in bare if o.type=='MESH');points=[mesh.matrix_world@v.co for v in mesh.data.vertices];tree=KDTree(len(points))
 for i,p in enumerate(points):tree.insert(p,i)
 tree.balance();source_points=[source_world@v.co for v in bow.data.vertices];string=[i for i,p in enumerate(source_points) if tree.find(p)[2]>1e-5]
 assert len(string)==cfg['stringVertices'],('Inspect owned string topology',len(string))
 for obj in bare:bpy.data.objects.remove(obj,do_unlink=True)
 rig.animation_data.action=None
 for b in rig.pose.bones:b.matrix_basis.identity()
 bpy.context.view_layer.update()
 nock=transform@Vector(cfg['stringCenter']);arrow_nock=rig.matrix_world@rig.data.bones[right].head_local;rest_forward=(anchor-arrow_nock).normalized()
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,head,direction,parent in [('BowNock',nock,Vector((0,0,1)),left),('ArrowNock',arrow_nock,rest_forward,right)]:
  bone=rig.data.edit_bones.new(name);bone.head=rig.matrix_world.inverted()@head;bone.tail=rig.matrix_world.inverted()@(head+direction*.1);bone.parent=rig.data.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT')
 nock_rest=rig.matrix_world@rig.data.bones['BowNock'].matrix_local;arrow_rest=rig.matrix_world@rig.data.bones['ArrowNock'].matrix_local
 group=bow.vertex_groups.new(name='BowNock');grip_group=bow.vertex_groups[left]
 for i in string:
  w=max(0,1-abs(source_points[i].y)/cfg['stringHalfLength']);grip_group.add([i],1-w,'REPLACE')
  if w>0:group.add([i],w,'REPLACE')
 bow.shape_key_add(name='Basis');draw=bow.shape_key_add(name='Draw');inverse=source_world.inverted()
 for i,point in enumerate(source_points):
  bent=point.copy();bent.x-=.08*(abs(point.y)/.992)**2;bent.y*=.98;draw.data[i].co=inverse@bent
 added=source(cfg['arrow']);arrow=next(o for o in added if o.type=='MESH');assert sum(o.type=='MESH' for o in added)==1
 original=arrow.matrix_world.copy();arrow.parent=None;arrow.name='Archer_arrow';right_axis=(-rest_forward).cross(Vector((0,0,1))).normalized();up=right_axis.cross(-rest_forward).normalized();arrow_basis=Matrix((right_axis,-rest_forward,up)).transposed()
 arrow.matrix_world=Matrix.Translation(arrow_nock)@arrow_basis.to_4x4()@Matrix.Diagonal((cfg['arrowScale'],)*3+(1,))@Matrix.Translation(Vector((0,-cfg['arrowTailY'],0)))@original
 arrow.vertex_groups.clear();arrow.vertex_groups.new(name='ArrowNock').add(list(range(len(arrow.data.vertices))),1,'REPLACE');arrow.modifiers.new('Owned nocked arrow','ARMATURE').object=rig
 for obj in added:
  if obj!=arrow:bpy.data.objects.remove(obj,do_unlink=True)
 keys=bow.data.shape_keys;keys.animation_data_create();checks=[]
 for track in rig.animation_data.nla_tracks:
  action=track.strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];end=math.ceil(action.frame_range[1]);shooting=track.name==cfg['clip'];key_action=bpy.data.actions.new('Bow flex '+track.name);keys.animation_data.action=key_action
  for frame in range(math.floor(action.frame_range[0]),end+1):
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();lh=rig.matrix_world@rig.pose.bones[left].head;rh=rig.matrix_world@rig.pose.bones[right].head;ld=(rig.matrix_world@rig.pose.bones[left].matrix)@(rig.matrix_world@rig.data.bones[left].matrix_local).inverted();rest_center=ld@nock
   tension=0
   if shooting:
    tension=max(0,min(1,(frame-cfg['drawStart'])/(cfg['fitFrame']-cfg['drawStart'])))
    if frame>=cfg['releaseFrame']:tension=math.exp(-(frame-cfg['releaseFrame'])*1.3)
   target=ld@nock_rest;target.translation=rest_center.lerp(rh,tension);pb=rig.pose.bones['BowNock'];pb.rotation_mode='QUATERNION';pb.matrix=rig.matrix_world.inverted()@target
   direction=(lh+Vector((0,0,.1))-rh).normalized() if shooting or track.name=='Idle' else Vector((-.8,-.4,-.3)).normalized();minimum_z=(.1-rh.z)/(cfg['arrowScale']*(cfg['arrowTailY']+.62))
   if direction.z<minimum_z:
    horizontal=Vector((direction.x,direction.y,0)).normalized()*math.sqrt(max(0,1-minimum_z**2));direction=Vector((horizontal.x,horizontal.y,minimum_z))
   rotation=rest_forward.rotation_difference(direction).to_matrix().to_4x4();target=rotation@arrow_rest;target.translation=rh;ab=rig.pose.bones['ArrowNock'];ab.rotation_mode='QUATERNION';ab.matrix=rig.matrix_world.inverted()@target
   if shooting and cfg['releaseFrame']<=frame<cfg['recoverFrame']:ab.scale*=.001
   for bone in [pb,ab]:
    for channel in ['location','rotation_quaternion','scale']:bone.keyframe_insert(data_path=channel,frame=frame,group=bone.name)
   draw.value=tension;draw.keyframe_insert(data_path='value',frame=frame)
   if shooting and cfg['fitFrame']<=frame<cfg['releaseFrame']:
    bpy.context.view_layer.update();gap=((rig.matrix_world@rig.pose.bones['BowNock'].head)-rh).length;assert gap<1e-5,('Drawn nock left hand',frame,gap);checks.append({'frame':frame,'nockGap':gap})
  keys.animation_data.action=None;kt=keys.animation_data.nla_tracks.new();kt.name=track.name;strip=kt.strips.new(track.name,0,key_action);strip.action_frame_start=0;strip.action_frame_end=end;strip.frame_start=0;strip.frame_end=end;strip.extrapolation='NOTHING';kt.mute=True
 rig.animation_data.action=None
 for b in rig.pose.bones:b.matrix_basis.identity()
 for t in rig.animation_data.nla_tracks:t.mute=False
 for t in keys.animation_data.nla_tracks:t.mute=False
 draw.value=0
 return {'part':cfg['part'],'stringVertices':len(string),'nockChecks':checks,'recipe':cfg}
