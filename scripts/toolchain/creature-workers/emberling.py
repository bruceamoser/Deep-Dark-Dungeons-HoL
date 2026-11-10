"""Build the bounded Emberling review submission.

Run from this directory:
    timeout --kill-after=3s 45s /home/bmoser/.local/bin/blender \
      --background --factory-startup --threads 4 --python build.py
"""

import math
import os
import random
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/emberling"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(8675309)


def material(name, base, roughness=0.82, metallic=0.0, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*base, 1.0)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))
RIG = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
RIG.name = "Emberling_Rig"
RIG.data.name = "Emberling_Rig"

EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}
if {b.name for b in RIG.data.bones} != EXPECTED_BONES:
    raise RuntimeError("Ninja donor skeleton does not match the required 23-bone set")
REST_SNAPSHOT = {
    b.name: (tuple(b.head_local), tuple(b.tail_local), tuple(b.matrix_local[0]),
             tuple(b.matrix_local[1]), tuple(b.matrix_local[2]), tuple(b.matrix_local[3]),
             b.parent.name if b.parent else None)
    for b in RIG.data.bones
}

# Donor meshes and bone display shapes are not part of the submission.
for obj in list(bpy.data.objects):
    if obj != RIG:
        bpy.data.objects.remove(obj, do_unlink=True)
for bone in RIG.pose.bones:
    bone.custom_shape = None


CHARCOAL = material("Coal_Charcoal", (0.014, 0.016, 0.020), 0.94)
COAL_EDGE = material("Coal_Ridge", (0.060, 0.066, 0.074), 0.86)
EMBER = material(
    "Crack_Ember", (0.34, 0.012, 0.001), 0.46,
    emission=(1.0, 0.035, 0.001), strength=1.15,
)
HOT_CORE = material(
    "Core_Hot", (0.22, 0.012, 0.001), 0.56,
    emission=(1.0, 0.045, 0.001), strength=0.70,
)
FLAME_OUTER = material(
    "Flame_Orange", (0.85, 0.045, 0.001), 0.42,
    emission=(1.0, 0.032, 0.001), strength=1.10,
)
FLAME_INNER = material(
    "Flame_Yellow", (1.0, 0.30, 0.006), 0.34,
    emission=(1.0, 0.34, 0.010), strength=2.20,
)
EYE_GOLD = material(
    "Eye_Gold", (1.0, 0.22, 0.006), 0.30,
    emission=(1.0, 0.28, 0.008), strength=2.80,
)
MATERIALS = (CHARCOAL, COAL_EDGE, EMBER, HOT_CORE, FLAME_OUTER, FLAME_INNER, EYE_GOLD)

BODY_PARTS = []
FLAMES = []


def attach(obj, bone_name, collection=None):
    if bone_name not in RIG.data.bones:
        raise ValueError(f"Missing intended bone {bone_name}")
    obj.parent = RIG
    obj.matrix_parent_inverse = RIG.matrix_world.inverted()
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = RIG
    modifier.use_vertex_groups = True
    (collection if collection is not None else BODY_PARTS).append(obj)
    return obj


def rock(name, loc, scale, bone_name, mat, rot=(0.0, 0.0, 0.0),
         subdiv=1, rough=0.065, collection=None):
    """Create a faceted coal lump; all coordinates stay in armature space."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1.0, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    rotation = (
        Matrix.Rotation(rot[0], 4, "X")
        @ Matrix.Rotation(rot[1], 4, "Y")
        @ Matrix.Rotation(rot[2], 4, "Z")
    )
    transform = Matrix.Translation(Vector(loc)) @ rotation @ Matrix.Diagonal((*scale, 1.0))
    for vertex in obj.data.vertices:
        radial = 1.0 + rough * (
            0.58 * math.sin(vertex.index * 4.731 + loc[0] * 9.0)
            + 0.42 * math.sin(vertex.index * 9.173 + loc[2] * 5.0)
        )
        vertex.co = transform @ (vertex.co * radial)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return attach(obj, bone_name, collection)


def mesh_object(name, vertices, faces, mat, bone_name, smooth=False, collection=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = smooth
    return attach(obj, bone_name, collection)


def tube(name, points, radius, bone_name, mat, sides=5):
    points = [Vector(p) for p in points]
    vertices = []
    for index, point in enumerate(points):
        tangent = points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]
        tangent.normalize()
        helper = Vector((0.0, 1.0, 0.0)) if abs(tangent.y) < 0.8 else Vector((1.0, 0.0, 0.0))
        side_a = tangent.cross(helper).normalized()
        side_b = tangent.cross(side_a).normalized()
        taper = 0.72 if index in (0, len(points) - 1) else 1.0
        for j in range(sides):
            angle = math.tau * j / sides
            offset = radius * taper * (math.cos(angle) * side_a + math.sin(angle) * side_b)
            vertices.append(tuple(point + offset))
    faces = []
    for i in range(len(points) - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(reversed(tuple(range(sides)))))
    last = (len(points) - 1) * sides
    faces.append(tuple(last + j for j in range(sides)))
    return mesh_object(name, vertices, faces, mat, bone_name, smooth=True)


def prism(name, points_xz, y_front, thickness, bone_name, mat):
    vertices = [(x, y_front, z) for x, z in points_xz]
    vertices += [(x, y_front + thickness, z) for x, z in points_xz]
    count = len(points_xz)
    faces = [tuple(range(count)), tuple(range(count, count * 2))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    return mesh_object(name, vertices, faces, mat, bone_name)


def flame_tongue(name, base, height, width, depth, lean, phase,
                 mat=FLAME_OUTER, inner=False, bone_name="head"):
    """A closed low-poly flame silhouette with a tapered, wavering tip."""
    levels = 7
    sides = 6
    vertices = []
    bx, by, bz = base
    for i in range(levels):
        t = i / (levels - 1)
        # Broad rounded lower lobe, then a sharp taper.
        radius = max(
            (math.sin(math.pi * t) ** 0.62) * (1.0 - t) ** 0.16,
            0.006,
        )
        if inner:
            radius *= 0.52
        center_x = bx + lean * t * t + 0.022 * t * math.sin(t * math.pi * 2.0 + phase)
        center_y = by + 0.016 * t * math.sin(t * math.pi * 1.5 + phase * 0.7)
        center_z = bz + height * t
        for j in range(sides):
            angle = math.tau * j / sides
            wobble = 1.0 + 0.16 * math.sin((i + 1) * 2.71 + j * 3.13 + phase)
            vertices.append((
                center_x + math.cos(angle) * width * radius * wobble,
                center_y + math.sin(angle) * depth * radius * wobble,
                center_z + (0.005 * math.sin(angle * 2 + phase) if i < levels - 1 else 0.0),
            ))
    faces = []
    for i in range(levels - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(reversed(tuple(range(sides)))))
    last = (levels - 1) * sides
    faces.append(tuple(last + j for j in range(sides)))
    obj = mesh_object(name, vertices, faces, mat, bone_name, smooth=True, collection=FLAMES)
    obj["asset"] = "Emberling"
    obj["role"] = "runtime-flicker candidate"
    return obj


# A visible hot core sits behind tightly packed coal plates. The thin gaps are
# deliberate: they read as ember seams instead of a uniformly orange body.
rock("Core_Pelvis", (0.0, 0.01, 0.49), (0.31, 0.245, 0.23), "hips", HOT_CORE, subdiv=2, rough=0.02)
rock("Core_Spine", (0.0, 0.0, 0.72), (0.30, 0.235, 0.28), "spine", HOT_CORE, subdiv=2, rough=0.02)
rock("Core_Chest", (0.0, 0.0, 0.94), (0.35, 0.27, 0.30), "chest", HOT_CORE, subdiv=2, rough=0.02)
rock("Core_Head", (0.0, 0.0, 1.22), (0.33, 0.285, 0.28), "head", HOT_CORE, subdiv=2, rough=0.02)


# Broad coal torso plates, with the chest and belly slightly offset to avoid a
# smooth stone-golem silhouette.
plate_specs = [
    ("Chest_Center", (0.0, -0.285, 0.985), (0.245, 0.105, 0.225), "chest", COAL_EDGE, (0.03, 0.0, 0.0)),
    ("Chest_Upper_L", (0.215, -0.225, 1.035), (0.180, 0.115, 0.185), "chest", CHARCOAL, (0.0, 0.2, 0.18)),
    ("Chest_Upper_R", (-0.215, -0.225, 1.035), (0.180, 0.115, 0.185), "chest", CHARCOAL, (0.0, -0.2, -0.18)),
    ("Chest_Side_L", (0.325, -0.075, 0.955), (0.155, 0.205, 0.205), "chest", COAL_EDGE, (0.12, 0.24, 0.3)),
    ("Chest_Side_R", (-0.325, -0.075, 0.955), (0.155, 0.205, 0.205), "chest", COAL_EDGE, (0.12, -0.24, -0.3)),
    ("Chest_Back", (0.0, 0.255, 0.985), (0.29, 0.095, 0.225), "chest", CHARCOAL, (-0.08, 0.0, 0.0)),
    ("Belly_Center", (0.0, -0.255, 0.755), (0.205, 0.085, 0.160), "spine", CHARCOAL, (-0.1, 0.0, 0.0)),
    ("Belly_L", (0.215, -0.185, 0.755), (0.145, 0.110, 0.165), "spine", COAL_EDGE, (0.08, 0.18, -0.15)),
    ("Belly_R", (-0.215, -0.185, 0.755), (0.145, 0.110, 0.165), "spine", COAL_EDGE, (0.08, -0.18, 0.15)),
    ("Flank_L", (0.275, 0.07, 0.735), (0.125, 0.18, 0.17), "spine", CHARCOAL, (0.0, 0.28, 0.1)),
    ("Flank_R", (-0.275, 0.07, 0.735), (0.125, 0.18, 0.17), "spine", CHARCOAL, (0.0, -0.28, -0.1)),
    ("Pelvis_Front", (0.0, -0.225, 0.505), (0.21, 0.085, 0.135), "hips", COAL_EDGE, (-0.16, 0.0, 0.0)),
    ("Pelvis_L", (0.225, -0.08, 0.505), (0.16, 0.17, 0.15), "hips", CHARCOAL, (0.1, 0.25, 0.22)),
    ("Pelvis_R", (-0.225, -0.08, 0.505), (0.16, 0.17, 0.15), "hips", CHARCOAL, (0.1, -0.25, -0.22)),
    ("Pelvis_Back", (0.0, 0.225, 0.50), (0.25, 0.08, 0.145), "hips", CHARCOAL, (0.12, 0.0, 0.0)),
]
for spec in plate_specs:
    rock(*spec, subdiv=1, rough=0.07)


# Large head and angular crown. The face plate is a very dark mask, leaving
# strong contrast around the two jagged molten eyes.
head_plates = [
    ("Face_Mask", (0.0, -0.275, 1.235), (0.265, 0.075, 0.235), "head", CHARCOAL, (0.0, 0.0, 0.0)),
    ("Crown_Plate", (0.0, -0.04, 1.390), (0.275, 0.215, 0.070), "head", COAL_EDGE, (-0.12, 0.0, 0.0)),
    ("Temple_L", (0.285, -0.02, 1.255), (0.145, 0.235, 0.225), "head", CHARCOAL, (0.0, 0.22, 0.16)),
    ("Temple_R", (-0.285, -0.02, 1.255), (0.145, 0.235, 0.225), "head", CHARCOAL, (0.0, -0.22, -0.16)),
    ("Jaw", (0.0, -0.285, 1.055), (0.235, 0.09, 0.125), "head", COAL_EDGE, (0.10, 0.0, 0.0)),
    ("Back_Head", (0.0, 0.245, 1.255), (0.285, 0.085, 0.235), "head", CHARCOAL, (-0.05, 0.0, 0.0)),
    ("Head_Side_L", (0.338, 0.075, 1.245), (0.055, 0.245, 0.225), "head", COAL_EDGE, (0.0, 0.06, 0.12)),
    ("Head_Side_R", (-0.338, 0.075, 1.245), (0.055, 0.245, 0.225), "head", COAL_EDGE, (0.0, -0.06, -0.12)),
]
for spec in head_plates:
    rock(*spec, subdiv=1, rough=0.075)


def eye(name, side):
    sx = 1.0 if side == "l" else -1.0
    socket = [
        (sx * 0.030, 1.292), (sx * 0.075, 1.340), (sx * 0.180, 1.335),
        (sx * 0.230, 1.282), (sx * 0.176, 1.228), (sx * 0.080, 1.232),
    ]
    glow = [
        (sx * 0.050, 1.284), (sx * 0.092, 1.316), (sx * 0.164, 1.307),
        (sx * 0.200, 1.278), (sx * 0.158, 1.249), (sx * 0.095, 1.254),
    ]
    prism(f"EyeSocket_{side}", socket, -0.352, 0.022, "head", CHARCOAL)
    prism(f"EyeGlow_{side}", glow, -0.373, 0.016, "head", EYE_GOLD)
    # A thin descending fissure links each eye to the face seams.
    tube(
        f"EyeCrack_{side}",
        [(sx * 0.115, -0.378, 1.245), (sx * 0.090, -0.369, 1.205),
         (sx * 0.128, -0.355, 1.172)],
        0.009, "head", EMBER, sides=4,
    )


eye("l", "l")
eye("r", "r")
rock("Brow_L", (0.124, -0.326, 1.340), (0.135, 0.030, 0.052), "head", COAL_EDGE,
     rot=(0.0, 0.03, -0.25), subdiv=1, rough=0.04)
rock("Brow_R", (-0.124, -0.326, 1.340), (0.135, 0.030, 0.052), "head", COAL_EDGE,
     rot=(0.0, -0.03, 0.25), subdiv=1, rough=0.04)
rock("Mouth_Core", (0.0, -0.344, 1.126), (0.095, 0.014, 0.018), "head", EMBER,
     subdiv=1, rough=0.02)


# Short, blunt limbs. The arm materials emphasize ridged knuckles without
# turning the hands into generic rock spheres.
for side, sx in (("l", 1.0), ("r", -1.0)):
    rock(f"Shoulder_{side}", (sx * 0.365, 0.0, 1.070), (0.18, 0.195, 0.18),
         "upperarm." + side, COAL_EDGE, rot=(0.08, sx * 0.12, sx * 0.12), subdiv=1, rough=0.08)
    rock(f"UpperArm_{side}", (sx * 0.475, 0.0, 1.097), (0.165, 0.165, 0.145),
         "upperarm." + side, CHARCOAL, rot=(0.0, sx * 0.08, sx * 0.10), subdiv=1, rough=0.07)
    rock(f"Elbow_{side}", (sx * 0.555, -0.005, 1.097), (0.095, 0.115, 0.105),
         "lowerarm." + side, COAL_EDGE, subdiv=1, rough=0.08)
    rock(f"Forearm_{side}", (sx * 0.645, 0.0, 1.097), (0.145, 0.155, 0.14),
         "lowerarm." + side, CHARCOAL, rot=(0.03, sx * -0.05, sx * 0.06), subdiv=1, rough=0.075)
    rock(f"Wrist_{side}", (sx * 0.745, -0.005, 1.097), (0.075, 0.095, 0.085),
         "hand." + side, COAL_EDGE, subdiv=1, rough=0.07)
    rock(f"Palm_{side}", (sx * 0.825, -0.025, 1.075), (0.14, 0.18, 0.145),
         "hand." + side, CHARCOAL, rot=(0.05, sx * 0.10, sx * 0.08), subdiv=1, rough=0.075)
    for finger_index, (dy, dz) in enumerate(((-0.105, 0.065), (-0.135, 0.005), (-0.105, -0.060))):
        rock(f"Claw_{side}_{finger_index}", (sx * (0.905 + finger_index * 0.007), dy, 1.075 + dz),
             (0.073, 0.090, 0.060), "hand." + side, COAL_EDGE,
             rot=(0.0, sx * 0.10, sx * (finger_index - 1) * 0.15), subdiv=1, rough=0.075)
    tube(
        f"Arm_Seam_{side}",
        [(sx * 0.39, -0.145, 1.115), (sx * 0.47, -0.155, 1.095),
         (sx * 0.56, -0.125, 1.110), (sx * 0.64, -0.145, 1.102)],
        0.008, "upperarm." + side, EMBER, sides=4,
    )

    # Squat legs, broad planted feet and three short toe claws.
    rock(f"Hip_{side}", (sx * 0.205, 0.0, 0.445), (0.17, 0.18, 0.18),
         "upperleg." + side, COAL_EDGE, rot=(0.08, sx * 0.08, sx * 0.12), subdiv=1, rough=0.07)
    rock(f"Thigh_{side}", (sx * 0.225, -0.02, 0.335), (0.175, 0.18, 0.17),
         "upperleg." + side, CHARCOAL, rot=(0.08, sx * -0.08, sx * 0.1), subdiv=1, rough=0.07)
    rock(f"Knee_{side}", (sx * 0.225, -0.175, 0.295), (0.105, 0.075, 0.085),
         "lowerleg." + side, COAL_EDGE, subdiv=1, rough=0.065)
    rock(f"Shin_{side}", (sx * 0.225, -0.015, 0.215), (0.155, 0.165, 0.16),
         "lowerleg." + side, CHARCOAL, rot=(-0.06, sx * 0.08, -sx * 0.08), subdiv=1, rough=0.07)
    rock(f"Ankle_{side}", (sx * 0.225, 0.0, 0.112), (0.09, 0.10, 0.075),
         "foot." + side, COAL_EDGE, subdiv=1, rough=0.06)
    rock(f"Foot_{side}", (sx * 0.23, -0.105, 0.080), (0.20, 0.255, 0.080),
         "foot." + side, CHARCOAL, rot=(0.0, sx * 0.03, sx * 0.05), subdiv=1, rough=0.065)
    for toe_index, (dx, dy, dz) in enumerate(((-0.075, -0.258, 0.037), (0.0, -0.280, 0.041),
                                               (0.075, -0.258, 0.037))):
        rock(f"Toe_{side}_{toe_index}", (sx * (0.23 + dx), dy, dz),
             (0.072, 0.105, 0.050), "toes." + side, COAL_EDGE,
             rot=(0.0, 0.0, sx * (toe_index - 1) * 0.08), subdiv=1, rough=0.055)
    tube(
        f"Leg_Seam_{side}",
        [(sx * 0.252, -0.190, 0.442), (sx * 0.245, -0.205, 0.352),
         (sx * 0.264, -0.170, 0.232), (sx * 0.230, -0.330, 0.086)],
        0.008, "upperleg." + side, EMBER, sides=4,
    )

# Larger rear and lateral plates keep the hot core visible as seams rather
# than letting it dominate the silhouette from turn-around angles.
turnaround_plates = [
    ("Back_Rib_Upper", (0.0, 0.285, 1.085), (0.315, 0.072, 0.165), "chest", CHARCOAL),
    ("Back_Rib_Lower", (0.0, 0.275, 0.865), (0.300, 0.072, 0.158), "chest", COAL_EDGE),
    ("Back_Spine_Upper", (0.0, 0.255, 0.705), (0.265, 0.068, 0.153), "spine", CHARCOAL),
    ("Back_Spine_Lower", (0.0, 0.235, 0.565), (0.235, 0.066, 0.128), "hips", COAL_EDGE),
    ("Back_Pelvis_Center", (0.0, 0.245, 0.455), (0.225, 0.066, 0.112), "hips", CHARCOAL),
    ("Torso_Side_Cover_L", (0.345, 0.155, 0.885), (0.050, 0.170, 0.225), "chest", COAL_EDGE),
    ("Torso_Side_Cover_R", (-0.345, 0.155, 0.885), (0.050, 0.170, 0.225), "chest", COAL_EDGE),
    ("Spine_Side_Cover_L", (0.305, 0.150, 0.665), (0.048, 0.145, 0.170), "spine", CHARCOAL),
    ("Spine_Side_Cover_R", (-0.305, 0.150, 0.665), (0.048, 0.145, 0.170), "spine", CHARCOAL),
    ("Hip_Side_Cover_L", (0.280, 0.145, 0.470), (0.055, 0.130, 0.120), "hips", COAL_EDGE),
    ("Hip_Side_Cover_R", (-0.280, 0.145, 0.470), (0.055, 0.130, 0.120), "hips", COAL_EDGE),
]
for name, loc, scale, bone_name, mat in turnaround_plates:
    rock(name, loc, scale, bone_name, mat, subdiv=1, rough=0.055)


# Torso fissures are thin, branching ribbons laid over the coal surfaces.
for index, points in enumerate((
    [(0.0, -0.365, 0.61), (0.028, -0.378, 0.70), (-0.018, -0.390, 0.80),
     (0.012, -0.398, 0.91), (-0.012, -0.392, 1.025)],
    [(0.062, -0.385, 0.80), (0.155, -0.340, 0.770), (0.210, -0.295, 0.815)],
    [(-0.062, -0.385, 0.80), (-0.155, -0.340, 0.755), (-0.210, -0.295, 0.795)],
)):
    tube(f"Torso_Crack_{index}", points, 0.0105 if index else 0.012, "spine", EMBER, sides=4)
for side, sx in (("l", 1.0), ("r", -1.0)):
    tube(
        f"Chest_Crack_{side}",
        [(sx * 0.035, -0.392, 0.965), (sx * 0.095, -0.377, 1.020),
         (sx * 0.125, -0.344, 1.095), (sx * 0.205, -0.300, 1.115)],
        0.009, "chest", EMBER, sides=4,
    )


# Separate named flame nodes make the crown easy to flicker independently in
# runtime without requiring animation data in this review export.
crown_specs = [
    ("Flame_Crown_Center", (0.0, -0.012, 1.405), 0.305, 0.092, 0.052, 0.026, 0.2),
    ("Flame_Crown_L", (0.12, -0.018, 1.402), 0.270, 0.076, 0.047, 0.082, 1.4),
    ("Flame_Crown_R", (-0.12, -0.018, 1.402), 0.270, 0.076, 0.047, -0.082, 2.8),
    ("Flame_Crown_FarL", (0.235, 0.008, 1.385), 0.225, 0.058, 0.040, 0.075, 3.7),
    ("Flame_Crown_FarR", (-0.235, 0.008, 1.385), 0.225, 0.058, 0.040, -0.075, 5.1),
    ("Flame_Brow_L", (0.235, -0.14, 1.305), 0.135, 0.042, 0.030, 0.085, 4.4),
    ("Flame_Brow_R", (-0.235, -0.14, 1.305), 0.135, 0.042, 0.030, -0.085, 1.1),
    ("Flame_Shoulder_L", (0.405, 0.015, 1.155), 0.105, 0.038, 0.028, 0.045, 2.3),
    ("Flame_Shoulder_R", (-0.405, 0.015, 1.155), 0.105, 0.038, 0.028, -0.045, 5.5),
]
for spec in crown_specs:
    flame_tongue(*spec)
for index, spec in enumerate((
    ("Flame_Inner_Center", (0.0, -0.058, 1.425), 0.195, 0.040, 0.018, 0.015, 0.5),
    ("Flame_Inner_L", (0.12, -0.060, 1.420), 0.165, 0.032, 0.016, 0.035, 1.8),
    ("Flame_Inner_R", (-0.12, -0.060, 1.420), 0.165, 0.032, 0.016, -0.035, 3.2),
)):
    flame_tongue(*spec, mat=FLAME_INNER, inner=True)


def join_body(parts):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "Emberling_Body"
    body.data.name = "Emberling_Body"
    for modifier in list(body.modifiers):
        if modifier.type == "ARMATURE":
            body.modifiers.remove(modifier)
    modifier = body.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = RIG
    body.parent = RIG
    body.matrix_parent_inverse = RIG.matrix_world.inverted()
    body["asset"] = "Emberling"
    body["geometry_source"] = "Original procedural coal and flame geometry"
    body["rig_source"] = "CC0 KayKit Ninja.glb (armature only, 23 bones)"
    body["submission_status"] = "review draft"
    return body


BODY = join_body(BODY_PARTS)

# Verify the authored skin without changing any bound geometry.
group_names = {group.index: group.name for group in BODY.vertex_groups}
bad_weights = []
for vertex in BODY.data.vertices:
    influences = [(group_names[g.group], g.weight) for g in vertex.groups if g.weight > 0.00001]
    total = sum(weight for _, weight in influences)
    if not influences or abs(total - 1.0) > 0.0001:
        bad_weights.append((vertex.index, total))
if bad_weights:
    raise RuntimeError(f"Invalid skin weights on {len(bad_weights)} vertices")

for obj in FLAMES:
    group = obj.vertex_groups[0]
    if abs(sum(g.weight for v in obj.data.vertices for g in v.groups) - len(obj.data.vertices)) > 0.001:
        raise RuntimeError(f"Invalid flame weights on {obj.name}")

# Prove the donor rest contract is unchanged after authoring.
after = {
    b.name: (tuple(b.head_local), tuple(b.tail_local), tuple(b.matrix_local[0]),
             tuple(b.matrix_local[1]), tuple(b.matrix_local[2]), tuple(b.matrix_local[3]),
             b.parent.name if b.parent else None)
    for b in RIG.data.bones
}
if after != REST_SNAPSHOT:
    raise RuntimeError("Ninja rest skeleton changed during authoring")

RIG["asset"] = "Emberling"
RIG["rig_source"] = "CC0 KayKit Ninja.glb (23 bones preserved)"
RIG["submission_status"] = "review draft"
bpy.context.scene["asset"] = "Emberling"
bpy.context.scene["submission_status"] = "review draft"
bpy.context.scene["rig_rest_preserved"] = True

# Save and export only the intended character and rig. The neutral .blend is
# written before preview-only camera, lights and ground are created.
bpy.ops.object.select_all(action="DESELECT")
BODY.select_set(True)
RIG.select_set(True)
for obj in FLAMES:
    obj.select_set(True)
bpy.context.view_layer.objects.active = RIG

blend_path = OUT / "Emberling.blend"
glb_path = OUT / "Emberling.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
bpy.ops.export_scene.gltf(
    filepath=str(glb_path),
    export_format="GLB",
    use_selection=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
)


def aim_bone(bone_name, direction):
    bpy.context.view_layer.update()
    pose_bone = RIG.pose.bones[bone_name]
    head = pose_bone.head.copy()
    target = Vector(direction).normalized()
    rotation = Vector((0.0, 1.0, 0.0)).rotation_difference(target)
    pose_bone.matrix = Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


# Preview-only squat guard pose. Export occurred above with the neutral rest rig.
aim_bone("upperarm.l", (0.67, -0.08, -0.74))
aim_bone("upperarm.r", (-0.67, -0.08, -0.74))
aim_bone("lowerarm.l", (0.50, -0.18, -0.85))
aim_bone("lowerarm.r", (-0.50, -0.18, -0.85))


def review_scene():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35
    scene.world = bpy.data.worlds.new("Emberling_Review_World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.012, 0.016, 0.026, 1.0)
    bg.inputs["Strength"].default_value = 0.30

    ground_mat = material("REVIEW_Ground", (0.030, 0.025, 0.021), 0.94)
    bpy.ops.mesh.primitive_plane_add(size=5.0, location=(0.0, 0.0, -0.004))
    ground = bpy.context.object
    ground.name = "REVIEW_ONLY_Ground"
    ground.data.materials.append(ground_mat)

    def light(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        look_at(obj, (0.0, 0.0, 0.83))

    light("REVIEW_ONLY_Key", (-2.6, -3.4, 4.0), 310.0, 2.5, (1.0, 0.64, 0.36))
    light("REVIEW_ONLY_Fill", (3.2, -1.8, 2.4), 130.0, 2.2, (0.33, 0.48, 1.0))
    light("REVIEW_ONLY_Rim", (1.0, 3.0, 3.0), 240.0, 1.8, (1.0, 0.26, 0.06))
    camera_data = bpy.data.cameras.new("ReviewCamera")
    camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.12
    scene.camera = camera
    return camera


camera = review_scene()
for label, location, target in (
    ("front", (0.0, -4.8, 1.13), (0.0, 0.0, 0.79)),
    ("side", (4.8, 0.0, 1.07), (0.0, 0.0, 0.78)),
    ("back", (0.0, 4.8, 1.13), (0.0, 0.0, 0.79)),
):
    camera.location = location
    look_at(camera, target)
    bpy.context.scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", label, flush=True)

triangles = sum(len(p.vertices) - 2 for p in BODY.data.polygons)
triangles += sum(sum(len(p.vertices) - 2 for p in obj.data.polygons) for obj in FLAMES)
print("BUILT", blend_path, glb_path, flush=True)
print("TRIANGLES", triangles, flush=True)
print("MATERIALS", len(MATERIALS), flush=True)
print("BONES", len(RIG.data.bones), flush=True)
print("FLAME_NODES", len(FLAMES), flush=True)
print("BUILD_COMPLETE", flush=True)
sys.stdout.flush()
os._exit(0)
