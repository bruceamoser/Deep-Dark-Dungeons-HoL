"""Build the Ghast review submission from the supplied KayKit Ninja rig."""

from pathlib import Path
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = ROOT / "public/assets/characters/series4/Ninja.glb"
OUTPUT = ROOT / "test-results/asset-workers/ghast"
BLEND_PATH = OUTPUT / "Ghast.blend"
GLB_PATH = OUTPUT / "Ghast.glb"


def srgb(hex_color):
    value = hex_color.lstrip("#")
    channels = (int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return tuple(
        channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    )


def material(name, color, roughness=0.78, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    mat.use_backface_culling = False
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 2.0
    return mat


def clear_factory_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def import_donor():
    if not DONOR.is_file() or DONOR.stat().st_size != 277796:
        raise RuntimeError(f"Required donor missing or wrong size: {DONOR}")
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one donor armature, found {len(rigs)}")
    rig = rigs[0]
    if len(rig.data.bones) != 23:
        raise RuntimeError(f"Donor rig contract changed: {len(rig.data.bones)} bones")
    for obj in imported:
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)
    rig.name = "Rig_Medium"
    rig.data.name = "Rig_Medium"
    rig.show_in_front = True
    return rig


def make_material_palette():
    return {
        "skin": material("Skin_PaleGray", srgb("#8D9185"), 0.9),
        "coat": material("Coat_DeepGreen", srgb("#142F24"), 0.86),
        "gold": material("Gold_Tarnished", srgb("#9A742D"), 0.55, 0.45),
        "cream": material("Cloth_RaggedCream", srgb("#B9AD8C"), 0.94),
        "hair": material("Hair_DirtyWhite", srgb("#C5C2AF"), 0.88),
        "mouth": material("Mouth_And_Claws", srgb("#52252A"), 0.72),
        "teeth": material("Teeth_Ivory", srgb("#E4D9B8"), 0.62),
        "eye": material("Eyes_SickGreen", srgb("#8BA052"), 0.38, emission=srgb("#58751E")),
    }


PARTS = []


def bone_point(rig, name, tail=False):
    bone = rig.data.bones[name]
    return tuple(bone.tail_local if tail else bone.head_local)


def attach(obj, mat, weights):
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    for name, value in weights:
        group = obj.vertex_groups.new(name=name)
        group.add(list(range(len(obj.data.vertices))), value, "REPLACE")
    PARTS.append(obj)
    return obj


def ico(name, mat, bone, center, scale, rotation=(0, 0, 0), subdivisions=2, weights=None):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=1.0, location=center, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return attach(obj, mat, weights or [(bone, 1.0)])


def segment(name, mat, bone, start, end, radius_start, radius_end, vertices=8, weights=None):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"Zero-length segment: {name}")
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=length,
        end_fill_type="NGON",
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    return attach(obj, mat, weights or [(bone, 1.0)])


def panel(name, mat, bone, points, weights=None):
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata([tuple(Vector(p)) for p in points], [], [tuple(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return attach(obj, mat, weights or [(bone, 1.0)])


def tooth(name, base, tip, radius=0.014):
    return segment(name, MATS["teeth"], "head", base, tip, radius, 0.002, 6)


def claw(name, bone, start, mid, end, radius=0.017):
    segment(f"{name}_Base", MATS["mouth"], bone, start, mid, radius, radius * 0.75, 6)
    segment(f"{name}_Tip", MATS["mouth"], bone, mid, end, radius * 0.75, 0.002, 6)


def build_body(rig):
    skin = MATS["skin"]
    coat = MATS["coat"]
    gold = MATS["gold"]
    cream = MATS["cream"]
    hair = MATS["hair"]
    mouth = MATS["mouth"]
    eye = MATS["eye"]

    # Hunched torso and gaunt exposed anatomy. The mesh is authored in a readable
    # neutral silhouette while the imported rig rest remains untouched.
    ico("Pelvis", skin, "hips", (0, 0.015, 0.59), (0.22, 0.15, 0.17))
    ico(
        "Ribcage_Skin",
        skin,
        "chest",
        (0, -0.075, 1.02),
        (0.245, 0.155, 0.29),
        (math.radians(10), 0, 0),
    )
    ico("Abdomen_Skin", skin, "spine", (0, -0.035, 0.78), (0.16, 0.115, 0.22))
    segment("Neck", skin, "head", (0, -0.105, 1.23), (0, -0.135, 1.34), 0.09, 0.075, 10)
    segment("Clavicle_L", skin, "chest", (0.03, -0.12, 1.19), (0.25, -0.055, 1.16), 0.035, 0.026)
    segment("Clavicle_R", skin, "chest", (-0.03, -0.12, 1.19), (-0.25, -0.055, 1.16), 0.035, 0.026)

    # Sharp rib shadows and sternum read through the open front of the coat.
    for i, z in enumerate((0.88, 0.96, 1.04, 1.12)):
        half = 0.18 - i * 0.008
        y = -0.23 - i * 0.005
        for side in (-1, 1):
            segment(
                f"Rib_{i}_{side}",
                MATS["teeth"],
                "chest",
                (side * 0.015, y - 0.015, z),
                (side * half, y + 0.015, z + 0.025),
                0.009,
                0.004,
                5,
            )
    segment("Sternum", MATS["teeth"], "chest", (0, -0.235, 0.83), (0, -0.245, 1.15), 0.012, 0.006, 6)

    # Legs and bare clawed feet follow the donor's exact T-rest joint pivots.
    for side, suffix in ((1, "l"), (-1, "r")):
        upper = f"upperleg.{suffix}"
        lower = f"lowerleg.{suffix}"
        foot = f"foot.{suffix}"
        toes = f"toes.{suffix}"
        hip = Vector(bone_point(rig, upper))
        knee = Vector(bone_point(rig, upper, tail=True))
        ankle = Vector(bone_point(rig, lower, tail=True))
        ball = Vector(bone_point(rig, foot, tail=True))
        toe_tip = Vector(bone_point(rig, toes, tail=True))
        segment(
            f"Thigh_{suffix}",
            skin,
            upper,
            hip,
            knee,
            0.074,
            0.048,
            8,
        )
        ico(f"HipJoint_{suffix}", skin, upper, hip, (0.066, 0.060, 0.066), subdivisions=1)
        ico(f"Knee_{suffix}", skin, lower, knee, (0.051, 0.050, 0.055), subdivisions=1)
        segment(f"Shin_{suffix}", skin, lower, knee, ankle, 0.046, 0.029, 8)
        ico(f"Ankle_{suffix}", skin, foot, ankle, (0.034, 0.032, 0.039), subdivisions=1)
        segment(
            f"Foot_{suffix}",
            skin,
            foot,
            ankle,
            ball,
            0.031,
            0.041,
            7,
        )
        ico(f"Ball_{suffix}", skin, toes, ball, (0.057, 0.043, 0.032), subdivisions=1)
        for j, offset in enumerate((-0.045, 0.0, 0.045)):
            base = ball + Vector((offset, -0.005, 0.008))
            mid = Vector((ball.x + offset * 1.12, toe_tip.y * 0.78, 0.030))
            end = Vector((ball.x + offset * 1.25, toe_tip.y - 0.035, 0.012))
            segment(f"Toe_{suffix}_{j}", skin, toes, base, mid, 0.017, 0.011, 6)
            claw(f"FootClaw_{suffix}_{j}", toes, mid, (mid.x, mid.y - 0.035, 0.021), end, 0.013)

    # Long bony arms are authored directly around the imported T-rest bones.
    # Overlapping joint masses keep elbows, wrists and claws continuous under the
    # organizer's shared idle, walk, slash, hit, death and punch clips.
    for side, suffix in ((1, "l"), (-1, "r")):
        upper = f"upperarm.{suffix}"
        lower = f"lowerarm.{suffix}"
        wrist = f"wrist.{suffix}"
        hand = f"hand.{suffix}"
        shoulder = Vector(bone_point(rig, upper))
        elbow = Vector(bone_point(rig, upper, tail=True))
        wrist_pos = Vector(bone_point(rig, lower, tail=True))
        hand_base = Vector(bone_point(rig, wrist, tail=True))
        hand_tip = Vector(bone_point(rig, hand, tail=True))
        hand_dir = (hand_tip - hand_base).normalized()
        palm = (hand_base + hand_tip) * 0.5
        segment(f"UpperArm_{suffix}", skin, upper, shoulder, elbow, 0.055, 0.039, 8)
        ico(f"ShoulderJoint_{suffix}", skin, upper, shoulder, (0.060, 0.057, 0.060), subdivisions=1)
        ico(f"Elbow_{suffix}", skin, lower, elbow, (0.046, 0.046, 0.050), subdivisions=1)
        segment(f"Forearm_{suffix}", skin, lower, elbow, wrist_pos, 0.043, 0.027, 8)
        ico(f"WristJoint_{suffix}", skin, wrist, wrist_pos, (0.030, 0.030, 0.032), subdivisions=1)
        segment(f"Wrist_{suffix}", skin, wrist, wrist_pos, hand_base, 0.026, 0.030, 7)
        ico(f"CarpalJoint_{suffix}", skin, hand, hand_base, (0.037, 0.038, 0.036), subdivisions=1)
        ico(
            f"Palm_{suffix}",
            skin,
            hand,
            palm,
            (0.060, 0.048, 0.034),
            subdivisions=1,
        )
        for j, (spread_y, drop) in enumerate(((-0.030, -0.010), (-0.010, 0.004), (0.012, 0.002), (0.030, -0.014))):
            base = hand_base + hand_dir * 0.035 + Vector((0, spread_y, drop))
            joint = base + hand_dir * 0.046 + Vector((0, spread_y * 0.32, -0.018 - abs(spread_y) * 0.2))
            middle = joint + hand_dir * 0.044 + Vector((0, spread_y * 0.18, -0.024))
            tip = middle + hand_dir * 0.016 + Vector((0, -spread_y * 0.15, -0.020))
            segment(f"Finger_{suffix}_{j}", skin, hand, base, joint, 0.014, 0.011, 6)
            segment(f"FingerTwist_{suffix}_{j}", skin, hand, joint, middle, 0.011, 0.008, 6)
            claw(f"HandClaw_{suffix}_{j}", hand, middle, tip, tip + hand_dir * 0.028 + Vector((0, 0, -0.018)), 0.012)

    # Split ceremonial coat, shoulder mantle, tattered sleeves and skirt.
    panel(
        "Coat_Front_L",
        coat,
        "chest",
        [
            (0.03, -0.245, 1.20),
            (0.28, -0.16, 1.15),
            (0.25, -0.18, 0.68),
            (0.17, -0.22, 0.73),
            (0.10, -0.245, 0.62),
            (0.055, -0.26, 0.76),
        ],
    )
    panel(
        "Coat_Front_R",
        coat,
        "chest",
        [
            (-0.03, -0.245, 1.20),
            (-0.28, -0.16, 1.15),
            (-0.25, -0.18, 0.68),
            (-0.17, -0.22, 0.73),
            (-0.10, -0.245, 0.62),
            (-0.055, -0.26, 0.76),
        ],
    )
    panel(
        "Coat_Back",
        coat,
        "chest",
        [
            (-0.30, 0.075, 1.20),
            (0.30, 0.075, 1.20),
            (0.34, 0.13, 0.61),
            (0.22, 0.15, 0.49),
            (0.11, 0.16, 0.58),
            (0.0, 0.17, 0.45),
            (-0.12, 0.15, 0.57),
            (-0.23, 0.14, 0.48),
            (-0.34, 0.12, 0.62),
        ],
    )
    panel(
        "Mantle_L",
        coat,
        "chest",
        [
            (0.02, -0.23, 1.24),
            (0.31, -0.15, 1.20),
            (0.46, -0.06, 1.10),
            (0.35, -0.12, 1.02),
            (0.20, -0.22, 1.07),
        ],
    )
    panel(
        "Mantle_R",
        coat,
        "chest",
        [
            (-0.02, -0.23, 1.24),
            (-0.31, -0.15, 1.20),
            (-0.46, -0.06, 1.10),
            (-0.35, -0.12, 1.02),
            (-0.20, -0.22, 1.07),
        ],
    )
    ico("Collar", coat, "chest", (0, -0.075, 1.20), (0.25, 0.17, 0.09), subdivisions=1)

    for side, suffix in ((1, "l"), (-1, "r")):
        upper = f"upperarm.{suffix}"
        lower = f"lowerarm.{suffix}"
        shoulder = Vector(bone_point(rig, upper))
        elbow = Vector(bone_point(rig, upper, tail=True))
        segment(f"Sleeve_{suffix}", coat, upper, shoulder, elbow, 0.09, 0.07, 9)
        segment(
            f"GoldCuff_{suffix}",
            gold,
            lower,
            elbow + (shoulder - elbow) * 0.12,
            elbow - (shoulder - elbow).normalized() * 0.025,
            0.072,
            0.064,
            8,
        )
        panel(
            f"TornSleeve_{suffix}",
            cream,
            lower,
            [
                (elbow.x - side * 0.035, -0.055, elbow.z + 0.035),
                (elbow.x + side * 0.055, -0.050, elbow.z + 0.025),
                (elbow.x + side * 0.075, -0.085, elbow.z - 0.145),
                (elbow.x + side * 0.040, -0.090, elbow.z - 0.090),
                (elbow.x + side * 0.015, -0.092, elbow.z - 0.165),
                (elbow.x - side * 0.015, -0.085, elbow.z - 0.085),
            ],
        )

    skirt_panels = [
        ("Skirt_FL", [(0.045, -0.20, 0.65), (0.18, -0.17, 0.64), (0.22, -0.16, 0.25), (0.16, -0.17, 0.33), (0.10, -0.19, 0.18), (0.065, -0.20, 0.37)]),
        ("Skirt_FR", [(-0.045, -0.20, 0.65), (-0.18, -0.17, 0.64), (-0.22, -0.16, 0.25), (-0.16, -0.17, 0.33), (-0.10, -0.19, 0.18), (-0.065, -0.20, 0.37)]),
        ("Skirt_SL", [(0.19, -0.12, 0.66), (0.28, -0.01, 0.64), (0.31, 0.05, 0.22), (0.26, 0.01, 0.31), (0.22, -0.04, 0.16), (0.20, -0.08, 0.36)]),
        ("Skirt_SR", [(-0.19, -0.12, 0.66), (-0.28, -0.01, 0.64), (-0.31, 0.05, 0.22), (-0.26, 0.01, 0.31), (-0.22, -0.04, 0.16), (-0.20, -0.08, 0.36)]),
        ("Skirt_BL", [(0.06, 0.12, 0.66), (0.23, 0.11, 0.64), (0.29, 0.11, 0.17), (0.22, 0.10, 0.28), (0.15, 0.10, 0.13), (0.10, 0.11, 0.35)]),
        ("Skirt_BR", [(-0.06, 0.12, 0.66), (-0.23, 0.11, 0.64), (-0.29, 0.11, 0.17), (-0.22, 0.10, 0.28), (-0.15, 0.10, 0.13), (-0.10, 0.11, 0.35)]),
    ]
    for name, points in skirt_panels:
        weights = [("hips", 0.78), ("spine", 0.22)]
        panel(name, coat, "hips", points, weights)
    for i, (_, points) in enumerate(skirt_panels):
        left = Vector(points[1][0:3]) if i % 2 else Vector(points[0][0:3])
        lower = Vector(points[2][0:3])
        segment(
            f"SkirtTrim_{i}",
            gold,
            "hips",
            left,
            lower,
            0.008,
            0.004,
            5,
            [("hips", 0.78), ("spine", 0.22)],
        )

    # Ragged cream undercloth remains visible at the split front and hem.
    panel(
        "Undercloth_Front",
        cream,
        "hips",
        [(-0.07, -0.23, 0.70), (0.07, -0.23, 0.70), (0.06, -0.24, 0.31), (0.0, -0.245, 0.39), (-0.06, -0.24, 0.26)],
        [("hips", 0.7), ("spine", 0.3)],
    )
    for i, x in enumerate((-0.23, -0.17, 0.17, 0.23)):
        panel(
            f"Undercloth_Hem_{i}",
            cream,
            "hips",
            [(x - 0.025, -0.235, 0.38), (x + 0.025, -0.235, 0.38), (x + 0.018, -0.24, 0.12), (x, -0.24, 0.19), (x - 0.02, -0.24, 0.10)],
            [("hips", 1.0)],
        )

    # Tarnished trim, chain, brooch and beads establish the aristocratic corpse.
    segment("MantleTrim_L", gold, "chest", (0.08, -0.25, 1.20), (0.34, -0.16, 1.04), 0.011, 0.008, 5)
    segment("MantleTrim_R", gold, "chest", (-0.08, -0.25, 1.20), (-0.34, -0.16, 1.04), 0.011, 0.008, 5)
    segment("CoatTrim_L", gold, "chest", (0.05, -0.258, 1.18), (0.075, -0.265, 0.72), 0.009, 0.004, 5)
    segment("CoatTrim_R", gold, "chest", (-0.05, -0.258, 1.18), (-0.075, -0.265, 0.72), 0.009, 0.004, 5)
    for i, x in enumerate((-0.21, -0.14, -0.07, 0.0, 0.07, 0.14, 0.21)):
        z = 1.20 - abs(x) * 0.45
        ico(f"ChainBead_{i}", gold, "chest", (x, -0.285, z), (0.018, 0.012, 0.018), subdivisions=1)
    ico("Brooch", gold, "chest", (0, -0.285, 1.08), (0.072, 0.018, 0.072), subdivisions=2)
    ico("BroochGem", eye, "chest", (0, -0.305, 1.08), (0.031, 0.012, 0.031), subdivisions=1)
    segment("Belt", gold, "hips", (-0.22, -0.03, 0.64), (0.22, -0.03, 0.64), 0.016, 0.016, 8)


def build_head():
    skin = MATS["skin"]
    hair = MATS["hair"]
    mouth = MATS["mouth"]
    eye = MATS["eye"]

    # The crown is the actual elongated skin skull, not a separate cone or cap.
    center = (0, -0.145, 1.51)
    ico("Skull", skin, "head", center, (0.18, 0.16, 0.30), (math.radians(7), 0, 0), subdivisions=3)
    ico("GauntCheek_L", skin, "head", (0.10, -0.245, 1.39), (0.07, 0.065, 0.11), subdivisions=1)
    ico("GauntCheek_R", skin, "head", (-0.10, -0.245, 1.39), (0.07, 0.065, 0.11), subdivisions=1)
    segment("Jaw", skin, "head", (-0.105, -0.22, 1.30), (0.105, -0.22, 1.30), 0.047, 0.047, 9)
    segment("NoseBridge", skin, "head", (0, -0.285, 1.50), (0, -0.335, 1.39), 0.027, 0.047, 6)
    segment("Chin", skin, "head", (-0.07, -0.27, 1.27), (0.07, -0.27, 1.27), 0.035, 0.035, 7)

    # Deep sockets, bright sickly eyes, and a wide open jagged mouth.
    for side in (-1, 1):
        ico(f"EyeSocket_{side}", mouth, "head", (side * 0.071, -0.289, 1.49), (0.06, 0.025, 0.047), subdivisions=1)
        ico(f"Eye_{side}", eye, "head", (side * 0.071, -0.314, 1.489), (0.022, 0.012, 0.015), subdivisions=2)
        segment(
            f"Brow_{side}",
            skin,
            "head",
            (side * 0.015, -0.287, 1.54),
            (side * 0.14, -0.266, 1.57),
            0.025,
            0.014,
            6,
        )
        segment(
            f"Ear_{side}",
            skin,
            "head",
            (side * 0.16, -0.11, 1.47),
            (side * 0.235, -0.06, 1.56),
            0.045,
            0.004,
            7,
        )

    ico("MouthCavity", mouth, "head", (0, -0.30, 1.335), (0.115, 0.035, 0.095), subdivisions=2)
    segment("UpperLip", skin, "head", (-0.13, -0.326, 1.40), (0.13, -0.326, 1.40), 0.021, 0.021, 7)
    segment("LowerLip", skin, "head", (-0.10, -0.326, 1.255), (0.10, -0.326, 1.255), 0.019, 0.019, 7)
    upper_x = (-0.102, -0.068, -0.034, 0, 0.034, 0.068, 0.102)
    for i, x in enumerate(upper_x):
        length = 0.06 - abs(i - 3) * 0.004
        tooth(f"UpperTooth_{i}", (x, -0.342, 1.405), (x * 0.97, -0.356, 1.405 - length), 0.014)
    for i, x in enumerate((-0.075, -0.04, 0, 0.04, 0.075)):
        tooth(f"LowerTooth_{i}", (x, -0.343, 1.275), (x * 0.95, -0.357, 1.323), 0.013)

    # Uneven multi-segment locks drape from the scalp sides and back. Their
    # different bends, lengths and tapers break up the former conical silhouette
    # while leaving the mouth and both eye sockets unobstructed.
    locks = [
        ([(-0.155, -0.075, 1.67), (-0.205, -0.085, 1.54), (-0.190, -0.105, 1.37), (-0.225, -0.125, 1.19)], (0.021, 0.016, 0.010, 0.002)),
        ([(-0.105, -0.020, 1.70), (-0.150, 0.010, 1.56), (-0.120, 0.070, 1.37), (-0.160, 0.100, 1.18)], (0.017, 0.013, 0.008, 0.002)),
        ([(-0.050, 0.025, 1.72), (-0.090, 0.100, 1.58), (-0.050, 0.150, 1.37), (-0.080, 0.175, 1.11)], (0.020, 0.014, 0.009, 0.002)),
        ([(0.015, 0.035, 1.72), (0.000, 0.130, 1.57), (0.045, 0.180, 1.34), (0.010, 0.205, 1.06)], (0.018, 0.013, 0.008, 0.002)),
        ([(0.075, 0.010, 1.70), (0.125, 0.060, 1.55), (0.105, 0.120, 1.36), (0.145, 0.145, 1.14)], (0.016, 0.012, 0.007, 0.002)),
        ([(0.125, -0.025, 1.68), (0.175, 0.005, 1.55), (0.155, -0.025, 1.36), (0.195, -0.055, 1.17)], (0.020, 0.015, 0.009, 0.002)),
        ([(0.160, -0.075, 1.65), (0.215, -0.085, 1.52), (0.195, -0.120, 1.34), (0.235, -0.155, 1.20)], (0.016, 0.012, 0.007, 0.002)),
        ([(-0.145, -0.155, 1.63), (-0.195, -0.195, 1.49), (-0.235, -0.185, 1.33), (-0.270, -0.205, 1.20)], (0.014, 0.011, 0.006, 0.002)),
        ([(0.140, -0.160, 1.63), (0.190, -0.200, 1.50), (0.225, -0.190, 1.35), (0.260, -0.215, 1.22)], (0.015, 0.011, 0.006, 0.002)),
        ([(-0.025, 0.075, 1.68), (-0.055, 0.155, 1.54), (-0.015, 0.205, 1.31), (-0.045, 0.220, 1.12)], (0.013, 0.010, 0.006, 0.002)),
        ([(0.045, 0.080, 1.68), (0.080, 0.155, 1.53), (0.055, 0.200, 1.30), (0.095, 0.215, 1.16)], (0.014, 0.010, 0.006, 0.002)),
    ]
    for i, (points, radii) in enumerate(locks):
        for j, (start, end) in enumerate(zip(points, points[1:])):
            segment(
                f"HairLock_{i}_{j}",
                hair,
                "head",
                start,
                end,
                radii[j],
                radii[j + 1],
                5,
            )


def join_and_bind(rig):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in PARTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]
    bpy.ops.object.join()
    ghast = bpy.context.object
    ghast.name = "Ghast"
    ghast.data.name = "Ghast_Mesh"

    # Deduplicate material slots while preserving every polygon assignment.
    polygon_materials = [ghast.material_slots[p.material_index].material for p in ghast.data.polygons]
    unique = []
    for mat in polygon_materials:
        if mat not in unique:
            unique.append(mat)
    ghast.data.materials.clear()
    for mat in unique:
        ghast.data.materials.append(mat)
    lookup = {mat: i for i, mat in enumerate(unique)}
    for polygon, mat in zip(ghast.data.polygons, polygon_materials):
        polygon.material_index = lookup[mat]

    for vertex in ghast.data.vertices:
        total = sum(group.weight for group in vertex.groups)
        if total <= 1e-7:
            raise RuntimeError(f"Unweighted vertex after join: {vertex.index}")
        if len(vertex.groups) > 4:
            raise RuntimeError(f"More than four influences on vertex: {vertex.index}")

    modifier = ghast.modifiers.new("Armature", "ARMATURE")
    modifier.object = rig
    modifier.use_deform_preserve_volume = False
    ghast.parent = rig
    ghast.matrix_parent_inverse = Matrix.Identity(4)
    ghast["asset_role"] = "Decayed aristocratic undead"
    ghast["design_notes"] = "8 materials; rigid/limited-blend craft weights; donor rig preserved"
    rig["donor"] = "input/Ninja.glb"
    rig["donor_sha256"] = "5e7fc34eef2011f4d4cf534acad039f2edc18be42d4542cc7c776a62142129e0"
    return ghast


def clear_to_neutral(rig):
    rig.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    for pose_bone in rig.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    rig.data.pose_position = "POSE"
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 1
    bpy.context.scene.frame_set(1)


def validate_build(rig, ghast):
    ghast.data.calc_loop_triangles()
    triangles = len(ghast.data.loop_triangles)
    if triangles > 20000:
        raise RuntimeError(f"Triangle hard cap exceeded: {triangles}")
    if len(ghast.data.materials) > 8:
        raise RuntimeError(f"Material cap exceeded: {len(ghast.data.materials)}")
    if len(rig.data.bones) != 23:
        raise RuntimeError("Rig bone count changed")
    if bpy.data.actions:
        raise RuntimeError("Neutral submission must not contain actions")
    return triangles


def save_and_export(rig, ghast, triangles):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.name = "Ghast_Neutral"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    ghast.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_yup=True,
    )
    if not BLEND_PATH.is_file() or not GLB_PATH.is_file():
        raise RuntimeError("Expected output files were not created")
    print(
        "BUILD_OK",
        {
            "triangles": triangles,
            "materials": len(ghast.data.materials),
            "bones": len(rig.data.bones),
            "vertices": len(ghast.data.vertices),
            "blend_bytes": BLEND_PATH.stat().st_size,
            "glb_bytes": GLB_PATH.stat().st_size,
        },
    )


clear_factory_scene()
RIG = import_donor()
MATS = make_material_palette()
build_body(RIG)
build_head()
GHAST = join_and_bind(RIG)
clear_to_neutral(RIG)
TRIS = validate_build(RIG, GHAST)
save_and_export(RIG, GHAST, TRIS)
sys.stdout.flush()
os._exit(0)
