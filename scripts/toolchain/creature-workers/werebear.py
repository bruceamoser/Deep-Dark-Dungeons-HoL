"""Build the Werebear review submission around the supplied CC0 Ninja rig."""

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/werebear"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(29029)

EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}


def material(name, color, roughness=0.88, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.5
    return mat


def clean_start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    rig.name = "Rig_Medium"
    rig.data.name = "Rig_Medium"
    for obj in list(bpy.data.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)
    for bone in rig.pose.bones:
        bone.custom_shape = None
    if {bone.name for bone in rig.data.bones} != EXPECTED_BONES:
        raise RuntimeError("The canonical Ninja 23-bone rig was not preserved")
    return rig


RIG = clean_start()
FUR_DARK = material("Fur_Dark", (0.105, 0.045, 0.018))
FUR_MID = material("Fur_Main", (0.265, 0.115, 0.043))
FUR_LIGHT = material("Fur_Muzzle", (0.48, 0.285, 0.135))
OLIVE = material("Cloth_Olive", (0.115, 0.135, 0.055), 0.96)
TAN = material("Cloth_Tan", (0.30, 0.205, 0.095), 0.97)
LEATHER = material("Leather", (0.145, 0.068, 0.025), 0.82)
BLACK = material("Face_Black", (0.012, 0.009, 0.007), 0.68)
IVORY = material("Ivory_Gold", (0.80, 0.69, 0.43), 0.48,
                 emission=(0.24, 0.13, 0.02))

AUTHORED = []


def attach(obj, bone):
    if bone not in RIG.data.bones:
        raise ValueError(f"Missing intended bone {bone}")
    obj.parent = RIG
    obj.matrix_parent_inverse = RIG.matrix_world.inverted()
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = RIG
    AUTHORED.append(obj)
    return obj


def ico(name, loc, scale, bone, mat, rot=(0, 0, 0), subdiv=1, rough=0.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rot
    if rough:
        for vert in obj.data.vertices:
            f = 1.0 + RNG.uniform(-rough, rough)
            vert.co.x *= f
            vert.co.y *= f
            vert.co.z *= f
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return attach(obj, bone)


def box(name, loc, scale, bone, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if bevel:
        modifier = obj.modifiers.new("Soft worn edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(mat)
    return attach(obj, bone)


def cone(name, loc, radius, depth, bone, mat, rot=(0, 0, 0), vertices=8):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.006,
                                    depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return attach(obj, bone)


def taper(name, a, b, radius_a, radius_b, bone, mat, vertices=8):
    va, vb = Vector(a), Vector(b)
    direction = vb - va
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius_a, radius2=radius_b,
        depth=direction.length, location=(va + vb) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    return attach(obj, bone)


def curved_claw(name, root, mid, tip, radius, bone):
    taper(name + "_Ivory", root, mid, radius, radius * 0.62, bone, IVORY, 7)
    taper(name + "_Tip", mid, tip, radius * 0.66, 0.003, bone, BLACK, 7)


def torus(name, loc, major, minor, bone, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=12, minor_segments=4,
                                     location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return attach(obj, bone)


def rod(name, a, b, radius, bone, mat, vertices=8):
    va, vb = Vector(a), Vector(b)
    direction = vb - va
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=direction.length,
                                        location=(va + vb) * 0.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    return attach(obj, bone)


# Broad torso, layered belly/back masses, and high shoulder fur.
ico("Chest_Core", (0, 0.015, 1.10), (0.39, 0.30, 0.35), "chest", FUR_MID, subdiv=2, rough=0.045)
ico("Chest_Ruff", (0, -0.19, 1.18), (0.25, 0.10, 0.20), "chest", FUR_MID, subdiv=2, rough=0.10)
ico("Upper_Back", (0, 0.19, 1.15), (0.35, 0.18, 0.31), "chest", FUR_DARK, subdiv=2, rough=0.075)
ico("Belly_Core", (0, 0.005, 0.81), (0.34, 0.27, 0.28), "spine", FUR_MID, subdiv=2, rough=0.05)
ico("Lower_Back", (0, 0.17, 0.76), (0.31, 0.17, 0.26), "spine", FUR_DARK, subdiv=1, rough=0.09)
ico("Pelvis_Core", (0, 0.015, 0.57), (0.33, 0.25, 0.21), "hips", FUR_DARK, subdiv=2, rough=0.05)
ico("Neck_Ruff", (0, -0.01, 1.34), (0.27, 0.24, 0.18), "head", FUR_MID, subdiv=2, rough=0.10)

# Tapered neck and chest clumps break the accumulated-sphere silhouette.
for side, sx in (("l", 1), ("r", -1)):
    cone(f"Neck_Clump_{side}_Upper", (sx * 0.20, -0.015, 1.30),
         0.075, 0.28, "head", FUR_MID, rot=(math.pi, 0, sx * 0.08), vertices=7)
    cone(f"Neck_Clump_{side}_Lower", (sx * 0.095, -0.20, 1.16),
         0.062, 0.29, "chest", FUR_DARK, rot=(math.pi, 0, -sx * 0.16), vertices=7)
cone("Chest_Clump_Center", (0, -0.205, 1.13), 0.10, 0.30, "chest",
     FUR_LIGHT, rot=(math.pi, 0, 0), vertices=7)

# Side/back fur shelves create a rugged silhouette without detached anatomy.
for side, sx in (("l", 1), ("r", -1)):
    for i, (x, y, z, s, mat) in enumerate((
        (0.30, 0.07, 1.28, (0.16, 0.18, 0.22), FUR_DARK),
        (0.38, 0.08, 1.14, (0.18, 0.19, 0.20), FUR_MID),
        (0.31, 0.14, 0.93, (0.12, 0.15, 0.19), FUR_DARK),
        (0.25, 0.13, 0.68, (0.12, 0.14, 0.17), FUR_DARK),
        (0.15, 0.23, 0.82, (0.12, 0.11, 0.18), FUR_DARK),
    )):
        ico(f"Torso_Ruff_{side}_{i}", (sx * x, y, z), s, "chest" if z > 1 else "spine",
            mat, rot=(0, sx * 0.25, sx * 0.35), rough=0.13)

# Horizontal rest-pose arms follow the donor bones; the canonical bind is retained.
for side, sx in (("l", 1), ("r", -1)):
    upper = "upperarm." + side
    lower = "lowerarm." + side
    hand = "hand." + side
    ico(f"Shoulder_Fur_{side}", (sx * 0.30, 0, 1.12), (0.22, 0.25, 0.23),
        "chest", FUR_DARK, rot=(0, sx * 0.12, 0), subdiv=2, rough=0.11)
    ico(f"Shoulder_Cap_{side}", (sx * 0.44, 0, 1.11), (0.19, 0.21, 0.20),
        upper, FUR_MID, rot=(0, sx * 0.08, 0), subdiv=2, rough=0.08)
    ico(f"Upperarm_Fur_{side}", (sx * 0.58, 0, 1.105), (0.20, 0.18, 0.17),
        upper, FUR_DARK, rough=0.10)
    ico(f"Elbow_Tuft_{side}", (sx * 0.70, 0.03, 1.10), (0.13, 0.15, 0.15),
        lower, FUR_LIGHT, rough=0.12)
    ico(f"Forearm_Mass_{side}", (sx * 0.80, -0.005, 1.105), (0.19, 0.17, 0.16),
        lower, FUR_MID, subdiv=2, rough=0.07)
    for i, x in enumerate((0.73, 0.82)):
        ico(f"Arm_Fur_Point_{side}_{i}", (sx * x, 0.105, 1.01 - i * 0.02),
            (0.09, 0.09, 0.14), lower, FUR_DARK,
            rot=(0, sx * 0.35, 0), rough=0.14)
    for i, (x, z, depth) in enumerate(((0.40, 1.25, 0.30),
                                        (0.47, 1.18, 0.28),
                                        (0.53, 1.12, 0.25))):
        cone(f"Shoulder_Clump_{side}_{i}", (sx * x, 0.015, z),
             0.065 + i * 0.008, depth, upper, FUR_DARK,
             rot=(math.pi, 0, sx * (0.08 + i * 0.05)), vertices=7)
    # Oversized paw mass, separate thumb, four sturdy ivory-backed claws.
    ico(f"Paw_{side}", (sx * 0.93, -0.025, 1.105), (0.16, 0.20, 0.13),
        hand, FUR_MID, rot=(0, 0, sx * 0.08), subdiv=2, rough=0.07)
    ico(f"Thumb_{side}", (sx * 0.84, -0.16, 1.08), (0.075, 0.105, 0.065),
        hand, FUR_DARK, rot=(0.25, 0, sx * 0.2), rough=0.08)
    for i, dx in enumerate((-0.072, -0.024, 0.024, 0.072)):
        x = sx * (0.93 + dx)
        z = 1.095 + (i - 1.5) * 0.018
        curved_claw(
            f"Hand_Claw_{side}_{i}",
            (x, -0.175, z),
            (x + sx * 0.018, -0.285, z - 0.020),
            (x + sx * 0.045, -0.350, z - 0.075),
            0.033, hand,
        )

# Chunky legs, knee tufts and broad paw-like planted feet.
for side, sx in (("l", 1), ("r", -1)):
    thigh = "upperleg." + side
    shin = "lowerleg." + side
    foot = "foot." + side
    toes = "toes." + side
    ico(f"Hip_Fur_{side}", (sx * 0.20, 0.01, 0.49), (0.19, 0.22, 0.20),
        thigh, FUR_MID, rough=0.07)
    ico(f"Thigh_Mass_{side}", (sx * 0.21, -0.015, 0.36), (0.19, 0.20, 0.22),
        thigh, FUR_DARK, subdiv=2, rough=0.06)
    ico(f"Knee_Tuft_{side}", (sx * 0.22, -0.13, 0.29), (0.14, 0.13, 0.16),
        shin, FUR_MID, rough=0.12)
    ico(f"Shin_Mass_{side}", (sx * 0.22, -0.005, 0.19), (0.16, 0.18, 0.17),
        shin, FUR_DARK, subdiv=2, rough=0.06)
    for i, z in enumerate((0.15, 0.21)):
        ico(f"Shin_Fur_Point_{side}_{i}", (sx * (0.10 + i * 0.035), 0.08, z),
            (0.075, 0.08, 0.13), shin, FUR_DARK, rough=0.14)
    ico(f"Foot_Paw_{side}", (sx * 0.22, -0.13, 0.085), (0.20, 0.31, 0.10),
        foot, FUR_MID, rot=(0, 0, sx * 0.04), subdiv=2, rough=0.055)
    for i, dx in enumerate((-0.105, 0, 0.105)):
        cone(f"Foot_Claw_{side}_{i}", (sx * 0.22 + dx, -0.39, 0.055),
             0.035, 0.16, toes, BLACK, rot=(math.pi / 2, 0, sx * (i - 1) * 0.12))

# Open bear face: projecting muzzle, exposed sockets and a tall roaring mouth.
ico("Head_Mass", (0, -0.005, 1.60), (0.27, 0.24, 0.27), "head",
    FUR_DARK, subdiv=2, rough=0.07)
ico("Forehead", (0, -0.145, 1.70), (0.195, 0.105, 0.145), "head",
    FUR_MID, subdiv=2, rough=0.06)
ico("Muzzle_Bridge", (0, -0.305, 1.615), (0.118, 0.165, 0.090), "head",
    FUR_LIGHT, subdiv=2, rough=0.045)
ico("Snout_Top", (0, -0.420, 1.595), (0.140, 0.125, 0.064), "head",
    FUR_LIGHT, subdiv=2, rough=0.04)
for side, sx in (("l", 1), ("r", -1)):
    ico(f"Muzzle_Cheek_{side}", (sx * 0.105, -0.430, 1.530),
        (0.072, 0.105, 0.080), "head", FUR_LIGHT,
        rot=(0, sx * 0.10, 0), subdiv=2, rough=0.04)
ico("Mouth_Cavity", (0, -0.510, 1.505), (0.112, 0.042, 0.105), "head",
    BLACK, rot=(0.06, 0, 0), subdiv=1, rough=0.02)
ico("Lower_Jaw_Fur", (0, -0.345, 1.410), (0.135, 0.145, 0.072), "head",
    FUR_LIGHT, rot=(0.12, 0, 0), subdiv=2, rough=0.045)
ico("Nose", (0, -0.505, 1.625), (0.079, 0.040, 0.051), "head",
    BLACK, subdiv=1, rough=0.05)
for side, sx in (("l", 1), ("r", -1)):
    ico(f"Brow_{side}", (sx * 0.098, -0.282, 1.713), (0.104, 0.034, 0.033),
        "head", FUR_DARK, rot=(0, -sx * 0.30, 0), rough=0.04)
    ico(f"Eye_Socket_{side}", (sx * 0.095, -0.298, 1.672), (0.062, 0.020, 0.040),
        "head", BLACK, subdiv=1, rough=0.015)
    ico(f"Eye_{side}", (sx * 0.095, -0.318, 1.672), (0.037, 0.014, 0.024),
        "head", IVORY, subdiv=1)
    ico(f"Pupil_{side}", (sx * 0.095, -0.333, 1.672), (0.011, 0.008, 0.019),
        "head", BLACK, subdiv=1)
    ico(f"Ear_Outer_{side}", (sx * 0.20, 0.005, 1.80), (0.10, 0.065, 0.115),
        "head", FUR_DARK, rot=(0.0, sx * 0.25, 0), subdiv=2, rough=0.05)
    ico(f"Ear_Inner_{side}", (sx * 0.20, -0.045, 1.80), (0.045, 0.020, 0.057),
        "head", FUR_MID, rot=(0.0, sx * 0.25, 0), subdiv=1)
    cone(f"Fang_Upper_{side}", (sx * 0.070, -0.558, 1.535), 0.024, 0.115,
         "head", IVORY, rot=(math.pi, 0, 0), vertices=7)
    cone(f"Fang_Lower_{side}", (sx * 0.060, -0.553, 1.455), 0.019, 0.078,
         "head", IVORY, vertices=7)

# Rustic woodcutter vest, shoulder strap, belt, and torn tan waist panels.
ico("Vest_Left", (-0.23, -0.06, 1.11), (0.17, 0.27, 0.30), "chest",
    OLIVE, rot=(0.0, -0.15, -0.10), rough=0.04)
ico("Vest_Right", (0.23, -0.06, 1.11), (0.17, 0.27, 0.30), "chest",
    OLIVE, rot=(0.0, 0.15, 0.10), rough=0.04)
box("Collar_Back", (0, 0.17, 1.29), (0.37, 0.055, 0.11), "chest", OLIVE,
    rot=(0.10, 0, 0), bevel=0.03)
for side, sx in (("l", 1), ("r", -1)):
    ico(f"Fur_Collar_{side}", (sx * 0.20, -0.065, 1.28), (0.19, 0.12, 0.11),
        "chest", FUR_DARK, rot=(0, sx * 0.25, 0), rough=0.12)
rod("Chest_Strap", (-0.20, -0.29, 1.28), (0.17, -0.30, 0.76),
    0.038, "chest", LEATHER, vertices=8)
torus("Belt", (0, 0, 0.64), 0.31, 0.035, "hips", LEATHER,
      rot=(math.pi / 2, 0, 0))
torus("Buckle", (0, -0.29, 0.64), 0.057, 0.014, "hips", IVORY,
      rot=(math.pi / 2, 0, 0))
for i, (x, z, w, h, mat) in enumerate((
    (-0.19, 0.50, 0.095, 0.25, TAN), (-0.065, 0.48, 0.085, 0.31, OLIVE),
    (0.065, 0.49, 0.095, 0.27, TAN), (0.18, 0.51, 0.09, 0.23, OLIVE),
)):
    ico(f"Torn_Loincloth_{i}", (x, -0.25, z), (w, 0.035, h), "hips",
        mat, rot=(0.0, x * 0.25, x * 0.12), rough=0.08)
box("Belt_Pouch", (-0.29, -0.14, 0.58), (0.10, 0.07, 0.12), "hips",
    LEATHER, rot=(0, -0.12, 0), bevel=0.02)


def join_body():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in AUTHORED:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = AUTHORED[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "Werebear_Body"
    body.data.name = "Werebear_Body"
    for modifier in list(body.modifiers):
        if modifier.type == "ARMATURE":
            body.modifiers.remove(modifier)
    armature = body.modifiers.new("Armature", "ARMATURE")
    armature.object = RIG
    body.parent = RIG
    body.matrix_parent_inverse = RIG.matrix_world.inverted()
    return body


BODY = join_body()
BODY["asset"] = "Werebear"
BODY["geometry_source"] = "Original procedural stylized werebear geometry"
BODY["rig_source"] = "CC0 KayKit Ninja.glb, 23-bone armature preserved"
BODY["submission_status"] = "review draft"
RIG["asset"] = "Werebear"
RIG["rig_source"] = "CC0 KayKit Ninja.glb (23 bones preserved)"
RIG["submission_status"] = "review draft"

# Weight and topology audit before export.
group_names = {group.index: group.name for group in BODY.vertex_groups}
for vertex in BODY.data.vertices:
    weights = [g.weight for g in vertex.groups if g.weight > 0.00001]
    if len(weights) != 1 or abs(sum(weights) - 1.0) > 0.0001:
        raise RuntimeError("Rigid authored parts must have one normalized weight")
BODY.data.calc_loop_triangles()
triangles = len(BODY.data.loop_triangles)
if triangles > 12000:
    raise RuntimeError(f"Triangle target exceeded: {triangles}")
if len(BODY.data.materials) > 8:
    raise RuntimeError("Material budget exceeded")

bpy.context.scene["asset"] = "Werebear"
bpy.context.scene["submission_status"] = "review draft"
bpy.ops.object.select_all(action="DESELECT")
BODY.select_set(True)
RIG.select_set(True)
bpy.context.view_layer.objects.active = RIG

blend_path = OUT / "Werebear.blend"
glb_path = OUT / "Werebear.glb"
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


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("Review World")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.045, 0.055, 0.07, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45

bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.002))
ground = bpy.context.object
ground.name = "REVIEW_ONLY_Ground"
ground_mat = material("Review Ground", (0.055, 0.045, 0.035), 0.95)
ground.data.materials.append(ground_mat)

for name, loc, energy, size in (
    ("Key", (-3.5, -4.0, 5.0), 850, 4.0),
    ("Rim", (3.0, 3.5, 4.0), 1050, 3.0),
    ("Fill", (4.0, -2.0, 2.2), 500, 3.0),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    scene.collection.objects.link(light)
    light.location = loc
    look_at(light, (0, 0, 1.0))

camera_data = bpy.data.cameras.new("Review Camera")
camera_data.lens = 58
camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
for label, loc in (("front", (0, -5.0, 1.10)),
                   ("side", (-4.2, -3.2, 1.20)),
                   ("back", (0, 5.0, 1.10))):
    camera.location = loc
    look_at(camera, (0, 0, 1.0))
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", label)

print("ASSET_BUILD", triangles, "triangles;", len(BODY.data.materials), "materials;", len(RIG.data.bones), "bones")
print("OUTPUTS", blend_path, glb_path)
import sys
sys.stdout.flush()
sys.stderr.flush()
os._exit(0)
