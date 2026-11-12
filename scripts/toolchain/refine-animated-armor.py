"""Fit the supplied enclosed helmet to an empty guardian, preserving source rig."""
import bpy,bmesh,sys
from pathlib import Path
from mathutils import Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True);bpy.ops.wm.open_mainfile(filepath=str(source))
o=bpy.data.objects['HeadArmor01'];adj={v.index:set() for v in o.data.vertices}
for e in o.data.edges:
 a,b=e.vertices;adj[a].add(b);adj[b].add(a)
unseen=set(adj);remove=[];counts=[]
while unseen:
 stack=[unseen.pop()];part=[]
 while stack:
  i=stack.pop();part.append(i)
  for j in adj[i]:
   if j in unseen:unseen.remove(j);stack.append(j)
 if len(part) in [35,49]:remove+=part;counts.append(len(part))
assert sorted(counts)==[35,49,49],('Inspect changed helmet',counts)
bm=bmesh.new();bm.from_mesh(o.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(o.data);bm.free()
image=next(n.image for n in o.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');px=list(image.pixels);w,h=image.size;uv=o.data.uv_layers.active.data

def mat(name,c,metal=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=.35;s.inputs['Metallic'].default_value=metal;m['preserveAuthoredRoughness']=True;return m
mats=[mat('HelmetSteel',(.4,.46,.4)),mat('HelmetGold',(.45,.3,.08)),mat('HelmetGreen',(.025,.075,.045)),mat('Empty visor',(.003,.006,.004),0)]
for m in mats:o.data.materials.append(m)
for f in o.data.polygons:
 c=sum((uv[i].uv for i in f.loop_indices),Vector((0,0)))/len(f.loop_indices);k=(int(c.y*h)*w+int(c.x*w))*4;r,g,b=px[k:k+3]
 f.material_index=2 if r>.3 and g<.08 and b<.4 else 3 if b>r*1.2 else 4 if max(r,g,b)<.04 else 3 if max(r,g,b)<.25 else 1
# Source skin tint is already metal: there is no human head/face in this suit.
for obj in bpy.data.objects:
 if obj.type=='MESH':
  for m in obj.data.materials:
   if m and m.name.startswith('Paint #a6ae9b'):m.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.7
bpy.ops.wm.save_as_mainfile(filepath=str(out/'animated-armor-refined.blend'))
