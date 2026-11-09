# Dungeon Mason characters

Bruce approved Dungeon Mason RPG Tiny Hero Wave Polyart as the player-character family on November 7, 2026. KayKit remains the environment/prop/creature source. Ancestry, background, culture and class remain rules choices; ancestry suggests skin and class determines the outfit and suggests customizable headwear, then the player customizes freely. Appearance follows Origins in creation. Equipped headgear overrides cosmetic headwear. Armour determines protection; outfits remain cosmetic. Backpacks use the Back equipment slot; carrying one is insufficient. No new capacity bonus is added.

Class outfits use the supplied body library. The creator exposes heads, facial parts, hair, facial hair, ears, horns, crowns, eyewear, masks, ornaments, cloaks, backpack styles, shields, bows/arrows and one-/two-handed sword/axe/hammer variants. Two-handed axes/hammers are adaptations of the supplied axe/hammer geometry with longer handles, not claimed as original pack items. Colour channels use the author's three RGB masks: channels 1–8 are optional palette overrides, channel 9 is skin. Original colours remain when an override is unset. Cosmetic parts never grant inventory items or mechanical benefits.

Ordinary melee and ranged styles can be edited at any time, including in the dungeon. Magic weapons instead use their item's form and a stable variant derived from its generation seed: existing enchanted Swords remain swords and Longbows remain bows. Their appearance follows the item across equipment changes, transfers and saves rather than the owner's ordinary-weapon preferences.

Appearance choices are grouped by face/hair, fantasy headwear/details, owned equipment and colours. Equipment controls appear only for carried items that support customization. Selecting a stowed item temporarily displays it in the portrait without equipping it; **Show equipped gear** restores the real kit. Hair/headwear previews can hide conflicting headgear without removing it from inventory. Novelty/sci-fi faces, goggles, antenna/bunny ears, Santa/heart hats and ornaments are excluded and legacy selections normalize to supported defaults. Colour controls show only regions used by the preview, name their original colour and affected parts, and highlight matching areas on hover/focus. Original colour facts are reproducible with `python3 scripts/mason-palette-facts.py` after staging the licensed GLB; no geometry or textures are included in those facts.

Weapon calibration also rolls the mesh a quarter-turn around its aiming axis so blade/hammer planes are upright rather than flat. Re-stage licensed exports after changing that calibration. Background Blender export workers exit after closing their outputs to avoid audio-driver shutdown hangs; interactive Blender sessions are not closed.

## Purchased files and licence

Source: https://assetstore.unity.com/packages/3d/characters/humanoids/fantasy/rpg-tiny-hero-wave-polyart-231024

Bruce purchased the Unity Asset Store edition. It uses the Standard Unity Asset Store EULA. Keep the purchased archive, extracted source and generated standalone exports out of public Git. Finished builds may embed the assets; do not distribute them as a reusable asset library. Review the purchased licence before sharing with collaborators. No source files are uploaded for AI training.

Purchased archive SHA-256: `5d12db3fd09358a7bdd0eca8306d83688697b6e6ec6b6b7710221271fa8d2d68`.

Local source is in the separate `DDD-Asset-Workshop/PurchasedSource/Assets/RPGTinyHeroWavePolyart` directory. Reproduce exports with Blender 5.2:

```sh
DDD_MASON_SOURCE=/absolute/path/to/RPGTinyHeroWavePolyart \
DDD_MASON_OUTPUT="$PWD/public/assets/licensed/dungeon-mason" \
blender --factory-startup -noaudio -b --python-exit-code 1 \
  --python scripts/blender/export_dungeon_mason.py
```

`--factory-startup` avoids loading the interactive Blender MCP addon in background processes. The generated `hero.glb`, `catalog.json`, `tint-coverage.json` and `weapon-alignment.json` are ignored. Export selected character animation clips into one shared skeleton. Armed characters use battle-ready idle and walking animations. Melee grips are calibrated in the ready pose toward the character's front with a slight upward tilt, as requested by Bruce, and checked for floor intersection. Bows use the authored draw deformation baked as a Draw morph target for the existing shot-timing effects; arrow variants attach to the weapon hand. The selected character clips cover idle, locomotion, melee stances, spell/ranged attacks, hit, death and interaction. The complete 598-file animation library is retained privately, not all clips are loaded into gameplay. Unusual accessory combinations can overlap; hat selections hide hair. Existing KayKit heroes remain the fallback for source-only checkouts without licensed exports. The customization UI explicitly identifies that fallback.

## Build and verification

Stage the licensed exports before `npm run build` / packaging. A public checkout cannot reproduce the purchased visuals without a licensed copy. Automated public CI validates code with KayKit fallback; release builds intended to ship Dungeon Mason must be built in an environment with the licensed exports staged. Never publish a standalone GLB as a release asset.

Run `node --test tests/mason-appearance.test.mjs` for normalization, save migration and equipment/cosmetic isolation. Build a fresh desktop package before `npm run test:native`: `launch-game.sh` intentionally launches the existing packaged application and does not rebuild it automatically. Native checks use a temporary save profile and Ubuntu's unconfined terminal context with sandboxing enabled.

## Publishing licensed releases

The source-only installer workflow validates pull requests and manual development builds; it does not publish tag builds. Build Linux installers and the Windows portable application locally with licensed exports staged, then upload only finished installers, updater metadata, the Linux installation bundle and a `SHA256SUMS` manifest to a draft release at the reviewed version tag. Keep the source archive and standalone exports private.

Run **Verify and publish staged release** with that draft's tag. It downloads and checks the finished release assets, installs and launches them on Linux and Windows, verifies the reported version, save IPC, sandboxing and loaded Dungeon Mason character art, and publishes only after both platforms pass. The Windows runner wraps the complete staged portable application in the NSIS installer, tests the installed executable, and uploads its installer and updater metadata to the draft. The publish job then updates checksums and makes the release public. Public source-only CI packages must never overwrite the staged licensed installers.

Use `npm run package:windows:dir` to build the complete Windows portable application locally without requiring Wine/NSIS. Zip the contents of `release/win-unpacked` at the archive root. Required-Mason release checks also exercise upright torches, dungeon appearance editing, fixed magic-weapon forms and combined-supply persistence on each installed platform.

## Superseded Blender prototype — November 8, 2026

Bruce explicitly confirmed that purchasing and accepting Dungeon Mason closed the
custom hill-dwarf layering experiment (#43). Do not resume the earlier
culture-clothes/background-kit/class-headwear Blender modeling plan. Class outfits,
customizable headpieces/colours and inventory-driven equipment use Dungeon Mason.
The unmerged prototype files remain historical reference, not accepted assets or
unfinished production work. Issue #43 is closed as superseded, not completed.

## Curated facial hair and accessories — #79

The pack's six AC10 files share one moustache shape, and six AC11 files share a
second moustache shape; the old interface incorrectly called the second set
beards. Offer Wide moustache and Neat moustache once each, controlled by Hair
colour. Bruce approved fitted beard accessories: game-authored Short beard and
Long beard meshes attach to the existing head bone and fit the chosen Mason
head's surface. They use the hair colour, retain pose/concealment behavior and
own their disposable geometry/materials. The approved body and rig are unchanged;
this does not resume superseded custom-body prototype #43.

Pointed ears, standalone crowns, crowned/circlet helmets and leaf ornament are
removed from offered choices; the Leader's default uses the ornate helmet.
The eight mask palette copies become one Mask with a dedicated colour control.
Old mask colours (including explicit palette overrides) migrate to that control;
old moustache IDs migrate to the corresponding shape. Removed accessories
normalize away. Hair and mask tinting uses the selected colour directly, avoiding
baked palette brightness making nominally identical choices look different.
