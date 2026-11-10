"""Run with Blender --background --python; enables only the local bridge."""
import addon_utils
import bpy
addon_utils.enable('blender_mcp', default_set=True, persistent=True)
addon_utils.enable('rigify', default_set=True, persistent=True)
prefs = bpy.context.preferences.addons['blender_mcp'].preferences
prefs.bind_address = 'localhost'
prefs.telemetry_consent = False
for name in ['polyhaven', 'hyper3d', 'hunyuan3d', 'sketchfab', 'tripo', 'meshy', 'polypizza']:
    prop = 'blendermcp_use_' + name
    if hasattr(bpy.context.scene, prop):
        setattr(bpy.context.scene, prop, False)
bpy.ops.wm.save_userpref()
print('BLENDER_TOOLCHAIN_READY', bpy.app.version_string, 'loopback only; cloud integrations disabled')
