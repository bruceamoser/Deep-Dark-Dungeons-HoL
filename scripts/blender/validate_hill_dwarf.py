"""Geometry, skin weights, deformation and GLB content checks for the prototype."""
import bpy,json,math,struct
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
scene=bpy.data.scenes['Hill dwarf — neutral base'];bpy.context.window.scene=scene
body=bpy.data.objects['Body — continuous neutral skin'];rig=bpy.data.objects['Hill dwarf rig']
assert all(v.groups and abs(sum(g.weight for g in v.groups)-1)<.002 for v in body.data.vertices)
assert all(math.isfinite(c) for v in body.data.vertices for c in v.co)
# Surface connectivity: no detached shoulder/limb pieces hidden by overlap.
neighbors=[set() for v in body.data.vertices]
for e in body.data.edges:a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
seen=set();components=[]
for index in range(len(neighbors)):
 if index in seen:continue
 todo=[index];seen.add(index);n=0
 while todo:
  a=todo.pop();n+=1
  for b in neighbors[a]-seen:seen.add(b);todo.append(b)
 components.append(n)
assert len(components)==1,components
edge_faces={tuple(sorted(e.vertices)):0 for e in body.data.edges}
for p in body.data.polygons:
 for e in p.edge_keys:edge_faces[tuple(sorted(e))]+=1
assert all(n==2 for n in edge_faces.values()),'Body has open/nonmanifold edges'
deps=bpy.context.evaluated_depsgraph_get()
def vertices():
 bpy.context.view_layer.update();obj=body.evaluated_get(deps);mesh=obj.to_mesh();out=[obj.matrix_world@v.co for v in mesh.vertices];obj.to_mesh_clear();return out
rest=vertices();bone=rig.pose.bones['lowerarml'];bone.rotation_mode='XYZ';bone.rotation_euler.y=.6
posed=vertices();motion=max((a-b).length for a,b in zip(rest,posed));assert motion>.035,motion
bone.rotation_euler=(0,0,0);bpy.context.view_layer.update()
b=(root/'art/exports/characters/hill-dwarf-base.glb').read_bytes();length=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+length]);names=[n.get('name','') for n in g['nodes']]
assert len(g['meshes'])==3,len(g['meshes'])
assert len(g['skins'])==1
assert not any(n in names for n in ['Cube','Camera','Studio floor','Character review'])
assert all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
result={'body_connected_components':len(components),'body_closed_manifold':True,'body_vertices':len(body.data.vertices),'normalized_skin_weights':True,'elbow_pose_max_displacement_m':round(motion,4),'export_meshes':len(g['meshes']),'export_skins':len(g['skins']),'rig_bones':len(rig.data.bones),'animation_retargeting':'not validated'}
roundtrip=bpy.data.scenes.new('GLB roundtrip validation');bpy.context.window.scene=roundtrip
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'art/exports/characters/hill-dwarf-base.glb'))
meshes=[o for o in set(bpy.data.objects)-before if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
assert len(meshes)==3
assert all(any(m.type=='ARMATURE' and m.object for m in o.modifiers) for o in meshes)
assert all(all(v.groups for v in o.data.vertices) for o in meshes)
result['glb_roundtrip_skinned_meshes']=len(meshes)
(root/'art/exports/characters/hill-dwarf-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
