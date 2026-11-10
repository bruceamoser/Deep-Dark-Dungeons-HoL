"""Repair CaveBat's fully transparent embedded palette and produce review files.

Run with:
  blender --background --factory-startup --threads 4 --python build.py
"""

import hashlib
import json
import math
import os
import struct
import sys
import zlib
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "public/assets/creatures/bat.glb"
OUTPUT = ROOT / "test-results/asset-workers/cave-bat"
FIXED_GLB = OUTPUT / "CaveBat.glb"
BLEND_FILE = OUTPUT / "CaveBat.blend"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def paeth(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


PALETTE_REMAP = {
    (0x28, 0x1B, 0x3F): (0x4B, 0x33, 0x28),  # body and wing supports: warm dark umber
    (0x0B, 0x0B, 0x0B): (0x22, 0x1D, 0x19),  # membranes: dark charcoal brown
    (0xE7, 0xC0, 0x55): (0xA3, 0x8E, 0x71),  # chest: muted taupe
    (0x6D, 0x3C, 0x5A): (0x8B, 0x5A, 0x4C),  # inner ears and nose: restrained warm red-brown
}


def repair_png_palette(encoded):
    """Make the palette opaque and remap its five swatches for cave-biome review."""
    if encoded[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Embedded palette is not PNG")
    pos = 8
    width = height = bit_depth = color_type = None
    compressed = bytearray()
    while pos < len(encoded):
        length = struct.unpack_from(">I", encoded, pos)[0]
        kind = encoded[pos + 4 : pos + 8]
        payload = encoded[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack(
                ">IIBBBBB", payload
            )
            if (bit_depth, color_type, comp, filt, interlace) != (8, 6, 0, 0, 0):
                raise ValueError("Expected an 8-bit, non-interlaced RGBA palette PNG")
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break
    if width is None or color_type != 6:
        raise ValueError("Palette PNG has no usable RGBA image header")

    raw = zlib.decompress(bytes(compressed))
    bpp = 4
    stride = width * bpp
    previous = bytearray(stride)
    repaired_rows = []
    color_counts = {}
    cursor = 0
    for _ in range(height):
        filter_type = raw[cursor]
        cursor += 1
        filtered = raw[cursor : cursor + stride]
        cursor += stride
        row = bytearray(stride)
        for x, value in enumerate(filtered):
            left = row[x - bpp] if x >= bpp else 0
            above = previous[x]
            upper_left = previous[x - bpp] if x >= bpp else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = above
            elif filter_type == 3:
                predictor = (left + above) // 2
            elif filter_type == 4:
                predictor = paeth(left, above, upper_left)
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}")
            row[x] = (value + predictor) & 0xFF
        for x in range(0, stride, 4):
            source_rgb = tuple(row[x : x + 3])
            target_rgb = PALETTE_REMAP.get(source_rgb, source_rgb)
            row[x : x + 3] = target_rgb
            row[x + 3] = 255
            key = (source_rgb, target_rgb)
            color_counts[key] = color_counts.get(key, 0) + 1
        repaired_rows.append(b"\x00" + bytes(row))
        previous = row

    def chunk(kind, payload):
        body = kind + payload
        return (
            struct.pack(">I", len(payload))
            + body
            + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    rebuilt = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(b"".join(repaired_rows), 9))
        + chunk(b"IEND", b"")
    )
    return rebuilt, width, height, len(repaired_rows), color_counts


def repair_glb():
    data = SOURCE.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise ValueError("Unexpected source GLB container")

    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise ValueError("Source has no JSON chunk")
    document = json.loads(data[20 : 20 + json_length])
    bin_header = 20 + json_length
    bin_length, bin_type = struct.unpack_from("<I4s", data, bin_header)
    if bin_type != b"BIN\x00":
        raise ValueError("Source has no BIN chunk")
    binary = bytearray(data[bin_header + 8 : bin_header + 8 + bin_length])
    source_document = json.loads(json.dumps(document))
    source_binary = bytes(binary)

    if len(document.get("images", [])) != 1 or len(document.get("materials", [])) != 1:
        raise ValueError("Expected the supplied one-palette, one-material layout")
    image = document["images"][0]
    view_index = image["bufferView"]
    view = document["bufferViews"][view_index]
    image_offset = view.get("byteOffset", 0)
    old_length = view["byteLength"]
    old_image = bytes(binary[image_offset : image_offset + old_length])
    fixed_image, width, height, rows, color_counts = repair_png_palette(old_image)

    old_end = image_offset + old_length
    delta = len(fixed_image) - old_length
    binary = binary[:image_offset] + fixed_image + binary[old_end:]
    view["byteLength"] = len(fixed_image)
    for index, candidate in enumerate(document["bufferViews"]):
        if index != view_index and candidate.get("byteOffset", 0) >= old_end:
            candidate["byteOffset"] = candidate.get("byteOffset", 0) + delta
    document["buffers"][0]["byteLength"] = len(binary)

    material = document["materials"][0]
    original_alpha_mode = material.get("alphaMode", "OPAQUE")
    material["alphaMode"] = "OPAQUE"
    material.pop("alphaCutoff", None)
    material["doubleSided"] = True
    document.setdefault("asset", {}).setdefault("extras", {})[
        "caveBatRepair"
    ] = (
        "Embedded palette alpha restored to opaque and RGB remapped to warm umber, "
        "muted taupe, charcoal brown, and restrained red-brown; geometry, skin, "
        "and animation data retained"
    )

    encoded_json = json.dumps(document, separators=(",", ":")).encode("utf-8")
    encoded_json += b" " * ((4 - len(encoded_json) % 4) % 4)
    encoded_binary = bytes(binary)
    encoded_binary += b"\x00" * ((4 - len(encoded_binary) % 4) % 4)
    new_length = 12 + 8 + len(encoded_json) + 8 + len(encoded_binary)
    glb = (
        struct.pack("<4sII", b"glTF", 2, new_length)
        + struct.pack("<I4s", len(encoded_json), b"JSON")
        + encoded_json
        + struct.pack("<I4s", len(encoded_binary), b"BIN\x00")
        + encoded_binary
    )
    OUTPUT.mkdir(parents=True, exist_ok=True)
    FIXED_GLB.write_bytes(glb)
    unchanged_sections = {
        section: source_document.get(section) == document.get(section)
        for section in ("meshes", "nodes", "skins", "accessors", "animations")
    }
    non_image_views_compared = 0
    non_image_views_changed = 0
    for index, source_view in enumerate(source_document["bufferViews"]):
        if index == view_index:
            continue
        output_view = document["bufferViews"][index]
        source_offset = source_view.get("byteOffset", 0)
        output_offset = output_view.get("byteOffset", 0)
        source_payload = source_binary[
            source_offset : source_offset + source_view["byteLength"]
        ]
        output_payload = bytes(binary)[
            output_offset : output_offset + output_view["byteLength"]
        ]
        non_image_views_compared += 1
        non_image_views_changed += source_payload != output_payload
    color_mapping = [
        {
            "from": "#{:02x}{:02x}{:02x}".format(*source_rgb),
            "to": "#{:02x}{:02x}{:02x}".format(*target_rgb),
            "pixels": count,
        }
        for (source_rgb, target_rgb), count in sorted(
            color_counts.items(), key=lambda item: (-item[1], item[0])
        )
    ]
    return {
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": sha256(SOURCE),
        "output": str(FIXED_GLB.relative_to(ROOT)),
        "output_sha256": sha256(FIXED_GLB),
        "palette_dimensions": [width, height],
        "palette_rows": rows,
        "palette_rgba_before": "all 128 alpha values were 0",
        "palette_rgba_after": "all 128 alpha values are 255",
        "palette_color_mapping": color_mapping,
        "palette_rgb_changed_pixels": sum(
            count for (source_rgb, target_rgb), count in color_counts.items()
            if source_rgb != target_rgb
        ),
        "material_alpha_before": original_alpha_mode,
        "material_alpha_after": "OPAQUE",
        "unchanged_json_sections": unchanged_sections,
        "non_image_buffer_views_compared": non_image_views_compared,
        "non_image_buffer_views_changed": non_image_views_changed,
        "geometry_changed": not unchanged_sections["meshes"] or not unchanged_sections["accessors"] or non_image_views_changed > 0,
        "skin_changed": not unchanged_sections["skins"] or not unchanged_sections["accessors"] or non_image_views_changed > 0,
        "rig_changed": not unchanged_sections["nodes"] or not unchanged_sections["skins"] or not unchanged_sections["accessors"] or non_image_views_changed > 0,
        "animation_changed": not unchanged_sections["animations"] or not unchanged_sections["accessors"] or non_image_views_changed > 0,
        "glb_binary_byte_delta": delta,
    }


def bounds_of_meshes():
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and not obj.hide_render:
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector(min(p[i] for p in points) for i in range(3))
    maximum = Vector(max(p[i] for p in points) for i in range(3))
    return minimum, maximum


def aim_camera(camera, location, target):
    camera.location = location
    direction = target - location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_area(name, location, target, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
    return obj


def render_views():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    if scene.world is None:
        scene.world = bpy.data.worlds.new("CaveBatReviewWorld")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.015, 0.018, 0.024, 1.0)
    background.inputs["Strength"].default_value = 0.35
    scene.view_settings.look = "AgX - Medium High Contrast"

    minimum, maximum = bounds_of_meshes()
    center = (minimum + maximum) * 0.5
    extent = maximum - minimum
    span = max(extent.x, extent.y, extent.z)

    camera_data = bpy.data.cameras.new("ReviewCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = span * 1.22
    camera = bpy.data.objects.new("ReviewCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    distance = span * 3.0
    views = {
        "front": center + Vector((0.0, -distance, extent.z * 0.04)),
        "side": center + Vector((distance, 0.0, extent.z * 0.04)),
        "back": center + Vector((0.0, distance, extent.z * 0.04)),
    }
    add_area(
        "Key",
        center + Vector((-extent.x * 2.2, -extent.y * 1.8, extent.z * 2.1)),
        center,
        1050,
        span * 1.8,
        (1.0, 0.82, 0.62),
    )
    add_area(
        "Fill",
        center + Vector((extent.x * 2.0, -extent.y * 1.3, extent.z * 0.5)),
        center,
        700,
        span * 1.5,
        (0.58, 0.68, 0.78),
    )
    add_area(
        "Rim",
        center + Vector((0.0, extent.y * 2.2, extent.z * 1.5)),
        center,
        1200,
        span * 1.4,
        (0.90, 0.68, 0.48),
    )

    for name, location in views.items():
        aim_camera(camera, location, center)
        scene.render.filepath = str(OUTPUT / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", name, scene.render.filepath)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    repair = repair_glb()
    bpy.ops.import_scene.gltf(filepath=str(FIXED_GLB))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    for armature in armatures:
        if armature.animation_data:
            armature.animation_data.action = None
        display_helpers = {
            pose_bone.custom_shape
            for pose_bone in armature.pose.bones
            if pose_bone.custom_shape is not None
        }
        for pose_bone in armature.pose.bones:
            pose_bone.custom_shape = None
            pose_bone.matrix_basis = Matrix.Identity(4)
        for helper in display_helpers:
            bpy.data.objects.remove(helper, do_unlink=True)

    # Force opaque material interpretation in the editable review scene as well.
    for material in bpy.data.materials:
        material.diffuse_color[3] = 1.0
        if material.use_nodes:
            material.surface_render_method = "DITHERED"
            for node in material.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    alpha = node.inputs.get("Alpha")
                    if alpha:
                        alpha.default_value = 1.0

    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = 60
    scene.frame_set(1)
    BLEND_FILE.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_FILE), check_existing=False)
    print("saved", BLEND_FILE)

    render_views()
    repair["active_actions"] = [action.name for action in bpy.data.actions]
    repair["armatures"] = [
        {"name": armature.name, "bones": len(armature.data.bones)}
        for armature in armatures
    ]
    repair["render"] = {
        "views": ["front", "side", "back"],
        "resolution": [512, 512],
        "engine": "CYCLES CPU",
        "samples": 16,
        "threads": 4,
    }
    (OUTPUT / "build_report.json").write_text(json.dumps(repair, indent=2) + "\n")
    print("BUILD_OK", json.dumps({k: repair[k] for k in (
        "output_sha256", "palette_dimensions", "material_alpha_before",
        "material_alpha_after", "geometry_changed", "skin_changed",
        "rig_changed", "animation_changed"
    )}, separators=(",", ":")))
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(0)


main()
