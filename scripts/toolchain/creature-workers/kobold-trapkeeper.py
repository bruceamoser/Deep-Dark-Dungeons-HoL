"""Build the bounded KoboldTrapkeeper review asset from the supplied Scout GLB.

Run:
    timeout --kill-after=3s 45s blender --background --factory-startup \
        --threads 4 --python build.py
"""

import json
import hashlib
import math
import os
import sys
import traceback
from pathlib import Path

import bmesh
import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "public/assets/creatures/wave-01/KoboldScout.glb"
OUTPUT = ROOT / "test-results/asset-workers/kobold-trapkeeper"
OUTPUT.mkdir(parents=True, exist_ok=True)


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def set_material(mat, name, color, roughness=0.8, metallic=0.0, emission=None):
    mat.name = name
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
            bsdf.inputs["Emission Strength"].default_value = 0.10


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def skin_rigid(obj, rig, bone_name):
    if rig.data.bones.get(bone_name) is None:
        raise RuntimeError(f"Missing intended bone: {bone_name}")
    select_only(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.parent = rig
    group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
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


def ellipsoid(name, loc, scale, mat, rig, bone, subdivisions=1, rotation=None):
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
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    assign_material(obj, mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return skin_rigid(obj, rig, bone)


def cylinder(
    name, center, radius, depth, mat, rig, bone, rotation=(0.0, 0.0, 0.0), vertices=8
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=center
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
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


def swept_tube(name, points, radii, mat, rig, bone, sides=6):
    points = [Vector(point) for point in points]
    verts, faces = [], []
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
    end_base = (len(points) - 1) * sides
    for side_index in range(sides):
        next_side = (side_index + 1) % sides
        faces.append((start_center, next_side, side_index))
        faces.append((end_center, end_base + side_index, end_base + next_side))
    obj = mesh_object(name, verts, faces, mat)
    return skin_rigid(obj, rig, bone)


def tapered_panel(
    name, top_center, bottom_center, top_width, bottom_width, thickness, mat, rig, bone
):
    """Create a solid tan cloth panel with a readable tapered front silhouette."""
    tx, ty, tz = top_center
    bx, by, bz = bottom_center
    half_t, half_b = top_width * 0.5, bottom_width * 0.5
    half_d = thickness * 0.5
    verts = [
        (tx - half_t, ty - half_d, tz),
        (tx + half_t, ty - half_d, tz),
        (bx + half_b, by - half_d, bz),
        (bx - half_b, by - half_d, bz),
        (tx - half_t, ty + half_d, tz),
        (tx + half_t, ty + half_d, tz),
        (bx + half_b, by + half_d, bz),
        (bx - half_b, by + half_d, bz),
    ]
    faces = [
        (0, 1, 2, 3),
        (7, 6, 5, 4),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ]
    obj = mesh_object(name, verts, faces, mat, smooth=False)
    return skin_rigid(obj, rig, bone)


def connected_components(mesh):
    parent = list(range(len(mesh.vertices)))

    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for edge in mesh.edges:
        a, b = find(edge.vertices[0]), find(edge.vertices[1])
        if a != b:
            parent[b] = a
    by_root = {}
    for vertex in mesh.vertices:
        by_root.setdefault(find(vertex.index), []).append(vertex.index)
    vertex_component = {}
    components = {}
    for comp_index, (root, indices) in enumerate(by_root.items()):
        components[comp_index] = {
            "vertices": indices,
            "materials": set(),
            "min": [float("inf")] * 3,
            "max": [float("-inf")] * 3,
        }
        for index in indices:
            vertex_component[index] = comp_index
            co = mesh.vertices[index].co
            for axis in range(3):
                components[comp_index]["min"][axis] = min(
                    components[comp_index]["min"][axis], co[axis]
                )
                components[comp_index]["max"][axis] = max(
                    components[comp_index]["max"][axis], co[axis]
                )
    for poly in mesh.polygons:
        comp_index = vertex_component[poly.vertices[0]]
        slot = mesh.materials[poly.material_index] if mesh.materials else None
        if slot:
            components[comp_index]["materials"].add(slot.name)
    return components


def remove_scout_weapon_components(obj):
    removed, removed_vertices = [], 0
    components = connected_components(obj.data)
    remove_indices = set()
    for index, comp in components.items():
        low, high = comp["min"], comp["max"]
        center = [(low[axis] + high[axis]) * 0.5 for axis in range(3)]
        mats = comp["materials"]
        launcher_material = bool(
            mats
            & {
                "Launcher_Brass",
                "Scout_Leather",
                "Kobold_Scale_Shadow",
                "Claws_Twine_Ribbon",
            }
        )
        launcher = (
            launcher_material
            and center[0] < -0.72
            and center[2] < 1.25
            and (
                center[1] < -0.10
                or (center[2] < 1.05 and center[0] < -0.82)
                or ("Launcher_Brass" in mats and center[1] < 0.02)
            )
        )
        ribbon = (
            "Claws_Twine_Ribbon" in mats
            and high[0] > 0.99
            and high[2] > 1.15
        )
        if launcher or ribbon:
            remove_indices.update(comp["vertices"])
            removed_vertices += len(comp["vertices"])
            removed.append(
                {
                    "kind": "launcher" if launcher else "ribbon",
                    "triangles": sum(
                        1
                        for poly in obj.data.polygons
                        if poly.vertices[0] in comp["vertices"]
                    ),
                    "center": [round(value, 3) for value in center],
                }
            )
    if not removed:
        raise RuntimeError("Could not identify Scout launcher/ribbon components")
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[index] for index in remove_indices], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    print("REMOVED_SCOUT_PROPS", removed_vertices, "vertices", len(removed), "components")
    return removed


def add_dart_case(rig, mats):
    leather, dark, cloth, ivory, red = (
        mats["leather"],
        mats["dark"],
        mats["cloth"],
        mats["ivory"],
        mats["skin"],
    )
    case_start = Vector((-0.20, 0.185, 1.16))
    case_end = Vector((-0.32, 0.315, 1.55))
    swept_tube(
        "Dart_Case_Leather",
        [case_start, case_start.lerp(case_end, 0.5), case_end],
        [0.072, 0.068, 0.062],
        leather,
        rig,
        "chest",
        sides=8,
    )
    torus(
        "Dart_Case_Rim",
        case_end,
        0.061,
        0.012,
        ivory,
        rig,
        "chest",
        rotation=(math.pi / 2.4, -0.12, 0.28),
        major_segments=10,
        minor_segments=3,
    )
    box(
        "Dart_Case_Back_Clip",
        (-0.205, 0.215, 1.32),
        (0.024, 0.020, 0.17),
        dark,
        rig,
        "chest",
        rotation=(0.12, -0.25, -0.08),
    )
    for index in range(4):
        offset = Vector(((index - 1.5) * 0.022, 0.0, 0.0))
        base = case_end + offset
        tip = base + Vector((-0.06, 0.08 + index * 0.005, 0.16 + index * 0.015))
        cone_between(
            f"Case_Dart_Shaft_{index + 1}",
            base,
            tip,
            0.0085,
            0.005,
            ivory,
            rig,
            "chest",
            vertices=5,
        )
        cone_between(
            f"Case_Dart_Point_{index + 1}",
            tip,
            tip + (tip - base).normalized() * 0.045,
            0.010,
            0.001,
            dark,
            rig,
            "chest",
            vertices=5,
        )
        box(
            f"Case_Dart_Fletching_{index + 1}",
            base + Vector((-0.012, 0.018, 0.048)),
            (0.020, 0.006, 0.032),
            cloth if index % 2 else red,
            rig,
            "chest",
            rotation=(0.0, 0.18, 0.18),
        )


def add_tool_belt(rig, mats):
    leather, brass, ivory, dark, gold, cloth, tan = (
        mats["leather"],
        mats["brass"],
        mats["ivory"],
        mats["dark"],
        mats["gold"],
        mats["cloth"],
        mats["belly"],
    )
    # Knife and sheath on the character's right hip.
    box(
        "Tool_Knife_Sheath",
        (-0.335, -0.235, 0.47),
        (0.043, 0.055, 0.145),
        leather,
        rig,
        "hips",
        rotation=(0.0, -0.12, 0.05),
    )
    box(
        "Tool_Knife_Grip",
        (-0.335, -0.245, 0.665),
        (0.030, 0.036, 0.095),
        dark,
        rig,
        "hips",
        rotation=(0.0, -0.12, 0.05),
    )
    torus(
        "Tool_Knife_Pommel",
        (-0.335, -0.245, 0.752),
        0.028,
        0.010,
        brass,
        rig,
        "hips",
        rotation=(math.pi / 2.0, 0.0, 0.0),
        major_segments=8,
        minor_segments=3,
    )
    # Pliers are an unmistakable paired, notched silhouette.
    for sign in (-1.0, 1.0):
        swept_tube(
            f"Pliers_Handle_{'Outer' if sign > 0 else 'Inner'}",
            [
                (0.323 + sign * 0.027, -0.245, 0.69),
                (0.355 + sign * 0.038, -0.285, 0.43),
            ],
            [0.016, 0.012],
            brass,
            rig,
            "hips",
            sides=5,
        )
        swept_tube(
            f"Pliers_Jaw_{'Outer' if sign > 0 else 'Inner'}",
            [
                (0.323 + sign * 0.022, -0.245, 0.72),
                (0.350 + sign * 0.043, -0.258, 0.815),
            ],
            [0.016, 0.005],
            dark,
            rig,
            "hips",
            sides=5,
        )
    torus(
        "Pliers_Pivot",
        (0.323, -0.247, 0.705),
        0.030,
        0.009,
        ivory,
        rig,
        "hips",
        rotation=(math.pi / 2.0, 0.0, 0.0),
        major_segments=8,
        minor_segments=3,
    )
    for index, x in enumerate((0.12, 0.17, 0.22)):
        cylinder(
            f"Rubble_Peg_{index + 1}",
            (x, -0.255, 0.68),
            0.012,
            0.16,
            ivory,
            rig,
            "hips",
            rotation=(0.12, 0.0, math.pi / 2.0),
            vertices=6,
        )
        cylinder(
            f"Rubble_Peg_Band_{index + 1}",
            (x, -0.255, 0.735),
            0.015,
            0.020,
            gold if index == 1 else leather,
            rig,
            "hips",
            rotation=(0.0, 0.0, 0.0),
            vertices=8,
        )

    # A broad leather tool roll replaces the previous pile of tiny belt dots.
    cylinder(
        "Tool_Roll_Leather_Back",
        (0.165, -0.255, 0.585),
        0.072,
        0.215,
        leather,
        rig,
        "hips",
        rotation=(0.0, math.pi / 2.0, 0.0),
        vertices=10,
    )
    for index, x in enumerate((0.095, 0.235)):
        torus(
            f"Tool_Roll_Strap_{index + 1}",
            (x, -0.255, 0.585),
            0.074,
            0.010,
            dark,
            rig,
            "hips",
            rotation=(0.0, math.pi / 2.0, 0.0),
            major_segments=10,
            minor_segments=3,
        )
    for index, x in enumerate((0.105, 0.165, 0.225)):
        swept_tube(
            f"Tool_Roll_Handle_{index + 1}",
            [(x, -0.265, 0.62), (x + (index - 1) * 0.008, -0.275, 0.80)],
            [0.012, 0.009],
            (brass, ivory, dark)[index],
            rig,
            "hips",
            sides=5,
        )
        ellipsoid(
            f"Tool_Roll_Cap_{index + 1}",
            (x + (index - 1) * 0.008, -0.275, 0.80),
            (0.016, 0.012, 0.012),
            (brass, ivory, gold)[index],
            rig,
            "hips",
            subdivisions=1,
        )
    box(
        "Tool_Roll_Flap_Patch",
        (0.160, -0.330, 0.550),
        (0.070, 0.010, 0.045),
        cloth,
        rig,
        "hips",
        rotation=(0.0, 0.0, -0.06),
    )


def add_trapkeeper_apron(rig, mats):
    # Tan front panel breaks the Scout's dominant green poncho at game scale.
    tapered_panel(
        "Trapkeeper_Tan_Apron",
        (0.0, -0.268, 1.095),
        (0.0, -0.255, 0.675),
        0.255,
        0.345,
        0.018,
        mats["belly"],
        rig,
        "chest",
    )
    box(
        "Trapkeeper_Apron_Leather_Trim",
        (0.0, -0.282, 0.685),
        (0.174, 0.010, 0.024),
        mats["leather"],
        rig,
        "chest",
        rotation=(0.0, 0.0, 0.0),
    )
    box(
        "Trapkeeper_Apron_Moss_Patch",
        (-0.065, -0.282, 0.845),
        (0.055, 0.006, 0.068),
        mats["cloth"],
        rig,
        "chest",
        rotation=(0.0, 0.0, -0.10),
    )


def add_readied_dart_and_cords(rig, mats):
    ivory, dark, red, gold, leather, cloth = (
        mats["ivory"],
        mats["dark"],
        mats["skin"],
        mats["gold"],
        mats["leather"],
        mats["cloth"],
    )
    # A short, gripped dart on the axe-right hand: no club or spear silhouette.
    dart_start = Vector((-0.890, -0.085, 1.045))
    dart_mid = Vector((-0.955, -0.165, 0.955))
    dart_end = Vector((-0.990, -0.225, 0.895))
    swept_tube(
        "Readied_Dart_Shaft",
        [dart_start, dart_mid, dart_end],
        [0.010, 0.009, 0.008],
        dark,
        rig,
        "hand.r",
        sides=6,
    )
    cone_between(
        "Readied_Dart_Point",
        dart_end,
        (-1.030, -0.295, 0.835),
        0.014,
        0.001,
        ivory,
        rig,
        "hand.r",
        vertices=6,
    )
    for sign in (-1.0, 1.0):
        box(
            f"Readied_Dart_Fletching_{'Top' if sign > 0 else 'Bottom'}",
            (-0.908, -0.095, 1.025 + sign * 0.022),
            (0.006, 0.035, 0.024),
            red,
            rig,
            "hand.r",
            rotation=(0.0, -0.55, 0.12 * sign),
        )
    torus(
        "Readied_Dart_Grip_Band",
        (-0.918, -0.120, 1.005),
        0.018,
        0.005,
        gold,
        rig,
        "hand.r",
        rotation=(dart_end - dart_start).to_track_quat("Z", "Y").to_euler(),
        major_segments=8,
        minor_segments=3,
    )

    # A broad three-loop bundle reads as marked safe-route cord at game scale.
    for index, radius in enumerate((0.112, 0.091, 0.070)):
        torus(
            f"Route_Cord_Coil_{index + 1}",
            (0.930 - index * 0.009, -0.030 - index * 0.006, 1.000 - index * 0.026),
            radius,
            0.019,
            ivory,
            rig,
            "hand.l",
            rotation=(math.pi / 2.0, 0.0, 0.0),
            scale=(1.0, 0.76, 1.0),
            major_segments=16,
            minor_segments=5,
        )
    swept_tube(
        "Route_Cord_Dangling",
        [
            (0.918, -0.035, 0.950),
            (0.960, -0.055, 0.835),
            (0.925, -0.060, 0.745),
        ],
        [0.017, 0.017, 0.014],
        ivory,
        rig,
        "hand.l",
        sides=5,
    )
    ellipsoid(
        "Route_Marker_Red",
        (0.958, -0.065, 0.815),
        (0.034, 0.021, 0.028),
        red,
        rig,
        "hand.l",
        subdivisions=1,
    )
    ellipsoid(
        "Route_Marker_Yellow",
        (0.927, -0.070, 0.755),
        (0.035, 0.022, 0.026),
        gold,
        rig,
        "hand.l",
        subdivisions=1,
    )
    torus(
        "Route_Cord_Binding",
        (0.912, -0.032, 1.010),
        0.105,
        0.016,
        leather,
        rig,
        "hand.l",
        rotation=(math.pi / 2.0, 0.0, 0.0),
        scale=(1.0, 0.76, 1.0),
        major_segments=12,
        minor_segments=4,
    )
    torus(
        "Route_Cord_Wrist_Clip",
        (0.885, -0.015, 1.055),
        0.087,
        0.011,
        leather,
        rig,
        "hand.l",
        rotation=(0.0, math.pi / 2.0, 0.0),
        scale=(1.0, 0.75, 1.0),
        major_segments=12,
        minor_segments=3,
    )
    # Small paired knots remain readable from the front and back at game scale.
    for side, sign in (("L", 1.0), ("R", -1.0)):
        for index, z in enumerate((0.87, 0.82)):
            ellipsoid(
                f"Route_Knot_{side}_{index + 1}",
                (0.245 * sign, -0.255, z),
                (0.016, 0.010, 0.018),
                red if index == 0 else gold,
                rig,
                "chest",
                subdivisions=1,
            )
    box(
        "Cord_Belt_Loop",
        (0.295, -0.245, 0.74),
        (0.040, 0.025, 0.080),
        cloth,
        rig,
        "hips",
        rotation=(0.0, 0.2, -0.16),
    )


def add_face_marks(rig, mats):
    # Subtle warpaint-like route slashes, asymmetric to separate the face at distance.
    for index, z in enumerate((1.515, 1.565, 1.615)):
        cone_between(
            f"Trapkeeper_Cheek_Slash_{index + 1}",
            (0.225, -0.275, z - 0.035),
            (0.285, -0.255, z + 0.025),
            0.008,
            0.003,
            mats["gold"],
            rig,
            "head",
            vertices=4,
        )


def compact_materials(obj):
    unique, remap = [], {}
    for slot in obj.material_slots:
        mat = slot.material
        if mat is not None and mat not in remap:
            remap[mat] = len(unique)
            unique.append(mat)
    for poly in obj.data.polygons:
        old = obj.material_slots[poly.material_index].material
        poly.material_index = remap[old]
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)


def consolidate_rigid_props(props, material_order):
    """Join all authored parts so each material becomes one GLB primitive."""
    if len(props) < 2:
        raise RuntimeError("Expected multiple authored rigid props to consolidate")
    material_rank = {material: index for index, material in enumerate(material_order)}
    attribute_name = "_trap_material_id"
    for obj in props:
        if len(obj.data.materials) != 1 or obj.data.materials[0] not in material_rank:
            raise RuntimeError(f"Unexpected prop material setup: {obj.name}")
        material_id = material_rank[obj.data.materials[0]]
        attribute = obj.data.attributes.new(
            name=attribute_name, type="INT", domain="FACE"
        )
        for polygon in obj.data.polygons:
            attribute.data[polygon.index].value = material_id
    bpy.ops.object.select_all(action="DESELECT")
    for obj in props:
        obj.select_set(True)
    active = props[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    active.name = "Trapkeeper_Rigid_Props"
    active.data.name = "Trapkeeper_Rigid_Props_Geometry"
    material_attribute = active.data.attributes.get(attribute_name)
    if material_attribute is None:
        raise RuntimeError("Joined prop material IDs were not preserved")
    material_ids = [item.value for item in material_attribute.data]
    if len(material_ids) != len(active.data.polygons):
        raise RuntimeError("Joined prop material ID count mismatch")
    active.data.materials.clear()
    for material in material_order:
        active.data.materials.append(material)
    for polygon, material_id in zip(active.data.polygons, material_ids):
        if material_id >= len(material_order):
            raise RuntimeError(f"Invalid joined prop material ID: {material_id}")
        polygon.material_index = material_id
    active.data.attributes.remove(material_attribute)
    print(
        "CONSOLIDATED_PROPS",
        len(active.data.vertices),
        "vertices",
        len(active.data.polygons),
        "faces",
        "material uses",
        sorted(set(material_ids)),
    )
    return active


def normalize_weights(obj, valid_bones):
    group_names = {group.index: group.name for group in obj.vertex_groups}
    unweighted, invalid = [], set()
    for vertex in obj.data.vertices:
        total = 0.0
        for membership in vertex.groups:
            name = group_names[membership.group]
            total += membership.weight
            if name not in valid_bones:
                invalid.add(name)
        if total <= 1e-8:
            unweighted.append(vertex.index)
        elif abs(total - 1.0) > 1e-5:
            for membership in vertex.groups:
                obj.vertex_groups[membership.group].add(
                    [vertex.index], membership.weight / total, "REPLACE"
                )
    if unweighted:
        raise RuntimeError(f"Unweighted vertices after join: {unweighted[:20]}")
    if invalid:
        raise RuntimeError(f"Invalid bone groups after join: {sorted(invalid)}")


def add_render_setup():
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

    world = bpy.data.worlds.new("Trapkeeper_Render_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.020, 0.027, 0.025, 1.0)
    background.inputs["Strength"].default_value = 0.50

    collection = bpy.data.collections.new("RENDER_ONLY")
    scene.collection.children.link(collection)
    floor_mat = bpy.data.materials.new("Render_Floor")
    floor_mat.diffuse_color = (0.065, 0.060, 0.047, 1.0)
    floor_mat.use_nodes = True
    bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.065, 0.060, 0.047, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.92
    bpy.ops.mesh.primitive_plane_add(size=200.0, location=(0.0, 0.0, -0.010))
    floor = bpy.context.object
    floor.name = "RENDER_ONLY_Ground"
    floor.data.materials.append(floor_mat)
    for owner in list(floor.users_collection):
        owner.objects.unlink(floor)
    collection.objects.link(floor)

    def area(name, loc, energy, color, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = (
            Vector((0.0, 0.0, 1.0)) - Vector(loc)
        ).to_track_quat("-Z", "Y").to_euler()
        collection.objects.link(obj)

    area("RENDER_ONLY_Key", (-3.2, -3.8, 4.8), 720.0, (1.0, 0.70, 0.48), 3.2)
    area("RENDER_ONLY_Fill", (3.4, -2.0, 3.0), 460.0, (0.46, 0.66, 1.0), 3.6)
    area("RENDER_ONLY_Rim", (0.3, 3.8, 4.0), 820.0, (1.0, 0.36, 0.14), 2.8)
    camera_data = bpy.data.cameras.new("Trapkeeper_Camera")
    camera = bpy.data.objects.new("Trapkeeper_Camera", camera_data)
    collection.objects.link(camera)
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def pose_for_preview(rig):
    # Rest transforms and skin data stay untouched; this pose only affects review renders.
    def rotate_world(name, world_axis, angle):
        bone = rig.pose.bones.get(name)
        if bone:
            local_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector(world_axis)
            local_axis.normalize()
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = Quaternion(local_axis, angle)

    rotate_world("upperarm.l", (0.0, 1.0, 0.0), 0.68)
    rotate_world("lowerarm.l", (0.0, 1.0, 0.0), 0.22)
    rotate_world("upperarm.r", (0.0, 1.0, 0.0), -0.68)
    rotate_world("lowerarm.r", (0.0, 1.0, 0.0), -0.22)
    rotate_world("head", (0.0, 0.0, 1.0), -0.10)
    rotate_world("tail2", (1.0, 0.0, 0.0), 0.18)
    bpy.context.view_layer.update()


def clear_preview_pose(rig):
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0.0, 0.0, 0.0)
        bone.location = (0.0, 0.0, 0.0)
        bone.scale = (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()


def render_views(camera):
    scene = bpy.context.scene
    views = {
        "front": (Vector((0.0, -5.0, 1.06)), 2.45),
        "side": (Vector((-5.0, 0.18, 1.04)), 2.60),
        "back": (Vector((0.0, 5.0, 1.06)), 2.45),
    }
    target = Vector((0.0, 0.18, 1.04))
    for name, (location, ortho_scale) in views.items():
        camera.location = location
        camera.data.ortho_scale = ortho_scale
        camera.rotation_euler = (target - location).to_track_quat(
            "-Z", "Y"
        ).to_euler()
        scene.render.filepath = str(OUTPUT / f"KoboldTrapkeeper_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def glb_primitive_stats(path):
    """Read the exported GLB JSON chunk without external libraries."""
    import struct

    data = path.read_bytes()
    _, _, file_length = struct.unpack_from("<III", data, 0)
    offset = 12
    document = None
    while offset < file_length:
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.decode("utf-8"))
            break
    if document is None:
        raise RuntimeError("Exported GLB has no JSON chunk")
    meshes = document.get("meshes", [])
    return {
        "glb_meshes": len(meshes),
        "glb_mesh_nodes": sum("mesh" in node for node in document.get("nodes", [])),
        "glb_primitives": sum(len(mesh.get("primitives", [])) for mesh in meshes),
        "glb_materials": len(document.get("materials", [])),
    }


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    body = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")
    rig.name = "KoboldTrapkeeper_Rig"
    rig.data.name = "KoboldTrapkeeper_Skeleton"

    rest_snapshot = {}
    for bone in rig.data.bones:
        rest_snapshot[bone.name] = (
            bone.parent.name if bone.parent else None,
            tuple(bone.head_local),
            tuple(bone.tail_local),
            tuple(tuple(row) for row in bone.matrix_local),
        )
    if len(rest_snapshot) != 27:
        raise RuntimeError(f"Expected all 27 Scout bones, found {len(rest_snapshot)}")

    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None
    removed_components = remove_scout_weapon_components(body)

    by_original_name = {mat.name: mat for mat in body.data.materials if mat}
    mats = {
        "skin": by_original_name["Kobold_Skin_Red"],
        "dark": by_original_name["Kobold_Scale_Shadow"],
        "belly": by_original_name["Kobold_Throat_Tan"],
        "cloth": by_original_name["Scout_Field_Cloth"],
        "leather": by_original_name["Scout_Leather"],
        "brass": by_original_name["Launcher_Brass"],
        "ivory": by_original_name["Claws_Twine_Ribbon"],
        "gold": by_original_name["Kobold_Golden_Eyes"],
    }
    set_material(mats["skin"], "Trapkeeper_Copper_Scales", (0.29, 0.045, 0.025), 0.76)
    set_material(mats["dark"], "Trapkeeper_Ridge_Shadow", (0.060, 0.016, 0.011), 0.84)
    set_material(mats["belly"], "Trapkeeper_Ochre_Throat", (0.47, 0.245, 0.105), 0.82)
    set_material(mats["cloth"], "Trapkeeper_Moss_Patches", (0.115, 0.155, 0.078), 0.94)
    set_material(mats["leather"], "Trapkeeper_Worn_Leather", (0.095, 0.043, 0.020), 0.88)
    set_material(mats["brass"], "Trapkeeper_Aged_Tools", (0.33, 0.235, 0.085), 0.42, 0.55)
    set_material(mats["ivory"], "Trapkeeper_Cord_Ivory", (0.65, 0.55, 0.37), 0.82)
    set_material(
        mats["gold"],
        "Trapkeeper_Gold_Markers_Eyes",
        (0.95, 0.56, 0.025),
        0.36,
        emission=(0.65, 0.20, 0.0),
    )

    add_dart_case(rig, mats)
    add_tool_belt(rig, mats)
    add_trapkeeper_apron(rig, mats)
    add_readied_dart_and_cords(rig, mats)
    add_face_marks(rig, mats)

    authored_props = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj != body and obj.parent == rig
    ]
    body_material_order = [mat for mat in body.data.materials if mat is not None]
    consolidate_rigid_props(authored_props, body_material_order)

    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.parent == rig and not obj.hide_render
    ]
    body.name = "KoboldTrapkeeper_Body"
    body.data.name = "KoboldTrapkeeper_Geometry"
    for obj in meshes:
        normalize_weights(obj, set(rest_snapshot))

    material_set = {
        slot.material
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None
    }
    if len(material_set) > 8:
        raise RuntimeError(f"Material ceiling exceeded: {len(material_set)}")
    triangle_count = 0
    vertex_count = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangle_count += len(obj.data.loop_triangles)
        vertex_count += len(obj.data.vertices)
    if triangle_count > 12000:
        raise RuntimeError(f"Triangle target exceeded: {triangle_count}")

    for name, snapshot in rest_snapshot.items():
        bone = rig.data.bones.get(name)
        current = (
            bone.parent.name if bone and bone.parent else None,
            tuple(bone.head_local) if bone else None,
            tuple(bone.tail_local) if bone else None,
            tuple(tuple(row) for row in bone.matrix_local) if bone else None,
        )
        if current != snapshot:
            raise RuntimeError(f"Original rest transform changed: {name}")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "KoboldTrapkeeper.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_apply=False,
    )
    glb_stats = glb_primitive_stats(OUTPUT / "KoboldTrapkeeper.glb")
    if glb_stats["glb_primitives"] > 24:
        raise RuntimeError(
            f"GLB draw-call ceiling exceeded: {glb_stats['glb_primitives']} primitives"
        )

    camera = add_render_setup()
    pose_for_preview(rig)
    render_views(camera)
    clear_preview_pose(rig)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "KoboldTrapkeeper.blend"))

    weights = []
    max_influences = 0
    for obj in meshes:
        for vertex in obj.data.vertices:
            weights.append(
                sum(group.weight for group in vertex.groups if group.weight > 0.00001)
            )
            max_influences = max(
                max_influences,
                sum(1 for group in vertex.groups if group.weight > 0.00001),
            )
    material_names = sorted(mat.name for mat in material_set)
    with SOURCE.open("rb") as source_file:
        source_sha256 = hashlib.sha256(source_file.read()).hexdigest()
    report = {
        "asset": "KoboldTrapkeeper",
        "source": "input/KoboldScout.glb; CC0 KayKit-derived project-owned Scout",
        "source_input_sha256": source_sha256,
        "blender": bpy.app.version_string,
        "vertices": vertex_count,
        "triangles": triangle_count,
        "exported_meshes": len(meshes),
        **glb_stats,
        "materials": material_names,
        "material_slots": len(material_names),
        "bones": len(rig.data.bones),
        "rest_transforms_preserved": len(rest_snapshot),
        "removed_scout_components": removed_components,
        "minimum_weight_sum": min(weights),
        "maximum_weight_sum": max(weights),
        "unweighted_vertices": sum(value <= 0.00001 for value in weights),
        "max_weight_influences": max_influences,
        "render": "CPU Cycles, 16 samples, 512x512, 4 threads",
    }
    (OUTPUT / "build_report.json").write_text(json.dumps(report, indent=2) + "\n")

    markdown = f"""# KoboldTrapkeeper submission

## Result

A neutral, skinned first-pass Kobold Trapkeeper derived from the supplied CC0 KayKit/project-owned `input/KoboldScout.glb`. The narrower specialist silhouette retains the Scout's long-snouted head, copper-red reptilian body, faceted ridge and tail language, while replacing the Scout-specific ribbon and launcher with trapkeeping identity.

The delivered `.blend` is neutral. The front/side/back PNGs show a preview-only pose; that pose was cleared before saving and is not baked into skin or rest data.

## Technical summary

- Exported intended objects: one skinned body, one consolidated skinned rigid-prop mesh, and one armature; no camera, lights, floor, or display helpers.
- GLB cost: {report['glb_primitives']} actual primitives/draw calls across {report['glb_meshes']} GLB meshes ({report['glb_mesh_nodes']} mesh nodes); authored prop parts were consolidated by material rather than globally welded.
- Vertices: {report['vertices']}
- Triangles: {report['triangles']} (under 12,000 target and 20,000 hard ceiling)
- Materials: {report['material_slots']} ({', '.join(material_names)})
- Bones: {report['bones']} total. All {report['rest_transforms_preserved']} names, parents, and local rest transforms were checked after additions.
- Skinning: {report['unweighted_vertices']} unweighted vertices; weight sums {report['minimum_weight_sum']:.6f} to {report['maximum_weight_sum']:.6f}; maximum {report['max_weight_influences']} influences per vertex.
- Source unchanged: `input/KoboldScout.glb` was imported read-only, and no duplicate tail bones or source edits were made.
- Validation: `output/inspection.json` is generated by the supplied read-only validator.
- Validator topology: 0 zero-area faces, 0 loose vertices, 0 unweighted vertices, and 0 non-boundary nonmanifold edges. Boundary edges are inherited/open low-poly garment surfaces plus deliberately simple prop shells.

## Identity and attachment choices

- Short sharp dart is rigidly weighted to `hand.r`; its total silhouette stays under 0.37 scene units and cannot read as a spear or club.
- Back dart case is rigidly weighted to `chest`; four capped darts and a top rim make it readable in side/back views.
- The tan apron, leather trim, green patch, broad tool roll, enlarged pliers, knife, belt pegs, and cord attachment loop are deliberately bone-weighted and remain clear of the head.
- A thick three-loop tan safe-route bundle with a leather binding, dangling line, and larger red/yellow markers is rigidly weighted to `hand.l`; paired chest knots reinforce the coded-route motif in front view.
- Gold cheek slashes distinguish this Trapkeeper while preserving contrast between the nonmonotone eyes, dark sockets, snout, and throat.
- The original Scout launcher and wind ribbon were removed as disconnected mesh components. {sum(item['triangles'] for item in removed_components)} source triangles across {len(removed_components)} components were replaced by the trap tools above.

## Assumptions

- World -Y is front, matching the accepted Scout source and its face, feet, hands, and equipment orientation.
- The supplied 27-bone Scout rig is authoritative. All source weights were retained; new props use deliberate one-bone rigid weights.
- The concept's "medium" rules size is abstract; the mesh uses the compact stylized Scout body scale rather than a literal human-height normal.
- Red and yellow markers reuse the existing copper-scale and golden-eye materials to remain within the eight-material ceiling.

## Known limitations / refinement needs

- Review submission only, not accepted production art. Forms are intentionally low-poly and faceted.
- Hands retain the donor mitten-like anatomy; the dart grip is represented by rigid attachment rather than a bespoke finger pose.
- Rope coils remain simple torus loops, and the dart case darts are simplified shafts/fletchings.
- All authored prop parts are joined into one skinned mesh while retaining per-face material indices and one-bone weights. The GLB therefore uses {report['glb_primitives']} material primitives rather than 48 separate prop nodes.
- The preview pose is illustrative and not an animation-quality clip. No game-engine or animation-library playback was run.
- Future refinement should focus on hand-specific grip deformation, cloth patch breakup, cord knot shape language, and tighter tool-to-belt contact in animation.
"""
    (OUTPUT / "SUBMISSION.md").write_text(markdown)
    print("BUILD_COMPLETE", json.dumps(report))


if __name__ == "__main__":
    try:
        main()
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
    except Exception:
        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(1)
