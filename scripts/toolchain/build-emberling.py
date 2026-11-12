"""Fit owned KayKit stone variants to the reviewed Clay Helper rig and clips."""
import bpy,bmesh,sys,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector,Euler
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
source=Path.home()/'.local/share/four-lanterns-creature-production/clay-helper/final/clay-helper.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
for o in list(bpy.data.objects):
 if o!=rig:bpy.data.objects.remove(o,do_unlink=True)
assert len(rig.data.bones)==18
owned=Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/KayKit-v8/The Complete KayKit Collection v8/KayKit Space Base Bits 1.0/Assets/gltf')
variants=[];sources={str(source):hashlib.sha256(source.read_bytes()).hexdigest()}
for letter in ['A','B','A']:
 path=owned/f'rock_{letter}.gltf';sources[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest();before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=set(bpy.data.objects)-before
 obj=next(o for o in objects if o.type=='MESH');points=[obj.matrix_world@v.co for v in obj.data.vertices];low=Vector([min(v[i] for v in points) for i in range(3)]);high=Vector([max(v[i] for v in points) for i in range(3)]);mid=(low+high)/2
 # These props are half-boulders with flat ground bases. Mirror the curved
 # half across its equator, removing only the internal planar base faces.
 normalized=[Vector(((p.x-mid.x)*2/(high.x-low.x),(p.y-mid.y)*2/(high.y-low.y),(p.z-low.z)/(high.z-low.z))) for p in points]
 n=len(normalized);verts=normalized+[Vector((p.x,p.y,-p.z)) for p in normalized];faces=[]
 for face in obj.data.polygons:
  ids=list(face.vertices)
  if all(abs(normalized[i].z)<1e-5 for i in ids):continue
  faces.append(ids);faces.append([i+n for i in reversed(ids)])
 mesh=bpy.data.meshes.new('Adapted complete boulder');mesh.from_pydata(verts,[],faces);mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();variants.append(mesh)
 print('Owned stone',letter,len(obj.data.vertices),len(obj.data.polygons))
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
def mat(name,c,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=.8;s.inputs['Emission Color'].default_value=(*c,1);s.inputs['Emission Strength'].default_value=emit;m['preserveAuthoredRoughness']=True;return m
stone=mat('Emberling limestone',(.025,.012,.009));moss=mat('Emberling moss',(.14,.022,.004));dark=mat('Deep rock eye sockets',(.16,.025,.001));amber=mat('Amber mineral eyes',(1,.62,.035),3)
rng=random.Random(17);parts=[]
def bind(o,m,bone):
 o.data.materials.clear();o.data.materials.append(m);o.parent=rig;o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Preserved clay anatomy','ARMATURE').object=rig;parts.append(o);return o
def rock(name,p,s,bone,index=0,material=stone):
 mesh=variants[index%len(variants)].copy();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);rot=Euler([rng.uniform(-.18,.18) for _ in range(3)]).to_matrix()
 for v in mesh.vertices:v.co=rot@Vector([v.co[i]*s[i] for i in range(3)])+Vector(p)
 return bind(o,material,bone)
rock('Chest keystone',(.016,-.01,.285),(.087,.068,.076),'Chest',0)
rock('Core',(.016,.005,.225),(.072,.06,.055),'Spine',1)
rock('Pelvis',(.016,.01,.17),(.089,.064,.042),'Pelvis',2)
rock('Face stone',(.016,-.015,.39),(.078,.068,.075),'Head',1)
for side,prefix in [(-1,'R'),(1,'L')]:
 for suffix,size in [('UpperArm',(.057,.058,.061)),('Forearm',(.049,.05,.055)),('Hand',(.066,.060,.056)),('Thigh',(.051,.055,.060)),('Shin',(.044,.05,.048))]:
  bone=rig.data.bones[prefix+suffix];center=bone.head_local.lerp(bone.tail_local,.5);rock(prefix+suffix,center,size,bone.name,0 if suffix=='Hand' else 1 if suffix=='UpperArm' else 2)
 foot=rig.data.bones[prefix+'Foot'];rock(prefix+' planted foot',(foot.head_local.x,-.025,.035),(.061,.081,.035),foot.name,0)
 # Smaller stones close each joint; deliberate clusters instead of a smooth body.
 for suffix in ['UpperArm','Forearm','Hand','Thigh','Shin']:
  bone=rig.data.bones[prefix+suffix]
  for j in range(3):
   offset=Vector((math.cos(j*math.tau/3)*.025,math.sin(j*math.tau/3)*.025,0));rock(prefix+suffix+' joint pebble',bone.head_local+offset,(.025,.025,.023),bone.name,j,moss if j==0 else stone)
 for j in range(3):rock(prefix+' toe',(foot.head_local.x+(j-1)*.029,-.085,.026),(.022,.031,.022),foot.name,j)
# Ray-fit focal eyes to the actual adapted face, not a guessed outer plane.
from mathutils.bvhtree import BVHTree
face=next(o for o in parts if o.name=='Face stone');tree=BVHTree.FromPolygons([v.co[:] for v in face.data.vertices],[list(p.vertices) for p in face.data.polygons])
for x in [-.006,.038]:
 point,normal,_,_=tree.ray_cast(Vector((x,-.2,.402)),Vector((0,1,0)));assert point is not None
 for label,radius,depth,material in [('socket',.018,.001,dark),('glow',.012,.006,amber)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=point+Vector((0,-depth,0)));o=bpy.context.object;o.name='Emberling '+label;o.scale=(radius,radius*.35,radius*.55);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bind(o,material,'Head')
# Animated flame joints: preserve the inherited anatomy and add only plume bones.
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
flames=[('CrownFlame','Head',(.016,.005,.44),.15),('BackFlame','Chest',(.016,.05,.31),.13),('RightFlame','RHand',(-.18,.01,.20),.085),('LeftFlame','LHand',(.20,.01,.20),.085)]
for name,parent,origin,length in flames:
 b=rig.data.edit_bones.new(name);b.head=origin;b.tail=Vector(origin)+Vector((0,0,length));b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
orange=mat('Hot orange flame',(1,.115,.005),1.2);yellow=mat('Golden flame heart',(1,.58,.025),1.5)
def tongue(name,origin,length,width,bone,phase,material):
 verts=[];faces=[];N=25;S=10
 for i in range(N):
  t=i/(N-1);center=Vector(origin)+Vector((math.sin(t*5+phase)*width*t,.018*math.sin(t*4+phase)*t,length*t));radius=width*(math.sin(math.pi*t)**.65+.025)*(1-.35*t)
  for j in range(S):
   a=j*math.tau/S;verts.append(center+Vector((math.cos(a)*radius,math.sin(a)*radius*.55,0)))
  if i:
   for j in range(S):faces.append(((i-1)*S+j,(i-1)*S+(j+1)%S,i*S+(j+1)%S,i*S+j))
 faces.append(tuple(reversed(range(S))));faces.append(tuple((N-1)*S+j for j in range(S)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 for f in mesh.polygons:f.use_smooth=True
 bind(o,material,bone)
for k,(bone,parent,origin,length) in enumerate(flames):
 for j in range(3):
  p=Vector(origin)+Vector(((j-1)*.025,0,0));tongue(bone+str(j),p,length*(1 if j==1 else .72),.028 if k<2 else .018,bone,j,orange)
  tongue(bone+' heart'+str(j),p+Vector((0,-.012,0)),length*(.7 if j==1 else .48),.016 if k<2 else .010,bone,j,yellow)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Emberling_Body'
for t in rig.animation_data.nla_tracks:
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0];samples=[]
 for f in range(int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)+1):bpy.context.scene.frame_set(f);samples.append((f,rig.pose.bones['Root'].location.copy()))
 for f,original in samples:
  bpy.context.scene.frame_set(f)
  for k,(name,_,_,_) in enumerate(flames):
   phase=(f-t.strips[0].action_frame_start)/max(1,t.strips[0].action_frame_end-t.strips[0].action_frame_start);q=phase*math.tau;flame=rig.pose.bones[name];flame.rotation_mode='XYZ';flame.rotation_euler=(.10*math.sin(q*2+k),.13*math.sin(q*3+k),.07*math.cos(q*2+k));flame.keyframe_insert('rotation_euler',frame=f);shrink=1-.95*phase if t.name=='Death_A_Pose' else 1;flame.scale=(shrink,)*3;flame.keyframe_insert('scale',frame=f)
  root=rig.pose.bones['Root'];root.location=original;bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);root.location+=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,.001-low));root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-emberling'
(out/'sources.json').write_text(json.dumps(sources,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'emberling-base.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'emberling-base.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
