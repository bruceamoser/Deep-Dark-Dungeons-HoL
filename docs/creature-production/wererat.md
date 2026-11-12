# Wererat — active owned-source adaptation

Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, text154ccb7b5f5009afd174120f8b572988db1d0eeb3c398235c5a40198385679c6. Rat-faced thief in a coat altered around a long tail; gloved hands and a hidden sewer knife. Portrait shows gray-brown fur, pink ears/tail, dark green coat and amber eyes.

Inspected the owned body contact sheet: Body12 supplies the open long coat and gloves; Body09 has a short tunic and Body05 lacks the coat. Selected the supplied OHS02_Niddle as a compact knife, scaled around its original weapon socket. Reused and narrowed the existing CC0-derived rat head, lowered it into the collar, recessed amber eyes and added black pupils. Existing tail mesh/rest joints are refitted to the source pelvis. No new generator or purchase.

Palette: muted green coat, dark brown leather gloves, gray-brown fur, broad pink ear/tail contrast and bright amber eyes. TextureCraft fur grain and cloth wear follow the anatomy fit. Current private root `~/.local/share/four-lanterns-creature-production/wererat/`. Anatomy is under review; material, tail motion, floor/reimport and game checks remain pending. Not integrated.

## Reviewed result

Integrated candidate SHA-256 `3510ce1a335892801e76abcb2326fe2ca06b9efecfd2ea398a7b34387d5e8538`, 2,103,816 bytes, 7,246 triangles,47 bones, five clips,16 materials/17 primitives and19 images (18×512px TextureCraft maps plus owned keyring palette). Preserves original43 source joints and adds four tail joints.

Added the supplied KayKit Dungeon keyring, fitted to the pelvis beside the coat. Shortened OHS02_Niddle to knife proportions; actual sword source motion retains its hand grip. Narrowed/lowered the reused rat head into the collar, moved amber eyes inward and added black pupils. TextureCraft Wool/Clay/linen supply short-fur grain, broad ear/tail color and subtle worn cloth. Kept gloves smooth after rejecting a coarse leather treatment.

Rejected the first backwards fall, which buried the knife and tail. The forward Die02 source plus authored tail curl and bounded root correction clears the complete assembled silhouette. Walk and death clear floor; existing hit sole dip is0.0135m. Reviewed front/side/back and256 motion frames. Reimport found no unweighted vertices or degenerate/loose geometry. Muted bestiary and six-Wererat/four-hero game view use the exact asset and all five states, with no JS errors.21 applicable tests and required-assets production build pass.

Author fit83/100: anatomy4, silhouette4, signature4, gear5, materials4, distinction4. Remaining limits: softly rounded stylized face/ears, static whiskers and relatively simple tail silhouette. Bulk player art review, installed delivery and performance remain pending.

Rebuild: owned humanoid builder with `config/creature-production/wererat.json`, `refine-wererat-anatomy.py` with the earlier public rat donor, `texture-wererat.py`, then `animate-wererat-tail.py`. Private exact output/Blend/evidence in `wererat/final/`, TextureCraft project/maps in `materials-final/`.
