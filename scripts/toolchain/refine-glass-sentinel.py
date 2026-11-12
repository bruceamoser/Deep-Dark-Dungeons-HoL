"""Convert owned enclosing armor into faceted, gold-seamed glass; preserve rig."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(source))
def material(name,c,gold=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Metallic'].default_value=.7 if gold else .05;s.inputs['Roughness'].default_value=.32 if gold else .13
 if not gold:
  s.inputs['Transmission Weight'].default_value=.35;s.inputs['IOR'].default_value=1.46;s.inputs['Coat Weight'].default_value=.4;s.inputs['Emission Color'].default_value=(*c,1);s.inputs['Emission Strength'].default_value=.06
 m['preserveAuthoredRoughness']=True;return m
mats=[material('Aqua glass',(.22,.62,.68)),material('Ivory glass',(.70,.76,.69)),material('Violet glass',(.42,.30,.68)),material('Sentinel gold',(.5,.34,.09),True)]
head=bpy.data.objects['HeadArmor01'];image=next(n.image for n in head.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');px=list(image.pixels);w,h=image.size;uv=head.data.uv_layers.active.data;goldfaces=[]
for f in head.data.polygons:
 c=sum((uv[i].uv for i in f.loop_indices),Vector((0,0)))/len(f.loop_indices);k=(min(h-1,int(c.y*h))*w+min(w-1,int(c.x*w)))*4;r,g,b=px[k:k+3]
 if r>.3 and g<.08 and b<.4:goldfaces.append(f.index)
head.data.materials.clear()
for m in mats:head.data.materials.append(m)
for f in head.data.polygons:
 f.material_index=3 if f.index in goldfaces else 0 if f.normal.x>.25 else 2 if f.normal.x<-.25 else 1;f.use_smooth=False
body=bpy.data.objects['Body18'];base=len(body.data.materials)
for m in mats:body.data.materials.append(m)
for f in body.data.polygons:
 f.material_index=base+3 if f.material_index==4 else base+(0 if f.normal.x>.25 else 2 if f.normal.x<-.25 else 1);f.use_smooth=False
# A palm emitter follows the existing hand socket for the reflection ray.
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update();em=bpy.data.objects.new('ReflectionPalm',None);bpy.context.collection.objects.link(em);em.parent=rig;em.parent_type='BONE';em.parent_bone='weapon_r';em.matrix_world.translation=rig.matrix_world@rig.data.bones['weapon_r'].head_local
bpy.ops.wm.save_as_mainfile(filepath=str(out/'glass-sentinel-refined.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'glass-sentinel-refined.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
