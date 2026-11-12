"""Adapt owned rounded hood/robe into a floating ragged Wraith; originals untouched."""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
from owned_claws import add_claws
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
source=Path.home()/'.local/share/four-lanterns-creature-production/grave-cultist/grave-cultist.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
for o in list(bpy.data.objects):
 if o!=rig and o.name not in ['Body11','Hat05','Head01_Male','Eye01']:bpy.data.objects.remove(o,do_unlink=True)
bpy.context.view_layer.update()
def mat(name,c,emit=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=.85;n.inputs['Specular IOR Level'].default_value=0;n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emit;n.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 m['preserveAuthoredRoughness']=True;return m
cloth=mat('Old shroud',(.07,.095,.055));void=mat('Empty hood',(.001,.002,.001));eyes=mat('Pale eye sparks',(.78,.9,.52),3);trail=mat('Trailing spectral cloth',(.10,.15,.09),.15,.65)
body=bpy.data.objects['Body11'];foot=set();hands=set()
for v in body.data.vertices:
 if not v.groups:continue
 name=body.vertex_groups[max(v.groups,key=lambda g:g.weight).group].name
 if name.startswith('foot_'):foot.add(v.index)
 if name.startswith(('hand_','index_','thumb_')):hands.add(v.index)
assert len(foot)==262
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in foot],context='VERTS');bm.to_mesh(body.data);bm.free()
# Re-evaluate groups after indexed boot removal; cloth skinning remains original.
body.data.materials.clear();body.data.materials.append(cloth);body.data.materials.append(void)
for f in body.data.polygons:
 names=[body.vertex_groups[max(body.data.vertices[i].groups,key=lambda g:g.weight).group].name for i in f.vertices]
 f.material_index=1 if any(n.startswith(('hand_','index_','thumb_')) for n in names) else 0
for v in body.data.vertices:
 p=body.matrix_world@v.co
 if p.z<.30:
  a=math.atan2(p.y,p.x);p.z-=.09*(1-(p.z/.30))*((math.sin(a*9)+1)/2);v.co=body.matrix_world.inverted()@p
for name,material in [('Hat05',cloth),('Head01_Male',void),('Eye01',eyes)]:
 o=bpy.data.objects[name];o.data.materials.clear();o.data.materials.append(material)
 for f in o.data.polygons:f.material_index=0
# Smaller sparks inside the empty hood; retain the supplied eye positions.
eye=bpy.data.objects['Eye01'];groups=[[],[]]
for v in eye.data.vertices:groups[0 if v.co.x<0 else 1].append(v)
for group in groups:
 center=sum((v.co for v in group),Vector())/len(group)
 for v in group:
  d=v.co-center;v.co=center+Vector((d.x*.5,d.y*.5,d.z*.25))
recipe=json.loads((Path(__file__).parents[2]/'config/creature-production/crypt-ghoul.json').read_text())['claws']['nails'];claws=add_claws(rig,recipe,void);claws.name='Wraith fitted fingers'
# Ragged strips extend the supplied hem; preserve separately editable geometry.
for k in range(7):
 a=k*math.tau/7;verts=[];faces=[]
 for i in range(17):
  t=i/16;r=.22+.04*math.sin(t*6+k);center=Vector((math.cos(a)*r,math.sin(a)*r,.28-.44*t));side=Vector((-math.sin(a),math.cos(a),0))*.075*(1-t+.04)
  verts.extend([center-side,center+side])
  if i:faces.append(((i-1)*2,(i-1)*2+1,i*2+1,i*2))
 mesh=bpy.data.meshes.new('Torn hem strip');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Wraith hem '+str(k),mesh);bpy.context.collection.objects.link(o);o.parent=rig;o.matrix_parent_inverse=rig.matrix_world.inverted();o.vertex_groups.new(name='pelvis').add(list(range(len(verts))),1,'REPLACE');o.modifiers.new('Source shroud joint','ARMATURE').object=rig;mesh.materials.append(trail)
# Replace the wand/sword attack with the already inspected owned claw sweep.
attack_source=Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/DungeonMason/Assets/RPGTinyHeroWavePolyart/Animations/NoWeapon/Attack02_NoWeapon.fbx')
if not attack_source.exists():
 attack_source=next(Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/DungeonMason').rglob('Attack02_NoWeapon.fbx'))
before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(attack_source));donor=next(o for o in set(bpy.data.objects)-before if o.type=='ARMATURE');action=donor.animation_data.action;action.name='Wraith claw sweep'
track=next(t for t in rig.animation_data.nla_tracks if t.name=='1H_Melee_Attack_Slice_Diagonal');track.strips.remove(track.strips[0]);track.strips.new(track.name,1,action)
for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
for track in rig.animation_data.nla_tracks:
 action=track.strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];start,end=int(track.strips[0].action_frame_start),int(track.strips[0].action_frame_end);samples=[]
 for f in range(start,end+1):bpy.context.scene.frame_set(f);samples.append((f,rig.pose.bones['root'].location.copy()))
 for f,location in samples:
  bpy.context.scene.frame_set(f);t=(f-start)/max(1,end-start);root=rig.pose.bones['root'];root.location=location;root.scale=(max(.03,1-t),)*3 if track.name=='Death_A_Pose' else (1,1,1);root.keyframe_insert('scale',frame=f)
  # Open the inherited finger chains to show the reaching nail tips.
  for b in rig.pose.bones:
   if b.name.startswith(('index_','thumb_')):b.rotation_mode='QUATERNION';b.rotation_quaternion=b.rotation_quaternion.slerp(type(b.rotation_quaternion)((1,0,0,0)),.85);b.keyframe_insert('rotation_quaternion',frame=f)
  tail=rig.pose.bones['CloakBone03'];tail.rotation_mode='XYZ';tail.rotation_euler=(.08*math.sin(t*math.tau),0,.08*math.cos(t*math.tau));tail.keyframe_insert('rotation_euler',frame=f)
  bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();low=min(min((o.evaluated_get(graph).matrix_world@v.co).z for v in o.evaluated_get(graph).data.vertices) for o in bpy.data.objects if o.type=='MESH')
  inverse=(rig.matrix_world@root.bone.matrix_local).to_3x3().inverted();root.location+=inverse@Vector((0,0,.12+.025*math.sin(t*math.tau)-low));root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-wraith'
(out/'sources.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [source,attack_source]},indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'wraith-base.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'wraith-base.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
