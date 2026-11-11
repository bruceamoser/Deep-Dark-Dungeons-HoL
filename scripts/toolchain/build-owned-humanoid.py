"""Reproducible owned-source humanoid assembly with per-role spec.
Usage: blender -b --python THIS -- source-root spec.json private-output.
No source modifications, topology repair or inferred bone retargeting.
"""
import argparse,json,hashlib,sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix,Vector
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('spec',type=Path);p.add_argument('output',type=Path);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);spec=json.loads(a.spec.read_text());a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(a.source/'Mesh/AllBodiesCloaks.fbx'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name!=spec['body']:bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_clear()
for act in list(bpy.data.actions):bpy.data.actions.remove(act)
modifications=[]
def modify_source_part(o,name):
 cfg=spec.get('partModifications',{}).get(name)
 if not cfg:return
 adj={i:set() for i in range(len(o.data.vertices))}
 for edge in o.data.edges:
  x,y=edge.vertices;adj[x].add(y);adj[y].add(x)
 unseen=set(adj);remove=[];groups=0
 while unseen:
  todo=[unseen.pop()];component=[]
  while todo:
   i=todo.pop();component.append(i)
   for j in adj[i]:
    if j in unseen:unseen.remove(j);todo.append(j)
  if max((o.matrix_world@o.data.vertices[i].co).z for i in component)>cfg['removeComponentsAbove']:
   remove.extend(component);groups+=1
 assert groups==cfg['expectedComponents'],(name,'Unexpected source topology; inspect before modifying',groups)
 bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(o.data);bm.free()
 modifications.append({'part':name,'removedComponents':groups,'removedVertices':len(remove),'purpose':cfg['purpose']})

for folder,name,bone in spec['parts']:
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(a.source/'Mesh'/folder/(name+'.fbx')))
 for o in set(bpy.data.objects)-before:
  if o.type!='MESH':continue
  o.name=name;modify_source_part(o,name);o.matrix_world=Matrix.Translation(rig.matrix_world@rig.data.bones[bone].head_local)@o.matrix_world
  g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Original source rig','ARMATURE').object=rig
# Keep original palette for unmasked facial/skin detail; exact source masks tint
# only identified regions. Owned meshes retain UVs, weights and rest transforms.
base=bpy.data.materials.new('Owned source palette');base.use_nodes=True;base['preserveAuthoredRoughness']=True
bs=base.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.3
tex=base.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(a.source/'Texture/DefaultPolyart/Albedo.png'));base.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
def lin(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
cache={}
def mat(h,metal=0):
 key=(h,metal)
 if key not in cache:
  m=bpy.data.materials.new('Paint '+h);m.use_nodes=True;m['preserveAuthoredRoughness']=True;b=m.node_tree.nodes['Principled BSDF'];c=[lin(int(h[i:i+2],16)/255) for i in (1,3,5)]+[1];m.diffuse_color=c;b.inputs['Base Color'].default_value=c;b.inputs['Roughness'].default_value=.3;b.inputs['Metallic'].default_value=metal;cache[key]=m
 return cache[key]
imgs=[bpy.data.images.load(str(a.source/f'Texture/MaskTint/Mask0{i}.png')) for i in range(1,4)];masks=[(list(i.pixels),i.size[0],i.size[1]) for i in imgs]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 o.data.materials.clear();o.data.materials.append(base)
 if o.name in spec.get('solid',{}):
  o.data.materials.clear();o.data.materials.append(mat(spec['solid'][o.name]));continue
 if o.name.startswith(('Head','Eye','Mouth')):continue
 colors={**spec['palette'],**spec.get('partPalette',{}).get(o.name,{})};slots={}
 for channel,h in colors.items():
  slots[int(channel)]=len(o.data.materials);o.data.materials.append(mat(h,.45 if o.name.startswith(('OHS','Shield')) and int(channel)==8 else 0))
 uv=o.data.uv_layers.active
 if not uv:raise ValueError('Expected source UVs: '+o.name)
 for f in o.data.polygons:
  center=sum((uv.data[i].uv for i in f.loop_indices),Vector((0,0)))/len(f.loop_indices);values=[]
  for pix,w,h in masks:
   ix=min(w-1,max(0,int(center.x*w)));iy=min(h-1,max(0,int(center.y*h)));k=(iy*w+ix)*4;values.extend(pix[k:k+3])
  channel=max(range(9),key=lambda i:values[i])+1 if max(values)>.5 else 0
  if channel in slots:f.material_index=slots[channel]
checks=[]
for name,rel in spec['clips'].items():
 file=a.source/'Animation'/rel;before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(file));added=set(bpy.data.objects)-before;donor=next(o for o in added if o.type=='ARMATURE')
 assert set(rig.data.bones.keys())==set(donor.data.bones.keys())
 assert all((b.parent.name if b.parent else None)==(donor.data.bones[b.name].parent.name if donor.data.bones[b.name].parent else None) for b in rig.data.bones)
 delta=max(abs(x-y) for b in rig.data.bones for r1,r2 in zip(b.matrix_local,donor.data.bones[b.name].matrix_local) for x,y in zip(r1,r2));assert delta<1e-5
 action=donor.animation_data.action;action.name=name;rig.animation_data_create();rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];t=rig.animation_data.nla_tracks.new();t.name=name;t.strips.new(name,1,action);rig.animation_data.action=None
 checks.append({'clip':name,'source':rel,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'maxRestDelta':delta})
 for o in added:bpy.data.objects.remove(o,do_unlink=True)
# Fit once in rest space around the existing socket, retaining rigid grip.
fits={}
def pose_delta(bone,clip,frame):
 for t in rig.animation_data.nla_tracks:t.mute=True
 rig.animation_data.action=bpy.data.actions[clip];rig.animation_data.action_slot=rig.animation_data.action.slots[0];bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 return (rig.matrix_world@rig.pose.bones[bone].matrix)@(rig.matrix_world@rig.data.bones[bone].matrix_local).inverted()
def rotate_part(name,bone,rotation):
 obj=bpy.data.objects[name];pivot=rig.matrix_world@rig.data.bones[bone].head_local;inv=obj.matrix_world.inverted()
 for v in obj.data.vertices:v.co=inv@(pivot+rotation@(obj.matrix_world@v.co-pivot))
if spec.get('fitShield'):
 f=spec['fitShield'];delta=pose_delta('weapon_l','Idle',f['frame']).to_3x3();front=Vector((.15,-1,0)).normalized();up=Vector((0,0,1));right=up.cross(front).normalized();desired=Matrix((right,-front,up)).transposed();rotation=delta.inverted()@desired
 rotate_part(f['part'],'weapon_l',rotation);fits['shield']={'frame':f['frame'],'worldNormal':list(front),'method':'constant bind rotation; no sliding'}
if spec.get('fitThrust'):
 f=spec['fitThrust'];delta=pose_delta('weapon_r','1H_Melee_Attack_Slice_Diagonal',f['frame']).to_3x3();desired=delta.inverted()@Vector((0,-1,0));rotation=Vector((0,0,1)).rotation_difference(desired.normalized()).to_matrix();rotate_part(f['part'],'weapon_r',rotation)
 fits['thrust']={'frame':f['frame'],'alignment':(delta@rotation@Vector((0,0,1))).normalized().dot(Vector((0,-1,0))),'method':'constant socket rotation'}
 assert fits['thrust']['alignment']>.99
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
for t in rig.animation_data.nla_tracks:t.mute=False

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output/(spec['id']+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(a.output/(spec['id']+'.glb')),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
source_paths=['Mesh/AllBodiesCloaks.fbx','Texture/DefaultPolyart/Albedo.png',*[f'Texture/MaskTint/Mask0{i}.png' for i in range(1,4)],*[f'Mesh/{folder}/{name}.fbx' for folder,name,bone in spec['parts']]]
source_hashes={rel:hashlib.sha256((a.source/rel).read_bytes()).hexdigest() for rel in source_paths}
(a.output/'provenance.json').write_text(json.dumps({'source':str(a.source),'sourceHashes':source_hashes,'spec':spec,'specSha256':hashlib.sha256(a.spec.read_bytes()).hexdigest(),'clips':checks,'gripFits':fits,'partModifications':modifications,'status':'Candidate; requires visual and motion review'},indent=2)+'\n')
