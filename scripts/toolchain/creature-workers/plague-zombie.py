"""Build the PlagueZombie submission.

Run with:
    blender --background --factory-startup --threads 4 --python build.py

The Ninja donor is used only for its 23-bone animation-compatible rig. Every
visible mesh is authored procedurally in this file. The input GLB is never
saved or modified.
"""

import json
import math
import os
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/plague-zombie"
SOURCE = ROOT / "public/assets/characters/series4/Ninja.glb"
random.seed(3117)


def rgba(hex_value):
    value = hex_value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)) + (1.0,)


def srgb_rgba(hex_value):
    """Convert authored sRGB hex colors to Blender's scene-linear color space."""
    values = rgba(hex_value)[:3]
    linear = tuple(
        value / 12.92
        if value <= 0.04045
        else ((value + 0.055) / 1.055) ** 2.4
        for value in values
    )
    return linear + (1.0,)


def make_material(name, hex_value, roughness=0.8, metallic=0.0):
    mat = bpy.data.materials.new(name)
    color = srgb_rgba(hex_value)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def activate_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_transforms(obj):
    activate_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def normalized(weights):
    total = sum(max(0.0, value) for value in weights.values())
    if total <= 0:
        raise ValueError("A vertex must have at least one positive weight")
    return {name: max(0.0, value) / total for name, value in weights.items()}


def bind_object(obj, rig, weights):
    obj.parent = rig
    if isinstance(weights, str):
        weights = {weights: 1.0}
    for bone_name, weight in normalized(weights).items():
        group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
        group.add(list(range(len(obj.data.vertices))), weight, "REPLACE")
    mod = obj.modifiers.new("PlagueZombie_Skin", "ARMATURE")
    mod.object = rig
    obj["weighting"] = "Rigid normalized bone weights"
    parts.append(obj)
    return obj


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def ellipsoid(name, location, scale, material, bone, subdivisions=1, rotation=None):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=1.0, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if rotation is not None:
        obj.rotation_euler = rotation
    apply_transforms(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return bind_object(obj, rig, bone)


def tapered_limb(name, start, end, radius_start, radius_end, material, bone, vertices=8):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"{name} has zero length")
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(
        direction.normalized()
    )
    apply_transforms(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return bind_object(obj, rig, bone)


def torus_wrap(
    name,
    location,
    major_radius,
    minor_radius,
    material,
    bone,
    scale=(1.0, 1.0, 1.0),
    rotation=(0.0, 0.0, 0.0),
    major_segments=12,
    minor_segments=4,
):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        major_radius=major_radius,
        minor_radius=minor_radius,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transforms(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return bind_object(obj, rig, bone)


def custom_mesh(name, vertices, faces, material, bone):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    smooth(obj)
    return bind_object(obj, rig, bone)


def ragged_hood_shell(name, material, bone="head"):
    """Open-front cloth hood: crown and rear shell only, with a torn lower edge."""
    angles = [-62, -36, -8, 22, 55, 90, 125, 158, 190, 220, 242]
    rows = [
        (1.955, 0.065, 0.060),
        (1.875, 0.205, 0.175),
        (1.735, 0.295, 0.225),
        (1.585, 0.300, 0.245),
    ]
    jagged_bottom = [0.025, -0.035, 0.005, -0.020, 0.030, -0.045, 0.015, -0.030, 0.020, -0.050, 0.010]
    vertices = []
    for z, rx, ry in rows:
        for angle in angles:
            radians = math.radians(angle)
            vertices.append(
                (
                    rx * math.cos(radians),
                    0.045 + ry * math.sin(radians),
                    z,
                )
            )
    for index, angle in enumerate(angles):
        radians = math.radians(angle)
        vertices.append(
            (
                0.285 * math.cos(radians),
                0.045 + 0.235 * math.sin(radians),
                1.455 + jagged_bottom[index],
            )
        )
    faces = []
    row_count = 5
    for row in range(row_count - 1):
        for index in range(len(angles) - 1):
            a = row * len(angles) + index
            b = a + 1
            c = a + len(angles) + 1
            d = a + len(angles)
            faces.append((a, b, c, d))
    return custom_mesh(name, vertices, faces, material, bone)


def ribbon(name, points, widths, material, bone, skew=0.0):
    """Create a deliberately torn, open cloth ribbon from path points."""
    vertices = []
    count = len(points)
    for index, (point, width) in enumerate(zip(points, widths)):
        point = Vector(point)
        if index == 0:
            tangent = Vector(points[1]) - point
        elif index == count - 1:
            tangent = point - Vector(points[index - 1])
        else:
            tangent = Vector(points[index + 1]) - Vector(points[index - 1])
        side = tangent.cross(Vector((0.0, 1.0, 0.0)))
        if side.length < 1e-5:
            side = Vector((1.0, 0.0, 0.0))
        side.normalize()
        center = point + side * skew * index
        vertices.extend([tuple(center - side * width * 0.5), tuple(center + side * width * 0.5)])
    faces = []
    for index in range(count - 1):
        a = index * 2
        faces.append((a, a + 2, a + 3, a + 1))
    return custom_mesh(name, vertices, faces, material, bone)


def cloth_spike(name, base, tip, width, material, bone):
    base = Vector(base)
    tip = Vector(tip)
    tangent = (tip - base).normalized()
    side = tangent.cross(Vector((0.0, 1.0, 0.0)))
    if side.length < 1e-5:
        side = Vector((1.0, 0.0, 0.0))
    side.normalize()
    vertices = [
        tuple(base - side * width * 0.5),
        tuple(base + side * width * 0.5),
        tuple(tip),
    ]
    return custom_mesh(name, vertices, [(0, 1, 2)], material, bone)


def fly(name, location, scale=1.0, bone="head"):
    x, y, z = location
    s = scale
    vertices = [
        (x, y - 0.014 * s, z),
        (x + 0.012 * s, y + 0.020 * s, z),
        (x - 0.012 * s, y + 0.020 * s, z),
        (x, y + 0.010 * s, z + 0.016 * s),
    ]
    faces = [(0, 1, 3), (0, 3, 2), (0, 2, 1), (1, 2, 3)]
    return custom_mesh(name, vertices, faces, mat_void, bone)


def make_lesion(name, location, scale, bone, material=None, rotation=(0.0, 0.0, 0.0)):
    return ellipsoid(
        name,
        location,
        scale,
        material or mat_void,
        bone,
        subdivisions=1,
        rotation=rotation,
    )


def add_ribbon_paths():
    # Torso bandages: irregular, overlapping diagonal burial wrappings.
    torso_paths = [
        (
            "ChestWrap_Upper",
            [(-0.34, -0.22, 1.12), (-0.08, -0.31, 1.16), (0.30, -0.19, 1.07)],
            [0.09, 0.075, 0.045],
            "chest",
        ),
        (
            "ChestWrap_Cross",
            [(0.33, -0.20, 1.04), (0.03, -0.345, 0.96), (-0.31, -0.22, 0.83)],
            [0.08, 0.085, 0.055],
            "spine",
        ),
        (
            "WaistWrap",
            [(0.36, -0.12, 0.69), (0.04, -0.315, 0.65), (-0.35, -0.11, 0.62)],
            [0.08, 0.10, 0.07],
            "spine",
        ),
        (
            "BackWrap",
            [(-0.33, 0.15, 1.07), (0.02, 0.285, 0.91), (0.32, 0.11, 0.76)],
            [0.07, 0.09, 0.06],
            "chest",
        ),
    ]
    for name, points, widths, bone in torso_paths:
        ribbon(name, points, widths, mat_cloth, bone)

    # Broad, broken shroud straps break up the torso without rebuilding the mummy.
    ribbon(
        "TorsoRentDiagonal",
        [(-0.36, -0.245, 1.24), (-0.09, -0.338, 1.04), (0.17, -0.305, 0.78)],
        [0.115, 0.075, 0.022],
        mat_dark_cloth,
        "chest",
        skew=-0.018,
    )
    ribbon(
        "BellyLooseStrip",
        [(0.28, -0.245, 0.90), (0.19, -0.315, 0.77), (0.105, -0.292, 0.59)],
        [0.09, 0.065, 0.018],
        mat_cloth,
        "spine",
        skew=0.012,
    )

    # Shoulder and arm swaddling.
    ribbon(
        "LeftShoulderCascade",
        [(0.20, -0.17, 1.24), (0.34, -0.19, 1.19), (0.42, -0.18, 1.06), (0.39, -0.19, 0.93)],
        [0.08, 0.10, 0.07, 0.035],
        mat_cloth,
        "upperarm.l",
    )
    ribbon(
        "RightShoulderCascade",
        [(-0.20, -0.16, 1.22), (-0.34, -0.19, 1.16), (-0.41, -0.17, 1.02), (-0.37, -0.18, 0.91)],
        [0.07, 0.09, 0.065, 0.025],
        mat_dark_cloth,
        "upperarm.r",
    )
    ribbon(
        "LeftForearmRag",
        [(0.50, -0.09, 1.04), (0.57, -0.10, 0.96), (0.59, -0.09, 0.84)],
        [0.055, 0.045, 0.012],
        mat_cloth,
        "lowerarm.l",
    )
    ribbon(
        "RightForearmRag",
        [(-0.52, -0.08, 1.04), (-0.59, -0.11, 0.95), (-0.61, -0.10, 0.82)],
        [0.06, 0.05, 0.012],
        mat_cloth,
        "lowerarm.r",
    )

    # Ragged loincloth and rear burial skirt. Each tatter hangs from a whitelisted game bone.
    front_rags = [
        (-0.30, -0.24, 0.66, -0.28, 0.31),
        (-0.20, -0.27, 0.68, -0.23, 0.22),
        (-0.09, -0.29, 0.70, -0.10, 0.25),
        (0.02, -0.30, 0.71, 0.04, 0.19),
        (0.13, -0.29, 0.69, 0.17, 0.24),
        (0.24, -0.26, 0.67, 0.28, 0.30),
        (0.34, -0.20, 0.65, 0.38, 0.36),
    ]
    for i, (x0, y0, z0, x1, z1) in enumerate(front_rags):
        material = mat_cloth if i % 3 else mat_dark_cloth
        points = [
            (x0, y0, z0),
            (x0 + (x1 - x0) * 0.55, y0 - 0.015, (z0 + z1) * 0.5),
            (x1, y0 - 0.025, z1),
        ]
        ribbon(f"LoinRag_{i:02d}", points, [0.075, 0.055, 0.008], material, "hips")

    for i in range(6):
        x = -0.29 + i * 0.118
        points = [
            (x, 0.19, 0.64),
            (x + 0.02, 0.22, 0.49),
            (x, 0.20, 0.36 + (i % 2) * 0.035),
        ]
        ribbon(
            f"BackRag_{i:02d}",
            points,
            [0.07, 0.05, 0.008],
            mat_dark_cloth if i % 2 else mat_cloth,
            "hips",
        )

    # Hood tails and fractured shroud streamers.
    for side, sign in (("L", 1.0), ("R", -1.0)):
        ribbon(
            f"HoodTail_{side}A",
            [(sign * 0.20, 0.08, 1.84), (sign * 0.25, 0.10, 1.64), (sign * 0.24, 0.03, 1.42)],
            [0.075, 0.055, 0.012],
            mat_cloth,
            "head",
        )
        ribbon(
            f"HoodTail_{side}B",
            [(sign * 0.23, 0.16, 1.73), (sign * 0.31, 0.18, 1.58), (sign * 0.28, 0.14, 1.34)],
            [0.05, 0.035, 0.008],
            mat_dark_cloth,
            "head",
        )
        ribbon(
            f"HoodCrownBand_{side}",
            [
                (sign * 0.04, -0.08, 1.95),
                (sign * 0.13, -0.02, 1.86),
                (sign * 0.20, 0.03, 1.72),
                (sign * 0.23, 0.04, 1.57),
            ],
            [0.07, 0.075, 0.055, 0.012],
            mat_cloth if sign > 0 else mat_dark_cloth,
            "head",
            skew=sign * 0.008,
        )

    # Torn face framing remains deliberately asymmetrical.
    ribbon(
        "HoodFaceFrame_L",
        [(0.08, -0.05, 1.925), (0.235, -0.125, 1.80), (0.275, -0.19, 1.62), (0.225, -0.225, 1.49)],
        [0.075, 0.095, 0.070, 0.018],
        mat_cloth,
        "head",
        skew=0.010,
    )
    ribbon(
        "HoodFaceFrame_R",
        [(-0.04, 0.00, 1.92), (-0.21, -0.10, 1.79), (-0.285, -0.16, 1.61), (-0.245, -0.205, 1.47)],
        [0.070, 0.085, 0.055, 0.014],
        mat_dark_cloth,
        "head",
        skew=-0.012,
    )
    ribbon(
        "HoodFaceTatter_R",
        [(-0.245, -0.19, 1.63), (-0.31, -0.12, 1.54), (-0.29, -0.10, 1.40)],
        [0.060, 0.035, 0.008],
        mat_cloth,
        "head",
        skew=-0.006,
    )


def build_character():
    global parts, rig
    global mat_skin, mat_pale_skin, mat_cloth, mat_dark_cloth
    global mat_void, mat_teeth, mat_slime
    parts = []

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    rig.name = "Rig_Medium"
    rig.show_in_front = True
    rig.data.display_type = "BBONE"

    expected_bones = [
        "root",
        "hips",
        "spine",
        "chest",
        "upperarm.l",
        "lowerarm.l",
        "wrist.l",
        "hand.l",
        "handslot.l",
        "head",
        "upperarm.r",
        "lowerarm.r",
        "wrist.r",
        "hand.r",
        "handslot.r",
        "upperleg.r",
        "lowerleg.r",
        "foot.r",
        "toes.r",
        "upperleg.l",
        "lowerleg.l",
        "foot.l",
        "toes.l",
    ]
    if sorted(bone.name for bone in rig.data.bones) != sorted(expected_bones):
        raise RuntimeError("Donor rig does not contain the expected 23 bone names")
    preserved_rest = {
        bone.name: tuple(round(value, 8) for row in bone.matrix_local for value in row)
        for bone in rig.data.bones
    }
    preserved_parents = {
        bone.name: bone.parent.name if bone.parent else None for bone in rig.data.bones
    }

    # Discard all imported render meshes and display helper objects. Keep only the rig.
    for obj in list(bpy.context.scene.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Seven export materials: dark green/purple corpse against stained neutral cloth.
    mat_skin = make_material("Corpse_Skin_Gangrene", "#354431", roughness=0.90)
    mat_pale_skin = make_material("Corpse_Skin_Pale", "#554B54", roughness=0.88)
    mat_cloth = make_material("Burial_Cloth_Aged", "#786B59", roughness=0.97)
    mat_dark_cloth = make_material("Burial_Cloth_Stained", "#3D3430", roughness=0.99)
    mat_void = make_material("Necrotic_Recesses", "#100F0D", roughness=1.0)
    mat_teeth = make_material("Exposed_Bone", "#A99C79", roughness=0.78)
    mat_slime = make_material("Grave_Ichor", "#765A20", roughness=0.50)

    # Torso: swollen, asymmetrical, with a sunken chest and visible lesions.
    ellipsoid(
        "Pelvis",
        (0.015, 0.0, 0.59),
        (0.31, 0.23, 0.22),
        mat_skin,
        "hips",
        subdivisions=2,
    )
    ellipsoid(
        "SwollenBelly",
        (0.035, -0.015, 0.82),
        (0.37, 0.285, 0.33),
        mat_skin,
        "spine",
        subdivisions=2,
        rotation=(0.04, -0.08, -0.03),
    )
    ellipsoid(
        "Ribcage",
        (-0.015, 0.0, 1.08),
        (0.395, 0.26, 0.265),
        mat_skin,
        "chest",
        subdivisions=2,
        rotation=(-0.05, 0.08, 0.02),
    )
    ellipsoid(
        "LeftRibSwelling",
        (0.225, -0.02, 1.06),
        (0.19, 0.21, 0.20),
        mat_skin,
        "chest",
        subdivisions=1,
    )
    ellipsoid(
        "RightShoulderAtrophy",
        (-0.28, 0.015, 1.13),
        (0.16, 0.18, 0.155),
        mat_skin,
        "upperarm.r",
        subdivisions=1,
    )
    ellipsoid(
        "LeftShoulderMass",
        (0.29, 0.0, 1.14),
        (0.19, 0.19, 0.17),
        mat_skin,
        "upperarm.l",
        subdivisions=1,
    )
    # Split the neck at the head pivot. The chest-owned root overlaps the
    # head-owned bridge, preventing the game clips from opening a shoulder gap.
    tapered_limb(
        "NeckRoot",
        (0.0, 0.005, 1.155),
        (0.0, -0.025, 1.300),
        0.145,
        0.108,
        mat_skin,
        "chest",
        vertices=8,
    )
    tapered_limb(
        "NeckBridge",
        (0.0, -0.020, 1.225),
        (0.0, -0.105, 1.445),
        0.125,
        0.092,
        mat_pale_skin,
        "head",
        vertices=8,
    )
    ellipsoid(
        "NeckNecrosis",
        (0.055, -0.105, 1.315),
        (0.060, 0.026, 0.050),
        mat_void,
        "chest",
        subdivisions=1,
        rotation=(0.0, 0.10, 0.0),
    )

    # Arms and grave-soaked claw hands.
    arm_data = [
        ("l", 1.0),
        ("r", -1.0),
    ]
    for side, sign in arm_data:
        ellipsoid(
            f"UpperArm_{side}",
            (sign * 0.355, 0.0, 1.105),
            (0.245, 0.145, 0.14),
            mat_skin,
            f"upperarm.{side}",
            subdivisions=1,
        )
        ellipsoid(
            f"Elbow_{side}",
            (sign * 0.466, 0.01, 1.105),
            (0.105, 0.105, 0.105),
            mat_skin,
            f"lowerarm.{side}",
            subdivisions=1,
        )
        ellipsoid(
            f"Forearm_{side}",
            (sign * 0.615, -0.005, 1.105),
            (0.27, 0.115, 0.115),
            mat_skin,
            f"lowerarm.{side}",
            subdivisions=1,
            rotation=(0.0, sign * 0.04, 0.0),
        )
        ellipsoid(
            f"Palm_{side}",
            (sign * 0.845, -0.012, 1.085),
            (0.135, 0.105, 0.115),
            mat_pale_skin,
            f"hand.{side}",
            subdivisions=1,
            rotation=(0.0, sign * 0.15, 0.0),
        )
        finger_starts = [
            (0.92, -0.07, 1.14),
            (0.935, -0.03, 1.10),
            (0.925, 0.02, 1.065),
            (0.89, 0.06, 1.035),
        ]
        finger_ends = [
            (1.055, -0.07, 1.01),
            (1.075, -0.035, 0.965),
            (1.05, 0.00, 0.925),
            (1.00, 0.035, 0.91),
        ]
        for index, (start, end) in enumerate(zip(finger_starts, finger_ends)):
            tapered_limb(
                f"Finger_{side}_{index}",
                (sign * start[0], start[1], start[2] - index * 0.003),
                (sign * end[0], end[1], end[2]),
                0.031,
                0.009,
                mat_pale_skin,
                f"hand.{side}",
                vertices=6,
            )
        tapered_limb(
            f"Thumb_{side}",
            (sign * 0.855, -0.09, 1.04),
            (sign * 0.94, -0.14, 0.95),
            0.034,
            0.011,
            mat_pale_skin,
            f"hand.{side}",
            vertices=6,
        )

    # Uneven legs and broad, wrapped feet.
    for side, sign in arm_data:
        ellipsoid(
            f"Thigh_{side}",
            (sign * 0.17, 0.005, 0.405),
            (0.15, 0.14, 0.205),
            mat_skin,
            f"upperleg.{side}",
            subdivisions=1,
            rotation=(0.02, sign * 0.05, 0.0),
        )
        ellipsoid(
            f"Knee_{side}",
            (sign * 0.17, 0.0, 0.282),
            (0.115, 0.105, 0.105),
            mat_pale_skin,
            f"lowerleg.{side}",
            subdivisions=1,
        )
        ellipsoid(
            f"Shin_{side}",
            (sign * 0.17, -0.005, 0.203),
            (0.105, 0.10, 0.145),
            mat_skin,
            f"lowerleg.{side}",
            subdivisions=1,
        )
        ellipsoid(
            f"Foot_{side}",
            (sign * 0.17, -0.085, 0.075),
            (0.145, 0.225, 0.095),
            mat_pale_skin,
            f"foot.{side}",
            subdivisions=1,
            rotation=(0.0, 0.0, sign * 0.035),
        )
        for toe_index in range(4):
            x_offset = (-0.075 + toe_index * 0.05) * sign
            tapered_limb(
                f"Toe_{side}_{toe_index}",
                (sign * 0.17 + x_offset, -0.23, 0.045),
                (sign * 0.17 + x_offset * 1.15, -0.31, 0.025),
                0.026,
                0.013,
                mat_pale_skin,
                f"toes.{side}",
                vertices=6,
            )

    # Gaunt face, open jaw, recessed eyes, and blunt uneven teeth.
    ragged_hood_shell("HoodPartial", mat_dark_cloth, "head")
    ellipsoid(
        "Skull",
        (0.0, -0.045, 1.635),
        (0.225, 0.195, 0.285),
        mat_pale_skin,
        "head",
        subdivisions=2,
        rotation=(-0.10, 0.02, -0.03),
    )
    ellipsoid(
        "Jaw",
        (-0.012, -0.19, 1.445),
        (0.158, 0.085, 0.105),
        mat_pale_skin,
        "head",
        subdivisions=1,
        rotation=(0.12, 0.0, -0.07),
    )
    ellipsoid(
        "MouthVoid",
        (0.0, -0.242, 1.515),
        (0.142, 0.027, 0.112),
        mat_void,
        "head",
        subdivisions=2,
        rotation=(-0.10, 0.0, 0.0),
    )
    for side, sign in arm_data:
        ellipsoid(
            f"EyeSocket_{side}",
            (sign * 0.086, -0.232, 1.675),
            (0.078, 0.018, 0.055),
            mat_void,
            "head",
            subdivisions=1,
            rotation=(0.0, sign * 0.10, sign * 0.10),
        )
        ellipsoid(
            f"EyeGleam_{side}",
            (sign * 0.082, -0.246, 1.668),
            (0.010, 0.006, 0.010),
            mat_slime,
            "head",
            subdivisions=1,
        )
    ellipsoid(
        "HeavyBrow",
        (0.0, -0.238, 1.742),
        (0.218, 0.030, 0.044),
        mat_skin,
        "head",
        subdivisions=1,
        rotation=(-0.12, 0.0, 0.055),
    )
    for side, sign in arm_data:
        ellipsoid(
            f"CheekHollow_{side}",
            (sign * 0.145, -0.208, 1.565),
            (0.052, 0.020, 0.078),
            mat_skin,
            "head",
            subdivisions=1,
            rotation=(0.0, sign * 0.16, sign * 0.10),
        )
    ellipsoid(
        "NoseCavity",
        (0.0, -0.255, 1.595),
        (0.034, 0.012, 0.041),
        mat_void,
        "head",
        subdivisions=1,
        rotation=(0.0, 0.0, math.radians(4)),
    )
    upper_teeth = [(-0.108, 0.039, 0.018), (-0.028, 0.061, 0.023), (0.061, 0.032, 0.015), (0.119, 0.052, 0.019)]
    lower_teeth = [(-0.088, 0.037, 0.017), (0.013, 0.056, 0.022), (0.095, 0.030, 0.014)]
    for index, (x, length, width) in enumerate(upper_teeth):
        tapered_limb(
            f"UpperTooth_{index}",
            (x, -0.267, 1.565 + 0.006 * (index % 2)),
            (x + (-0.008 + index * 0.007), -0.271, 1.565 - length),
            width,
            0.005,
            mat_teeth,
            "head",
            vertices=5,
        )
    for index, (x, length, width) in enumerate(lower_teeth):
        tapered_limb(
            f"LowerTooth_{index}",
            (x * 0.92, -0.267, 1.462),
            (x * 0.92, -0.271, 1.462 + length * 0.72),
            width,
            0.004,
            mat_teeth,
            "head",
            vertices=5,
        )

    # Sparse wraps expose the corpse and read as damaged strips, not mummy rings.
    for i, (z, rx, ry, tilt) in enumerate(
        [(1.075, 0.405, 0.265, -0.075), (0.835, 0.375, 0.285, 0.085)]
    ):
        torus_wrap(
            f"TorsoWrap_{i}",
            (0.0, 0.0, z),
            max(rx, ry),
            0.026,
            mat_cloth if i == 0 else mat_dark_cloth,
            "chest" if z > 0.98 else "spine",
            scale=(rx / max(rx, ry), ry / max(rx, ry), 1.0),
            rotation=(0.0, 0.0, tilt),
            major_segments=12,
            minor_segments=4,
        )
    for side, sign in arm_data:
        for i, x in enumerate((0.335,)):
            torus_wrap(
                f"UpperArmWrap_{side}_{i}",
                (sign * x, 0.0, 1.105),
                0.145 - i * 0.005,
                0.022,
                mat_cloth,
                f"upperarm.{side}",
                scale=(1.0, 1.0, 0.86),
                rotation=(0.0, math.radians(90), sign * (0.10 + i * 0.03)),
                major_segments=10,
                minor_segments=4,
            )
        for i, x in enumerate((0.675,)):
            torus_wrap(
                f"ForearmWrap_{side}_{i}",
                (sign * x, 0.0, 1.105),
                0.118 - i * 0.005,
                0.020,
                mat_dark_cloth if sign < 0 else mat_cloth,
                f"lowerarm.{side}",
                scale=(1.0, 1.0, 0.88),
                rotation=(0.0, math.radians(90), -sign * (0.08 + i * 0.025)),
                major_segments=10,
                minor_segments=4,
            )
        if sign > 0:
            torus_wrap(
                f"WristWrap_{side}",
                (sign * 0.785, -0.005, 1.085),
                0.095,
                0.018,
                mat_cloth,
                f"hand.{side}",
                scale=(1.0, 1.0, 0.85),
                rotation=(0.0, math.radians(90), 0.08),
                major_segments=10,
                minor_segments=3,
            )
        for i, z in enumerate((0.235,)):
            torus_wrap(
                f"ShinWrap_{side}_{i}",
                (sign * 0.17, -0.005, z),
                0.108,
                0.020,
                mat_dark_cloth if sign < 0 else mat_cloth,
                f"lowerleg.{side}",
                scale=(1.0, 1.0, 0.65),
                rotation=(sign * 0.06, 0.0, sign * 0.10),
                major_segments=10,
                minor_segments=4,
            )
        torus_wrap(
            f"AnkleWrap_{side}",
            (sign * 0.17, -0.065, 0.075),
            0.145,
            0.020,
            mat_cloth,
            f"foot.{side}",
            scale=(1.0, 1.20, 0.62),
            rotation=(0.02, sign * 0.04, sign * 0.08),
            major_segments=10,
            minor_segments=3,
        )
    add_ribbon_paths()

    # Necrotic wounds, slime seepage, and exposed bone hints.
    lesion_data = [
        ("BellyWound", (0.18, -0.292, 0.82), (0.085, 0.017, 0.105), "spine", mat_void),
        ("BellyWound2", (-0.16, -0.283, 0.90), (0.065, 0.014, 0.075), "spine", mat_dark_cloth),
        ("ChestWound", (-0.20, -0.252, 1.06), (0.075, 0.015, 0.085), "chest", mat_void),
        ("ChestWound2", (0.27, -0.205, 1.12), (0.055, 0.015, 0.07), "chest", mat_dark_cloth),
        ("ArmWoundL", (0.34, -0.145, 1.10), (0.055, 0.026, 0.035), "upperarm.l", mat_void),
        ("ArmWoundR", (-0.64, -0.108, 1.10), (0.065, 0.020, 0.035), "lowerarm.r", mat_void),
        ("ThighWoundL", (0.16, -0.132, 0.43), (0.055, 0.018, 0.075), "upperleg.l", mat_void),
        ("ThighWoundR", (-0.19, -0.122, 0.37), (0.045, 0.016, 0.060), "upperleg.r", mat_dark_cloth),
        ("ShinWoundL", (0.18, -0.098, 0.205), (0.048, 0.015, 0.06), "lowerleg.l", mat_void),
        ("FaceScab", (-0.14, -0.235, 1.75), (0.035, 0.012, 0.055), "head", mat_dark_cloth),
    ]
    for index, (name, location, scale, bone, material) in enumerate(lesion_data):
        make_lesion(name, location, scale, bone, material, rotation=(0.0, index * 0.08, 0.0))
    for side, sign in arm_data:
        for rib in range(3):
            tapered_limb(
                f"ExposedRib_{side}_{rib}",
                (sign * (0.03 + rib * 0.045), -0.265, 1.14 - rib * 0.045),
                (sign * (0.26 + rib * 0.018), -0.205, 1.12 - rib * 0.052),
                0.017,
                0.011,
                mat_teeth,
                "chest",
                vertices=6,
            )

    # Viscous drips from hands and ragged front cloth.
    drip_data = [
        ("HandDrip_L", (0.99, -0.07, 1.00), (0.995, -0.075, 0.91), 0.018, "hand.l"),
        ("HandDrip_L2", (1.045, -0.035, 0.955), (1.05, -0.04, 0.86), 0.013, "hand.l"),
        ("HandDrip_R", (-1.00, -0.04, 0.99), (-1.005, -0.045, 0.89), 0.017, "hand.r"),
        ("HandDrip_R2", (-0.93, -0.14, 0.95), (-0.935, -0.145, 0.85), 0.012, "hand.r"),
        ("ClothDrip_A", (-0.08, -0.315, 0.44), (-0.075, -0.32, 0.34), 0.015, "hips"),
        ("ClothDrip_B", (0.24, -0.285, 0.46), (0.245, -0.29, 0.38), 0.012, "hips"),
    ]
    for name, start, end, radius, bone in drip_data:
        tapered_limb(name, start, end, radius, 0.004, mat_slime, bone, vertices=6)

    # Grave flies orbit the face; their motion in game can remain head-parented.
    fly_positions = [
        (-0.36, -0.12, 1.84, 1.0),
        (-0.28, -0.20, 1.94, 0.8),
        (-0.12, -0.18, 2.00, 0.7),
        (0.18, -0.15, 1.98, 0.9),
        (0.34, -0.08, 1.87, 1.0),
        (0.42, 0.02, 1.75, 0.7),
        (-0.43, 0.02, 1.68, 0.75),
        (0.25, 0.12, 1.92, 0.65),
        (-0.20, 0.16, 1.88, 0.7),
        (0.31, -0.20, 1.57, 0.65),
    ]
    for index, (x, y, z, scale) in enumerate(fly_positions):
        fly(f"GraveFly_{index:02d}", (x, y, z), scale, "head")

    # Join authored parts, preserving all material slots and vertex groups.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "PlagueZombie_Body"
    body.data.name = "PlagueZombie_BodyMesh"
    body["asset"] = "PlagueZombie"
    body["source_rig"] = "CC0 KayKit Ninja donor, rest rig preserved"
    body["authored_geometry"] = "Project-original procedural low-poly mesh"

    # Defensive checks: exact rig preservation, normalized weighting, and material budget.
    after_rest = {
        bone.name: tuple(round(value, 8) for row in bone.matrix_local for value in row)
        for bone in rig.data.bones
    }
    after_parents = {
        bone.name: bone.parent.name if bone.parent else None for bone in rig.data.bones
    }
    if preserved_rest != after_rest or preserved_parents != after_parents:
        raise RuntimeError("Rig rest transforms or hierarchy changed during build")
    for vertex in body.data.vertices:
        total = sum(group.weight for group in vertex.groups if group.weight > 0.00001)
        if total < 0.999 or total > 1.001:
            raise RuntimeError(f"Vertex {vertex.index} has non-normalized weight {total}")
    if len(body.material_slots) > 8:
        raise RuntimeError("Material slot budget exceeded")
    return body, preserved_rest


def add_render_scene():
    # A neutral studio set is used only for submitted inspection renders.
    floor_mat = make_material("Studio_Backdrop", "#B9B2A0", roughness=0.92)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0.0, 0.0, -0.002))
    floor = bpy.context.object
    floor.name = "RENDER_Ground"
    floor.data.materials.append(floor_mat)

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("RENDER_World")
        bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = rgba("#7E827A")
    background.inputs["Strength"].default_value = 0.28

    def area_light(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = rgba(color)[:3]
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        target = Vector((0.0, 0.0, 1.0))
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
        return obj

    area_light("RENDER_Key", (-3.5, -4.0, 5.5), 360.0, 4.0, "#FFE2B8")
    area_light("RENDER_Fill", (4.0, -2.0, 3.2), 165.0, 4.5, "#B9CDD6")
    area_light("RENDER_Rim", (1.0, 4.0, 4.5), 440.0, 3.0, "#D8E7B4")

    camera_data = bpy.data.cameras.new("RENDER_Camera")
    camera = bpy.data.objects.new("RENDER_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.55
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35
    return camera


def pose_for_render():
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0.0, 0.0, 0.0)

    # Shambling, asymmetrical silhouette with hanging claw arms.
    rig.pose.bones["upperarm.l"].rotation_euler = (
        math.radians(-32),
        0.0,
        math.radians(-8),
    )
    rig.pose.bones["lowerarm.l"].rotation_euler = (
        math.radians(-25),
        math.radians(4),
        math.radians(4),
    )
    rig.pose.bones["hand.l"].rotation_euler = (
        math.radians(-15),
        math.radians(-8),
        0.0,
    )
    rig.pose.bones["upperarm.r"].rotation_euler = (
        math.radians(-42),
        0.0,
        math.radians(11),
    )
    rig.pose.bones["lowerarm.r"].rotation_euler = (
        math.radians(-15),
        math.radians(3),
        math.radians(3),
    )
    rig.pose.bones["hand.r"].rotation_euler = (
        math.radians(-14),
        math.radians(-6),
        0.0,
    )
    rig.pose.bones["head"].rotation_euler = (
        math.radians(8),
        math.radians(-8),
        math.radians(7),
    )
    rig.pose.bones["spine"].rotation_euler = (
        math.radians(4),
        math.radians(-5),
        math.radians(-2),
    )
    rig.pose.bones["upperleg.l"].rotation_euler = (math.radians(12), 0.0, math.radians(-2))
    rig.pose.bones["lowerleg.l"].rotation_euler = (math.radians(-8), 0.0, 0.0)
    rig.pose.bones["upperleg.r"].rotation_euler = (math.radians(-8), 0.0, math.radians(3))
    rig.pose.bones["lowerleg.r"].rotation_euler = (math.radians(7), 0.0, 0.0)


def render_views(camera):
    views = {
        "front": ((0.0, -6.0, 1.22), (0.0, 0.0, 1.05)),
        "side": ((6.0, 0.0, 1.22), (0.0, 0.0, 1.05)),
        "back": ((0.0, 6.0, 1.22), (0.0, 0.0, 1.05)),
    }
    for view_name, (location, target) in views.items():
        camera.location = location
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat(
            "-Z", "Y"
        ).to_euler()
        bpy.context.scene.render.filepath = str(OUT / f"{view_name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", bpy.context.scene.render.filepath)


def export_asset(body):
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "PlagueZombie.blend"))
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / "PlagueZombie.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_materials="EXPORT",
        export_yup=True,
    )
    body.data.calc_loop_triangles()
    report = {
        "asset": "PlagueZombie",
        "source": "CC0 KayKit Ninja rig; original procedural mesh and materials",
        "mesh_objects": [body.name],
        "vertices": len(body.data.vertices),
        "triangles": len(body.data.loop_triangles),
        "material_slots": len(body.material_slots),
        "bones": len(rig.data.bones),
        "bone_names": [bone.name for bone in rig.data.bones],
        "rest_transforms_preserved": True,
        "unweighted_vertices": 0,
        "rigged_mesh_count": 1,
    }
    (OUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n")
    print("BUILD_REPORT", json.dumps(report))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    body, _preserved_rest = build_character()
    camera = add_render_scene()
    export_asset(body)
    pose_for_render()
    render_views(camera)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "PlagueZombie.blend"))
    print("PLAGUE_ZOMBIE_COMPLETE")
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
