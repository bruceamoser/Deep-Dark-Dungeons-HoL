"""Bake a bounded tail gesture and ground correction after assembling Werewolf."""
import bpy,sys,math
from pathlib import Path
from mathutils import Quaternion,Vector
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
tracks=list(rig.animation_data.nla_tracks)
for track in tracks:track.mute=True
tails=[rig.pose.bones[f'tail_{i}'] for i in range(4)]
root=rig.pose.bones['root']
for track in tracks:
    action=track.strips[0].action
    rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
    for bone in rig.pose.bones:bone.matrix_basis.identity()
    frames=range(math.floor(action.frame_range[0]),math.ceil(action.frame_range[1])+1)
    samples=[]
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        for tail in tails:
            tail.rotation_mode='QUATERNION';tail.rotation_quaternion=Quaternion()
        bpy.context.view_layer.update()
        u=(frame-frames.start)/max(1,len(frames)-1)
        if track.name=='Death_A_Pose':
            blend=min(1,max(0,(u-.18)/.4));blend=blend*blend*(3-2*blend)
            for tail,direction in zip(tails,[(0,1,.1),(.4,.8,-.2),(.8,.4,0),(.8,-.2,.1)]):
                desired=rig.matrix_world.to_3x3().inverted()@Vector(direction)
                current=(tail.tail-tail.head).normalized()
                turn=current.rotation_difference(desired.normalized())
                pose=Quaternion().slerp(turn,blend).to_matrix().to_4x4()@tail.matrix
                pose.translation=tail.head;tail.matrix=pose;bpy.context.view_layer.update()
        else:
            for i,tail in enumerate(tails):
                axis=(rig.matrix_world@tail.bone.matrix_local).to_3x3().inverted()@Vector((0,0,1))
                tail.rotation_quaternion=Quaternion(axis.normalized(),.065*math.sin(math.tau*u-i*.6))
        bpy.context.view_layer.update()
        graph=bpy.context.evaluated_depsgraph_get()
        minimum=min((o.matrix_world@v.co).z for mesh in bpy.context.scene.objects if mesh.type=='MESH' for o in [mesh.evaluated_get(graph)] for v in o.data.vertices)
        lift=max(0,.002-minimum) if track.name in {'Walking_A','Death_A_Pose'} else 0
        if lift>.16:raise ValueError((track.name,frame,'needs pose repair',lift))
        up=(rig.matrix_world@root.bone.matrix_local).to_3x3().inverted()@Vector((0,0,lift))
        samples.append((frame,[t.rotation_quaternion.copy() for t in tails],root.location+up))
    for frame,rotations,location in samples:
        for tail,rotation in zip(tails,rotations):
            tail.rotation_quaternion=rotation;tail.keyframe_insert(data_path='rotation_quaternion',frame=frame,group='Wolf tail gesture')
        if track.name in {'Walking_A','Death_A_Pose'}:
            root.location=location;root.keyframe_insert(data_path='location',frame=frame,group='Ground contact')
rig.animation_data.action=None
for b in rig.pose.bones:b.matrix_basis.identity()
for track in tracks:track.mute=False
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'werewolf.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'werewolf.glb'),export_extras=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
