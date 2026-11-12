"""Refine the existing multiview rat: fitted eyes/incisors and grounded motion.
Preserve donor anatomy, weights and clips; no source overwrite or reduction.
"""
from pathlib import Path
import bpy,math,sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=bpy.data.objects['geometry_0']
rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update()
def mat(name,c,rough=.3,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=emission;m['preserveAuthoredRoughness']=True;return m
black=mat('Rat dark eye sockets',(.005,.003,.002),.22)
amber=mat('Rat bright amber eyes',(.65,.28,.025),.23,.15)
ivory=mat('Rat ivory incisors',(.78,.65,.35))
def skin(o,m):
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(m);o.parent=rig;o.vertex_groups.new(name='Head').add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Preserved fitted rat rig','ARMATURE').object=rig
 for p in o.data.polygons:p.use_smooth=True
 return o
bvh=BVHTree.FromPolygons([v.co[:] for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
for sign in [-1,1]:
 p,n,_,_=bvh.ray_cast(Vector((sign*.2,-.184,.234)),Vector((-sign,0,0)))
 if p is None:raise RuntimeError('Missing rat eye surface')
 if n.dot(Vector((sign*.7,-.6,.2)))<0:n=-n
 for label,offset,radius,m in [('socket',.0005,.008,black),('iris',.002,.0055,amber),('pupil',.0035,.0027,black)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=p+n*offset)
  o=bpy.context.object;o.name=f'Rat {label} {sign}';o.scale=(radius,radius,radius*.4);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(n);skin(o,m)
# Two explicit broad incisors project from the front muzzle, not extra fangs.
for sign in [-1,1]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(.057+sign*.0039,-.235,.173));o=bpy.context.object;o.name='Rat incisor';o.scale=(.006,.005,.014);bev=o.modifiers.new('Rounded enamel edges','BEVEL');bev.width=.001;bev.segments=2;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bpy.ops.object.modifier_apply(modifier=bev.name);skin(o,ivory)
for t in rig.animation_data.nla_tracks:
 if t.name=='Unarmed_Melee_Attack_Punch_A':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
# Correct source ground drift per frame using the original root, not rerigging.
for t in rig.animation_data.nla_tracks:
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0]
 for f in range(int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)+1):
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg);low=min((ev.matrix_world@v.co).z for v in ev.data.vertices)
  root=rig.pose.bones['Root'];root.location+=root.bone.matrix_local.to_3x3().inverted()@Vector((0,0,.001-low));root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-giant-rat'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'giant-rat.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'giant-rat.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
