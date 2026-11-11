"""Isolated head-fit experiment; never edits the supplied source model.

The cut is calibrated to the reviewed meeple Smoke Slinger painted mesh only.
This is not a general anatomy detector or production retopology operation.
"""
import argparse
import json
import sys
from pathlib import Path

import bmesh
import bpy

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.source))
objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert len(objects) == 1, "Use the unrigged, painted source, not an animated export"
head = objects[0]
head.data.transform(head.matrix_world)
head.matrix_world.identity()
bm = bmesh.new()
bm.from_mesh(head.data)
# Preserve UVs and paint above the neck. The opening is an intentional assembly
# boundary for this pilot, covered by the receiving body's neck.
bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                      plane_co=(0, 0, .302), plane_no=(0, 0, 1),
                      clear_inner=True, clear_outer=False, dist=1e-7)
bm.to_mesh(head.data)
bm.free()
head.data.update()
head.name = "GoblinHeadPilot"
for vertex in head.data.vertices:
    vertex.co.z -= .302
for material in head.data.materials:
    material["preserveAuthoredRoughness"] = True
    if material.use_nodes:
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                node.inputs["Roughness"].default_value = .3
head.data.calc_loop_triangles()
report = {"source": str(args.source), "triangles": len(head.data.loop_triangles),
          "cut_height_blender_z": .302, "status": "head-fit candidate; visual review required",
          "facial_animation": False, "neck_boundary": "open, intended to overlap receiving neck"}
(args.output / "head-report.json").write_text(json.dumps(report, indent=2) + "\n")
bpy.ops.wm.save_as_mainfile(filepath=str(args.output / "goblin-head.blend"))
bpy.ops.export_scene.gltf(filepath=str(args.output / "goblin-head.glb"),
                         export_format="GLB", export_extras=True)
print(json.dumps(report))
