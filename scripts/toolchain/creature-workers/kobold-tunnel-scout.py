"""Build the KoboldScout submission from the supplied CC0 Ninja body.

Run:
    blender --background --factory-startup --threads 4 --python build.py
"""

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "public/assets/characters/series4/Ninja.glb"
OUTPUT = ROOT / "test-results/asset-workers/kobold-tunnel-scout"
OUTPUT.mkdir(parents=True, exist_ok=True)

TAIL_NAMES = ("tail1", "tail2", "tail3", "tail4")
TAIL_POINTS = [
    Vector((0.0, 0.16, 0.58)),
    Vector((0.06, 0.48, 0.52)),
    Vector((0.12, 0.85, 0.42)),
    Vector((0.16, 1.22, 0.30)),
    Vector((0.38, 1.53, 0.10)),
]


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def material(name, color, roughness=0.8, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        for socket_name in ("Emission Color", "Emission"):
            if socket_name in bsdf.inputs:
                bsdf.inputs[socket_name].default_value = (*emission, 1.0)
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 0.18
    return mat


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def assign_material_from_palette(obj, palette):
    if not obj.data.materials:
        return
    mat = obj.data.materials[0]
    try:
        index = palette.index(mat)
    except ValueError as exc:
        raise RuntimeError(f"Material is missing from palette: {mat.name}") from exc
    obj.data.materials.clear()
    for palette_material in palette:
        obj.data.materials.append(palette_material)
    for poly in obj.data.polygons:
        poly.material_index = index
    group_name = f"MAT_{index}"
    old_group = obj.vertex_groups.get(group_name)
    if old_group is not None:
        obj.vertex_groups.remove(old_group)
    material_group = obj.vertex_groups.new(name=group_name)
    material_group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")


def skin_rigid(obj, rig, bone):
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.parent = rig
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    obj.modifiers.new("Armature", "ARMATURE").object = rig
    obj.select_set(False)
    return obj


def mesh_object(name, verts, faces, mat, smooth=True):
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
    return obj


def ellipsoid(name, loc, scale, mat, rig, bone, subdivisions=2, rotation=None):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=1.0, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if rotation is not None:
        obj.rotation_euler = rotation
    assign_material(obj, mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return skin_rigid(obj, rig, bone)


def box(name, loc, scale, mat, rig, bone, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if rotation is not None:
        obj.rotation_euler = rotation
    assign_material(obj, mat)
    return skin_rigid(obj, rig, bone)


def cone_between(
    name, start, end, radius_start, radius_end, mat, rig, bone, vertices=6
):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    length = direction.length
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    assign_material(obj, mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return skin_rigid(obj, rig, bone)


def torus(
    name,
    loc,
    major_radius,
    minor_radius,
    mat,
    rig,
    bone,
    rotation=None,
    scale=None,
    major_segments=12,
    minor_segments=4,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=loc,
    )
    obj = bpy.context.object
    obj.name = name
    if rotation is not None:
        obj.rotation_euler = rotation
    if scale is not None:
        obj.scale = scale
    assign_material(obj, mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return skin_rigid(obj, rig, bone)


def swept_tube(name, points, radii, mat, sides=8, smooth=True):
    points = [Vector(p) for p in points]
    verts = []
    faces = []
    for index, (point, radius) in enumerate(zip(points, radii)):
        if index == 0:
            tangent = points[1] - points[0]
        elif index == len(points) - 1:
            tangent = points[-1] - points[-2]
        else:
            tangent = points[index + 1] - points[index - 1]
        tangent.normalize()
        side = tangent.cross(Vector((0.0, 0.0, 1.0)))
        if side.length < 0.001:
            side = tangent.cross(Vector((0.0, 1.0, 0.0)))
        side.normalize()
        up = side.cross(tangent).normalized()
        for side_index in range(sides):
            angle = 2.0 * math.pi * side_index / sides
            offset = side * (math.cos(angle) * radius) + up * (
                math.sin(angle) * radius
            )
            verts.append(tuple(point + offset))
    for ring in range(len(points) - 1):
        for side_index in range(sides):
            next_side = (side_index + 1) % sides
            a = ring * sides + side_index
            b = ring * sides + next_side
            c = (ring + 1) * sides + next_side
            d = (ring + 1) * sides + side_index
            faces.append((a, b, c, d))
    start_center = len(verts)
    verts.append(tuple(points[0]))
    end_center = len(verts)
    verts.append(tuple(points[-1]))
    for side_index in range(sides):
        next_side = (side_index + 1) % sides
        faces.append((start_center, next_side, side_index))
        base = (len(points) - 1) * sides
        faces.append((end_center, base + side_index, base + next_side))
    return mesh_object(name, verts, faces, mat, smooth=smooth)


def curve_tube(name, points, radius, mat, rig, bone, sides=6):
    obj = swept_tube(name, points, [radius] * len(points), mat, sides=sides)
    return skin_rigid(obj, rig, bone)


def catmull_rom(control, samples_per_segment=5):
    control = [Vector(p) for p in control]
    extended = [control[0]] + control + [control[-1]]
    result = []
    for segment in range(len(control) - 1):
        p0, p1, p2, p3 = extended[segment : segment + 4]
        for step in range(samples_per_segment):
            t = step / samples_per_segment
            t2 = t * t
            t3 = t2 * t
            point = 0.5 * (
                (2.0 * p1)
                + (-p0 + p2) * t
                + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
                + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
            )
            result.append(point)
    result.append(control[-1])
    return result


def bind_tail(mesh_obj, rig, sides=8):
    groups = {
        name: mesh_obj.vertex_groups.new(name=name) for name in TAIL_NAMES
    }
    ring_count = (len(mesh_obj.data.vertices) - 2) // sides
    for ring in range(ring_count):
        u = ring / (ring_count - 1)
        q = u * len(TAIL_NAMES) - 0.5
        if q <= 0.0:
            weights = {"tail1": 1.0}
        elif q >= len(TAIL_NAMES) - 1:
            weights = {TAIL_NAMES[-1]: 1.0}
        else:
            lower = int(math.floor(q))
            blend = q - lower
            weights = {
                TAIL_NAMES[lower]: 1.0 - blend,
                TAIL_NAMES[lower + 1]: blend,
            }
        for key, weight in weights.items():
            group = groups[key]
            group.add(
                [ring * sides + side for side in range(sides)],
                weight,
                "REPLACE",
            )
    groups["tail4"].add(
        [len(mesh_obj.data.vertices) - 2], 0.35, "REPLACE"
    )
    groups["tail4"].add(
        [len(mesh_obj.data.vertices) - 1], 1.0, "REPLACE"
    )
    mesh_obj.parent = rig
    mesh_obj.modifiers.new("Armature", "ARMATURE").object = rig


def add_cape(rig, cloth):
    segments = 14
    verts = []
    for ring in range(2):
        for i in range(segments):
            angle = 2.0 * math.pi * i / segments
            if ring == 0:
                verts.append(
                    (
                        0.225 * math.cos(angle),
                        0.175 * math.sin(angle),
                        1.245,
                    )
                )
            else:
                jag = 0.035 if i % 3 == 0 else (-0.025 if i % 4 == 0 else 0.0)
                verts.append(
                    (
                        0.405 * math.cos(angle),
                        0.255 * math.sin(angle),
                        1.015 + jag,
                    )
                )
    faces = []
    for i in range(segments):
        next_i = (i + 1) % segments
        faces.append((i, next_i, segments + next_i, segments + i))
    cape = mesh_object("Scout_Tattered_Shoulder_Cape", verts, faces, cloth)
    select_only(cape)
    solidify = cape.modifiers.new("Cloth_Thickness", "SOLIDIFY")
    solidify.thickness = 0.018
    solidify.offset = 0.0
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    return skin_rigid(cape, rig, "chest")


def add_tail(rig, skin, scale_dark):
    for index, name in enumerate(TAIL_NAMES):
        head = TAIL_POINTS[index]
        tail = TAIL_POINTS[index + 1]
        bone = rig.data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if index == 0:
            bone.parent = rig.data.edit_bones["hips"]
        else:
            bone.parent = rig.data.edit_bones[TAIL_NAMES[index - 1]]
        bone.use_connect = index > 0
    bpy.ops.object.mode_set(mode="OBJECT")

    path = catmull_rom(TAIL_POINTS, samples_per_segment=5)
    radii = []
    for i in range(len(path)):
        u = i / (len(path) - 1)
        radii.append(0.165 * (1.0 - u) ** 0.72 + 0.012)
    tail = swept_tube("Weighted_Tapered_Tail", path, radii, skin, sides=8)
    bind_tail(tail, rig, sides=8)

    scale_indices = [
        round(i * (len(path) - 1) / 7) for i in range(1, 8)
    ]
    scale_points = [path[i] for i in scale_indices]
    for index, point in enumerate(scale_points):
        up = Vector((0.0, 0.0, 1.0))
        base = point + up * 0.035
        tip = base + up * (0.13 * (1.0 - index / 10.0))
        u = scale_indices[index] / (len(path) - 1)
        bone_index = min(3, max(0, int(u * 4)))
        cone_between(
            f"Tail_Ridge_{index + 1:02d}",
            base,
            tip,
            0.050 * (1.0 - u * 0.45),
            0.002,
            scale_dark,
            rig,
            TAIL_NAMES[bone_index],
            vertices=4,
        )
    return tail


def add_head(rig, mats):
    skin = mats["skin"]
    dark = mats["dark"]
    belly = mats["belly"]
    ivory = mats["ivory"]
    gold = mats["gold"]
    leather = mats["leather"]

    ellipsoid(
        "Neck_Scaled", (0.0, 0.0, 1.29), (0.20, 0.18, 0.22), skin, rig, "head"
    )
    ellipsoid(
        "Throat_Plate",
        (0.0, -0.145, 1.29),
        (0.145, 0.06, 0.16),
        belly,
        rig,
        "head",
    )
    ellipsoid(
        "Dragon_Skull", (0.0, -0.015, 1.52), (0.285, 0.25, 0.255), skin, rig, "head"
    )
    ellipsoid(
        "Long_Snout",
        (0.0, -0.335, 1.455),
        (0.215, 0.345, 0.155),
        skin,
        rig,
        "head",
    )
    cone_between(
        "Blunt_Dragon_Nose",
        (0.0, -0.50, 1.465),
        (0.0, -0.665, 1.455),
        0.132,
        0.058,
        skin,
        rig,
        "head",
        vertices=8,
    )
    ellipsoid(
        "Lower_Jaw",
        (0.0, -0.335, 1.355),
        (0.185, 0.305, 0.085),
        belly,
        rig,
        "head",
    )
    ellipsoid(
        "Throat_Scales",
        (0.0, -0.20, 1.31),
        (0.13, 0.035, 0.115),
        dark,
        rig,
        "head",
    )

    for side, x in (("L", 0.247), ("R", -0.247)):
        ellipsoid(
            f"Eye_Socket_{side}",
            (x, -0.175, 1.56),
            (0.078, 0.036, 0.076),
            dark,
            rig,
            "head",
            subdivisions=2,
        )
        ellipsoid(
            f"Golden_Eye_{side}",
            (x, -0.205, 1.56),
            (0.060, 0.028, 0.058),
            gold,
            rig,
            "head",
            subdivisions=2,
        )
        ellipsoid(
            f"Slit_Pupil_{side}",
            (x, -0.229, 1.56),
            (0.012, 0.012, 0.045),
            dark,
            rig,
            "head",
            subdivisions=1,
        )
        cone_between(
            f"Heavy_Brow_{side}",
            (x * 1.18, -0.12, 1.65),
            (x * 0.82, -0.27, 1.59),
            0.038,
            0.020,
            dark,
            rig,
            "head",
            vertices=5,
        )
        for spike_index, z in enumerate((1.46, 1.52, 1.57)):
            cone_between(
                f"Cheek_Spike_{side}_{spike_index + 1}",
                (x * 1.15, 0.02, z),
                (x * 1.75, 0.24 + spike_index * 0.04, z + 0.015),
                0.036,
                0.004,
                dark,
                rig,
                "head",
                vertices=4,
            )
        cone_between(
            f"Nostril_{side}",
            (x * 0.28, -0.61, 1.48),
            (x * 0.28, -0.635, 1.48),
            0.020,
            0.014,
            dark,
            rig,
            "head",
            vertices=6,
        )

    curve_tube(
        "Mouth_Line",
        [(-0.175, -0.56, 1.385), (-0.09, -0.61, 1.375), (0.0, -0.62, 1.375),
         (0.09, -0.61, 1.375), (0.175, -0.56, 1.385)],
        0.010,
        dark,
        rig,
        "head",
        sides=5,
    )
    for side, x in (("L", 0.055), ("R", -0.055)):
        cone_between(
            f"Fang_{side}",
            (x, -0.59, 1.36),
            (x, -0.605, 1.315),
            0.018,
            0.002,
            ivory,
            rig,
            "head",
            vertices=5,
        )
    for side, sign in (("L", 1.0), ("R", -1.0)):
        horn_points = [
            Vector((0.13 * sign, 0.04, 1.66)),
            Vector((0.18 * sign, 0.15, 1.80)),
            Vector((0.23 * sign, 0.27, 1.91)),
            Vector((0.29 * sign, 0.37, 1.92)),
            Vector((0.34 * sign, 0.42, 1.87)),
        ]
        horn = swept_tube(
            f"Swept_Horn_{side}",
            horn_points,
            [0.067, 0.058, 0.044, 0.027, 0.005],
            leather,
            sides=7,
        )
        skin_rigid(horn, rig, "head")
    for index, (x_offset, z_start, z_end) in enumerate(
        ((0.0, 1.69, 1.81), (0.065, 1.66, 1.76), (-0.065, 1.66, 1.76))
    ):
        cone_between(
            f"Rear_Crest_{index + 1}",
            (x_offset, 0.18, z_start),
            (x_offset * 1.6, 0.34, z_end),
            0.035,
            0.003,
            dark,
            rig,
            "head",
            vertices=4,
        )
    for index, z in enumerate((1.31, 1.39, 1.47)):
        cone_between(
            f"Neck_Ridge_{index + 1}",
            (0.0, 0.16, z),
            (0.0, 0.29, z + 0.075),
            0.035,
            0.003,
            dark,
            rig,
            "head",
            vertices=4,
        )


def add_clothing_and_gear(rig, mats):
    cloth = mats["cloth"]
    leather = mats["leather"]
    ivory = mats["ivory"]
    brass = mats["brass"]
    dark = mats["dark"]

    add_cape(rig, cloth)
    torus(
        "Scout_Neck_Cowl",
        (0.0, 0.0, 1.225),
        0.205,
        0.060,
        cloth,
        rig,
        "chest",
        scale=(1.0, 0.80, 1.0),
        major_segments=14,
        minor_segments=5,
    )
    curve_tube(
        "Leather_Crossbody_Strap",
        [(0.245, -0.18, 1.18), (0.10, -0.27, 0.98), (-0.12, -0.25, 0.78),
         (-0.28, -0.17, 0.65)],
        0.022,
        leather,
        rig,
        "chest",
        sides=5,
    )
    torus(
        "Wide_Leather_Belt",
        (0.0, 0.0, 0.605),
        0.302,
        0.045,
        leather,
        rig,
        "hips",
        scale=(1.0, 0.80, 1.0),
        major_segments=16,
        minor_segments=4,
    )
    box(
        "Belt_Buckle",
        (0.0, -0.252, 0.605),
        (0.085, 0.025, 0.075),
        brass,
        rig,
        "hips",
    )
    for side, sign in (("L", 1.0), ("R", -1.0)):
        box(
            f"Hip_Pouch_{side}",
            (0.30 * sign, -0.03, 0.54),
            (0.115, 0.075, 0.145),
            leather,
            rig,
            "hips",
            rotation=(0.0, 0.0, sign * 0.12),
        )
        box(
            f"Pouch_Flap_{side}",
            (0.30 * sign, -0.115, 0.57),
            (0.10, 0.018, 0.065),
            brass,
            rig,
            "hips",
        )
        torus(
            f"Ankle_Wrap_{side}",
            (0.171 * sign, -0.01, 0.205),
            0.086,
            0.021,
            ivory,
            rig,
            f"lowerleg.{'l' if sign > 0 else 'r'}",
            scale=(1.0, 0.82, 1.0),
            major_segments=10,
            minor_segments=4,
        )
        torus(
            f"Forearm_Wrap_{side}",
            (0.59 * sign, 0.0, 1.106),
            0.074,
            0.020,
            ivory,
            rig,
            f"lowerarm.{'l' if sign > 0 else 'r'}",
            rotation=(0.0, math.pi / 2.0, 0.0),
            major_segments=10,
            minor_segments=4,
        )
    torus(
        "Rope_Coil_A",
        (-0.285, -0.035, 0.69),
        0.085,
        0.014,
        ivory,
        rig,
        "hips",
        rotation=(math.pi / 2.0, 0.0, 0.0),
        scale=(1.0, 0.80, 1.0),
        major_segments=14,
        minor_segments=4,
    )
    torus(
        "Rope_Coil_B",
        (-0.292, -0.035, 0.69),
        0.069,
        0.013,
        ivory,
        rig,
        "hips",
        rotation=(math.pi / 2.0, 0.0, 0.0),
        scale=(1.0, 0.80, 1.0),
        major_segments=14,
        minor_segments=4,
    )

    # Ragged central tabard flap.
    tabard = mesh_object(
        "Scout_Ragged_Tabard",
        [
            (-0.15, -0.245, 0.63),
            (0.15, -0.245, 0.63),
            (0.11, -0.27, 0.33),
            (0.01, -0.28, 0.22),
            (-0.10, -0.27, 0.34),
        ],
        [(0, 1, 2, 4), (4, 2, 3)],
        cloth,
        smooth=False,
    )
    select_only(tabard)
    solidify = tabard.modifiers.new("Cloth_Thickness", "SOLIDIFY")
    solidify.thickness = 0.014
    solidify.offset = 0.0
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    skin_rigid(tabard, rig, "hips")

    # Three forward talons on each foot and two small hand claws.
    for side, sign in (("L", 1.0), ("R", -1.0)):
        toes_bone = f"toes.{'l' if sign > 0 else 'r'}"
        for index, x_offset in enumerate((-0.055, 0.0, 0.055)):
            start = (0.171 * sign + x_offset, -0.205, 0.045)
            end = (0.171 * sign + x_offset * 1.35, -0.335, 0.015)
            cone_between(
                f"Foot_Talon_{side}_{index + 1}",
                start,
                end,
                0.028,
                0.003,
                ivory,
                rig,
                toes_bone,
                vertices=5,
            )
        hand_bone = f"hand.{'l' if sign > 0 else 'r'}"
        for index, z_offset in enumerate((-0.035, 0.035)):
            start = (0.885 * sign, -0.02, 1.085 + z_offset)
            end = (0.965 * sign, -0.07, 1.075 + z_offset * 1.4)
            cone_between(
                f"Hand_Claw_{side}_{index + 1}",
                start,
                end,
                0.020,
                0.002,
                ivory,
                rig,
                hand_bone,
                vertices=5,
            )

    # Compact brass dart launcher, fully rigid to the right hand.
    weapon_bone = "hand.r"
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.058,
        depth=0.43,
        location=(-0.885, -0.25, 1.09),
        rotation=(math.pi / 2.0, 0.0, 0.0),
    )
    barrel = bpy.context.object
    barrel.name = "Brass_Dart_Launcher_Barrel"
    assign_material(barrel, brass)
    skin_rigid(barrel, rig, weapon_bone)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.037,
        depth=0.018,
        location=(-0.885, -0.474, 1.09),
        rotation=(math.pi / 2.0, 0.0, 0.0),
    )
    bore = bpy.context.object
    bore.name = "Dart_Launcher_Dark_Bore"
    assign_material(bore, dark)
    skin_rigid(bore, rig, weapon_bone)
    cone_between(
        "Launcher_Wooden_Grip",
        (-0.885, -0.055, 1.04),
        (-0.885, -0.055, 0.86),
        0.047,
        0.065,
        leather,
        rig,
        weapon_bone,
        vertices=6,
    )
    box(
        "Launcher_Trigger_Guard",
        (-0.885, -0.15, 0.96),
        (0.065, 0.022, 0.070),
        brass,
        rig,
        weapon_bone,
    )
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.045,
        depth=0.25,
        location=(-0.885, -0.08, 1.09),
        rotation=(0.0, math.pi / 2.0, 0.0),
    )
    drum = bpy.context.object
    drum.name = "Launcher_Side_Drum"
    assign_material(drum, brass)
    skin_rigid(drum, rig, weapon_bone)
    cone_between(
        "Loaded_Dart",
        (-0.885, -0.49, 1.09),
        (-0.885, -0.67, 1.09),
        0.022,
        0.002,
        ivory,
        rig,
        weapon_bone,
        vertices=5,
    )

    # Lightweight wind-reading ribbon held in the left hand.
    ribbon = mesh_object(
        "Scout_Wind_Ribbon",
        [
            (0.90, -0.005, 1.12),
            (0.955, -0.02, 1.20),
            (1.035, -0.10, 1.33),
            (1.105, -0.24, 1.36),
            (0.978, -0.12, 1.28),
            (0.93, -0.04, 1.17),
        ],
        [(0, 1, 5), (1, 2, 4), (1, 4, 5), (2, 3, 4)],
        ivory,
        smooth=False,
    )
    select_only(ribbon)
    solidify = ribbon.modifiers.new("Ribbon_Thickness", "SOLIDIFY")
    solidify.thickness = 0.009
    solidify.offset = 0.0
    bpy.ops.object.modifier_apply(modifier=solidify.name)
    skin_rigid(ribbon, rig, "hand.l")


def compact_materials(obj):
    unique = []
    remap = {}
    for slot in obj.material_slots:
        mat = slot.material
        if mat is None:
            continue
        if mat not in remap:
            remap[mat] = len(unique)
            unique.append(mat)
    for poly in obj.data.polygons:
        old_mat = obj.material_slots[poly.material_index].material
        poly.material_index = remap[old_mat]
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)


def normalize_and_validate_weights(obj, valid_bones):
    group_names = {group.index: group.name for group in obj.vertex_groups}
    unweighted = []
    invalid = set()
    for vertex in obj.data.vertices:
        total = 0.0
        for membership in vertex.groups:
            name = group_names[membership.group]
            if name not in valid_bones:
                invalid.add(name)
            total += membership.weight
        if total <= 1e-8:
            unweighted.append(vertex.index)
        elif abs(total - 1.0) > 1e-5:
            for membership in vertex.groups:
                obj.vertex_groups[membership.group].add(
                    [vertex.index], membership.weight / total, "REPLACE"
                )
    if unweighted:
        raise RuntimeError(f"Unweighted vertices: {unweighted[:20]}")
    if invalid:
        raise RuntimeError(f"Invalid bone weight groups: {sorted(invalid)}")


def add_render_setup(mats):
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

    world = bpy.data.worlds.new("KoboldScout_RenderWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.025, 0.032, 0.035, 1.0)
    background.inputs["Strength"].default_value = 0.45

    render_collection = bpy.data.collections.new("RENDER_ONLY")
    scene.collection.children.link(render_collection)

    floor_mat = material("Render_Floor", (0.085, 0.072, 0.060), roughness=0.90)
    bpy.ops.mesh.primitive_plane_add(size=200.0, location=(0.0, 0.0, -0.012))
    floor = bpy.context.object
    floor.name = "RENDER_ONLY_Floor"
    floor.data.materials.append(floor_mat)
    for collection in list(floor.users_collection):
        collection.objects.unlink(floor)
    render_collection.objects.link(floor)

    def add_area(name, loc, energy, color, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = (
            Vector((0.0, 0.0, 0.95)) - Vector(loc)
        ).to_track_quat("-Z", "Y").to_euler()
        render_collection.objects.link(obj)
        return obj

    add_area(
        "RENDER_ONLY_Key",
        (-3.2, -4.0, 5.0),
        650.0,
        (1.0, 0.73, 0.54),
        3.0,
    )
    add_area(
        "RENDER_ONLY_Fill",
        (3.5, -2.0, 3.0),
        480.0,
        (0.48, 0.67, 1.0),
        3.5,
    )
    add_area(
        "RENDER_ONLY_Rim",
        (0.5, 4.0, 4.0),
        750.0,
        (1.0, 0.42, 0.20),
        2.5,
    )

    camera_data = bpy.data.cameras.new("KoboldScout_Camera")
    camera = bpy.data.objects.new("KoboldScout_Camera", camera_data)
    render_collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def render_views(camera):
    scene = bpy.context.scene
    views = {
        "front": (Vector((0.0, -5.0, 1.02)), 2.52),
        "side": (Vector((-5.0, 0.12, 1.00)), 2.72),
        "back": (Vector((0.0, 5.0, 1.02)), 2.52),
    }
    target = Vector((0.02, 0.22, 1.02))
    for name, (location, ortho_scale) in views.items():
        camera.location = location
        camera.data.ortho_scale = ortho_scale
        camera.rotation_euler = (target - location).to_track_quat(
            "-Z", "Y"
        ).to_euler()
        scene.render.filepath = str(OUTPUT / f"KoboldScout_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    rig.name = "KoboldScout_Rig"
    rig.data.name = "KoboldScout_Skeleton"

    # Preserve a full rest-pose snapshot for the original game animation rig.
    original_bones = {}
    for bone in rig.data.bones:
        original_bones[bone.name] = (
            bone.parent.name if bone.parent else None,
            tuple(bone.head_local),
            tuple(bone.tail_local),
            tuple(tuple(row) for row in bone.matrix_local),
        )

    # Remove custom-shape helper meshes and the ninja head covering only.
    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None
    removed_names = {"Ninja_Head", "Ninja_Headband", "Ninja_Mask"}
    body_objects = []
    for obj in list(bpy.context.scene.objects):
        if obj == rig:
            continue
        if obj.type == "MESH" and obj.name in removed_names:
            bpy.data.objects.remove(obj, do_unlink=True)
        elif obj.type == "MESH" and obj.parent == rig:
            body_objects.append(obj)
        elif obj.name.startswith("Icosphere"):
            bpy.data.objects.remove(obj, do_unlink=True)
    if len(original_bones) != 23:
        raise RuntimeError(f"Expected 23 source bones, found {len(original_bones)}")

    mats = {
        "skin": material("Kobold_Skin_Red", (0.36, 0.055, 0.038), 0.74),
        "dark": material("Kobold_Scale_Shadow", (0.095, 0.020, 0.015), 0.82),
        "belly": material("Kobold_Throat_Tan", (0.50, 0.285, 0.170), 0.80),
        "cloth": material("Scout_Field_Cloth", (0.170, 0.185, 0.095), 0.92),
        "leather": material("Scout_Leather", (0.105, 0.050, 0.026), 0.86),
        "brass": material("Launcher_Brass", (0.42, 0.265, 0.075), 0.34, 0.68),
        "ivory": material("Claws_Twine_Ribbon", (0.73, 0.65, 0.48), 0.74),
        "gold": material(
            "Kobold_Golden_Eyes",
            (0.95, 0.49, 0.035),
            0.30,
            emission=(0.95, 0.26, 0.01),
        ),
    }
    palette = [
        mats["skin"],
        mats["dark"],
        mats["belly"],
        mats["cloth"],
        mats["leather"],
        mats["brass"],
        mats["ivory"],
        mats["gold"],
    ]

    for obj in body_objects:
        if obj.name == "Ninja_ArmLeft" or obj.name == "Ninja_ArmRight":
            assign_material(obj, mats["skin"])
        elif obj.name == "Ninja_LegLeft" or obj.name == "Ninja_LegRight":
            assign_material(obj, mats["skin"])
        else:
            assign_material(obj, mats["cloth"])

    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    add_tail(rig, mats["skin"], mats["dark"])
    bpy.ops.object.mode_set(mode="OBJECT")

    add_head(rig, mats)
    add_clothing_and_gear(rig, mats)

    # Add a short row of dorsal scales where the tunic meets the tail.
    for index in range(3):
        cone_between(
            f"Back_Ridge_{index + 1}",
            (0.0, 0.17 + index * 0.045, 0.83 - index * 0.11),
            (0.0, 0.27 + index * 0.05, 0.90 - index * 0.10),
            0.035,
            0.002,
            mats["dark"],
            rig,
            "spine",
            vertices=4,
        )

    # Verify that adding tail bones left every original rest transform intact.
    for name, snapshot in original_bones.items():
        bone = rig.data.bones.get(name)
        if bone is None:
            raise RuntimeError(f"Original bone missing: {name}")
        current = (
            bone.parent.name if bone.parent else None,
            tuple(bone.head_local),
            tuple(bone.tail_local),
            tuple(tuple(row) for row in bone.matrix_local),
        )
        if current != snapshot:
            raise RuntimeError(f"Original bone transform changed: {name}")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.parent == rig]
    for obj in meshes:
        assign_material_from_palette(obj, palette)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "KoboldScout_Body"
    body.data.name = "KoboldScout_Geometry"
    body.data.materials.clear()
    for palette_material in palette:
        body.data.materials.append(palette_material)
    material_groups = {
        group.index: int(group.name.split("_", 1)[1])
        for group in body.vertex_groups
        if group.name.startswith("MAT_")
    }
    for poly in body.data.polygons:
        detected = None
        for vertex_index in poly.vertices:
            for membership in body.data.vertices[vertex_index].groups:
                if membership.group in material_groups and membership.weight > 0.5:
                    detected = material_groups[membership.group]
                    break
            if detected is not None:
                break
        if detected is None:
            raise RuntimeError(f"No material tag found for polygon {poly.index}")
        poly.material_index = detected
    for group in list(body.vertex_groups):
        if group.name.startswith("MAT_"):
            body.vertex_groups.remove(group)
    used_materials = {
        body.material_slots[poly.material_index].material.name
        for poly in body.data.polygons
    }
    if len(used_materials) != 8:
        raise RuntimeError(f"Expected 8 used materials, found {sorted(used_materials)}")
    normalize_and_validate_weights(body, set(original_bones) | set(TAIL_NAMES))

    body.data.calc_loop_triangles()
    triangle_count = len(body.data.loop_triangles)
    if triangle_count > 20000:
        raise RuntimeError(f"Triangle ceiling exceeded: {triangle_count}")
    if len(body.data.materials) > 8:
        raise RuntimeError(f"Material-slot ceiling exceeded: {len(body.data.materials)}")

    # Keep only intended render geometry and the armature in the GLB.
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "KoboldScout.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_apply=False,
    )

    camera = add_render_setup(mats)
    render_views(camera)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "KoboldScout.blend"))

    weighted = []
    for vertex in body.data.vertices:
        weighted.append(sum(g.weight for g in vertex.groups if g.weight > 0.00001))
    report = {
        "asset": "KoboldScout",
        "source": "public/assets/characters/series4/Ninja.glb (CC0 KayKit body/rig)",
        "blender": bpy.app.version_string,
        "vertices": len(body.data.vertices),
        "triangles": triangle_count,
        "materials": [mat.name for mat in body.data.materials],
        "material_slots": len(body.data.materials),
        "bones": len(rig.data.bones),
        "original_bones_preserved": len(original_bones),
        "tail_bones_added": list(TAIL_NAMES),
        "minimum_weight_sum": min(weighted),
        "maximum_weight_sum": max(weighted),
        "unweighted_vertices": sum(value <= 0.00001 for value in weighted),
        "max_weight_influences": max(
            sum(1 for g in vertex.groups if g.weight > 0.00001)
            for vertex in body.data.vertices
        ),
    }
    (OUTPUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n")

    markdown = f"""# KoboldScout submission

## Result

An editable, single-mesh skinned low-poly kobold scout built from the supplied CC0 KayKit Ninja body and 23-bone shared rig. The ninja head and accessories were removed. The new long-snouted dragon head, golden slit eyes, swept horns, throat contrast, clawed extremities, layered field clothing, belt gear, dart launcher, and wind-reading ribbon are original project geometry.

## Technical summary

- Mesh objects in exported GLB: 1 intended skinned body plus 1 armature.
- Vertices: {report['vertices']}
- Triangles: {report['triangles']} (target under 12,000; hard ceiling 20,000)
- Materials: {report['material_slots']} ({', '.join(report['materials'])})
- Bones: {report['bones']} total; all {report['original_bones_preserved']} original names/rest transforms preserved; four weighted tail bones added.
- Skinning: {report['unweighted_vertices']} unweighted vertices; weight sums {report['minimum_weight_sum']:.6f} to {report['maximum_weight_sum']:.6f}; maximum {report['max_weight_influences']} influences per vertex.
- Source is unchanged and remains at `public/assets/characters/series4/Ninja.glb`.

## Assumptions

- The front direction is world -Y, matching the donor feet and face.
- Neutral T-pose is retained as the export pose so the existing 23-bone game animation library remains authoritative.
- Ear/clothing surfaces are intentionally simple and in places open; closed or intersecting detail was not treated as a gameplay defect.
- Hard-surface gear uses rigid weights to the intended hand, toe, chest, or hip bones, allowing deformation without auto-rig ambiguity.

## Known flaws and art follow-up

- This is a first-pass stylized submission, not accepted production art. Head and clothing forms are faceted and intentionally chunky.
- The launcher is a readable silhouette prop rather than a mechanically accurate dart weapon.
- Hand anatomy remains the donor mitten form, with only claw accents added.
- No game animation playback or in-engine validation was performed. The GLB was imported with the supplied Blender validator; visual renders use the authored Blender scene.
- Final art refinement should focus on snout planes, brow asymmetry, garment folds, tail scale rhythm, belt accessory spacing, and grip alignment during animation.
"""
    (OUTPUT / "SUBMISSION.md").write_text(markdown)
    print("BUILD_COMPLETE", json.dumps(report))
    os._exit(0)


if __name__ == "__main__":
    main()
