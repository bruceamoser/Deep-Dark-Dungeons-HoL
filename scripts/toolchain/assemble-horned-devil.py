"""Reuse fitted fiend anatomy and owned links for the Horned Devil's chain."""
import bpy,sys,runpy,math
from pathlib import Path
from mathutils import Matrix,Vector,Quaternion
source,out=map(Path,sys.argv[sys.argv.index('--')+1:])
runpy.run_path(str(Path(__file__).with_name('assemble-cinder-imp.py')),run_name='__main__')
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
head=bpy.data.objects['Imp head']
for i,c in {0:(.43,.045,.022),1:(.21,.018,.015),2:(1,.65,.045),5:(.07,.018,.012)}.items():
 shader=head.data.materials[i].node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=(*c,1)
# Expand the reused horns laterally to distinguish the elder devil.
for v in bpy.data.objects['Imp horns'].data.vertices:v.co.x*=1.18
linkpath=Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/KayKit-v8/The Complete KayKit Collection v8/KayKit Mixed Bag 1/Assets/gltf/chainlink.gltf')
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(linkpath));added=set(bpy.data.objects)-before;donor=next(o for o in added if o.type=='MESH')
mat=bpy.data.materials.new('Infernal chain brass');mat.use_nodes=True;shader=mat.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=(.35,.22,.07,1);shader.inputs['Metallic'].default_value=.75;shader.inputs['Roughness'].default_value=.32
anchor=rig.matrix_world@rig.data.bones['weapon_r'].head_local;direction=Vector((0,-1,0));length=.06
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for i in range(8):
 b=rig.data.edit_bones.new(f'chain_{i}');b.head=rig.matrix_world.inverted()@(anchor+direction*length*i);b.tail=rig.matrix_world.inverted()@(anchor+direction*length*(i+1));b.parent=rig.data.edit_bones['weapon_r' if i==0 else f'chain_{i-1}']
bpy.ops.object.mode_set(mode='OBJECT')
for i in range(8):
 obj=donor.copy();obj.data=donor.data.copy();bpy.context.collection.objects.link(obj);obj.name=f'Devil chain link {i}'
 transform=Matrix.Translation(anchor+direction*length*(i+.5))@direction.to_track_quat('Z','Y').to_matrix().to_4x4()@Matrix.Rotation((i%2)*math.pi/2,4,'Z')@Matrix.Diagonal((.25,.25,.25,1))@donor.matrix_world
 for v in obj.data.vertices:v.co=transform@v.co
 obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.data.materials.clear();obj.data.materials.append(mat);obj.vertex_groups.clear();obj.vertex_groups.new(name=f'chain_{i}').add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.new('Linked chain skin','ARMATURE').object=rig;obj.parent=rig;obj.matrix_world=Matrix.Identity(4)
for o in added:bpy.data.objects.remove(o,do_unlink=True)
# Convert exposed source hands to matching devil skin; keep gold cuffs/trim.
body=bpy.data.objects['Body19'];skin=head.data.materials[0].copy();skin.name='Devil hands';slot=len(body.data.materials);body.data.materials.append(skin)
for face in body.data.polygons:
    points=[body.matrix_world@body.data.vertices[i].co for i in face.vertices]
    if all(abs(p.x)>.565 for p in points) or all(abs(p.x)<.13 and p.z>.69 for p in points):face.material_index=slot
# Supplied fishing hooks become a terminal hook and two small chain barbs.
hookpath=linkpath.parents[3]/'KayKit RPG Tools Bits 1.0/Assets/gltf/fishing_hook_B.gltf'
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(hookpath));added=set(bpy.data.objects)-before;hook=next(o for o in added if o.type=='MESH');points=[hook.matrix_world@v.co for v in hook.data.vertices];top=max(v.z for v in points);cx=(min(v.x for v in points)+max(v.x for v in points))/2;cy=(min(v.y for v in points)+max(v.y for v in points))/2
for i,size in [(2,.12),(5,.12),(7,.22)]:
 obj=hook.copy();obj.data=hook.data.copy();bpy.context.collection.objects.link(obj);obj.name=f'Devil chain barb {i}'
 rotation=(-direction).to_track_quat('Z','Y').to_matrix()
 for v,p in zip(obj.data.vertices,points):v.co=anchor+direction*length*(i+1)+rotation@((p-Vector((cx,cy,top)))*size)
 obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.data.materials.clear();obj.data.materials.append(mat);obj.vertex_groups.clear();obj.vertex_groups.new(name=f'chain_{i}').add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.modifiers.new('Bound chain hook','ARMATURE').object=rig;obj.parent=rig;obj.matrix_world=Matrix.Identity(4)
for o in added:bpy.data.objects.remove(o,do_unlink=True)
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'horned-devil.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'horned-devil.glb'),export_extras=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
