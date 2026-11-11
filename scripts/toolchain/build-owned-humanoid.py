"""Reproducible owned-source humanoid assembly with per-role spec.
Usage: blender -b --python THIS -- source-root spec.json private-output.
No source modifications, topology repair or inferred bone retargeting.
"""
import argparse,json,hashlib,sys,math
from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix,Vector
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('spec',type=Path);p.add_argument('output',type=Path);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);spec=json.loads(a.spec.read_text());a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(a.source/'Mesh/AllBodiesCloaks.fbx'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name not in [spec['body'],*spec.get('additionalBodies',[])]:bpy.data.objects.remove(o,do_unlink=True)
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
  points=[o.matrix_world@o.data.vertices[i].co for i in component]
  selected=(max(p.z for p in points)>cfg['removeComponentsAbove']) if 'removeComponentsAbove' in cfg else all(abs(p.x)>cfg['removeComponentsOutsideX'] for p in points)
  if selected:
   remove.extend(component);groups+=1
 assert groups==cfg['expectedComponents'],(name,'Unexpected source topology; inspect before modifying',groups)
 bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(o.data);bm.free()
 modifications.append({'part':name,'removedComponents':groups,'removedVertices':len(remove),'purpose':cfg['purpose']})

for folder,name,bone in spec['parts']:
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(a.source/'Mesh'/folder/(name+'.fbx')))
 for o in set(bpy.data.objects)-before:
  if o.type!='MESH':continue
  o.name=name;modify_source_part(o,name)
  fit=spec.get('partFit',{}).get(name,{})
  o.matrix_world=Matrix.Translation(rig.matrix_world@rig.data.bones[bone].head_local+Vector(fit.get('offset',[0,0,0])))@Matrix.Diagonal((*fit.get('scale',[1,1,1]),1))@o.matrix_world
  g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Original source rig','ARMATURE').object=rig
# Open explicit ear notches in a fitted helmet copy; preserve the dome/rim.
for cfg in spec.get('helmetEarNotches',[]):
 obj=bpy.data.objects[cfg['part']]
 bm=bmesh.new();bm.from_mesh(obj.data);bm.transform(obj.matrix_world)
 for axis,value in [(2,cfg['topZ']),(0,-cfg['minX']),(0,cfg['minX']),(1,cfg['minY']),(1,cfg['maxY'])]:
  point=Vector();point[axis]=value;normal=Vector();normal[axis]=1
  region=list(bm.faces) if axis==2 else [f for f in bm.faces if f.calc_center_median().z<cfg['topZ']+1e-6]
  geom=list({v for f in region for v in f.verts})+list({e for f in region for e in f.edges})+region
  bmesh.ops.bisect_plane(bm,geom=geom,dist=1e-6,plane_co=point,plane_no=normal)
 faces=[f for f in bm.faces if abs(f.calc_center_median().x)>cfg['minX'] and cfg['minY']<f.calc_center_median().y<cfg['maxY'] and f.calc_center_median().z<cfg['topZ']]
 assert 0<len(faces)<len(bm.faces)/2,('Inspect helmet notch bounds',cfg['part'],len(faces))
 count=len(faces);bmesh.ops.delete(bm,geom=faces,context='FACES');bm.transform(obj.matrix_world.inverted());bm.to_mesh(obj.data);bm.free()
 for face in obj.data.polygons:
  if (obj.matrix_world@face.center).z<cfg['topZ']:face.use_smooth=False
 modifications.append({'part':cfg['part'],'removedFaces':count,'purpose':'Paired open-bottom ear notches in helmet skirt; preserve fitted crown','recipe':cfg})
# Refit paired accessory halves around inspected rest-space pivots. This keeps
# source ear folds/topology while changing their placement, not anatomy repair.
for cfg in spec.get('symmetricFits',[]):
 obj=bpy.data.objects[cfg['part']];inverse=obj.matrix_world.inverted()
 for vertex in obj.data.vertices:
  point=obj.matrix_world@vertex.co;side=1 if point.x>=0 else -1
  pivot=Vector((side*cfg['pivot'][0],cfg['pivot'][1],cfg['pivot'][2]))
  rotation=Matrix.Rotation(math.radians(side*cfg['angleY']),3,'Y')
  point=pivot+rotation@(point-pivot)*cfg['scale']+Vector((side*cfg['offset'][0],cfg['offset'][1],cfg['offset'][2]))
  vertex.co=inverse@point
 modifications.append({'part':cfg['part'],'purpose':cfg['purpose'],'recipe':cfg})
for cfg in spec.get('bladeFits',[]):
 obj=bpy.data.objects[cfg['part']];anchor=rig.matrix_world@rig.data.bones[cfg['bone']].head_local;inverse=obj.matrix_world.inverted();count=0
 for vertex in obj.data.vertices:
  point=obj.matrix_world@vertex.co
  if point.z-anchor.z>cfg['aboveGrip']:
   point.x=anchor.x+(point.x-anchor.x)*cfg['widthScale'];vertex.co=inverse@point;count+=1
 assert count>0,('Blade fit missed source geometry',cfg['part'])
 modifications.append({'part':cfg['part'],'vertices':count,'purpose':'Narrow blade while preserving supplied hilt and grip','recipe':cfg})
# Keep original palette for unmasked facial/skin detail; exact source masks tint
# only identified regions. Owned meshes retain UVs, weights and rest transforms.
weapon_rigs=[];weapon_sources={}
for cfg in spec.get('weaponRigs',[]):
 file=a.source/cfg['source'];before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(file));added=set(bpy.data.objects)-before
 wr=next(o for o in added if o.type=='ARMATURE');wr.name=cfg['name']+' rig';wr.animation_data_clear()
 for obj in added:
  if obj.type=='MESH' and obj.name!=cfg['mesh']:bpy.data.objects.remove(obj,do_unlink=True)
 assert bpy.data.objects.get(cfg['mesh']) is not None,('Missing selected owned weapon',cfg['mesh'])
 weapon_rigs.append((cfg,wr));weapon_sources[str(file)]=hashlib.sha256(file.read_bytes()).hexdigest()
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
# Reuse an approved ancestry sculpt without importing its old outfit/animations.
extra_sources=dict(weapon_sources)
# Inspectable, explicit face-region recolours for adapted owned accessories.
for cfg in spec.get('paintRegions',[]):
 obj=bpy.data.objects[cfg['part']];slot=len(obj.data.materials);obj.data.materials.append(mat(cfg['color'],cfg.get('metal',0)))
 count=0
 for face in obj.data.polygons:
  center=sum((obj.matrix_world@obj.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
  if any(sum((center[i]-c[i])**2 for i in [0,2])<cfg['radius']**2 and center.y<cfg['frontY'] for c in cfg['centers']):face.material_index=slot;count+=1
 assert count>0,('Paint region missed',cfg['part'])
 modifications.append({'part':cfg['part'],'paintedFaces':count,'purpose':cfg.get('purpose','Separate supplied lens faces from brass frame')})
for cfg in spec.get('paintBands',[]):
 obj=bpy.data.objects[cfg['part']];slot=len(obj.data.materials);obj.data.materials.append(mat(cfg['color'],cfg.get('metal',0)));count=0
 for face in obj.data.polygons:
  center=sum((obj.matrix_world@obj.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
  if cfg['minZ'] <= center.z <= cfg['maxZ']:face.material_index=slot;count+=1
 assert count>0,('Paint band missed',cfg['part'])
 modifications.append({'part':cfg['part'],'paintedFaces':count,'purpose':cfg['purpose']})
for cfg in spec.get('faceShells',[]):
 source=bpy.data.objects[cfg['source']];obj=source.copy();obj.data=source.data.copy();obj.name=cfg['name'];bpy.context.collection.objects.link(obj)
 bm=bmesh.new();bm.from_mesh(obj.data)
 discard=[]
 for face in bm.faces:
  center=obj.matrix_world@face.calc_center_median()
  if not (cfg['minZ']<center.z<cfg['maxZ'] and center.y<cfg['frontY'] and abs(center.x)<cfg['maxX']):discard.append(face)
 assert 0<len(discard)<len(bm.faces),('Inspect face shell region',cfg['name'])
 bmesh.ops.delete(bm,geom=discard,context='FACES');bm.to_mesh(obj.data);bm.free()
 obj.matrix_world=Matrix.Translation(Vector(cfg['offset']))@obj.matrix_world
 obj.data.materials.clear();obj.data.materials.append(mat(cfg['color']));obj.data.materials.append(mat(cfg['rimColor'],.25))
 for face in obj.data.polygons:face.material_index=0
 shell=obj.modifiers.new('Thin fitted mask shell','SOLIDIFY');shell.thickness=cfg['thickness'];shell.offset=1;shell.material_offset_rim=1
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=shell.name)
 for opening in cfg.get('eyeHoles',[]):
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=1,depth=1)
  cutter=bpy.context.object;cutter.matrix_world=Matrix.Translation(Vector(opening['center']))@Matrix.Rotation(math.pi/2,4,'X')@Matrix.Diagonal((opening['width'],opening['height'],.8,1))
  hole=obj.modifiers.new('Mask eye opening','BOOLEAN');hole.operation='DIFFERENCE';hole.solver='EXACT';hole.object=cutter
  bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=hole.name)
  cutter_mesh=cutter.data;bpy.data.objects.remove(cutter,do_unlink=True);bpy.data.meshes.remove(cutter_mesh)
 if cfg.get('eyeHoles'):
  obj.vertex_groups['head'].add(list(range(len(obj.data.vertices))),1,'REPLACE')
 modifications.append({'part':obj.name,'purpose':'Fitted mask copied from owned face contours; original head retained','recipe':cfg})
if spec.get('headFixture'):
 cfg=spec['headFixture'];file=Path(cfg['path']).expanduser()
 with bpy.data.libraries.load(str(file),link=False) as (src,dst):
  assert cfg['object'] in src.objects;dst.objects=[cfg['object']]
 head=dst.objects[0];bpy.context.collection.objects.link(head)
 head.parent=None
 for mod in head.modifiers:
  if mod.type=='ARMATURE':mod.object=rig
 assert all(g.name in rig.data.bones for g in head.vertex_groups)
 extra_sources[str(file)]=hashlib.sha256(file.read_bytes()).hexdigest()
# KayKit copies retain their UV/material regions. Fit in world rest space and
# rigidly skin to an existing socket. No source changes or mesh repair.
for cfg in spec.get('externalParts',[]):
 file=Path(cfg['path']).expanduser();before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(file));added=set(bpy.data.objects)-before
 envelope=[];width_cache={}
 if cfg.get('sourceWidthProfile'):
  for source_obj in added:
   if source_obj.type=='MESH':
    points=[source_obj.matrix_world@v.co for v in source_obj.data.vertices]
    envelope.extend((points[e.vertices[0]],points[e.vertices[1]]) for e in source_obj.data.edges)
 for obj in added:
  if obj.type!='MESH':continue
  world=obj.matrix_world.copy();obj.parent=None
  if cfg.get('sourceWidthProfile'):
   profile=cfg['sourceWidthProfile'];inverse=world.inverted()
   for vertex in obj.data.vertices:
    point=world@vertex.co;z=point.z
    if z not in width_cache:
     xs=[]
     for p1,p2 in envelope:
      if min(p1.z,p2.z)-1e-6<=z<=max(p1.z,p2.z)+1e-6:
       if abs(p2.z-p1.z)<1e-6:xs.extend([p1.x,p2.x])
       else:xs.append(p1.x+(p2.x-p1.x)*(z-p1.z)/(p2.z-p1.z))
     radius=max(abs(x) for x in xs)
     if radius<=1e-5:
      assert abs(point.x)<1e-5; width_cache[z]=1;continue
     target=profile[0][1] if z<=profile[0][0] else profile[-1][1]
     for (z1,w1),(z2,w2) in zip(profile,profile[1:]):
      if z1<=z<=z2:target=w1+(w2-w1)*(z-z1)/(z2-z1);break
     width_cache[z]=target/radius
    point.x*=width_cache[z];vertex.co=inverse@point
   modifications.append({'part':cfg['name'],'purpose':'Reshape copied case width envelope; preserve fitted lid/body and fittings','recipe':profile})
  if cfg.get('sourceColors'):
   uv=obj.data.uv_layers.active;assert uv,('Expected source UVs',cfg['name'])
   original_materials=list(obj.data.materials);images={};painted=0
   for rule in cfg['sourceColors']:
    slot=len(obj.data.materials);obj.data.materials.append(mat(rule['color']))
    for face in obj.data.polygons:
     if face.material_index>=len(original_materials):continue
     material=original_materials[face.material_index]
     image=next(n.image for n in material.node_tree.nodes if n.type=='TEX_IMAGE')
     if image.name not in images:images[image.name]=(list(image.pixels),*image.size)
     pixels,w,h=images[image.name];center=sum((uv.data[i].uv for i in face.loop_indices),Vector((0,0)))/len(face.loop_indices)
     k=(min(h-1,max(0,int(center.y*h)))*w+min(w-1,max(0,int(center.x*w))))*4;color=pixels[k:k+3]
     if all(lo<=v<=hi for lo,v,hi in zip(rule['min'],color,rule['max'])):face.material_index=slot;painted+=1
   assert painted>0,('Source palette selection missed',cfg['name'])
   modifications.append({'part':cfg['name'],'paintedFaces':painted,'recipe':cfg['sourceColors']})
  for region in cfg.get('sourceRegions',[]):
   slot=len(obj.data.materials);obj.data.materials.append(mat(region['color']));count=0
   for face in obj.data.polygons:
    center=sum((world@obj.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
    if any(sum((center[i]-c[i])**2 for i in [0,2])<region['radius']**2 and center.y<region['frontY'] for c in region['centers']):face.material_index=slot;count+=1
   assert count>0,('External paint region missed',cfg['name'])
   modifications.append({'part':cfg['name'],'paintedFaces':count,'recipe':region})
  if cfg.get('sourceCap'):
   cap=cfg['sourceCap']
   bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=cap['radius'],depth=cap['depth'],location=(0,0,cap['z']))
   cover=bpy.context.object;cover.data.materials.append(mat(cap['color']))
   bpy.ops.object.select_all(action='DESELECT');cover.select_set(True);obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
   modifications.append({'part':cfg['name'],'purpose':'Thin hide membrane over adapted owned barrel; preserve supplied rim/staves','recipe':cap})
  bone=cfg['bone'];anchor=rig.matrix_world@rig.data.bones[bone].head_local
  scale=cfg['scale'] if isinstance(cfg['scale'],list) else [cfg['scale']]*3
  for band in cfg.get('sourcePaintBands',[]):
   slot=len(obj.data.materials);obj.data.materials.append(mat(band['color']));count=0
   for face in obj.data.polygons:
    center=sum((world@obj.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
    if band['minZ']<=center.z<=band['maxZ']:face.material_index=slot;count+=1
   assert count>0,('External paint band missed',cfg['name'])
   modifications.append({'part':cfg['name'],'paintedFaces':count,'recipe':band})
  transform=Matrix.Translation(anchor+Vector(cfg.get('offset',[0,0,0])))@Matrix.Rotation(math.radians(cfg.get('rotateX',0)),4,'X')@Matrix.Rotation(math.radians(cfg.get('rotateY',0)),4,'Y')@Matrix.Rotation(math.radians(cfg.get('rotateZ',0)),4,'Z')@Matrix.Diagonal((*scale,1))@Matrix.Translation(-Vector(cfg.get('origin',[0,0,0])))
  obj.matrix_world=transform@world;obj.name=cfg['name']
  if cfg.get('landmarks'):obj['fitLandmarks']=json.dumps({key:list(transform@Vector(point)) for key,point in cfg['landmarks'].items()})
  group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.new('Owned prop socket','ARMATURE').object=rig
  if cfg.get('tag'):obj['equipmentPart']=cfg['tag']
  for m in obj.data.materials:
   if m and m.use_nodes:
    m['preserveAuthoredRoughness']=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    if bs:bs.inputs['Roughness'].default_value=.3
 for obj in added:
  if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
 # Include external buffers and textures, not just the glTF descriptor.
 deps=[file];doc=json.loads(file.read_text())
 for ref in doc.get('buffers',[])+doc.get('images',[]):
  uri=ref.get('uri','')
  if uri and not uri.startswith('data:'):deps.append(file.parent/uri)
 for dep in deps:extra_sources[str(dep)]=hashlib.sha256(dep.read_bytes()).hexdigest()

# Small painted inscriptions conform to the inspected owned surface. Join the
# baked letters into that part so its existing socket fit moves them together.
for cfg in spec.get('inscriptions',[]):
 from mathutils.bvhtree import BVHTree
 obj=bpy.data.objects[cfg['part']];bone=cfg['bone'];anchor=rig.matrix_world@rig.data.bones[bone].head_local
 vertices=[obj.matrix_world@v.co for v in obj.data.vertices]
 tree=BVHTree.FromPolygons(vertices,[list(f.vertices) for f in obj.data.polygons])
 for row in cfg['rows']:
  hit,normal,_,_=tree.ray_cast(anchor+Vector((row['x'],-2,row['z'])),Vector((0,1,0)))
  assert hit is not None,('Inscription missed owned surface',cfg['part'],row)
  curve=bpy.data.curves.new('Painted inscription','FONT');curve.body=row['text'];curve.align_x='CENTER';curve.size=cfg['size'];curve.resolution_u=2
  label=bpy.data.objects.new('Painted '+row['text'],curve);bpy.context.collection.objects.link(label)
  label.location=hit+Vector((0,-.001,0));label.rotation_euler=(math.pi/2,0,0);curve.materials.append(mat(cfg['color']))
  bpy.ops.object.select_all(action='DESELECT');label.select_set(True);bpy.context.view_layer.objects.active=label;bpy.ops.object.convert(target='MESH');label=bpy.context.object
  bpy.context.view_layer.update();inverse=label.matrix_world.inverted()
  for vertex in label.data.vertices:
   point=label.matrix_world@vertex.co
   surface,_,_,_=tree.ray_cast(Vector((point.x,anchor.y-2,point.z)),Vector((0,1,0)))
   assert surface is not None,('Letter extends beyond owned surface',row['text'])
   vertex.co=inverse@(surface+Vector((0,-.001,0)))
  group=label.vertex_groups.new(name=bone);group.add(list(range(len(label.data.vertices))),1,'REPLACE')
  obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
 modifications.append({'part':cfg['part'],'purpose':'Painted inscriptions conformed to owned surface; baked into the same skinned part','recipe':cfg})

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
 rig.animation_data.action=next(t for t in rig.animation_data.nla_tracks if t.name==clip).strips[0].action;rig.animation_data.action_slot=rig.animation_data.action.slots[0];bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
 return (rig.matrix_world@rig.pose.bones[bone].matrix)@(rig.matrix_world@rig.data.bones[bone].matrix_local).inverted()
def rotate_part(name,bone,rotation):
 obj=bpy.data.objects[name];pivot=rig.matrix_world@rig.data.bones[bone].head_local;inv=obj.matrix_world.inverted()
 for v in obj.data.vertices:v.co=inv@(pivot+rotation@(obj.matrix_world@v.co-pivot))
 if obj.get('fitLandmarks'):obj['fitLandmarks']=json.dumps({key:list(pivot+rotation@(Vector(point)-pivot)) for key,point in json.loads(obj['fitLandmarks']).items()})
for f in spec.get('fitUpright',[]):
 delta=pose_delta(f['bone'],'Idle',f['frame']).to_3x3();desired=delta.inverted()@Vector((0,0,1));rotation=Vector((0,0,1)).rotation_difference(desired.normalized()).to_matrix();rotate_part(f['part'],f['bone'],rotation)
 fits[f['part']]={'frame':f['frame'],'alignment':(delta@rotation@Vector((0,0,1))).normalized().dot(Vector((0,0,1))),'method':'constant socket rotation, upright at inspected idle grip'}
if spec.get('fitShield'):
 f=spec['fitShield'];bone=f.get('bone','weapon_l');delta=pose_delta(bone,'Idle',f['frame']).to_3x3();front=Vector(f.get('front',[.15,-1,0])).normalized();up=Vector((0,0,1));right=up.cross(front).normalized();desired=Matrix((right,-front,up)).transposed();rotation=delta.inverted()@desired
 for name in [f['part'],*f.get('attachments',[])]:rotate_part(name,bone,rotation)
 fits['shield']={'frame':f['frame'],'worldNormal':list(front),'method':'constant bind rotation; no sliding'}
if spec.get('fitThrust'):
 f=spec['fitThrust'];delta=pose_delta('weapon_r','1H_Melee_Attack_Slice_Diagonal',f['frame']).to_3x3();desired=delta.inverted()@Vector((0,-1,0));rotation=Vector((0,0,1)).rotation_difference(desired.normalized()).to_matrix();rotate_part(f['part'],'weapon_r',rotation)
 fits['thrust']={'frame':f['frame'],'alignment':(delta@rotation@Vector((0,0,1))).normalized().dot(Vector((0,-1,0))),'method':'constant socket rotation'}
 assert fits['thrust']['alignment']>.99
# Keep supplied bow/arrow deformation rigs and their synchronized source actions.
# Attach each complete small rig at the inspected character socket, rather than
# retargeting its joints onto the unrelated humanoid hierarchy.
for cfg,wr in weapon_rigs:
 delta=pose_delta(cfg['bone'],cfg['fitClip'],cfg['fitFrame'])
 forward=(rig.matrix_world@rig.pose.bones['weapon_l'].head)-(rig.matrix_world@rig.pose.bones['weapon_r'].head);forward.z=0;forward.normalize()
 up=Vector((0,0,1));right=up.cross(forward).normalized();desired=Matrix((right,-forward,up)).transposed()
 desired=Matrix.Rotation(math.radians(cfg.get('cantDegrees',0)),3,forward)@desired
 world=Matrix.Translation(rig.matrix_world@rig.data.bones[cfg['bone']].head_local)@delta.to_3x3().inverted().to_4x4()@desired.to_4x4()@Matrix.Diagonal((*cfg.get('dimensionsScale',[1,1,1]),1))@wr.matrix_world
 rig.animation_data.action=None
 for b in rig.pose.bones:b.matrix_basis.identity()
 bpy.context.view_layer.update();wr.parent=rig;wr.parent_type='BONE';wr.parent_bone=cfg['bone'];wr.matrix_world=world
 for clip in spec['clips']:
  rel=cfg['attack'] if clip=='2H_Ranged_Shoot' else cfg['idle'];file=a.source/rel
  before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(file));added=set(bpy.data.objects)-before;donor=next(o for o in added if o.type=='ARMATURE')
  assert set(wr.data.bones.keys())==set(donor.data.bones.keys())
  rest_delta=max(abs(x-y) for b in wr.data.bones for r1,r2 in zip(b.matrix_local,donor.data.bones[b.name].matrix_local) for x,y in zip(r1,r2));assert rest_delta<1e-5
  action=donor.animation_data.action;action.name=cfg['name']+' '+clip;wr.animation_data_create();wr.animation_data.action=action;wr.animation_data.action_slot=action.slots[0]
  track=wr.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
  human_end=next(t.strips[0].action.frame_range[1] for t in rig.animation_data.nla_tracks if t.name==clip)
  strip.action_frame_end=min(action.frame_range[1],human_end);wr.animation_data.action=None
  for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
  extra_sources[str(file)]=hashlib.sha256(file.read_bytes()).hexdigest()
 fits[cfg['name']]={'method':'Owned deformation rig, synchronized clips and constant socket fit','frame':cfg['fitFrame'],'forward':list(forward)}
if spec.get('propStrike'):
 sys.path.insert(0,str(Path(__file__).parent))
 from prop_strike import author_prop_strike
 modifications.append(author_prop_strike(rig,spec['propStrike']))
# Bounded per-clip contact correction for reviewed forward falls. Sample the
# assembled silhouette before writing keys; preserve all relative joint motion.
# Large penetrations fail instead of lifting an unsuitable pose into the air.
for contact in spec.get('groundContactClips',[]):
 clip=contact['clip'];all_rigs=[rig,*[wr for _,wr in weapon_rigs]]
 for current in all_rigs:
  for track in current.animation_data.nla_tracks:track.mute=True
  track=next(t for t in current.animation_data.nla_tracks if t.name==clip)
  current.animation_data.action=track.strips[0].action;current.animation_data.action_slot=current.animation_data.action.slots[0]
 end=int(rig.animation_data.action.frame_range[1]);root=rig.pose.bones['root'];samples=[]
 inverse=(rig.matrix_world@rig.data.bones['root'].matrix_local).to_3x3().inverted()
 for frame in range(1,end+1):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();minimum=999
  for obj in bpy.context.scene.objects:
   if obj.type!='MESH':continue
   evaluated=obj.evaluated_get(graph)
   minimum=min(minimum,min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices))
  lift=max(0,-minimum+contact.get('margin',.002))
  assert lift<=contact['maxCorrection'],('Fall needs pose/gear repair, not a large root lift',clip,frame,lift)
  samples.append((frame,root.location.copy()+inverse@Vector((0,0,lift)),lift))
 for frame,location,lift in samples:
  root.location=location;root.keyframe_insert(data_path='location',frame=frame,group='Reviewed ground contact')
 modifications.append({'part':'root','purpose':'Bounded assembled fall contact, relative pose preserved','clip':clip,'maxCorrection':max(row[2] for row in samples)})
 for current in all_rigs:
  current.animation_data.action=None
  for bone in current.pose.bones:bone.matrix_basis.identity()
  for track in current.animation_data.nla_tracks:track.mute=False
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
for t in rig.animation_data.nla_tracks:t.mute=False

bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output/(spec['id']+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(a.output/(spec['id']+'.glb')),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
source_paths=['Mesh/AllBodiesCloaks.fbx','Texture/DefaultPolyart/Albedo.png',*[f'Texture/MaskTint/Mask0{i}.png' for i in range(1,4)],*[f'Mesh/{folder}/{name}.fbx' for folder,name,bone in spec['parts']]]
source_hashes={rel:hashlib.sha256((a.source/rel).read_bytes()).hexdigest() for rel in source_paths}
(a.output/'provenance.json').write_text(json.dumps({'source':str(a.source),'sourceHashes':source_hashes,'extraSourceHashes':extra_sources,'spec':spec,'specSha256':hashlib.sha256(a.spec.read_bytes()).hexdigest(),'clips':checks,'gripFits':fits,'partModifications':modifications,'status':'Candidate; requires visual and motion review'},indent=2)+'\n')
