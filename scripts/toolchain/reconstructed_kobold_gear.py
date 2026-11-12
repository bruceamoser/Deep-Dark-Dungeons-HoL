"""Fit reviewed dart equipment to reconstructed kobold palms."""

import bmesh
import bpy
from mathutils import Matrix, Vector


def fit_launcher(source, rig, grip, bind):
    names = ["KoboldScout_Body", "Loaded_Dart"]
    with bpy.data.libraries.load(str(source), link=False) as (available, loaded):
        assert all(name in available.objects for name in names)
        loaded.objects = names
    launcher, dart = loaded.objects

    # The reviewed source mesh joins the launcher and body. Select the
    # right-hand prop's three material regions and preserve its UVs and maps.
    group = launcher.vertex_groups["hand.r"].index
    materials = {"Bronze", "ScoutLeather", "Kobold_Scale_Shadow"}
    keep = {
        face.index for face in launcher.data.polygons
        if launcher.data.materials[face.material_index].name in materials
        and all(any(weight.group == group and weight.weight > .999
                    for weight in launcher.data.vertices[index].groups)
                for index in face.vertices)
    }
    assert len(keep) == 44, "Inspect the reviewed launcher donor before fitting"
    mesh = bmesh.new()
    mesh.from_mesh(launcher.data)
    bmesh.ops.delete(mesh, geom=[face for face in mesh.faces if face.index not in keep],
                     context="FACES")
    mesh.to_mesh(launcher.data)
    mesh.free()

    donor_grip = Vector((-.885, -.055, .98))
    spin = Matrix.Rotation(1.37, 4, "Z")
    transform = Matrix.Translation(grip) @ spin @ Matrix.Scale(.82, 4) @ Matrix.Translation(-donor_grip)
    for obj in (launcher, dart):
        bpy.context.collection.objects.link(obj)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        obj.data.transform(transform)
        obj.modifiers.clear()
        obj.vertex_groups.clear()
        bind(obj, "RHand")
    launcher.name = "Scout dart launcher"
    axis = (spin.to_3x3() @ Vector((-1, 0, 0))).normalized()
    donor_muzzle = Vector((-.885-.78*(.481-.055), -.055, 1.09))
    hand_muzzle(rig, "ScoutDartMuzzle", transform @ donor_muzzle, axis)
    return [launcher, dart], axis


def hand_muzzle(rig, name, tip, axis):
    muzzle = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(muzzle)
    muzzle.parent = rig
    muzzle.parent_type = "BONE"
    muzzle.parent_bone = "RHand"
    bpy.context.view_layer.update()
    muzzle.matrix_world = (Matrix.Translation(tip)
                          @ axis.to_track_quat("Z", "Y").to_matrix().to_4x4())


def fit_throw_dart(source, rig, grip, bind):
    with bpy.data.libraries.load(str(source), link=False) as (available, loaded):
        assert "Loaded_Dart" in available.objects
        loaded.objects = ["Loaded_Dart"]
    dart, = loaded.objects
    bpy.context.collection.objects.link(dart)
    donor_base = Vector((-.890, -.085, 1.045))
    donor_tip = Vector((-1.030, -.295, .835))
    donor_axis = (donor_tip-donor_base).normalized()
    donor_grip = donor_base.lerp(donor_tip, .40)
    axis = Vector((-.18, -.84, .51)).normalized()
    rotation = donor_axis.rotation_difference(axis).to_matrix().to_4x4()
    transform = Matrix.Translation(grip) @ rotation @ Matrix.Scale(.8, 4) @ Matrix.Translation(-donor_grip)
    dart.data.transform(transform @ dart.matrix_world)
    dart.parent = None
    dart.matrix_world = Matrix.Identity(4)
    dart.modifiers.clear()
    dart.vertex_groups.clear()
    bind(dart, "RHand")
    hand_muzzle(rig, "TrapkeeperDartMuzzle", transform @ donor_tip, axis)
    return [dart], axis


def fit_brazier(source, rig, grip, bind):
    with bpy.data.libraries.load(str(source), link=False) as (available, loaded):
        assert "HangingBrazier" in available.objects
        loaded.objects = ["HangingBrazier"]
    brazier, = loaded.objects
    bpy.context.collection.objects.link(brazier)
    donor_grip = Vector((.900, -.110, 1.096))
    transform = Matrix.Translation(grip) @ Matrix.Scale(.67, 4) @ Matrix.Translation(-donor_grip)
    brazier.data.transform(transform @ brazier.matrix_world)
    brazier.parent = None
    brazier.matrix_world = Matrix.Identity(4)
    brazier.modifiers.clear()
    brazier.vertex_groups.clear()
    bind(brazier, "Brazier")
    hand = rig.data.bones["RHand"]
    palm = hand.head_local.lerp(hand.tail_local, .69)
    hand_muzzle(rig, "EmberPalmMuzzle", palm, Vector((0, -1, 0)))
    return [brazier]
