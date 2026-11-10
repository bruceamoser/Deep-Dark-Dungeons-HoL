import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = ROOT / "public" / "assets" / "creatures" / "wave-04" / "HobgoblinMarshal.glb"
OUT = ROOT / "test-results/asset-workers/hobgoblin-shieldguard"
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, metallic=0.0, roughness=0.7):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    mat.use_backface_culling = False
    return mat


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


class Geo:
    """Small deterministic mesh builder with one rigid armature group per part."""

    def __init__(self, materials, material_index):
        self.vertices = []
        self.faces = []
        self.face_mats = []
        self.vertex_bones = []
        self.materials = materials
        self.material_index = material_index

    def _vertex(self, co, bone):
        self.vertices.append(tuple(round(float(v), 6) for v in co))
        self.vertex_bones.append(bone)
        return len(self.vertices) - 1

    def _face(self, indices, mat):
        self.faces.append(tuple(indices))
        self.face_mats.append(self.material_index[mat])

    def box(self, center, size, mat, bone):
        cx, cy, cz = center
        hx, hy, hz = (s * 0.5 for s in size)
        base = len(self.vertices)
        for x, y, z in (
            (cx - hx, cy - hy, cz - hz),
            (cx + hx, cy - hy, cz - hz),
            (cx + hx, cy + hy, cz - hz),
            (cx - hx, cy + hy, cz - hz),
            (cx - hx, cy - hy, cz + hz),
            (cx + hx, cy - hy, cz + hz),
            (cx + hx, cy + hy, cz + hz),
            (cx - hx, cy + hy, cz + hz),
        ):
            self._vertex((x, y, z), bone)
        for f in (
            (0, 3, 2, 1),
            (4, 5, 6, 7),
            (0, 1, 5, 4),
            (1, 2, 6, 5),
            (2, 3, 7, 6),
            (3, 0, 4, 7),
        ):
            self._face(tuple(base + i for i in f), mat)

    def tapered_box(self, center, bottom, top, height, mat, bone):
        cx, cy, cz = center
        bwd, bdp = bottom[0] * 0.5, bottom[1] * 0.5
        twd, tdp = top[0] * 0.5, top[1] * 0.5
        z0, z1 = cz - height * 0.5, cz + height * 0.5
        base = len(self.vertices)
        for x, y, z in (
            (cx - bwd, cy - bdp, z0),
            (cx + bwd, cy - bdp, z0),
            (cx + bwd, cy + bdp, z0),
            (cx - bwd, cy + bdp, z0),
            (cx - twd, cy - tdp, z1),
            (cx + twd, cy - tdp, z1),
            (cx + twd, cy + tdp, z1),
            (cx - twd, cy + tdp, z1),
        ):
            self._vertex((x, y, z), bone)
        for f in (
            (0, 3, 2, 1),
            (4, 5, 6, 7),
            (0, 1, 5, 4),
            (1, 2, 6, 5),
            (2, 3, 7, 6),
            (3, 0, 4, 7),
        ):
            self._face(tuple(base + i for i in f), mat)

    def prism_xz(self, points, y0, y1, mat, bone):
        base = len(self.vertices)
        for x, z in points:
            self._vertex((x, y0, z), bone)
        for x, z in points:
            self._vertex((x, y1, z), bone)
        n = len(points)
        self._face(tuple(base + i for i in reversed(range(n))), mat)
        self._face(tuple(base + n + i for i in range(n)), mat)
        for i in range(n):
            j = (i + 1) % n
            self._face((base + i, base + j, base + n + j, base + n + i), mat)

    def polygon(self, points, mat, bone):
        base = len(self.vertices)
        for p in points:
            self._vertex(p, bone)
        self._face(tuple(base + i for i in range(len(points))), mat)

    def rotate_y_about(self, center, angle):
        """Rotate all geometry about a Y axis through the given X/Z center."""
        cx, _, cz = center
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        rotated = []
        for x, y, z in self.vertices:
            dx, dz = x - cx, z - cz
            rotated.append((
                cx + dx * cos_a + dz * sin_a,
                y,
                cz - dx * sin_a + dz * cos_a,
            ))
        self.vertices = rotated

    def tube(self, a, b, radius, mat, bone, sides=8, radius2=None):
        va, vb = Vector(a), Vector(b)
        axis = vb - va
        length = axis.length
        if length < 1e-8:
            return
        axis.normalize()
        helper = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
        u = axis.cross(helper).normalized()
        v = axis.cross(u).normalized()
        r2 = radius if radius2 is None else radius2
        base = len(self.vertices)
        for p, r in ((va, radius), (vb, r2)):
            for i in range(sides):
                angle = 2.0 * math.pi * i / sides
                self._vertex(p + u * (math.cos(angle) * r) + v * (math.sin(angle) * r), bone)
        for i in range(sides):
            j = (i + 1) % sides
            self._face((base + i, base + j, base + sides + j, base + sides + i), mat)
        self._face(tuple(base + i for i in reversed(range(sides))), mat)
        self._face(tuple(base + sides + i for i in range(sides)), mat)

    def create(self, name, rig):
        mesh = bpy.data.meshes.new(name + "_Mesh")
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        for mat in self.materials:
            mesh.materials.append(mat)
        for poly, mat_index in zip(mesh.polygons, self.face_mats):
            poly.material_index = mat_index
            poly.use_smooth = False
        groups = {}
        for v in mesh.vertices:
            bone = self.vertex_bones[v.index]
            group = groups.get(bone)
            if group is None:
                group = obj.vertex_groups.new(name=bone)
                groups[bone] = group
            group.add([v.index], 1.0, "REPLACE")
        obj.parent = rig
        obj.matrix_parent_inverse = rig.matrix_world.inverted()
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = rig
        mod.use_vertex_groups = True
        return obj


def build_kit(rig, mats):
    """Supplement the Marshal soldier silhouette without duplicating its anatomy."""
    m_idx = {m.name: i for i, m in enumerate(mats)}
    geo = Geo(mats, m_idx)

    # Overlapping darksteel lamellar bands sit just ahead of the Marshal cuirass.
    for row, z in enumerate((0.91, 1.005, 1.10, 1.195)):
        for col, x in enumerate((-0.18, -0.06, 0.06, 0.18)):
            geo.prism_xz(
                [(x - 0.052, z - 0.044), (x + 0.052, z - 0.044),
                 (x + 0.045, z + 0.044), (x - 0.045, z + 0.044)],
                -0.343, -0.318, "Steel", "spine"
            )
            if (row + col) % 2 == 0:
                geo.box((x, -0.357, z + 0.025), (0.012, 0.008, 0.012), "Brass", "spine")

    # Two crossed leather harness straps and a square belt buckle.
    geo.box((-0.10, -0.362, 1.08), (0.045, 0.018, 0.36), "Leather", "spine")
    geo.box((0.10, -0.363, 1.08), (0.045, 0.018, 0.36), "Leather", "spine")
    geo.box((0.0, -0.352, 0.735), (0.15, 0.026, 0.085), "Brass", "hips")
    geo.box((0.0, -0.369, 0.735), (0.075, 0.012, 0.045), "Black", "hips")

    # A torn burgundy tabard breaks up the otherwise armored waist.
    for i, (x, tip) in enumerate(((-0.15, 0.43), (-0.05, 0.34), (0.055, 0.41), (0.15, 0.36))):
        geo.prism_xz(
            [(x - 0.052, 0.72), (x + 0.052, 0.72),
             (x + 0.042, tip), (x, tip - 0.055), (x - 0.042, tip)],
            -0.300, -0.276, "Burgundy", "hips"
        )

    # Extra pointed tassets reinforce the thigh armor and family silhouette.
    for side in (-1, 1):
        x = side * 0.245
        geo.prism_xz(
            [(x - 0.11, 0.67), (x + 0.11, 0.67), (x + 0.085, 0.50),
             (x, 0.44), (x - 0.085, 0.50)],
            -0.286, -0.252, "Steel", "upperleg.l" if side > 0 else "upperleg.r"
        )
        geo.box((x, -0.301, 0.635), (0.15, 0.015, 0.025), "Brass", "upperleg.l" if side > 0 else "upperleg.r")
    return geo.create("HobgoblinShieldguard_Kit", rig)


def build_shield(rig, mats):
    m_idx = {m.name: i for i, m in enumerate(mats)}
    geo = Geo(mats, m_idx)
    bone = "handslot.l"
    cx, cz = 0.665, 1.115
    w, h = 0.66, 0.96
    front, back = -0.475, -0.415
    outline = [
        (cx - w / 2, cz - h / 2 + 0.06), (cx - w / 2 + 0.06, cz - h / 2),
        (cx + w / 2 - 0.06, cz - h / 2), (cx + w / 2, cz - h / 2 + 0.06),
        (cx + w / 2, cz + h / 2 - 0.06), (cx + w / 2 - 0.06, cz + h / 2),
        (cx - w / 2 + 0.06, cz + h / 2), (cx - w / 2, cz + h / 2 - 0.06),
    ]
    geo.prism_xz(outline, front, back, "Burgundy", bone)

    # Raised metal frame, corner braces and rivets.
    frame = 0.035
    geo.box((cx - w / 2 + frame / 2, front - 0.008, cz), (frame, 0.030, h - 0.09), "Steel", bone)
    geo.box((cx + w / 2 - frame / 2, front - 0.008, cz), (frame, 0.030, h - 0.09), "Steel", bone)
    geo.box((cx, front - 0.008, cz - h / 2 + frame / 2), (w - 0.09, 0.030, frame), "Steel", bone)
    geo.box((cx, front - 0.008, cz + h / 2 - frame / 2), (w - 0.09, 0.030, frame), "Steel", bone)
    for sx in (-1, 1):
        for sz in (-1, 1):
            px = cx + sx * (w / 2 - 0.075)
            pz = cz + sz * (h / 2 - 0.075)
            geo.tube((px, front - 0.011, pz), (px, front - 0.033, pz), 0.025, "Brass", bone, sides=6)

    # Central boss and four arms of the old regimental mark.
    geo.tube((cx, front - 0.010, cz), (cx, front - 0.085, cz), 0.105, "Brass", bone, sides=8, radius2=0.07)
    for dx, dz in ((0.20, 0), (-0.20, 0), (0, 0.29), (0, -0.29)):
        geo.box((cx + dx, front - 0.024, cz + dz), (0.028, 0.020, 0.19), "Brass", bone)

    # Geometric carved-name marks in pale ivory, not texture text.
    def mark(px, pz, kind):
        pieces = {
            0: [(0.0, 0.0, 0.075, 0.012)],
            1: [(0.0, 0.0, 0.012, 0.072)],
            2: [(-0.027, -0.017, 0.045, 0.011), (0.018, 0.022, 0.011, 0.040)],
            3: [(0.0, 0.0, 0.065, 0.011), (0.0, 0.015, 0.011, 0.050)],
            4: [(-0.025, 0.026, 0.012, 0.048), (-0.010, -0.028, 0.065, 0.011)],
        }[kind]
        for ox, oz, sw, sh in pieces:
            geo.box((px + ox, front - 0.038, pz + oz), (sw, 0.010, sh), "Ivory", bone)

    left_x, right_x = cx - 0.205, cx + 0.205
    for row, z in enumerate((cz + 0.315, cz + 0.235, cz + 0.155, cz - 0.16, cz - 0.24, cz - 0.32)):
        mark(left_x, z, row % 5)
        mark(right_x, z, (row + 2) % 5)
        mark(left_x - 0.075, z, (row + 3) % 5)
        mark(right_x + 0.075, z, (row + 1) % 5)

    # Leather arm straps on the rear face.
    geo.box((cx, back + 0.025, cz + 0.22), (0.34, 0.037, 0.045), "Leather", bone)
    geo.box((cx, back + 0.025, cz - 0.23), (0.34, 0.037, 0.045), "Leather", bone)

    # The donor hand socket projects authoring X into the animated upright axis.
    # Pre-rotate the complete panel about its face normal so the shared hand
    # animation presents the intended portrait shield instead of a landscape slab.
    # The rotation axis passes through the panel/grip center; the front-facing
    # normal and handslot.l weighting remain unchanged.
    geo.rotate_y_about((cx, 0.0, cz), math.pi / 2.0)
    return geo.create("RegimentWall", rig)


def build_spear(rig, mats):
    m_idx = {m.name: i for i, m in enumerate(mats)}
    geo = Geo(mats, m_idx)
    bone = "handslot.r"
    x, z = -0.8831, 1.0493
    # The donor hand socket points along -Y. Keeping the shaft on that axis
    # preserves the canonical grip for the shared spear animation.
    geo.tube((x, 0.58, z), (x, -1.48, z), 0.027, "Leather", bone, sides=8)
    geo.tube((x, 0.52, z), (x, 0.64, z), 0.036, "Steel", bone, sides=8, radius2=0.025)
    geo.tube((x, -1.34, z), (x, -1.79, z), 0.075, "Steel", bone, sides=4, radius2=0.004)
    geo.tube((x, -1.24, z), (x, -1.43, z), 0.075, "Steel", bone, sides=4, radius2=0.065)
    geo.box((x, -0.03, z), (0.075, 0.22, 0.050), "Leather", bone)
    return geo.create("RankedSpear", rig)


def export_and_render(rig, body, shield, spear):
    bpy.context.view_layer.update()
    mesh_objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    tri_count = 0
    vert_count = 0
    for obj in mesh_objects:
        obj.data.calc_loop_triangles()
        tri_count += len(obj.data.loop_triangles)
        vert_count += len(obj.data.vertices)
    mats = sorted({slot.material.name for obj in mesh_objects for slot in obj.material_slots if slot.material})
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in mesh_objects:
        evaluated = obj.evaluated_get(depsgraph)
        points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
    mins = [min(p[i] for p in points) for i in range(3)]
    maxs = [max(p[i] for p in points) for i in range(3)]
    dims = Vector([maxs[i] - mins[i] for i in range(3)])

    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "HobgoblinShieldguard.blend"), check_existing=False)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / "HobgoblinShieldguard.glb"),
        export_format="GLB",
        export_apply=False,
        export_animations=True,
        export_cameras=False,
        export_lights=False,
        use_selection=False,
    )

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.045, 0.055, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32

    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.004))
    ground = bpy.context.object
    ground.name = "RENDER_ONLY_Ground"
    ground_mat = material("RENDER_ONLY_GroundMat", (0.055, 0.06, 0.065), roughness=0.95)
    ground.data.materials.append(ground_mat)

    bpy.ops.object.light_add(type="AREA", location=(-2.8, -3.5, 4.2))
    key = bpy.context.object
    key.name = "RENDER_ONLY_Key"
    key.data.energy = 720
    key.data.shape = "DISK"
    key.data.size = 3.0
    look_at(key, (0, 0, 1.0))
    bpy.ops.object.light_add(type="AREA", location=(3.3, -1.4, 2.0))
    fill = bpy.context.object
    fill.name = "RENDER_ONLY_Fill"
    fill.data.energy = 420
    fill.data.size = 2.5
    look_at(fill, (0, 0, 1.0))
    bpy.ops.object.light_add(type="AREA", location=(0.4, 3.4, 3.0))
    rim = bpy.context.object
    rim.name = "RENDER_ONLY_Rim"
    rim.data.energy = 820
    rim.data.size = 2.0
    look_at(rim, (0, 0, 1.2))

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "RENDER_ONLY_Camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.55
    bpy.context.scene.camera = camera
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

    views = {
        "front": (0.0, -4.3, 1.12),
        "side": (4.3, 0.0, 1.12),
        "back": (0.0, 4.3, 1.12),
    }
    for label, position in views.items():
        camera.location = position
        look_at(camera, (0.0, 0.0, 1.03))
        scene.render.filepath = str(OUT / f"render_{label}.png")
        bpy.ops.render.render(write_still=True)

    total_height = dims.z
    submission = f"""# Hobgoblin Shieldguard

## Sources

- Directly imported project-authored CC0-derived soldier base:
  `public/assets/creatures/wave-04/HobgoblinMarshal.glb`
- Marshal SHA-256: `a5d271716a712f9117dd9be66d4b8e88d70464d3015140183c64233d34eda749`
- Portrait and rules reference: `input/reference.webp`, `input/reference.json`
- Build source: `build.py`

## Submission

- `output/HobgoblinShieldguard.blend`
- `output/HobgoblinShieldguard.glb`
- `output/inspection.json` (generated by the supplied validator)
- `output/render_front.png`, `output/render_side.png`, `output/render_back.png`

## Counts and assumptions

- {tri_count:,} triangles, {vert_count:,} Blender vertices before glTF primitive splitting, {len(mats)} materials.
- Three exported mesh objects: Marshal body/kit, `RegimentWall`, and `RankedSpear`.
- Thirteen expected GLB primitives: body/kit 6, spear 2 and shield 5.
- The original 23-bone hierarchy, local rests, parent relationships and inverse binds are retained. Imported skin weights are limited to 4 influences; custom parts use rigid one-bone weights.
- The Marshal's map board, blade, helmet polygons and armature display helpers were removed. The green wool is recolored burgundy and the soldier receives extra lamellar bands, harness straps, a torn tabard and tassets.
- No armature or object scale is applied. Measured exported-model bounding dimensions: {dims.x:.3f} x {dims.y:.3f} x {dims.z:.3f} units, including the tall shield and spear.
- Shield and spear vertices are weighted to the canonical `handslot.l` and `handslot.r` sockets. The spear shaft follows the donor socket's -Y axis.
- The shield panel is pre-rotated 90 degrees about its face normal through the grip center. Its neutral authoring bounds are approximately 0.96 x 0.66 units so the canonical shared hand projection presents the required tall shield, about 0.66 x 0.96, spanning thigh to chest without covering the face.
- This targeted revision changes only the panel geometry orientation; the 23-bone skeleton, canonical hand sockets and `RankedSpear` grip geometry are unchanged.
- Pale shield marks are raised geometry, original invented marks rather than text textures.
- The GLB contains only the rig and three intended meshes: no cameras, lights, helpers or render ground.

## Actual limitations

- This is a coherent first-pass review submission, not accepted production art.
- The Marshal face provides the red-brown angular identity, pointed ears and visible eyes, but it is a compact game-scale interpretation rather than a portrait sculpt.
- The neutral model retains the donor T-pose so the canonical hand sockets remain stable; the shared spear animation will determine the in-game readied pose.
- In-game Three.js rendering and shared spear-animation behavior were not available for review here; the organizer must verify them.
"""
    (OUT / "SUBMISSION.md").write_text(submission)
    print(
        "BUILD_OK",
        tri_count,
        "triangles;",
        len(mesh_objects),
        "meshes;",
        len(mats),
        "materials;",
        f"dimensions={dims.x:.3f},{dims.y:.3f},{dims.z:.3f}",
    )


def main():
    if not DONOR.is_file():
        raise FileNotFoundError(DONOR)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))

    rig = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if rig is None or len(rig.data.bones) != 23:
        raise RuntimeError("Expected donor armature with 23 bones")

    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj.name != "HobgoblinMarshal_Body":
            bpy.data.objects.remove(obj, do_unlink=True)
    donor_mesh = bpy.data.objects.get("HobgoblinMarshal_Body")
    if donor_mesh is None:
        raise RuntimeError("Marshal body mesh missing")

    steel_slot = next(
        (i for i, slot in enumerate(donor_mesh.material_slots)
         if slot.material and slot.material.name == "Helmet_Armor_Steel"),
        None,
    )
    if steel_slot is None:
        raise RuntimeError("Marshal steel material missing")
    bm = bmesh.new()
    bm.from_mesh(donor_mesh.data)
    remove = [
        face for face in bm.faces
        if face.material_index == steel_slot
        and sum(v.co.z for v in face.verts) / len(face.verts) > 1.58
    ]
    bmesh.ops.delete(bm, geom=remove, context="FACES")
    bm.to_mesh(donor_mesh.data)
    bm.free()
    donor_mesh.data.update()

    def mat(name):
        found = bpy.data.materials.get(name)
        if found is None:
            raise RuntimeError(f"Marshal material missing: {name}")
        return found

    skin = mat("Hobgoblin_Skin")
    steel = mat("Helmet_Armor_Steel")
    cloth = mat("Marshal_Green_Wool")
    leather = mat("Boots_Belt_Board_Wood")
    ink = mat("Mouth_Pupil_Map_Ink")
    eyes = mat("Hobgoblin_Amber_Eyes")
    pale = bpy.data.materials.get("Map_Parchment") or material("Shield_Ivory", (0.62, 0.53, 0.35), roughness=0.9)
    mats = [skin, steel, cloth, leather, ink, eyes, pale]
    for target, color, metallic, rough in (
        (skin, (0.24, 0.070, 0.035), 0.0, 0.78),
        (steel, (0.055, 0.067, 0.075), 0.72, 0.40),
        (cloth, (0.145, 0.014, 0.020), 0.0, 0.88),
        (leather, (0.095, 0.035, 0.018), 0.0, 0.88),
        (ink, (0.008, 0.006, 0.005), 0.0, 0.84),
        (eyes, (0.62, 0.20, 0.035), 0.0, 0.58),
        (pale, (0.62, 0.53, 0.35), 0.0, 0.90),
    ):
        target.diffuse_color = (*color, 1.0)
        target.use_nodes = True
        bsdf = target.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (*color, 1.0)
            bsdf.inputs["Metallic"].default_value = metallic
            bsdf.inputs["Roughness"].default_value = rough

    # Custom geometry uses stable role aliases over the seven retained materials.
    skin.name = "Skin"
    steel.name = "Steel"
    cloth.name = "Burgundy"
    leather.name = "Leather"
    ink.name = "Black"
    eyes.name = "Brass"
    pale.name = "Ivory"
    mats = [skin, steel, cloth, leather, ink, eyes, pale]

    body_kit = build_kit(rig, mats)
    shield = build_shield(rig, mats)
    spear = build_spear(rig, mats)

    # Consolidate the Marshal body and supplemental kit without welding or
    # applying transforms. Joining preserves the donor vertex groups and skins.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (donor_mesh, body_kit):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = donor_mesh
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = "HobgoblinShieldguard_Body"
    body.data.name = "HobgoblinShieldguard_Body_Mesh"
    bpy.context.view_layer.update()

    export_and_render(rig, body, shield, spear)
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
