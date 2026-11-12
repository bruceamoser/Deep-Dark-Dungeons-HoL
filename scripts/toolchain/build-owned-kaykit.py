"""Adapt an owned KayKit character without retargeting or replacing its rig.
Usage: blender -b --python THIS -- role.json private-output
Original inputs are read-only; export only the reviewed private assembly.
"""
import bpy,sys,json,hashlib,math,argparse,struct
from pathlib import Path
from mathutils import Matrix,Vector,Quaternion
p=argparse.ArgumentParser();p.add_argument('spec',type=Path);p.add_argument('output',type=Path);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);cfg=json.loads(a.spec.read_text());a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30
hashes={};checks=[]
def source(path):
 path=Path(path).expanduser();hashes[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
 if path.suffix in ('.gltf','.glb'):
  data=path.read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]]) if path.suffix=='.glb' else json.loads(data)
  for ref in doc.get('buffers',[])+doc.get('images',[]):
   uri=ref.get('uri','')
   if uri and not uri.startswith('data:'):
    dep=path.parent/uri;hashes[str(dep)]=hashlib.sha256(dep.read_bytes()).hexdigest()
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));return set(bpy.data.objects)-before

def color(h):
 rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)+(1,)
def material(name,h,rough=.3,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m['preserveAuthoredRoughness']=True;b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=color(h);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
raw=Path(cfg['body']).read_bytes();document=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]]);node_world={}
def walk_node(index,parent):
 node=document['nodes'][index]
 if 'matrix' in node:local=Matrix([node['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
 else:
  q=node.get('rotation',[0,0,0,1]);local=Matrix.LocRotScale(Vector(node.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(node.get('scale',[1,1,1])))
 world=parent@local;node_world[node.get('name','')]=world
 for child in node.get('children',[]):walk_node(child,world)
for root in document['scenes'][document.get('scene',0)]['nodes']:walk_node(root,Matrix.Identity(4))
conversion=Matrix.Rotation(math.pi/2,4,'X')
objects=source(cfg['body']);rig=next(o for o in objects if o.type=='ARMATURE');rig.animation_data_clear()
# Blender's glTF importer may create a hidden Icosphere as a bone display shape;
# it is not part of the character and must not enter the game export.
shapes={b.custom_shape for b in rig.pose.bones if b.custom_shape}
for shape in shapes:
 for bone in rig.pose.bones:
  if bone.custom_shape==shape:bone.custom_shape=None
 bpy.data.objects.remove(shape,do_unlink=True)
for name,hexcolor in cfg.get('cloth',{}).items():
 obj=bpy.data.objects[name]
 for i,old in enumerate(list(obj.data.materials)):
  m=old.copy();m.name=cfg['id']+' cloth';obj.data.materials[i]=m
  bs=m.node_tree.nodes['Principled BSDF']
  for link in list(bs.inputs['Base Color'].links):m.node_tree.links.remove(link)
  bs.inputs['Base Color'].default_value=color(hexcolor);bs.inputs['Roughness'].default_value=.55
for obj in bpy.context.scene.objects:
 if obj.type!='MESH':continue
 for m in obj.data.materials:
  if not m or not m.use_nodes:continue
  b=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if b and not m.name.startswith(cfg['id']+' cloth'):b.inputs['Roughness'].default_value=.3
  m['preserveAuthoredRoughness']=True
 if obj.name.endswith('_Eyes'):
  obj.data.materials.clear();m=material('Dim spectral eyes',cfg['eyes']);bs=m.node_tree.nodes['Principled BSDF'];bs.inputs['Emission Color'].default_value=color(cfg['eyes']);bs.inputs['Emission Strength'].default_value=.6;obj.data.materials.append(m)
  for face in obj.data.polygons:face.material_index=0
source_matrices={}
for part in cfg['parts']:
 added=source(part['path']);assert sum(o.type=='MESH' for o in added)==1,('Inspect multi-mesh prop before fitting',part['path'])
 anchor=conversion@node_world[part['bone']]
 rotation=Matrix.Identity(4)
 for axis in 'XYZ':rotation=rotation@Matrix.Rotation(math.radians(part.get('rotate'+axis,0)),4,axis)
 fit=anchor@Matrix.Translation(Vector(part.get('offset',[0,0,0])))@rotation@Matrix.Diagonal((part.get('scale',1),)*3+(1,))@conversion.inverted()
 for obj in added:
  if obj.type!='MESH':continue
  world=obj.matrix_world.copy();source_matrices[part['name']]=world.copy();obj.parent=None;obj.matrix_world=fit@world;obj.name=part['name'];obj.vertex_groups.clear();obj.vertex_groups.new(name=part['bone']).add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.new('Original source socket','ARMATURE').object=rig
  if part.get('tag'):obj['equipmentPart']=part['tag']
  if part.get('woodColor'):
   originals=list(obj.data.materials);idx=len(originals);obj.data.materials.append(material(part['name']+' faded wood',part['woodColor'],.6));uv=obj.data.uv_layers.active.data;selected=0
   for face in obj.data.polygons:
    old=originals[face.material_index];texture=next((n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None)
    if not texture:continue
    pixel=sum((uv[i].uv for i in face.loop_indices),Vector((0,0)))/len(face.loop_indices);x=min(texture.size[0]-1,max(0,int(pixel.x*texture.size[0])));y=min(texture.size[1]-1,max(0,int(pixel.y*texture.size[1])));offset=(y*texture.size[0]+x)*4;r,g,b=texture.pixels[offset:offset+3]
    if r>g*1.15 and r>b*1.15:face.material_index=idx;selected+=1
   assert selected>0,('No owned wood color region found',part['name'])
  for band in part.get('paintBands',[]):
   idx=len(obj.data.materials);obj.data.materials.append(material(part['name']+' '+band['name'],band['color'],band.get('roughness',.3),band.get('metallic',0)));count=0
   for face in obj.data.polygons:
    point=world@face.center
    normal=world.to_3x3().inverted().transposed()@face.normal
    if band['min']<=point[band.get('axis',2)]<=band['max'] and (not band.get('edgeOnly') or abs(normal.x)>.5):face.material_index=idx;count+=1
   assert count>0,('Paint band missed source part',part['name'],band)
 for obj in added:
  if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
for dest,clip in cfg['clips'].items():
 before_actions=set(bpy.data.actions);added=source(clip['path']);source_rig=next(o for o in added if o.type=='ARMATURE')
 errors={b.name:max(abs(b.matrix_local[i][j]-rig.data.bones[b.name].matrix_local[i][j]) for i in range(4) for j in range(4)) for b in source_rig.data.bones if b.name in rig.data.bones}
 assert all((b.parent.name if b.parent else None)==(source_rig.data.bones[b.name].parent.name if source_rig.data.bones[b.name].parent else None) for b in rig.data.bones)
 assert len(errors)==len(rig.data.bones) and max(errors.values())<1e-5,('Source rig is incompatible; no automatic retarget',errors)
 imported=list(set(bpy.data.actions)-before_actions)
 selected=[next(x for x in imported if x.name.split('.')[0]==name) for name in clip.get('names',[clip.get('name')])]
 if len(selected)==1:action=selected[0]
 else:
  for t in source_rig.animation_data.nla_tracks:t.mute=True
  frames=[];joins=[]
  for segment in selected:
   source_rig.animation_data.action=segment;source_rig.animation_data.action_slot=segment.slots[0]
   for b in source_rig.pose.bones:b.matrix_basis.identity()
   samples=[]
   for frame in range(round(segment.frame_range[0]),round(segment.frame_range[1])+1):
    bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();samples.append({b.name:b.matrix_basis.copy() for b in source_rig.pose.bones if b.name in rig.data.bones})
   if frames:
    difference=max(abs(frames[-1][name][i][j]-samples[0][name][i][j]) for name in samples[0] for i in range(4) for j in range(4));joins.append(difference)
    blend=clip.get('joinBlendFrames',0)
    assert difference<(.35 if blend else .02),('Review source action join',dest,segment.name,difference)
    if blend:
     first=frames[-1]
     for step in range(1,blend+1):
      t=step/blend;t=t*t*(3-2*t);bridge={}
      for name in samples[0]:
       l1,q1,s1=first[name].decompose();l2,q2,s2=samples[0][name].decompose();bridge[name]=Matrix.LocRotScale(l1.lerp(l2,t),q1.slerp(q2,t),s1.lerp(s2,t))
      frames.append(bridge)
    samples=samples[1:]
   frames.extend(samples)
  rig.animation_data_create()
  for t in rig.animation_data.nla_tracks:t.mute=True
  action=bpy.data.actions.new(dest);rig.animation_data.action=action
  for frame,bones in enumerate(frames):
   for name,matrix in bones.items():
    b=rig.pose.bones[name];b.rotation_mode='QUATERNION';b.location,b.rotation_quaternion,b.scale=matrix.decompose()
    for channel in ['location','rotation_quaternion','scale']:b.keyframe_insert(data_path=channel,frame=frame,group=name)
  rig.animation_data.action=None
  for t in rig.animation_data.nla_tracks:t.mute=False
  checks.append({'clip':dest,'joinedSourceActions':[c.name for c in selected],'joinMatrixDelta':joins})
 action.name=dest;start,end=action.frame_range
 rig.animation_data_create();track=rig.animation_data.nla_tracks.new();track.name=dest;strip=track.strips.new(dest,0,action);strip.action_frame_start=start;strip.action_frame_end=end;strip.frame_start=0;strip.frame_end=end-start;strip.extrapolation='NOTHING'
 checks.append({'clip':dest,'source':clip,'start':start,'end':end,'restDifference':max(errors.values())})
 for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
 for action_other in list(set(bpy.data.actions)-before_actions):
  if action_other!=action and action_other.users==0:bpy.data.actions.remove(action_other)
# Constant rest-space socket fit from an inspected idle pose. Preserve the
# original character action and source gear geometry/UVs; do not slide props.
for part in cfg['parts']:
 if not part.get('fitIdle'):continue
 for track in rig.animation_data.nla_tracks:track.mute=True
 rig.animation_data.action=next(t for t in rig.animation_data.nla_tracks if t.name=='Idle').strips[0].action;rig.animation_data.action_slot=rig.animation_data.action.slots[0]
 bpy.context.scene.frame_set(6);bpy.context.view_layer.update()
 bone=part['bone'];delta=(rig.matrix_world@rig.pose.bones[bone].matrix)@(rig.matrix_world@rig.data.bones[bone].matrix_local).inverted();anchor=rig.matrix_world@rig.data.bones[bone].head_local
 orientation=Matrix.Rotation(math.radians(part.get('tiltZ',0)),4,'Z')@Matrix.Rotation(math.radians(part.get('tiltY',0)),4,'Y')@Matrix.Rotation(math.radians(part.get('tiltX',0)),4,'X');offset=delta.to_3x3().inverted()@Vector(part.get('worldOffset',[0,0,0]))
 bpy.data.objects[part['name']].matrix_world=Matrix.Translation(anchor+offset)@delta.to_3x3().inverted().to_4x4()@orientation@Matrix.Diagonal((part.get('scale',1),)*3+(1,))@source_matrices[part['name']]
 bpy.data.objects[part['name']]['restForward']=list(delta.to_3x3().inverted()@orientation.to_3x3()@Vector(part.get('reviewAxis',[0,0,1])))
bow_checks=None
if cfg.get('bow'):
 sys.path.insert(0,str(Path(__file__).parent))
 from owned_bow import add_owned_bow
 bow_checks=add_owned_bow(rig,cfg['bow'],source,source_matrices)
# Ease the equipped wrists onto the floor during the skeleton collapse. The
# original hand and its child socket rotate together, preserving their grip.
for fall in cfg.get('fallWrists',[]):
 for track in rig.animation_data.nla_tracks:track.mute=True
 action=next(t for t in rig.animation_data.nla_tracks if t.name=='Death_A_Pose').strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
 part=next(p for p in cfg['parts'] if p['name']==fall['part']);hand=rig.pose.bones[fall['hand']];hand.rotation_mode='QUATERNION';samples=[]
 for frame in range(math.floor(action.frame_range[0]),math.ceil(action.frame_range[1])+1):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();matrix=rig.matrix_world@hand.matrix;delta=(rig.matrix_world@rig.pose.bones[part['bone']].matrix)@(rig.matrix_world@rig.data.bones[part['bone']].matrix_local).inverted();axis=(delta.to_3x3()@Vector(bpy.data.objects[part['name']]['restForward'])).normalized();strength=max(0,min(1,(frame-fall['start'])/(fall['end']-fall['start'])));strength=strength*strength*(3-2*strength);rotation=Quaternion().slerp(axis.rotation_difference(Vector(fall['direction']).normalized()),strength).to_matrix().to_4x4();target=rotation@matrix;target.translation=matrix.translation;samples.append((frame,target))
 for frame,target in samples:
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();hand.matrix=rig.matrix_world.inverted()@target
  for channel in ['location','rotation_quaternion','scale']:hand.keyframe_insert(data_path=channel,frame=frame,group='Equipped collapse wrist')
# Loose worn gear follows the body until the authored skeleton collapse;
# then its own rigid prop bone settles alongside the scattered remains.
for fall in cfg.get('fallProps',[]):
 part=next(p for p in cfg['parts'] if p['name']==fall['part']);obj=bpy.data.objects[fall['part']];parent=part['bone']
 rig.animation_data.action=None
 for t in rig.animation_data.nla_tracks:t.mute=True
 for bone in rig.pose.bones:bone.matrix_basis.identity()
 bpy.context.view_layer.update()
 anchor=obj.matrix_world.translation.copy();name=fall['bone']
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');bone=rig.data.edit_bones.new(name);bone.head=rig.matrix_world.inverted()@anchor;bone.tail=rig.matrix_world.inverted()@(anchor+Vector((0,0,.1)));bone.parent=rig.data.edit_bones[parent];bpy.ops.object.mode_set(mode='OBJECT')
 obj.vertex_groups[parent].name=name
 for track in rig.animation_data.nla_tracks:
  if track.name=='Death_A_Pose':continue
  rig.animation_data.action=track.strips[0].action;rig.animation_data.action_slot=rig.animation_data.action.slots[0];prop=rig.pose.bones[name];prop.rotation_mode='QUATERNION';prop.matrix_basis.identity()
  for frame in [math.floor(rig.animation_data.action.frame_range[0]),math.ceil(rig.animation_data.action.frame_range[1])]:
   for channel in ['location','rotation_quaternion','scale']:prop.keyframe_insert(data_path=channel,frame=frame,group='Worn gear rest')
 rest=rig.matrix_world@rig.data.bones[name].matrix_local;source_rest=rig.matrix_world@rig.data.bones[parent].matrix_local;prop_rest=obj.matrix_world.copy()
 action=next(t for t in rig.animation_data.nla_tracks if t.name=='Death_A_Pose').strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];bone=rig.pose.bones[name];bone.rotation_mode='QUATERNION';samples=[]
 rotation=Matrix.Identity(4)
 for axis in 'XYZ':rotation=rotation@Matrix.Rotation(math.radians(fall.get('rotate'+axis,0)),4,axis)
 final=Matrix.Translation(Vector(fall['position']))@rotation@Matrix.Diagonal((part['scale'],)*3+(1,))@source_matrices[part['name']];target=final@prop_rest.inverted()@rest
 for frame in range(math.floor(action.frame_range[0]),math.ceil(action.frame_range[1])+1):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();original=(rig.matrix_world@rig.pose.bones[parent].matrix)@source_rest.inverted()@rest;t=max(0,min(1,(frame-fall['start'])/(fall['end']-fall['start'])));t=t*t*(3-2*t);l1,q1,s1=original.decompose();l2,q2,s2=target.decompose();samples.append((frame,Matrix.LocRotScale(l1.lerp(l2,t),q1.slerp(q2,t),s1.lerp(s2,t))))
 for frame,matrix in samples:
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();bone.matrix=rig.matrix_world.inverted()@matrix
  for channel in ['location','rotation_quaternion','scale']:bone.keyframe_insert(data_path=channel,frame=frame,group='Loose collapse gear')
contact_checks=[]
for contact in cfg.get('groundContactClips',[]):
 for track in rig.animation_data.nla_tracks:track.mute=True
 for obj in bpy.context.scene.objects:
  keys=obj.data.shape_keys if obj.type=='MESH' else None
  if keys and keys.animation_data:
   keys.animation_data.action=None
   for t in keys.animation_data.nla_tracks:t.mute=t.name!=contact['clip']
 action=next(t for t in rig.animation_data.nla_tracks if t.name==contact['clip']).strips[0].action;rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];root=rig.pose.bones['root'];inverse=(rig.matrix_world@rig.data.bones['root'].matrix_local).to_3x3().inverted();samples=[]
 for frame in range(math.floor(action.frame_range[0]),math.ceil(action.frame_range[1])+1):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();minimum=999
  for obj in bpy.context.scene.objects:
   if obj.type!='MESH':continue
   ev=obj.evaluated_get(dg);minimum=min(minimum,min((ev.matrix_world@v.co).z for v in ev.data.vertices))
  lift=max(0,.002-minimum);assert lift<=contact['maxCorrection'],('Repair pose/gear before ground contact',frame,lift);samples.append((frame,root.location.copy()+inverse@Vector((0,0,lift)),lift))
 for frame,location,lift in samples:root.location=location;root.keyframe_insert(data_path='location',frame=frame,group='Reviewed assembled ground contact')
 contact_checks.append({'clip':contact['clip'],'maxCorrection':max(v[2] for v in samples)})
rig.animation_data.action=None
for bone in rig.pose.bones:bone.matrix_basis.identity()
for track in rig.animation_data.nla_tracks:track.mute=False
for obj in bpy.context.scene.objects:
 keys=obj.data.shape_keys if obj.type=='MESH' else None
 if keys and keys.animation_data:
  for t in keys.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(a.output/(cfg['id']+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(a.output/(cfg['id']+'.glb')),export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
(a.output/'provenance.json').write_text(json.dumps({'spec':cfg,'specSha256':hashlib.sha256(a.spec.read_bytes()).hexdigest(),'sourceHashes':hashes,'clips':checks,'groundContact':contact_checks,'bow':bow_checks,'status':'Candidate; requires author model/motion/game review'},indent=2)+'\n')
