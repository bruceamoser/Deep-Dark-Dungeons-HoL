"""Blender prototype: adult non-explicit hill dwarf; separate from runtime assets.
Run in Blender's Python context. KayKit Ranger head/atlas reused under CC0.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'art/exports/characters'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'art/source/characters'; SOURCE.mkdir(parents=True,exist_ok=True)
previous=bpy.data.scenes.get('Hill dwarf — neutral base')
if previous:
    for window in bpy.context.window_manager.windows:
        if window.scene==previous:window.scene=next(s for s in bpy.data.scenes if s!=previous)
    for obj in list(previous.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.scenes.remove(previous)
saved_views=[]
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            rv=a.spaces.active.region_3d
            saved_views.append((rv,rv.view_rotation.copy(),rv.view_location.copy(),rv.view_distance,rv.view_perspective))
scene=bpy.data.scenes.new('Hill dwarf — neutral base')
bpy.context.window.scene=scene
parts=[]
def activate(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o

def ellipsoid(name,loc,scale,segments=16,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    parts.append(o);return o

def limb(name,a,b,r):
    a,b=Vector(a),Vector(b);o=ellipsoid(name,(a+b)/2,(r,r,(b-a).length/2+r*.62))
    o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(b-a)
    return o
# Import only the evaluated authored head into the new prototype.
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/characters/adventurersv2/Ranger.glb'))
imports=set(scene.objects)-before
src=next(o for o in imports if o.type=='MESH' and o.name.startswith('Ranger_Head'))
bpy.context.view_layer.update()
mesh=bpy.data.meshes.new_from_object(src.evaluated_get(bpy.context.evaluated_depsgraph_get()))
head=bpy.data.objects.new('Head — KayKit Ranger derivative',mesh);scene.collection.objects.link(head)
for v in mesh.vertices:v.co=src.matrix_world@v.co
lo=Vector(tuple(min(v.co[i] for v in mesh.vertices) for i in range(3)))
hi=Vector(tuple(max(v.co[i] for v in mesh.vertices) for i in range(3)))
center=(lo+hi)/2
for v in mesh.vertices:
    p=v.co-center
    v.co=Vector((p.x*.54/(hi.x-lo.x),p.y*.43/(hi.y-lo.y),p.z*.49/(hi.z-lo.z)))+Vector((0,0,1.415))
for v in head.data.vertices:v.co.z=1.415+(v.co.z-1.415)*.90
activate(head)
bevel=head.modifiers.new('Soften face edges','BEVEL');bevel.width=.006;bevel.segments=3;bevel.limit_method='ANGLE';bevel.angle_limit=.45
bpy.ops.object.modifier_apply(modifier=bevel.name)
for poly in head.data.polygons:poly.use_smooth=True
for o in imports:bpy.data.objects.remove(o,do_unlink=True)
skin=head.data.materials[0]
skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.83
# A single continuous body: broad torso, strong back, short solid limbs.
ellipsoid('Pelvis',(0,.015,.59),(.30,.19,.18))
ellipsoid('Abdomen',(0,.01,.77),(.32,.215,.25))
ellipsoid('Chest',(0,0,.93),(.365,.205,.23))
ellipsoid('Neck',(0,.025,1.13),(.115,.115,.20))
for s in [-1,1]:
    ellipsoid('Shoulder',(s*.335,0,1.005),(.135,.145,.13))
    limb('Upper arm',(s*.36,0,.98),(s*.55,0,.82),.115)
    ellipsoid('Elbow',(s*.555,0,.82),(.105,.11,.105))
    limb('Forearm',(s*.55,0,.82),(s*.69,-.015,.65),.105)
    ellipsoid('Wrist',(s*.69,-.015,.65),(.072,.065,.075))
    ellipsoid('Palm',(s*.735,-.012,.578),(.105,.057,.105))
    # Four rounded fingers with knuckles, plus an opposed two-segment thumb.
    for i in range(4):
        x=s*(.662+i*.05);y=-.025
        tip=.447+([.012,0,.006,.028][i])
        mid=(.535+tip)/2
        limb('Finger proximal',(x,y,.542),(x+s*.012,y-.006,mid),.0205 if i<3 else .018)
        limb('Finger distal',(x+s*.012,y-.006,mid),(x+s*.017,y-.009,tip),.019 if i<3 else .0165)
    limb('Thumb base',(s*.655,-.025,.605),(s*.617,-.051,.565),.030)
    limb('Thumb tip',(s*.617,-.051,.565),(s*.612,-.077,.537),.025)
    limb('Thigh',(s*.175,.005,.59),(s*.19,.005,.35),.14)
    ellipsoid('Knee',(s*.19,-.022,.34),(.125,.125,.125))
    limb('Calf',(s*.19,.025,.33),(s*.19,.005,.14),.112)
    ellipsoid('Heel',(s*.19,.055,.075),(.091,.104,.072))
    ellipsoid('Foot',(s*.19,-.055,.068),(.122,.155,.062))
    ellipsoid('Instep',(s*.19,-.014,.119),(.092,.116,.085))
    for i,(x,y,r) in enumerate([(.105,-.239,.031),(.15,-.251,.025),(.194,-.247,.023),(.235,-.233,.021),(.271,-.214,.018)]):
        limb('Bare toe',(s*x,y+.029,.046),(s*x,y-.018,.046),r)
# Weld sculpted masses, smooth their junctions, then reduce to a compact surface.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join();body=bpy.context.object;body.name='Body — continuous neutral skin'
rem=body.modifiers.new('Weld sculpted masses','REMESH');rem.mode='VOXEL';rem.voxel_size=.008
bpy.ops.object.modifier_apply(modifier=rem.name)
smooth=body.modifiers.new('Relax sculpt transitions','SMOOTH');smooth.factor=.65;smooth.iterations=4
bpy.ops.object.modifier_apply(modifier=smooth.name)
dec=body.modifiers.new('Game mesh reduction','DECIMATE');dec.ratio=.1
bpy.ops.object.modifier_apply(modifier=dec.name)
body.data.materials.clear();body.data.materials.append(skin)
# Explicit atlas swatch, keeping skin identical to the authored face palette.
for layer in list(body.data.uv_layers):body.data.uv_layers.remove(layer)
uv=body.data.uv_layers.new(name='Skin atlas swatch');uv.active_render=True
for loop in uv.data:loop.uv=(.125,.945)
for p in body.data.polygons:p.use_smooth=True
# Optional beard is its own interchangeable ancestry appearance part.
mat=bpy.data.materials.new('Beard — warm auburn');mat.diffuse_color=(.30,.115,.055,1);mat.use_nodes=True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.30,.115,.055,1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88
verts=[];faces=[];N=16
for z,rx,ry in [(1.105,.19,.105),(1.055,.222,.14),(.98,.20,.145),(.915,.13,.12),(.875,.07,.08),(.86,.025,.04)]:
    for i in range(N):
        a=2*math.pi*i/N;ridge=1.035 if i%2 else .965;verts.append((rx*math.cos(a),-.105+ry*math.sin(a)*ridge,1.415+(z-1.235)*.90))
for row in range(5):
    for i in range(N):a=row*N+i;b=row*N+(i+1)%N;faces.append((a,b,b+N,a+N))
faces.extend([tuple(reversed(range(N))),tuple(range(5*N,6*N))])
m=bpy.data.meshes.new('Beard sculpt');m.from_pydata(verts,[],faces);m.update()
beard=bpy.data.objects.new('Beard — optional unadorned',m);scene.collection.objects.link(beard);m.materials.append(mat)
beard_uv=m.uv_layers.new(name='Hair atlas swatch')
for loop in beard_uv.data:loop.uv=(.125,.8)
# Basic deformation rig; no claim of animation-retarget compatibility yet.
arm=bpy.data.armatures.new('Hill dwarf base rig');rig=bpy.data.objects.new('Hill dwarf rig',arm);scene.collection.objects.link(rig)
activate(rig);bpy.ops.object.mode_set(mode='EDIT')
segments={}
def bone(name,a,b,parent=None,deform=True):
    eb=arm.edit_bones.new(name);eb.head=a;eb.tail=b;eb.use_deform=deform
    if parent:eb.parent=arm.edit_bones[parent]
    if deform:segments[name]=(Vector(a),Vector(b))
bone('root',(0,0,0),(0,0,.15),deform=False)
bone('hips',(0,0,.53),(0,0,.68),'root')
bone('spine',(0,0,.68),(0,0,.87),'hips')
bone('chest',(0,0,.87),(0,0,1.055),'spine')
bone('neck',(0,0,1.055),(0,0,1.29),'chest')
bone('head',(0,0,1.29),(0,0,1.64),'neck')
for s,side in [(-1,'r'),(1,'l')]:
    bone('upperarm'+side,(s*.335,0,1.005),(s*.55,0,.82),'chest')
    bone('lowerarm'+side,(s*.55,0,.82),(s*.69,-.015,.65),'upperarm'+side)
    bone('hand'+side,(s*.69,-.015,.65),(s*.75,-.025,.53),'lowerarm'+side)
    bone('handslot'+side,(s*.735,-.03,.58),(s*.735,-.14,.58),'hand'+side,False)
    bone('upperleg'+side,(s*.175,0,.59),(s*.19,0,.35),'hips')
    bone('lowerleg'+side,(s*.19,0,.35),(s*.19,0,.14),'upperleg'+side)
    bone('foot'+side,(s*.19,0,.14),(s*.19,-.22,.075),'lowerleg'+side)
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for o in [body,head,beard]:
    o.parent=rig;mod=o.modifiers.new('Character deformation','ARMATURE');mod.object=rig
    if o!=body:
        vg=o.vertex_groups.new(name='head');vg.add(list(range(len(o.data.vertices))),1,'REPLACE');continue
    groups={n:o.vertex_groups.new(name=n) for n in segments}
    for v in o.data.vertices:
        p=o.matrix_world@v.co
        def distance(ab):
            a,b=ab;t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));return (p-a-(b-a)*t).length
        near=sorted(((distance(ab),n) for n,ab in segments.items()))[:3]
        ws=[math.exp(-d*d/.013) for d,n in near];total=sum(ws)
        if total<1e-20:ws=[1,0,0];total=1
        for w,(d,n) in zip(ws,near):
            if w/total>.001:groups[n].add([v.index],w/total,'REPLACE')
rig['prototype']='Hill dwarf adult neutral base; non-explicit; no culture/background/class gear'
rig['rig_status']='Basic deformation only; KayKit animation retargeting is not validated'
rig['source_head']='KayKit Adventurers 2.0 Ranger head/atlas, CC0; sculpted body/beard original'
# Non-exported studio, orthographic character views and warm/cool neutral lighting.
world=bpy.data.worlds.new('Neutral studio world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.095,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
floor_mat=bpy.data.materials.new('Studio slate');floor_mat.diffuse_color=(.035,.052,.065,1)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(floor_mat)
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.75))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,5),450,4,(1,.86,.72));area('Fill',(3,-2,3),230,3,(.7,.84,1));area('Rim',(0,3,4),550,3,(.68,.83,1))
data=bpy.data.cameras.new('Character review');cam=bpy.data.objects.new('Character review',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=2.15
cam.location=(2.6,-4.5,2.2);cam.rotation_euler=(Vector((0,0,.84))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
for screen in bpy.data.screens:
    for area_ in screen.areas:
        if area_.type=='VIEW_3D':
            area_.spaces.active.region_3d.view_distance=2.8
            area_.spaces.active.region_3d.view_location=(0,0,.8)
            area_.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,body,head,beard]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'hill-dwarf-base.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_skins=True)
for rv,rotation,location,distance,perspective in saved_views:
    rv.view_rotation=rotation;rv.view_location=location;rv.view_distance=distance;rv.view_perspective=perspective
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'hill-dwarf-base.blend'))
report={'body_vertices':len(body.data.vertices),'body_faces':len(body.data.polygons),'head_vertices':len(head.data.vertices),'beard_vertices':len(beard.data.vertices),'bones':len(arm.bones),'unweighted':sum(not v.groups for v in body.data.vertices),'blend':str((SOURCE/'hill-dwarf-base.blend').relative_to(ROOT)),'glb':str((OUT/'hill-dwarf-base.glb').relative_to(ROOT))}
(OUT/'hill-dwarf-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
