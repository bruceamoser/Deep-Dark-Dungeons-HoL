# Dungeon Mason characters

Bruce approved Dungeon Mason RPG Tiny Hero Wave Polyart as the player-character family on November 7, 2026. KayKit remains the environment/prop/creature source. Ancestry, background, culture and class remain rules choices; ancestry suggests skin and class determines the outfit and suggests customizable headwear, then the player customizes freely. Appearance follows Origins in creation. Equipped headgear overrides cosmetic headwear. Armour determines protection; outfits remain cosmetic. Backpacks use the Back equipment slot; carrying one is insufficient. No new capacity bonus is added.

Class outfits use the supplied body library. The creator exposes heads, facial parts, hair, facial hair, ears, horns, crowns, eyewear, masks, ornaments, cloaks, backpack styles, shields, bows/arrows and one-/two-handed sword/axe/hammer variants. Two-handed axes/hammers are adaptations of the supplied axe/hammer geometry with longer handles, not claimed as original pack items. Colour channels use the author's three RGB masks: channels 1–8 are optional palette overrides, channel 9 is skin. Original colours remain when an override is unset. Cosmetic parts never grant inventory items or mechanical benefits.

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
