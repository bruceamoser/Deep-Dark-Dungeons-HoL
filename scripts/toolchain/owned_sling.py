"""Small authored sling on an owned humanoid rig; source body/weights unchanged.
Two cords, leather pouch, an owned rock and a retained hand anchor. No physics
simulation claim: the inspected swing/release are baked into named source clips.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix

def add_owned_sling(rig,cfg,material):
 for track in rig.animation_data.nla_tracks:track.mute=True
 rig.animation_data.action=None
 for bone in rig.pose.bones:bone.matrix_basis.identity()
 bpy.context.view_layer.update()
 hand=cfg.get('handBone','weapon_r')
 grip=Vector(cfg['grip']) if 'grip' in cfg else rig.matrix_world@rig.data.bones[hand].head_local
 hand_space=(rig.matrix_world@rig.data.bones[hand].matrix_local).inverted()@grip
 length=cfg.get('length',.30);pouch=grip+Vector((0,0,-length))
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 def bone(name,head,tail,parent):
  b=rig.data.edit_bones.new(name);b.head=rig.matrix_world.inverted()@head;b.tail=rig.matrix_world.inverted()@tail;b.parent=rig.data.edit_bones[parent];b.use_deform=True
 bone('SlingPivot',grip,pouch,hand)
 bone('SlingPouch',pouch,pouch+Vector((0,0,-.06)),'SlingPivot')
 bone('SlingRelease',grip+Vector((.012,0,0)),grip+Vector((.012,0,-.04)),'SlingPivot')
 bpy.ops.object.mode_set(mode='OBJECT')
 def mesh(name,verts,faces,paint,weights):
  data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(paint)
  for i,influences in enumerate(weights):
   for group,weight in influences:
    if weight>1e-6:(obj.vertex_groups.get(group) or obj.vertex_groups.new(name=group)).add([i],weight,'REPLACE')
  obj.modifiers.new('Owned hand sling rig','ARMATURE').object=rig
  for face in data.polygons:face.use_smooth=True
  return obj
 for side in [-1,1]:
  verts=[];faces=[];weights=[];steps=18;sides=8
  for i in range(steps+1):
   t=i/steps;point=grip.lerp(pouch,t)+Vector((side*(.012+.035*t),0,0))
   for j in range(sides):
    angle=j*math.tau/sides;verts.append(point+Vector((.007*math.cos(angle),.007*math.sin(angle),0)))
    weights.append([('SlingPivot',1)] if side<0 else [('SlingRelease',1-t),('SlingPouch',t)])
  for i in range(steps):
   for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
  faces.extend([tuple(reversed(range(sides))),tuple(range(steps*sides,(steps+1)*sides))])
  mesh('Sling retention cord' if side<0 else 'Sling release cord',verts,faces,material('#b39666'),weights)
 verts=[];faces=[]
 for i in range(13):
  x=i/12*2-1
  for j in range(9):
   y=j/8*2-1;verts.append(pouch+Vector((.058*x,.043*max(.1,1-x*x)**.5*y,-.025+.024*x*x+.018*y*y)))
 for i in range(12):
  for j in range(8):
   n=i*9+j;faces.append((n,n+9,n+10,n+1))
 cup=mesh('Sling leather pouch',verts,faces,material('#714936'),[[('SlingPouch',1)] for _ in verts]);cup.modifiers.new('Leather thickness','SOLIDIFY').thickness=.006
 # A real owned rock replaces a generic glowing ball.
 file=Path(cfg['stone']);before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(file));added=set(bpy.data.objects)-before
 rock=next(o for o in added if o.type=='MESH');assert sum(o.type=='MESH' for o in added)==1
 points=[rock.matrix_world@v.co for v in rock.data.vertices];minimum=Vector(tuple(min(p[i] for p in points) for i in range(3)));maximum=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(minimum+maximum)/2;size=maximum-minimum
 rock.parent=None;rock.matrix_world=Matrix.Identity(4);rock.name='Slinger_stone'
 for v,point in zip(rock.data.vertices,points):v.co=pouch+Vector(tuple((point[i]-center[i])/size[i]*[.085,.064,.055][i] for i in range(3)))+Vector((0,0,.009))
 rock.data.materials.clear();rock.data.materials.append(material('#74786c'))
 for face in rock.data.polygons:face.material_index=0
 rock.vertex_groups.clear();rock.vertex_groups.new(name='SlingPouch').add(list(range(len(rock.data.vertices))),1,'REPLACE');rock.modifiers.new('Sling payload','ARMATURE').object=rig
 for obj in added:
  if obj!=rock:bpy.data.objects.remove(obj,do_unlink=True)
 for mat in rock.data.materials:
  mat['preserveAuthoredRoughness']=True
  if mat.use_nodes:mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.3
 rest=rig.matrix_world@rig.data.bones['SlingPivot'].matrix_local
 for track in rig.animation_data.nla_tracks:
  action=track.strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];end=int(action.frame_range[1]);throwing=track.name==cfg['clip']
  for frame in range(1,end+1):
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();anchor=rig.matrix_world@rig.pose.bones[hand].matrix@hand_space
   theta=0
   if throwing:
    if frame<=cfg['releaseFrame']:theta=(frame-1)/(cfg['releaseFrame']-1)*math.pi/2
    else:theta=max(0,1-(frame-cfg['releaseFrame'])/max(1,end-cfg['releaseFrame']))*math.pi/2
   if track.name=='Death_A_Pose':theta=min(1,(frame-1)/10)*math.pi/2
   theta=max(theta,math.acos(max(0,min(1,(anchor.z-.045)/length))))
   direction=Vector((-.13,-math.sin(theta),-math.cos(theta))).normalized()
   desired=Vector((0,0,-1)).rotation_difference(direction).to_matrix().to_4x4()@rest;desired.translation=anchor
   pivot=rig.pose.bones['SlingPivot'];pivot.rotation_mode='QUATERNION';pivot.matrix=rig.matrix_world.inverted()@desired;bpy.context.view_layer.update()
   free=rig.pose.bones['SlingRelease'];free.rotation_mode='QUATERNION';free.matrix_basis.identity();bpy.context.view_layer.update()
   if throwing and frame>=cfg['releaseFrame']:
    amount=math.sin(math.pi*(frame-cfg['releaseFrame'])/max(1,end-cfg['releaseFrame']))
    target=(rig.matrix_world@free.matrix).copy();target.translation+=Vector((.09,-.12,-.05))*amount;free.matrix=rig.matrix_world.inverted()@target
   for b in [pivot,free]:
    for channel in ['location','rotation_quaternion','scale']:b.keyframe_insert(data_path=channel,frame=frame,group=b.name)
 rig.animation_data.action=None
 for bone in rig.pose.bones:bone.matrix_basis.identity()
 for track in rig.animation_data.nla_tracks:track.mute=False
 deps=[file];doc=json.loads(file.read_text())
 for ref in doc.get('buffers',[])+doc.get('images',[]):
  uri=ref.get('uri','')
  if uri and not uri.startswith('data:'):deps.append(file.parent/uri)
 return {'part':'Sling','purpose':'Authored missing two-cord sling on owned hand; owned rock payload','recipe':cfg}, {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in deps}
