"""Refine the existing multiview wolf copy; preserve source mesh and fitted rig.
Usage: blender -b --factory-startup -noaudio --python prepare-wolf-pilot.py -- source.blend output-dir
"""
from pathlib import Path
import bpy, bmesh, math, json, sys, os
from mathutils.bvhtree import BVHTree
import numpy as np
from mathutils import Vector, Quaternion
source, output = map(Path, sys.argv[sys.argv.index('--')+1:])
output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
body=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
rig.animation_data_clear()
for b in rig.pose.bones:
 b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
# Open the existing mouth seam only on the snout. Split its intersection edges
# so the fitted jaw can open without stretching a sealed surface like rubber.
bm=bmesh.new();bm.from_mesh(body.data)
front=[f for f in bm.faces if all(v.co.y<-.178 and v.co.z>.248 for v in f.verts)]
edges=list({e for f in front for e in f.edges});verts=list({v for f in front for v in f.verts})
cut=bmesh.ops.bisect_plane(bm,geom=verts+edges+front,dist=.000001,plane_co=(0,-.180,.289),plane_no=(0,-.18,1),clear_inner=False,clear_outer=False)
seam=[e for e in cut['geom_cut'] if isinstance(e,bmesh.types.BMEdge)]
bmesh.ops.split_edges(bm,edges=seam)
bm.to_mesh(body.data);bm.free();body.data.update()
# Classify coincident seam vertices by their connected surface side.
centers={v.index:[] for v in body.data.vertices}
for f in body.data.polygons:
 c=f.center;side=c.z-(.289+.18*(c.y+.180))
 for i in f.vertices:centers[i].append(side)
for v in body.data.vertices:
 if v.co.y<-.181 and v.co.z>.248:
  signed=sum(centers[v.index])/max(1,len(centers[v.index]))
  name='Jaw' if signed<0 else 'Head'
  for g in list(v.groups):body.vertex_groups[g.group].remove([v.index])
  body.vertex_groups[name].add([v.index],1,'REPLACE')
# Replace coordinate hard bands with smoothly blended coat regions in bind space.
xyz=np.array([v.co[:] for v in body.data.vertices]);x,y,z=xyz.T
smooth=lambda a: np.clip(a,0,1)**2*(3-2*np.clip(a,0,1))
cream=np.array([.77,.68,.51]);gray=np.array([.30,.34,.38]);dark=np.array([.09,.115,.14])
saddle=smooth((z-(.18+.07*np.sin(y*9)))/.07)
head=smooth((-y-.105)/.045)
cap=smooth((z-.307)/.027)
side=smooth((abs(x)-.025)/.04)
coat=saddle*(1-head)+cap*head
color=cream[None,:]*(1-coat[:,None])+gray[None,:]*coat[:,None]
back=smooth((z-.26)/.045)*(1-head)*.55
color=color*(1-back[:,None])+dark*back[:,None]
# Dark tail tip, not an abrupt horizontal stripe.
tip=smooth((y-.18)/.035)*smooth((.14-z)/.045)
color=color*(1-tip[:,None])+dark*tip[:,None]
# Nose follows the actual muzzle end; pupils are separate fitted meshes below.
nose=smooth((-y-.223)/.012)*smooth((.307-z)/.012)*smooth((z-.263)/.012)
color=color*(1-nose[:,None])+np.array([.025,.032,.038])*nose[:,None]
# Subtle fur-sculpt variation, no painted shadows or noisy photo detail.
shade=1+.015*np.sin(x*120+y*90+z*45)
color=np.clip(color*shade[:,None],0,1)
linear=np.where(color<=.04045,color/12.92,((color+.055)/1.055)**2.4)
mesh=body.data
for attr in list(mesh.color_attributes):mesh.color_attributes.remove(attr)
attr=mesh.color_attributes.new(name='WolfCoat',type='FLOAT_COLOR',domain='POINT')
attr.data.foreach_set('color',np.column_stack([linear,np.ones(len(linear))]).astype(np.float32).ravel())
mat=bpy.data.materials.new('Wolf · slate and warm ivory');mat.use_nodes=True
nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.30
vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='WolfCoat';mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
mat['preserveAuthoredRoughness']=True
mesh.materials.clear();mesh.materials.append(mat)
for p in mesh.polygons:p.material_index=0;p.use_smooth=True

def material(name,c,rough=.3):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;m['preserveAuthoredRoughness']=True
 return m
black=material('Obsidian eyes and lips',(.006,.008,.01),.22)
amber=material('Warm amber iris',(.65,.30,.035),.22)
glint=material('Eye catchlight',(.9,.95,1),.18)
mouth=material('Mouth interior',(.028,.009,.012),.45)
ivory=material('Ivory teeth',(.8,.72,.55),.3)

def skin(o,bone):
 o.parent=rig;o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
 o.modifiers.new('Fitted wolf rig','ARMATURE').object=rig
 for p in o.data.polygons:p.use_smooth=True
 return o

def ellipsoid(name,loc,scale,m,bone='Head'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=False,scale=True);o.data.materials.append(m);return skin(o,bone)
# Fit eyes to the existing sculpt landmarks. Independent spheres give readable
# irises/catchlights without circular texture stamps spanning fur planes.
bvh=BVHTree.FromPolygons([v.co[:] for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons])
for sign in [-1,1]:
 guess=Vector((sign*.034,-.199,.318))
 p,normal,_,_=bvh.find_nearest(guess)
 if normal.dot(Vector((sign*.6,-.7,.1)))<0:normal=-normal
 def eye_part(name,offset,radius,m):
  o=ellipsoid(name,p+normal*offset,(radius,radius*.8,radius*.35),m)
  # Geometry is already in bind space: rotate around the fitted surface point.
  q=Vector((0,0,1)).rotation_difference(normal)
  center=p+normal*offset
  for v in o.data.vertices:v.co=center+q@(v.co-center)
  return o
 eye_part('Eye socket '+str(sign),.0008,.0070,black)
 eye_part('Amber iris '+str(sign),.0023,.0048,amber)
 eye_part('Pupil '+str(sign),.0035,.0025,black)
 ellipsoid('Eye glint '+str(sign),p+normal*.0045+Vector((-.001,0,.0017)),(.0008,.0008,.0008),glint)
# Closed dark oral surfaces cover the newly opened snout; no see-through skull.
ellipsoid('Upper mouth interior',(0,-.211,.282),(.016,.025,.003),mouth,'Head')
ellipsoid('Lower mouth interior',(0,-.210,.280),(.016,.024,.003),mouth,'Jaw')
for sign in [-1,1]:
 for y0,length in [(-.218,.008),(-.203,.005)]:
  for upper in [True,False]:
   bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=.0025,radius2=.0004,depth=length,location=(sign*.013,y0,.281+(-length/2 if upper else length/2)))
   o=bpy.context.object;o.name='Upper canine' if upper else 'Lower tooth'
   if upper:o.rotation_euler.x=math.pi
   bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(ivory);skin(o,'Head' if upper else 'Jaw')
scene=bpy.context.scene;scene.render.fps=24

def clip(name,keys,ground=False):
 rig.animation_data_create();a=bpy.data.actions.new(name);rig.animation_data.action=a
 for frame,angles,displacement in keys:
  for b in rig.pose.bones:
   basis=b.bone.matrix_local.to_3x3().inverted();q=Quaternion((1,0,0,0))
   for axis,deg in zip(((1,0,0),(0,1,0),(0,0,1)),angles.get(b.name,(0,0,0))):q=q@Quaternion(basis@Vector(axis),math.radians(deg))
   b.rotation_mode='QUATERNION';b.rotation_quaternion=q;b.location=(0,0,0)
  root=rig.pose.bones['Root'];basis=root.bone.matrix_local.to_3x3().inverted();root.location=basis@Vector(displacement)
  bpy.context.view_layer.update()
  if ground:
   dg=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(dg);m=ev.to_mesh();low=min((ev.matrix_world@v.co).z for v in m.vertices);ev.to_mesh_clear()
   root.location+=basis@Vector((0,0,-low+.001))
  for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=frame)
  root.keyframe_insert('location',frame=frame)
 slot=rig.animation_data.action_slot;rig.animation_data.action=None
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,a).action_slot=slot;track.mute=True

zero=(0,0,0)
clip('Idle',[(1,{},zero),(25,{'Chest':(1.3,0,0),'Head':(1,-3,0),'Tail2':(0,0,5)},zero),(49,{},zero)])
walk=[]
for frame in range(1,26,2):
 t=(frame-1)*math.tau/24;s=math.sin(t)
 walk.append((frame,{'RUpperArm':(13*s,0,0),'LUpperArm':(-13*s,0,0),'RThigh':(-14*s,0,0),'LThigh':(14*s,0,0),'RForearm':(-15*max(0,s),0,0),'LForearm':(-15*max(0,-s),0,0),'RShin':(13*max(0,-s),0,0),'LShin':(13*max(0,s),0,0),'Head':(0,0,2*s),'Tail2':(0,0,5*s)},zero))
clip('Walking_A',walk,ground=True)
clip('Bite_Front',[(1,{},zero),(6,{'Chest':(-5,0,0),'Head':(-8,0,0)},(0,.008,0)),(10,{'Chest':(6,0,0),'Head':(4,0,0),'Jaw':(24,0,0)},(0,-.012,0)),(14,{'Chest':(8,0,0),'Head':(9,0,0),'Jaw':(0,0,0)},(0,-.020,0)),(24,{},zero)])
clip('Hit_A',[(1,{},zero),(5,{'Chest':(-5,0,0),'Head':(-10,0,7),'Tail3':(0,0,-6)},(0,.01,0)),(15,{},zero)])
clip('Death_A_Pose',[(1,{},zero),(10,{'Root':(0,24,0),'Head':(-7,0,8)},(.015,0,0)),(25,{'Root':(0,82,0),'Head':(-9,0,10),'Tail2':(0,0,-14),'RUpperArm':(0,-10,0),'RThigh':(0,-12,0)},(.07,0,0)),(36,{'Root':(0,82,0),'Head':(-9,0,10),'Tail2':(0,0,-14),'RUpperArm':(0,-10,0),'RThigh':(0,-12,0)},(.07,0,0))],ground=True)
scene.frame_set(1)
rig['fldAuthoredCreature']=True;rig['fldWolfPilot']=True
for b in rig.pose.bones:b.rotation_quaternion=(1,0,0,0);b.location=(0,0,0)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(output/'wolf-pilot.blend'))
bpy.ops.export_scene.gltf(filepath=str(output/'wolf-pilot.glb'),export_animation_mode='NLA_TRACKS',export_extras=True,export_image_format='AUTO')
(output/'provenance.json').write_text(json.dumps({'source':str(source.resolve()),'method':'Existing multiview/CuMesh body and fitted rig; new vertex coat, fitted eyes, opened mouth seam, oral surfaces/teeth and revised five clips. No generation or retopology rerun.','notes':'Source preserved. Surface mouth split and revised jaw weights require motion review; not accepted automatically.'},indent=2))
sys.stdout.flush();os._exit(0)
