"""Build the StoneKnuckle review submission.

Run with:
    blender --background --factory-startup --threads 4 --python build.py

The shared Ninja rig is imported read-only. All visible character geometry in
the exported asset is original procedural geometry created by this script.
"""

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "test-results/asset-workers/stone-knuckle"
SOURCE_RIG = ROOT / "public/assets/characters/series4/Ninja.glb"
OUT.mkdir(parents=True, exist_ok=True)

random.seed(104729)
RNG = random.Random(104729)


def make_material(name, color, roughness=0.86, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1.0)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 2.2
    return mat


def clean_start():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_RIG))

    rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    rig.name = "Rig_Medium"
    rig.data.name = "Rig_Medium"

    # Remove every donor render mesh and source-only display helper. Custom bone
    # shapes are never part of the authored render body.
    for obj in list(bpy.data.objects):
        if obj != rig:
            bpy.data.objects.remove(obj, do_unlink=True)
    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None

    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    return rig


RIG = clean_start()
EXPECTED_BONES = {
    "root", "hips", "spine", "chest",
    "upperarm.l", "lowerarm.l", "wrist.l", "hand.l", "handslot.l", "head",
    "upperarm.r", "lowerarm.r", "wrist.r", "hand.r", "handslot.r",
    "upperleg.r", "lowerleg.r", "foot.r", "toes.r",
    "upperleg.l", "lowerleg.l", "foot.l", "toes.l",
}
actual_bones = {bone.name for bone in RIG.data.bones}
if actual_bones != EXPECTED_BONES:
    raise RuntimeError(f"Unexpected donor bones: {sorted(actual_bones ^ EXPECTED_BONES)}")


STONE = make_material("Stone_Plate", (0.32, 0.255, 0.155), 0.92)
STONE_LIGHT = make_material("Stone_Light", (0.46, 0.375, 0.225), 0.90)
STONE_DARK = make_material("Stone_Shadow", (0.145, 0.125, 0.092), 0.95)
JOINT = make_material("Joint_Stone", (0.052, 0.046, 0.038), 0.98)
MOSS = make_material("Moss_Patch", (0.105, 0.165, 0.038), 1.0)
EYE = make_material(
    "Eye_Amber",
    (0.90, 0.205, 0.012),
    0.34,
    emission=(1.0, 0.105, 0.005),
)

AUTHORED = []


def attach(obj, bone_name):
    if bone_name not in RIG.data.bones:
        raise ValueError(f"Missing intended bone {bone_name}")

    obj.parent = RIG
    obj.matrix_parent_inverse = RIG.matrix_world.inverted()
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.new(name="Armature", type="ARMATURE")
    modifier.object = RIG
    modifier.use_vertex_groups = True
    AUTHORED.append(obj)
    return obj


def rock(
    name,
    loc,
    scale,
    bone,
    material,
    rot=(0.0, 0.0, 0.0),
    subdiv=1,
    rough=0.075,
    stretch_noise=0.0,
):
    """Create one flattened, deterministic low-poly boulder."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=1.0, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name

    for vertex in obj.data.vertices:
        unit = vertex.co.normalized()
        radial = 1.0 + RNG.uniform(-rough, rough)
        jitter = Vector((
            RNG.uniform(-stretch_noise, stretch_noise),
            RNG.uniform(-stretch_noise, stretch_noise),
            RNG.uniform(-stretch_noise, stretch_noise),
        ))
        vertex.co = unit * radial + jitter

    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = scale
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.select_set(False)
    return attach(obj, bone)


def pebble_chain(prefix, points, radii, bone, material, alternating=True):
    for index, (point, radius) in enumerate(zip(points, radii)):
        mat = material
        if alternating and index % 3 == 1:
            mat = STONE_DARK
        rock(
            f"{prefix}_{index:02d}",
            point,
            (radius, radius * 0.90, radius * 0.82),
            bone,
            mat,
            rot=(RNG.uniform(-0.7, 0.7), RNG.uniform(-0.7, 0.7), RNG.uniform(-math.pi, math.pi)),
            subdiv=1,
            rough=0.09,
        )


# Dense torso core: broad chest plate over a smaller articulated belly.
rock("Core_Chest", (0.0, -0.01, 1.055), (0.405, 0.325, 0.365), "chest", STONE, subdiv=2, rough=0.045)
rock("Chest_Face_Plate", (0.0, -0.282, 1.085), (0.292, 0.135, 0.285), "chest", STONE_LIGHT,
     rot=(0.08, 0.0, 0.0), subdiv=2, rough=0.055)
rock("Core_Belly", (0.0, -0.005, 0.785), (0.355, 0.285, 0.285), "spine", STONE_DARK,
     subdiv=2, rough=0.065)
rock("Belly_Front_Plate", (0.0, -0.245, 0.795), (0.265, 0.105, 0.218), "spine", STONE,
     rot=(-0.08, 0.0, 0.0), subdiv=1, rough=0.06)
rock("Pelvis_Core", (0.0, 0.005, 0.585), (0.34, 0.245, 0.215), "hips", STONE_DARK,
     subdiv=2, rough=0.06)
rock("Back_Cap", (0.0, 0.275, 1.105), (0.34, 0.115, 0.31), "chest", STONE_DARK,
     rot=(-0.08, 0.0, 0.0), subdiv=1, rough=0.08)

for side, sx in (("l", 1.0), ("r", -1.0)):
    rock(f"Rib_Upper_{side}", (sx * 0.285, -0.168, 0.970), (0.145, 0.145, 0.205),
         "chest", STONE, rot=(0.1, sx * 0.15, sx * 0.22), subdiv=1, rough=0.07)
    rock(f"Rib_Lower_{side}", (sx * 0.275, -0.160, 0.765), (0.130, 0.125, 0.160),
         "spine", STONE_LIGHT, rot=(-0.1, sx * 0.10, -sx * 0.2), subdiv=1, rough=0.08)

pebble_chain(
    "Collar_Joints",
    [(-0.235, -0.102, 1.252), (-0.165, -0.160, 1.285), (-0.082, -0.178, 1.304),
     (0.0, -0.181, 1.305), (0.082, -0.178, 1.304), (0.165, -0.160, 1.285),
     (0.235, -0.102, 1.252)],
    [0.055, 0.052, 0.048, 0.047, 0.048, 0.052, 0.055],
    "chest", JOINT,
)
pebble_chain(
    "Waist_Joints",
    [(-0.225, -0.190, 0.650), (-0.130, -0.245, 0.635), (0.0, -0.260, 0.625),
     (0.130, -0.245, 0.635), (0.225, -0.190, 0.650)],
    [0.052, 0.050, 0.046, 0.050, 0.052],
    "hips", JOINT,
)

# Broad shoulders overlap the chest core; joint stones remain visibly darker.
for side, sx in (("l", 1.0), ("r", -1.0)):
    rock(f"Shoulder_Mass_{side}", (sx * 0.425, 0.015, 1.225), (0.265, 0.265, 0.250),
         "chest", STONE, rot=(0.08, sx * 0.16, sx * 0.18), subdiv=2, rough=0.065)
    rock(f"Shoulder_Outer_Plate_{side}", (sx * 0.510, -0.01, 1.175), (0.175, 0.205, 0.215),
         "upperarm." + side, STONE_LIGHT, rot=(0.0, sx * 0.20, sx * 0.25),
         subdiv=1, rough=0.07)

    # The arm bones are preserved in their donor T-pose. Visible stones align
    # with that rest skeleton and are rigidly bound to the intended limb bone.
    rock(f"Upperarm_FistSide_{side}", (sx * 0.345, 0.0, 1.110), (0.175, 0.205, 0.192),
         "upperarm." + side, STONE, rot=(0.02, sx * 0.12, sx * 0.1),
         subdiv=1, rough=0.07)
    for i, (dx, dz, radius) in enumerate(((0.012, 0.095, 0.060), (0.020, -0.075, 0.052))):
        rock(f"Upperarm_Pebble_{side}_{i}", (sx * (0.323 + dx), -0.172, 1.105 + dz),
             (radius, radius * 0.75, radius), "upperarm." + side, STONE_LIGHT,
             subdiv=1, rough=0.08)

    rock(f"Elbow_Joint_{side}", (sx * 0.462, 0.002, 1.105), (0.095, 0.115, 0.100),
         "lowerarm." + side, JOINT, rot=(0.2, 0.0, 0.1), subdiv=1, rough=0.105)
    rock(f"Forearm_Main_{side}", (sx * 0.590, 0.0, 1.100), (0.170, 0.205, 0.185),
         "lowerarm." + side, STONE_DARK, rot=(0.0, sx * 0.09, -sx * 0.06),
         subdiv=2, rough=0.065)
    rock(f"Forearm_Plate_{side}", (sx * 0.650, -0.155, 1.105), (0.125, 0.095, 0.150),
         "lowerarm." + side, STONE_LIGHT, rot=(0.0, sx * 0.09, -sx * 0.06),
         subdiv=1, rough=0.065)
    rock(f"Wrist_Joint_{side}", (sx * 0.752, 0.0, 1.105), (0.067, 0.092, 0.085),
         "hand." + side, JOINT, subdiv=1, rough=0.09)

    # Oversized blunt hands. The three forward stones make the "pebble fist"
    # readable even when the arms are lowered by animation.
    rock(f"Hand_Palm_{side}", (sx * 0.855, -0.005, 1.105), (0.205, 0.245, 0.215),
         "hand." + side, STONE, rot=(0.06, sx * 0.08, sx * 0.12),
         subdiv=2, rough=0.06)
    knuckles = ((0.930, -0.165, 1.205), (0.975, -0.195, 1.105), (0.930, -0.165, 1.000))
    for i, (x, y, z) in enumerate(knuckles):
        rock(f"Knuckle_{side}_{i}", (sx * x, y, z), (0.105, 0.120, 0.088),
             "hand." + side, STONE_LIGHT, rot=(0.0, sx * 0.1, sx * (0.2 - i * 0.18)),
             subdiv=1, rough=0.075)
    rock(f"Thumb_{side}", (sx * 0.885, -0.220, 0.985), (0.105, 0.135, 0.105),
         "hand." + side, STONE, rot=(0.2, sx * -0.2, sx * 0.3),
         subdiv=1, rough=0.075)

# Squat, splayed legs with rounded knee stones and slab-like planted feet.
for side, sx in (("l", 1.0), ("r", -1.0)):
    rock(f"Hip_Joint_{side}", (sx * 0.205, -0.005, 0.505), (0.115, 0.125, 0.110),
         "upperleg." + side, JOINT, subdiv=1, rough=0.09)
    rock(f"Thigh_Main_{side}", (sx * 0.225, -0.020, 0.405), (0.205, 0.230, 0.230),
         "upperleg." + side, STONE, rot=(0.05, sx * -0.08, sx * 0.12),
         subdiv=2, rough=0.065)
    pebble_chain(
        f"Thigh_Pebbles_{side}",
        [(sx * 0.285, -0.205, 0.465), (sx * 0.298, -0.225, 0.360)],
        [0.060, 0.055],
        "upperleg." + side,
        STONE_LIGHT,
    )
    rock(f"Knee_Joint_{side}", (sx * 0.225, -0.210, 0.275), (0.105, 0.095, 0.095),
         "lowerleg." + side, JOINT, subdiv=1, rough=0.10)
    rock(f"Shin_Plate_{side}", (sx * 0.245, -0.185, 0.205), (0.185, 0.165, 0.185),
         "lowerleg." + side, STONE_DARK, rot=(-0.08, sx * 0.06, -sx * 0.1),
         subdiv=1, rough=0.075)
    rock(f"Ankle_Joint_{side}", (sx * 0.255, -0.155, 0.095), (0.082, 0.090, 0.065),
         "foot." + side, JOINT, subdiv=1, rough=0.09)
    rock(f"Foot_Slab_{side}", (sx * 0.265, -0.185, 0.118), (0.285, 0.335, 0.112),
         "foot." + side, STONE, rot=(0.0, sx * -0.03, sx * 0.08),
         subdiv=2, rough=0.055)
    toe_x = (sx * 0.115, sx * 0.260, sx * 0.405)
    toe_sizes = ((0.075, 0.115, 0.060), (0.090, 0.135, 0.065), (0.078, 0.110, 0.056))
    for i, (x, size) in enumerate(zip(toe_x, toe_sizes)):
        rock(f"Toe_{side}_{i}", (x, -0.390, 0.055), size, "toes." + side,
             STONE_LIGHT if i != 1 else STONE, rot=(0.0, 0.0, sx * (i - 1) * 0.1),
             subdiv=1, rough=0.07)

# Heavy central face, angular brows, deeply shadowed sockets, and an amber gaze.
pebble_chain(
    "Neck_Joints",
    [(-0.190, -0.045, 1.235), (-0.115, -0.125, 1.255), (0.0, -0.155, 1.265),
     (0.115, -0.125, 1.255), (0.190, -0.045, 1.235)],
    [0.050, 0.047, 0.046, 0.047, 0.050],
    "head", JOINT,
)
rock("Head_Crag", (0.0, -0.005, 1.390), (0.305, 0.275, 0.290),
     "head", STONE, rot=(0.02, 0.0, 0.02), subdiv=2, rough=0.055)
rock("Face_Plate", (0.0, -0.247, 1.385), (0.235, 0.100, 0.235),
     "head", STONE_LIGHT, rot=(0.03, 0.0, 0.0), subdiv=2, rough=0.055)
rock("Jaw_Block", (0.0, -0.275, 1.255), (0.170, 0.09, 0.115),
     "head", STONE, rot=(0.08, 0.0, 0.0), subdiv=1, rough=0.075)

for side, sx in (("l", 1.0), ("r", -1.0)):
    rock(f"Eye_Socket_{side}", (sx * 0.094, -0.334, 1.420), (0.083, 0.033, 0.062),
         "head", JOINT, rot=(0.0, 0.0, sx * 0.11), subdiv=1, rough=0.035)
    rock(f"Eye_Glow_{side}", (sx * 0.094, -0.360, 1.418), (0.043, 0.019, 0.027),
         "head", EYE, rot=(0.0, 0.0, sx * 0.08), subdiv=1, rough=0.015)
    rock(f"Eye_Pupil_{side}", (sx * 0.094, -0.375, 1.418), (0.010, 0.008, 0.019),
         "head", JOINT, subdiv=1, rough=0.008)
    rock(f"Brow_Ridge_{side}", (sx * 0.105, -0.340, 1.493), (0.125, 0.042, 0.050),
         "head", STONE_DARK, rot=(0.0, sx * 0.06, sx * -0.20),
         subdiv=1, rough=0.055)

rock("Nose_Bridge", (0.0, -0.348, 1.365), (0.065, 0.050, 0.105),
     "head", STONE_DARK, rot=(0.08, 0.0, 0.0), subdiv=1, rough=0.07)
rock("Mouth_Gap", (0.0, -0.354, 1.275), (0.115, 0.025, 0.027),
     "head", JOINT, rot=(0.02, 0.0, 0.0), subdiv=1, rough=0.02)

# Sparse moss patches, flattened against major upward/back surfaces.
moss_specs = (
    ("Moss_Head_Crown", (-0.085, 0.020, 1.655), (0.150, 0.135, 0.025), "head", (0.1, 0.0, 0.2)),
    ("Moss_Head_Back", (0.105, 0.230, 1.475), (0.105, 0.025, 0.100), "head", (0.4, 0.0, 0.2)),
    ("Moss_Shoulder_L", (-0.430, -0.010, 1.445), (0.125, 0.105, 0.025), "chest", (0.0, -0.12, 0.2)),
    ("Moss_Shoulder_R", (0.445, 0.055, 1.435), (0.115, 0.095, 0.025), "chest", (0.0, 0.15, -0.1)),
    ("Moss_Back", (-0.100, 0.305, 1.165), (0.145, 0.025, 0.115), "chest", (0.5, 0.0, 0.15)),
    ("Moss_Arm_L", (0.600, -0.185, 1.205), (0.095, 0.030, 0.070), "lowerarm.l", (0.3, 0.0, 0.2)),
    ("Moss_Arm_R", (-0.570, -0.180, 1.180), (0.080, 0.025, 0.065), "lowerarm.r", (0.3, 0.0, -0.2)),
    ("Moss_Foot_L", (0.205, -0.210, 0.165), (0.095, 0.090, 0.025), "foot.l", (0.0, 0.0, 0.2)),
    ("Moss_Foot_R", (-0.320, -0.175, 0.155), (0.075, 0.080, 0.024), "foot.r", (0.0, 0.0, -0.2)),
)
for name, loc, scale, bone, rot in moss_specs:
    rock(name, loc, scale, bone, MOSS, rot=rot, subdiv=1, rough=0.10, stretch_noise=0.025)


def join_body():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in AUTHORED:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = AUTHORED[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "StoneKnuckle_Body"
    body.data.name = "StoneKnuckle_Body"

    # Consolidate identical armature modifiers left by joining rigid pieces.
    for modifier in list(body.modifiers):
        if modifier.type == "ARMATURE":
            body.modifiers.remove(modifier)
    armature = body.modifiers.new(name="Armature", type="ARMATURE")
    armature.object = RIG
    body.parent = RIG
    body.matrix_parent_inverse = RIG.matrix_world.inverted()
    body["asset"] = "StoneKnuckle"
    body["geometry_source"] = "Original procedural boulder geometry"
    body["rig_source"] = "CC0 KayKit Ninja.glb (armature only)"
    body["submission_status"] = "review draft"
    return body


BODY = join_body()
RIG["asset"] = "StoneKnuckle"
RIG["rig_source"] = "CC0 KayKit Ninja.glb (23 bones preserved)"
RIG["submission_status"] = "review draft"

# Verify the authored skin before export.
group_names = {group.index: group.name for group in BODY.vertex_groups}
bad_weights = []
for vertex in BODY.data.vertices:
    influences = [(group_names[g.group], g.weight) for g in vertex.groups if g.weight > 0.00001]
    total = sum(weight for _, weight in influences)
    if not influences or abs(total - 1.0) > 0.0001:
        bad_weights.append((vertex.index, influences, total))
if bad_weights:
    raise RuntimeError(f"Invalid skin weights on {len(bad_weights)} vertices")

# Give the authored object a useful edit-mode origin without moving geometry.
bpy.context.view_layer.objects.active = BODY
bpy.ops.object.origin_set(type="ORIGIN_CURSOR", center="MEDIAN")

scene = bpy.context.scene
scene.render.fps = 30
scene["asset"] = "StoneKnuckle"
scene["submission_status"] = "review draft"

bpy.ops.object.select_all(action="DESELECT")
BODY.select_set(True)
RIG.select_set(True)
bpy.context.view_layer.objects.active = RIG

blend_path = OUT / "StoneKnuckle.blend"
glb_path = OUT / "StoneKnuckle.glb"
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


def aim_bone(bone_name, direction, start=None):
    """Aim a pose bone so its local Y axis follows the supplied vector."""
    bpy.context.view_layer.update()
    pose_bone = RIG.pose.bones[bone_name]
    head = pose_bone.head.copy() if start is None else Vector(start)
    target = Vector(direction).normalized()
    rotation = Vector((0.0, 1.0, 0.0)).rotation_difference(target)
    pose_bone.matrix = Matrix.Translation(head) @ rotation.to_matrix().to_4x4()
    bpy.context.view_layer.update()


def pose_for_review():
    # Lower the T-pose arms into the squat guard stance shown in the reference.
    # This is render-only; exported rest transforms remain exactly donor values.
    aim_bone("upperarm.l", (0.72, -0.05, -0.69))
    aim_bone("upperarm.r", (-0.72, -0.05, -0.69))
    aim_bone("lowerarm.l", (0.78, -0.10, -0.62))
    aim_bone("lowerarm.r", (-0.78, -0.10, -0.62))


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_render_scene():
    scene = bpy.context.scene
    # Headless Eevee requires an EGL surface in this worker. Cycles CPU is
    # deterministic, offline, and keeps within the task's 16-sample ceiling.
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
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.55

    world = bpy.data.worlds.new("Review World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.060, 0.065, 1.0)
    background.inputs["Strength"].default_value = 0.28

    ground_mat = make_material("Review_Ground", (0.075, 0.082, 0.080), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.0, -0.002))
    ground = bpy.context.object
    ground.name = "REVIEW_ONLY_Ground"
    ground.data.materials.append(ground_mat)

    def area_light(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        look_at(obj, (0.0, 0.0, 0.9))
        return obj

    area_light("REVIEW_ONLY_Key", (-2.8, -3.8, 4.3), 430.0, 3.0, (1.0, 0.82, 0.62))
    area_light("REVIEW_ONLY_Fill", (3.4, -2.0, 2.4), 180.0, 2.5, (0.52, 0.68, 1.0))
    area_light("REVIEW_ONLY_Rim", (0.8, 3.3, 3.2), 280.0, 2.0, (0.72, 0.82, 1.0))

    camera_data = bpy.data.cameras.new("Review Camera")
    camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.55
    camera.data.lens = 52.0
    scene.camera = camera
    return camera


pose_for_review()
camera = add_render_scene()
render_specs = (
    ("front", (0.0, -5.0, 1.10), (0.0, 0.0, 0.86)),
    ("side", (5.0, 0.0, 1.02), (0.0, 0.0, 0.83)),
    ("back", (0.0, 5.0, 1.10), (0.0, 0.0, 0.86)),
)
for label, location, target in render_specs:
    camera.location = location
    look_at(camera, target)
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", label, scene.render.filepath)

print("BUILT", glb_path, flush=True)
print("TRIANGLES", sum(len(p.vertices) - 2 for p in BODY.data.polygons), flush=True)
print("MATERIAL_SLOTS", len(BODY.data.materials), flush=True)
print("BONES", len(RIG.data.bones), flush=True)
print("BUILD_COMPLETE", flush=True)
os._exit(0)
