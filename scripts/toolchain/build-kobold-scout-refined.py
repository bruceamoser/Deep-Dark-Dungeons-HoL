"""Rebuild the scout's reptilian silhouette on the preserved wave-01 rig.

Usage: blender -b --python build-kobold-scout-refined.py -- PRIVATE_OUTPUT
"""

import importlib.util
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


worker_path = Path(__file__).parent / "creature-workers/kobold-tunnel-scout.py"
loader = importlib.util.spec_from_file_location("kobold_scout_donor", worker_path)
donor = importlib.util.module_from_spec(loader)
loader.loader.exec_module(donor)


def loft(name, rings, material):
    """Build a continuous head surface from front-to-back sections in rest space."""
    sides = 12
    vertices = []
    for y, z, width, depth in rings:
        for side in range(sides):
            angle = math.tau * side / sides
            x = width * math.cos(angle)
            height = depth * math.sin(angle)
            vertices.append((x, y, z + height))
    faces = [tuple(range(sides))]
    for index in range(len(rings) - 1):
        lower = sides * index
        upper = lower + sides
        for side in range(sides):
            following = (side + 1) % sides
            faces.append((lower + side, upper + side, upper + following, lower + following))
    faces.append(tuple(reversed(range(len(vertices) - sides, len(vertices)))))
    return donor.mesh_object(name, vertices, faces, material, smooth=True)


def recess_eye(skull, center, angle):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=center)
    cutter = bpy.context.object
    cutter.scale = (.113, .095, .083)
    cutter.rotation_euler.z = angle
    donor.select_only(skull)
    socket = skull.modifiers.new("Carved orbital recess", "BOOLEAN")
    socket.operation = "DIFFERENCE"
    socket.solver = "EXACT"
    socket.object = cutter
    count = len(skull.data.polygons)
    bpy.ops.object.modifier_apply(modifier=socket.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    if len(skull.data.polygons) <= count:
        raise RuntimeError("Eye pocket missed the sculpted skull")


def refined_head(rig, materials):
    skin, dark, throat = (materials[name] for name in ("skin", "dark", "belly"))
    donor.ellipsoid("Scaled neck", (0, .008, 1.31), (.17, .15, .20), skin, rig, "head")
    skull = loft("Continuous wedge-shaped skull", [
        (-.677, 1.426, .089, .043),
        (-.626, 1.444, .127, .069),
        (-.477, 1.463, .149, .088),
        (-.338, 1.493, .184, .126),
        (-.205, 1.534, .242, .164),
        (-.065, 1.549, .277, .192),
        (.074, 1.54, .260, .184),
        (.194, 1.516, .185, .133),
        (.235, 1.496, .084, .076),
    ], skin)
    jaw = loft("Pale tapered underjaw", [
        (-.653, 1.371, .081, .014),
        (-.592, 1.364, .112, .025),
        (-.445, 1.369, .129, .037),
        (-.285, 1.383, .169, .052),
        (-.134, 1.405, .211, .065),
        (.015, 1.416, .204, .062),
        (.103, 1.406, .117, .044),
    ], throat)
    donor.skin_rigid(jaw, rig, "head")
    donor.ellipsoid("Throat", (0, -.137, 1.319), (.13, .060, .125), throat, rig, "head")
    for side in (-1, 1):
        center = Vector((side*.202, -.258, 1.552))
        outward = Vector((side*.64, -.768, 0)).normalized()
        angle = side * .695
        rotation = (0, 0, angle)
        recess_eye(skull, center, angle)
        donor.ellipsoid("Dark lining in carved socket", center - outward*.040,
                        (.103, .049, .074), dark, rig, "head",
                        subdivisions=2, rotation=rotation)
        donor.ellipsoid("Inset amber iris", center - outward*.026,
                        (.080, .039, .058), materials["gold"], rig, "head",
                        subdivisions=3, rotation=rotation)
        donor.ellipsoid("Slit pupil", center + outward*.011,
                        (.013, .010, .045), dark, rig, "head",
                        subdivisions=2, rotation=rotation)
        brow = [(side*.126, -.336, 1.591), (side*.213, -.278, 1.632),
                (side*.266, -.152, 1.626)]
        donor.curve_tube("Swept brow ridge", [Vector(p) for p in brow],
                         .025, skin, rig, "head", sides=7)
        cheek = [(side*.208, -.138, 1.442), (side*.257, -.021, 1.438),
                 (side*.292, .162, 1.493), (side*.397, .292, 1.489),
                 (side*.279, .162, 1.541), (side*.384, .272, 1.581),
                 (side*.247, .117, 1.595)]
        fin = donor.mesh_object("Cheek fin", cheek,
                                [(0,1,2),(0,2,4),(0,4,6),(2,3,4),(4,5,6)],
                                dark, smooth=False)
        donor.skin_rigid(fin, rig, "head")
        donor.ellipsoid("Inset nostril", (side*.075, -.619, 1.483),
                        (.020, .027, .012), dark, rig, "head", subdivisions=1)
        donor.cone_between("Corner fang", (side*.116, -.511, 1.392),
                           (side*.121, -.521, 1.334), .017, .002,
                           materials["ivory"], rig, "head", vertices=6)
        horn_points = [Vector((side*x, y, z)) for x,y,z in [
            (.173, .046, 1.662), (.216, .171, 1.764), (.261, .325, 1.821),
            (.308, .454, 1.827), (.345, .557, 1.801),
        ]]
        horn = donor.swept_tube("Swept horn", horn_points, [.067,.055,.040,.022,.003],
                                materials["leather"], sides=8)
        donor.skin_rigid(horn, rig, "head")
    donor.skin_rigid(skull, rig, "head")

original_gear = donor.add_clothing_and_gear
grip = Vector((-.885, -.055, 1.09))
launcher_rotation = Matrix.Rotation(-math.pi / 2, 3, "Z")
launcher_length = .78
launcher_parts = (
    "Brass_Dart_Launcher_Barrel",
    "Dart_Launcher_Dark_Bore",
    "Launcher_Wooden_Grip",
    "Launcher_Trigger_Guard",
    "Launcher_Side_Drum",
    "Loaded_Dart",
)


def launcher_fit(point):
    offset = point - grip
    offset.y *= launcher_length
    return grip + launcher_rotation @ offset


def fit_gear(rig, materials):
    original_gear(rig, materials)
    for name in launcher_parts:
        obj = bpy.data.objects[name]
        inverse = obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            point = obj.matrix_world @ vertex.co
            vertex.co = inverse @ launcher_fit(point)
    # Keep the loaded dart separate when the legacy builder joins the body.
    dart = bpy.data.objects["Loaded_Dart"]
    world = dart.matrix_world.copy()
    dart.parent = None
    dart.matrix_world = world


def restore_held_dart(_materials):
    rig = bpy.data.objects["KoboldScout_Rig"]
    dart = bpy.data.objects["Loaded_Dart"]
    world = dart.matrix_world.copy()
    dart.parent = rig
    dart.matrix_world = world
    muzzle = bpy.data.objects.new("ScoutDartMuzzle", None)
    bpy.context.collection.objects.link(muzzle)
    muzzle.parent = rig
    muzzle.parent_type = "BONE"
    muzzle.parent_bone = "hand.r"
    bpy.context.view_layer.update()
    muzzle_point = launcher_fit(Vector((-.885, -.481, 1.09)))
    muzzle_axis = launcher_rotation @ Vector((0, -1, 0))
    muzzle.matrix_world = (
        Matrix.Translation(muzzle_point)
        @ muzzle_axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    )


donor.OUTPUT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
donor.OUTPUT.mkdir(parents=True, exist_ok=True)
donor.TAIL_POINTS = [Vector(p) for p in [
    (0, .16, .58), (.09, .46, .55), (.19, .77, .43),
    (.16, 1.08, .34), (.32, 1.33, .36),
]]
donor.add_head = refined_head
donor.add_clothing_and_gear = fit_gear
donor.add_render_setup = restore_held_dart
donor.render_views = lambda camera: None
donor.main()
