"""Original sculpted-wind pilot. Fresh Blender scene; no purchased mesh inputs.
Static GLB with named moving parts; animation is supplied by air-elemental.mjs.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,c,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,alpha);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,alpha);p.inputs['Roughness'].default_value=.3;p.inputs['Alpha'].default_value=alpha
 m['preserveAuthoredRoughness']=True
 if alpha<1:m.surface_render_method='DITHERED'
 return m
pearl=material('Pearl wind',(.78,.88,.94));white=material('Ivory curl tips',(.95,.97,1));blue=material('Ice blue undersides',(.24,.51,.65));mist=material('Thin translucent wake',(.64,.87,.96),.24)
parts=[]
def sweep(name,points,width,depth,mat,parent):
 # Closed elliptical cross-sections taper to fine tips, following a transported frame.
 verts=[];faces=[];N=len(points);sides=10;previous_normal=None
 for i,p in enumerate(points):
  tangent=Vector(points[min(i+1,N-1)])-Vector(points[max(i-1,0)]);tangent.normalize()
  normal=(previous_normal-tangent*previous_normal.dot(tangent)) if previous_normal is not None else tangent.cross(Vector((0,0,1)))
  if normal.length<.01:normal=tangent.cross(Vector((0,1,0)))
  normal.normalize();previous_normal=normal.copy();binormal=tangent.cross(normal).normalized()
  t=i/(N-1);taper=max(.015,math.sin(math.pi*t)**.55)
  for j in range(sides):
   a=2*math.pi*j/sides;v=Vector(p)+normal*(math.cos(a)*width*taper)+binormal*(math.sin(a)*depth*taper);verts.append(v)
  if i:
   for j in range(sides):faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
 faces.append(tuple(reversed(range(sides))));faces.append(tuple((N-1)*sides+j for j in range(sides)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;mesh.materials.append(mat)
 for f in mesh.polygons:f.use_smooth=True
 return o
for level in range(3):
 parent=bpy.data.objects.new(['WindLower','WindMiddle','WindCrown'][level],None);bpy.context.collection.objects.link(parent);parts.append(parent)
 # Several interleaved broad winds; asymmetry prevents a mechanical coil silhouette.
 for k in range(1 if level==0 else 2):
  pts=[]
  for i in range(85):
   t=i/84;angle=t*math.pi*(2.3 if level==0 else 1.55)+k*math.pi+level*1.25
   z=.13+level*.56+t*.76
   radius=(.08+z*.4)*(1+.16*math.sin(2*angle+.7))
   if level==2:radius*=1-.27*t
   pts.append((radius*math.cos(angle),radius*math.sin(angle),z+.035*math.sin(angle*3)))
  sweep(f'Wind_{level}_{k}',pts,.105+level*.025,.07+level*.018,pearl if k!=1 else white,parent)
  # A smaller blue ridge on the underside gives depth without painted noise.
  ridges=[(x*.96,y*.96,z-.065) for x,y,z in pts]
  sweep(f'Groove_{level}_{k}',ridges,.023,.026,blue,parent)
 # Large scroll tips grow out of the crown; curves curl inward in a vertical plane.
 if level>0:
  for k in range(2):
   a=k*math.pi+level*1.25+1.55*math.pi;pts=[]
   for i in range(65):
    t=i/64;q=-math.pi*.7+t*math.pi*1.75;r=.32*(1-.86*t)
    radial=.5+level*.12+math.cos(q)*r;z=.76+level*.56+math.sin(q)*r
    pts.append((math.cos(a)*radial,math.sin(a)*radial,z))
   sweep(f'Curl_{level}_{k}',pts,.095,.07,pearl,parent)
# Two restrained outer wisps; opaque body still carries the silhouette.
for k in range(2):
 pts=[]
 for i in range(90):
  t=i/89;a=t*math.pi*2.6+k*math.pi;r=.3+t*.65;pts.append((math.cos(a)*r,math.sin(a)*r,.1+1.7*t))
 sweep('Wake_'+str(k),pts,.035,.048,mist,parts[1])
# Merge by parent AND material to keep draw calls low, preserving separate motion groups.
for parent in parts:
 for mat in [pearl,white,blue,mist]:
  obs=[o for o in parent.children if o.type=='MESH' and o.data.materials[0]==mat]
  if not obs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=parent.name+'_'+mat.name.replace(' ','_')
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'air-elemental.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'air-elemental.glb'),export_format='GLB',export_extras=True)
(out/'build.json').write_text(json.dumps({'triangles':triangles,'materials':4,'source':'Original authored wind sweeps; no source asset input','animation':'Named parts animated by src/view/air-elemental.mjs','roughness':.3},indent=2))
print('AIR_PILOT',triangles)
