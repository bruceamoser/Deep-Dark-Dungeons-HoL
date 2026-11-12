"""Preserve private ooze rig and surface; embed inspected owned bone scraps."""
import bpy,numpy as np,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector,Euler
from mathutils.bvhtree import BVHTree
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
for b in rig.pose.bones:b.matrix_basis.identity()
body=bpy.data.objects['geometry_0'];image=next(n.image for n in body.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');w,h=image.size;pixels=np.array(image.pixels[:]).reshape(h,w,4);uv=body.data.uv_layers.active.data
m=body.data.materials[0].copy();m.name='Digested bone';body.data.materials.append(m);count=0
for p in body.data.polygons:
 u,v=np.mean([uv[i].uv[:] for i in p.loop_indices],axis=0);r,g,b=pixels[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w))),:3]
 if b>.35:p.material_index=1;count+=1
assert count>100
mat=bpy.data.materials.new('Old swallowed bone');mat.use_nodes=True;n=mat.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(.40,.32,.15,1);n.inputs['Roughness'].default_value=.55;mat['preserveAuthoredRoughness']=True
bpy.context.view_layer.update();tree=BVHTree.FromPolygons([v.co[:] for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons]);sources={str(source):hashlib.sha256(source.read_bytes()).hexdigest()}
owned=Path('/home/bmoser/Projects/DDD-Asset-Workshop/PurchasedSource/KayKit-v8/The Complete KayKit Collection v8/KayKit Halloween Bits 1.0/Assets/gltf')
for letter,x,z,size,angle in [('A',-.08,.125,.10,.5),('B',.095,.09,.075,-.4)]:
 path=owned/f'bone_{letter}.gltf';sources[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest();before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=set(bpy.data.objects)-before;o=next(o for o in objects if o.type=='MESH');points=[o.matrix_world@v.co for v in o.data.vertices];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);mid=(lo+hi)/2;point,_,_,_=tree.ray_cast(Vector((x,-.4,z)),Vector((0,1,0)));assert point is not None
 rot=Euler((math.pi/2,angle,0)).to_matrix();mesh=o.data.copy()
 for v,p in zip(mesh.vertices,points):v.co=rot@((p-mid)*size/max(hi-lo))+point+Vector((0,.008,0))
 for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)
 o=bpy.data.objects.new('Suspended bone '+letter,mesh);bpy.context.collection.objects.link(o);o.parent=rig;o.vertex_groups.new(name='Core').add(list(range(len(mesh.vertices))),1,'REPLACE');o.modifiers.new('Sludge deformation','ARMATURE').object=rig;mesh.materials.clear();mesh.materials.append(mat)
for t in rig.animation_data.nla_tracks:
 if t.name=='Unarmed_Melee_Attack_Punch_A':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
 a=t.strips[0].action;rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0];samples=[]
 for f in range(int(t.strips[0].action_frame_start),int(t.strips[0].action_frame_end)+1):bpy.context.scene.frame_set(f);samples.append((f,rig.pose.bones['Root'].location.copy()))
 for f,location in samples:
  bpy.context.scene.frame_set(f);root=rig.pose.bones['Root'];root.location=location;bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();low=min(min((o.evaluated_get(graph).matrix_world@v.co).z for v in o.evaluated_get(graph).data.vertices) for o in bpy.data.objects if o.type=='MESH');root.location+=(rig.matrix_world@root.bone.matrix_local).to_3x3().inverted()@Vector((0,0,.002-low));root.keyframe_insert('location',frame=f)
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
bpy.context.scene.frame_set(1);rig['fldCreature']='creature-mire-ooze';(out/'sources.json').write_text(json.dumps(sources,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'mire-ooze-base.blend'))
