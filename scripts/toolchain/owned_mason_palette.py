"""Apply the owned Mason albedo/tint masks to an imported private part.
Preserve source UVs and unmasked decoration. No source textures are changed.
"""
import bpy,hashlib
from pathlib import Path
from mathutils import Vector

def paint_mason_part(obj,root,colors,material,hashes):
 root=Path(root);files=[root/'Texture/DefaultPolyart/Albedo.png',*[root/f'Texture/MaskTint/Mask0{i}.png' for i in range(1,4)]]
 for path in files:hashes[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
 base=bpy.data.materials.new(obj.name+' original palette');base.use_nodes=True;base['preserveAuthoredRoughness']=True;bs=base.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.3;tex=base.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(files[0]),check_existing=True);base.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 masks=[]
 for path in files[1:]:
  img=bpy.data.images.load(str(path),check_existing=True);masks.append((list(img.pixels),img.size[0],img.size[1]))
 obj.data.materials.clear();obj.data.materials.append(base);slots={}
 for channel,cfg in colors.items():
  slots[int(channel)]=len(obj.data.materials);obj.data.materials.append(material(obj.name+' tint '+channel,cfg['color'],cfg.get('roughness',.3),cfg.get('metallic',0)))
 uv=obj.data.uv_layers.active;assert uv,('Expected owned UVs',obj.name)
 for face in obj.data.polygons:
  center=sum((uv.data[i].uv for i in face.loop_indices),Vector((0,0)))/len(face.loop_indices);values=[]
  for pixels,w,h in masks:
   x=min(w-1,max(0,int(center.x*w)));y=min(h-1,max(0,int(center.y*h)));k=(y*w+x)*4;values.extend(pixels[k:k+3])
  channel=max(range(9),key=lambda i:values[i])+1 if max(values)>.5 else 0;face.material_index=slots.get(channel,0)
