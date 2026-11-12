"""Reduce a reconstructed static GLB in the installed CuMesh environment."""
import argparse
from pathlib import Path

import cumesh
import numpy as np
import torch
import trimesh

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--triangles", type=int, default=75000)
args = parser.parse_args()

source = trimesh.load(args.source, force="mesh", process=False)
mesh = cumesh.CuMesh()
vertices = torch.from_numpy(np.asarray(source.vertices, dtype=np.float32)).cuda().contiguous()
faces = torch.from_numpy(np.asarray(source.faces, dtype=np.int32)).cuda().contiguous()
mesh.init(vertices, faces)
mesh.simplify(args.triangles)
vertices, faces = mesh.read()
reduced = trimesh.Trimesh(vertices.cpu().numpy(), faces.cpu().numpy(), process=False)
print(f"Reduced {len(source.faces):,} to {len(reduced.faces):,} triangles")
reduced.export(args.output)
