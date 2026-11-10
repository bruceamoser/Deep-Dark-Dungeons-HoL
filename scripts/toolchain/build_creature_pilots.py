"""Author CC0-derived/original pilot meshes. Run in a new Blender background process.
Keeps all source GLBs unchanged; emits editable .blend and GLB outputs.
"""
import bpy, math, random
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/creatures/pilots'; EDIT=ROOT/'art/source/creatures'
OUT.mkdir(parents=True,exist_ok=True);EDIT.mkdir(parents=True,exist_ok=True)
random.seed(17)
def material(name,color,rough=.8,metal=0,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,alpha);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;b.inputs['Alpha'].default_value=alpha
 if alpha<1:m.surface_render_method='DITHERED'
 return m

def shape(name,loc,scale,mat,sub=2):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o

def skin(o,rig,bone):
 # Fresh geometry is transformed before binding; original donor transforms stay untouched.
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.parent=rig;o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE');o.modifiers.new('Skin','ARMATURE').object=rig;o.select_set(False)
 return o

def tube(name,points,radius,mat,cyclic=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=3;c.bevel_depth=radius;c.bevel_resolution=2
 s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(*v,1)
 s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def donor():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/characters/series4/Ninja.glb'))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 # Custom bone display objects are not render geometry.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.parent!=rig:bpy.data.objects.remove(o,do_unlink=True)
 return rig

def export(name,objects=None):
 # Merge only newly authored/equally-bound mesh parts, retaining material slots and bone groups.
 rig=next((o for o in bpy.context.scene.objects if o.type=='ARMATURE'),None)
 if rig:
  bpy.ops.object.select_all(action='DESELECT');meshes=[o for o in rig.children if o.type=='MESH']
  for o in meshes:o.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();meshes[0].name=name+'_Body'
 if not rig and name in ['GoblinSpear','GoblinPan']:
  meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
  bpy.ops.object.select_all(action='DESELECT')
  for o in meshes:
   bpy.context.view_layer.objects.active=o
   for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
   o.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();meshes[0].name=name
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects or list(bpy.context.scene.objects):
  if o.type in ['MESH','ARMATURE','EMPTY'] and not o.hide_render:o.select_set(True)
 bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False)
 print('PILOT_EXPORTED',name)

# Rat-headed thief. Retains CC0 Ninja body rig, weights and clothing topology.
rig=donor();fur=material('Rat fur',(0.22,.17,.115));pink=material('Rat ears nose tail',(.40,.23,.22));cloth=material('Weathered moss coat',(.095,.15,.115));leather=material('Worn leather',(.14,.085,.045));eye=material('Onyx eyes',(.008,.009,.006),.15);ivory=material('Incisors',(.72,.65,.43));dark=material('Muzzle shadow',(.065,.047,.03))
for o in list(rig.children):
 if o.type!='MESH':continue
 if any(n in o.name for n in ['Head','Mask']):bpy.data.objects.remove(o,do_unlink=True);continue
 o.data.materials.clear();o.data.materials.append(leather if 'Leg' in o.name else cloth)
# Sculpted head and muzzle, intentionally overlapping organic forms, not destructive donor remeshing.
for name,loc,scale,mat in [
 ('Rat skull',(0,.02,1.79),(.36,.31,.39),fur),('Long muzzle',(0,-.34,1.70),(.245,.39,.20),fur),
 ('Nose',(0,-.687,1.73),(.10,.065,.06),pink),('Lower jaw',(0,-.37,1.59),(.18,.27,.075),dark),('Neck',(0,.015,1.30),(.19,.18,.23),fur)]:skin(shape(name,loc,scale,mat,3),rig,'head')
for side in [-1,1]:
 for name,loc,scale,mat in [
 ('Round ear',(side*.32,.02,2.08),(.175,.085,.22),fur),('Ear inner',(side*.32,-.066,2.09),(.125,.025,.16),pink),
 ('Eye',(side*.262,-.251,1.94),(.07,.048,.072),eye),('Brow',(side*.27,-.244,2.015),(.12,.05,.037),fur),
 ('Tooth',(side*.047,-.59,1.57),(.038,.035,.085),ivory)]:skin(shape(name,loc,scale,mat),rig,'head')
 for i in range(3):
  skin(tube('Whisker',[(side*.17,-.48,1.7+i*.03),(side*(.5+i*.07),-.52+i*.04,1.72+i*.05)],.007,ivory),rig,'head')
# Weighted tail with four extra deform joints, preserving all existing joint names/rest data.
points=[(0,.14,.44),(.06,.40,.34),(.28,.66,.20),(.64,.72,.13),(.98,.51,.19)]
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for i in range(4):
 b=rig.data.edit_bones.new('tail_'+str(i));b.head=points[i];b.tail=points[i+1];b.parent=rig.data.edit_bones['hips'] if i==0 else rig.data.edit_bones['tail_'+str(i-1)]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
# Tapered connected tube with blended weights along its length.
verts=[];faces=[];rings=33;sides=10
for j in range(rings):
 u=j/(rings-1)*4;i=min(3,int(u));f=u-i;pos=Vector(points[i]).lerp(Vector(points[i+1]),f);t=(Vector(points[i+1])-Vector(points[i])).normalized();a=t.cross(Vector((0,0,1))).normalized();b=t.cross(a);r=.07*(1-j/(rings-1))+.012
 for k in range(sides):verts.append(pos+r*(math.cos(k*math.tau/sides)*a+math.sin(k*math.tau/sides)*b))
for j in range(rings-1):
 for k in range(sides):faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
mesh=bpy.data.meshes.new('Tail');mesh.from_pydata(verts,[],faces);tail=bpy.data.objects.new('Rat tail',mesh);bpy.context.collection.objects.link(tail);tail.data.materials.append(pink);tail.parent=rig
for i in range(4):
 g=tail.vertex_groups.new(name='tail_'+str(i))
 for j in range(rings):
  u=j/(rings-1)*3;w=max(0,1-abs(u-i))
  if w:g.add(list(range(j*sides,(j+1)*sides)),w,'REPLACE')
tail.modifiers.new('Skin','ARMATURE').object=rig
for p in mesh.polygons:p.use_smooth=True
# Split coat tails, belt, pouch and shoulder cape establish thief rather than lumberjack.
for side in [-1,1]:
 skin(shape('Coat skirt',(side*.17,.04,.46),(.22,.22,.23),cloth),rig,'hips')
 skin(shape('Leather pouch',(side*.30,-.17,.58),(.10,.08,.12),leather),rig,'hips')
# Coat lapels and diagonal leather strap, all follow the torso.
for side in [-1,1]:
 skin(shape('Coat lapel',(side*.12,-.29,1.00),(.095,.025,.19),cloth),rig,'spine')
skin(tube('Cross-body strap',[(-.25,-.255,1.11),(.02,-.305,.91),(.24,-.245,.67)],.025,leather),rig,'spine')
export('Wererat')

# Clay helper: purpose-built clay humanoid weighted to the shared animation rig.
rig=donor()
for o in list(rig.children):
 if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
clay=material('Kiln terracotta',(.37,.17,.085));raw=material('Unfired clay',(.53,.34,.19));shadow=material('Recessed clay',(.065,.035,.018));ochre=material('Maker seal',(.69,.47,.23))
# Subtle material bump, baked geometry remains smooth at silhouette.
for m in [clay,raw]:
 nodes=m.node_tree.nodes;noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=24;bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.035;m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
parts=[('Torso',(0,0,.86),(.40,.27,.39),'spine',clay),('Belly',(0,-.025,.57),(.32,.26,.22),'hips',raw),('Head',(0,0,1.55),(.34,.28,.35),'head',raw)]
for side,letter in [(-1,'r'),(1,'l')]:
 parts += [('Shoulder',(side*.30,0,1.09),(.23,.23,.22),'upperarm.'+letter,raw),('Upper arm',(side*.43,0,1.10),(.22,.17,.18),'upperarm.'+letter,clay),('Forearm',(side*.64,0,1.10),(.18,.17,.17),'lowerarm.'+letter,clay),('Palm',(side*.84,-.01,1.09),(.15,.13,.13),'hand.'+letter,raw),('Thigh',(side*.17,0,.42),(.16,.20,.21),'upperleg.'+letter,clay),('Shin',(side*.17,0,.22),(.14,.16,.17),'lowerleg.'+letter,raw),('Foot',(side*.17,-.12,.08),(.18,.26,.10),'foot.'+letter,clay)]
 for k in range(3):parts.append(('Blunt finger',(side*(.86+k*.045),-.06,1.02),(.04,.09,.06),'hand.'+letter,clay))
for name,loc,scale,bone,mat in parts:skin(shape(name,loc,scale,mat,3 if name in ['Head','Torso'] else 2),rig,bone)
for side in [-1,1]:
 skin(shape('Recessed eye',(side*.12,-.258,1.63),(.055,.028,.064),shadow),rig,'head')
 skin(shape('Thumbprint',(side*.16,-.25,.95),(.06,.015,.08),raw),rig,'spine')
skin(tube('Mouth seam',[(-.12,-.257,1.42),(0,-.285,1.405),(.12,-.257,1.42)],.018,shadow),rig,'head')
for z in [.73,.84]:skin(tube('Maker seal',[(0,-.273,z),(.08,-.26,z+.05),(0,-.276,z+.10),(-.08,-.26,z+.05),(0,-.273,z)],.012,ochre),rig,'spine')
export('ClayHelper')

# Wind vortex: hollow helical ribbons and orbiting leaves, not a skull ghost.
bpy.ops.wm.read_factory_settings(use_empty=True)
wind=material('Pale wind',(.52,.65,.65),.9,alpha=.5);mist=material('Cloud silver',(.73,.79,.72),.95,alpha=.36);leafmat=material('Dry leaves',(.23,.19,.075))
for n in range(7):
 verts=[];faces=[];steps=90;phase=n*math.tau/7
 for i in range(steps):
  t=i/(steps-1);z=.06+1.9*t;a=t*math.tau*(1.4+n*.08)+phase+.13*math.sin(t*22+n);r=.16+.53*math.sin(t*math.pi*.72)+.05*math.sin(t*25+n);w=(.025+.06*math.sin(t*math.pi))*max(.025,math.sin(t*math.pi)**.35)
  for side in [-1,1]:verts.append((r*math.cos(a),r*math.sin(a),z+side*w))
 for i in range(steps-1):faces.append((i*2,i*2+1,i*2+3,i*2+2))
 mesh=bpy.data.meshes.new('Wind ribbon');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('VortexWind_'+str(n),mesh);bpy.context.collection.objects.link(o);o.data.materials.append(wind if n%2 else mist)
 # Double-sided surfaces are intentional ribbons, not manifold solids.
 o.data.materials[0].use_backface_culling=False
 for p in mesh.polygons:p.use_smooth=True
for n in range(15):
 t=.15+.75*n/15;a=n*2.4;r=.22+.55*t
 leaf=shape('OrbitLeaf_'+str(n),(r*math.cos(a),r*math.sin(a),t*1.85),(.065,.018,.12),leafmat,1);leaf.rotation_euler=(n,.3,n*1.2)
 bpy.context.view_layer.objects.active=leaf;leaf.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=False,scale=True);leaf.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
leaves=[o for o in bpy.context.scene.objects if o.name.startswith('OrbitLeaf_')]
for o in leaves:o.select_set(True)
bpy.context.view_layer.objects.active=leaves[0];bpy.ops.object.join();leaves[0].name='OrbitLeaf_Cluster'
export('AirVortex')

# Spear in local Z (becomes Y in glTF), with blade and bindings; grip at origin.
bpy.ops.wm.read_factory_settings(use_empty=True)
wood=material('Ash shaft',(.18,.10,.045));iron=material('Dark hammered iron',(.20,.23,.21),.35,.75);wrap=material('Linen binding',(.35,.28,.17))
tube('Spear shaft',[(0,0,-.45),(0,0,2.0)],.025,wood)
blade=shape('Leaf spearhead',(0,0,2.15),(.095,.035,.25),iron,1)
for i in range(7):tube('Spear binding',[(.032*math.cos(t*.5),.032*math.sin(t*.5),1.86+i*.018) for t in range(14)],.007,wrap)
export('GoblinSpear')
# Saucepan with open bowl, broad rim and a side handle. Local head attachment origin at hat base.
bpy.ops.wm.read_factory_settings(use_empty=True)
bronze=material('Dented saucepan',(.25,.22,.13),.58,.65)
verts=[];faces=[];segments=24
for z,r in [(0,.48),(.08,.51),(.28,.40),(.33,.20)]:
 for i in range(segments):a=i*math.tau/segments;verts.append((r*math.cos(a),r*math.sin(a),z))
for j in range(3):
 for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
faces.append(tuple(range(segments*3,segments*4)))
mesh=bpy.data.meshes.new('Saucepan');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Saucepan helmet',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(bronze);o.modifiers.new('Metal thickness','SOLIDIFY').thickness=.025
handle=tube('Pan handle',[(.44,0,.10),(.70,0,.12),(.88,0,.13)],.045,bronze)
export('GoblinPan')
