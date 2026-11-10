"""Build the KoboldEmberkeeper submission from the supplied project Scout.

Run:
    blender --background --factory-startup --threads 4 --python build.py
"""

import json
import math
import os
import hashlib
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "public/assets/creatures/wave-01/KoboldScout.glb"
OUTPUT = ROOT / "test-results/asset-workers/kobold-emberkeeper"
OUTPUT.mkdir(parents=True, exist_ok=True)

TAIL_NAMES = ("tail1", "tail2", "tail3", "tail4")
WING_NAMES = ("wing.l", "wing.r")
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


def material(
    name, color, roughness=0.8, metallic=0.0, emission=None, emission_strength=0.18
):
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
            bsdf.inputs["Emission Strength"].default_value = emission_strength
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


def adopt_palette_by_slot(obj, palette):
    """Replace an existing eight-slot palette in place without losing face assignments."""
    if len(obj.data.materials) != len(palette):
        raise RuntimeError(
            f"{obj.name} has {len(obj.data.materials)} source materials, expected {len(palette)}"
        )
    obj.data.materials.clear()
    for palette_material in palette:
        obj.data.materials.append(palette_material)
    for index in range(len(palette)):
        group = obj.vertex_groups.get(f"MAT_{index}")
        if group is not None:
            obj.vertex_groups.remove(group)
        group = obj.vertex_groups.new(name=f"MAT_{index}")
        vertices = sorted(
            {
                vertex
                for poly in obj.data.polygons
                if poly.material_index == index
                for vertex in poly.vertices
            }
        )
        if vertices:
            group.add(vertices, 1.0, "REPLACE")


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


def add_wings(rig, membrane_mat, bone_mat):
    """Add compact chest-mounted bat wings with three readable finger ribs."""
    membrane_mat.use_backface_culling = False
    for side, sign in (("L", 1.0), ("R", -1.0)):
        bone = rig.data.edit_bones.new(WING_NAMES[0 if sign > 0 else 1])
        bone.head = (0.12 * sign, 0.09, 1.18)
        bone.tail = (0.91 * sign, 0.34, 1.55)
        bone.parent = rig.data.edit_bones["chest"]
        bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")

    for side, sign in (("L", 1.0), ("R", -1.0)):
        bone_name = WING_NAMES[0 if sign > 0 else 1]
        root = Vector((0.13 * sign, 0.12, 1.18))
        shoulder = Vector((0.40 * sign, 0.29, 1.64))
        wrist = Vector((0.69 * sign, 0.32, 1.70))
        outer_tip = Vector((0.98 * sign, 0.42, 1.42))
        valley_1 = Vector((0.87 * sign, 0.44, 1.31))
        finger_2 = Vector((0.77 * sign, 0.41, 1.10))
        valley_2 = Vector((0.66 * sign, 0.38, 1.22))
        finger_3 = Vector((0.54 * sign, 0.33, 1.05))
        valley_3 = Vector((0.41 * sign, 0.25, 1.16))
        base = Vector((0.24 * sign, 0.16, 1.06))
        outline = [
            root,
            shoulder,
            wrist,
            outer_tip,
            valley_1,
            finger_2,
            valley_2,
            finger_3,
            valley_3,
            base,
        ]
        membrane = mesh_object(
            f"Wing_Membrane_{side}",
            outline,
            [(0, index, index + 1) for index in range(1, len(outline) - 1)],
            membrane_mat,
            smooth=False,
        )
        skin_rigid(membrane, rig, bone_name)
        rods = (
            (root, shoulder, 0.046, 0.027),
            (shoulder, wrist, 0.027, 0.018),
            (wrist, outer_tip, 0.020, 0.004),
            (wrist, finger_2, 0.016, 0.003),
            (wrist, finger_3, 0.014, 0.003),
        )
        for index, (start, end, r0, r1) in enumerate(rods):
            cone_between(
                f"Wing_Finger_{side}_{index + 1}",
                start,
                end,
                r0,
                r1,
                bone_mat,
                rig,
                bone_name,
                vertices=5,
            )
        cone_between(
            f"Wing_Claw_{side}",
            wrist,
            wrist + Vector((0.065 * sign, 0.02, 0.085)),
            0.022,
            0.002,
            bone_mat,
            rig,
            bone_name,
            vertices=5,
        )


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
    gold = mats["gold"]

    add_cape(rig, cloth)
    ceremonial_panels = (
        ("Front", [(-0.235, -0.275, 0.62), (0.235, -0.275, 0.62),
                   (0.17, -0.29, 0.31), (0.02, -0.30, 0.17), (-0.15, -0.29, 0.34)]),
        ("Back", [(-0.24, 0.205, 0.62), (0.24, 0.205, 0.62),
                  (0.19, 0.275, 0.30), (0.02, 0.29, 0.20), (-0.17, 0.275, 0.33)]),
        ("Left", [(0.27, -0.10, 0.62), (0.30, 0.15, 0.62),
                  (0.36, 0.17, 0.28), (0.30, 0.02, 0.34)]),
        ("Right", [(-0.27, 0.15, 0.62), (-0.30, -0.10, 0.62),
                   (-0.30, 0.02, 0.34), (-0.36, 0.17, 0.28)]),
    )
    for panel_name, points in ceremonial_panels:
        panel = mesh_object(
            f"Ceremonial_Overskirt_{panel_name}",
            points,
            [tuple(range(len(points)))],
            cloth,
            smooth=False,
        )
        select_only(panel)
        solidify = panel.modifiers.new("Cloth_Thickness", "SOLIDIFY")
        solidify.thickness = 0.012
        solidify.offset = 0.0
        bpy.ops.object.modifier_apply(modifier=solidify.name)
        skin_rigid(panel, rig, "hips")
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
    for index, (x, z, bone_name) in enumerate((
        (-0.23, 0.72, "hips"),
        (-0.33, 0.64, "hips"),
        (0.27, 0.70, "hips"),
        (-0.08, 1.12, "chest"),
        (0.20, 1.05, "chest"),
    )):
        torus(
            f"Charm_Bell_Ring_{index + 1}",
            (x, -0.235 if bone_name == "hips" else -0.20, z + 0.065),
            0.035,
            0.008,
            brass,
            rig,
            bone_name,
            rotation=(math.pi / 2.0, 0.0, 0.0),
            major_segments=10,
            minor_segments=4,
        )
        cone_between(
            f"Charm_Bell_{index + 1}",
            (x, -0.235 if bone_name == "hips" else -0.20, z),
            (x, -0.235 if bone_name == "hips" else -0.20, z - 0.075),
            0.043,
            0.020,
            brass,
            rig,
            bone_name,
            vertices=8,
        )
        ellipsoid(
            f"Bell_Clapper_{index + 1}",
            (x, -0.28 if bone_name == "hips" else -0.245, z - 0.085),
            (0.013, 0.013, 0.018),
            dark,
            rig,
            bone_name,
            subdivisions=1,
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
        ellipsoid(
            f"Smoke_Darkened_Hand_{side}",
            (0.845 * sign, -0.01, 1.09),
            (0.115, 0.085, 0.070),
            dark,
            rig,
            f"hand.{'l' if sign > 0 else 'r'}",
            subdivisions=1,
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

    # Full front robe panels break up the original orange Scout bib.
    for side, sign in (("L", 1.0), ("R", -1.0)):
        robe = mesh_object(
            f"Emberkeeper_Robe_Front_{side}",
            [
                (0.035 * sign, -0.215, 1.27),
                (0.255 * sign, -0.185, 1.22),
                (0.225 * sign, -0.235, 0.77),
                (0.045 * sign, -0.275, 0.69),
            ],
            [(0, 1, 2, 3)],
            cloth,
            smooth=False,
        )
        select_only(robe)
        solidify = robe.modifiers.new("Robe_Thickness", "SOLIDIFY")
        solidify.thickness = 0.018
        solidify.offset = 0.0
        bpy.ops.object.modifier_apply(modifier=solidify.name)
        skin_rigid(robe, rig, "spine")

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

    # Sacred travelling brazier hangs from the left hand on a compact chain.
    hand_bone = "hand.l"
    chain_x = 0.90
    for index, z in enumerate((1.050, 0.992)):
        torus(
            f"Brazier_Chain_Link_{index + 1}",
            (chain_x, -0.11 - index * 0.014, z),
            0.034,
            0.007,
            brass,
            rig,
            hand_bone,
            rotation=(math.pi / 2.0, 0.0, (index % 2) * math.pi / 2.0),
            major_segments=10,
            minor_segments=4,
        )
    cone_between(
        "Brazier_Chain_Handle",
        (chain_x, -0.14, 0.982),
        (0.86, -0.22, 0.938),
        0.010,
        0.010,
        brass,
        rig,
        hand_bone,
        vertices=6,
    )
    ring_sides = 12
    # Keep a readable cup while bringing its underside into the organizer's
    # required 0.45-unit suspension envelope. The chain receives the larger
    # reduction; the cup retains 85% of its authored vertical proportions.
    cup_min_z = 0.650
    cup_source_min_z = 0.235
    cup_vertical_scale = 0.85

    def cup_z(value):
        return cup_min_z + (value - cup_source_min_z) * cup_vertical_scale

    profile = (
        (0.235, cup_z(0.565)),
        (0.245, cup_z(0.545)),
        (0.220, cup_z(0.485)),
        (0.165, cup_z(0.410)),
        (0.115, cup_z(0.340)),
        (0.075, cup_z(0.300)),
    )
    bowl_verts = []
    for radius, z in profile:
        for i in range(ring_sides):
            angle = 2.0 * math.pi * i / ring_sides
            bowl_verts.append(
                (0.83 + radius * math.cos(angle), -0.25 + radius * math.sin(angle), z)
            )
    bowl_faces = []
    for ring in range(len(profile) - 1):
        for i in range(ring_sides):
            nxt = (i + 1) % ring_sides
            a = ring * ring_sides + i
            b = ring * ring_sides + nxt
            c = (ring + 1) * ring_sides + nxt
            d = (ring + 1) * ring_sides + i
            bowl_faces.append((a, b, c, d))
    bottom_center = len(bowl_verts)
    bowl_verts.append((0.83, -0.25, cup_z(0.292)))
    start = (len(profile) - 1) * ring_sides
    for i in range(ring_sides):
        bowl_faces.append(
            (bottom_center, start + i, start + (i + 1) % ring_sides)
        )
    bowl = mesh_object(
        "Brazier_Bronze_Bowl", bowl_verts, bowl_faces, brass, smooth=True
    )
    skin_rigid(bowl, rig, hand_bone)
    torus(
        "Brazier_Rim",
        (0.83, -0.25, cup_z(0.56)),
        0.238,
        0.014,
        brass,
        rig,
        hand_bone,
        major_segments=16,
        minor_segments=4,
    )
    torus(
        "Brazier_Ember_Band",
        (0.83, -0.25, cup_z(0.49)),
        0.218,
        0.010,
        gold,
        rig,
        hand_bone,
        major_segments=16,
        minor_segments=4,
    )
    cone_between(
        "Brazier_Lower_Finial",
        (0.83, -0.25, cup_z(0.30)),
        (0.83, -0.25, cup_z(0.235)),
        0.050,
        0.012,
        brass,
        rig,
        hand_bone,
        vertices=8,
    )
    coals = (
        (0.745, -0.25, cup_z(0.566), 0.060),
        (0.825, -0.28, cup_z(0.571), 0.072),
        (0.900, -0.235, cup_z(0.563), 0.055),
        (0.780, -0.19, cup_z(0.568), 0.056),
        (0.885, -0.305, cup_z(0.570), 0.048),
    )
    for index, (x, y, z, radius) in enumerate(coals):
        ellipsoid(
            f"Brazier_Coal_{index + 1}",
            (x, y, z),
            (radius, radius, radius * 0.48),
            dark,
            rig,
            hand_bone,
            subdivisions=1,
        )
    flames = (
        ((0.76, -0.245, 0.965), (0.74, -0.245, 1.025), 0.075, 0.006),
        ((0.83, -0.255, 0.970), (0.84, -0.255, 1.087), 0.090, 0.005),
        ((0.90, -0.245, 0.965), (0.91, -0.25, 1.055), 0.068, 0.004),
    )
    for index, (base, tip, radius, taper) in enumerate(flames):
        cone_between(
            f"Brazier_Tapered_Flame_{index + 1}",
            base,
            tip,
            radius,
            taper,
            gold,
            rig,
            hand_bone,
            vertices=7,
        )


def finalize_hanging_brazier(rig):
    """Make a single unskinned prop whose local +Z (glTF +Y) is upright."""
    pieces = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.name.startswith("Brazier_")
    ]
    if not pieces:
        raise RuntimeError("Brazier pieces were not created")

    for obj in pieces:
        world = obj.matrix_world.copy()
        for modifier in list(obj.modifiers):
            if modifier.type == "ARMATURE":
                obj.modifiers.remove(modifier)
        for group in list(obj.vertex_groups):
            obj.vertex_groups.remove(group)
        obj.parent = None
        obj.matrix_world = world

    bpy.ops.object.select_all(action="DESELECT")
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    prop = bpy.context.object
    prop.name = "HangingBrazier"
    prop.data.name = "HangingBrazier_Mesh"

    # The top of the first chain link is the suspension/grip point. Local
    # geometry uses +Z up in Blender; glTF conversion makes node-local +Y up.
    pivot = Vector((0.90, -0.11, 1.096))
    for vertex in prop.data.vertices:
        vertex.co -= pivot
    prop.matrix_world = Matrix.Translation(pivot)
    local_y_min = min(vertex.co.z for vertex in prop.data.vertices)
    local_y_max = max(vertex.co.z for vertex in prop.data.vertices)
    if local_y_min < -0.45 - 1e-5 or local_y_max > -0.002 + 1e-5:
        raise RuntimeError(
            "HangingBrazier envelope outside [-0.45, -0.002]: "
            f"{local_y_min:.6f} to {local_y_max:.6f}"
        )
    prop["axis"] = "glTF local +Y up; flames point +Y; object origin at top grip"
    prop["rigid"] = True

    world_before = prop.matrix_world.copy()
    bpy.ops.object.select_all(action="DESELECT")
    prop.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones["hand.l"]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)
    if prop.parent != rig or prop.parent_type != "BONE" or prop.parent_bone != "hand.l":
        raise RuntimeError("HangingBrazier was not parented to hand.l")
    residual = max(
        abs(prop.matrix_world[row][column] - world_before[row][column])
        for row in range(4)
        for column in range(4)
    )
    if residual > 1e-5:
        raise RuntimeError(f"Bone parenting moved HangingBrazier by {residual}")
    return prop


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

    world = bpy.data.worlds.new("KoboldEmberkeeper_RenderWorld")
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

    camera_data = bpy.data.cameras.new("KoboldEmberkeeper_Camera")
    camera = bpy.data.objects.new("KoboldEmberkeeper_Camera", camera_data)
    render_collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def render_views(camera):
    scene = bpy.context.scene
    views = {
        "front": (Vector((0.0, -5.0, 1.05)), 2.86),
        "side": (Vector((-5.0, 0.12, 1.04)), 2.86),
        "back": (Vector((0.0, 5.0, 1.05)), 2.86),
    }
    target = Vector((0.02, 0.16, 1.02))
    for name, (location, ortho_scale) in views.items():
        camera.location = location
        camera.data.ortho_scale = ortho_scale
        camera.rotation_euler = (target - location).to_track_quat(
            "-Z", "Y"
        ).to_euler()
        scene.render.filepath = str(OUTPUT / f"KoboldEmberkeeper_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    rig.name = "KoboldEmberkeeper_Rig"
    rig.data.name = "KoboldEmberkeeper_Skeleton"

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
    if len(original_bones) != 27:
        raise RuntimeError(
            f"Expected 23 source bones plus four Scout tail bones, found {len(original_bones)}"
        )

    mats = {
        "skin": material("Emberkeeper_Copper_Scale", (0.46, 0.13, 0.035), 0.68),
        "dark": material("Smoke_Darkened_Scale", (0.060, 0.025, 0.016), 0.86),
        "belly": material("Warm_Throat_And_Membrane", (0.66, 0.31, 0.095), 0.78),
        "cloth": material("Emberkeeper_Green_Cloth", (0.055, 0.125, 0.034), 0.94),
        "leather": material("Temple_Leather", (0.105, 0.050, 0.026), 0.86),
        "brass": material("Sacred_Bronze", (0.46, 0.255, 0.055), 0.30, 0.74),
        "ivory": material("Claws_Charms_Twine", (0.73, 0.63, 0.43), 0.74),
        "gold": material(
            "Golden_Eyes_And_Flame",
            (1.0, 0.42, 0.025),
            0.24,
            emission=(1.0, 0.16, 0.004),
            emission_strength=1.8,
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
        if obj.name == "KoboldScout_Body":
            adopt_palette_by_slot(obj, palette)
        elif obj.name in {"Ninja_ArmLeft", "Ninja_ArmRight", "Ninja_LegLeft", "Ninja_LegRight"}:
            assign_material(obj, mats["skin"])
        else:
            assign_material(obj, mats["cloth"])

    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    add_wings(rig, mats["leather"], mats["skin"])

    add_head(rig, mats)
    add_clothing_and_gear(rig, mats)
    brazier = finalize_hanging_brazier(rig)

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

    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.parent == rig and obj.parent_type != "BONE"
    ]
    for obj in meshes:
        if obj.name != "KoboldScout_Body":
            assign_material_from_palette(obj, palette)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "KoboldEmberkeeper_Body"
    body.data.name = "KoboldEmberkeeper_Geometry"
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
    normalize_and_validate_weights(
        body, set(original_bones) | set(TAIL_NAMES) | set(WING_NAMES)
    )

    body.data.calc_loop_triangles()
    brazier.data.calc_loop_triangles()
    triangle_count = len(body.data.loop_triangles)
    if triangle_count > 20000:
        raise RuntimeError(f"Triangle ceiling exceeded: {triangle_count}")
    if len(body.data.materials) > 8:
        raise RuntimeError(f"Material-slot ceiling exceeded: {len(body.data.materials)}")

    # Keep only intended render geometry and the armature in the GLB.
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    brazier.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "KoboldEmberkeeper.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_apply=False,
    )

    camera = add_render_setup(mats)
    render_views(camera)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "KoboldEmberkeeper.blend"))

    weighted = []
    for vertex in body.data.vertices:
        weighted.append(sum(g.weight for g in vertex.groups if g.weight > 0.00001))
    def sha256(path):
        digest = hashlib.sha256()
        with open(path, "rb") as handle:
            for chunk in iter(lambda: handle.read(65536), b""):
                digest.update(chunk)
        return digest.hexdigest()

    report = {
        "asset": "KoboldEmberkeeper",
        "source": "input/KoboldScout.glb",
        "source_sha256": sha256(SOURCE),
        "reference_sha256": sha256(ROOT / "input/reference.webp"),
        "license_sha256": sha256(ROOT / "input/LICENSE.txt"),
        "blender": bpy.app.version_string,
        "vertices": len(body.data.vertices),
        "triangles": triangle_count,
        "materials": [mat.name for mat in body.data.materials],
        "material_slots": len(body.data.materials),
        "bones": len(rig.data.bones),
        "original_bones_preserved": len(original_bones),
        "tail_bones_preserved": [name for name in TAIL_NAMES if name in original_bones],
        "wing_bones_added": list(WING_NAMES),
        "minimum_weight_sum": min(weighted),
        "maximum_weight_sum": max(weighted),
        "unweighted_vertices": sum(value <= 0.00001 for value in weighted),
        "max_weight_influences": max(
            sum(1 for g in vertex.groups if g.weight > 0.00001)
            for vertex in body.data.vertices
        ),
        "hanging_brazier": {
            "name": brazier.name,
            "bone_parent": brazier.parent_bone,
            "rigid_unskinned": not any(mod.type == "ARMATURE" for mod in brazier.modifiers),
            "origin_world_blender": list(brazier.matrix_world.translation),
            "local_y_min": min(vertex.co.z for vertex in brazier.data.vertices),
            "local_y_max": max(vertex.co.z for vertex in brazier.data.vertices),
            "local_up_blender": [0.0, 0.0, 1.0],
            "local_up_gltf": [0.0, 1.0, 0.0],
            "vertices": len(brazier.data.vertices),
            "triangles": len(brazier.data.loop_triangles),
        },
    }
    (OUTPUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n")

    markdown = f"""# KoboldEmberkeeper submission

## Result

An editable low-poly kobold built from the supplied project Scout, retaining its 23-bone shared rig and four tail joints. The emissive golden slit eyes, copper scales, smoke-dark hands, dark green ceremonial robe, bells, compact chest-mounted bat wings, and suspended sacred brazier are project-owned geometry. The Scout dart launcher and ribbon are absent.

## Technical summary

- Mesh objects in exported GLB: 1 skinned body, 1 rigid `HangingBrazier` prop, and 1 armature.
- Vertices: {report['vertices']}
- Total triangles: {report['triangles'] + report['hanging_brazier']['triangles']} ({report['triangles']} body + {report['hanging_brazier']['triangles']} prop; target under 12,000; hard ceiling 20,000)
- HangingBrazier: {report['hanging_brazier']['vertices']} vertices / {report['hanging_brazier']['triangles']} triangles; bone-parented to `{report['hanging_brazier']['bone_parent']}` and not skinned.
- Materials: {report['material_slots']} ({', '.join(report['materials'])})
- Bones: {report['bones']} total; all {report['original_bones_preserved']} supplied names/rest matrices preserved, including four existing tail joints; two chest-parented wing joints added.
- Skinning: {report['unweighted_vertices']} unweighted vertices; weight sums {report['minimum_weight_sum']:.6f} to {report['maximum_weight_sum']:.6f}; maximum {report['max_weight_influences']} influences per vertex.
- Sources: `input/KoboldScout.glb` SHA-256 `{report['source_sha256']}`; reference SHA-256 `{report['reference_sha256']}`; supplied license SHA-256 `{report['license_sha256']}`. Inputs were not modified.
- Verification artifacts: `output/KoboldEmberkeeper_front.png`, `..._side.png`, `..._back.png`, and `output/inspection.json`.

## Assumptions

- The front direction is world -Y, matching the donor feet and face.
- Neutral T-pose is retained as the export pose so the existing 23-bone game animation library remains authoritative.
- The two wing joints are one segment per wing, parented to `chest`, with scalloped double-sided membranes and three visible supporting ribs per wing. They do not attach to either arm.
- `HangingBrazier` is a single rigid unskinned mesh parented to `hand.l`. Its object origin is the top suspension/first chain-link grip at Blender world `(0.90, -0.11, 1.096)`. Blender local +Z is exported as glTF local +Y; all chain, cup and flame geometry has local Y {report['hanging_brazier']['local_y_min']:.6f} to {report['hanging_brazier']['local_y_max']:.6f}, entirely below the origin and inside the organizer's requested `[-0.45, -0.002]` envelope. The suspension was shortened to two chain links; the cup retains 85% of its authored vertical proportion. The tapered flames remain separate geometry pointing toward local +Y, with their vertical span compacted to respect the upper bound.
- Using the organizer's reported game-scale Idle hand height of 0.337, the revised bowl underside is approximately 0.047 game units above the floor by arithmetic. This is not an in-engine animation test.
- Clothing and wing membranes are open surfaces where visually appropriate; closed or intersecting detail was not treated as a gameplay defect.

## Known flaws and art follow-up

- This is a first-pass stylized review submission, not accepted production art. Head and clothing forms are faceted and intentionally chunky.
- Wing anatomy remains a compact low-poly silhouette with two animation bones; membrane ribs are visual geometry rather than additional joints.
- The brazier is a readable rigid low-poly silhouette prop with dark coal shapes and tapered emissive flames, not a simulated fire effect. Runtime upright correction was not performed here; the node axes and pivot are supplied for the organizer's correction.
- Hand anatomy remains the donor mitten form with claw and smoke-dark accents.
- No game animation playback or in-engine validation was performed. The GLB was imported with the supplied Blender validator; visual renders use the authored Blender scene.
- Final art refinement should focus on snout planes, garment folds, tail scale rhythm, wing membrane scalloping, brazier ornament, and grip alignment during animation.
"""
    (OUTPUT / "SUBMISSION.md").write_text(markdown)
    print("BUILD_COMPLETE", json.dumps(report))
    import sys
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import sys
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(1)
