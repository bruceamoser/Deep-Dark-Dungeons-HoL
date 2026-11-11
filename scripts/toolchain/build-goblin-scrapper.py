"""Task-owned Scrapper adaptation; preserves the approved head, source body/rig.
Run Blender --background --python THIS -- approved.blend purchased_source output.
No original assets are modified. New props are rigidly skinned to existing bones.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('fixture',type=Path);p.add_argument('source',type=Path);p.add_argument('output',type=Path)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(a.fixture))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis.identity()
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
for name in ['Spear02','Goblin helmet']:bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
bpy.context.view_layer.update()
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def color(m,h):
 c=[linear(int(h[i:i+2],16)/255) for i in (1,3,5)]+[1]
 m.diffuse_color=c;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=c
 return m
def material(n,h,metal=0,rough=.3):
 m=bpy.data.materials.new(n);m.use_nodes=True;m['preserveAuthoredRoughness']=True
 b=m.node_tree.nodes['Principled BSDF'];b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 return color(m,h)
cloth=color(bpy.data.materials['Rust red tunic'],'#427a70');cloth.name='Scrapper teal workcloth'
color(bpy.data.materials['Dark undercloth'],'#414536')
color(bpy.data.materials['Muted brass trim'],'#a69661')
wrap=material('Ochre patched headcloth','#bda365');patch=material('Dark cloth patch','#46665b');seam=material('Flax stitches','#e0ca92');leather=material('Worn pouch leather','#80522e');steel=material('Scrap steel','#a9b6ae',.65);edge=material('Sharpened edge','#dae1da',.65);rust=material('Rivet brass','#ae8342',.55)
parts=[]
def bind(o,bone):
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Preserved source rig','ARMATURE').object=rig;parts.append(o);return o
def mesh(n,vs,fs,m,bone):
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);me.materials.append(m);return bind(o,bone)
def oval(n,loc,sc,m,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);o=bpy.context.object;o.name=n;o.scale=sc;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return bind(o,bone)
def box(n,loc,sc,m,bone,bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.scale=sc;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Soft sewn edges','BEVEL');mod.width=min(bevel,min(sc)*.25);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return bind(o,bone)
# Soft fitted cap follows the approved scalp, without the Spearhand's saucepan.
vs=[];fs=[];N=40
for j in range(8):
 t=j/8*math.pi/2
 for i in range(N):
  ang=i/N*math.tau;vs.append((.314*math.cos(t)*math.cos(ang),.014+.276*math.cos(t)*math.sin(ang),1.145+.176*math.sin(t)))
vs.append((0,.014,1.321))
for i in range(N):fs.append((7*N+i,7*N+(i+1)%N,8*N))
for j in range(7):
 for i in range(N):fs.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
cap=mesh('Soft salvager head wrap',vs,fs,wrap,'head')
for f in cap.data.polygons:f.use_smooth=True
# Layered cloth band and side knot/tails, all head-bound.
for z in [1.15,1.175]:
 vs=[]
 for h in [z,z+.018]:
  for i in range(N):
   t=i/N*math.tau;vs.append((.319*math.cos(t),.014+.281*math.sin(t),h))
 band=mesh('Folded headcloth band',vs,[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],wrap,'head')
 for f in band.data.polygons:f.use_smooth=True
oval('Headcloth knot',(.298,.075,1.17),(.045,.054,.039),wrap,'head')
for x,z,rot in [(.315,1.105,-.22),(.342,1.12,.2)]:
 tail=box('Tied cloth tail',(x,.10,z),(.043,.025,.13),wrap,'head');tail.rotation_euler.y=rot
# Patch rests on front cap surface; stitch beads remain readable at game scale.
box('Headcloth repair patch',(-.13,-.252,1.197),(.1,.012,.07),patch,'head')
for x in [-.166,-.14,-.114,-.09]:box('Headcloth stitch',(x,-.261,1.227),(.009,.009,.02),seam,'head',.002)
# Belt pouches and protruding tool scraps. Pelvis-bound to avoid dangling props.
for x,z,s in [(-.18,.365,1),(.185,.37,.8)]:
 oval('Bulging salvage pouch',(x,-.145,z),(.082*s,.05,.09*s),leather,'pelvis')
 box('Pouch flap',(x,-.189,z+.037),(.135*s,.022,.061*s),leather,'pelvis')
 oval('Pouch clasp',(x,-.205,z+.029),(.014,.009,.013),rust,'pelvis')
 for dx,h in [(-.025,.10),(.024,.075)]:
  tool=box('Useful metal scrap',(x+dx,-.145,z+.093),(.024,.025,h),steel,'pelvis',.003);tool.rotation_euler.y=dx*5
# Worn knee patch follows the existing weighted clothing surface instead of a
# separate rigid plate that would float when the knee bends: recolour polygons.
body=bpy.data.objects['Body08'];body.data.materials.append(wrap);patchslot=len(body.data.materials)-1
for f in body.data.polygons:
 c=sum((body.matrix_world@body.data.vertices[i].co for i in f.vertices),Vector())/len(f.vertices)
 if .07<c.x<.16 and .18<c.z<.27 and c.y<-.04:f.material_index=patchslot
# A short irregular knife, centered on the original weapon socket. Entire
# handle/blade remains on weapon_r; there is no animated sliding attachment.
socket=rig.matrix_world@rig.data.bones['weapon_r'].head_local
sx,sy,sz=socket
box('Wrapped scrap knife grip',(sx,sy,sz),(.037,.04,.16),leather,'weapon_r',.006)
box('Scrap knife guard',(sx,sy,sz+.083),(.11,.045,.022),rust,'weapon_r',.004)
outline=[(-.044,.095),(.04,.095),(.048,.22),(.022,.285),(.006,.38),(-.04,.30),(-.034,.19)]
vs=[(sx+x,sy+y,sz+z) for y in [-.014,.014] for x,z in outline];k=len(outline)
fs=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
blade=mesh('Notched salvaged knife blade',vs,fs,steel,'weapon_r')
blade.data.materials.append(edge)
for f in blade.data.polygons:
 if f.index in [3,4,5]:f.material_index=1
# Source clips have identical bone names/rest transforms, checked before reuse.
checks=[]
for name,rel in {'Idle':'Idle_Battle_SingleSword.fbx','Walking_A':'InPlace/MoveFWD_Battle_InPlace_SingleSword.fbx','1H_Melee_Attack_Slice_Diagonal':'Attack01_SingleSword.fbx','Hit_A':'GetHit01_SingleSword.fbx','Death_A_Pose':'Die01_SingleSword.fbx'}.items():
 before=set(bpy.data.objects);file=a.source/'Animation/SingleSword'/rel;bpy.ops.import_scene.fbx(filepath=str(file));added=set(bpy.data.objects)-before;donor=next(o for o in added if o.type=='ARMATURE')
 assert set(rig.data.bones.keys())==set(donor.data.bones.keys())
 assert all((b.parent.name if b.parent else None)==(donor.data.bones[b.name].parent.name if donor.data.bones[b.name].parent else None) for b in rig.data.bones)
 delta=max(abs(x-y) for b in rig.data.bones for row1,row2 in zip(b.matrix_local,donor.data.bones[b.name].matrix_local) for x,y in zip(row1,row2));assert delta<1e-5
 action=donor.animation_data.action;action.name=name;rig.animation_data_create();rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);rig.animation_data.action=None
 checks.append({'clip':name,'source':rel,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'maxRestMatrixDelta':delta})
 for o in added:bpy.data.objects.remove(o,do_unlink=True)
# Consolidate rigid props sharing the same attachment while retaining materials.
for bone in ['head','pelvis','weapon_r']:
 objects=[o for o in parts if o.vertex_groups.get(bone)]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='Scrapper '+bone+' gear';parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Scrapper ')] + [o for o in bpy.context.scene.objects if o.type=='MESH' and any(g.name in ['head','pelvis','weapon_r'] for g in o.vertex_groups) and o.name not in ['Goblin head','Body08'] and not o.name.startswith('Scrapper ')]
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output/'goblin-scrapper.blend'))
bpy.ops.export_scene.gltf(filepath=str(a.output/'goblin-scrapper.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
(a.output/'provenance.json').write_text(json.dumps({'fixture':str(a.fixture),'fixtureSha256':hashlib.sha256(a.fixture.read_bytes()).hexdigest(),'source':str(a.source),'changes':'Authored head wrap, sewn patch, belt pouches, metal scraps, scrap knife; teal cloth and knee patch; SingleSword source clips','clipChecks':checks,'status':'Candidate awaiting visual and motion review'},indent=2)+'\n')
