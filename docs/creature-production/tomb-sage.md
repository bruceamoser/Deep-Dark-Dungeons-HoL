# Lich — Tomb Sage — sequential production

Status: source-integrated after author review; bulk delivery/user review/performance deferred.

Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, textSHA5d13a715f2937515a531189de84c78f06f978476cb13bbafc3d0f01755aa07b4. Preserved undead scholar, ink-blackened bones, ancient robes and carefully maintained books. Portrait: skeletal face under green hood, cream/gold robe trim, books in both hands and hanging scholarly kit.

Owned inventory inspected: KayKit Skeleton_Mage has a proper skull but pointed wizard hat, short garment and incompatible original rig; Necromancer has long robes/crown but a living face (the existing mismatch). Dungeon Mason Body11/hood Hat05 match the enveloping robe silhouette and preserve our reviewed 43-bone clips. KayKit Halloween skull is a separate owned prop with sockets/teeth and no rig to retarget; fit it rigidly under the hood instead of recoloring a human face. KayKit Adventurers spellbook_open and RPG Tools journal_closed inspected for size/orientation. Reuse fitted hood/robe and book attachment recipes, sage green/aged ivory/brass palette, dark bone face. Start with a held open tome and a belt volume; inspect face/hood, grip and all motion. No new generated anatomy or purchased services.

Bruce caught the open book facing outward in the preview. Refit its constant socket orientation so pages face the Sage and move the grip to the lower edge on the reading side; rerun motion before acceptance. The first high skull placement/hand-through-pages were also rejected and corrected. Dark bone/socket paint preserves the supplied skull geometry; book cover changed from bright magenta to old brown leather, with baked page lettering.

Book correction: front normal now points toward the wearer (+Y in the inspected idle pose), with the cover toward the viewer and pages/lettering on the reading side. Constant attachment preserves grip rather than rotating the prop independently during playback. Socket paint was corrected against measured source eye recess coordinates (x±.20,z.40), not left on the brow.

## Author model/motion review

5,100triangles,43bones,six clips,11materials/two textures,14draw calls. Reimport zero degenerate faces/unweighted vertices; finite skinning passes. Front/side/back and270frame playback reviewed, including inward book orientation, lower-edge grip, cast, close-range tome strike, cloth/hood clearance and full fall.

Fit A4/S4/F5/G4/M4/D5 =86/100. Dark skeletal face, full green/ivory hood/robe and carefully maintained inscribed books distinguish the scholar. Simplified skull has no separate animated mandible or exposed ribcage; robe is cleaner/shorter and less ornate than book illustration, one volume is belt-carried rather than held. Page letters are close-view detail. User bulk review pending.

Corrected spell-presentation fallback discovered during integration: thunder and grave spell kinds previously fell through to orange fire visuals. Explicit palettes now apply to missile and impact; regression test constructs both effects and checks all emitted mesh colors. No damage/rules changes.

Actual bestiary five-state controls and six Sages beside four heroes pass with the exact reviewed model and no JS errors. Inward book/hood/skull remain readable at game scale. No installed/performance update.

All370 tests and required-private-assets production build pass at this checkpoint.
