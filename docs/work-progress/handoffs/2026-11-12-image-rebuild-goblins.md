# 2026-11-12 — Creature image rebuild and local delivery

- Machine/platform: Ubuntu desktop, RTX 3090.
- Task and intended result: Rebuild the remaining goblins from role-specific images, then the three kobolds, then Wererat and Werebear.
- Work branch: `codex/creature-review-fixes` in `~/Projects/FLD-Creature-Production`.
- Base commit: `db30c59effcee1328955c3de6754a738ae8c54df`.
- Status: Complete, locally installed and ready for player review.

## Completed

Scrapper and [Firestarter](../../creature-production/goblin-firestarter.md) are source-integrated with new TRELLIS reconstruction, CuMesh reduction, textures, fitted rigs and held gear. Firestarter keeps the KayKit flask, with its release and return checked in the development game.

Rattlechanter is source-integrated with a new image-derived body, separate fitted pan and mallet, and a sonic effect timed to the actual pan strike.

Smoke Slinger is source-integrated with a reconstructed body, the fitted two-cord sling, and the actual held stone as its projectile.

[Kobold Tunnel Scout](../../creature-production/kobold-tunnel-scout.md) is source-integrated. The new reconstructed red body uses a four-joint tail and the fitted prior dart launcher.

[Kobold Trapkeeper](../../creature-production/kobold-trapkeeper.md) is source-integrated. The shorter tail and wider body are fitted independently. Its separate dart is thrown by hand.

[Kobold Emberkeeper](../../creature-production/kobold-emberkeeper.md) is source-integrated with new winged anatomy, a fitted lit brazier and a timed right-palm cast. The goblins, kobolds and both werecreatures are included in the final local package.

[Wererat](../../creature-production/wererat.md) is source-integrated with new rat anatomy, split coat and a repaired taper on the tail. The fitted Dungeon Mason knife uses a short forward thrust.

[Werebear](../../creature-production/werebear.md) is source-integrated with an entirely new broad body, fitted amber irises and a lower forepaw swipe. The source queue has all 58 entries integrated.

## Decisions

One creature completes the queue gates before the next begins. Reconstruct a new body and outfit from a role-specific image. Fit independent held props when their motion or release requires it. Goblins come first, then Kobold Tunnel Scout, Trapkeeper and Emberkeeper, then the two werecreatures.

## Verification

- The rebuilt creatures passed GLB round-trip, floor clearance, role-specific motion and muted development bestiary and dungeon fixtures. Individual reports record exact hashes, frame counts, attachment checks and remaining visual limitations.
- All 379 tests passed. The required-assets Linux AppImage and deb builds succeeded. The unpacked app archive contains all 58 approved GLBs at their pinned hashes. AppImage and Debian checksums passed. Debian metadata reports version 0.8.7 and amd64.
- The exact native launcher passed the 14-creature changed-model sweep in the normal terminal AppArmor context. The ten-second samples used live AI turns, six enemies and four visible heroes at 1600×1000 on one RTX 3090. Average frame rates were 59.5–60.0 FPS, worst p95 16.8 ms, and zero JavaScript errors. The fixture boosts hero HP and forces enemy model visibility to sustain the render load.
- The installed AppImage passed all 58 bestiary entries and five animation states, pointer and keyboard controls, rendered dungeon, isolated disk save, save-on-close and sandbox checks. Native tests used `--mute-audio`.

## Next step

Player review of the completed local art wave in the bestiary and dungeon.

## Local-only state / transfer needs

Reference images, reconstructed meshes, editable rigs, approved GLBs and captures are under `~/.local/share/four-lanterns-creature-production/<id>/image-rebuild/`. Transfer private assets separately.

The local 0.8.7 packages are in `~/Downloads/FLD-Completed-Creature-Review-2026-11-12/`. Installed AppImage SHA-256 is `63c567d57a3f12031a736303d3b703a69258c83b116dae45ee3d2c3dcc683ab5`. The previous AppImage and checkout runtime backups are in `/home/bmoser/.local/share/four-lanterns-local-backups/completed-creature-wave-20261112-115239`. Native evidence and exact package asset hashes are in `/home/bmoser/.local/share/four-lanterns-creature-production/delivery-2026-11-12-completed-review`. Delivery is a private per-user Linux review build.

## Sync status

Use the verified remote branch `codex/creature-review-fixes` for source and progress. Private exports and review evidence require local transfer.
