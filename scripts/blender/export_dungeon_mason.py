import bpy,json,os,math
from mathutils import Vector
from pathlib import Path
from mathutils import Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
base=Path(os.environ['DDD_MASON_SOURCE'])
out=Path(os.environ['DDD_MASON_OUTPUT']);out.mkdir(parents=True,exist_ok=True)
bpy.ops.import_scene.fbx(filepath=str(base/'Mesh/AllBodiesCloaks.fbx'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for action in list(bpy.data.actions):bpy.data.actions.remove(action)
if rig.animation_data:rig.animation_data_clear()
# Rigid accessories use the same skeleton and bind pose as the bodies.
parts=[]
for path in sorted((base/'Mesh/HeadParts').glob('*.fbx')):
 name=path.stem
 parts.append((str(path.relative_to(base/'Mesh')),'BackpackBone' if name.startswith('BackPack') else 'head',name))
for path in sorted((base/'Mesh/Weapons').glob('*.fbx')):
 if 'SkinnedMesh' not in path.stem:
  parts.append((str(path.relative_to(base/'Mesh')),'weapon_l' if path.stem.startswith('Shield') else 'weapon_r',path.stem))
# Adapt the supplied axe/hammer designs with longer two-handed handles.
for source,name in [('OHS10_Axe','THA01_Axe'),('OHS13_Axe','THA02_Axe'),('OHS11_Hammer','THH01_Hammer'),('OHS14_Hammer','THH02_Hammer')]:
 parts.append((f'Weapons/{source}.fbx','weapon_r',name))
for rel,bone,name in parts:
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(base/'Mesh'/rel))
 for ob in set(bpy.data.objects)-before:
  if ob.type!='MESH':continue
  ob.name=name
  if name.startswith(("THA","THH")):
   for v in ob.data.vertices:v.co.y*=1.65
  ob.matrix_world=Matrix.Translation(rig.matrix_world@rig.data.bones[bone].head_local)@ob.matrix_world
  if name.startswith('Shield'):
   # Flip shield facing at the grip; preserve the authored mesh and skeleton.
   pivot=rig.matrix_world@rig.data.bones[bone].head_local
   ob.matrix_world=Matrix.Translation(pivot)@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(-pivot)@ob.matrix_world
  vg=ob.vertex_groups.new(name=bone);vg.add(list(range(len(ob.data.vertices))),1,'REPLACE')
  mod=ob.modifiers.new('Shared rig','ARMATURE');mod.object=rig
# Bow and arrow variants have their own small deformation rigs. Bake the
# rest geometry for handheld swapping; character attack clips drive the hands.
for filename,bone in [('BowsSkinnedMesh.fbx','weapon_l'),('ArrowsSkinnedMesh.fbx','weapon_r')]:
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(base/'Mesh/Weapons'/filename))
 added=set(bpy.data.objects)-before
 drawcoords={};basecoords={}
 if filename=='BowsSkinnedMesh.fbx':
  bowrig=next(o for o in added if o.type=='ARMATURE')
  meshes=[o for o in added if o.type=='MESH']
  bpy.context.view_layer.update()
  basecoords={o.name:[v.co.copy() for v in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices] for o in meshes}
  previous=set(bpy.data.objects)
  bpy.ops.import_scene.fbx(filepath=str(base/'Animation/BowAndArrow/BowAnim/Attack01_Combo0102_Bow.fbx'))
  animobjects=set(bpy.data.objects)-previous
  animrig=next(o for o in animobjects if o.type=='ARMATURE')
  action=animrig.animation_data.action
  bowrig.animation_data_create();bowrig.animation_data.action=action
  if action.slots:bowrig.animation_data.action_slot=action.slots[0]
  best=-1
  for frame in range(1,22):
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
   coords={o.name:[v.co.copy() for v in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.vertices] for o in meshes}
   score=sum((a-b).length_squared for name,vs in coords.items() for a,b in zip(vs,basecoords[name]))
   if score>best:best=score;drawcoords=coords
  assert best>0.01,'Authored bow animation must deform the bow'
  bowrig.animation_data_clear()
  for posebone in bowrig.pose.bones:posebone.matrix_basis.identity()
  bpy.context.view_layer.update()
  for o in animobjects:bpy.data.objects.remove(o,do_unlink=True)
 for ob in [o for o in added if o.type=='MESH']:
  world=ob.matrix_world.copy()
  mesh=bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
  ob.modifiers.clear();ob.data=mesh;ob.parent=None;ob.vertex_groups.clear();ob.matrix_world=world
  if ob.name in drawcoords:
   for v,co in zip(mesh.vertices,basecoords[ob.name]):v.co=co
   ob.shape_key_add(name='Basis');key=ob.shape_key_add(name='Draw')
   for v,co in zip(key.data,drawcoords[ob.name]):v.co=co
  pivot=rig.matrix_world@rig.data.bones[bone].head_local
  ob.matrix_world=Matrix.Translation(pivot)@ob.matrix_world
  vg=ob.vertex_groups.new(name=bone);vg.add(list(range(len(mesh.vertices))),1,'REPLACE')
  mod=ob.modifiers.new('Shared rig','ARMATURE');mod.object=rig
  parts.append((filename,bone,ob.name))
 for ob in added:
  if ob.type!='MESH':bpy.data.objects.remove(ob,do_unlink=True)
# Replace engine-specific shader with the original palette texture.
mat=bpy.data.materials.new('Dungeon Mason palette');mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.8
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(base/'Texture/DefaultPolyart/Albedo.png'))
mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
for ob in bpy.context.scene.objects:
 if ob.type=='MESH':ob.data.materials.clear();ob.data.materials.append(mat)
animations={
 'TwoHandIdle':'TwoHandSword/Idle_Battle_THS.fbx',
 'TwoHandWalk':'TwoHandSword/InPlace/MoveFWD_Battle_InPlace_THS.fbx',
 'TwoHandAttack':'TwoHandSword/Attack01_THS.fbx',
 'SingleIdle':'SingleSword/Idle_Battle_SingleSword.fbx',
 'SingleAttack':'SingleSword/Attack01_SingleSword.fbx',
 'UnarmedIdle':'NoWeapon/Idle_Normal_NoWeapon.fbx',
 'UnarmedAttack':'NoWeapon/Attack01_NoWeapon.fbx',
 'BowIdle':'BowAndArrow/Idle_Battle_BowAndArrow.fbx',
 'BowWalk':'BowAndArrow/InPlace/MoveFWD_Battle_InPlace_BowAndArrow.fbx',
 'Idle':'SwordAndShield/Idle_Battle_SwordAndShiled.fbx',
 'Walking_A':'SwordAndShield/InPlace/MoveFWD_Battle_InPlace_SwordAndShield.fbx',
 'Running_A':'SwordAndShield/InPlace/SprintFWD_Battle_InPlace_SwordAndShield.fbx',
 '1H_Melee_Attack_Slice_Diagonal':'SwordAndShield/Attack01_SwordAndShiled.fbx',
 'Hit_A':'SwordAndShield/GetHit01_SwordAndShield.fbx',
 'Death_A_Pose':'SwordAndShield/Die01_SwordAndShield.fbx',
 'Block':'SwordAndShield/Defend_SwordAndShield.fbx',
 'PickUp':'NoWeapon/InteractWithGateObject_NoWeapon.fbx',
 '2H_Ranged_Shoot':'BowAndArrow/Attack01_BowAndArrow.fbx',
 'Spellcast_Shoot':'MagicWand/Attack01_MagicWand.fbx',
 'Unarmed_Melee_Attack_Punch_A':'NoWeapon/Attack01_NoWeapon.fbx',
}
# The author's mask channels 1..8 are tint regions; channel 9 is explicitly SKIN.
maskimages=[bpy.data.images.load(str(base/f'Texture/MaskTint/Mask0{i}.png')) for i in range(1,4)]
masks=[(list(image.pixels),image.size[0],image.size[1]) for image in maskimages]
channels=[]
for i in range(1,10):
 material=mat.copy();material.name=f'MasonChannel{i:02}';channels.append(material)
def region(uv):
 values=[]
 for pixels,w,h in masks:
  x=min(w-1,max(0,int(uv.x*w)));y=min(h-1,max(0,int(uv.y*h)));offset=(y*w+x)*4
  values.extend(pixels[offset:offset+3])
 return max(range(9),key=lambda i:values[i])+1 if max(values)>.5 else 0
coverage={}
for ob in bpy.context.scene.objects:
 if ob.type!='MESH':continue
 for material in channels:ob.data.materials.append(material)
 uv=ob.data.uv_layers.active
 if not uv:continue
 counts={}
 for face in ob.data.polygons:
  # These palette-mapped faces use a single colour cell per polygon.
  center=sum((uv.data[i].uv for i in face.loop_indices),Vector((0,0)))/len(face.loop_indices)
  channel=region(center);face.material_index=channel
  counts[channel]=counts.get(channel,0)+1
 coverage[ob.name]=counts
(out/'tint-coverage.json').write_text(json.dumps(coverage,indent=2))
for name,path in animations.items():
 path=base/'Animation'/path
 if not path.exists():
  raise FileNotFoundError(f'Missing animation: {path}')
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(path))
 added=set(bpy.data.objects)-before;animrig=next(o for o in added if o.type=='ARMATURE')
 action=animrig.animation_data.action;action.name=name
 rig.animation_data_create();rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action)
 rig.animation_data.action=None
 for ob in added:bpy.data.objects.remove(ob,do_unlink=True)
# Align held weapons in the authored idle pose, rather than guessing from the
# T-pose axes. Ready weapons point toward the viewer with a slight upward tilt.
for track in rig.animation_data.nla_tracks:track.mute=True
alignment={}
for profile in ['Idle','TwoHandIdle']:
 action=bpy.data.actions[profile];rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 rest=rig.matrix_world@rig.data.bones['weapon_r'].matrix_local
 posed=rig.matrix_world@rig.pose.bones['weapon_r'].matrix
 delta=(posed@rest.inverted()).to_3x3()
 desired=Vector((.2,-1,.35)).normalized()
 target=(delta.inverted()@desired).normalized()
 rotation=Vector((0,0,1)).rotation_difference(target).to_matrix().to_4x4()
 pivot=rest.translation
 for rel,bone,name in parts:
  if bone!='weapon_r' or name.startswith('Arrow'):continue
  two=name.startswith(('THS','THA','THH','Spear'))
  if two!=(profile=='TwoHandIdle'):continue
  ob=bpy.data.objects.get(name)
  if not ob:continue
  ob.matrix_world=Matrix.Translation(pivot)@rotation@Matrix.Translation(-pivot)@ob.matrix_world
  bpy.context.view_layer.update()
  evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
  minimum=min((evaluated.matrix_world@v.co).z for v in evaluated.data.vertices)
  alignment[name]={'profile':profile,'idleMinimumZ':round(minimum,4)}
  assert minimum>-.05, f'{name} intersects the floor in idle: {minimum}'
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
(out/'weapon-alignment.json').write_text(json.dumps(alignment,indent=2))
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(out/'hero.glb'),export_format='GLB',use_active_scene=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
print('EXPORTED',str(out/'hero.glb'))

(out/'catalog.json').write_text(json.dumps({'parts':[name for _,_,name in parts], 'bodies':[f'Body{i:02}' for i in range(1,21)], 'animations':list(animations)},indent=2))
