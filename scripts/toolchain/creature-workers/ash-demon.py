"""Build the AshDemon review submission.

Run with:
    timeout --kill-after=3s 45s blender \
        --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/ash-demon.py
"""

import hashlib
import json
import math
import os
import random
from pathlib import Path
import sys

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/ash-demon"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
SOURCE_LICENSE = ROOT / "public/assets/characters/LICENSE.txt"
EXPECTED_HASHES = {
    SOURCE_RIG: "5e7fc34eef2011f4d4cf534acad039f2edc18be42d4542cc7c776a62142129e0",
    SOURCE_LICENSE: "6bb1f6315ce0f1cdebf7a5fdb926a1bc9fe3f967d2bd1adc5dd5f7365cba34ba",
}
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(104729)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


for path, expected in EXPECTED_HASHES.items():
    actual = sha256(path)
    if actual != expected:
        raise RuntimeError(f"Input hash mismatch: {path} {actual}")


def material(name, color, roughness, emission=None, strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1.0)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = 0.0
    node.inputs["Alpha"].default_value = alpha
    if emission:
        node.inputs["Emission Color"].default_value = (*emission, 1.0)
        node.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        try:
            mat.surface_render_method = "DITHERED"
        except (AttributeError, TypeError):
            pass
    return mat


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))

RIG = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
RIG.name = "Rig_Medium"
RIG.data.name = "Rig_Medium"
EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}
actual_bones = {bone.name for bone in RIG.data.bones}
if actual_bones != EXPECTED_BONES:
    raise RuntimeError(f"Unexpected donor skeleton: {sorted(actual_bones ^ EXPECTED_BONES)}")

for obj in list(bpy.data.objects):
    if obj != RIG:
        bpy.data.objects.remove(obj, do_unlink=True)
for bone in RIG.pose.bones:
    bone.custom_shape = None
RIG.data.pose_position = "REST"

CHAR = material("Charred_Flesh", (0.032, 0.036, 0.041), 0.94)
OBSIDIAN = material("Obsidian_Spars", (0.013, 0.010, 0.008), 0.78)
MEMBRANE = material(
    "Ember_Wing_Membrane",
    (0.16, 0.025, 0.002),
    0.62,
    emission=(0.82, 0.045, 0.001),
    strength=0.95,
)
CRACK = material(
    "Molten_Cracks",
    (0.40, 0.020, 0.001),
    0.48,
    emission=(1.0, 0.032, 0.001),
    strength=1.45,
)
CORE = material(
    "Hot_Core",
    (0.90, 0.16, 0.001),
    0.34,
    emission=(1.0, 0.32, 0.004),
    strength=1.8,
)
BONE = material("Ivory_Teeth_Claws", (0.57, 0.43, 0.28), 0.64)
SMOKE = material("Smoke_Ash", (0.20, 0.21, 0.22), 1.0, alpha=0.22)

PARTS = {}


def register(obj, mat, bone, group=None):
    if bone not in RIG.data.bones:
        raise ValueError(f"Missing intended bone {bone}")
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    group_vertices = obj.vertex_groups.new(name=bone)
    group_vertices.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    PARTS.setdefault(group or mat.name, []).append(obj)
    obj.select_set(False)
    return obj


def ico(name, loc, scale, mat, bone, subdivisions=1, rotation=(0.0, 0.0, 0.0),
        jitter=0.0, group=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if jitter:
        for vertex in obj.data.vertices:
            vertex.co += Vector((
                RNG.uniform(-jitter, jitter),
                RNG.uniform(-jitter, jitter),
                RNG.uniform(-jitter, jitter),
            ))
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return register(obj, mat, bone, group)


def cone_between(name, start, end, radius_start, radius_end, mat, bone,
                 sides=8, group=None):
    start, end = Vector(start), Vector(end)
    direction = end - start
    if direction.length < 1e-6:
        raise ValueError(f"Degenerate segment: {name}")
    bpy.ops.mesh.primitive_cone_add(
        vertices=sides,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return register(obj, mat, bone, group)


def tube(name, points, radius, mat, bone, sides=6, group=None):
    for index, (start, end) in enumerate(zip(points, points[1:])):
        cone_between(
            f"{name}_{index:02d}",
            start,
            end,
            radius,
            radius * 0.90,
            mat,
            bone,
            sides=sides,
            group=group,
        )


def custom_mesh(name, vertices, faces, mat, bone, group=None):
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return register(obj, mat, bone, group)


def mirror_x(points):
    return [(-x, y, z) for x, y, z in points]


# Broad animal-like torso, with separately weighted compact joints.
ico("Pelvis", (0.0, 0.045, 0.66), (0.33, 0.27, 0.31), CHAR, "hips", 2, jitter=0.012)
ico("Abdomen", (0.0, -0.015, 0.92), (0.38, 0.29, 0.34), CHAR, "spine", 2, jitter=0.013)
ico("Deep_Chest", (0.0, 0.015, 1.22), (0.49, 0.33, 0.33), CHAR, "chest", 2, jitter=0.015)
ico("Breastplate", (0.0, -0.245, 1.19), (0.33, 0.105, 0.25), OBSIDIAN, "chest", 1, jitter=0.009)
ico("Neck", (0.0, -0.105, 1.48), (0.23, 0.24, 0.27), CHAR, "chest", 1, jitter=0.010)
ico("Back_Hump", (0.0, 0.255, 1.30), (0.34, 0.15, 0.26), OBSIDIAN, "chest", 1, jitter=0.012)

# Arms follow the canonical Ninja rest pose exactly.
for side, sx in (("l", 1.0), ("r", -1.0)):
    ico(f"Shoulder_{side}", (sx * 0.34, 0.015, 1.17), (0.19, 0.22, 0.20),
        CHAR, "upperarm." + side, 1, jitter=0.008)
    cone_between(f"UpperArm_{side}", (sx * 0.25, 0.0, 1.107),
                 (sx * 0.46, 0.014, 1.107), 0.135, 0.105,
                 CHAR, "upperarm." + side, 8)
    ico(f"Elbow_{side}", (sx * 0.46, 0.014, 1.107), (0.12, 0.13, 0.12),
        OBSIDIAN, "lowerarm." + side, 1, jitter=0.005)
    cone_between(f"Forearm_{side}", (sx * 0.46, 0.014, 1.107),
                 (sx * 0.72, 0.0, 1.107), 0.108, 0.082,
                 CHAR, "lowerarm." + side, 8)
    ico(f"Palm_{side}", (sx * 0.82, -0.005, 1.095), (0.15, 0.15, 0.115),
        CHAR, "hand." + side, 1, jitter=0.006)
    for finger_index, (dy, dz) in enumerate(((-0.075, 0.045), (0.0, 0.0), (0.070, -0.030))):
        start = (sx * 0.88, dy, 1.105 + dz)
        end = (sx * (1.035 + 0.018 * (finger_index == 1)), dy - 0.075, 0.995 + dz)
        cone_between(f"HandClaw_{side}_{finger_index}", start, end, 0.038, 0.0,
                     BONE, "hand." + side, 6)
        cone_between(f"HandClawRoot_{side}_{finger_index}",
                     (sx * 0.865, dy, 1.110 + dz),
                     start, 0.047, 0.035, CHAR, "hand." + side, 6)

# Bent, heavy legs with oversized feet and three forward claws per foot.
for side, sx in (("l", 1.0), ("r", -1.0)):
    ico(f"Hip_{side}", (sx * 0.205, 0.01, 0.57), (0.145, 0.17, 0.15),
        OBSIDIAN, "upperleg." + side, 1, jitter=0.005)
    ico(f"Thigh_{side}", (sx * 0.215, -0.015, 0.41), (0.18, 0.20, 0.235),
        CHAR, "upperleg." + side, 1, jitter=0.007,
        rotation=(0.0, sx * 0.11, sx * 0.04))
    ico(f"Knee_{side}", (sx * 0.185, -0.055, 0.27), (0.115, 0.13, 0.105),
        OBSIDIAN, "lowerleg." + side, 1, jitter=0.005)
    cone_between(f"Shin_{side}", (sx * 0.18, -0.015, 0.285),
                 (sx * 0.18, -0.045, 0.12), 0.105, 0.075,
                 CHAR, "lowerleg." + side, 8)
    ico(f"Foot_{side}", (sx * 0.18, -0.16, 0.075), (0.16, 0.27, 0.085),
        CHAR, "foot." + side, 1, jitter=0.005)
    for toe_index, dx in enumerate((-0.085, 0.0, 0.085)):
        cone_between(f"ToeClaw_{side}_{toe_index}",
                     (sx * 0.18 + dx, -0.34, 0.075),
                     (sx * 0.18 + dx * 1.25, -0.47, 0.035),
                     0.044, 0.0, BONE, "toes." + side, 6)

# Narrow neck and fierce horned head. Open jaw remains visibly separate.
ico("Head", (0.0, -0.235, 1.70), (0.255, 0.30, 0.225), CHAR, "head", 2, jitter=0.009)
ico("Snout", (0.0, -0.455, 1.655), (0.205, 0.255, 0.125), CHAR, "head", 1, jitter=0.006)
ico("MouthGlow", (0.0, -0.505, 1.575), (0.145, 0.19, 0.055), CORE, "head", 1)
ico("LowerJaw", (0.0, -0.455, 1.505), (0.17, 0.24, 0.065), CHAR, "head", 1,
    jitter=0.004, rotation=(-0.12, 0.0, 0.0))
for side, sx in (("l", 1.0), ("r", -1.0)):
    ico(f"Eye_{side}", (sx * 0.115, -0.487, 1.725), (0.055, 0.027, 0.030),
        CORE, "head", 1)
    ico(f"Brow_{side}", (sx * 0.13, -0.435, 1.77), (0.105, 0.055, 0.038),
        OBSIDIAN, "head", 1, rotation=(0.0, sx * -0.25, sx * 0.20))
    for tooth_index, x in enumerate((0.035, 0.090, 0.140)):
        cone_between(f"UpperFang_{side}_{tooth_index}",
                     (sx * x, -0.555, 1.585),
                     (sx * x, -0.555, 1.515),
                     0.020, 0.0, BONE, "head", 5)
    for tooth_index, x in enumerate((0.045, 0.105)):
        cone_between(f"LowerFang_{side}_{tooth_index}",
                     (sx * x, -0.535, 1.520),
                     (sx * x, -0.535, 1.578),
                     0.018, 0.0, BONE, "head", 5)

    horn = [
        (sx * 0.145, -0.11, 1.84),
        (sx * 0.265, -0.025, 1.945),
        (sx * 0.260, 0.085, 2.025),
        (sx * 0.155, 0.145, 2.055),
        (sx * 0.055, 0.115, 2.030),
    ]
    for index, (start, end) in enumerate(zip(horn, horn[1:])):
        cone_between(f"Horn_{side}_{index}", start, end,
                     0.070 - index * 0.013, 0.055 - index * 0.013,
                     OBSIDIAN, "head", 7)
    for ridge_index, (y, z) in enumerate(((-0.17, 1.81), (-0.08, 1.865))):
        cone_between(f"BrowSpike_{side}_{ridge_index}",
                     (sx * (0.18 + ridge_index * 0.035), y, z),
                     (sx * (0.25 + ridge_index * 0.04), y + 0.02, z + 0.11),
                     0.035, 0.0, OBSIDIAN, "head", 6)

# Charcoal dorsal spikes and flame tufts reinforce the restless ash silhouette.
for index, (y, z, height) in enumerate((
    (0.24, 1.43, 0.15),
    (0.24, 1.29, 0.18),
    (0.20, 1.12, 0.14),
    (0.16, 0.95, 0.11),
)):
    cone_between(f"BackSpike_{index}", (0.0, y, z), (0.0, y + 0.06, z + height),
                 0.055, 0.0, OBSIDIAN, "chest" if z > 1.05 else "spine", 6)

for side, sx in (("l", 1.0), ("r", -1.0)):
    flame_tongues = (
        ((sx * 0.27, 0.115, 1.49), (sx * 0.36, 0.135, 1.61),
         (sx * 0.31, 0.155, 1.75), (sx * 0.22, 0.165, 1.86)),
        ((sx * 0.21, 0.105, 1.52), (sx * 0.16, 0.135, 1.63),
         (sx * 0.10, 0.155, 1.73)),
        ((sx * 0.34, 0.105, 1.50), (sx * 0.43, 0.145, 1.60),
         (sx * 0.46, 0.165, 1.69)),
    )
    for tongue_index, flame in enumerate(flame_tongues):
        for index, (start, end) in enumerate(zip(flame, flame[1:])):
            cone_between(f"ShoulderFlame_{side}_{tongue_index}_{index}", start, end,
                         0.034 - index * 0.010, 0.024 - index * 0.010,
                         CRACK, "chest", 6)

    # Two thin translucent smoke groups only; each is consolidated to one mesh.
    smoke_group = f"Smoke_{side}"
    smoke = (
        (sx * 0.25, 0.225, 1.57),
        (sx * 0.34, 0.195, 1.70),
        (sx * 0.27, 0.205, 1.84),
        (sx * 0.19, 0.225, 1.96),
    )
    for index, (start, end) in enumerate(zip(smoke, smoke[1:])):
        cone_between(f"SmokeRibbon_{side}_{index}", start, end,
                     0.038 - index * 0.009, 0.028 - index * 0.008,
                     SMOKE, "chest", 7, group=smoke_group)

# Ragged bat wings: one glowing membrane fan and charcoal structural spars each side.
left_outline = [
    (0.13, 0.20, 1.26),
    (0.22, 0.23, 1.49),
    (0.38, 0.25, 1.82),
    (0.73, 0.27, 1.94),
    (1.12, 0.29, 1.79),
    (1.34, 0.31, 1.46),
    (1.24, 0.30, 1.10),
    (1.03, 0.28, 1.31),
    (0.93, 0.27, 1.00),
    (0.72, 0.26, 1.27),
    (0.58, 0.24, 0.98),
    (0.39, 0.23, 1.20),
    (0.23, 0.21, 1.02),
    (0.14, 0.20, 1.16),
]
left_center = (0.31, 0.24, 1.40)
for side, outline in (("l", left_outline), ("r", mirror_x(left_outline))):
    center = (left_center[0] if side == "l" else -left_center[0],) + left_center[1:]
    vertices = [center] + outline
    # Leave one lower membrane wedge unfilled on each side for a real broken
    # web opening while the outer charcoal spar path remains continuous.
    faces = [(0, i, i + 1) for i in range(1, len(outline)) if i != 8]
    faces.append((0, len(outline), 1))
    custom_mesh(f"WingMembrane_{side}", vertices, faces, MEMBRANE, "chest")

    sx = 1.0 if side == "l" else -1.0
    spar_paths = [
        [outline[0], outline[1], outline[2], outline[3], outline[4], outline[5]],
        [outline[2], outline[7]],
        [outline[2], outline[9]],
        [outline[2], outline[11]],
        [(sx * 0.24, 0.22, 1.43), outline[4]],
    ]
    for path_index, path in enumerate(spar_paths):
        for segment_index, (start, end) in enumerate(zip(path, path[1:])):
            cone_between(
                f"WingSpar_{side}_{path_index}_{segment_index}",
                start, end, 0.035 if path_index == 0 else 0.024,
                0.024 if path_index == 0 else 0.014,
                OBSIDIAN, "chest", 6,
            )
    ico(f"WingRoot_{side}", (0.19 if side == "l" else -0.19, 0.205, 1.40),
        (0.13, 0.10, 0.11), OBSIDIAN, "chest", 1, jitter=0.004)

# Sinuous tail with an ember edge and a pointed, hot tip.
tail = [
    (0.0, 0.25, 0.69),
    (0.10, 0.48, 0.63),
    (0.30, 0.65, 0.52),
    (0.50, 0.74, 0.57),
    (0.61, 0.67, 0.73),
    (0.51, 0.53, 0.84),
    (0.34, 0.46, 0.83),
    (0.20, 0.53, 0.73),
    (0.12, 0.66, 0.66),
]
tail_radii = (0.135, 0.125, 0.105, 0.085, 0.066, 0.050, 0.035, 0.020, 0.010)
for index, (start, end, radius) in enumerate(zip(tail, tail[1:], tail_radii)):
    cone_between(f"Tail_{index}", start, end, radius, tail_radii[index + 1] * 0.92,
                 CHAR, "hips", 7)
    ico(f"TailJoint_{index}", start, (radius * 0.76,) * 3, CHAR, "hips", 1, jitter=0.003)
edge = [(x, y + 0.055, z + 0.035) for x, y, z in tail]
tube("TailEmberEdge", edge, 0.012, CRACK, "hips", 5)
cone_between("TailTip", tail[-1], (0.05, 0.77, 0.69), 0.030, 0.0, CORE, "hips", 6)

# Winding front cracks wrap shoulders, chest, limbs, and tail root.
tube("ChestCrack_Main", [
    (-0.03, -0.372, 1.41),
    (0.09, -0.392, 1.32),
    (-0.02, -0.395, 1.23),
    (0.10, -0.365, 1.12),
    (-0.01, -0.335, 1.01),
], 0.014, CRACK, "chest", 5)
tube("ChestCrack_BranchL", [
    (-0.02, -0.395, 1.23),
    (0.17, -0.350, 1.29),
    (0.26, -0.287, 1.20),
], 0.011, CRACK, "chest", 5)
tube("ChestCrack_BranchR", [
    (-0.02, -0.395, 1.23),
    (-0.18, -0.350, 1.18),
    (-0.27, -0.270, 1.27),
], 0.011, CRACK, "chest", 5)
tube("BellyCrack", [
    (-0.01, -0.335, 1.01),
    (0.11, -0.307, 0.91),
    (-0.05, -0.275, 0.79),
    (0.08, -0.225, 0.68),
], 0.012, CRACK, "spine", 5)
for side, sx in (("l", 1.0), ("r", -1.0)):
    tube(f"ArmCrack_{side}", [
        (sx * 0.31, -0.165, 1.20),
        (sx * 0.43, -0.115, 1.11),
        (sx * 0.54, -0.090, 1.15),
        (sx * 0.68, -0.080, 1.10),
    ], 0.010, CRACK, "lowerarm." + side, 5)
    tube(f"ThighCrack_{side}", [
        (sx * 0.22, -0.185, 0.52),
        (sx * 0.29, -0.205, 0.43),
        (sx * 0.20, -0.175, 0.34),
        (sx * 0.18, -0.155, 0.24),
    ], 0.010, CRACK, "upperleg." + side, 5)


def join_group(group, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = group
    merged.data.name = f"{group}_Mesh"
    merged.parent = RIG
    merged.matrix_parent_inverse = RIG.matrix_world.inverted()
    modifier = merged.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = RIG
    modifier.use_vertex_groups = True
    return merged


meshes = [join_group(group, objects) for group, objects in PARTS.items()]
bpy.context.view_layer.update()

material_count = len({mat.name for obj in meshes for mat in obj.data.materials if mat})
triangle_count = 0
for obj in meshes:
    obj.data.calc_loop_triangles()
    triangle_count += len(obj.data.loop_triangles)
if material_count > 8 or len(meshes) > 16 or triangle_count >= 12000:
    raise RuntimeError(
        f"Budget failure: {len(meshes)} draws, {material_count} materials, {triangle_count} triangles"
    )

# Render-only review rig; all of it is removed before saving/exporting.
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.use_denoising = False
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
if scene.world is None:
    scene.world = bpy.data.worlds.new("PreviewWorld")
scene.world.use_nodes = True
world_bg = scene.world.node_tree.nodes.get("Background")
world_bg.inputs["Color"].default_value = (0.014, 0.018, 0.024, 1.0)
world_bg.inputs["Strength"].default_value = 0.26


def add_area(name, location, energy, size, color):
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 1.05)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj


preview_objects = [
    add_area("Preview_Key", (-3.2, -4.0, 4.2), 850.0, 4.0, (1.0, 0.86, 0.72)),
    add_area("Preview_Fill", (3.5, -2.2, 2.0), 620.0, 3.2, (0.42, 0.60, 1.0)),
    add_area("Preview_Rim", (0.5, 3.5, 3.2), 720.0, 3.0, (1.0, 0.20, 0.04)),
]

floor_mat = material("Preview_Floor", (0.035, 0.045, 0.055), 0.88)
bpy.ops.mesh.primitive_plane_add(size=12.0, location=(0.0, 0.0, -0.012))
floor = bpy.context.object
floor.name = "Preview_Floor"
floor.data.materials.append(floor_mat)
preview_objects.append(floor)

camera_data = bpy.data.cameras.new("Preview_Camera")
camera = bpy.data.objects.new("Preview_Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.15
camera_data.lens = 55
scene.camera = camera
preview_objects.append(camera)

for view_name, location in (
    ("front", (0.0, -6.0, 1.15)),
    ("side", (5.8, 0.0, 1.15)),
    ("back", (0.0, 6.0, 1.15)),
):
    camera.location = location
    camera.rotation_euler = (Vector((0.0, 0.0, 1.03)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"{view_name}.png")
    bpy.ops.render.render(write_still=True)

for obj in preview_objects:
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.data.materials.remove(floor_mat, do_unlink=True)
scene.camera = None

bpy.ops.object.select_all(action="DESELECT")
RIG.select_set(True)
bpy.context.view_layer.objects.active = RIG

# Save a neutral scene, then export only the rig and consolidated weighted meshes.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "AshDemon.blend"), check_existing=False)
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "AshDemon.glb"),
    export_format="GLB",
    use_selection=False,
    export_yup=True,
    export_apply=False,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_materials="EXPORT",
    export_skins=True,
)

summary = {
    "donor_sha256": sha256(SOURCE_RIG),
    "license_sha256": sha256(SOURCE_LICENSE),
    "bones": len(RIG.data.bones),
    "actions_in_donor": len(bpy.data.actions),
    "mesh_objects": len(meshes),
    "materials": material_count,
    "triangles": triangle_count,
    "mesh_names": [obj.name for obj in meshes],
    "render_engine": "CYCLES",
    "render_samples": 8,
    "render_resolution": [512, 512],
}
(OUT / "build_summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print("ASH_DEMON_BUILD", json.dumps(summary, sort_keys=True))
sys.stdout.flush()
os._exit(0)
