"""Fit the existing CC0 rat head/tail to the owned coat and source motion.
Usage: blender -b --python THIS -- OWNED_BLEND RAT_GLB OUTPUT
"""
import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
source,donor,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
existing=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(donor))
added=set(bpy.data.objects)-existing
oldrig=next(o for o in added if o.type=='ARMATURE')
oldbody=next(o for o in added if o.type=='MESH' and o.parent==oldrig)

def convert(v,part):
    if part=='head':
        x,y,z=v
        return Vector((x*.66*(.87 if y<-.25 else 1), y*.66, (z-1.2)*.62+.56))
    return Vector((v.x*.7,v.y*.7+.06,v.z*.7+.01))

for part,groups in [('head',{'head'}),('tail',{f'tail_{i}' for i in range(4)})]:
    obj=oldbody.copy();obj.data=oldbody.data.copy();bpy.context.collection.objects.link(obj)
    names={g.index:g.name for g in obj.vertex_groups}
    keep={v.index for v in obj.data.vertices if any(names[g.group] in groups and g.weight>.001 for g in v.groups)}
    bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(obj.data);bm.free()
    world=obj.matrix_world.copy()
    for v in obj.data.vertices:v.co=convert(world@v.co,part)
    if part=='head':
        eye_vertices={i for p in obj.data.polygons if 'Onyx' in obj.data.materials[p.material_index].name for i in p.vertices}
        for i in eye_vertices:obj.data.vertices[i].co.y+=.045
    obj.parent=None;obj.matrix_world=Matrix.Identity(4)
    for g in list(obj.vertex_groups):
        if g.name not in groups:obj.vertex_groups.remove(g)
    for mod in obj.modifiers:
        if mod.type=='ARMATURE':mod.object=rig
    obj.parent=rig;obj.matrix_world=Matrix.Identity(4);obj.name='Wererat_'+part
    for slot in obj.material_slots:
        if slot.material:slot.material=slot.material.copy()

bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
inv=rig.matrix_world.inverted()
for i in range(4):
    old=oldrig.data.bones[f'tail_{i}'];bone=rig.data.edit_bones.new(f'tail_{i}')
    bone.head=inv@convert(oldrig.matrix_world@old.head_local,'tail')
    bone.tail=inv@convert(oldrig.matrix_world@old.tail_local,'tail')
    bone.parent=rig.data.edit_bones['pelvis'] if i==0 else rig.data.edit_bones[f'tail_{i-1}']
bpy.ops.object.mode_set(mode='OBJECT')
for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
head=bpy.data.objects['Wererat_head']
for slot in head.material_slots:
    mat=slot.material
    if mat and 'Onyx' in mat.name:
        shader=mat.node_tree.nodes['Principled BSDF']
        shader.inputs['Base Color'].default_value=(.8,.29,.012,1)
        shader.inputs['Roughness'].default_value=.22
pupilmat=bpy.data.materials.new('Rat pupil');pupilmat.use_nodes=True
pupilmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.008,.006,.004,1)
pupilmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.19
for side in [-1,1]:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=(side*.262*.66,-.251*.66+.045-.027,(1.94-1.2)*.62+.56))
    obj=bpy.context.object;obj.name='Rat pupil';obj.scale=(.023,.012,.028)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(pupilmat)
    for poly in obj.data.polygons:poly.use_smooth=True
    obj.vertex_groups.new(name='head').add(list(range(len(obj.data.vertices))),1,'REPLACE')
    obj.modifiers.new('Rat head binding','ARMATURE').object=rig
    obj.parent=rig;obj.matrix_world=Matrix.Identity(4)

for track in rig.animation_data.nla_tracks:track.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'wererat.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'wererat.glb'),export_extras=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
