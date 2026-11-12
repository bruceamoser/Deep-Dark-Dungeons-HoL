# Werebear — refined existing bear

Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, text689cf5efa39c7199d5aa381d869f3fade18cb1627c38354d94234534c15b9739. Broad upright bear with a heavy forepaw attack, rugged green/brown clothing and large claws. Portrait reviewed beside the older export.

Owned search: Mason Body01/Body12 and the existing project Werebear, plus KayKit filenames. No suitable supplied bear body was found. Body12 provides a long sleeved coat, not the rustic vest; Body01 loses the existing broad bear proportions. Retain/refine the existing CC0 Ninja-based authored bear rather than replacing it with a smaller human body. Existing vest, torn waist panels, belt/pouch and diagonal strap already communicate the rustic role; no unrelated tools or weapons added. Original source recipe untouched.

Halved oversized saber-like fangs, separated amber eye emission from ivory claws/buckle and retained dark pupils. TextureCraft Wool fur, Linen olive/tan clothes and leather strap make the material families distinct. UV-island padding initially wasted so much area that maps rendered as flat patches; reduced padding on this multi-part assembly and visually rechecked actual export. Original23-bone rest rig preserved. Embedded five compatible source clips; unarmed forepaw strike replaces a weapon swing. Rejected Death_B due excessive paw penetration; Death_A with bounded root clearance passes floor review.

400 motion frames inspected, then final material stills; no invalid deformation. Reimport found no loose/zero-area/unweighted vertices; floor clearance0.002m for all five states. Muted actual bestiary and six-Werebear/four-hero dungeon checks passed for all five states with no JS errors.21 applicable tests and required-assets build pass; existing chunk warning remains. Final private hash `6835d3b85066b3d218c1fe276b1dd4feacff3bdc95b2c603addb800e739bfb26`. Outputs/maps/editable scene under `~/.local/share/four-lanterns-creature-production/werebear/`. Build with `refine-werebear.py`, `texture-werebear.py`, `animate-werebear.py`.

Author fit80/100: anatomy4, silhouette4, signature4, gear4, materials4, distinction4. Remaining: visibly layered stylized fur clumps and permanently open mouth. Bulk user review/install/performance deferred.

Final export: 2,537,992 bytes,4,520 triangles,23 bones,five clips,10 materials/primitives and18 packed512px maps.

Delivery verification November12: refreshed full motion capture on the exact final material/export hash (400frames), reviewed all clips and attachment/deformation again. Evidence: `final/review-delivery`; this supersedes the older pre-material motion capture. No model bytes changed.

## November 12 image rebuild

A new frontal reference produced a fresh broad bear body, coarse sculpted fur, a heavy snout, oversized forepaws, worn vest, straps and waist wraps. Local TRELLIS Q6_K produced 4,949,374 source triangles. CuMesh reduced it to 73,056 for texturing. The finished 73,203-triangle export includes two surface-fitted amber irises with dark pupils, each rigidly skinned to the head. The eye accents preserve a readable gaze under dungeon lighting. The reconstruction supplies the entire body and outfit.

The new skeleton has fitted shoulders, wrists, claws and legs. The lower forepaw swipe contacts on frame 11 at 24 fps, with a curved return away from the chest. Head and central torso clearance passed at quarter-frame samples of the full attack. All five clips pass floor clearance. Removed one microscopic vest-adjacent degenerate triangle. The round-trip has zero degenerate faces, loose vertices or unweighted vertices. The editable rig and captures are in `~/.local/share/four-lanterns-creature-production/werebear/image-rebuild/recovery-fit/`.

Reviewed 474 frames of the accepted export. The muted development bestiary and six-Werebear/four-hero dungeon fixture loaded the pinned asset, played all five states and reported zero JavaScript errors. The direct ground and sampled pose checks use the same final editable scene.
