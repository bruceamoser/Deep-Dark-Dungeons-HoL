"""Fit a shared trail outfit and leather armor pattern to a reconstructed halfling."""
import argparse
import math
from pathlib import Path
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("body", type=Path)
parser.add_argument("gear", type=Path, help="Owned KayKit Adventurers glTF directory")
parser.add_argument("output", type=Path)
parser.add_argument("variant", choices=["male", "female"])
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def import_mesh(source):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    added = set(bpy.context.scene.objects) - before
    obj, = [candidate for candidate in added if candidate.type == "MESH"]
    obj.data.transform(obj.matrix_world)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    for other in added - {obj}:
        bpy.data.objects.remove(other, do_unlink=True)
    return obj


body = import_mesh(args.body)
body.name = "Halfling base"
body.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
points = np.array([tuple(v.co) for v in body.data.vertices])
low, high = points.min(axis=0), points.max(axis=0)
scale = 1.34 / (high[2] - low[2])
center = Vector(((low[0]+high[0])/2, (low[1]+high[1])/2, low[2]))
body.data.transform(Matrix.Scale(scale, 4) @ Matrix.Translation(-center))
if args.variant == "male":
    mesh = bmesh.new()
    mesh.from_mesh(body.data)
    microscopic = [face for face in mesh.faces if face.calc_area() <= 1e-12]
    assert len(microscopic) == 6, "Inspect this reconstruction before changing its topology"
    bmesh.ops.delete(mesh, geom=microscopic, context="FACES")
    mesh.to_mesh(body.data)
    mesh.free()
points = np.array([tuple(v.co) for v in body.data.vertices])
male = args.variant == "male"
torso_y = .047 if male else .016
rig = bpy.data.objects.new("Halfling skeleton", bpy.data.armatures.new("Halfling skeleton"))
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
segments = {}


def chain(names, coords, parent=None):
    for name, a, b in zip(names, coords, coords[1:]):
        bone = rig.data.edit_bones.new(name)
        bone.head, bone.tail = a, b
        if parent:
            bone.parent = rig.data.edit_bones[parent]
        parent = name
        segments[name] = Vector(a), Vector(b)


chain(["Root"], [(0, 0, 0), (0, 0, .1)])
chain(["Pelvis", "Spine", "Chest", "Neck", "Head"],
      [(0, torso_y, .60), (0, torso_y, .70), (0, torso_y, .84),
       (0, torso_y, 1.04), (0, torso_y, 1.11), (0, torso_y, 1.33)], "Root")
for side, sign in (("R", -1), ("L", 1)):
    chain([side+"UpperArm", side+"Forearm", side+"Hand"],
          [(sign*.156, torso_y, .965), (sign*.279, .057 if male else .016, .836),
           (sign*.392, .014 if male else -.026, .690),
           (sign*(.485 if male else .468), -.029 if male else -.051, .585)], "Chest")
    chain([side+"Thigh", side+"Shin", side+"Foot"],
          [(sign*.096, .015, .62), (sign*.136, -.013, .389),
           (sign*.173, .016, .125), (sign*.181, -.119, .032)], "Pelvis")
bpy.ops.object.mode_set(mode="OBJECT")


def bind(obj, weights):
    for name, entries in weights.items():
        group = obj.vertex_groups.new(name=name)
        for index, weight in entries:
            group.add([index], weight, "REPLACE")
    obj.parent = rig
    obj.modifiers.new("Halfling skin", "ARMATURE").object = rig


def rigid(obj, name):
    bind(obj, {name: [(v.index, 1) for v in obj.data.vertices]})


# Weight the anatomy around fitted joints, with explicit side and limb masks.
x, y, z = points.T
names = [name for name in segments if name != "Root"]
distances = []
for name in names:
    a, b = map(np.array, segments[name])
    span = b-a
    fraction = np.clip((points-a) @ span/(span @ span), 0, 1)
    field = np.linalg.norm(points-a-fraction[:, None]*span, axis=1)
    if name in {"Pelvis", "Spine", "Chest", "Neck", "Head"}:
        if name != "Head":
            field += np.maximum(0, abs(x)-.22)*4
        if name == "Pelvis":
            field += np.maximum(0, .57-z)*4
    else:
        sign = -1 if name.startswith("R") else 1
        field += np.maximum(0, -x*sign)*6
        if name.endswith(("Arm", "Hand")):
            margin = .30-np.maximum(0, z-.74)*.66
            field += np.maximum(0, margin-abs(x))*4 + np.maximum(0, .52-z)*4
        else:
            field += np.maximum(0, z-.69)*6
    if name != "Head":
        field += np.maximum(0, z-1.095)*7
    distances.append(field)
distance = np.stack(distances, axis=1)
indices = np.argsort(distance, axis=1)[:, :3]
nearest = np.take_along_axis(distance, indices, axis=1)
values = np.exp(-((nearest-nearest[:, :1])/.045)**2)
values /= values.sum(axis=1, keepdims=True)
groups = {name: [] for name in names}
for index, (joints, weights) in enumerate(zip(indices, values)):
    for joint, weight in zip(joints, weights):
        if weight > 1e-6:
            groups[names[joint]].append((index, float(weight)))
bind(body, groups)

surface = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                               [tuple(f.vertices) for f in body.data.polygons])
vertices = KDTree(len(points))
for index, point in enumerate(points):
    vertices.insert(Vector(point), index)
vertices.balance()


def paint(name, color, roughness=.78, metal=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1)
    shader = material.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    return material


linen = paint("Warm oat linen", (.48, .33, .18))
wool = paint("Moss-green wool", (.085, .142, .044))
breeches = paint("Tobacco canvas", (.19, .115, .068))
trim = paint("Golden woven edging", (.35, .22, .079))
belt = paint("Oxblood belt", (.13, .040, .019))
leather = paint("Chestnut armor leather", (.27, .090, .038), .61)
edge = paint("Dark leather binding", (.082, .028, .014), .68)
brass = paint("Brass hardware", (.53, .31, .075), .38, .72)


def skin_fitted(obj):
    weights = {name: [] for name in names}
    for vertex in obj.data.vertices:
        blended = np.zeros(len(names))
        for _, index, gap in vertices.find_n(vertex.co, 6):
            blended[indices[index]] += values[index]/max(gap, .006)**2
        top = np.argsort(blended)[-4:]
        for joint in top:
            value = blended[joint] / blended[top].sum()
            if value > 1e-6:
                weights[names[joint]].append((vertex.index, float(value)))
    bind(obj, weights)


def radial_shell(name, levels, normal, material, border, clearance, max_radius):
    """Use the same ring pattern for both bodies, fitted to their rest surfaces."""
    axis = Vector(normal).normalized()
    u = Vector((0, 1, 0)).cross(axis).normalized()
    v = axis.cross(u).normalized()
    samples = 64
    geometry = []
    for center, fallback in levels:
        center = Vector(center)
        for sample in range(samples):
            angle = math.tau*sample/samples
            direction = u*math.cos(angle)+v*math.sin(angle)
            _, _, _, distance = surface.ray_cast(
                center+direction*max_radius, -direction, max_radius)
            radius = max_radius-distance if distance is not None else fallback
            geometry.append(center+direction*(radius+clearance))
    faces = [(row*samples+i, row*samples+(i+1)%samples,
              (row+1)*samples+(i+1)%samples, (row+1)*samples+i)
             for row in range(len(levels)-1) for i in range(samples)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(geometry, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    mesh.materials.append(border)
    for face in mesh.polygons:
        row = face.index//samples
        face.use_smooth = True
        face.material_index = int(row in (0, len(levels)-2))
    obj.modifiers.new("Bound garment edges", "SOLIDIFY").thickness = .006
    skin_fitted(obj)
    return obj


def levels(z0, z1, fallback=.13):
    return [((0, torso_y, z0+(z1-z0)*t), fallback)
            for t in (0,.018,.065,.14,.23,.33,.43,.53,.63,.73,.83,.93,.982,1)]


# Share normals across coincident positions only on the new garments. The
# reconstructed base keeps its original UV seams and topology.
coordinates, correspondence = np.unique(np.round(points, 5), axis=0, return_inverse=True)
normals = np.zeros_like(coordinates)
for poly in body.data.polygons:
    weighted_normal = np.array(poly.normal)*poly.area
    for index in poly.vertices:
        normals[correspondence[index]] += weighted_normal
normal_length = np.linalg.norm(normals, axis=1)
normals /= np.maximum(normal_length[:,None], 1e-8)
faces = [tuple(poly.vertices) for poly in body.data.polygons]


def fitted_patch(name, field, material, offset):
    """Clip a garment edge to its pattern and carry through the body's weights."""
    signed = np.array([field(*point) for point in points])
    geometry = []
    topology = []
    influences = []
    vertex_map = {}

    def append_vertex(a, b, fraction):
        point = points[a]*(1-fraction)+points[b]*fraction
        normal = normals[correspondence[a]]*(1-fraction)+normals[correspondence[b]]*fraction
        point += normal*offset
        key = tuple(np.round(point, 5))
        if key not in vertex_map:
            vertex_map[key] = len(geometry)
            geometry.append(point)
            combined = np.zeros(len(names))
            combined[indices[a]] += values[a]*(1-fraction)
            combined[indices[b]] += values[b]*fraction
            influences.append(combined)
        return vertex_map[key]

    for face in faces:
        if max(signed[index] for index in face) <= 0:
            continue
        polygon = []
        for a, b in zip(face, (*face[1:], face[0])):
            if signed[a] > 0:
                polygon.append(append_vertex(a, a, 0))
            if (signed[a] > 0) != (signed[b] > 0):
                polygon.append(append_vertex(a,b,signed[a]/(signed[a]-signed[b])))
        polygon = list(dict.fromkeys(polygon))
        if len(polygon) < 3:
            continue
        a, b, c = (geometry[index] for index in polygon[:3])
        if np.linalg.norm(np.cross(b-a,c-a)) > 2e-10:
            topology.append(polygon)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(geometry, [], topology)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    weights = {name: [] for name in names}
    for index, combined in enumerate(influences):
        top = np.argsort(combined)[-4:]
        for joint in top:
            value = combined[joint]/combined[top].sum()
            if value > 1e-6:
                weights[names[joint]].append((index, float(value)))
    for poly in mesh.polygons:
        poly.use_smooth = True
    bind(obj, weights)
    return obj


def sleeve_height(x):
    return .786+.48*(abs(x)-.30)


def shirt_region(x, y, z):
    return min(z-.630, 1.053-z, max(.214-abs(x), z-sleeve_height(x)))


clothes = [
    fitted_patch("Scout linen shirt", shirt_region, linen, .018),
    radial_shell("Scout wool waistcoat", levels(.620, .932), (0,0,1), wool, trim, .047, .245),
    radial_shell("Scout leather belt", levels(.625, .654), (0,0,1), belt, edge, .059, .24),
    fitted_patch("Scout cropped breeches",
                 lambda x,y,z: min(z-.315,.646-z,.263-abs(x)), breeches, .020),
    fitted_patch("Scout waistcoat shoulders",
                 lambda x,y,z: min(z-.905,1.035-z,abs(x)-.067,.146-abs(x)),
                 wool, .032),
    fitted_patch("Scout sleeve cuffs",
                 lambda x,y,z: min(abs(x)-.245,z-sleeve_height(x),sleeve_height(x)+.018-z),
                 wool, .029),
]
armor = [
    radial_shell("Light leather jack", levels(.661, .909), (0,0,1), leather, edge, .065, .236),
    fitted_patch("Leather bracers",
                 lambda x,y,z: min(abs(x)-.309,z-.703,.769-z),
                 leather, .026),
]


def hardware(name, x, z, radius, garment, material, collection):
    fitted = BVHTree.FromPolygons([v.co for v in garment.data.vertices],
                                  [tuple(f.vertices) for f in garment.data.polygons])
    hit, _, _, _ = fitted.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    if hit is None:
        return
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6,
        radius=radius, location=hit+Vector((0,-.002,0)))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (1,.46,1)
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    obj.data.materials.append(material)
    skin_fitted(obj)
    collection.append(obj)


hardware("Scout brass belt clasp", 0,.641,.023,clothes[2],brass,clothes)
for z in (.704,.762,.821,.879):
    hardware("Scout waistcoat button", .026,z,.008,clothes[1],brass,clothes)
    for x in (-.058,.058):
        hardware("Light armor rivet", x,z,.010,armor[0],brass,armor)

right_grip = segments["RHand"][0].lerp(segments["RHand"][1],.61) + Vector((0,-.015,0))
left_grip = segments["LHand"][0].lerp(segments["LHand"][1],.52)
sword = import_mesh(args.gear/"sword_1handed.gltf")
sword.name = "KayKit short sword"
blade = Vector((-.46,-.47,.75)).normalized()
sword.data.transform(Matrix.Translation(right_grip)
    @ Vector((0,0,1)).rotation_difference(blade).to_matrix().to_4x4()
    @ Matrix.Scale(.33,4))
rigid(sword,"RHand")
shield = import_mesh(args.gear/"shield_round.gltf")
shield.name = "KayKit round shield"
shield.data.transform(Matrix.Translation(left_grip) @ Matrix.Scale(.48,4)
                      @ Matrix.Translation(Vector((0,-.125,0))))
rigid(shield,"LHand")

scene = bpy.context.scene
scene.render.fps = 24
basis = {bone.name: bone.bone.matrix_local.to_quaternion() for bone in rig.pose.bones}


def orient(name, x=0, y=0, z=0):
    q = Euler(tuple(math.radians(value) for value in (x,y,z))).to_quaternion()
    bone = rig.pose.bones[name]
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = basis[name].inverted() @ q @ basis[name]


def aim(name, current, target):
    bone = rig.pose.bones[name]
    delta = bone.matrix @ bone.bone.matrix_local.inverted()
    direction = delta.to_3x3() @ current
    grip = right_grip if name == "RHand" else left_grip
    anchor = delta @ grip
    turn = direction.rotation_difference(target).to_matrix().to_4x4()
    bone.matrix = Matrix.Translation(anchor) @ turn @ Matrix.Translation(-anchor) @ bone.matrix


def pose(clip,t):
    wave = math.sin(math.tau*t)
    pulse = math.sin(math.pi*t)**2
    orient("Chest", x=1.5*wave)
    orient("Head", z=2*wave)
    orient("RUpperArm", y=-23)
    orient("LUpperArm", y=24)
    orient("RForearm", x=-12)
    orient("LForearm", x=-22)
    if clip == "Walking_A":
        for side, sign in (("R",-1),("L",1)):
            orient(side+"Thigh", x=sign*19*wave)
            orient(side+"Shin", x=15*max(0,sign*wave))
            orient(side+"Foot", x=-sign*9*wave)
        orient("RUpperArm", x=-10*wave, y=-23)
        orient("LUpperArm", x=5*wave, y=24)
    elif clip == "1H_Melee_Attack_Slice_Diagonal":
        sweep = math.sin(math.tau*t)*pulse
        orient("Chest", x=10*pulse, z=-16*sweep)
        orient("RUpperArm", x=-36*pulse, y=-20, z=45*sweep+16*pulse)
        orient("RForearm", x=-12-18*pulse, z=16*sweep)
        orient("LUpperArm", x=-11*pulse, y=21)
    elif clip == "Block_A":
        orient("Chest", x=8*pulse, z=-12*pulse)
        orient("LUpperArm", x=-30*pulse, y=24-6*pulse, z=-15*pulse)
        orient("LForearm", x=-22-20*pulse, z=-12*pulse)
    elif clip == "Hit_A":
        orient("Chest", x=-17*pulse, y=10*pulse)
        orient("Head", x=-8*pulse, z=8*pulse)
    elif clip == "Death_A_Pose":
        settle = t*t*(3-2*t)
        orient("Root",x=84*settle,y=8*settle)
        orient("RUpperArm", y=-23+16*settle)
        orient("LUpperArm", y=24-39*settle)
        orient("LForearm", x=-22+15*settle)
        orient("RShin",x=15*settle)


clips = {"Idle": 37, "Walking_A": 29, "1H_Melee_Attack_Slice_Diagonal": 29,
         "Block_A": 25, "Hit_A": 17, "Death_A_Pose": 37}
rig.animation_data_create()
for clip, length in clips.items():
    action = bpy.data.actions.new(clip)
    rig.animation_data.action = action
    for frame in range(1,length+1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis.identity()
        t = (frame-1)/(length-1)
        pose(clip,t)
        bpy.context.view_layer.update()
        fall = t*t*(3-2*t) if clip == "Death_A_Pose" else 0
        strength = math.sin(math.pi*t)**2 if clip == "1H_Melee_Attack_Slice_Diagonal" else 0
        sword_aim = blade.lerp(Vector((-.28,-.94,.11)),strength).lerp(Vector((-.72,-.69,0)),fall)
        aim("RHand",blade,sword_aim.normalized())
        shield_aim = Vector((.27,-.96,0)).lerp(Vector((0,0,1)),fall)
        aim("LHand",Vector((0,-1,0)),shield_aim.normalized())
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        floor = min(v.co.z for obj in (body,sword,shield) for v in obj.evaluated_get(graph).data.vertices)
        rig.pose.bones["Root"].location = basis["Root"].inverted() @ Vector((0,0,.003-floor))
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion",frame=frame)
            if bone.name in {"Root","RHand","LHand"}:
                bone.keyframe_insert("location",frame=frame)
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(clip,1,action)
    track.mute = True
for track in rig.animation_data.nla_tracks:
    track.mute = False
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/"halfling.blend"))
for look, parts in (
    ("base", [body]),
    ("scout", [body,*clothes,sword,shield]),
    ("light-armor", [body,*clothes,*armor,sword,shield]),
):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (rig,*parts):
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(args.output/f"{look}.glb"),export_format="GLB",
        use_selection=True,export_animations=True,export_animation_mode="NLA_TRACKS",
        export_force_sampling=True)
