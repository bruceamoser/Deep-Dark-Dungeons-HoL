# 2026-11-12 — Goblin image rebuilds

- Machine/platform: Ubuntu desktop, RTX 3090.
- Task and intended result: Rebuild the remaining goblins from role-specific images, then the three kobolds, then Wererat and Werebear.
- Work branch: `codex/creature-review-fixes` in `~/Projects/FLD-Creature-Production`.
- Base commit: `db30c59effcee1328955c3de6754a738ae8c54df`.
- Status: In progress.

## Completed

Scrapper and [Firestarter](../../creature-production/goblin-firestarter.md) are source-integrated with new TRELLIS reconstruction, CuMesh reduction, textures, fitted rigs and held gear. Firestarter keeps the KayKit flask, with its release and return checked in the development game.

Rattlechanter is source-integrated with a new image-derived body, separate fitted pan and mallet, and a sonic effect timed to the actual pan strike.

Smoke Slinger is source-integrated with a reconstructed body, the fitted two-cord sling, and the actual held stone as its projectile.

[Kobold Tunnel Scout](../../creature-production/kobold-tunnel-scout.md) is source-integrated. The new reconstructed red body uses a four-joint tail and the fitted prior dart launcher.

[Kobold Trapkeeper](../../creature-production/kobold-trapkeeper.md) is source-integrated. The shorter tail and wider body are fitted independently. Its separate dart is thrown by hand.

[Kobold Emberkeeper](../../creature-production/kobold-emberkeeper.md) is source-integrated with new winged anatomy, a fitted lit brazier and a timed right-palm cast. The goblin and kobold wave is complete and locally installed.

[Wererat](../../creature-production/wererat.md) is source-integrated with new rat anatomy, split coat and a repaired taper on the tail. The fitted Dungeon Mason knife uses a short forward thrust.

## Decisions

One creature completes the queue gates before the next begins. Reconstruct a new body and outfit from a role-specific image. Fit independent held props when their motion or release requires it. Goblins come first, then Kobold Tunnel Scout, Trapkeeper and Emberkeeper, then the two werecreatures.

## Verification

Firestarter passed six-clip motion, GLB and floor checks, 522 preview frames, a six-enemy/four-hero development encounter and 45 sampled throw frames. Twenty-five focused tests and the required-assets build passed. Rattlechanter passed 552 motion frames, six clips of floor clearance, GLB round-trip, bestiary and the six-enemy dungeon fixture including its sonic attack. Smoke Slinger passed 591 motion frames, six clips of floor clearance, GLB round-trip and 56 in-game shot samples with release and recovery. All 379 tests and the required-assets build passed at the Rattlechanter checkpoint. Tunnel Scout passed 591 motion frames, six clips of floor clearance and 54 in-game shot samples. Focused tests and the required-assets build passed. Trapkeeper passed 591 motion frames, six clips of floor clearance and 60 in-game throw samples. Focused tests and the required-assets build passed. Emberkeeper passed 552 motion frames, floor clearance and the six-creature dungeon fixture including its fire attack. Wererat passed 474 motion frames, all five floor checks, quarter-frame knife clearance and muted development bestiary and dungeon checks. The packaged goblin and kobold wave passed all 379 tests. The unpacked app archive contains all 58 approved GLBs at their exact pinned hashes. Both the exact launcher and installed menu AppImage passed muted native QA in the normal terminal AppArmor context, including all 58 bestiary entries and their five states, disk save, save-on-close and sandbox checks. Debian artifact checksum passed. Earlier installed assets are recorded in the [prior handoff](2026-11-12-player-creature-review.md).

## Remaining and next steps

Werebear is active. Reconstruct the broad bear body and fit the forepaw strike, then verify motion and actual game before packaging both werecreatures. Package and test the local delivery after the sequence.

## Local-only state / transfer needs

Reference images, meshes, blend scenes, GLBs and evidence are under `~/.local/share/four-lanterns-creature-production/<id>/image-rebuild/`. Transfer private assets separately. The local 0.8.7 AppImage and deb are in `~/Downloads/FLD-Goblin-Kobold-Review-2026-11-12/`. Installed AppImage SHA-256 is `a70bf08aa43bbe6a7eb747b1d7d92129bc895270846bc0eeb24ef22be603fdc0`. Backups are in `~/.local/share/four-lanterns-local-backups/goblin-kobold-20261112-112705/`. Native evidence is in `~/.local/share/four-lanterns-creature-production/delivery-2026-11-12-goblins-kobolds/`. Public release and system Debian installation stay on their previous builds.

## Sync status

The work branch is the checkpoint transport. Private export files and review evidence stay local.
