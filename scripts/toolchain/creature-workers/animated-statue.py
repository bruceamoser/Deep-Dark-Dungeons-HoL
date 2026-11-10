"""Build the AnimatedStatue review submission.

Run from any directory:
    blender --background --factory-startup --threads 4 --python build.py

Only the armature from the supplied CC0 KayKit Ninja is retained. The visible
character and equipment are original procedural geometry authored here.
"""

import math
import os
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/animated-statue"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
OUT.mkdir(parents=True, exist_ok=True)

EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}


def clean_start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")

    for obj in list(bpy.data.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)
    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None
    return rig


RIG = clean_start()
actual_bones = {bone.name for bone in RIG.data.bones}
if actual_bones != EXPECTED_BONES:
    raise RuntimeError(f"Unexpected donor bones: {sorted(actual_bones ^ EXPECTED_BONES)}")


def material(name, color, roughness=0.82, metallic=0.0, green=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    mat.use_backface_culling = False
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if green:
        bsdf.inputs["Coat Weight"].default_value = green
        bsdf.inputs["Coat Roughness"].default_value = 0.55
    return mat


STONE = material("Weathered_Stone", (0.48, 0.44, 0.34), 0.93)
STONE_LIGHT = material("Sunlit_Stone", (0.62, 0.57, 0.45), 0.88)
STONE_DARK = material("Carved_Stone_Shadow", (0.22, 0.21, 0.16), 0.96)
PATINA = material("Green_Bronze_Patina", (0.075, 0.20, 0.105), 0.72, 0.20, 0.12)
BRONZE = material("Aged_Bronze_Trim", (0.30, 0.34, 0.12), 0.64, 0.42)
CLOTH = material("Guardian_Green_Cloth", (0.045, 0.12, 0.085), 0.98)
CLOTH_DARK = material("Cloak_Deep_Folds", (0.018, 0.052, 0.042), 1.0)
CAVITY = material("Recessed_Cavity", (0.025, 0.030, 0.024), 1.0)

AUTHORED = []


def finish(obj, mat, bone=None, smooth=True, weights=None):
    obj.data.materials.append(mat)
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if weights is not None:
        for bone_name, grouped_weights in weights.items():
            group = obj.vertex_groups.new(name=bone_name)
            for index, weight in grouped_weights:
                group.add([index], weight, "REPLACE")
    elif bone:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    else:
        raise ValueError(f"{obj.name} needs skin weights")
    AUTHORED.append(obj)
    return obj


def apply_transform(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)


def ellipsoid(name, loc, scale, bone, mat, rotation=(0, 0, 0), segments=12, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = rotation
    apply_transform(obj)
    return finish(obj, mat, bone)


def tapered(name, start, end, radius_start, radius_end, bone, mat, vertices=10):
    start = Vector(start)
    end = Vector(end)
    delta = end - start
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=delta.length,
        end_fill_type="NGON",
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(delta.normalized())
    apply_transform(obj)
    return finish(obj, mat, bone)


def leaf_blade(name, base_x, tip_x, center_y, center_z, bone, mat):
    """Create a flattened, widening-then-tapering spear blade along +X."""
    # Each station is (x, half_thickness_y, half_width_z). Four points per
    # ring preserve a readable leaf profile from the front and side.
    stations = (
        (base_x, 0.009, 0.010),
        (base_x + 0.115, 0.019, 0.052),
        (base_x + 0.235, 0.022, 0.073),
        (base_x + 0.340, 0.016, 0.043),
    )
    verts = []
    for x, half_y, half_z in stations:
        verts.extend((
            (x, center_y + half_y, center_z),
            (x, center_y, center_z + half_z),
            (x, center_y - half_y, center_z),
            (x, center_y, center_z - half_z),
        ))
    tip_index = len(verts)
    verts.append((tip_x, center_y, center_z))
    faces = [(3, 2, 1, 0)]
    for ring in range(len(stations) - 1):
        a = ring * 4
        b = a + 4
        faces.extend((
            (a, a + 1, b + 1, b),
            (a + 1, a + 2, b + 2, b + 1),
            (a + 2, a + 3, b + 3, b + 2),
            (a + 3, a, b, b + 3),
        ))
    last = (len(stations) - 1) * 4
    faces.extend((
        (last, last + 1, tip_index),
        (last + 1, last + 2, tip_index),
        (last + 2, last + 3, tip_index),
        (last + 3, last, tip_index),
    ))
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, mat, bone)


def box(name, loc, scale, bone, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    return finish(obj, mat, bone, smooth=False)


def torus(name, loc, major_radius, minor_radius, bone, mat, rotation=(0, 0, 0),
          scale=(1, 1, 1), major_segments=16, minor_segments=5):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    apply_transform(obj)
    return finish(obj, mat, bone)


# Feet, stride-ready legs, layered tunic, and a guarded torso.
for side, sx in (("l", 1.0), ("r", -1.0)):
    upper = RIG.data.bones[f"upperleg.{side}"]
    lower = RIG.data.bones[f"lowerleg.{side}"]
    foot = RIG.data.bones[f"foot.{side}"]
    toes = RIG.data.bones[f"toes.{side}"]
    tapered(f"Thigh_{side}", upper.head_local, upper.tail_local, 0.132, 0.102,
            f"upperleg.{side}", STONE, 12)
    ellipsoid(f"KneeCap_{side}", (sx * 0.171, -0.065, 0.292),
              (0.105, 0.075, 0.095), f"lowerleg.{side}", STONE_LIGHT)
    tapered(f"Shin_{side}", lower.head_local, lower.tail_local, 0.090, 0.065,
            f"lowerleg.{side}", STONE, 11)
    ellipsoid(f"Greave_{side}", (sx * 0.171, -0.088, 0.205),
              (0.088, 0.040, 0.130), f"lowerleg.{side}", STONE_LIGHT,
              rotation=(0.03, 0, 0))
    # Bronze leaf-like greave relief.
    ellipsoid(f"Greave_Leaf_{side}", (sx * 0.171, -0.132, 0.207),
              (0.035, 0.012, 0.092), f"lowerleg.{side}", BRONZE)
    for leaf_index, z in enumerate((0.246, 0.205, 0.164)):
        ellipsoid(
            f"Greave_LeafTip_{side}_{leaf_index}",
            (sx * (0.171 + (0.018 if leaf_index % 2 else -0.018)), -0.144, z),
            (0.023, 0.008, 0.044),
            f"lowerleg.{side}",
            BRONZE,
            rotation=(0, sx * (0.45 if leaf_index % 2 else -0.45), 0),
        )
    ellipsoid(f"Ankle_{side}", (sx * 0.171, 0.017, 0.139),
              (0.078, 0.075, 0.070), f"foot.{side}", STONE_DARK)
    ellipsoid(f"SandalFoot_{side}", (sx * 0.171, -0.085, 0.052),
              (0.105, 0.215, 0.052), f"foot.{side}", STONE_LIGHT)
    for strap_index, y in enumerate((-0.020, -0.082, -0.145)):
        torus(
            f"SandalStrap_{side}_{strap_index}",
            (sx * 0.171, y, 0.096 - strap_index * 0.008),
            0.079,
            0.012,
            f"foot.{side}",
            BRONZE,
            rotation=(math.pi / 2, 0, 0),
            scale=(1.05, 1.0, 0.72),
            major_segments=12,
            minor_segments=4,
        )
    for toe_index, offset in enumerate((-0.060, -0.020, 0.020, 0.060)):
        ellipsoid(
            f"SandaledToe_{side}_{toe_index}",
            (sx * (0.171 + offset), -0.282, 0.041),
            (0.030, 0.046, 0.025),
            f"toes.{side}",
            STONE_LIGHT if toe_index < 2 else STONE,
            segments=8,
            rings=4,
        )

ellipsoid("Pelvis_CarvedBlock", (0, 0.005, 0.535), (0.285, 0.205, 0.190), "hips", STONE_DARK)
ellipsoid("Abdomen_Carved", (0, -0.012, 0.735), (0.292, 0.205, 0.235), "spine", STONE)

# Short, split civic tunic over the hips.
tapered("Tunic_Skirt", (0, 0, 0.440), (0, 0, 0.665), 0.355, 0.285, "hips", STONE_LIGHT, 16)
ellipsoid("Tunic_FrontPanel", (0, -0.255, 0.545), (0.150, 0.032, 0.155),
          "hips", STONE_LIGHT)
for fold_index, x in enumerate((-0.19, -0.07, 0.07, 0.19)):
    box(
        f"Tunic_Fold_{fold_index}",
        (x, -0.279, 0.520),
        (0.018, 0.013, 0.135),
        "hips",
        STONE_DARK if fold_index in (0, 3) else STONE,
        rotation=(0, 0, x * 0.8),
    )

torus("Bronze_WaistBelt", (0, 0, 0.665), 0.275, 0.028, "spine", BRONZE,
      scale=(1.02, 0.73, 1.0), major_segments=18, minor_segments=5)
ellipsoid("Belt_Medallion", (0, -0.222, 0.665), (0.075, 0.025, 0.072),
          "spine", BRONZE, rotation=(math.pi / 2, 0, 0))

ellipsoid("Cuirass_Core", (0, -0.005, 0.985), (0.370, 0.235, 0.300),
          "chest", STONE)
ellipsoid("Cuirass_Abdomen", (0, -0.175, 0.795), (0.225, 0.090, 0.135),
          "spine", STONE_LIGHT)
for side, sx in (("l", 1.0), ("r", -1.0)):
    ellipsoid(f"Pectoral_Plate_{side}", (sx * 0.165, -0.205, 1.055),
              (0.190, 0.080, 0.145), "chest", STONE_LIGHT,
              rotation=(0.05, sx * 0.08, sx * 0.08))
    ellipsoid(f"Shoulder_Socket_{side}", (sx * 0.345, 0.0, 1.115),
              (0.150, 0.160, 0.145), "chest", STONE_DARK)
    ellipsoid(f"Pauldron_{side}", (sx * 0.385, -0.005, 1.175),
              (0.175, 0.150, 0.115), "chest", STONE_LIGHT,
              rotation=(0, sx * 0.15, 0))
    ellipsoid(f"Pauldron_Trim_{side}", (sx * 0.423, -0.010, 1.118),
              (0.146, 0.120, 0.022), "chest", BRONZE,
              rotation=(0, sx * 0.15, 0))

# Raised circular civic motif on the cuirass.
torus("Chest_Civic_Ring", (0, -0.318, 1.040), 0.092, 0.014, "chest", BRONZE,
      rotation=(math.pi / 2, 0, 0), scale=(1.0, 1.0, 1.0),
      major_segments=16, minor_segments=4)
ellipsoid("Chest_Civic_Boss", (0, -0.330, 1.040), (0.045, 0.022, 0.045),
          "chest", PATINA, rotation=(math.pi / 2, 0, 0))

# Arms are laid out on the donor T-pose and rigidly weighted by anatomical bone.
for side, sx in (("l", 1.0), ("r", -1.0)):
    upper = RIG.data.bones[f"upperarm.{side}"]
    lower = RIG.data.bones[f"lowerarm.{side}"]
    hand = RIG.data.bones[f"hand.{side}"]
    tapered(f"UpperArm_{side}", upper.head_local, upper.tail_local, 0.102, 0.087,
            f"upperarm.{side}", STONE, 12)
    ellipsoid(f"Elbow_{side}", (sx * 0.454, 0.014, 1.107),
              (0.090, 0.088, 0.090), f"lowerarm.{side}", STONE_DARK)
    tapered(f"Forearm_{side}", lower.head_local, lower.tail_local, 0.084, 0.068,
            f"lowerarm.{side}", STONE_LIGHT, 11)
    ellipsoid(f"Forearm_Bracer_{side}", (sx * 0.638, -0.016, 1.107),
              (0.105, 0.095, 0.095), f"lowerarm.{side}", STONE, rotation=(0, sx * 0.05, 0))
    ellipsoid(f"Palm_{side}", (sx * 0.835, -0.006, 1.070),
              (0.112, 0.078, 0.075), f"hand.{side}", STONE_LIGHT)
    for finger_index, (z, y) in enumerate(((1.105, -0.054), (1.073, -0.060), (1.041, -0.052))):
        tapered(
            f"Finger_{side}_{finger_index}",
            (sx * 0.835, y, z),
            (sx * 0.940, y - 0.012, z - 0.008),
            0.022,
            0.017,
            f"hand.{side}",
            STONE_LIGHT,
            8,
        )
    ellipsoid(f"Thumb_{side}", (sx * 0.832, -0.075, 1.015),
              (0.035, 0.028, 0.052), f"hand.{side}", STONE_LIGHT,
              rotation=(0, sx * 0.30, 0))

ellipsoid("Neck", (0, 0, 1.245), (0.095, 0.088, 0.110), "head", STONE_DARK)
ellipsoid("Head_Carved", (0, -0.004, 1.405), (0.180, 0.153, 0.220),
          "head", STONE_LIGHT, segments=16, rings=8)
ellipsoid("Hair_Mass", (0, 0.030, 1.535), (0.195, 0.155, 0.115),
          "head", STONE_DARK, segments=14, rings=7)
ellipsoid("Beard_Main", (0, -0.132, 1.306), (0.142, 0.083, 0.130),
          "head", STONE, segments=12, rings=6)
ellipsoid("Beard_Lobe", (0, -0.150, 1.258), (0.085, 0.055, 0.090),
          "head", STONE_DARK, segments=10, rings=5)

for side, sx in (("l", 1.0), ("r", -1.0)):
    ellipsoid(f"Eye_Socket_{side}", (sx * 0.063, -0.145, 1.423),
              (0.050, 0.023, 0.027), "head", CAVITY, segments=10, rings=5,
              rotation=(0, 0, sx * 0.10))
    ellipsoid(f"Eye_Stone_{side}", (sx * 0.063, -0.165, 1.423),
              (0.029, 0.012, 0.015), "head", STONE_LIGHT, segments=8, rings=4)
    box(f"Brow_{side}", (sx * 0.067, -0.165, 1.467),
        (0.095, 0.023, 0.020), "head", STONE_DARK,
        rotation=(0, 0, -sx * 0.14))
    ellipsoid(f"Cheek_{side}", (sx * 0.093, -0.137, 1.356),
              (0.075, 0.036, 0.066), "head", STONE, segments=10, rings=5)
    ellipsoid(f"Moustache_{side}", (sx * 0.045, -0.184, 1.339),
              (0.064, 0.020, 0.017), "head", STONE_DARK, segments=8, rings=4,
              rotation=(0, 0, sx * 0.18))

ellipsoid("Nose_Bridge", (0, -0.169, 1.393), (0.040, 0.049, 0.075),
          "head", STONE_DARK, rotation=(0.12, 0, 0), segments=10, rings=5)
ellipsoid("Nose_Tip", (0, -0.198, 1.369), (0.052, 0.041, 0.032),
          "head", STONE_LIGHT, segments=8, rings=4)
ellipsoid("Mouth_Recess", (0, -0.207, 1.312), (0.065, 0.012, 0.012),
          "head", CAVITY, segments=10, rings=4)

# Laurel crown is a repeated civic leaf silhouette, intentionally readable at
# isometric size and clearly unlike a helmet plume.
for leaf_index in range(10):
    angle = -1.35 + leaf_index * 0.30
    x = 0.185 * math.sin(angle)
    y = 0.010 + 0.145 * math.cos(angle)
    z = 1.514 + 0.028 * math.cos(angle * 1.7)
    ellipsoid(
        f"Laurel_Leaf_{leaf_index:02d}",
        (x, y, z),
        (0.032, 0.072, 0.019),
        "head",
        BRONZE if leaf_index % 2 else PATINA,
        rotation=(0.20, 0.0, angle),
        segments=8,
        rings=4,
    )
    if leaf_index < 9:
        next_angle = angle + 0.15
        x2 = 0.185 * math.sin(next_angle)
        y2 = 0.010 + 0.145 * math.cos(next_angle)
        z2 = 1.484 + 0.022 * math.cos(next_angle * 1.7)
        ellipsoid(
            f"Laurel_LowerLeaf_{leaf_index:02d}",
            (x2, y2, z2),
            (0.026, 0.058, 0.015),
            "head",
            PATINA if leaf_index % 2 else BRONZE,
            rotation=(0.25, 0.0, next_angle),
            segments=8,
            rings=4,
        )


def make_cloak():
    """Gathered back mantle with blended torso weights and a bronze hem."""
    xs = (-1.0, -0.76, -0.48, -0.16, 0.16, 0.48, 0.76, 1.0)
    rows = (
        (1.235, 0.265, 0.255),
        (1.085, 0.325, 0.305),
        (0.885, 0.405, 0.360),
        (0.675, 0.460, 0.415),
        (0.455, 0.500, 0.460),
        (0.245, 0.535, 0.500),
    )
    verts = []
    for row_index, (z, width, y_base) in enumerate(rows):
        for col_index, normalized_x in enumerate(xs):
            fold = (
                0.034 * math.sin(col_index * 2.25 + row_index * 0.55)
                + 0.014 * math.cos(col_index * 1.25)
            )
            x = normalized_x * width - 0.018 * row_index
            y = y_base + fold
            hem_drop = 0.0
            if row_index == len(rows) - 1:
                hem_drop = 0.024 * abs(math.sin(col_index * math.pi / 2.0))
            verts.append((x, y, z - hem_drop))
    faces = []
    material_indices = []
    for row_index in range(len(rows) - 1):
        for col_index in range(len(xs) - 1):
            a = row_index * len(xs) + col_index
            faces.append((a, a + 1, a + len(xs) + 1, a + len(xs)))
            if row_index == len(rows) - 2:
                material_indices.append(1)
            elif col_index in (1, 5):
                material_indices.append(2)
            else:
                material_indices.append(0)
    mesh = bpy.data.meshes.new("Cloak_BackMantle_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Cloak_BackMantle", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(CLOTH)
    obj.data.materials.append(BRONZE)
    obj.data.materials.append(CLOTH_DARK)
    for poly, material_index in zip(obj.data.polygons, material_indices):
        poly.material_index = material_index
        poly.use_smooth = True
    weights = {"chest": [], "spine": [], "hips": []}
    for index, (_, _, z) in enumerate(verts):
        if z > 0.94:
            weights["chest"].append((index, 1.0))
        elif z > 0.64:
            blend = (z - 0.64) / 0.30
            weights["spine"].append((index, blend))
            weights["hips"].append((index, 1.0 - blend))
        else:
            weights["hips"].append((index, 1.0))
    for bone_name, grouped_weights in weights.items():
        group = obj.vertex_groups.new(name=bone_name)
        for index, weight in grouped_weights:
            group.add([index], weight, "REPLACE")
    AUTHORED.append(obj)
    return obj


make_cloak()

# Broad oval civic shield. The hand bone owns the complete equipment mesh so it
# keeps its grip and facing through the shared arm actions.
ellipsoid("Shield_Back", (0.615, -0.145, 1.075), (0.350, 0.055, 0.430),
          "hand.l", STONE_DARK, segments=18, rings=8)
ellipsoid("Shield_Face", (0.615, -0.205, 1.075), (0.323, 0.036, 0.396),
          "hand.l", PATINA, segments=18, rings=8)
torus("Shield_Rim", (0.615, -0.226, 1.075), 0.330, 0.030,
      "hand.l", BRONZE, rotation=(math.pi / 2, 0, 0),
      scale=(1.0, 1.0, 1.205), major_segments=24, minor_segments=5)
ellipsoid("Shield_Boss", (0.615, -0.252, 1.075), (0.105, 0.035, 0.105),
          "hand.l", BRONZE, rotation=(math.pi / 2, 0, 0), segments=14, rings=7)
torus("Shield_Boss_Ring", (0.615, -0.270, 1.075), 0.116, 0.013,
      "hand.l", STONE_LIGHT, rotation=(math.pi / 2, 0, 0),
      major_segments=16, minor_segments=4)
for ray_index in range(8):
    angle = ray_index * (math.tau / 8.0)
    x1 = 0.615 + 0.115 * math.cos(angle)
    z1 = 1.075 + 0.115 * math.sin(angle)
    x2 = 0.615 + 0.245 * math.cos(angle)
    z2 = 1.075 + 0.245 * math.sin(angle)
    tapered(
        f"Shield_Ray_{ray_index}",
        (x1, -0.265, z1),
        (x2, -0.265, z2),
        0.016,
        0.006,
        "hand.l",
        BRONZE,
        6,
    )
for leaf_index in range(6):
    side = -1 if leaf_index < 3 else 1
    rank = leaf_index % 3
    x = 0.615 + side * (0.245 + rank * 0.018)
    z = 1.070 + (rank - 1) * 0.150
    ellipsoid(
        f"Shield_Laurel_{leaf_index}",
        (x, -0.258, z),
        (0.034, 0.011, 0.090),
        "hand.l",
        STONE_LIGHT if leaf_index % 2 else BRONZE,
        rotation=(0, side * 0.42, side * 0.12),
        segments=8,
        rings=4,
    )

# Long ceremonial spear. Shared animations map the hand's rest +X axis to
# upright, so the shaft runs forward from a short butt through the fixed grip.
# Most of the shaft and the leaf blade therefore extend toward +X.
tapered("Spear_Shaft", (-1.045, -0.020, 1.050), (0.790, -0.020, 1.050),
        0.019, 0.014, "hand.r", BRONZE, 10)
ellipsoid("Spear_ButtCap", (-1.073, -0.020, 1.050), (0.039, 0.024, 0.024),
          "hand.r", STONE_LIGHT, segments=8, rings=4)
torus("Spear_Grip_Collar", (-0.845, -0.020, 1.050), 0.040, 0.012,
      "hand.r", PATINA, rotation=(0, math.pi / 2, 0),
      major_segments=12, minor_segments=4)
torus("Spear_Head_Collar", (0.805, -0.020, 1.050), 0.046, 0.014,
      "hand.r", STONE_LIGHT, rotation=(0, math.pi / 2, 0),
      major_segments=12, minor_segments=4)
leaf_blade("Spear_LeafBlade", 0.820, 1.245, -0.020, 1.050, "hand.r", STONE_LIGHT)
ellipsoid("Spear_Blade_Ridge", (1.010, -0.020, 1.050), (0.145, 0.027, 0.022),
          "hand.r", BRONZE, segments=8, rings=4)

# Small patina losses visually tie the pale statue to the supplied portrait.
for patch_index, (loc, scale, rotation) in enumerate((
    ((-0.385, -0.105, 1.230), (0.115, 0.026, 0.045), (0.0, 0.1, -0.2)),
    ((0.190, 0.210, 1.178), (0.105, 0.022, 0.072), (0.2, 0.0, 0.1)),
    ((-0.250, -0.271, 0.782), (0.085, 0.014, 0.065), (0.0, 0.0, -0.3)),
    ((0.176, -0.145, 0.512), (0.070, 0.015, 0.086), (0.2, 0.0, 0.3)),
    ((-0.565, -0.080, 1.127), (0.075, 0.018, 0.052), (0.0, 0.2, 0.1)),
)):
    ellipsoid(f"Patina_Loss_{patch_index}", loc, scale,
              "hips" if patch_index in (2, 3) else
              ("lowerarm.r" if patch_index == 4 else "chest"),
              PATINA, rotation=rotation, segments=8, rings=4)


def join_authored():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in AUTHORED:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = AUTHORED[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "AnimatedStatue_Guardian"
    body.data.name = "AnimatedStatue_Guardian_Mesh"
    body.parent = RIG
    body.matrix_parent_inverse = RIG.matrix_world.inverted()
    modifier = body.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = RIG
    modifier.use_vertex_groups = True

    # Collapse duplicate slots created by joining while retaining materials.
    unique = []
    remap = {}
    old_materials = list(body.data.materials)
    for index, mat in enumerate(old_materials):
        if mat not in unique:
            unique.append(mat)
        remap[index] = unique.index(mat)
    polygon_materials = [remap.get(poly.material_index, 0) for poly in body.data.polygons]
    body.data.materials.clear()
    for mat in unique:
        body.data.materials.append(mat)
    # Clearing slots resets material indices, so restore them afterward.
    for poly, material_index in zip(body.data.polygons, polygon_materials):
        poly.material_index = material_index
    return body


BODY = join_authored()

# Make the lowest sandal vertex the ground contact without moving or editing
# any donor bone rest matrix.
ground_offset = -min(vertex.co.z for vertex in BODY.data.vertices)
for vertex in BODY.data.vertices:
    vertex.co.z += ground_offset

BODY["asset"] = "AnimatedStatue"
BODY["geometry_source"] = "Original procedural guardian geometry"
BODY["rig_source"] = "CC0 KayKit Ninja.glb (armature only)"
BODY["submission_status"] = "review draft"
RIG["asset"] = "AnimatedStatue"
RIG["rig_source"] = "CC0 KayKit Ninja.glb (23 joints preserved)"
RIG["submission_status"] = "review draft"

# Validate skin weights before saving/exporting.
group_names = {group.index: group.name for group in BODY.vertex_groups}
bad_weights = []
for vertex in BODY.data.vertices:
    influences = [g.weight for g in vertex.groups if g.weight > 0.00001]
    if not influences or abs(sum(influences) - 1.0) > 0.0001:
        bad_weights.append((vertex.index, sum(influences)))
if bad_weights:
    raise RuntimeError(f"Invalid skin weights on {len(bad_weights)} vertices")

scene = bpy.context.scene
scene.render.fps = 30
scene["asset"] = "AnimatedStatue"
scene["submission_status"] = "review draft"

bpy.ops.object.select_all(action="DESELECT")
BODY.select_set(True)
RIG.select_set(True)
bpy.context.view_layer.objects.active = RIG

blend_path = OUT / "AnimatedStatue.blend"
glb_path = OUT / "AnimatedStatue.glb"
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


def aim_bone(name, direction, translation=None):
    bpy.context.view_layer.update()
    pose_bone = RIG.pose.bones[name]
    head = pose_bone.head.copy() if translation is None else Vector(translation)
    rotation = Vector((0.0, 1.0, 0.0)).rotation_difference(Vector(direction).normalized())
    pose_bone.matrix = Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def preserve_hand_orientation(name, extra_rotation=None):
    bpy.context.view_layer.update()
    pose_bone = RIG.pose.bones[name]
    rotation = pose_bone.bone.matrix_local.to_quaternion().to_matrix().to_4x4()
    if extra_rotation is not None:
        rotation = extra_rotation @ rotation
    pose_bone.matrix = (
        Matrix.Translation(pose_bone.head)
        @ rotation
    )
    bpy.context.view_layer.update()


def pose_for_review():
    # Render-only spear-and-shield guard. Export remains neutral.
    aim_bone("upperarm.l", (0.68, -0.10, -0.72))
    aim_bone("lowerarm.l", (0.12, -0.36, -0.93))
    preserve_hand_orientation("hand.l")
    aim_bone("upperarm.r", (-0.72, -0.06, -0.69))
    aim_bone("lowerarm.r", (-0.14, -0.18, -0.97))
    preserve_hand_orientation("hand.r", Matrix.Rotation(-math.pi / 2, 4, "Y"))


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_review_scene():
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
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.20

    world = bpy.data.worlds.new("Review_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.065, 0.060, 1.0)
    background.inputs["Strength"].default_value = 0.35

    ground_mat = material("Review_Ground", (0.060, 0.068, 0.060), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0, 0, -0.005))
    ground = bpy.context.object
    ground.name = "REVIEW_ONLY_Ground"
    ground.data.materials.append(ground_mat)

    def area(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        look_at(obj, (0, 0, 0.95))

    area("REVIEW_ONLY_Key", (-2.8, -3.8, 4.1), 520.0, 3.2, (1.0, 0.79, 0.58))
    area("REVIEW_ONLY_Fill", (3.2, -2.3, 2.7), 230.0, 2.8, (0.52, 0.72, 1.0))
    area("REVIEW_ONLY_Rim", (1.2, 3.1, 3.3), 300.0, 2.4, (0.73, 0.84, 1.0))

    camera_data = bpy.data.cameras.new("Review_Camera")
    camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.00
    scene.camera = camera
    return camera


pose_for_review()
camera = add_review_scene()
for label, location, target in (
    ("front", (0.0, -5.4, 1.28), (0.0, 0.0, 1.28)),
    ("side", (5.4, 0.0, 1.28), (0.0, 0.0, 1.28)),
    ("back", (0.0, 5.4, 1.28), (0.0, 0.0, 1.28)),
):
    camera.location = location
    look_at(camera, target)
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", label, scene.render.filepath, flush=True)

print("BUILT", glb_path, flush=True)
print("VERTICES", len(BODY.data.vertices), flush=True)
print("TRIANGLES", sum(len(poly.vertices) - 2 for poly in BODY.data.polygons), flush=True)
print("MATERIAL_SLOTS", len(BODY.data.materials), flush=True)
print("BONES", len(RIG.data.bones), flush=True)
print("GROUND_OFFSET", round(ground_offset, 6), flush=True)
print("BUILD_COMPLETE", flush=True)
import sys
sys.stdout.flush()
os._exit(0)
