"""Reduce a static reconstruction before baking its texture atlas."""
import bpy, sys
source, output = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh
reduction=mesh.modifiers.new('Reconstruction reduction','DECIMATE')
reduction.ratio=75000/len(mesh.data.polygons)
bpy.ops.object.modifier_apply(modifier=reduction.name)
print('Reduced faces:',len(mesh.data.polygons))
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_animations=False)
