"""Private Goblin Spearhand preview from the verified Mason spear fixture.
Original purchased assets and game runtime are not modified. All new forms are
editable Blender geometry. Run: blender -b --python THIS -- fixture.blend source output.
"""
import argparse,json,math,sys,hashlib
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('fixture',type=Path);p.add_argument('source',type=Path);p.add_argument('output',type=Path)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(a.fixture))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
for name in ['Head01_Male','Hair01','Eye01','Mouth01','Eyebrow01']:
 if bpy.data.objects.get(name):bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def mat(name,color,metal=0,rough=.3):
 m=bpy.data.materials.new(name);m.use_nodes=True;m['preserveAuthoredRoughness']=True
 c=[linear(int(color[i:i+2],16)/255) for i in (1,3,5)]+[1]
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=c;bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;m.diffuse_color=c
 return m
skin=mat('Goblin moss green','#789841');inner=mat('Ear warm green','#586c32');dark=mat('Mouth and nostrils','#28301b');ivory=mat('Ivory teeth','#e9d9aa');white=mat('Warm amber eyes','#e6bd4e');pupil=mat('Deep ink pupils','#172119');brow=mat('Dark olive eyebrows','#384827');brass=mat('Worn brass pot','#9c793f',.65,.34);edge=mat('Pot rim brass','#c19b55',.65,.3);leather=mat('Brown leather','#553725');cloth=mat('Rust red tunic','#924a36');shadow=mat('Dark undercloth','#2f3531');trim=mat('Muted brass trim','#b99c59',.3)
new=[]
def mesh(name,vs,fs,material):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);new.append(o);return o

def ellipsoid(name,loc,scale,material,segments=24,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 new.append(o);return o

# New closed head surface with a broad brow, tapered jaw and compact chin.
head=ellipsoid('Goblin head',(0,-.012,.995),(.325,.278,.305),skin,32,20)
for v in head.data.vertices:
 z=v.co.z/.305
 if z<-.1:v.co.x*=1+.18*z
 if v.co.y<0:v.co.y*=.94
# A broad bridge and projecting nose are fused into the head, so there is no
# detached generated face patch or exposed cut edge at the neck.
bridge=ellipsoid('Nose bridge',(0,-.258,1.009),(.062,.063,.103),skin)
nose=ellipsoid('Pointed goblin nose',(0,-.314,.955),(.09,.115,.065),skin)
chin=ellipsoid('Goblin lower lip',(0,-.222,.802),(.118,.068,.049),skin)
bpy.ops.object.select_all(action='DESELECT')
for o in [head,bridge,nose,chin]:o.select_set(True)
bpy.context.view_layer.objects.active=head;bpy.ops.object.join()
rem=head.modifiers.new('Fuse new head forms','REMESH');rem.mode='VOXEL';rem.voxel_size=.014;rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
sm=head.modifiers.new('Polished sculpt surface','SMOOTH');sm.factor=.65;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
for f in head.data.polygons:f.use_smooth=True
# Rebuild tracking after join, which invalidates removed Blender objects.
new=[head]
neck=ellipsoid('Green neck',(0,0,.726),(.099,.092,.092),skin)

# Closed leaf ears with a central fold and a separate recessed inner panel.
outline=[(.275,.0,.925),(.39,.0,.965),(.615,.02,1.175),(.51,.016,1.171),(.345,0,1.126),(.266,0,1.065)]
for sign in [-1,1]:
 vs=[(sign*x,y-.018,z) for x,y,z in outline]+[(sign*.371,-.075,1.065),(sign*.369,.055,1.06)]
 fs=[(6,i,(i+1)%6) for i in range(6)]+[(7,(i+1)%6,i) for i in range(6)]
 o=mesh(('Left' if sign<0 else 'Right')+' pointed ear',vs,fs,skin)
 bevel=o.modifiers.new('Soft ear edges','BEVEL');bevel.width=.009;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for f in o.data.polygons:f.use_smooth=True
 center=Vector((sign*.371,-.075,1.065))
 pts=[tuple(center*.25+Vector(vs[i])*.75+Vector((0,-.005,0))) for i in range(6)]
 pts.append(tuple(center+Vector((0,-.005,0))))
 o=mesh(('Left' if sign<0 else 'Right')+' ear inset',pts,[(6,i,(i+1)%6) for i in range(6)],inner)
 if sign<0:
  for part in [bpy.data.objects['Left pointed ear'],o]:
   for f in part.data.polygons:f.flip()
 for f in o.data.polygons:f.use_smooth=True

# Almond eyes with raised brow forms. Strong pupils remain readable at game size.
for sign in [-1,1]:
 eye=ellipsoid('Amber eye '+str(sign),(sign*.139,-.247,1.016),(.085,.033,.047),white)
 eye.rotation_euler.y=sign*-.20
 ellipsoid('Pupil '+str(sign),(sign*.13,-.279,1.015),(.025,.012,.034),pupil)
 ellipsoid('Eye glint '+str(sign),(sign*.122,-.289,1.029),(.008,.004,.009),ivory,16,8)
 o=ellipsoid('Brow ridge '+str(sign),(sign*.141,-.249,1.071),(.104,.045,.029),skin);o.rotation_euler.y=sign*-.24
 o=ellipsoid('Eyebrow '+str(sign),(sign*.14,-.281,1.078),(.084,.012,.012),brow);o.rotation_euler.y=sign*-.24
 ellipsoid('Nostril '+str(sign),(sign*.052,-.395,.944),(.018,.011,.009),dark,16,8)
# Mouth follows the face curve; closed backing avoids a hollow cutout.
ellipsoid('Mischievous mouth',(0,-.259,.847),(.125,.025,.035),dark)
for x in [-.079,-.038,0,.038,.079]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-.284,.857))
 o=bpy.context.object;o.name='Small upper tooth';o.scale=(.023,.021,.026);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ivory);new.append(o)
 bevel=o.modifiers.new('Rounded tooth corners','BEVEL');bevel.width=.004;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
for sign in [-1,1]:
 bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.014,radius2=.004,depth=.045,location=(sign*.091,-.284,.839))
 o=bpy.context.object;o.name='Goblin lower fang';o.data.materials.append(ivory);new.append(o)
# Bare scalp is deliberate: clean removable-headgear silhouette.
# Saucepans identify this salvage-creature role; the pot is a separate removable
# head-bone attachment, with a short right handle clear of the spear side.
helm=[]
profile=[(.319,1.17),(.326,1.192),(.308,1.208),(.285,1.36),(.26,1.38),(0,1.389)]
vs=[];segments=32
for r,z in profile:
 for i in range(segments):
  t=2*math.pi*i/segments;vs.append((r*math.cos(t),r*.86*math.sin(t)+.012,z))
fs=[]
for row in range(len(profile)-1):
 for i in range(segments):fs.append((row*segments+i,row*segments+(i+1)%segments,(row+1)*segments+(i+1)%segments,(row+1)*segments+i))
o=mesh('Saucepan helmet',vs,fs,brass);helm.append(o)
for f in o.data.polygons:f.use_smooth=True
# Rim and handle built as closed cylindrical parts.
def rod(name,start,end,radius,material):
 start,end=Vector(start),Vector(end);d=end-start
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=d.length,location=(start+end)/2)
 o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material);new.append(o)
 bevel=o.modifiers.new('Soft metal edges','BEVEL');bevel.width=.007;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 return o
helm.append(rod('Saucepan handle',(.27,.09,1.28),(.53,.12,1.34),.025,brass))
for sign in [-1,1]:helm.append(ellipsoid('Pot rivet',(sign*.292,-.105,1.24),(.016,.012,.016),edge,12,8))
# Color the source outfit by the author's exact UV masks, preserving all geometry,
# UV seams, weights and bind matrices. Gloves/boots stay leather, not green.
body=bpy.data.objects['Body08']
images=[bpy.data.images.load(str(a.source/f'Texture/MaskTint/Mask0{i}.png')) for i in range(1,4)]
masks=[(list(im.pixels),im.size[0],im.size[1]) for im in images]
materials={2:cloth,4:trim,7:leather,8:shadow,9:skin}
slots={}
for channel,m in materials.items():slots[channel]=len(body.data.materials);body.data.materials.append(m)
uv=body.data.uv_layers.active
for f in body.data.polygons:
 center=sum((uv.data[i].uv for i in f.loop_indices),Vector((0,0)))/len(f.loop_indices);values=[]
 for pix,w,h in masks:
  ix=min(w-1,max(0,int(center.x*w)));iy=min(h-1,max(0,int(center.y*h)));k=(iy*w+ix)*4;values.extend(pix[k:k+3])
 channel=max(range(9),key=lambda i:values[i])+1 if max(values)>.5 else 0
 if channel in slots:f.material_index=slots[channel]
 # The source assigns boot leather to the same tint as cloth; separate it in
 # this copy using the existing rest-space foot region.
 mean_z=sum((body.matrix_world@body.data.vertices[i].co).z for i in f.vertices)/len(f.vertices)
 if mean_z<.17 and channel==2:f.material_index=slots[7]
# All new rigid head/helmet geometry uses the existing head bone and unchanged rig.
for o in new:
 if o.name not in bpy.data.objects:continue
 group=o.vertex_groups.new(name='head');group.add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Existing head bone','ARMATURE').object=rig
 o['pilotPart']='helmet' if o in helm else 'head'
# Consolidate shared-material rigid parts while keeping helmet independently
# removable for the bare-head review. No material baking or source-body merge.
for category in ['head','helmet']:
 objects=[o for o in bpy.context.scene.objects if o.get('pilotPart')==category]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 bpy.context.object.name='Goblin '+category;bpy.context.object['pilotPart']=category
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output/'goblin-spearhand.blend'))
bpy.ops.export_scene.gltf(filepath=str(a.output/'goblin-spearhand.glb'),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
(a.output/'provenance.json').write_text(json.dumps({'fixture':str(a.fixture),'fixtureSha256':hashlib.sha256(a.fixture.read_bytes()).hexdigest(),'source':str(a.source),'newGeometry':'Authored head, facial details, closed ears, saucepan helmet','preserved':'Body08, Spear02, exact skeleton/bind relationships and five spear clips','finish':'Moss green skin, rust cloth, brown leather, brass, roughness 0.3 (pot 0.34)','status':'Private preview; no game integration'},indent=2)+'\n')
