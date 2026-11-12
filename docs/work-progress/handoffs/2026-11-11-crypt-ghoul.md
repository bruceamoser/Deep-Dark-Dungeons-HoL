# 2026-11-11 — Crypt Ghoul painted and integrated

- Machine/platform: bmoser, Ubuntu.
- Work branch: `codex/creature-roster-production-10`.
- Base: `a23a3b36eb1225d71b2b23bf55e51d1ebadf2895`, merged Plague Zombie TextureCraft PR #174.
- Status: Crypt Ghoul integrated in source. Roster 29/58.

## Completed

Fitted ivory nails to the original finger rig, narrowed the face, opened the donor's hands in idle, walk and rake, and fitted a Linen waist rag. Bruce approved the final cold gray-blue skin, amber emissive eyes and larger, denser reddish-purple pits. The approved asset manifest pins the private export. The asset library and workflow record the reusable parts and TextureCraft treatment.

## Decisions

Use the planted Attack02 left rake. Attack03 kicked. Layer two differently seeded triplanar pit patterns with their matching relief and color. Keep broad blue mottling and an uncluttered silhouette. Individual small pits are clearest in the bestiary.

## Verification

The final hash matches the 272-frame capture. Reviewed four viewpoints and the five animation states. Ground, Blender reimport and Three.js finite checks pass. The muted actual development bestiary and six-Ghoul dungeon view pass with no JS errors. 21 focused tests and the required-private-assets build pass. Native package checks and performance are deferred to the bulk pass.

## Remaining and next steps

Ghast follows the same sequential gate process. Read the pinned brief and existing reference first. Installed delivery remains at seven creatures.

## Local-only state / transfer needs

The private final scene, TextureCraft project, recipe, app script, GLB and renders are in `~/.local/share/four-lanterns-creature-production/crypt-ghoul/clustered-pits/`. Stage the exact export at `public/assets/licensed/creatures/CryptGhoul.glb`. Transfer private files separately from Git.

## Sync status

The source checkpoint is on the roster branch. Verify its current remote commit using the personal project account.
