"""Fit the previously reviewed launcher and dart to the reconstructed scout."""

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
    muzzle = bpy.data.objects.new("ScoutDartMuzzle", None)
    bpy.context.collection.objects.link(muzzle)
    muzzle.parent = rig
    muzzle.parent_type = "BONE"
    muzzle.parent_bone = "RHand"
    bpy.context.view_layer.update()
    donor_muzzle = Vector((-.885-.78*(.481-.055), -.055, 1.09))
    muzzle.matrix_world = (Matrix.Translation(transform @ donor_muzzle)
                          @ axis.to_track_quat("Z", "Y").to_matrix().to_4x4())
    return [launcher, dart], axis
