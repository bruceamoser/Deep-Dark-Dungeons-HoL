# Goblin Firestarter — sequential production

Status: source-integrated and installed after author review; performance deferred.

Pinned source `24e545e6d860e8c1b03a21356fd22cae1c039785`, creature text SHA `b880b6944de6c299d26231fe1be774ffc0d1eb83a912513e0edbe8f0a735fe5d`. Reference inspected: green goblin artisan, round soot goggles, workwear, stoppered fuel bottles, Bottled Spark attack. Preserve recognizable goblin face/ears and give the kit a practical workshop identity.

## Owned and adapted asset search

Inspected four supplied AC03 eyewear thumbnails: select round NerdGlass for goggles; reject rectangular BlackGlass, angular HeavyMetalGlass and bulky modern NightVision. Refit the supplied frame to the approved goblin face; retain round lens rims rather than inventing new goggles. Inspected all three packs: plain BackPack02 suits a supply pouch; log-packed BackPack01 and blocky BackPack03 compete with bottle silhouette. Body05 cloth/scarf/bare arms better fits an artisan than armored Body08. Reuse the approved Spearhand ancestry head. Reviewed adapted cap/helmet library: no head covering needed for this bald, goggled role.

Inspect KayKit Dungeon bottle_A_brown (corked supply bottle), Adventurers potion_small_orange (held spark flask) and RPG Tools rope_bundle_A (optional fastening stock). Select the first two; rope is unnecessary silhouette clutter at present. Retain their supplied UVs/textures, fit held neck to weapon_r and belt bottles to pelvis; inspect motion for hand/body collisions. Pack attaches to original BackpackBone. Owned NoWeapon CarryThrow is a candidate, to be judged by its actual motion rather than its filename. No paid generation, new base mesh or topology reduction.

Palette: soot-brown cloth, ember-orange scarf/accent, warm leather, brass trim, moss-green skin; brown reserves and orange held flask distinguish purpose. Keep face detail and material separation with polished .3 finish. Existing sources remain untouched; Dungeon Mason derivatives stay private. KayKit source licensing retained with source packs; exact files/dependencies hashed in provenance.

Required checks: front/side/back, goggle/nose clearance, grip and throw/release, walk/hit/full death, export/reimport, real game routing and visual effect alignment. Performance deferred to final roster pass. Useful adapted goggles/held bottle assembly will enter the shared adapted library after review.

## Model and source-motion review

29,368 triangles, 43 bones, six source clips. GLB reimport reports zero degenerate faces/unweighted vertices. Front/side/back and 314-frame source-motion capture (including the separate melee clip) reviewed. Fitted brass goggles retain round dark lenses; close face fit corrected after first preview. The small potion was rejected because its shape read poorly in the mitten hand; selected the larger corked Dungeon bottle for the hand too. Plain pack and two belt reserves remain clear in reviewed poses.

Corrected grip fitting to use the actual NLA track action: appending the approved head also loaded old dependency actions with duplicate names. Looking up global `Idle` fitted to the old spear stance; selecting this creature's track fixes the upright bottle. No source clips were retargeted or topology repaired.

The CarryThrow source clip lifts both arms then tosses forward; runtime presentation releases the flask at .46 seconds and restores it on recovery. Basic melee uses a distinct original punch clip. Source-only animation captures keep the prop attached throughout; the runtime clip adapter supplies release visibility in game and bestiary. Runtime flight still requires visual acceptance.

## Runtime acceptance

Actual game bestiary selected idle, walk, attack, hit and death using this export. Six dungeon instances and four heroes rendered with the correct asset and no JavaScript errors. A fixed-time 45-frame actual game effect capture confirms a real bottle mesh leaves the hand, follows a tumbling arc, disappears at impact and is available again after recovery; no arrow/orb substitution. Damage/rules were not changed. This is a presentation check, not an AI encounter balance or performance test.

368 tests pass, including flask visibility at release/recovery/pose interruption, separate punch versus throw routing and existing equipped material isolation. Shared builder source actions are selected from their own tracks to avoid imported dependency-name collisions. Private GLB SHA: `2c7742f647046f8665fc4f1f440fa895f1aacf38c97d539088664e03b24ba2db` (1,481,212 bytes).

Author fit: anatomy 5, silhouette 4, face 4, gear 4, materials 4, deformation/motion 4; **86/100**, using the established six-part rubric. Remaining limitations: intentionally clean chibi workwear instead of ragged realism, mitten hands, two-arm source toss rather than a bespoke one-arm overhand throw; flask is corked while carried rather than perpetually burning. No claim of independently approved/user-approved Firestarter. Full death ends on the ground; pack can meet the floor as the body settles.

Evidence: private `~/.local/share/four-lanterns-creature-production/goblin-firestarter/` contains editable scene, provenance/source hashes, GLB, roundtrip report, Three.js validation, front/side/back, source-motion frames and actual bestiary/dungeon/throw capture. Fitted goggles, flask/reserves and pack palette are registered in the adapted asset library for future creatures.

## Local delivery

AppImage and Debian package built with all seven approved private assets required. Primary `launch-game.sh` and updated menu AppImage both passed full 58-entry bestiary interaction, native window-close/save and sandbox checks through `aa-exec -p unconfined`. Muted audio, temporary save data; real saves/audio preferences unchanged. Version remains 0.8.7 local review build, no public release or Windows runtime claim. Prior menu image backed up under `~/.local/share/four-lanterns-install-backups/2026-11-11-firestarter/`. Preserve the launcher's symlink to the root-owned system Chrome sandbox helper when copying unpacked packages; do not copy through it.

## Image reconstruction revision

Reconstructed a fresh Firestarter reference with round soot goggles, orange scarf, apron and reserve bottles. CuMesh reduced the shape before the texture bake. The separate KayKit flask grips by its neck and retains the runtime release and recovery. The 74,936-triangle export passed reimport, six grounded clips, 522 reviewed motion frames, the muted development encounter and the 45-frame bottle flight check. The detailed straps and hair are most legible in the bestiary. Private reference, rig and evidence are under `goblin-firestarter/image-rebuild/`.
