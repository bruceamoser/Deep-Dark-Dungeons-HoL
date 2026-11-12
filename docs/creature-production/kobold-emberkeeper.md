# Kobold Emberkeeper — active refinement

Pinned source commit 24e545e6d860e8c1b03a21356fd22cae1c039785, text SHA 4b0df86f3d8ec3693380528e5147d6089fad817357948cebcfffa310e4e0033b. Small copper-scaled keeper of its community's sacred travelling brazier; portrait has batlike wings, green robes, belt charms and a hanging bronze fire cup. Hearth coal and Scatter Embers are its fire signatures.

Inspected the existing CC0 KayKit-derived Emberkeeper body/gear recipe and rendered its retained wings, charms and hanging brazier on the refined Scout anatomy. These fitted reusable parts are closer to the reference than an owned handheld torch or lantern from RPG Tools. Keep the brazier as its signature. Reuse the improved wedge head, inset eyes and tail. Palette: flat red-copper textured scales, smooth deep green cloth, bronze cup/charms, dark leather wings, amber eyes and bright coals. No paid tools or fresh generation.

Add a dedicated brazier joint so the chain remains gravity aligned in the embedded clips, including grounded death. Preserve original rest bones. Material, full-motion, reimport and actual game gates remain pending. Private working root `~/.local/share/four-lanterns-creature-production/kobold-emberkeeper/`. Not integrated or installed.

## Reviewed result

Source-integrated export SHA-256 `3aef133bcf02512eee6e1ce284bfd0dd3c92d9ec44a2c2dfa82a215652ae64eb`, 1,699,536 bytes, 9,923 triangles, 30 bones, six clips, 11 materials/primitives and 15 embedded 512px maps (approximately 20 MiB RGBA8+mipmaps). Original 27 rest bones preserved; two wing joints and a brazier joint added.

TextureCraft supplies scale relief, worn leather wings and bronze belt surfaces; green cloth remains smooth. Separate brazier materials retain bright coal/flame emission. Its dedicated joint is baked upright relative to gravity at each frame, with a floor bound during death. Source clips retain correct skinning and matching rest matrices. Wings remain posed open and follow the torso, rather than flapping during ground movement.

Author-reviewed front, side, back and 513 motion frames; floor contact, reimport and all five runtime states pass. The exact asset is used in the muted bestiary and six-creature/four-hero dungeon check with zero JS errors. All 21 applicable asset tests and required-assets production build pass; known chunk-size advisory remains. No new gameplay rules or generic recoloring applied.

Author fit 83/100: anatomy4, silhouette4, signature5, gear4, materials4, distinction4. Remaining limitations: angular wing membranes, stylized solid flame forms, chunky fingers and simplified robe panels. No flight animation promised. Bulk user review, installed delivery and performance remain pending.

Rebuild using `build-kobold-emberkeeper-refined.py` from the Scout recessed-base GLB, `texture-kobold-emberkeeper.py`, then `animate-kobold-emberkeeper.py`. Private exact output/Blend/evidence in `kobold-emberkeeper/animated/`; TextureCraft project/maps in `materials/`.

## November 12 image rebuild

The new frontal reference produced a fresh winged reptile with bright copper-red scale plates, inset amber eyes, dark green ceremonial clothing and brass trim. Local TRELLIS Q6_K produced 2,384,260 triangles. CuMesh reduced it to 70,941 for texture inference. The exported model contains 71,707 triangles including the retained authored brazier.

The wing and tail joints follow this reconstruction's proportions. The fitted suspension ring follows the left palm while the lit bronze cup hangs below it. The cup stays upright in locomotion and casting and tips outward during the forward fall. Ember release comes from the right-palm socket on frame 11 at 24 fps. The melee fallback uses the free hand. All six clips pass floor clearance and the GLB round-trips with zero degenerate faces, loose vertices or unweighted vertices. The private rig and 552-frame review are in `~/.local/share/four-lanterns-creature-production/kobold-emberkeeper/image-rebuild/rigged/`.

The muted development bestiary and six-Emberkeeper/four-hero dungeon fixture loaded the pinned export and played all five bestiary states. The actual fire effect launches from the animated casting hand, with zero JavaScript errors. The wings accent the cast and locomotion with small movements while the creature remains grounded.
