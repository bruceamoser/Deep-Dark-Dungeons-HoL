"""Read-only Blender asset inspection; no welding, purging, transforms or decimation.
Usage: blender --background --factory-startup --python validate_asset.py -- input.glb output.json
"""
import argparse
import json
from pathlib import Path
import sys
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('input', type=Path)
parser.add_argument('report', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
if args.input.suffix.lower() not in ['.glb', '.gltf']:
    parser.error('Inspection currently supports GLB/glTF only.')
if args.input.resolve() == args.report.resolve():
    parser.error('Report must not overwrite the input.')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
meshes = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    mesh.calc_loop_triangles()
    linked = set(i for edge in mesh.edges for i in edge.vertices)
    usage = {tuple(sorted(edge.vertices)): 0 for edge in mesh.edges}
    for poly in mesh.polygons:
        for edge in poly.edge_keys:
            usage[tuple(sorted(edge))] += 1
    weighted = [len([g for g in v.groups if g.weight > 0.00001]) for v in mesh.vertices]
    bound = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    meshes.append({
        'name': obj.name, 'vertices': len(mesh.vertices), 'triangles': len(mesh.loop_triangles),
        'zero_area_faces': sum(p.area <= 1e-12 for p in mesh.polygons),
        'loose_vertices': sum(v.index not in linked for v in mesh.vertices),
        'boundary_edges': sum(v == 1 for v in usage.values()),
        'nonmanifold_edges_excluding_boundaries': sum(v != 1 and v != 2 for v in usage.values()),
        'scale': list(obj.scale), 'negative_determinant': obj.matrix_world.determinant() < 0,
        'uv_layers': len(mesh.uv_layers), 'shape_keys': len(mesh.shape_keys.key_blocks) if mesh.shape_keys else 0,
        'armatures': [mod.object.name for mod in obj.modifiers if mod.type == 'ARMATURE' and mod.object],
        'max_weight_influences': max(weighted, default=0),
        'unweighted_vertices': sum(v == 0 for v in weighted) if any(mod.type == 'ARMATURE' for mod in obj.modifiers) else None,
        'bounds_min': [min(v[i] for v in bound) for i in range(3)],
        'bounds_max': [max(v[i] for v in bound) for i in range(3)],
    })
report = {
    'input': str(args.input.resolve()), 'blender': bpy.app.version_string,
    'triangle_count': sum(m['triangles'] for m in meshes), 'meshes': meshes,
    'armatures': [{'name': o.name, 'bones': len(o.data.bones)} for o in bpy.context.scene.objects if o.type == 'ARMATURE'],
    'actions': [a.name for a in bpy.data.actions],
    'interpretation': 'Findings, not automatic failures. Open clothing surfaces and boundaries can be intentional. Dimensions are Blender Z-up; glTF export converts axes. No source changes made.',
}
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2) + '\n')
print('ASSET_INSPECTION', report['triangle_count'], 'triangles;', len(meshes), 'meshes;', len(report['armatures']), 'armatures')
