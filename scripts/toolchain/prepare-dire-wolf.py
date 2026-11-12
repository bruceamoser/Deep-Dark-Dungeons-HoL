"""Make the heavier pale-ruff Dire Wolf from the reviewed private Wolf rig.
Only a localized torso morph and vertex coat change; preserve fitted eyes/jaw,
weights, bones and animation. Source is never saved over.
"""
from pathlib import Path
import bpy, numpy as np, sys, json
source,out=map(Path,sys.argv[sys.argv.index('--')+1:]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source))
body=max((o for o in bpy.data.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
xyz=np.array([v.co[:] for v in body.data.vertices]);x,y,z=xyz.T
smooth=lambda a: np.clip(a,0,1)**2*(3-2*np.clip(a,0,1))
# Widen upper chest/ruff, fading before head and lower legs. Do not disturb sockets.
ruff=smooth((y+.17)/.045)*smooth((.045-y)/.12)*smooth((z-.13)/.08)
for v,w in zip(body.data.vertices,ruff):v.co.x*=1+.25*w
saddle=smooth((z-.21)/.08);head=smooth((-y-.14)/.04)
cap=smooth((z-.31)/.025)
coat=saddle*(1-head)+cap*head
cream=np.array([.87,.84,.73]);gray=np.array([.21,.25,.29]);dark=np.array([.055,.065,.075])
color=cream*(1-coat[:,None])+gray*coat[:,None]
pale=ruff*.72;color=color*(1-pale[:,None])+cream*pale[:,None]
tip=smooth((y-.18)/.035)*smooth((.14-z)/.045)
color=color*(1-tip[:,None])+dark*tip[:,None]
nose=smooth((-y-.223)/.012)*smooth((.307-z)/.012)*smooth((z-.263)/.012)
color=color*(1-nose[:,None])+np.array([.025,.032,.038])*nose[:,None]
linear=np.where(color<=.04045,color/12.92,((color+.055)/1.055)**2.4)
body.data.color_attributes['WolfCoat'].data.foreach_set('color',np.column_stack([linear,np.ones(len(linear))]).astype(np.float32).ravel())
body.data.materials[0].name='Dire Wolf charcoal saddle and ivory ruff'
# Canonical game attack identifier carries the actual donor jaw bite animation.
for t in rig.animation_data.nla_tracks:
 if t.name=='Bite_Front':
  t.name='1H_Melee_Attack_Slice_Diagonal'
  for s in t.strips:s.action.name=t.name;s.name=t.name
rig['fldCreature']='creature-dire-wolf'
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'dire-wolf.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'dire-wolf.glb'),export_animation_mode='NLA_TRACKS',export_extras=True)
(out/'provenance.json').write_text(json.dumps({'source':str(source),'changes':'Localized 25% upper chest widening; ivory ruff/charcoal coat; preserved rig, mouth and motion; canonical attack alias is a bite.'},indent=2))
