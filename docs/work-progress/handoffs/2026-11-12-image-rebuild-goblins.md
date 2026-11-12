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

## Decisions

One creature completes the queue gates before the next begins. Reconstruct a new body and outfit from a role-specific image. Fit independent held props when their motion or release requires it. Goblins come first, then Kobold Tunnel Scout, Trapkeeper and Emberkeeper, then the two werecreatures.

## Verification

Firestarter passed six-clip motion, GLB and floor checks, 522 preview frames, a six-enemy/four-hero development encounter and 45 sampled throw frames. Twenty-five focused tests and the required-assets build passed. Rattlechanter passed 552 motion frames, six clips of floor clearance, GLB round-trip, bestiary and the six-enemy dungeon fixture including its sonic attack. Smoke Slinger passed 591 motion frames, six clips of floor clearance, GLB round-trip and 56 in-game shot samples with release and recovery. All 379 tests and the required-assets build passed at the Rattlechanter checkpoint. Tunnel Scout passed 591 motion frames, six clips of floor clearance and 54 in-game shot samples. Focused tests and the required-assets build passed. Earlier installed assets are recorded in the [prior handoff](2026-11-12-player-creature-review.md).

## Remaining and next steps

Kobold Trapkeeper is active. Create the distinct trapper reference, reconstruct its body, then fit the throwing dart and check the tail through motion and dungeon view. Emberkeeper follows. Package and test the local delivery after the sequence.

## Local-only state / transfer needs

Reference images, meshes, blend scenes, GLBs and evidence are under `~/.local/share/four-lanterns-creature-production/<id>/image-rebuild/`. Transfer private assets separately. The existing installed build is the earlier review package.

## Sync status

The work branch is the checkpoint transport. Private export files and review evidence stay local.
