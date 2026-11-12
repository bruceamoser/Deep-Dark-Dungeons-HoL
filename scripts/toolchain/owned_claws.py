"""Build small curved nail tips on inspected Dungeon Mason hand landmarks."""

import math

import bpy
from mathutils import Vector


def add_claws(rig, recipe, material):
    vertices = []
    faces = []
    groups = {}
    sides = 8
    for sign, side in ((1, "l"), (-1, "r")):
        for nail in recipe:
            bone = nail["bone"] + "_" + side
            if bone not in rig.data.bones:
                raise ValueError(f"Claw socket missing: {bone}")
            start = Vector(nail["start"])
            direction = Vector(nail["direction"]).normalized()
            across = direction.cross(Vector((0, 0, 1))).normalized()
            depth = across.cross(direction).normalized()
            origin = len(vertices)
            for fraction, taper in ((0, 1), (0.36, 0.85), (0.72, 0.50)):
                center = start + direction * (nail["length"] * fraction)
                center.z -= nail["curl"] * fraction ** 2
                for index in range(sides):
                    angle = math.tau * index / sides
                    point = center + taper * nail["radius"] * (
                        across * math.cos(angle) + depth * (0.66 * math.sin(angle))
                    )
                    vertices.append((sign * point.x, point.y, point.z))
            tip = start + direction * nail["length"]
            tip.z -= nail["curl"]
            vertices.append((sign * tip.x, tip.y, tip.z))
            end = len(vertices) - 1
            local_faces = [tuple(range(origin, origin + sides))]
            for index in range(sides):
                following = (index + 1) % sides
                for ring in range(2):
                    lower = origin + ring * sides
                    local_faces.append((lower + index, lower + sides + index,
                                        lower + sides + following, lower + following))
                upper = origin + sides * 2
                local_faces.append((upper + index, end, upper + following))
            faces.extend(face if sign > 0 else tuple(reversed(face)) for face in local_faces)
            groups.setdefault(bone, []).extend(range(origin, end + 1))
    mesh = bpy.data.meshes.new("Ghoul nail tips")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()
    for bone, indices in groups.items():
        obj.vertex_groups.new(name=bone).add(indices, 1, "REPLACE")
    obj.modifiers.new("Source finger deformation", "ARMATURE").object = rig
    mesh.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = True
    return obj
