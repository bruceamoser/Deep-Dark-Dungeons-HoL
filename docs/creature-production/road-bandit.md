# Road Bandit — sequential production

Status: brief complete; candidate assembly underway. Performance deferred to the final bulk pass.

Pinned source `24e545e6d860e8c1b03a21356fd22cae1c039785`, creature text SHA `3a074e5d0d5eda3fa1a34d36d05732abac44a7de9dbe72e4d2e5de5df36a5603`. Description: lightly equipped robber, practical weapon, mismatched necessities. Illustration inspected: human, untidy brown hair, olive clothing, rust scarf, curved sidearm, bedroll/backpack, leather boots and pouches. No plate or extravagant magical weapon.

Donor inventory visually compared all 20 owned Dungeon Mason bodies. Choose Body05 (cloth/scarf, bare forearms), Hair02 (untidy), OHS08 curved sword, BackPack01 (packed gear). The verified common rest skeleton supports original SingleSword animations. Use olive cloth, rust scarf, brown leather/hair and steel blade. Preserve original meshes/UV/skin weights, tint through source masks, then check grip and pack clearance through all five states. Purchased source and derived exports remain private.

## Reviewed result

Source-integrated after author review: **6,132 triangles, 43 bones, five authored clips, one embedded texture, 15 materials/20 rendered primitives**. Zero degenerate faces and unweighted vertices in the GLB reimport. Exact source geometry/texture/animation hashes and rig rest-matrix checks are recorded in private provenance. New generic builder uses role-specific source selections and palette specs; it does not infer anatomy or invent animation from filenames.

Front/side/back, 242-frame motion sequence and attack draw/swing/recovery inspected. Sword stays gripped, backpack remains attached; actual game bestiary selects all five clips and six dungeon actors use RoadBandit with zero JS errors. Muted isolated browser context, no personal saves. No performance benchmark. Source integration is complete; installed delivery awaits the checkpoint.

Author fit: A5/S4/F4/G4/M4/D4 = **86/100**. Correct human lightly equipped robber with travel kit and curved sword. Deliberately chibi rather than the book’s realistic body; the source has simple mitten-like hands and a clean face, and clothing lacks the illustration’s ragged edges. The bulky head limits neck/pack clearance in extreme poses, with no conspicuous separation seen in reviewed frames. Source attack is the authored one-hand slash, not a thrust or generic spell.

Private files: `~/.local/share/four-lanterns-creature-production/road-bandit/` (editable Blender/GLB, provenance, roundtrip, validation, 242 review frames, five bestiary captures, dungeon-look/results). `config/creature-production/road-bandit.json` selects the owned parts; `scripts/toolchain/build-owned-humanoid.py` reproduces them. Exact final hash is in the approved manifest. This is author acceptance under delegated production authority, not independent/user-per-creature review.
