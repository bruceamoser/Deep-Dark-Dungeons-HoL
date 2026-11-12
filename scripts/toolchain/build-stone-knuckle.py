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
stone=mat('Knuckle limestone',(.36,.35,.25));moss=mat('Knuckle moss',(.10,.18,.045));dark=mat('Deep rock eye sockets',(.008,.009,.005));amber=mat('Amber mineral eyes',(.9,.40,.035),2)
rng=random.Random(17);parts=[]
def bind(o,m,bone):
 o.data.materials.clear();o.data.materials.append(m);o.parent=rig;o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Preserved clay anatomy','ARMATURE').object=rig;parts.append(o);return o
def rock(name,p,s,bone,index=0,material=stone):
 mesh=variants[index%len(variants)].copy();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);rot=Euler([rng.uniform(-.18,.18) for _ in range(3)]).to_matrix()
 for v in mesh.vertices:v.co=rot@Vector([v.co[i]*s[i] for i in range(3)])+Vector(p)
 return bind(o,material,bone)
rock('Chest keystone',(.016,-.01,.285),(.105,.075,.083),'Chest',0)
rock('Core',(.016,.005,.225),(.072,.06,.055),'Spine',1)
rock('Pelvis',(.016,.01,.17),(.089,.064,.042),'Pelvis',2)
rock('Face stone',(.016,-.015,.39),(.067,.059,.063),'Head',1)
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
 for label,radius,depth,material in [('socket',.012,.001,dark),('glow',.007,.006,amber)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=point+Vector((0,-depth,0)));o=bpy.context.object;o.name='Knuckle '+label;o.scale=(radius,radius*.35,radius*.55);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bind(o,material,'Head')
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Knuckle_Body'
for t in rig.animation_data.nla_tracks:
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0];samples=[]
 for f in range(int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)+1):bpy.context.scene.frame_set(f);samples.append((f,rig.pose.bones['Root'].location.copy()))
 for f,original in samples:
  bpy.context.scene.frame_set(f);root=rig.pose.bones['Root'];root.location=original;bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);root.location+=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,.001-low));root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-stone-knuckle'
(out/'sources.json').write_text(json.dumps(sources,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'stone-knuckle-base.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'stone-knuckle-base.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
