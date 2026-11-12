"""Generate a private mesh candidate from a new creature modeling reference.

Run in the installed TRELLIS.2 environment with PILOT_ROOT IMAGE OUTPUT.
The output is a static reconstruction for Blender review and rigging.
"""
import argparse
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("pilot", type=Path)
parser.add_argument("image", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
sys.path[:0] = [
    str(args.pilot / "extensions/trellis2"),
    str(args.pilot / "tools/modly/api"),
]
from generator import Trellis2GGUFGenerator

args.output.mkdir(parents=True, exist_ok=True)
generator = Trellis2GGUFGenerator(args.pilot / "models/trellis2/generate", args.output)
generator._ensure_trellis2_gguf()
generator._ensure_gguf_files("Q6_K", "1024", None)
generator._load_pipeline("Q6_K")
mesh = generator.generate(
    args.image.read_bytes(),
    {
        "gguf_quant": "Q6_K",
        "pipeline_type": "1024",
        "ss_steps": 20,
        "slat_steps": 20,
        "remesh_resolution": 512,
        "seed": 42,
    },
)
mesh.rename(args.output / "source.glb")
