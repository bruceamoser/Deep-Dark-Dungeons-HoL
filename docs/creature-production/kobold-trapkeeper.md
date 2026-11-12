# Kobold Trapkeeper — active refinement

Pinned bestiary: small lightly built russet kobold, dart case, tool belt and marked safe-route cords. Use the refined Scout's recessed amber eyes and wedge skull, solid red skin with TextureCraft scale normals, and smooth moss-green clothing. Tan apron, dark leather case, brass tools and bright cord markers distinguish the occupation.

Owned search: reviewed the previous CC0 KayKit-derived Trapkeeper assembly and refined Scout. The existing fitted case, tool belt, apron and marked cord loops already match the reference; preserve and refit those rather than replace them. KayKit RPG Tools rope_bundle_A and lockpick_set and Mixed Bag beartrap_A are available alternatives, but have not yet been visually fitted. No paid generation. Preserve original donor/rest matrices and reusable gear recipe.

Private candidate: `~/.local/share/four-lanterns-creature-production/kobold-trapkeeper/refined-base/`. Initial front/side/back preview passed silhouette inspection; not final material or motion acceptance. Split the readied dart from worn gear so the same mesh can release during the source Throw clip. Full motion, floor/reimport, actual game and manifest integration gates remain pending. No performance or installed-delivery claim.

## Reviewed result

Exact export SHA-256 `79482dae47454ddc7e661a24fec0c55432e5ef9562a89890905bc95a8e17bfe3`, 1,627,836 bytes; 8,853 triangles, 27 bones, six clips, nine materials, 13 primitives, 18 embedded 512px maps (approximately 24 MiB RGBA8+mipmaps). Flat red color is independent of the TextureCraft scale normal map. Smooth green cloth and tan apron remain separate from weathered leather and metal.

Reviewed front/side/back, 581 motion frames, floor contact and reimport. The old rig used Euler modes with quaternion source curves; explicitly selecting quaternion modes fixes this. Removed only the donor's unused rig-display mesh. A bounded throw root correction fixes a 0.046-unit sole penetration; idle/hit retain less than 0.004-unit contact tolerance. No loose/unweighted/degenerate geometry in reimport.

The exact candidate passed muted bestiary and six-Trapkeeper/four-hero dungeon checks, including all five states and real held-dart release/recovery at 0.70/1.35 seconds. Source Throw provides the windup, release and follow-through; melee uses the source punch. No JS errors. All 21 applicable asset tests and the required-assets production build pass. Build retains the known bundle-size advisory.

Author fit 83/100: anatomy4, silhouette4, signature4, gear4, materials5, distinction4. Remaining limits: chunky stylized hands, simplified apron panels and a small dart at the normal dungeon zoom. Bulk user review, packaged delivery and performance remain pending.

Rebuild with `build-kobold-trapkeeper-refined.py` from the private Scout recessed-base GLB, then `texture-kobold-trapkeeper.py`, then `animate-kobold-trapkeeper.py`. Exact reviewed Blend, GLB and evidence are under private `kobold-trapkeeper/final-v2/`; TextureCraft project/maps are in `materials-v2/`.

## November 12 image rebuild

The Trapkeeper has new reconstructed anatomy and clothing from its own frontal reference. Red sculpted scales, inset amber eyes, a wider stance, green tunic, ochre apron, tool pockets, dart case and marked rope distinguish it from the Scout. TRELLIS Q6_K reconstructed 3,343,861 triangles. CuMesh reduced that mesh to 72,328 for texture inference. The finished export has 72,452 triangles including the separate fitted dart.

The tail has four joints fitted to this creature's shorter curved geometry. The hand carries the previously reviewed locally authored dart, preserving its materials. A one-arm windup and throw let it leave the palm on frame 15 at 24 fps, with recovery at 1.10 seconds. The melee fallback is a left-hand strike. All six clips pass floor clearance and the GLB round-trips without degenerate faces, loose vertices or unweighted vertices. The private files and 591-frame motion review are in `~/.local/share/four-lanterns-creature-production/kobold-trapkeeper/image-rebuild/rigged/`.

The muted development bestiary and six-Trapkeeper/four-hero dungeon fixture loaded the pinned export. Sixty shot samples confirm that the held dart disappears, the single dart mesh flies and the load returns on recovery. Zero JavaScript errors. The 25 focused tests and required-assets build passed. Desktop delivery and bulk FPS testing remain pending.
