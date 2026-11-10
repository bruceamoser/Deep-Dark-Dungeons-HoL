"""Build the Crypt Ghoul review asset from the canonical Ninja 23-bone rig."""

import hashlib
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = ROOT / "public/assets/characters/series4/Ninja.glb"
DONOR_SHA256 = "5e7fc34eef2011f4d4cf534acad039f2edc18be42d4542cc7c776a62142129e0"
OUT = ROOT / "test-results/asset-workers/crypt-ghoul"
OUT.mkdir(parents=True, exist_ok=True)


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            value.update(block)
    return value.hexdigest()


assert DONOR.is_file(), f"Missing donor: {DONOR}"
assert digest(DONOR) == DONOR_SHA256, "Donor hash mismatch"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(DONOR))

armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
assert len(armatures) == 1, f"Expected one donor armature, found {len(armatures)}"
rig = armatures[0]
assert len(rig.data.bones) == 23, f"Expected 23 bones, found {len(rig.data.bones)}"

expected_parents = {
    "root": None, "hips": "root", "spine": "hips", "chest": "spine",
    "upperarm.l": "chest", "lowerarm.l": "upperarm.l", "wrist.l": "lowerarm.l",
    "hand.l": "wrist.l", "handslot.l": "hand.l", "head": "chest",
    "upperarm.r": "chest", "lowerarm.r": "upperarm.r", "wrist.r": "lowerarm.r",
    "hand.r": "wrist.r", "handslot.r": "hand.r",
    "upperleg.r": "hips", "lowerleg.r": "upperleg.r", "foot.r": "lowerleg.r",
    "toes.r": "foot.r", "upperleg.l": "hips", "lowerleg.l": "upperleg.l",
    "foot.l": "lowerleg.l", "toes.l": "foot.l",
}
actual_parents = {
    bone.name: (bone.parent.name if bone.parent else None) for bone in rig.data.bones
}
assert actual_parents == expected_parents, "Canonical bone parentage changed"
rig_signature = {
    bone.name: (
        bone.parent.name if bone.parent else None,
        tuple(round(v, 8) for row in bone.matrix_local for v in row),
    )
    for bone in rig.data.bones
}

# Remove the donor's render meshes and helper shapes. The imported armature,
# bone names, parentage, rest matrices and inverse binds remain untouched.
for obj in list(bpy.context.scene.objects):
    if obj != rig:
        bpy.data.objects.remove(obj, do_unlink=True)
for pose_bone in rig.pose.bones:
    pose_bone.custom_shape = None


class MeshBuilder:
    def __init__(self):
        self.verts = []
        self.faces = []
        self.face_mats = []
        self.vert_comp = []

    def vertex(self, co, comp):
        self.verts.append(tuple(co))
        self.vert_comp.append(comp)
        return len(self.verts) - 1

    def face(self, ids, material):
        self.faces.append(tuple(ids))
        self.face_mats.append(material)

    def ellipsoid(self, center, scale, material, comp, segments=10, rings=6):
        center = Vector(center)
        scale = Vector(scale)
        rows = []
        top = self.vertex(center + Vector((0, 0, scale.z)), comp)
        for ring in range(1, rings):
            phi = math.pi * ring / rings
            row = []
            for side in range(segments):
                theta = math.tau * side / segments
                point = Vector((
                    math.sin(phi) * math.cos(theta) * scale.x,
                    math.sin(phi) * math.sin(theta) * scale.y,
                    math.cos(phi) * scale.z,
                ))
                row.append(self.vertex(center + point, comp))
            rows.append(row)
        bottom = self.vertex(center - Vector((0, 0, scale.z)), comp)
        for side in range(segments):
            nxt = (side + 1) % segments
            self.face((top, rows[0][nxt], rows[0][side]), material)
        for ring in range(len(rows) - 1):
            for side in range(segments):
                nxt = (side + 1) % segments
                self.face((rows[ring][side], rows[ring][nxt], rows[ring + 1][nxt]), material)
                self.face((rows[ring][side], rows[ring + 1][nxt], rows[ring + 1][side]), material)
        for side in range(segments):
            nxt = (side + 1) % segments
            self.face((rows[-1][side], rows[-1][nxt], bottom), material)

    def loft(self, path, radii, material, comp, sides=8, caps=True, phase=0.0):
        points = [Vector(point) for point in path]
        rings = []
        for index, point in enumerate(points):
            if len(points) == 1:
                tangent = Vector((0, 0, 1))
            elif index == 0:
                tangent = (points[1] - point).normalized()
            elif index == len(points) - 1:
                tangent = (point - points[-2]).normalized()
            else:
                tangent = (points[index + 1] - points[index - 1]).normalized()
            reference = Vector((0, 1, 0)) if abs(tangent.z) < 0.88 else Vector((0, 1, 0))
            basis_a = tangent.cross(reference)
            if basis_a.length < 1e-6:
                basis_a = tangent.cross(Vector((1, 0, 0)))
            basis_a.normalize()
            basis_b = tangent.cross(basis_a).normalized()
            radius = radii[index]
            if isinstance(radius, (int, float)):
                ra = rb = radius
            else:
                ra, rb = radius
            ring = []
            for side in range(sides):
                angle = math.tau * side / sides + phase
                co = point + basis_a * (math.cos(angle) * ra) + basis_b * (math.sin(angle) * rb)
                ring.append(self.vertex(co, comp))
            rings.append(ring)
        for index in range(len(rings) - 1):
            for side in range(sides):
                nxt = (side + 1) % sides
                self.face((rings[index][side], rings[index][nxt], rings[index + 1][nxt]), material)
                self.face((rings[index][side], rings[index + 1][nxt], rings[index + 1][side]), material)
        if caps:
            start = self.vertex(points[0], comp)
            end = self.vertex(points[-1], comp)
            for side in range(sides):
                nxt = (side + 1) % sides
                self.face((start, rings[0][nxt], rings[0][side]), material)
                self.face((end, rings[-1][side], rings[-1][nxt]), material)

    def panel(self, corners, material, comp):
        # Thin, closed triangular/quadrilateral tattered cloth panel.
        front = [self.vertex(point, comp) for point in corners]
        back = [self.vertex(Vector(point) + Vector((0, 0.008 if point[1] >= 0 else -0.008, 0)), comp)
                for point in corners]
        for index in range(1, len(front) - 1):
            self.face((front[0], front[index], front[index + 1]), material)
            self.face((back[0], back[index + 1], back[index]), material)
        count = len(corners)
        for index in range(count):
            nxt = (index + 1) % count
            self.face((front[index], front[nxt], back[nxt]), material)
            self.face((front[index], back[nxt], back[index]), material)

    def cone(self, base, tip, radius, material, comp, sides=5):
        base = Vector(base)
        tip = Vector(tip)
        direction = (tip - base).normalized()
        helper = Vector((0, 1, 0)) if abs(direction.z) < 0.9 else Vector((1, 0, 0))
        axis_a = direction.cross(helper).normalized()
        axis_b = direction.cross(axis_a).normalized()
        ring = []
        for side in range(sides):
            angle = math.tau * side / sides
            ring.append(self.vertex(base + radius * (axis_a * math.cos(angle) + axis_b * math.sin(angle)), comp))
        tip_id = self.vertex(tip, comp)
        center = self.vertex(base, comp)
        for side in range(sides):
            nxt = (side + 1) % sides
            self.face((ring[side], ring[nxt], tip_id), material)
            self.face((center, ring[nxt], ring[side]), material)


builder = MeshBuilder()
materials = {
    "skin": ("CryptGhoul_Skin", (0.21, 0.28, 0.17, 1), 0.0, 0.9),
    "wound": ("CryptGhoul_Wound", (0.075, 0.105, 0.06, 1), 0.0, 0.98),
    "teeth": ("CryptGhoul_Teeth", (0.72, 0.67, 0.45, 1), 0.0, 0.66),
    "socket": ("CryptGhoul_DeepSocket", (0.025, 0.035, 0.022, 1), 0.0, 1.0),
    "amber": ("CryptGhoul_AmberEye", (1.0, 0.38, 0.025, 1), 4.0, 0.28),
    "hair": ("CryptGhoul_Hair", (0.018, 0.027, 0.014, 1), 0.0, 1.0),
    "cloth": ("CryptGhoul_Cloth", (0.14, 0.16, 0.065, 1), 0.0, 1.0),
    "claw": ("CryptGhoul_Claw", (0.45, 0.43, 0.27, 1), 0.0, 0.74),
}
material_order = list(materials)
mat_index = {name: index for index, name in enumerate(material_order)}


def M(name):
    return mat_index[name]


# Bent skeletal torso, built in the donor's canonical rest coordinate system.
builder.loft(
    [(0, 0.005, 0.47), (0, 0.0, 0.56), (0, 0.0, 0.71), (0, 0.005, 0.84),
     (0, 0.0, 0.97), (0, 0.015, 1.09), (0, 0.025, 1.17)],
    [(0.12, 0.085), (0.145, 0.10), (0.105, 0.072), (0.16, 0.09),
     (0.225, 0.115), (0.245, 0.105), (0.17, 0.085)],
    M("skin"), "torso", sides=10,
)
builder.loft(
    [(0, -0.005, 0.54), (0, -0.005, 0.67), (0, 0.0, 0.85),
     (0, 0.005, 1.03), (0, 0.015, 1.12)],
    [(0.075, 0.04), (0.065, 0.032), (0.085, 0.04), (0.115, 0.048), (0.15, 0.055)],
    M("wound"), "torso", sides=8,
)

# Sternum and paired, broken angular ribs read through the hollow chest.
builder.loft(
    [(0, -0.105, 0.72), (0, -0.122, 0.88), (0, -0.13, 1.06)],
    [(0.022, 0.018), (0.025, 0.02), (0.028, 0.022)],
    M("claw"), "torso", sides=6,
)
for row, z in enumerate((0.82, 0.88, 0.95, 1.02)):
    half = 0.12 + row * 0.022
    for side in (-1, 1):
        points = []
        radii = []
        for step in range(5):
            t = step / 4
            x = side * half * math.sin(t * math.pi / 2)
            y = -0.115 + 0.018 * t + 0.012 * math.cos(t * math.pi)
            points.append((x, y, z + 0.014 * math.sin(t * math.pi)))
            radii.append((0.018 - 0.006 * t, 0.011))
        builder.loft(points, radii, M("claw"), "torso", sides=5)

# Jutting clavicles and shoulder blades.
for side in (-1, 1):
    builder.loft(
        [(side * 0.025, -0.075, 1.09), (side * 0.12, -0.09, 1.115), (side * 0.225, -0.04, 1.10)],
        [(0.022, 0.02), (0.025, 0.02), (0.032, 0.028)],
        M("claw"), "torso", sides=6,
    )
    builder.loft(
        [(side * 0.08, -0.03, 1.11), (side * 0.15, -0.02, 1.115),
         (side * 0.245, 0.005, 1.085)],
        [(0.04, 0.055), (0.055, 0.065), (0.072, 0.075)],
        M("skin"), "torso", sides=7,
    )

# Sickly creases and scarred geometry break up the naked thorax.
for side in (-1, 1):
    for index, (za, zb, reach) in enumerate(((0.76, 0.68, 0.075), (0.90, 0.83, 0.11), (1.04, 0.96, 0.13))):
        builder.loft(
            [(side * 0.035, -0.128, za), (side * reach * 0.55, -0.122, (za + zb) / 2),
             (side * reach, -0.09, zb)],
            [0.006, 0.009, 0.004], M("wound"), "torso", sides=5,
        )

# Long arms traverse shoulder, elbow and wrist with continuous taper.
for side, suffix in ((1, "l"), (-1, "r")):
    elbow = side * 0.455
    wrist = side * 0.715
    builder.loft(
        [(side * 0.235, 0, 1.09), (side * 0.31, -0.012, 1.085),
         (elbow, -0.005, 1.095), (side * 0.54, -0.012, 1.10),
         (wrist, -0.015, 1.105)],
        [(0.072, 0.075), (0.06, 0.065), (0.052, 0.058),
         (0.047, 0.05), (0.035, 0.038)],
        M("skin"), f"arm.{suffix}", sides=8,
    )
    # Exposed sinews create an emaciated, connected arm.
    for dy, dz in ((-0.035, 0.03), (0.035, -0.025)):
        builder.loft(
            [(side * 0.34, dy, 1.09 + dz), (side * 0.50, dy * 1.2, 1.095 + dz),
             (side * 0.68, dy * 0.7, 1.105 + dz)],
            [0.009, 0.007, 0.005], M("claw" if dz > 0 else "wound"), f"arm.{suffix}", sides=5,
        )

    palm_x = side * 0.785
    builder.loft(
        [(side * 0.725, -0.005, 1.105), (side * 0.77, -0.012, 1.10),
         (side * 0.855, -0.018, 1.08)],
        [(0.052, 0.048), (0.09, 0.055), (0.078, 0.045)],
        M("skin"), f"hand.{suffix}", sides=8,
    )
    # Four oversized fingers plus opposed thumb. Claws are clipped cones.
    finger_specs = [(-0.065, 0.035, 0.19), (-0.022, 0.042, 0.225),
                    (0.025, 0.038, 0.205), (0.065, 0.025, 0.17)]
    for index, (y_off, z_off, length) in enumerate(finger_specs):
        base = Vector((side * 0.845, y_off, 1.085 + z_off))
        mid = Vector((side * (0.845 + length * 0.55), y_off * 1.12, 1.075 + z_off * 0.75))
        knuckle = Vector((side * (0.855 + length), y_off * 1.18, 1.045 + z_off * 0.5))
        claw_tip = Vector((side * (0.885 + length), y_off * 1.2, 1.005 + z_off * 0.35))
        builder.loft([base, mid, knuckle], [0.018, 0.014, 0.010],
                     M("skin"), f"hand.{suffix}", sides=6)
        builder.cone(knuckle, claw_tip, 0.012, M("claw"), f"hand.{suffix}", sides=5)
    thumb_base = Vector((side * 0.80, -0.055, 1.065))
    thumb_tip = Vector((side * 0.94, -0.11, 1.01))
    builder.loft([thumb_base, Vector((side * 0.87, -0.085, 1.04))],
                 [0.023, 0.014], M("skin"), f"hand.{suffix}", sides=6)
    builder.cone(Vector((side * 0.87, -0.085, 1.04)), thumb_tip, 0.013,
                 M("claw"), f"hand.{suffix}", sides=5)

# Narrow pelvis and long, bony legs.
builder.ellipsoid((0, 0.0, 0.53), (0.19, 0.10, 0.115), M("skin"), "pelvis", 10, 6)
for side, suffix in ((1, "l"), (-1, "r")):
    hip_x = side * 0.155
    builder.loft(
        [(hip_x, 0.0, 0.54), (side * 0.17, 0.005, 0.43), (side * 0.175, 0.0, 0.30),
         (side * 0.18, -0.015, 0.18), (side * 0.18, -0.06, 0.07)],
        [(0.078, 0.075), (0.066, 0.062), (0.056, 0.052),
         (0.047, 0.044), (0.055, 0.045)],
        M("skin"), f"leg.{suffix}", sides=8,
    )
    # Broad clawed foot, toes projected forward along the rig's -Y axis.
    builder.loft(
        [(side * 0.18, 0.018, 0.10), (side * 0.18, -0.07, 0.075),
         (side * 0.18, -0.16, 0.045)],
        [(0.058, 0.05), (0.085, 0.055), (0.105, 0.04)],
        M("skin"), f"foot.{suffix}", sides=7,
    )
    for toe_index in range(4):
        x_off = (toe_index - 1.5) * 0.042
        base = Vector((side * 0.18 + x_off, -0.155, 0.05))
        tip = Vector((side * 0.18 + x_off, -0.255 - abs(toe_index - 1.5) * 0.012, 0.012))
        builder.loft([base, base + Vector((0, -0.045, -0.012))], [0.025, 0.018],
                     M("skin"), f"foot.{suffix}", sides=5)
        builder.cone(base + Vector((0, -0.045, -0.012)), tip, 0.016,
                     M("claw"), f"foot.{suffix}", sides=5)

# Skull: elongated cranium, sunken cheeks, muzzle, black sockets and amber eyes.
builder.loft(
    [(0, 0.015, 1.20), (0, 0.0, 1.255), (0, -0.005, 1.33),
     (0, 0.0, 1.41), (0, 0.02, 1.49), (0, 0.04, 1.525)],
    [(0.085, 0.075), (0.12, 0.10), (0.145, 0.115),
     (0.15, 0.12), (0.125, 0.105), (0.075, 0.07)],
    M("skin"), "head", sides=10,
)
builder.loft(
    [(0, -0.062, 1.285), (0, -0.12, 1.275), (0, -0.15, 1.30), (0, -0.115, 1.335)],
    [(0.092, 0.07), (0.085, 0.058), (0.068, 0.045), (0.08, 0.048)],
    M("skin"), "head", sides=8,
)
for side in (-1, 1):
    builder.ellipsoid((side * 0.062, -0.127, 1.39), (0.034, 0.012, 0.03),
                      M("socket"), "head", 9, 5)
    builder.ellipsoid((side * 0.062, -0.139, 1.389), (0.012, 0.006, 0.008),
                      M("amber"), "head", 8, 4)
    builder.ellipsoid((side * 0.097, -0.087, 1.315), (0.038, 0.018, 0.055),
                      M("wound"), "head", 8, 5)
    builder.loft(
        [(side * 0.025, -0.132, 1.418), (side * 0.065, -0.143, 1.431),
         (side * 0.108, -0.108, 1.417)],
        [(0.018, 0.016), (0.022, 0.018), (0.014, 0.012)],
        M("skin"), "head", sides=5,
    )
builder.ellipsoid((0, -0.151, 1.345), (0.025, 0.014, 0.035),
                  M("socket"), "head", 8, 4)
builder.ellipsoid((0, -0.176, 1.276), (0.105, 0.02, 0.047),
                  M("socket"), "head", 10, 5)
# Separated upper and lower teeth, including two jagged fangs.
for index in range(9):
    x = (index - 4) * 0.026
    z = 1.302 - 0.003 * abs(index - 4)
    length = 0.052 if index in (1, 7) else 0.038
    builder.cone((x, -0.195, z), (x + 0.004, -0.201, z - length),
                 0.009, M("teeth"), "head", sides=4)
for index in range(8):
    x = (index - 3.5) * 0.027
    z = 1.268
    length = 0.045 if index in (2, 5) else 0.03
    builder.cone((x, -0.193, z), (x - 0.003, -0.20, z + length),
                 0.008, M("teeth"), "head", sides=4)

# Sparse greasy cords along the rear and sides of the skull.
for index in range(12):
    side = -1 if index % 2 == 0 else 1
    x = side * (0.07 + 0.008 * (index // 2))
    y = 0.055 + 0.01 * (index // 2)
    end_z = 1.19 - 0.024 * ((index * 3) % 5)
    builder.loft(
        [(x * 0.75, y, 1.46), (x, y + 0.025, 1.37),
         (x * 1.15, y + 0.045, end_z), (x * 1.08 + side * 0.018, y + 0.035, end_z - 0.06)],
        [0.007, 0.006, 0.004, 0.0015], M("hair"), "head", sides=5,
    )

# A single ragged loincloth, with narrow hip wrap and torn front/back strips.
waist = [(0.17 * math.cos(t), 0.105 * math.sin(t), 0.55)
         for t in [math.tau * i / 16 for i in range(16)]]
builder.loft(waist + [waist[0]], [0.018] * 17, M("cloth"), "cloth", sides=5, caps=False)
for index in range(7):
    x0 = -0.15 + index * 0.05
    x1 = x0 + 0.055
    hem = 0.31 + 0.035 * ((index * 5) % 4)
    y = -0.112 if index < 4 else 0.112
    builder.panel([(x0, y, 0.55), (x1, y, 0.55),
                   (x1 - 0.006, y + (0.006 if y < 0 else -0.006), hem),
                   ((x0 + x1) / 2, y + (0.012 if y < 0 else -0.012), hem - 0.045)],
                  M("cloth"), "cloth")

# Build the intended single skinned mesh.
mesh = bpy.data.meshes.new("CryptGhoul_Mesh")
mesh.from_pydata(builder.verts, [], builder.faces)

# Curve the actual rest-space geometry forward before binding. This keeps the
# requested corpse hunch visible when source animation clips replace the pose.
for vertex, component in zip(mesh.vertices, builder.vert_comp):
    co = vertex.co
    if component == "torso":
        factor = max(0.0, min(1.0, (co.z - 0.70) / 0.47))
        co.y -= 0.19 * factor ** 1.55
    elif component in {"arm.l", "arm.r"}:
        reach = max(0.0, min(1.0, (abs(co.x) - 0.25) / 0.65))
        co.y -= 0.17 + 0.055 * reach
        co.z -= 0.075 * reach * reach
    elif component in {"hand.l", "hand.r"}:
        co.y -= 0.225
        co.z -= 0.075
    elif component == "head":
        factor = max(0.0, min(1.0, (co.z - 1.20) / 0.34))
        co.y -= 0.16 + 0.11 * factor

mesh.update(calc_edges=True)
obj = bpy.data.objects.new("CryptGhoul", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.clear()
for name in material_order:
    label, color, emission, roughness = materials[name]
    material = bpy.data.materials.new(label)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = emission
    obj.data.materials.append(material)
for polygon, material in zip(obj.data.polygons, builder.face_mats):
    polygon.material_index = material

# Smooth the connected anatomy while preserving the flat color breaks and teeth.
for polygon in obj.data.polygons:
    polygon.use_smooth = polygon.material_index not in {M("socket"), M("teeth"), M("claw")}


def bone_segment_distance(point, bone):
    start = bone.head_local
    end = bone.tail_local
    segment = end - start
    if segment.length_squared == 0:
        return (point - start).length
    factor = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
    return (point - (start + segment * factor)).length


component_bones = {
    "torso": ["hips", "spine", "chest"],
    "pelvis": ["hips", "spine"],
    "cloth": ["hips", "spine"],
    "head": ["head", "chest"],
    "arm.l": ["upperarm.l", "lowerarm.l", "wrist.l", "hand.l"],
    "arm.r": ["upperarm.r", "lowerarm.r", "wrist.r", "hand.r"],
    "hand.l": ["lowerarm.l", "wrist.l", "hand.l"],
    "hand.r": ["lowerarm.r", "wrist.r", "hand.r"],
    "leg.l": ["upperleg.l", "lowerleg.l", "foot.l"],
    "leg.r": ["upperleg.r", "lowerleg.r", "foot.r"],
    "foot.l": ["lowerleg.l", "foot.l", "toes.l"],
    "foot.r": ["lowerleg.r", "foot.r", "toes.r"],
}
groups = {bone.name: obj.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
for vertex_index, component in enumerate(builder.vert_comp):
    point = mesh.vertices[vertex_index].co
    candidates = component_bones[component]
    distances = []
    for bone_name in candidates:
        distance = bone_segment_distance(point, rig.data.bones[bone_name])
        distances.append((distance, bone_name))
    distances.sort()
    selected = distances[:3]
    raw = [(1.0 / (distance + 0.015) ** 2.4, name) for distance, name in selected]
    total = sum(value for value, _ in raw)
    for value, name in raw:
        weight = value / total
        if weight >= 0.01:
            groups[name].add([vertex_index], weight, "REPLACE")

modifier = obj.modifiers.new("Armature", "ARMATURE")
modifier.object = rig
modifier.use_vertex_groups = True
obj["asset_role"] = "Crypt Ghoul"
obj["rig_source"] = "KayKit Ninja canonical 23-bone rig"
rig["rig_source_sha256"] = DONOR_SHA256
obj.parent = rig
obj.matrix_parent_inverse = rig.matrix_world.inverted()

# Since the portrait is dramatically crouched, retain the canonical rest rig and
# bind data while placing a neutral editable pose for review and export.
def rotate_global(name, axis, degrees):
    pose_bone = rig.pose.bones[name]
    rest_rotation = pose_bone.bone.matrix_local.to_quaternion()
    delta = Quaternion(Vector(axis).normalized(), math.radians(degrees))
    pose_bone.rotation_mode = "QUATERNION"
    local_delta = rest_rotation.inverted() @ delta @ rest_rotation
    pose_bone.rotation_quaternion = local_delta @ pose_bone.rotation_quaternion


rotate_global("hips", (1, 0, 0), 8)
rotate_global("spine", (1, 0, 0), 16)
rotate_global("chest", (1, 0, 0), 13)
rotate_global("head", (1, 0, 0), -14)
for suffix in ("l", "r"):
    side = 1 if suffix == "l" else -1
    rotate_global(f"upperarm.{suffix}", (0, 1, 0), side * 73)
    rotate_global(f"upperarm.{suffix}", (1, 0, 0), -24)
    rotate_global(f"lowerarm.{suffix}", (0, 1, 0), side * -24)
    rotate_global(f"lowerarm.{suffix}", (1, 0, 0), -28)
    rotate_global(f"hand.{suffix}", (0, 1, 0), side * 10)
    rotate_global(f"upperleg.{suffix}", (1, 0, 0), -38)
    rotate_global(f"lowerleg.{suffix}", (1, 0, 0), 78)
    rotate_global(f"foot.{suffix}", (1, 0, 0), -32)

# Explicitly requested gameplay scale. The undeformed donor-readable rig stays
# intact; maintain the transform unapplied on the bound object and armature.
scale = 1.16
obj.scale = (1.0, 1.0, 1.0)
rig.scale = (scale, scale, scale)

bpy.context.view_layer.update()
mesh.calc_loop_triangles()
print(
    "BUILT",
    "verts", len(mesh.vertices),
    "tris", len(mesh.loop_triangles),
    "materials", len(mesh.materials),
    "bones", len(rig.data.bones),
    "weighted", sum(1 for vertex in mesh.vertices if vertex.groups),
)
for bone in rig.data.bones:
    current = (
        bone.parent.name if bone.parent else None,
        tuple(round(v, 8) for row in bone.matrix_local for v in row),
    )
    assert current == rig_signature[bone.name], f"Rest data changed for {bone.name}"

# Make an intentionally minimal, camera/light-free editable source.
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "CryptGhoul.blend"))
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "CryptGhoul.glb"),
    export_format="GLB",
    use_selection=True,
    export_apply=False,
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_materials="EXPORT",
    export_yup=True,
)
print("WROTE", OUT / "CryptGhoul.blend", OUT / "CryptGhoul.glb")
sys.stdout.flush()
os._exit(0)
