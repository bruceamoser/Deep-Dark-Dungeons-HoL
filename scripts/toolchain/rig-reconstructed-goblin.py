"""Fit a rig and held equipment to an image-derived goblin or kobold."""
import argparse
import heapq
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("weapon_source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--role", choices=("boss", "spearhand", "scrapper", "firestarter", "rattlechanter", "smoke-slinger", "tunnel-scout", "trapkeeper"), default="boss")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
source, weapon_source, output = args.source, args.weapon_source, args.output
spearhand = args.role == "spearhand"
scrapper = args.role == "scrapper"
firestarter = args.role == "firestarter"
rattle = args.role == "rattlechanter"
slinger = args.role == "smoke-slinger"
scout = args.role == "tunnel-scout"
trap = args.role == "trapkeeper"
kobold = scout or trap
lean = spearhand or scrapper or firestarter or rattle or slinger or kobold
ancestry = "Kobold" if kobold else "Goblin"
creature_name = ancestry + " " + args.role.replace("-", " ").title()
slug = ancestry.lower() + "-" + args.role
height = {"boss": 1.65, "spearhand": 1.57, "scrapper": 1.50, "firestarter": 1.52, "rattlechanter": 1.56, "smoke-slinger": 1.53, "tunnel-scout": 1.68, "trapkeeper": 1.64}[args.role]
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
body, = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
body.data.transform(body.matrix_world)
body.parent = None
body.matrix_world = Matrix.Identity(4)
rotation = Matrix.Rotation(math.pi, 4, "Z")
body.data.transform(rotation)
lo = Vector([min(v.co[i] for v in body.data.vertices) for i in range(3)])
hi = Vector([max(v.co[i] for v in body.data.vertices) for i in range(3)])
factor = height / (hi.z - lo.z)
offset = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
if kobold:
    feet = [v.co for v in body.data.vertices if v.co.z < lo.z+.14*(hi.z-lo.z)]
    toe = min(point.y for point in feet)
    feet = [point for point in feet if point.y < toe+.24*(hi.z-lo.z)]
    offset.x = (min(point.x for point in feet)+max(point.x for point in feet))/2
    offset.y = (min(point.y for point in feet)+max(point.y for point in feet))/2+.055/factor
body.data.transform(Matrix.Diagonal((factor, factor, factor, 1)) @ Matrix.Translation(-offset))
body.name = f"{creature_name} reconstructed anatomy"
if spearhand or scrapper:
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    degenerate = [face for face in mesh.faces if face.calc_area() <= 1e-12]
    assert len(degenerate) == 6, f"Inspect the {creature_name} reconstruction before changing topology"
    bmesh.ops.delete(mesh, geom=degenerate, context="FACES")
    mesh.to_mesh(body.data)
    mesh.free()


rig = bpy.data.objects.new(creature_name, bpy.data.armatures.new(creature_name))
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
segments = {}


def chain(names, points, parent=None):
    fit_scale = height/1.57 if lean else 1
    for name, start, end in zip(names, points, points[1:]):
        start = Vector(start)*fit_scale
        end = Vector(end)*fit_scale
        bone = rig.data.edit_bones.new(name)
        bone.head, bone.tail = start, end
        if parent:
            bone.parent = rig.data.edit_bones[parent]
        segments[name] = (np.array(start), np.array(end))
        parent = name


chain(["Root"], [(0, 0, 0), (0, 0, .12)])
if lean:
    torso = [(0, .04, .72), (0, .025, .82), (0, .01, .95),
             (0, 0, 1.17), (0, -.025, 1.24), (0, -.025, 1.55)]
    if trap:
        torso = [(0, .153, .72), (0, .136, .83), (0, .132, .96),
                 (0, .107, 1.16), (0, .043, 1.29), (0, .011, 1.54)]
    chain(["Pelvis", "Spine", "Chest", "Neck", "Head"], torso, "Root")
    for side, sign in [("R", -1), ("L", 1)]:
        if rattle:
            chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
                  [(sign*.188, .012, 1.09), (sign*.337, .015, .925),
                   (sign*.465, -.069, .752), (sign*.495, -.106, .664)], "Chest")
        elif trap:
            chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
                  [(sign*.202, .164, 1.11), (sign*.317, .134, .985),
                   (sign*.444, .051, .843), (sign*.529, .012, .694)], "Chest")
        elif scout:
            chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
                  [(sign*.15, .012, 1.11), (sign*.257, -.006, .97),
                   (sign*.365, -.039, .835), (sign*.414, -.064, .736)], "Chest")
        elif slinger:
            chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
                  [(sign*.16, .012, 1.10), (sign*.30, -.005, .936),
                   (sign*.446, -.04, .793), (sign*.489, -.085, .706)], "Chest")
        else:
            chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
                  [(sign*.235, .018, 1.11), (sign*.402, -.02, .945),
                   (sign*.552, -.075, .778), (sign*.655, -.10, .62)], "Chest")
        leg = [(sign*.135, .035, .72), (sign*.19, -.025, .45),
               (sign*.242, .02, .126), (sign*.26, -.13, .028)]
        if trap:
            leg = [(sign*.133, .135, .71), (sign*.200, .051, .45),
                   (sign*.256, .070, .128), (sign*.264, -.132, .037)]
        chain([side + name for name in ("Thigh", "Shin", "Foot")], leg, "Pelvis")
        chain([side+"Coat"], [(sign*.18, .035, .8), (sign*.24, .08, .44)], "Pelvis")
else:
    chain(["Pelvis", "Spine", "Chest", "Neck", "Head"],
          [(0, .045, .74), (0, .04, .89), (0, .035, 1.08),
           (0, .025, 1.31), (0, .005, 1.40), (0, -.025, 1.65)], "Root")
    for side, sign in [("R", -1), ("L", 1)]:
        chain([side + name for name in ("UpperArm", "Forearm", "Hand")],
              [(sign*.29, .035, 1.27), (sign*.45, .005, 1.10),
               (sign*.66, -.095, .934), (sign*.77, -.232, .68)], "Chest")
        chain([side + name for name in ("Thigh", "Shin", "Foot")],
              [(sign*.17, .035, .75), (sign*.22, .035, .42),
               (sign*.25, .055, .13), (sign*.29, -.105, .04)], "Pelvis")
        chain([side+"Coat"], [(sign*.29, .10, .83), (sign*.41, .12, .31)], "Pelvis")
if kobold:
    tail_points = [(0, .131, .684), (.196, .318, .515), (.430, .524, .318),
                   (.692, .711, .174), (.912, .804, .252)]
    if trap:
        tail_points = [(0, .193, .700), (.181, .320, .558), (.400, .447, .388),
                       (.618, .475, .337), (.855, .501, .498)]
    chain(["TailBase", "TailMiddle", "TailOuter", "TailTip"], tail_points, "Pelvis")
bpy.ops.object.mode_set(mode="OBJECT")

positions = np.empty(len(body.data.vertices) * 3, dtype=np.float32)
body.data.vertices.foreach_get("co", positions)
positions = positions.reshape(-1, 3)
x, y, z = positions.T
names = [name for name in segments if name != "Root"]
def wrist_distances():
    # The texture bake duplicates vertices along UV seams. Join coincident
    # positions for the weight calculation without changing the exported mesh.
    points, index = np.unique(np.round(positions, 5), axis=0, return_inverse=True)
    edges = np.empty(len(body.data.edges)*2, dtype=np.int32)
    body.data.edges.foreach_get("vertices", edges)
    pairs = np.unique(np.sort(index[edges.reshape(-1, 2)], axis=1), axis=0)
    lengths = np.linalg.norm(points[pairs[:, 0]]-points[pairs[:, 1]], axis=1)
    neighbors = [[] for point in points]
    for (a, b), length in zip(pairs, lengths):
        if a != b:
            neighbors[a].append((b, length))
            neighbors[b].append((a, length))
    distances = np.full(len(points), np.inf)
    seeds = np.zeros(len(points), dtype=bool)
    for side in ("R", "L"):
        wrist = segments[side+"Hand"][0]
        seeds |= np.linalg.norm(points-wrist, axis=1) < .066
    distances[seeds] = 0
    queue = [(0, i) for i in np.flatnonzero(seeds)]
    while queue:
        cost, current = heapq.heappop(queue)
        if cost > distances[current]:
            continue
        for neighbor, length in neighbors[current]:
            candidate = cost+length
            if candidate < min(.25, distances[neighbor]):
                distances[neighbor] = candidate
                heapq.heappush(queue, (candidate, neighbor))
    return distances[index]


wrist_field = wrist_distances() if rattle or slinger or kobold else None
distance_fields = []
for name in names:
    start, end = segments[name]
    delta = end - start
    projection = np.clip(((positions-start) @ delta)/(delta@delta), 0, 1)
    distance = np.linalg.norm(positions-start-projection[:, None]*delta, axis=1)
    if name.startswith(("L", "R")):
        sign = 1 if name.startswith("L") else -1
        distance += np.maximum(0, -sign*x)*2
    if name.endswith(("UpperArm", "Forearm", "Hand")):
        inner_arm = (.20 if lean else .26) + np.maximum(0, (1.04 if lean else 1.20)-z)*.75
        if scrapper or firestarter:
            inner_arm = .17 + np.maximum(0, 1.04-z)*.65
        if rattle or slinger:
            inner_arm = .411 - np.maximum(0, z-.75)*.78
            distance += np.maximum(0, np.abs(y+.04)-.14)*6 + np.maximum(0, z-1.11)*4
        if kobold:
            inner_arm = .315 - np.maximum(0, z-.80)*.65
            rear_arm = .23 if trap else .08
            distance += np.maximum(0, y-rear_arm)*5 + np.maximum(0, z-1.13)*4
        lower_arm = .54 if rattle or slinger else .50 if scrapper or firestarter else .58
        distance += np.maximum(0, inner_arm-abs(x))*5 + np.maximum(0, lower_arm-z)*3
    elif rattle or slinger:
        outside_arm = np.clip((z-.55)/.055, 0, 1)*np.clip((1.14-z)/.14, 0, 1)
        distance += np.maximum(0, abs(x)-.39)*outside_arm*5
    if not name.endswith(("Forearm", "Hand")):
        distance += np.maximum(0, abs(x)-(.43 if scrapper or firestarter else .49 if lean else .56))*4
    if name.endswith("Coat"):
        distance += np.maximum(0, .26-abs(x))*4 + np.maximum(0, z-.88)*2
    if name in {"Chest", "Spine", "Pelvis"}:
        distance += np.maximum(0, abs(x)-.35)*2
    if name != "Head":
        distance += np.maximum(0, z-(1.23 if lean else 1.38))*4
    else:
        distance += np.maximum(0, (1.17 if lean else 1.33)-z)*3
    if kobold:
        if name.startswith("Tail"):
            tail_front = .19 if trap else .09
            distance += np.maximum(0, tail_front-y)*6 + np.maximum(0, z-.77)*6
        else:
            rear_body = .27 if trap else .17
            distance += np.maximum(0, y-rear_body)*np.clip((.80-z)*12, 0, 1)*4
    if wrist_field is not None:
        wrist_weight = np.clip((.235-wrist_field)/.08, 0, 1)
        if name.endswith(("UpperArm", "Forearm", "Hand")):
            distance = distance*(1-wrist_weight)+wrist_weight*np.linalg.norm(
                positions-start-projection[:, None]*delta, axis=1)
        else:
            distance += .34*wrist_weight
    distance_fields.append(distance)
distances = np.stack(distance_fields, axis=1)
indices = np.argsort(distances, axis=1)[:, :3]
values = np.take_along_axis(distances, indices, axis=1)
weights = np.exp(-((values-values[:, :1])/.035)**2)
weights /= weights.sum(axis=1, keepdims=True)
groups = [body.vertex_groups.new(name=name) for name in names]
for index, (bones, influences) in enumerate(zip(indices, weights)):
    for bone, influence in zip(bones, influences):
        if influence > 1e-6:
            groups[bone].add([index], float(influence), "REPLACE")
body.parent = rig
modifier = body.modifiers.new(f"{creature_name} skeleton", "ARMATURE")
modifier.object = rig

def bind_held_prop(obj, hand):
    obj.vertex_groups.new(name=hand).add(list(range(len(obj.data.vertices))), 1, "REPLACE")
    obj.parent = rig
    obj.modifiers.new("Rigid hand grip", "ARMATURE").object = rig


if kobold:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from reconstructed_kobold_gear import fit_launcher, fit_throw_dart

    hand_start, hand_end = map(Vector, segments["RHand"])
    fit_dart_gear = fit_launcher if scout else fit_throw_dart
    held_props, blade_direction = fit_dart_gear(
        weapon_source, rig, hand_start.lerp(hand_end, .63), bind_held_prop)
elif slinger:
    held_props = []
elif rattle:
    recipe = json.loads(weapon_source.read_text())
    props = {}
    landmarks = {}
    for cfg, hand in zip(recipe["externalParts"][:2], ("RHand", "LHand")):
        existing = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=cfg["path"])
        added = set(bpy.data.objects)-existing
        obj, = [item for item in added if item.type == "MESH"]
        obj.data.transform(obj.matrix_world)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.name = cfg["name"]
        grip = Vector((-.493 if hand == "RHand" else .493, -.104, .677))
        rotation = Matrix.Rotation(math.radians(cfg.get("rotateX", 0)), 4, "X")
        if hand == "LHand":
            rotation = Matrix.Rotation(math.radians(42), 4, "Y") @ rotation
        transform = (Matrix.Translation(grip) @ rotation @ Matrix.Scale(cfg["scale"]*.62, 4)
                     @ Matrix.Translation(-Vector(cfg.get("origin", (0, 0, 0)))))
        obj.data.transform(transform)
        landmarks[hand] = {key: transform @ Vector(point) for key, point in cfg["landmarks"].items()}
        bind_held_prop(obj, hand)
        props[hand] = obj
        for item in added-{obj}:
            bpy.data.objects.remove(item, do_unlink=True)
    held_props = list(props.values())
    muzzle = bpy.data.objects.new("RattlePanMuzzle", None)
    bpy.context.collection.objects.link(muzzle)
    muzzle.parent = rig
    muzzle.parent_type = "BONE"
    muzzle.parent_bone = "LHand"
    bpy.context.view_layer.update()
    muzzle.matrix_world = Matrix.Translation(landmarks["LHand"]["strike"])
else:
    # Fit the owned weapon as a rigid part on the reconstructed right hand.
    before = set(bpy.data.objects)
    if scrapper:
        name = "Scrapper weapon_r gear"
        with bpy.data.libraries.load(str(weapon_source), link=False) as (available, loaded):
            assert name in available.objects, "Missing reviewed scrap knife"
            loaded.objects = [name]
        weapon, = loaded.objects
        bpy.context.collection.objects.link(weapon)
        # The reviewed knife assembly already has its grip at its mesh origin.
        assert max(vertex.co.length for vertex in weapon.data.vertices) < .4
        weapon.modifiers.clear()
        weapon.vertex_groups.clear()
    elif firestarter:
        bpy.ops.import_scene.gltf(filepath=str(weapon_source))
        weapon, = [obj for obj in set(bpy.data.objects)-before if obj.type == "MESH"]
        weapon.data.transform(weapon.matrix_world)
        low = Vector([min(v.co[i] for v in weapon.data.vertices) for i in range(3)])
        high = Vector([max(v.co[i] for v in weapon.data.vertices) for i in range(3)])
        neck = Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z+.78*(high.z-low.z)))
        flask_scale = .27/(high.z-low.z)
        weapon.data.transform(Matrix.Scale(flask_scale, 4) @ Matrix.Translation(-neck))
    else:
        bpy.ops.import_scene.fbx(filepath=str(weapon_source))
        weapon, = [obj for obj in set(bpy.data.objects)-before if obj.type == "MESH"]
        weapon.data.transform(weapon.matrix_world)
    weapon.parent = None
    weapon.matrix_world = Matrix.Identity(4)
    blade_direction = Vector((-.18, -.91, .38) if spearhand else (-.52, -.23, .82)).normalized()
    if firestarter:
        blade_direction = Vector((0, 0, 1))
    blade_rotation = Vector((0, 0, 1)).rotation_difference(blade_direction).to_matrix().to_4x4()
    grip = Vector((-.61, -.095, .694) if lean else (-.733, -.167, .802))
    if scrapper:
        grip = Vector((-.563, -.032, .657))
    if firestarter:
        grip = Vector((-.557, -.067, .713))
    weapon_scale = 1 if scrapper or firestarter else .8
    weapon_height = [vertex.co.z for vertex in weapon.data.vertices]
    weapon.data.transform(Matrix.Translation(grip) @ blade_rotation @ Matrix.Diagonal((weapon_scale, weapon_scale, weapon_scale, 1)))
    weapon_name = {"boss": "officer sword", "spearhand": "spear", "scrapper": "scrap knife", "firestarter": "flask"}[args.role]
    weapon.name = "Firestarter_held_flask" if firestarter else f"{creature_name} {weapon_name}"
    if not scrapper and not firestarter:
        material = bpy.data.materials.new("Held weapon steel")
        material.use_nodes = True
        surface = material.node_tree.nodes.get("Principled BSDF")
        surface.inputs["Base Color"].default_value = (.44, .47, .46, 1)
        surface.inputs["Metallic"].default_value = .63
        surface.inputs["Roughness"].default_value = .34
        weapon.data.materials.clear()
        weapon.data.materials.append(material)
        if spearhand:
            wood = material.copy()
            wood.name = "Weathered spear shaft"
            wood_surface = wood.node_tree.nodes.get("Principled BSDF")
            wood_surface.inputs["Base Color"].default_value = (.20, .085, .032, 1)
            wood_surface.inputs["Metallic"].default_value = 0
            wood_surface.inputs["Roughness"].default_value = .7
            weapon.data.materials.append(wood)
            tip_start = max(weapon_height) - .21*(max(weapon_height)-min(weapon_height))
            for face in weapon.data.polygons:
                if max(weapon_height[index] for index in face.vertices) < tip_start:
                    face.material_index = 1
    weapon.vertex_groups.new(name="RHand").add(list(range(len(weapon.data.vertices))), 1, "REPLACE")
    weapon.parent = rig
    modifier = weapon.modifiers.new("Rigid hand grip", "ARMATURE")
    modifier.object = rig
    for obj in set(bpy.data.objects)-before-{weapon}:
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    held_props = [weapon]


scene = bpy.context.scene
scene.render.fps = 24
rig.animation_data_create()
basis = {bone.name: bone.bone.matrix_local.to_quaternion() for bone in rig.pose.bones}


def orient(name, x=0, y=0, z=0):
    rotation = Euler(tuple(map(math.radians, (x, y, z)))).to_quaternion()
    bone = rig.pose.bones[name]
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = basis[name].inverted() @ rotation @ basis[name]


def pose(clip, t):
    wave = math.sin(math.tau*t)
    pulse = math.sin(math.pi*t)**2
    orient("Chest", x=1.5*wave)
    orient("Head", z=4*wave)
    orient("RUpperArm", y=-13)
    orient("LUpperArm", y=20)
    orient("RForearm", x=-8)
    if kobold:
        for index, name in enumerate(("TailBase", "TailMiddle", "TailOuter", "TailTip")):
            yaw = (9 if clip == "Walking_A" else 3)*math.sin(math.tau*t-index*.46)
            if clip == "Death_A_Pose":
                settle = t*t*(3-2*t)
                orient(name, x=(-37, -6, -7, -12)[index]*settle, z=yaw*(1-settle))
            else:
                orient(name, z=yaw)
    if clip == "Walking_A":
        for side, sign in [("R", -1), ("L", 1)]:
            orient(side+"Thigh", x=sign*16*wave)
            orient(side+"Shin", x=16*max(0, sign*wave))
            orient(side+"Foot", x=-sign*8*wave)
            orient(side+"Coat", x=sign*6*wave)
        orient("LUpperArm", x=13*wave, y=20)
        orient("RUpperArm", x=-7*wave, y=-13)
    elif firestarter and clip == "1H_Melee_Attack_Slice_Diagonal":
        windup = math.sin(math.pi*min(1, t/.50))**2
        throw = math.sin(math.pi*t)**2
        orient("Chest", x=16*throw, z=22*throw)
        orient("RUpperArm", x=-52*throw+19*windup, y=-20, z=35*throw)
        orient("RForearm", x=-29*throw-26*windup, z=12*throw)
        orient("LUpperArm", x=20*throw, y=24)
    elif scout and clip == "2H_Ranged_Shoot":
        release = .3
        phase = t/release if t < release else (1-t)/(1-release)
        aim = phase**2*(3-2*phase)
        orient("Chest", x=7*aim, z=21*aim)
        orient("RUpperArm", x=-37*aim, y=-14, z=32*aim)
        orient("RForearm", x=-8-16*aim, z=16*aim)
        orient("LUpperArm", x=12*aim, y=16)
    elif trap and clip == "2H_Ranged_Shoot":
        release = 14/30
        phase = t/release if t < release else (1-t)/(1-release)
        throw = phase**2*(3-2*phase)
        windup = math.sin(math.pi*phase)**2 if t < release else 0
        orient("Chest", x=13*throw, z=25*throw-22*windup)
        orient("RUpperArm", x=-61*throw+31*windup, y=-12, z=26*throw)
        orient("RForearm", x=-12-22*throw-37*windup, z=16*throw)
        orient("LUpperArm", x=20*throw, y=18)
    elif slinger and clip == "2H_Ranged_Shoot":
        release = .40
        phase = t/release if t < release else (1-t)/(1-release)
        swing = phase**2*(3-2*phase)
        windup = math.sin(math.pi*phase)**2 if t < release else 0
        orient("Chest", x=10*swing, z=24*swing-14*windup)
        orient("RUpperArm", x=-37*swing+26*windup, y=-15, z=21*swing)
        orient("RForearm", x=-12-24*swing-13*windup, z=18*swing)
        orient("LUpperArm", x=16*swing, y=18)
    elif clip == "Unarmed_Melee_Attack_Punch_A" or ((slinger or kobold) and clip == "1H_Melee_Attack_Slice_Diagonal"):
        orient("Chest", x=15*pulse, z=-23*pulse)
        orient("LUpperArm", x=-39*pulse, y=20, z=-36*pulse)
        orient("LForearm", x=-19*pulse)
    elif clip == "1H_Melee_Attack_Slice_Diagonal" and spearhand:
        thrust = math.sin(math.pi*t)**4
        orient("Chest", x=12*thrust, z=14*thrust)
        orient("RUpperArm", x=-28*thrust, y=-12, z=46*thrust)
        orient("RForearm", x=-15*thrust-8, z=18*thrust)
        orient("LUpperArm", x=14*thrust, y=25)
    elif clip == "1H_Melee_Attack_Slice_Diagonal":
        sweep = math.sin(math.tau*t)*pulse
        orient("Chest", x=10*pulse, z=-24*sweep)
        orient("RUpperArm", x=-28*pulse, y=8*pulse-13, z=60*sweep)
        orient("RForearm", x=-22*pulse-8, z=30*sweep)
        orient("LUpperArm", x=16*pulse, y=18)
    elif clip == "Hit_A":
        orient("Chest", x=-18*pulse, y=12*pulse)
        orient("Head", x=-12*pulse, z=10*pulse)
    elif clip == "Death_A_Pose":
        settle = t*t*(3-2*t)
        orient("Root", x=88*settle, y=4*settle)
        orient("Neck", x=-16*settle)
        orient("RUpperArm", y=-13+30*settle)
        orient("LUpperArm", y=20-35*settle)
        orient("RThigh", x=-8*settle)


def strike_pan(weight, windup):
    """Place both wrists so the mallet face strikes the center of the pan."""
    left = rig.pose.bones["LHand"]
    right = rig.pose.bones["RHand"]
    left_delta = (Matrix.Translation(Vector((.045, -.18, .86)))
                  @ Matrix.Rotation(math.radians(-42), 4, "Y")
                  @ Matrix.Translation(-left.bone.head_local))
    strike = left_delta @ landmarks["LHand"]["strike"]
    axis = (landmarks["RHand"]["tip"]-landmarks["RHand"]["center"]).normalized()
    rotation = axis.rotation_difference(Vector((.8, .6, 0))).to_matrix().to_4x4()
    right_delta = Matrix.Translation(strike-rotation@landmarks["RHand"]["tip"]) @ rotation
    for hand, delta in ((left, left_delta), (right, right_delta)):
        side = hand.name[0]
        upper, forearm = [rig.pose.bones[side+name] for name in ("UpperArm", "Forearm")]
        desired = hand.matrix.lerp(delta @ hand.bone.matrix_local, weight)
        if side == "R":
            desired.translation += Vector((-.06, -.02, .06))*windup
        shoulder, elbow, wrist = [joint.head.copy() for joint in (upper, forearm, hand)]
        end = desired.translation
        upper_length, lower_length = (elbow-shoulder).length, (wrist-elbow).length
        direction = (end-shoulder).normalized()
        distance = (end-shoulder).length
        assert abs(upper_length-lower_length) < distance < upper_length+lower_length, (side, distance, upper_length+lower_length)
        pole = elbow-shoulder
        pole = (pole-direction*pole.dot(direction)).normalized()
        along = (upper_length**2-lower_length**2+distance**2)/(2*distance)
        new_elbow = shoulder+direction*along+pole*math.sqrt(max(0, upper_length**2-along**2))
        for joint, child, target in ((upper, forearm, new_elbow), (forearm, hand, end)):
            pivot = joint.head.copy()
            turn = (child.head-pivot).rotation_difference(target-pivot).to_matrix().to_4x4()
            joint.matrix = Matrix.Translation(pivot) @ turn @ Matrix.Translation(-pivot) @ joint.matrix
            bpy.context.view_layer.update()
        hand.matrix = desired
        bpy.context.view_layer.update()
    if weight == 1:
        pan_point = left.matrix @ left.bone.matrix_local.inverted() @ landmarks["LHand"]["strike"]
        mallet_tip = right.matrix @ right.bone.matrix_local.inverted() @ landmarks["RHand"]["tip"]
        gap = (pan_point-mallet_tip).length
        assert gap < .005, gap
        print(f"Mallet contact gap: {gap:.6f} m", flush=True)


clips = {"Idle": 38, "Walking_A": 27, "1H_Melee_Attack_Slice_Diagonal": 28,
         "Hit_A": 17, "Death_A_Pose": 39}
if slinger or kobold:
    clips["2H_Ranged_Shoot"] = 31
if rattle:
    clips["Spellcast_Shoot"] = 31
if firestarter:
    clips["Unarmed_Melee_Attack_Punch_A"] = 19
for clip, length in clips.items():
    action = bpy.data.actions.new(clip)
    rig.animation_data.action = action
    for frame in range(1, length+1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis.identity()
        t = (frame-1)/(length-1)
        pose(clip, t)
        bpy.context.view_layer.update()
        if rattle and clip == "Spellcast_Shoot":
            contact = 14/30
            approach = t/contact if t <= contact else (1-t)/(1-contact)
            weight = approach**2*(3-2*approach)
            strike_pan(weight, math.sin(math.pi*approach) if t < contact else 0)
        if spearhand or kobold:
            hand = rig.pose.bones["RHand"]
            direction = (hand.matrix @ hand.bone.matrix_local.inverted()).to_3x3() @ blade_direction
            thrust = math.sin(math.pi*t)**4 if clip == "1H_Melee_Attack_Slice_Diagonal" else 0
            if kobold and clip == "2H_Ranged_Shoot":
                release = .3 if scout else 14/30
                phase = t/release if t < release else (1-t)/(1-release)
                thrust = phase**2*(3-2*phase)
            aim = blade_direction.lerp(Vector((0, -1, .03)), thrust).normalized()
            if clip == "Death_A_Pose":
                settle = t*t*(3-2*t)
                aim = blade_direction.lerp(Vector((-.6, -.8, 0)), settle).normalized()
            rotated = direction.rotation_difference(aim).to_matrix().to_4x4() @ hand.matrix
            rotated.translation = hand.matrix.translation
            hand.matrix = rotated
            bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = body.evaluated_get(graph)
        points = np.empty(len(evaluated.data.vertices)*3, dtype=np.float32)
        evaluated.data.vertices.foreach_get("co", points)
        prop_evaluations = [prop.evaluated_get(graph) for prop in held_props]
        weapon_floor = min((prop.matrix_world @ vertex.co).z
                           for prop in prop_evaluations for vertex in prop.data.vertices) if held_props else math.inf
        floor = min(float(points.reshape(-1, 3)[:, 2].min()), weapon_floor)
        rig.pose.bones["Root"].location = basis["Root"].inverted() @ Vector((0, 0, .002-floor))
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion", frame=frame)
        rig.pose.bones["Root"].keyframe_insert("location", frame=frame)
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(clip, 1, action)
    track.mute = True
for track in rig.animation_data.nla_tracks:
    track.mute = False
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
if slinger:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from owned_sling import add_owned_sling

    def sling_material(color):
        srgb = [int(color[index:index+2], 16)/255 for index in (1, 3, 5)]
        rgb = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in srgb]
        material = bpy.data.materials.new("Sling " + color)
        material.use_nodes = True
        material["preserveAuthoredRoughness"] = True
        surface = material.node_tree.nodes["Principled BSDF"]
        surface.inputs["Base Color"].default_value = (*rgb, 1)
        surface.inputs["Roughness"].default_value = .3
        return material

    config = json.loads(weapon_source.read_text())["sling"]
    hand_start, hand_end = map(Vector, segments["RHand"])
    config.update(handBone="RHand", grip=tuple(hand_start.lerp(hand_end, .63)),
                  releaseFrame=13, length=.26)
    add_owned_sling(rig, config, sling_material)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(output/f"{slug}.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(output/f"{slug}.glb"), export_format="GLB",
    export_animations=True, export_animation_mode="NLA_TRACKS",
    export_force_sampling=True, export_extras=True,
)
