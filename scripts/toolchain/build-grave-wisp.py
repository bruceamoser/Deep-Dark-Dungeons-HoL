"""Owned recessed skull face within original animated mist sweeps; private output."""
import bpy,math,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
source=Path.home()/'.local/share/four-lanterns-creature-production/bone-sentry/bone-sentry.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
old=next(o for o in bpy.data.objects if o.type=='ARMATURE');old.animation_data.action=None
for t in old.animation_data.nla_tracks:t.mute=True
for b in old.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
faces=[]
for name in ['Skeleton_Minion_Head','Skeleton_Minion_Jaw']:
 o=bpy.data.objects[name];points=[o.matrix_world@v.co for v in o.data.vertices];faces.append((o.data.copy(),points))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
arm=bpy.data.armatures.new('Grave Wisp Rig');rig=bpy.data.objects.new('Grave Wisp',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in [('Root',(0,0,0),(0,0,.1),None),('Core',(0,0,.8),(0,0,1.05),'Root'),('LowerMist',(0,0,.4),(0,0,.65),'Root'),('MiddleMist',(0,0,.75),(0,0,1),'Root'),('UpperMist',(0,0,1.05),(0,0,1.3),'Root')]:
 b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
def material(name,c,alpha,emission):
 m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=.4;s.inputs['Alpha'].default_value=alpha;s.inputs['Emission Color'].default_value=(*c,1);s.inputs['Emission Strength'].default_value=emission
 if alpha<1:m.surface_render_method='DITHERED'
 m['preserveAuthoredRoughness']=True;return m
ivory=material('Pale witness face',(.72,.84,.60),.65,.35);mist=material('Ivory spectral currents',(.64,.80,.64),.48,.45);mint=material('Mint deep currents',(.18,.45,.32),.45,.3);light=material('Luminous fine currents',(.9,.96,.69),.8,.8)
parts=[]
def bind(mesh,name,mat,bone):
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.clear();mesh.materials.append(mat);o.parent=rig;o.vertex_groups.new(name=bone).add(list(range(len(mesh.vertices))),1,'REPLACE');o.modifiers.new('Spectral drift','ARMATURE').object=rig;parts.append(o);return o
allpoints=[p for _,ps in faces for p in ps];lo=Vector([min(p[i] for p in allpoints) for i in range(3)]);hi=Vector([max(p[i] for p in allpoints) for i in range(3)]);mid=(lo+hi)/2
for i,(mesh,points) in enumerate(faces):
 for v,p in zip(mesh.vertices,points):v.co=Vector(((p.x-mid.x)*.34/(hi.x-lo.x),(p.y-mid.y)*.25/(hi.y-lo.y)-.04,(p.z-mid.z)*.46/(hi.z-lo.z)+.91))
 for f in mesh.polygons:f.use_smooth=True
 bind(mesh,'Faint face '+str(i),ivory,'Core')
def sweep(name,points,width,depth,mat,bone):
 verts=[];polys=[];last=None;N=len(points);S=10
 for i,p in enumerate(points):
  tangent=Vector(points[min(i+1,N-1)])-Vector(points[max(i-1,0)]);tangent.normalize();normal=last-tangent*last.dot(tangent) if last else tangent.cross(Vector((0,0,1)))
  if normal.length<.01:normal=tangent.cross(Vector((0,1,0)))
  normal.normalize();last=normal.copy();side=tangent.cross(normal).normalized();t=i/(N-1);taper=max(.015,math.sin(math.pi*t)**.65)
  for j in range(S):
   a=j*math.tau/S;verts.append(Vector(p)+(normal*math.cos(a)*width+side*math.sin(a)*depth)*taper)
  if i:
   for j in range(S):polys.append(((i-1)*S+j,(i-1)*S+(j+1)%S,i*S+(j+1)%S,i*S+j))
 polys.extend([tuple(reversed(range(S))),tuple((N-1)*S+j for j in range(S))]);mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],polys);mesh.update()
 for f in mesh.polygons:f.use_smooth=True
 bind(mesh,name,mat,bone)
for level,bone in enumerate(['LowerMist','MiddleMist','UpperMist']):
 for j in range(3):
  pts=[]
  for i in range(45):
   t=i/44;a=j*math.tau/3+level*.73+.5*math.sin(t*4+level);r=.13+.13*math.sin(t*math.pi);z=.10+t*(1.06+level*.12)
   pts.append((math.cos(a)*r+.10*math.sin(t*7+level),math.sin(a)*r,z))
  sweep('Ghost current '+str(level)+str(j),pts,.075,.035,mist if j!=1 else mint,bone)
  sweep('Bright rim '+str(level)+str(j),[(x*.98,y*.98,z+.018) for x,y,z in pts],.012,.017,light,bone)
# Broad side wisps frame the face instead of covering its sockets.
for side in [-1,1]:
 pts=[]
 for i in range(55):
  t=i/54;pts.append((side*(.22+.12*math.sin(t*7)),.02+.05*math.sin(t*5),.3+1.04*t))
 sweep('Side veil '+str(side),pts,.085,.04,mist,'MiddleMist')
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Grave_Wisp_Form'
scene=bpy.context.scene;scene.render.fps=30
for name,end in [('Idle',60),('Walking_A',40),('1H_Melee_Attack_Slice_Diagonal',30),('Spellcast_Shoot',30),('Hit_A',22),('Death_A_Pose',45)]:
 rig.animation_data_create();rig.animation_data.action=None
 for b in rig.pose.bones:b.matrix_basis.identity();b.rotation_mode='XYZ'
 for f in range(1,end+1):
  t=(f-1)/(end-1);q=t*math.tau;scene.frame_set(f);root=rig.pose.bones['Root'];root.location=(.025*math.sin(q),0,.035*math.sin(q));root.scale=(1,1,1)
  if name=='Walking_A':root.rotation_euler=(.08*math.sin(q),.07*math.cos(q),0)
  if name in ['1H_Melee_Attack_Slice_Diagonal','Spellcast_Shoot']:
   pulse=math.sin(math.pi*t)**2;root.location.y=-.28*pulse;root.scale=(1+.15*pulse,1+.15*pulse,1+.1*pulse)
  if name=='Hit_A':root.location.y=.12*math.sin(math.pi*t);root.rotation_euler.x=-.22*math.sin(math.pi*t)
  if name=='Death_A_Pose':root.scale=(max(.025,1-t),)*3;root.location.z=.1*t
  root.location=root.bone.matrix_local.to_3x3().inverted()@root.location;root.keyframe_insert('location',frame=f);root.keyframe_insert('rotation_euler',frame=f);root.keyframe_insert('scale',frame=f)
  for k,b in enumerate(rig.pose.bones):
   if b.name=='Root':continue
   b.rotation_euler=(.05*math.sin(q+k),.06*math.sin(q+k),.1*math.sin(q+k));b.keyframe_insert('rotation_euler',frame=f)
 action=rig.animation_data.action;action.name=name;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
scene.frame_set(1);rig['fldCreature']='creature-grave-wisp';(out/'sources.json').write_text(json.dumps({'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'parts':'Owned KayKit Skeleton Minion head/jaw only; new mist sweeps and five-bone animation'},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'grave-wisp.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'grave-wisp.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
