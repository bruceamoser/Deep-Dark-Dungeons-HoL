# Local Hunyuan feasibility — November 11, 2026

Research only: no weights downloaded, installation, generation or game asset replacement. Bruce reports that Tripo did not improve the Air Elemental enough to justify its cost. He asks whether local multiview Hunyuan can reduce base-mesh authoring time.

## Verified capabilities and hardware fit

- [Hunyuan3D-2mv model card](https://huggingface.co/tencent/Hunyuan3D-2mv) provides a dedicated multiview shape model. Its [preprocessor](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/hy3dgen/shapegen/preprocessors.py) accepts `front`, `left`, `back`, `right` images. Use the existing individual reference views, not the composite sheet as one image. Verify orientation, consistent proportions and background masks first.
- [Official 2.0 repository](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) supports Linux and documents approximately 6 GB VRAM for shape / 16 GB for shape plus texture. These are upstream figures, not a local benchmark. Two local RTX 3090s each have 24 GB; memory is not automatically pooled. Run one initial job on one card.
- [2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) documents 10 GB shape / 21 GB paint / 29 GB combined, with PBR output and low-memory mode. Stage unloading/offload is needed on a 24 GB card. Its multiview texture projection should not be confused with the dedicated 2mv input-conditioned shape model.
- The 2mv example uses 30 inference steps, octree resolution 380 and a fixed seed. Standard, Fast and Turbo variants exist. A proposed bounded trial would establish the standard baseline before testing speed variants or higher extraction resolution. More extraction resolution does not automatically repair anatomy or yield deformation-friendly topology.

## Material license obstacle

The [actual 2mv weights license](https://huggingface.co/tencent/Hunyuan3D-2mv/blob/main/LICENSE), sections 1(l) and 5(c), excludes EU, UK and South Korea and expressly applies the territorial restriction to outputs/results as well as model works. Section 6(d)'s statement that Tencent claims no output rights does not remove that explicit clause. Do not describe this as unrestricted commercial open source or promote outputs into a globally distributed game without resolving the restriction. This is a direct reading of the published terms, not legal advice.

## Practical recommendation

Technically plausible for base meshes and potentially less initial sculpting time; no measured total-time or quality improvement yet. It does not establish clean joint loops, separate clothing/gear, a skeleton, reliable grips or game-ready animation. Those were major failure points in earlier generation experiments and still require validation.

If the license issue is resolved, compare one existing Air Elemental reference and one equipped Slinger reference against the current pipeline, without new image generation or a roster batch. Measure total human/agent correction time through motion acceptance, missing/merged parts, silhouette, material cohesion and final runtime cost. Keep the existing reusable humanoid rig/gear route as the baseline. No further purchase is needed for the local technical experiment; setup would use an isolated Python/CUDA environment, official code/weights and optional texture rasterizer extensions.
