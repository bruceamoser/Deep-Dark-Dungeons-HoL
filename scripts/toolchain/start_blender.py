"""Start an isolated Blender tool session, never a player's/source asset scene."""
import addon_utils
import bpy
addon_utils.enable('blender_mcp', default_set=False, persistent=True)
prefs = bpy.context.preferences.addons['blender_mcp'].preferences
prefs.bind_address = 'localhost'
prefs.telemetry_consent = False
for name in ['polyhaven', 'hyper3d', 'hunyuan3d', 'sketchfab', 'tripo', 'meshy', 'polypizza']:
    prop = 'blendermcp_use_' + name
    if hasattr(bpy.context.scene, prop):
        setattr(bpy.context.scene, prop, False)
bpy.context.scene.blendermcp_auto_start_server = True
print('Four Lanterns Deep isolated asset workspace; paid/cloud generation disabled.')
