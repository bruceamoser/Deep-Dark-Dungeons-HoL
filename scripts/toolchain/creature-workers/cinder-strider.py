"""Build the Cinder Strider review asset.

All visible elemental geometry is authored here. The canonical supplied Ninja
GLB is imported solely for its untouched 23-joint armature and inverse-bind
relationships; no donor mesh or material is exported.
"""

import hashlib
import math
import os
import random
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/cinder-strider"
OUT.mkdir(parents=True, exist_ok=True)
NINJA = ROOT / "public/assets/characters/series4/Ninja.glb"
NINJA_SHA256 = "5e7fc34eef2011f4d4cf534acad039f2edc18be42d4542cc7c776a62142129e0"
PRESENT_SCALE = (0.72, 0.72, 1.55)
RNG = random.Random(184844)


def make_material(name, color, roughness=0.8, metallic=0.0, emission=None, strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        try:
            mat.surface_render_method = "BLENDED"
            mat.use_transparent_shadow = True
            mat.show_transparent_back = True
        except Exception:
            pass
    return mat


def clean_start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0


clean_start()

COAL = make_material("Coal_Base", (0.012, 0.018, 0.023), 0.90)
COAL_EDGE = make_material("Coal_Edge", (0.042, 0.052, 0.061), 0.78, 0.08)
COAL_DEEP = make_material("Coal_Deep", (0.003, 0.005, 0.008), 0.96)
EMBER = make_material(
    "Ember_Orange", (0.62, 0.045, 0.006), 0.42,
    emission=(1.0, 0.055, 0.003), strength=0.85,
)
CORE = make_material(
    "Ember_Core", (0.95, 0.20, 0.008), 0.34,
    emission=(1.0, 0.20, 0.006), strength=1.25,
)
HOT = make_material(
    "Ember_Hot_Tip", (1.0, 0.42, 0.025), 0.30,
    emission=(1.0, 0.38, 0.018), strength=1.8,
)
SMOKE = make_material(
    "Smoke_Grey", (0.38, 0.43, 0.47), 1.0,
    emission=(0.16, 0.19, 0.21), strength=0.12, alpha=0.10,
)
SMOKE.use_backface_culling = False


def make_armature():
    if not NINJA.is_file():
        raise FileNotFoundError(NINJA)
    digest = hashlib.sha256(NINJA.read_bytes()).hexdigest()
    if digest != NINJA_SHA256:
        raise RuntimeError(f"Canonical Ninja donor checksum mismatch: {digest}")

    bpy.ops.import_scene.gltf(filepath=str(NINJA))
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one canonical Ninja armature, found {len(rigs)}")
    rig = rigs[0]

    # The donor meshes are used only to establish the armature/inverse binds.
    for obj in list(bpy.context.scene.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    rig["asset"] = "CinderStrider"
    rig["rig_source"] = "Canonical public/assets/characters/series4/Ninja.glb"
    rig["rig_source_sha256"] = digest
    rig["presentation_scale"] = PRESENT_SCALE
    rig["submission_status"] = "review draft"
    return rig


RIG = make_armature()
PRESENTATION = bpy.data.objects.new("CinderStrider_Presentation", None)
bpy.context.collection.objects.link(PRESENTATION)
PRESENTATION.scale = PRESENT_SCALE
RIG.parent = PRESENTATION
PRESENTATION["role"] = "deliberate outer silhouette transform; donor bone rest data unchanged"
BODY_PARTS = []
SMOKE_PARTS = {"l": [], "r": [], "back": []}


def attach(obj, bone, bucket):
    if bone not in RIG.data.bones:
        raise ValueError(f"Missing bone {bone}")
    obj.parent = RIG
    obj.matrix_parent_inverse.identity()
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = RIG
    mod.use_vertex_groups = True
    bucket.append(obj)
    return obj


def basis_around(direction):
    axis = Vector(direction).normalized()
    helper = Vector((0, 0, 1)) if abs(axis.z) < 0.88 else Vector((0, 1, 0))
    u = axis.cross(helper).normalized()
    v = axis.cross(u).normalized()
    return u, v


def crystal(name, a, b, radius, bone, material, ring=5, taper=0.14, flatten=1.0, seed=0):
    """Create a low-poly, jagged, tapered crystal aligned from a to b."""
    rng = random.Random(seed)
    a, b = Vector(a), Vector(b)
    # Project authored geometry into canonical-rig local space. The presentation
    # root restores the intended vertical silhouette without editing bone rests.
    a.z /= PRESENT_SCALE[2]
    b.z /= PRESENT_SCALE[2]
    axis = b - a
    u, v = basis_around(axis)
    verts = [a.copy(), b.copy()]
    centers = [a.lerp(b, 0.16), a.lerp(b, 0.84)]
    for level, (center, rad) in enumerate(zip(centers, (radius, radius * taper))):
        for i in range(ring):
            angle = 2 * math.pi * i / ring + (0.10 if level else 0.0)
            jag = 0.76 + rng.uniform(0.0, 0.42)
            offset = u * (math.cos(angle) * rad * jag)
            offset += v * (math.sin(angle) * rad * flatten * jag)
            verts.append(center + offset)
    faces = []
    r0, r1 = 2, 2 + ring
    for i in range(ring):
        j = (i + 1) % ring
        faces.append((0, r0 + j, r0 + i))
        faces.append((1, r1 + i, r1 + j))
        faces.append((r0 + i, r0 + j, r1 + j, r1 + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(p) for p in verts], [], faces)
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = False
    return attach(obj, bone, BODY_PARTS)


def shard_plate(name, a, b, radius, bone, material, seed, flatten=0.42):
    return crystal(name, a, b, radius, bone, material, ring=6, taper=0.58, flatten=flatten, seed=seed)


def fissure(name, points, bone, material=EMBER, radius=0.013):
    for i, (a, b) in enumerate(zip(points, points[1:])):
        crystal(f"{name}_{i}", a, b, radius, bone, material, ring=4, taper=0.35, seed=100 + i)


def joint(name, p, radius, bone, material=EMBER, seed=0):
    p = Vector(p)
    crystal(name, p + Vector((0, 0, -radius)), p + Vector((0, 0, radius)),
            radius, bone, material, ring=5, taper=0.5, seed=seed)


# Narrow torso: a dark cage around exposed vertical heat.
crystal("Torso_Hip_Core", (0, 0, 0.91), (0, 0, 1.18), 0.17, "hips", COAL_DEEP, ring=6, taper=0.74, seed=1)
crystal("Torso_Waist_Core", (0, 0, 1.12), (0, 0, 1.43), 0.145, "spine", COAL, ring=6, taper=0.82, seed=2)
crystal("Torso_Chest_Core", (0, 0, 1.35), (0, 0, 1.79), 0.225, "chest", COAL, ring=6, taper=0.68, seed=3)
crystal("Pelvis_Crown", (-0.20, 0.01, 0.96), (0.20, 0.01, 0.96), 0.105, "hips", COAL_EDGE, ring=5, taper=0.50, seed=4)
shard_plate("Chest_Front_Left", (-0.22, -0.10, 1.72), (-0.025, -0.18, 1.35), 0.12, "chest", COAL_EDGE, 5)
shard_plate("Chest_Front_Right", (0.22, -0.10, 1.72), (0.025, -0.18, 1.35), 0.12, "chest", COAL, 6)
shard_plate("Chest_Rib_Left", (-0.24, -0.08, 1.58), (-0.06, -0.16, 1.42), 0.075, "chest", COAL, 7)
shard_plate("Chest_Rib_Right", (0.24, -0.08, 1.58), (0.06, -0.16, 1.42), 0.075, "chest", COAL, 8)
shard_plate("Belly_Plate_Left", (-0.13, -0.11, 1.37), (-0.06, -0.15, 1.10), 0.075, "spine", COAL, 9)
shard_plate("Belly_Plate_Right", (0.13, -0.11, 1.37), (0.06, -0.15, 1.10), 0.075, "spine", COAL, 10)
shard_plate("Spine_Back_Upper", (0, 0.13, 1.78), (0, 0.18, 1.40), 0.10, "chest", COAL_EDGE, 11)
shard_plate("Spine_Back_Lower", (0, 0.13, 1.43), (0, 0.15, 1.10), 0.08, "spine", COAL_EDGE, 12)

# Hot thorax and abdomen fissures, kept sparse against the coal surface.
fissure("Front_Core", [(0, -0.205, 1.73), (-0.018, -0.215, 1.57), (0.026, -0.205, 1.43),
                       (-0.015, -0.18, 1.28), (0.018, -0.16, 1.12), (0, -0.15, 0.99)], "chest", CORE, 0.016)
fissure("Chest_Branch_L", [(-0.01, -0.205, 1.63), (-0.11, -0.18, 1.56), (-0.18, -0.13, 1.48)], "chest")
fissure("Chest_Branch_R", [(0.01, -0.205, 1.54), (0.10, -0.18, 1.51), (0.16, -0.13, 1.62)], "chest")
fissure("Waist_Crack_L", [(-0.02, -0.16, 1.30), (-0.10, -0.15, 1.20), (-0.14, -0.12, 1.08)], "spine")
fissure("Waist_Crack_R", [(0.02, -0.16, 1.24), (0.09, -0.15, 1.15), (0.11, -0.12, 1.02)], "spine")

# Shoulder plates and separated hot collar.
for side, sx in (("l", 1.0), ("r", -1.0)):
    shard_plate(f"Shoulder_Crown_{side}", (sx * 0.26, 0, 1.78), (sx * 0.48, -0.01, 1.83),
                0.105, "chest", COAL_EDGE, 20 + int(sx))
    shard_plate(f"Shoulder_Spike_{side}", (sx * 0.34, 0.01, 1.72), (sx * 0.43, 0.02, 1.96),
                0.055, "chest", COAL, 22 + int(sx))
    joint(f"Shoulder_Heat_{side}", (sx * 0.31, -0.075, 1.72), 0.045, "chest", EMBER, 24 + int(sx))


def build_arm(side, sx):
    shoulder = Vector((sx * 0.30, 0, 1.72))
    elbow = Vector((sx * 0.64, 0, 1.68))
    wrist = Vector((sx * 1.02, 0, 1.48))
    palm = Vector((sx * 1.19, 0, 1.35))

    crystal(f"UpperArm_{side}_A", shoulder.lerp(elbow, 0.05), shoulder.lerp(elbow, 0.47),
            0.095, f"upperarm.{side}", COAL, ring=5, taper=0.58, seed=30 + int(sx))
    crystal(f"UpperArm_{side}_B", shoulder.lerp(elbow, 0.54), shoulder.lerp(elbow, 0.96),
            0.080, f"upperarm.{side}", COAL_EDGE, ring=5, taper=0.38, seed=32 + int(sx))
    joint(f"Elbow_{side}", elbow, 0.062, f"lowerarm.{side}", EMBER, 34 + int(sx))
    crystal(f"LowerArm_{side}_A", elbow.lerp(wrist, 0.03), elbow.lerp(wrist, 0.46),
            0.085, f"lowerarm.{side}", COAL_EDGE, ring=5, taper=0.50, seed=36 + int(sx))
    crystal(f"LowerArm_{side}_B", elbow.lerp(wrist, 0.53), elbow.lerp(wrist, 0.96),
            0.068, f"lowerarm.{side}", COAL, ring=5, taper=0.32, seed=38 + int(sx))
    joint(f"Wrist_{side}", wrist, 0.052, f"wrist.{side}", EMBER, 40 + int(sx))
    crystal(f"Palm_{side}", wrist.lerp(palm, 0.08), wrist.lerp(palm, 1.05),
            0.079, f"hand.{side}", COAL, ring=5, taper=0.52, seed=42 + int(sx))

    # Long narrow cracks running toward the heated claws.
    fissure(f"Arm_Crack_{side}",
            [(sx * 0.37, -0.081, 1.72), (sx * 0.51, -0.083, 1.68),
             (sx * 0.72, -0.073, 1.60), (sx * 0.88, -0.067, 1.52),
             (sx * 1.06, -0.058, 1.43)], f"lowerarm.{side}", EMBER, 0.010)

    claw_data = (
        (0.00, -0.055, 0.00, 1.40, -0.12, 1.14),
        (0.00, -0.095, -0.015, 1.34, -0.16, 1.08),
        (0.00, 0.025, 0.010, 1.37, -0.02, 1.08),
    )
    for i, (_, y0, z0, x1, y1, z1) in enumerate(claw_data):
        a = palm + Vector((sx * 0.015, y0, z0))
        b = Vector((sx * x1, y1, z1))
        crystal(f"Claw_{side}_{i}", a, b, 0.040, f"hand.{side}", EMBER,
                ring=4, taper=0.06, seed=44 + i + int(3 * sx))


for side, sx in (("l", 1.0), ("r", -1.0)):
    build_arm(side, sx)


def build_leg(side, sx):
    hip = Vector((sx * 0.14, 0, 0.98))
    knee = Vector((sx * 0.19, 0, 0.56))
    ankle = Vector((sx * 0.23, 0, 0.18))
    crystal(f"Hip_Core_{side}", hip + Vector((0, 0, 0.02)), hip.lerp(knee, 0.43),
            0.115, f"upperleg.{side}", COAL, ring=5, taper=0.48, seed=50 + int(sx))
    crystal(f"Thigh_{side}", hip.lerp(knee, 0.48), hip.lerp(knee, 0.98),
            0.085, f"upperleg.{side}", COAL_EDGE, ring=5, taper=0.42, seed=52 + int(sx))
    joint(f"Knee_{side}", knee, 0.061, f"lowerleg.{side}", EMBER, 54 + int(sx))
    crystal(f"Shin_{side}_A", knee.lerp(ankle, 0.04), knee.lerp(ankle, 0.48),
            0.076, f"lowerleg.{side}", COAL_EDGE, ring=5, taper=0.50, seed=56 + int(sx))
    crystal(f"Shin_{side}_B", knee.lerp(ankle, 0.55), knee.lerp(ankle, 0.97),
            0.058, f"lowerleg.{side}", COAL, ring=5, taper=0.30, seed=58 + int(sx))
    shard_plate(f"Shin_Ridge_{side}", (sx * 0.205, -0.06, 0.47), (sx * 0.225, -0.05, 0.20),
                0.052, f"lowerleg.{side}", COAL_EDGE, 60 + int(sx))
    crystal(f"Foot_{side}", ankle + Vector((0, 0.05, -0.05)),
            (sx * 0.25, -0.22, 0.055), 0.055, f"foot.{side}",
            COAL, ring=5, taper=0.30, seed=62 + int(sx))
    for i, toe_x in enumerate((-0.055, 0.02, 0.075)):
        a = Vector((sx * (0.25 + toe_x * 0.55), -0.17, 0.075))
        b = Vector((sx * (0.25 + toe_x), -0.37 - 0.025 * (i == 1), 0.035))
        crystal(f"Toe_{side}_{i}", a, b, 0.035, f"toes.{side}", EMBER,
                ring=4, taper=0.08, seed=64 + i + int(sx))
    fissure(f"Leg_Crack_{side}",
            [(sx * 0.16, -0.071, 0.86), (sx * 0.18, -0.073, 0.68),
             (sx * 0.20, -0.061, 0.49), (sx * 0.22, -0.056, 0.28),
             (sx * 0.235, -0.050, 0.17)], f"lowerleg.{side}", EMBER, 0.009)


for side, sx in (("l", 1.0), ("r", -1.0)):
    build_leg(side, sx)

# Severe, compact mask with two slit eyes and a hot central crack.
crystal("Head_Coal", (0, 0, 1.82), (0, 0, 2.14), 0.145, "head", COAL, ring=6, taper=0.66, seed=70)
shard_plate("Forehead_Mask", (-0.115, -0.085, 2.10), (0.10, -0.135, 2.11),
            0.070, "head", COAL_EDGE, 71, flatten=0.35)
shard_plate("Jaw_Mask", (-0.085, -0.12, 1.92), (0.085, -0.12, 1.92),
            0.062, "head", COAL_DEEP, 72, flatten=0.30)
for side, sx in (("l", 1.0), ("r", -1.0)):
    a = Vector((sx * 0.026, -0.152, 2.055))
    b = Vector((sx * 0.105, -0.132, 2.055))
    crystal(f"Eye_{side}", a, b, 0.019, "head", CORE, ring=4, taper=0.12, seed=73 + int(sx))
fissure("Face_Crack", [(0.0, -0.162, 2.045), (0.012, -0.167, 2.005),
                       (-0.012, -0.163, 1.975), (0.0, -0.156, 1.944)], "head", EMBER, 0.011)

# Layered, torn flame crest: cool coal roots, broad orange tongues and a narrow
# yellow-hot heart. The varied lengths avoid a three-spike crown silhouette.
shard_plate("Flame_Root_Rear", (-0.13, 0.045, 2.075), (0.13, 0.055, 2.085),
            0.072, "head", COAL_EDGE, 79, flatten=0.34)
flames = (
    ((-0.08, 0.025, 2.09), (-0.22, 0.060, 2.35), 0.052, EMBER, 80),
    ((0.065, 0.030, 2.09), (0.18, 0.055, 2.41), 0.050, EMBER, 81),
    ((-0.025, 0.015, 2.12), (-0.09, 0.045, 2.52), 0.036, CORE, 82),
    ((0.028, -0.005, 2.13), (0.075, 0.018, 2.46), 0.030, EMBER, 83),
    ((-0.12, 0.045, 2.07), (-0.19, 0.085, 2.24), 0.037, COAL_EDGE, 84),
    ((-0.045, 0.070, 2.08), (-0.105, 0.115, 2.31), 0.034, EMBER, 85),
    ((0.105, 0.045, 2.075), (0.155, 0.080, 2.26), 0.030, COAL_EDGE, 86),
)
for i, (a, b, rad, mat, seed) in enumerate(flames):
    crystal(f"Flame_Crest_{i:02d}", a, b, rad, "head", mat,
            ring=5, taper=0.018, seed=seed)
crystal("Flame_Hot_Heart", (0.0, -0.025, 2.15), (0.015, 0.005, 2.555),
        0.022, "head", HOT, ring=4, taper=0.01, seed=87)

# A rear crown ember gives the side silhouette a readable hot core.
joint("Crown_Ember", (0, 0.08, 2.105), 0.042, "head", EMBER, 88)


def wisp_mesh(name, strands, bone, bucket, seed):
    """Build thin, double-sided smoke ribbons into one named object."""
    rng = random.Random(seed)
    verts, faces = [], []
    for points, widths in strands:
        base = len(verts)
        for i, (point, width) in enumerate(zip(points, widths)):
            p = Vector(point)
            p.z /= PRESENT_SCALE[2]
            tangent = (Vector(points[min(i + 1, len(points) - 1)]) -
                       Vector(points[max(i - 1, 0)])).normalized()
            side = tangent.cross(Vector((0, 1, 0)))
            if side.length < 0.1:
                side = tangent.cross(Vector((1, 0, 0)))
            side.normalize()
            sway = side * (width * (0.46 + rng.uniform(-0.10, 0.10)))
            lift = side.cross(tangent).normalized() * (width * 0.08 * math.sin(i * 2.1))
            verts.extend((tuple(p - sway + lift), tuple(p + sway + lift)))
            if i:
                a = base + (i - 1) * 2
                b = base + i * 2
                faces.append((a, a + 1, b + 1, b))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(SMOKE)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = False
    return attach(obj, bone, bucket)


left_strands = (
    (((0.27, 0.02, 1.78), (0.32, 0.18, 1.87), (0.36, 0.34, 1.95),
      (0.36, 0.48, 2.03), (0.31, 0.58, 2.00)), (0.022, 0.035, 0.034, 0.023, 0.006)),
    (((0.35, 0.03, 1.72), (0.42, 0.18, 1.79), (0.45, 0.34, 1.86),
      (0.43, 0.48, 1.92), (0.38, 0.55, 1.89)), (0.018, 0.029, 0.028, 0.017, 0.005)),
)
right_strands = tuple(tuple((-x, y, z) for x, y, z in points) for points, widths in left_strands)
right_strands = tuple((points, widths) for points, (_, widths) in zip(right_strands, left_strands))
back_strands = (
    (((-0.08, 0.08, 1.80), (-0.14, 0.22, 1.88), (-0.18, 0.34, 1.95),
      (-0.14, 0.44, 1.99), (-0.07, 0.50, 1.96)), (0.020, 0.032, 0.030, 0.019, 0.005)),
)
wisp_mesh("Smoke_Shoulder_L", left_strands, "chest", SMOKE_PARTS["l"], 90)
wisp_mesh("Smoke_Shoulder_R", right_strands, "chest", SMOKE_PARTS["r"], 91)
wisp_mesh("Smoke_Back_Ribbon", back_strands, "chest", SMOKE_PARTS["back"], 92)


def join_parts(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    for mod in list(obj.modifiers):
        if mod.type == "ARMATURE":
            obj.modifiers.remove(mod)
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = RIG
    obj.parent = RIG
    obj.matrix_parent_inverse.identity()
    obj.select_set(False)
    return obj


BODY = join_parts(BODY_PARTS, "CinderStrider_Body")
SMOKE_LEFT = join_parts(SMOKE_PARTS["l"], "Smoke_Shoulder_L")
SMOKE_RIGHT = join_parts(SMOKE_PARTS["r"], "Smoke_Shoulder_R")
SMOKE_BACK = join_parts(SMOKE_PARTS["back"], "Smoke_Back_Ribbon")
BODY["asset"] = "CinderStrider"
BODY["geometry_source"] = "Original procedural low-poly elemental geometry"
BODY["rig_source"] = "Canonical public/assets/characters/series4/Ninja.glb"
BODY["rig_source_sha256"] = NINJA_SHA256
BODY["submission_status"] = "review draft"


def verify_weights(obj):
    names = {g.index: g.name for g in obj.vertex_groups}
    bad = 0
    for vertex in obj.data.vertices:
        inf = [(names[g.group], g.weight) for g in vertex.groups if g.weight > 1e-5]
        if not inf or abs(sum(w for _, w in inf) - 1.0) > 1e-4:
            bad += 1
    if bad:
        raise RuntimeError(f"Invalid weights on {obj.name}: {bad}")


for obj in (BODY, SMOKE_LEFT, SMOKE_RIGHT, SMOKE_BACK):
    verify_weights(obj)

assert len(RIG.data.bones) == 23
scene = bpy.context.scene
scene.render.fps = 30
scene["asset"] = "CinderStrider"
scene["submission_status"] = "review draft"

# Neutral, camera-free review master.
for obj in bpy.context.scene.objects:
    obj.select_set(False)
BODY.select_set(True)
SMOKE_LEFT.select_set(True)
SMOKE_RIGHT.select_set(True)
SMOKE_BACK.select_set(True)
RIG.select_set(True)
PRESENTATION.select_set(True)
bpy.context.view_layer.objects.active = RIG

blend_path = OUT / "CinderStrider.blend"
glb_path = OUT / "CinderStrider.glb"
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


def aim_bone(name, direction, start=None):
    bpy.context.view_layer.update()
    pb = RIG.pose.bones[name]
    head = pb.head.copy() if start is None else Vector(start)
    rot = Vector((0, 1, 0)).rotation_difference(Vector(direction).normalized())
    pb.matrix = Matrix.Translation(head) @ rot.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def pose_for_review():
    aim_bone("upperarm.l", (0.30, -0.03, -0.95))
    aim_bone("upperarm.r", (-0.30, -0.03, -0.95))
    aim_bone("lowerarm.l", (0.58, -0.12, -0.80))
    aim_bone("lowerarm.r", (-0.58, -0.12, -0.80))
    aim_bone("wrist.l", (0.70, -0.16, -0.70))
    aim_bone("wrist.r", (-0.70, -0.16, -0.70))
    aim_bone("hand.l", (0.60, -0.28, -0.75))
    aim_bone("hand.r", (-0.60, -0.28, -0.75))


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_review_scene():
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.35

    world = bpy.data.worlds.new("Review_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.018, 0.023, 0.030, 1)
    background.inputs["Strength"].default_value = 0.24

    ground_mat = make_material("REVIEW_Ground_Material", (0.038, 0.045, 0.046), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.005))
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
        look_at(obj, (0, 0, 1.25))

    area("REVIEW_ONLY_Key", (-2.6, -3.8, 4.2), 480, 3.0, (1.0, 0.69, 0.43))
    area("REVIEW_ONLY_Fill", (3.2, -1.8, 2.8), 220, 2.6, (0.46, 0.62, 1.0))
    area("REVIEW_ONLY_Rim", (0.7, 3.5, 3.6), 320, 2.2, (1.0, 0.40, 0.17))

    camera_data = bpy.data.cameras.new("Review_Camera")
    camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.90
    scene.camera = camera
    return camera


pose_for_review()
camera = add_review_scene()
for label, location in (
    ("front", (0, -5.2, 1.32)),
    ("side", (5.2, 0, 1.32)),
    ("back", (0, 5.2, 1.32)),
):
    camera.location = location
    look_at(camera, (0, 0, 1.27))
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", label, flush=True)

triangles = sum(len(p.vertices) - 2 for p in BODY.data.polygons)
print("BUILT", glb_path, flush=True)
print("BODY_TRIANGLES", triangles, flush=True)
print("BONES", len(RIG.data.bones), flush=True)
print("MATERIALS", len(bpy.data.materials), flush=True)
print("BUILD_COMPLETE", flush=True)
sys.stdout.flush()
sys.stderr.flush()
os._exit(0)
