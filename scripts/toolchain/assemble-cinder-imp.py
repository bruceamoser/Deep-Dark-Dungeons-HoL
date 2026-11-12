"""Fit reusable demon horns, membrane wings and tail to the owned goblin/claw rig."""
import bpy,sys
from pathlib import Path
from mathutils import Matrix,Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
recipe=Path(__file__).parent/'creature-workers/ash-demon.py'
ns={'__file__':str(recipe.resolve())}
exec(compile(recipe.read_text().split('meshes = [join_group')[0],str(recipe),'exec'),ns)
parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('Horn_','Wing','Tail'))]
# Store only separable source anatomy before reopening the target scene.
lib=out/'anatomy-parts.blend';bpy.data.libraries.write(str(lib),set(parts))
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
with bpy.data.libraries.load(str(lib),link=False) as (src,dst):dst.objects=list(src.objects)
parts=dst.objects
for o in parts:bpy.context.collection.objects.link(o)
def fit(p,kind):
 if kind=='head':return Vector((p.x*1.05,p.y*.7,(p.z-1.84)*.9+1.29))
 return Vector((p.x*.65,p.y*.65,(p.z-1.18)*.65+.62))
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for name,p,q,parent in [('wing.l',(.13,.2,1.26),(.73,.27,1.94),'spine_03'),('wing.r',(-.13,.2,1.26),(-.73,.27,1.94),'spine_03'),('imp_tail',(0,.25,.69),(.1,.48,.63),'pelvis')]:
 b=rig.data.edit_bones.new(name);b.head=rig.matrix_world.inverted()@fit(Vector(p),'body');b.tail=rig.matrix_world.inverted()@fit(Vector(q),'body');b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
groups={}
for o in parts:
 kind='head' if o.name.startswith('Horn_') else 'body'
 bone='head' if kind=='head' else 'imp_tail' if o.name.startswith('Tail') else 'wing.l' if '_l' in o.name else 'wing.r'
 world=o.matrix_world.copy()
 for v in o.data.vertices:v.co=fit(world@v.co,kind)
 o.parent=None;o.matrix_world=Matrix.Identity(4);o.vertex_groups.clear();o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
 for m in list(o.modifiers):o.modifiers.remove(m)
 o.modifiers.new('Fitted demon anatomy','ARMATURE').object=rig;o.parent=rig;o.matrix_world=Matrix.Identity(4)
 groups.setdefault(bone,[]).append(o)
for bone,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='Imp horns' if bone=='head' else 'Imp '+bone
head=bpy.data.objects['Goblin head'];head.name='Imp head'
for index,color in {0:(.052,.047,.052),1:(.22,.055,.025),2:(1,.3,.005),5:(.015,.012,.015)}.items():
 m=head.data.materials[index];shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Base Color'].default_value=(*color,1);shader.inputs['Roughness'].default_value=.8
 if index==2:shader.inputs['Emission Color'].default_value=(1,.25,.005,1);shader.inputs['Emission Strength'].default_value=.8
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cinder-imp.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'cinder-imp.glb'),export_extras=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
