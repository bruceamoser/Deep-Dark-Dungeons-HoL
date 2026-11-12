"""Eight-legged articulated refinement of the game's original vermin layout.
Rejected generated donors have ambiguous/extra legs. No licensed mesh inputs.
Usage: blender ... -- output-dir
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rig=bpy.data.objects.new('Giant Spider',bpy.data.armatures.new('Spider anatomy'));bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,a,b,parent=None):
 q=rig.data.edit_bones.new(name);q.head=a;q.tail=b
 if parent:q.parent=rig.data.edit_bones[parent]
 return q
bone('Root',(0,0,0),(0,0,.2));bone('Head',(0,-.12,.35),(0,-.4,.35),'Root');bone('Abdomen',(0,.1,.38),(0,.5,.38),'Root')
legs=[]
for side in [-1,1]:
 for i in range(4):
  a=Vector((side*.13,-.33+i*.10,.38));b=Vector((side*(.57+.08*math.sin(i)),-.58+i*.32,.53));c=Vector((side*.88,-.75+i*.44,.03));name=f'{"L" if side<0 else "R"}{i}'
  bone(name+'Upper',a,b,'Root');bone(name+'Lower',b,c,name+'Upper');legs.append((name,side,i,a,b,c))
bpy.ops.object.mode_set(mode='OBJECT')
def mat(name,c,rough=.3,metal=0,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emit;m['preserveAuthoredRoughness']=True;return m
shell=mat('SpiderShell',(.045,.10,.055));joint=mat('Dark articulations',(.012,.02,.015),.4);gold=mat('Ochre eye rims',(.4,.28,.07));black=mat('Obsidian eyes',(.003,.004,.002),.16);amber=mat('Amber eyes',(.8,.37,.015),.22,emit=.12);ivory=mat('Ivory fangs',(.62,.53,.3),.35)
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
sphere('Patterned abdomen',(0,.31,.43),(.34,.43,.32),shell,'Abdomen')
sphere('Cephalothorax',(0,-.23,.38),(.23,.28,.20),shell,'Head')
for name,side,i,a,b,c in legs:
 sweep(name+' upper',[a,a.lerp(b,.18),a.lerp(b,.7),b],[.055,.052,.039,.032],shell,name+'Upper')
 sweep(name+' lower',[b,b.lerp(c,.2),b.lerp(c,.8),c],[.033,.038,.018,.003],shell,name+'Lower')
 sphere(name+' knee',b,(.037,.037,.037),joint,name+'Lower')
# Eight inset eyes: largest central pair, smaller lateral/top pairs.
for i,(x,z,r) in enumerate([(-.052,.47,.040),(.052,.47,.040),(-.13,.455,.026),(.13,.455,.026),(-.08,.53,.021),(.08,.53,.021),(-.17,.49,.018),(.17,.49,.018)]):
 y=-.23-.28*math.sqrt(max(.1,1-(x/.23)**2-((z-.38)/.20)**2))
 sphere('Eye rim '+str(i),(x,y-.005,z),(r*1.22,r*.5,r*1.22),gold,'Head');sphere('Eye '+str(i),(x,y-.014,z),(r,r*.48,r),black,'Head');sphere('Amber focus '+str(i),(x,y-.027,z),(r*.43,r*.18,r*.43),amber,'Head')
for side in [-1,1]:
 sweep('Curved fang',[(side*.085,-.44,.32),(side*.10,-.50,.25),(side*.07,-.54,.17),(side*.035,-.51,.14)],[.045,.035,.02,.002],ivory,'Head')
 sweep('Pedipalp',[(side*.18,-.37,.32),(side*.245,-.45,.27),(side*.23,-.53,.23)],[.035,.025,.009],shell,'Head')
# Consolidate draw calls while retaining material regions and all rigid weights.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Spider_Body'
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
   elif clip=='1H_Melee_Attack_Slice_Diagonal' and i<2:
    p=math.sin(math.pi*t)**3;foot.y-=.16*p;foot.z+=.15*p
   elif clip=='Hit_A':foot.y+=.04*math.sin(math.pi*t)
   elif clip=='Death_A_Pose':foot=foot.lerp(Vector((side*.32,a.y,.48)),death)
   knee=ik(a,foot,(a,b,c))
   rig.pose.bones[name+'Upper'].matrix=rootmat@matrix(a,knee)
   bpy.context.view_layer.update()
   rig.pose.bones[name+'Lower'].matrix=rootmat@matrix(knee,foot)
  head=rig.pose.bones['Head'];head.rotation_quaternion=Quaternion(Vector((1,0,0)),(.15*math.sin(t*math.pi) if clip=='1H_Melee_Attack_Slice_Diagonal' else .025*math.sin(t*math.tau)))
  abdomen=rig.pose.bones['Abdomen'];abdomen.scale=(1,1,1+.018*math.sin(t*math.tau))
  bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());low=min((ev.matrix_world@v.co).z for v in ev.data.vertices);root.location+=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,.005-low))
  for bone in rig.pose.bones:
   for channel in ['location','rotation_quaternion','scale']:bone.keyframe_insert(channel,frame=f)
 slot=rig.animation_data.action_slot;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action).action_slot=slot;track.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
scene.frame_set(1);rig['fldCreature']='creature-giant-spider';rig['fldAuthoredCreature']=True
bpy.ops.wm.save_as_mainfile(filepath=str(out/'giant-spider-base.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'giant-spider-base.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
