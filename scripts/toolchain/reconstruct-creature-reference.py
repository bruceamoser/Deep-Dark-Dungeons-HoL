"""Generate a private mesh candidate from a new creature modeling reference.

Run in the installed TRELLIS.2 environment with PILOT_ROOT IMAGE OUTPUT.
Pass --texture-mesh with a reduced GLB to bake the reference onto it.
The output is a static reconstruction for Blender review and rigging.
"""
import argparse
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("pilot", type=Path)
parser.add_argument("image", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--texture-mesh", type=Path)
args = parser.parse_args()
sys.path[:0] = [
    str(args.pilot / "extensions/trellis2"),
    str(args.pilot / "tools/modly/api"),
]
from generator import Trellis2GGUFGenerator

args.output.mkdir(parents=True, exist_ok=True)
stage = "refine" if args.texture_mesh else "generate"
quantization = "Q5_K_M" if args.texture_mesh else "Q6_K"
generator = Trellis2GGUFGenerator(args.pilot / "models/trellis2" / stage, args.output)
generator._ensure_trellis2_gguf()
generator._ensure_gguf_files(quantization, "1024", None)
generator._load_pipeline(quantization)
params = {
    "gguf_quant": "Q6_K",
    "pipeline_type": "1024",
    "ss_steps": 20,
    "slat_steps": 20,
    "remesh_resolution": 512,
    "seed": 42,
}
if args.texture_mesh:
    params = {"mesh_path": str(args.texture_mesh.resolve()), "seed": 42}
mesh = generator.generate(args.image.read_bytes(), params)
mesh.rename(args.output / ("textured.glb" if args.texture_mesh else "source.glb"))
