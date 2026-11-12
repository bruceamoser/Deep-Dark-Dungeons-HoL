"""Fit owned KayKit wolf anatomy to the reviewed Mason claw body.
Usage: blender -b --python THIS -- OWNED_BLEND WOLF_GLB RAT_GLB OUTPUT
"""
import bpy,bmesh,sys,math
from pathlib import Path
from mathutils import Vector,Matrix
source,wolf,rat,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
for t in rig.animation_data.nla_tracks:t.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
def material(name,color,rough=.8):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=rough;return m
fur=material('Wolf fur',(.075,.086,.10));muzzle=material('Wolf pale fur',(.37,.35,.29));nose=material('Wolf nose',(.012,.015,.018),.3);eye=material('Wolf amber eyes',(.95,.37,.012),.25);ivory=material('Wolf ivory',(.68,.61,.45),.5)
eye.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.95,.24,.008,1);eye.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.35
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(wolf));added=set(bpy.data.objects)-before
head=next(o for o in added if o.name=='Werewolf_Wolf_Head');head.name='Werewolf_head'
image=next(n.image for n in head.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');w,h=image.size;pixels=list(image.pixels)
def facecolor(obj,p):
 uv=sum((obj.data.uv_layers.active.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices);i=(int(uv.y*h)%h*w+int(uv.x*w)%w)*4;return pixels[i:i+3]
slots=[]
for p in head.data.polygons:
 c=facecolor(head,p);v=head.matrix_world@p.center
 slots.append(4 if min(c)>.78 else (3 if max(c)<.23 and abs(v.x)>.1 and v.z>1.52 else 2 if max(c)<.23 else 1 if v.y<-.35 and v.z<1.57 else 0))
head.data.materials.clear()
for m in (fur,muzzle,nose,eye,ivory):head.data.materials.append(m)
for p,i in zip(head.data.polygons,slots):p.material_index=i
world=head.matrix_world.copy()
for v in head.data.vertices:
 p=world@v.co;v.co=Vector((p.x*.65,p.y*.65,(p.z-1.2)*.63+.73))
def bind(obj,bone):
 obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear();obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
 for mod in list(obj.modifiers):obj.modifiers.remove(mod)
 obj.modifiers.new('Owned anatomy binding','ARMATURE').object=rig;obj.parent=rig;obj.matrix_world=Matrix.Identity(4)
bind(head,'head')
# Reuse supplied toe claws, retaining their actual tapered shape.
for side,word in [('l','Left'),('r','Right')]:
 leg=next(o for o in added if o.name==f'Werewolf_Wolf_Leg{word}');obj=leg.copy();obj.data=leg.data.copy();bpy.context.collection.objects.link(obj);obj.name='Wolf toe claws '+side
 keep={p.index for p in obj.data.polygons if min(facecolor(obj,p))>.78}
 bm=bmesh.new();bm.from_mesh(obj.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[p for p in bm.faces if p.index not in keep],context='FACES');bm.to_mesh(obj.data);bm.free()
 world=obj.matrix_world.copy()
 for v in obj.data.vertices:
  p=world@v.co;v.co=Vector((p.x*.8,p.y*.65,p.z*.7+.015))
 obj.data.materials.clear();obj.data.materials.append(ivory)
 bind(obj,'foot_'+side)
for o in added:
 if o!=head:bpy.data.objects.remove(o,do_unlink=True)
# Fit the reusable four-joint tail; expand its cross section into a wolf brush.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(rat));added=set(bpy.data.objects)-before
oldrig=next(o for o in added if o.type=='ARMATURE');oldbody=next(o for o in added if o.type=='MESH' and o.parent==oldrig)
tail=oldbody.copy();tail.data=oldbody.data.copy();bpy.context.collection.objects.link(tail);tail.name='Werewolf_tail'
names={g.index:g.name for g in tail.vertex_groups};groups={f'tail_{i}' for i in range(4)};keep={v.index for v in tail.data.vertices if any(names[g.group] in groups and g.weight>.001 for g in v.groups)}
bm=bmesh.new();bm.from_mesh(tail.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(tail.data);bm.free()
points=[oldrig.matrix_world@oldrig.data.bones[f'tail_{i}'].head_local for i in range(4)]+[oldrig.matrix_world@oldrig.data.bones['tail_3'].tail_local]
def fit(p):return Vector((p.x*.7,p.y*.7+.06,p.z*.7+.01))
world=tail.matrix_world.copy()
for v in tail.data.vertices:
 p=world@v.co;projections=[]
 for a,b in zip(points,points[1:]):
  t=max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared));q=a.lerp(b,t);projections.append(((p-q).length,q))
 q=min(projections,key=lambda row:row[0])[1];v.co=fit(q+(p-q)*2.5)
# Close only the reused tail tip and smooth its longitudinal surface.
bm=bmesh.new();bm.from_mesh(tail.data)
boundary=[e for e in bm.edges if e.is_boundary]
if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
for f in bm.faces:f.smooth=True
bm.to_mesh(tail.data);bm.free()
tail.parent=None;tail.matrix_world=Matrix.Identity(4)
for g in list(tail.vertex_groups):
 if g.name not in groups:tail.vertex_groups.remove(g)
for mod in tail.modifiers:
 if mod.type=='ARMATURE':mod.object=rig
tail.parent=rig;tail.matrix_world=Matrix.Identity(4);tail.data.materials.clear();tail.data.materials.append(fur)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT');inv=rig.matrix_world.inverted()
for i in range(4):
 b=rig.data.edit_bones.new(f'tail_{i}');b.head=inv@fit(points[i]);b.tail=inv@fit(points[i+1]);b.parent=rig.data.edit_bones['pelvis'] if i==0 else rig.data.edit_bones[f'tail_{i-1}']
bpy.ops.object.mode_set(mode='OBJECT')
for o in added:bpy.data.objects.remove(o,do_unlink=True)
body=bpy.data.objects['Body01'];slot=len(body.data.materials);body.data.materials.append(muzzle)
for p in body.data.polygons:
 v=body.matrix_world@p.center
 if v.y<-.055 and .42<v.z<.72 and abs(v.x)<.15:p.material_index=slot
for t in rig.animation_data.nla_tracks:t.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'werewolf.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'werewolf.glb'),export_extras=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
