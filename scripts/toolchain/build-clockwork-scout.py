"""Owned barrel/compass adapted into a four-leg brass surveying machine."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rig=bpy.data.objects.new('Clockwork Scout',bpy.data.armatures.new('Scout mechanisms'));bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,a,b,parent=None):
 q=rig.data.edit_bones.new(name);q.head=a;q.tail=b
 if parent:q.parent=rig.data.edit_bones[parent]
 return q
bone('Root',(0,0,0),(0,0,.2));bone('Head',(0,0,.90),(0,0,1.05),'Root');bone('Abdomen',(0,-.2,.65),(0,-.4,.65),'Root')
legs=[]
for side in [-1,1]:
 for i in range(2):
  a=Vector((side*.22,-.18+i*.36,.60));b=Vector((side*.43,-.28+i*.56,.37));c=Vector((side*.51,-.36+i*.72,.075));name=f'{"L" if side<0 else "R"}{i}'
  bone(name+'Upper',a,b,'Root');bone(name+'Lower',b,c,name+'Upper');legs.append((name,side,i,a,b,c))
bpy.ops.object.mode_set(mode='OBJECT')
def mat(name,c,rough=.3,metal=0,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emit;m['preserveAuthoredRoughness']=True;return m
shell=mat('ScoutEnamel',(.035,.14,.085),.32);joint=mat('Dark mechanisms',(.025,.03,.026),.4,.65);gold=mat('Aged brass',(.6,.38,.09),.32,.65);black=mat('Obsidian lens',(.003,.012,.009),.12,.2);amber=mat('Green lens focus',(.07,.8,.37),.13,emit=.4);ivory=mat('Steel needle',(.45,.54,.5),.3,.75)
parts=[]
def bind(o,m,b):
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.clear();o.data.materials.append(m);o.parent=rig;o.vertex_groups.new(name=b).add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Fitted spider rig','ARMATURE').object=rig
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o

def sphere(name,p,s,m,b):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=p);o=bpy.context.object;o.name=name;o.scale=s;return bind(o,m,b)

def sweep(name,points,radii,m,b):
 points=list(map(Vector,points));verts=[];faces=[];n=12
 for i,(p,r) in enumerate(zip(points,radii)):
  tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized();ref=Vector((0,0,1))
  if abs(tangent.dot(ref))>.95:ref=Vector((0,1,0))
  u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
  for j in range(n):verts.append(p+r*(math.cos(j*math.tau/n)*u+math.sin(j*math.tau/n)*v))
 for i in range(len(points)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 faces.append(tuple(reversed(range(n))));faces.append(tuple((len(points)-1)*n+j for j in range(n)))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);return bind(o,m,b)
# Owned barrel housing and surveying compass retain their source topology.
import hashlib,json
owned=Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/KayKit-v8/The Complete KayKit Collection v8')
sources={}
def owned_part(path,name,center,size,b,material,rotation=None):
 sources[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));new=set(bpy.data.objects)-before
 meshes=[o for o in new if o.type=='MESH' and o.name.startswith(name)]
 assert len(meshes)==1,(name,[o.name for o in meshes])
 obj=meshes[0]
 points=[obj.matrix_world@v.co for v in obj.data.vertices];low=Vector(tuple(min(v[i] for v in points) for i in range(3)));high=Vector(tuple(max(v[i] for v in points) for i in range(3)));mid=(low+high)/2
 for v,p in zip(obj.data.vertices,points):
  q=Vector(tuple((p[i]-mid[i])*size[i]/(high[i]-low[i]) for i in range(3)))
  v.co=(rotation@q if rotation else q)+Vector(center)
 obj.matrix_world=Matrix.Identity(4)
 for o in new:
  if o!=obj:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 return bind(obj,material,b)
barrel=owned_part(owned/'KayKit Dungeon Pack 1.1/Assets/gltf/barrel_small.gltf','barrel_small',(0,0,.64),(.62,.5,.52),'Root',shell)
barrel.data.materials.append(gold)
for face in barrel.data.polygons:
 z=sum(barrel.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)
 if abs(z-.64)>.19:face.material_index=1
# Compass lid has a sculpted circular rim; mounted vertically as a sensor dish.
owned_part(owned/'KayKit RPG Tools Bits 1.0/Assets/gltf/compass_base.gltf','compass_lid',(0,.04,1.12),(.30,.30,.055),'Head',gold,Matrix.Rotation(math.pi/2,3,'X'))
sweep('Dish mast',[(0,.04,.85),(0,.04,1.08)],[.027,.027],gold,'Head')
sphere('Sensor focus',(0,.001,1.12),(.045,.025,.045),amber,'Head')
# Main lens and speaking grille are missing from owned character parts.
sphere('Lens brass surround',(0,-.255,.70),(.19,.055,.19),gold,'Root')
sphere('Lens dark seat',(0,-.295,.70),(.151,.038,.151),black,'Root')
sphere('Lens glass',(0,-.322,.70),(.124,.037,.124),mat('Deep green glass',(.004,.065,.025),.12,.45),'Root')
sphere('Lens inner focus',(0,-.355,.70),(.057,.009,.057),amber,'Root')
sphere('Lens white glint',(-.045,-.357,.75),(.022,.007,.029),ivory,'Root')
from mathutils.bvhtree import BVHTree
housing=BVHTree.FromPolygons([v.co[:] for v in barrel.data.vertices],[list(p.vertices) for p in barrel.data.polygons])
for x in [-.20,.20]:
 for z in [.45,.84]:
  point,normal,_,_=housing.ray_cast(Vector((x,-.5,z)),Vector((0,1,0)));assert point is not None
  sphere('Housing rivet',point+Vector((0,-.004,0)),(.025,.018,.025),gold,'Root')
sphere('Speaking grille inset',(0,-.21,.46),(.12,.033,.063),joint,'Root')
for x in [-.08,-.04,0,.04,.08]:sweep('Grille brass slat',[(x,-.244,.42),(x,-.244,.50)],[.008,.008],gold,'Root')
sweep('Retractable needle',[(0,0,.55),(0,-.42,.55),(0,-.48,.55)],[.018,.015,.001],ivory,'Abdomen')
for name,side,i,a,b,c in legs:
 sweep(name+' brass strut',[a,b],[.055,.045],gold,name+'Upper')
 sweep(name+' shin',[b,b.lerp(c,.7),c],[.06,.042,.035],shell,name+'Lower')
 sphere(name+' hip',a,(.075,.075,.075),joint,name+'Upper')
 sphere(name+' knee',b,(.074,.074,.074),gold,name+'Lower')
 sphere(name+' knee inset',b+Vector((side*.052,0,0)),(.028,.045,.045),joint,name+'Lower')
 for toe in [-1,0,1]:
  sweep(name+' toe',[c+Vector((toe*.038,0,0)),c+Vector((toe*.047,-.13,-.04))],[.033,.024],gold,name+'Lower')
(out/'sources.json').write_text(json.dumps(sources,indent=2))
# Consolidate draw calls while retaining material regions and all rigid weights.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Scout_Body'
scene=bpy.context.scene;scene.render.fps=24

def matrix(a,b):return Matrix.Translation(a)@(Vector((0,1,0)).rotation_difference((b-a).normalized()).to_matrix().to_4x4())

def ik(a,foot,original):
 l1,l2=(original[1]-original[0]).length,(original[2]-original[1]).length;d=foot-a;length=min(d.length,l1+l2-.001);axis=d.normalized();along=(l1*l1-l2*l2+length*length)/(2*length);up=Vector((0,0,1));up=(up-axis*up.dot(axis)).normalized();return a+axis*along+up*math.sqrt(max(.00001,l1*l1-along*along))
rig.animation_data_create()
for clip,duration in [('Idle',48),('Walking_A',24),('1H_Melee_Attack_Slice_Diagonal',30),('Hit_A',20),('Death_A_Pose',40)]:
 action=bpy.data.actions.new(clip);rig.animation_data.action=action
 for f in range(1,duration+2):
  t=(f-1)/duration
  for b in rig.pose.bones:b.matrix_basis.identity();b.rotation_mode='QUATERNION'
  root=rig.pose.bones['Root'];death=min(1,t*1.5) if clip=='Death_A_Pose' else 0
  root.rotation_quaternion=Quaternion(root.bone.matrix_local.to_3x3().inverted()@Vector((0,1,0)),death*math.radians(83));bpy.context.view_layer.update();rootmat=root.matrix@root.bone.matrix_local.inverted()
  for name,side,i,a,b,c in legs:
   foot=c.copy()
   if clip=='Walking_A':
    phase=t*math.tau+(i%2+(side==1))*math.pi;foot.y+=.08*math.cos(phase);foot.z+=.07*max(0,math.sin(phase))
   elif clip=='Idle':foot.y+=.012*math.sin(t*math.tau+i)
   elif clip=='1H_Melee_Attack_Slice_Diagonal' and i==0:
    p=math.sin(math.pi*t)**3;foot.y-=.10*p;foot.z+=.06*p
   elif clip=='Hit_A':foot.y+=.04*math.sin(math.pi*t)
   elif clip=='Death_A_Pose':foot=foot.lerp(Vector((side*.27,a.y,.58)),death)
   knee=ik(a,foot,(a,b,c))
   rig.pose.bones[name+'Upper'].matrix=rootmat@matrix(a,knee)
   bpy.context.view_layer.update()
   rig.pose.bones[name+'Lower'].matrix=rootmat@matrix(knee,foot)
  head=rig.pose.bones['Head'];head.rotation_quaternion=Quaternion(Vector((0,1,0)),.14*math.sin(t*math.tau))
  needle=rig.pose.bones['Abdomen'];needle.location=(0,.12*math.sin(t*math.pi)**3 if clip=='1H_Melee_Attack_Slice_Diagonal' else 0,0)
  bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);root.location+=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,.005-low))
  for bone in rig.pose.bones:
   for channel in ['location','rotation_quaternion','scale']:bone.keyframe_insert(channel,frame=f)
 slot=rig.animation_data.action_slot;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action).action_slot=slot;track.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
scene.frame_set(1);rig['fldCreature']='creature-clockwork-scout';rig['fldAuthoredCreature']=True
bpy.ops.wm.save_as_mainfile(filepath=str(out/'clockwork-scout-base.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'clockwork-scout-base.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
