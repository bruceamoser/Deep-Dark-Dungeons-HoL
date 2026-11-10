"""Build the Hobgoblin Marshal review submission.

Run from the repository root:
    blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/hobgoblin-marshal.py

The supplied Ninja armature is imported read-only. All visible character,
clothing, board, and saber geometry is original procedural geometry in this
script. Exported characterization data contains only the rig and three meshes.
"""

import math
import os
import sys
import traceback
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/hobgoblin-marshal"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
OUT.mkdir(parents=True, exist_ok=True)

EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}


def material(name, color, roughness, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1.0)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    if emission:
        node.inputs["Emission Color"].default_value = (*emission, 1.0)
        node.inputs["Emission Strength"].default_value = 1.5
    return mat


def clean_start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    if not SOURCE_RIG.exists():
        raise FileNotFoundError(SOURCE_RIG)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))
    rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    rig.name = "Rig_Medium"
    rig.data.name = "Rig_Medium"
    actual = {b.name for b in rig.data.bones}
    if actual != EXPECTED_BONES:
        raise RuntimeError(f"Donor rig mismatch: {sorted(actual ^ EXPECTED_BONES)}")
    # Preserve the donor armature exactly; visible character geometry is authored.
    for obj in list(bpy.data.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)
    for bone in rig.pose.bones:
        bone.custom_shape = None
    return rig


RIG = clean_start()

SKIN = material("Hobgoblin_Skin", (0.34, 0.105, 0.052), 0.78)
CLOTH = material("Marshal_Green_Wool", (0.055, 0.125, 0.075), 0.96)
STEEL = material("Helmet_Armor_Steel", (0.31, 0.345, 0.335), 0.27, 0.80)
LEATHER = material("Boots_Belt_Board_Wood", (0.145, 0.070, 0.030), 0.83)
PARCHMENT = material("Map_Parchment", (0.58, 0.43, 0.225), 0.92)
INK = material("Mouth_Pupil_Map_Ink", (0.018, 0.016, 0.012), 0.94)
EYE = material("Hobgoblin_Amber_Eyes", (0.82, 0.30, 0.035), 0.30, emission=(0.55, 0.075, 0.004))

BODY_PARTS = []


def bind(obj, bone_name):
    if bone_name not in RIG.data.bones:
        raise ValueError(f"Missing intended bone {bone_name}")
    obj.parent = RIG
    obj.matrix_parent_inverse = RIG.matrix_world.inverted()
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    mod = obj.modifiers.new(name="Armature", type="ARMATURE")
    mod.object = RIG
    mod.use_vertex_groups = True
    return obj


def finish_primitive(obj, name, mat, bone):
    obj.name = name
    obj.data.name = name + "_Mesh"
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    bind(obj, bone)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    BODY_PARTS.append(obj)
    return obj


def ico(name, loc, scale, mat, bone, subdiv=1, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1.0, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.scale = scale
    return finish_primitive(obj, name, mat, bone)


def box(name, loc, dims, mat, bone, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Hard_Edge_Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish_primitive(obj, name, mat, bone)


def cone(name, p1, p2, radius1, radius2, mat, bone, vertices=8, lateral_scale=1.0):
    p1 = Vector(p1)
    p2 = Vector(p2)
    axis = p2 - p1
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=axis.length,
        location=(p1 + p2) * 0.5,
    )
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(axis.normalized())
    obj.scale.y = lateral_scale
    return finish_primitive(obj, name, mat, bone)


def poly_prism(name, points_xz, y_front, y_back, mat, bone):
    """Low-poly extruded plate from a counter-clockwise X/Z outline."""
    n = len(points_xz)
    verts = [(x, y_front, z) for x, z in points_xz]
    verts += [(x, y_back, z) for x, z in points_xz]
    faces = [tuple(range(n)), tuple(reversed(range(n, n * 2)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bind(obj, bone)
    BODY_PARTS.append(obj)
    return obj


def saber_blade(name, stations, mat, bone):
    """Tapered one-edged blade extruded about a gently curved centerline."""
    verts = []
    for y, z, half_width, half_height in stations:
        verts.extend((
            (-0.84 - half_width, y, z - half_height),
            (-0.84 + half_width, y, z - half_height),
            (-0.84 + half_width, y, z + half_height),
            (-0.84 - half_width, y, z + half_height),
        ))
    faces = []
    for i in range(len(stations) - 1):
        a = i * 4
        b = (i + 1) * 4
        for j in range(4):
            k = (j + 1) % 4
            faces.append((a + j, a + k, b + k, b + j))
    faces.append((3, 2, 1, 0))
    end = (len(stations) - 1) * 4
    faces.append((end, end + 1, end + 2, end + 3))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bind(obj, bone)
    BODY_PARTS.append(obj)
    return obj


def saber_blade_x(name, stations, mat, bone):
    """Tapered saber blade extending from the right fist along the hand axis."""
    verts = []
    for x, z, half_depth, half_height in stations:
        verts.extend((
            (x, -half_depth, z - half_height),
            (x, half_depth, z - half_height),
            (x, half_depth, z + half_height),
            (x, -half_depth, z + half_height),
        ))
    faces = []
    for i in range(len(stations) - 1):
        a = i * 4
        b = (i + 1) * 4
        for j in range(4):
            k = (j + 1) % 4
            faces.append((a + j, a + k, b + k, b + j))
    faces.append((0, 1, 2, 3))
    end = (len(stations) - 1) * 4
    faces.append((end + 3, end + 2, end + 1, end))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bind(obj, bone)
    BODY_PARTS.append(obj)
    return obj


def segment(name, a, b, width, thick, mat, bone):
    """Flat map-stroke segment on the board's front plane."""
    a, b = Vector(a), Vector(b)
    length = math.hypot(b.x - a.x, b.y - a.y)
    angle = math.atan2(b.y - a.y, b.x - a.x)
    return box(
        name,
        ((a.x + b.x) * 0.5, -0.405, (a.y + b.y) * 0.5),
        (length, thick, width),
        mat,
        bone,
        rot=(0, angle, 0),
    )


# Soft under-layers establish a proud military torso and avoid a bare silhouette.
ico("Neck", (0, 0.005, 1.355), (0.115, 0.105, 0.145), SKIN, "head", subdiv=1)
ico("Gambeson_Torso", (0, 0.005, 1.015), (0.315, 0.235, 0.295), CLOTH, "chest", subdiv=2)
ico("Gambeson_Belly", (0, 0.01, 0.795), (0.285, 0.215, 0.225), CLOTH, "spine", subdiv=1)
ico("Pelvis", (0, 0.012, 0.625), (0.275, 0.205, 0.165), LEATHER, "hips", subdiv=1)

# Layered steel cuirass: four readable horizontal lames, broad at the chest.
for i, (z, w, h) in enumerate(((1.225, 0.48, 0.095), (1.125, 0.52, 0.105),
                                (1.020, 0.48, 0.105), (0.925, 0.43, 0.095))):
    box(f"Cuirass_Lame_{i}", (0, -0.225, z), (w, 0.075, h), STEEL, "chest", bevel=0.018)
box("Cuirass_Center_Ridge", (0, -0.272, 1.07), (0.055, 0.035, 0.34), STEEL, "chest", bevel=0.008)
box("Belt", (0, -0.03, 0.705), (0.57, 0.36, 0.070), LEATHER, "hips", bevel=0.012)
box("Belt_Buckle", (0, -0.225, 0.705), (0.105, 0.035, 0.078), STEEL, "hips", bevel=0.008)

# Green split tabard; separate front and rear flaps are each rigidly weighted.
poly_prism("Tabard_Front_L", [(0.015, 0.78), (0.275, 0.76), (0.25, 0.39),
                              (0.16, 0.33), (0.045, 0.43)],
           -0.227, -0.188, CLOTH, "hips")
poly_prism("Tabard_Front_R", [(-0.015, 0.78), (-0.275, 0.76), (-0.25, 0.39),
                              (-0.16, 0.33), (-0.045, 0.43)],
           -0.227, -0.188, CLOTH, "hips")
poly_prism("Tabard_Back", [(-0.25, 0.76), (0.25, 0.76), (0.23, 0.42),
                           (0.08, 0.48), (0, 0.36), (-0.08, 0.48), (-0.23, 0.42)],
           0.17, 0.205, CLOTH, "hips")
box("Fauld_Center", (0, -0.250, 0.715), (.225, .052, .095),
    STEEL, "hips", bevel=.010)
poly_prism("Tasset_L", [(.100, .705), (.365, .695), (.335, .505),
                        (.230, .440), (.115, .495)],
           -0.255, -0.205, STEEL, "hips")
poly_prism("Tasset_R", [(-.100, .705), (-.365, .695), (-.335, .505),
                        (-.230, .440), (-.115, .495)],
           -0.255, -0.205, STEEL, "hips")

# Split shoulder mantle and long open-backed cloak panels.
poly_prism("Mantle_L", [(0.02, 1.355), (0.34, 1.32), (0.39, 1.19),
                        (0.22, 1.12), (0.02, 1.19)],
           -0.19, 0.17, CLOTH, "chest")
poly_prism("Mantle_R", [(-0.02, 1.355), (-0.34, 1.32), (-0.39, 1.19),
                        (-0.22, 1.12), (-0.02, 1.19)],
           -0.19, 0.17, CLOTH, "chest")
poly_prism("Cloak_Upper_L", [(0.02, 1.30), (0.34, 1.25), (0.39, 0.83),
                             (0.24, 0.79), (0.08, 0.97)],
           0.155, 0.205, CLOTH, "chest")
poly_prism("Cloak_Upper_R", [(-0.02, 1.30), (-0.34, 1.25), (-0.39, 0.83),
                             (-0.24, 0.79), (-0.08, 0.97)],
           0.155, 0.205, CLOTH, "chest")
poly_prism("Cloak_Tail_L", [(0.08, 0.89), (0.36, 0.85), (0.31, 0.49),
                            (0.20, 0.35), (0.12, 0.50)],
           0.16, 0.22, CLOTH, "spine")
poly_prism("Cloak_Tail_R", [(-0.08, 0.89), (-0.36, 0.85), (-0.31, 0.49),
                            (-0.20, 0.35), (-0.12, 0.50)],
           0.16, 0.22, CLOTH, "spine")

# Angular head, jaw, nose, pointed ears, stern brows and mouth.
ico("Head", (0, -0.018, 1.575), (0.205, 0.175, 0.245), SKIN, "head", subdiv=2)
poly_prism("Jaw", [(-0.19, 1.59), (0.19, 1.59), (0.13, 1.43),
                   (0.025, 1.405), (-0.12, 1.435)],
           -0.185, 0.10, SKIN, "head")
poly_prism("Ear_L", [(0.16, 1.64), (0.37, 1.71), (0.25, 1.54)],
           -0.025, 0.045, SKIN, "head")
poly_prism("Ear_R", [(-0.16, 1.64), (-0.37, 1.71), (-0.25, 1.54)],
           -0.025, 0.045, SKIN, "head")
poly_prism("Ear_Inner_L", [(0.235, 1.65), (0.315, 1.685), (0.252, 1.59)],
           -0.034, -0.022, INK, "head")
poly_prism("Ear_Inner_R", [(-0.235, 1.65), (-0.315, 1.685), (-0.252, 1.59)],
           -0.034, -0.022, INK, "head")
poly_prism("Nose", [(-0.047, 1.625), (0.047, 1.625), (0.062, 1.525), (0, 1.495)],
           -0.236, -0.176, SKIN, "head")
box("Brow_L", (0.088, -0.185, 1.64), (0.125, 0.033, 0.030), INK, "head",
    rot=(0, 0.16, -0.12))
box("Brow_R", (-0.088, -0.185, 1.64), (0.125, 0.033, 0.030), INK, "head",
    rot=(0, -0.16, 0.12))
ico("Eye_L", (0.085, -0.192, 1.605), (0.043, 0.018, 0.023), EYE, "head")
ico("Eye_R", (-0.085, -0.192, 1.605), (0.043, 0.018, 0.023), EYE, "head")
ico("Pupil_L", (0.085, -0.208, 1.603), (0.011, 0.006, 0.018), INK, "head")
ico("Pupil_R", (-0.085, -0.208, 1.603), (0.011, 0.006, 0.018), INK, "head")
box("Mouth", (0, -0.190, 1.49), (0.13, 0.014, 0.019), INK, "head", rot=(0, 0, 0.025))
box("Chin_Scar", (-0.083, -0.176, 1.455), (0.014, 0.015, 0.070), INK, "head",
    rot=(0, -0.22, 0))

# Plain undecorated helmet: rounded conical shell, reinforcing front ridge,
# brow band, limited cheek plates, and nasal bar.
cone("Helmet_Dome", (0, 0.005, 1.705), (0, 0.005, 1.930),
     .255, .025, STEEL, "head", vertices=12, lateral_scale=.88)
box("Helmet_Front_Ridge", (0, -0.202, 1.805), (.045, .030, .205),
    STEEL, "head", bevel=.005, rot=(-0.22, 0, 0))
box("Helmet_Brow_Band", (0, -0.205, 1.715), (.50, .062, .066), STEEL, "head", bevel=.012)
box("Helmet_Nasal", (0, -0.226, 1.655), (0.055, 0.050, 0.175), STEEL, "head", bevel=0.008)
poly_prism("Helmet_Cheek_L", [(0.16, 1.71), (0.25, 1.68), (0.20, 1.52), (0.135, 1.56)],
           -0.205, -0.145, STEEL, "head")
poly_prism("Helmet_Cheek_R", [(-0.16, 1.71), (-0.25, 1.68), (-0.20, 1.52), (-0.135, 1.56)],
           -0.205, -0.145, STEEL, "head")

# Arms: pauldrons and bracers stay with their limbs in the rest T-pose.
for side, sx in (("l", 1), ("r", -1)):
    upper = f"upperarm.{side}"
    lower = f"lowerarm.{side}"
    hand = f"hand.{side}"
    cone(f"Upper_Sleeve_{side}", (sx * .245, 0, 1.11), (sx * .455, 0.012, 1.11),
         .125, .095, CLOTH, upper)
    ico(f"Pauldron_{side}", (sx * .285, -0.005, 1.12), (.145, .17, .13),
        STEEL, upper, subdiv=1, rot=(0, sx * .25, 0))
    box(f"Pauldron_Rim_{side}", (sx * .33, -0.005, 1.075), (.17, .27, .045),
        STEEL, upper, bevel=.012)
    ico(f"Pauldron_Cap_{side}", (sx * .325, -0.120, 1.145), (.165, .155, .090),
        STEEL, upper, subdiv=1, rot=(0, sx * .18, 0))
    box(f"Pauldron_Lame_{side}", (sx * .335, -0.105, 1.075), (.215, .220, .062),
        STEEL, upper, bevel=.012)
    cone(f"Bracer_{side}", (sx * .475, 0.012, 1.107), (sx * .735, 0, 1.107),
         .098, .075, STEEL, lower, vertices=8)
    ico(f"Glove_{side}", (sx * .81, -0.005, 1.102), (.105, .080, .082),
        LEATHER, hand, subdiv=1)
    box(f"Glove_Cuff_{side}", (sx * .75, 0, 1.107), (.085, .18, .16),
        LEATHER, hand, bevel=.012)

# Legs: leather under-layer, steel knees/greaves, broad practical field boots.
for side, sx in (("l", 1), ("r", -1)):
    upper = f"upperleg.{side}"
    lower = f"lowerleg.{side}"
    foot = f"foot.{side}"
    cone(f"Thigh_{side}", (sx * .175, 0, .535), (sx * .175, -0.005, .30),
         .125, .105, CLOTH, upper, vertices=8)
    box(f"Thigh_Plate_{side}", (sx * .175, -0.105, .43), (.18, .075, .225),
        STEEL, upper, bevel=.014)
    poly_prism(f"Thigh_Front_Plate_{side}",
               [(sx * .105, .515), (sx * .285, .505), (sx * .265, .355),
                (sx * .185, .305), (sx * .105, .355)],
               -0.248, -0.212, STEEL, upper)
    ico(f"Knee_{side}", (sx * .175, -0.055, .305), (.105, .080, .095),
        STEEL, lower, subdiv=1)
    cone(f"Shin_{side}", (sx * .175, 0, .29), (sx * .175, 0.005, .115),
         .095, .078, LEATHER, lower, vertices=8)
    box(f"Greave_{side}", (sx * .175, -0.075, .195), (.16, .07, .25),
        STEEL, lower, bevel=.012)
    box(f"Boot_Shaft_{side}", (sx * .175, 0.01, .13), (.19, .19, .20),
        LEATHER, foot, bevel=.018)
    box(f"Boot_Foot_{side}", (sx * .175, -0.095, .055), (.205, .33, .11),
        LEATHER, foot, bevel=.022)
    box(f"Toe_Cap_{side}", (sx * .175, -0.245, .045), (.19, .105, .075),
        STEEL, f"toes.{side}", bevel=.018)


def join_parts(parts, object_name, asset_name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = object_name
    obj.data.name = object_name
    for mod in list(obj.modifiers):
        if mod.type == "ARMATURE":
            obj.modifiers.remove(mod)
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = RIG
    obj.parent = RIG
    obj.matrix_parent_inverse = RIG.matrix_world.inverted()
    obj["asset"] = asset_name
    obj["geometry_source"] = "Original procedural geometry by build.py"
    obj["rig_source"] = "CC0 KayKit Ninja.glb armature (23 bones preserved)"
    obj["submission_status"] = "review draft"
    return obj


BODY = join_parts(BODY_PARTS, "HobgoblinMarshal_Body", "HobgoblinMarshal")

# Rigid map board. The hand grips the outer edge of the frame.
BOARD_PARTS = []
BODY_PARTS = []
board_center_x = 0.535
box("MapBoard_Parchment", (board_center_x, -0.31, 1.135), (.510, .035, .585),
    PARCHMENT, "hand.l", bevel=.008)
box("MapBoard_Frame_Top", (board_center_x, -0.315, 1.44), (.585, .075, .055),
    LEATHER, "hand.l", bevel=.009)
box("MapBoard_Frame_Bottom", (board_center_x, -0.315, 0.83), (.585, .075, .055),
    LEATHER, "hand.l", bevel=.009)
box("MapBoard_Frame_Left", (board_center_x - .27, -0.315, 1.135), (.055, .075, .595),
    LEATHER, "hand.l", bevel=.009)
box("MapBoard_Frame_Right", (board_center_x + .27, -0.315, 1.135), (.055, .075, .595),
    LEATHER, "hand.l", bevel=.009)
# River and route are raised geometry, legible without an external texture.
for i, pts in enumerate((
    ((.30, 1.39), (.36, 1.30), (.34, 1.20), (.43, 1.04), (.42, .90)),
    ((.58, 1.35), (.55, 1.25), (.66, 1.17), (.62, 1.05), (.76, .94)),
)):
    for j, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
        segment(f"Map_River_{i}_{j}", a, b, .010, .012, INK, "hand.l")
for i, pts in enumerate((
    ((.36, 1.34), (.47, 1.27), (.45, 1.14), (.55, 1.02), (.51, .90)),
    ((.68, 1.38), (.60, 1.31), (.69, 1.22), (.70, 1.10), (.58, .96)),
)):
    for j, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
        segment(f"Map_Route_{i}_{j}", a, b, .020, .015, CLOTH, "hand.l")
for i, (x, z) in enumerate(((.28, 1.10), (.51, 1.16), (.72, 1.05), (.45, .88))):
    ico(f"Map_Road_Node_{i}", (x, -0.413, z), (.018, .010, .018),
        LEATHER, "hand.l")
BOARD_PARTS = BODY_PARTS
BOARD = join_parts(BOARD_PARTS, "MapBoard", "MapBoard")

# Modest command saber: leather grip in the right hand, steel guard and blade.
BLADE_PARTS = []
BODY_PARTS = []
box("MarshalBlade_Grip", (-0.840, 0, 1.107), (.165, .050, .050), LEATHER, "hand.r",
    bevel=.009)
box("MarshalBlade_Guard", (-0.948, 0, 1.107), (.036, .205, .038), STEEL, "hand.r",
    bevel=.006)
box("MarshalBlade_Pommel", (-0.748, 0, 1.107), (.045, .060, .060), STEEL, "hand.r",
    bevel=.008)
# The blade follows the donor right-hand swing axis (-X) with a modest upward
# curve and taper. Its neutral cutting length is about 0.57 units.
saber_blade_x(
    "MarshalBlade_Blade",
    (
        (-0.968, 1.108, .014, .022),
        (-1.255, 1.110, .020, .024),
        (-1.430, 1.124, .015, .019),
        (-1.535, 1.150, .002, .003),
    ),
    STEEL,
    "hand.r",
)
BLADE_PARTS = BODY_PARTS
BLADE = join_parts(BLADE_PARTS, "MarshalBlade", "MarshalBlade")


def audit_weights(obj):
    names = {g.index: g.name for g in obj.vertex_groups}
    bad = 0
    influences_max = 0
    for v in obj.data.vertices:
        influences = [(names[g.group], g.weight) for g in v.groups if g.weight > 1e-6]
        influences_max = max(influences_max, len(influences))
        if not influences or abs(sum(w for _, w in influences) - 1.0) > 1e-5:
            bad += 1
    if bad:
        raise RuntimeError(f"{obj.name}: {bad} invalid weight vertices")
    return influences_max


influence_summary = {o.name: audit_weights(o) for o in (BODY, BOARD, BLADE)}
for obj in (BODY, BOARD, BLADE):
    obj.data.calc_loop_triangles()
triangles = sum(len(o.data.loop_triangles) for o in (BODY, BOARD, BLADE))
if triangles >= 12000:
    raise RuntimeError(f"Triangle budget exceeded: {triangles}")
if len({m for o in (BODY, BOARD, BLADE) for m in o.data.materials}) > 8:
    raise RuntimeError("Material budget exceeded")

RIG["asset"] = "HobgoblinMarshal"
RIG["rig_source"] = "CC0 KayKit Ninja.glb (23 bones preserved exactly)"
RIG["geometry_source"] = "Original procedural geometry by build.py"
RIG["submission_status"] = "review draft"
bpy.context.scene["asset"] = "HobgoblinMarshal"
bpy.context.scene["submission_status"] = "review draft"
bpy.context.scene.render.fps = 30

# Save and export only the intended rig and three authored meshes.
bpy.ops.object.select_all(action="DESELECT")
for obj in (BODY, BOARD, BLADE, RIG):
    obj.select_set(True)
bpy.context.view_layer.objects.active = RIG
blend_path = OUT / "HobgoblinMarshal.blend"
glb_path = OUT / "HobgoblinMarshal.glb"
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


def aim_bone(name, direction):
    bpy.context.view_layer.update()
    pb = RIG.pose.bones[name]
    head = pb.head.copy()
    direction = Vector(direction).normalized()
    rot = Vector((0, 1, 0)).rotation_difference(direction)
    pb.matrix = Matrix.Translation(head) @ rot.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def review_scene():
    scene = bpy.context.scene
    # Render-only pose; the saved/exported asset above remains in neutral T-pose.
    # Keep the left hand at its donor rest orientation so the map's front face
    # remains legible in review; the board itself is nevertheless hand-bound.
    aim_bone("upperarm.r", (-0.64, -0.20, -0.74))
    aim_bone("lowerarm.r", (-0.35, -0.72, 0.30))
    aim_bone("wrist.r", (-0.48, -0.86, 0.04))

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
    scene.view_settings.exposure = -0.25

    world = bpy.data.worlds.new("Review_World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.045, 0.055, 0.050, 1)
    bg.inputs["Strength"].default_value = 0.32

    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.006))
    ground = bpy.context.object
    ground.name = "REVIEW_ONLY_Ground"
    gm = material("REVIEW_ONLY_Ground_Mat", (0.055, 0.065, 0.055), 0.95)
    ground.data.materials.append(gm)

    def area(name, loc, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        look_at(obj, (0, 0, 0.93))

    area("REVIEW_ONLY_Key", (-2.6, -3.6, 4.4), 390, 3.0, (1.0, 0.72, 0.48))
    area("REVIEW_ONLY_Fill", (3.1, -2.2, 2.8), 230, 2.6, (0.50, 0.70, 1.0))
    area("REVIEW_ONLY_Rim", (0.8, 3.1, 3.2), 300, 2.2, (0.64, 0.82, 1.0))

    cam_data = bpy.data.cameras.new("REVIEW_ONLY_Camera")
    cam = bpy.data.objects.new("REVIEW_ONLY_Camera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.44
    scene.camera = cam
    return cam


CAM = review_scene()
for label, loc in (("front", (0, -4.6, 1.04)),
                   ("side", (4.6, 0, 1.04)),
                   ("back", (0, 4.6, 1.04))):
    CAM.location = loc
    look_at(CAM, (0, 0, 0.95))
    bpy.context.scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)

BODY.data.calc_loop_triangles()
BOARD.data.calc_loop_triangles()
BLADE.data.calc_loop_triangles()
summary = {
    "triangles": sum(len(o.data.loop_triangles) for o in (BODY, BOARD, BLADE)),
    "mesh_objects": {o.name: len(o.data.loop_triangles) for o in (BODY, BOARD, BLADE)},
    "materials": sorted({m.name for o in (BODY, BOARD, BLADE) for m in o.data.materials}),
    "bones": len(RIG.data.bones),
    "max_weight_influences": influence_summary,
    "renders": ["front.png", "side.png", "back.png"],
}
print("BUILD_SUMMARY", summary)
sys.stdout.flush()
sys.stderr.flush()
os._exit(0)
