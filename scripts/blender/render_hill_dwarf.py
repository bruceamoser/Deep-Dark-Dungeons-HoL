"""Render the active prototype scene for visual review (no source modifications)."""
import bpy, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
scene=bpy.data.scenes['Hill dwarf — neutral base'];bpy.context.window.scene=scene
scene.cycles.samples=16
scene.render.resolution_percentage=80
for name,position in [('three-quarter',(2.6,-4.5,2.2)),('front',(0,-5,1.55)),('side',(5,0,1.55)),('back',(0,5,1.55))]:
    scene.camera.location=position
    scene.camera.rotation_euler=(Vector((0,0,.84))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(root/'art/exports/characters'/f'hill-dwarf-{name}.png')
    bpy.ops.render.render(write_still=True)
