"""Inspect every source frame of an assembled equipped .blend, without repair.
Usage: blender -b --python-exit-code 1 --python THIS -- scene.blend report.json
Tiny source sole/cloth contact is allowed up to 0.03 world units; deeper
penetration fails. This supplements visual review, not body/prop collision QA.
"""
import bpy,sys,json,math
from pathlib import Path
scene,report_path=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=str(Path(scene)))
rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
report={}
for clip in [t.name for t in rigs[0].animation_data.nla_tracks]:
 start=999999;end=0
 for r in rigs:
  r.animation_data.action=None
  for b in r.pose.bones:b.matrix_basis.identity()
  for t in r.animation_data.nla_tracks:t.mute=True
  t=next(t for t in r.animation_data.nla_tracks if t.name==clip);r.animation_data.action=t.strips[0].action;r.animation_data.action_slot=r.animation_data.action.slots[0];start=min(start,math.floor(t.strips[0].action_frame_start));end=max(end,math.ceil(t.strips[0].action_frame_end))
 for obj in bpy.context.scene.objects:
  keys=obj.data.shape_keys if obj.type=='MESH' else None
  if keys and keys.animation_data:
   keys.animation_data.action=None
   for track in keys.animation_data.nla_tracks:track.mute=track.name!=clip
 vals={}
 for f in range(start,end+1):
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
  for o in bpy.context.scene.objects:
   if o.type!='MESH':continue
   ev=o.evaluated_get(dg);z=min((ev.matrix_world@v.co).z for v in ev.data.vertices)
   if o.name not in vals or z<vals[o.name]['z']:vals[o.name]={'z':round(z,4),'frame':f}
 report[clip]=vals
 print(clip,sorted(vals.items(),key=lambda kv:kv[1]['z'])[:5])
Path(report_path).write_text(json.dumps(report,indent=2)+'\n')
failures=[(clip,name,row) for clip,meshes in report.items() for name,row in meshes.items() if row['z'] < -.03]
assert not failures,('Review ground penetration',failures)
