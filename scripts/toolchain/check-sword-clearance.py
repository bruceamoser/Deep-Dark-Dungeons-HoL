"""Check a fitted sword against the head meshes throughout the attack.

Usage: blender -b --python-exit-code 1 --python THIS -- scene.blend sword head [hood]
"""
import argparse
import math
import sys

import bpy
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("scene")
parser.add_argument("blade")
parser.add_argument("heads", nargs="+")
parser.add_argument("--head-min-z", type=float)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
bpy.ops.wm.open_mainfile(filepath=args.scene)
faces = {}
for name in (args.blade, *args.heads):
    mesh = bpy.data.objects[name].data
    faces[name] = [
        tuple(poly.vertices) for poly in mesh.polygons
        if name == args.blade or args.head_min_z is None
        or all(mesh.vertices[index].co.z > args.head_min_z for index in poly.vertices)
    ]
    assert faces[name], f"No triangles to check for {name}"
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for track in rig.animation_data.nla_tracks:
    track.mute = True
    if track.name == '1H_Melee_Attack_Slice_Diagonal':
        action = track.strips[0].action
rig.animation_data.action = action
rig.animation_data.action_slot = action.slots[0]

def tree(name, graph):
    obj = bpy.data.objects[name].evaluated_get(graph)
    return BVHTree.FromPolygons(
        [obj.matrix_world @ v.co for v in obj.data.vertices],
        faces[name],
    )

collisions = {}
for step in range(math.ceil(action.frame_range[0] * 4), math.floor(action.frame_range[1] * 4)+1):
    frame, quarter = divmod(step, 4)
    bpy.context.scene.frame_set(frame, subframe=quarter / 4)
    graph = bpy.context.evaluated_depsgraph_get()
    blade = tree(args.blade, graph)
    for name in args.heads:
        if blade.overlap(tree(name, graph)):
            collisions.setdefault(name, []).append(step/4)
print('Sword/head intersections at quarter-frame samples:', collisions)
assert not collisions, collisions
