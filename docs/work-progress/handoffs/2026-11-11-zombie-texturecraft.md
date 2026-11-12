# 2026-11-11 — Plague Zombie TextureCraft finish

- Machine/platform: bmoser, Ubuntu.
- Task: make the Plague Zombie skin and wraps read in the dungeon.
- Work branch: `codex/creature-roster-production-09` in `/home/bmoser/Projects/FLD-Creature-Production`.
- Base checkpoint: `3a0b5ee`.
- PR: #174.
- Status: texture revision ready for integration. Roster production continues at 28 of 58.

## Completed

Used TextureCraft Leather and Linen with coarse relief and broad bruised paint masks. The final GLB has 18 baked maps and preserves the rig and five clips. Updated the approved asset pin, production instructions, project skill and reusable linen entry. The [Plague Zombie report](../../creature-production/plague-zombie.md) records the exact private bytes and review.

## Decisions

Bruce asked for strong grain and then stronger color separation. The final export uses yellow, purple and olive skin patches at a larger scale than the leather grain. Use this workflow on creatures with a demonstrated surface detail need and check the effect at the dungeon camera.

## Verification

Ran the muted production bestiary/dungeon check, full 272-frame motion capture, Blender reimport, floor check and Three.js finite-vertex review. Reviewed front, side, back and dungeon framing. All 375 tests and `FLD_REQUIRE_APPROVED_CREATURES=1 npm run build` passed. Packaging, native package interaction and performance are deferred to bulk delivery.

## Remaining and next steps

Resume the recorded Crypt Ghoul brief and local candidate. Review the unarmed silhouette, claws and pose, then finish the remaining gates before the next creature.

## Local-only state / transfer needs

`texturecraft-cli` 0.3.2 runs from `~/.local/bin`. CLI and stdio MCP tool discovery were tested. Transfer the Plague Zombie private production directory, particularly `texturecraft/leather-bold/bold-paint/`, and stage its exact GLB at `public/assets/licensed/creatures/PlagueZombie.glb`. The editable projects contain licensed donor meshes. The Ghoul candidate lives in the sibling `crypt-ghoul/` folder. Installed game remains at the seven-creature review build.

## Sync status

The asset pin and instructions travel through PR #174 and the roster branch. Verify remote status with the personal project account. Private files transfer separately.
