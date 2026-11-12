# 2026-11-11 — Refined Kobold Tunnel Scout

- Machine/platform: bmoser, Ubuntu.
- Branch: `codex/creature-roster-production-12`.
- Base: `49a640a14b1ffab9f51916934c6a16254215af3b`, merged Ghast PR #176.
- Status: Scout source-integrated. Roster 31/58.

## Completed

Refined the CC0 KayKit donor adaptation with a continuous wedge skull, carved eye pockets, larger slit irises and a curved tail. Used solid red skin with a TextureCraft scale normal map and a smooth teal shirt per Bruce's feedback. Refit the launcher around the grip and retained a separate loaded dart. Embedded six source clips, with a tail pass and grounded forward fall. The runtime reuses the loaded dart mesh in flight.

## Verification

The exact GLB matches the 554-frame review. Front, side and back checks, reimport, all-frame ground contact and finite Three.js checks passed. Muted development bestiary and six-Scout dungeon checks passed. The held dart disappears at release, one mesh flies and the dart returns after recovery. Installed delivery and performance remain deferred.

## Remaining and next steps

Kobold Trapkeeper follows. Use the refined Scout head/eye and scale approach as a donor where it fits. Give the Trapkeeper its own equipment and silhouette. Verify its sockets and motion separately.

## Local-only state / transfer needs

`~/.local/share/four-lanterns-creature-production/kobold-tunnel-scout/compact-materials/` contains the TextureCraft project and recipe. `compact-final/` contains the exact GLB, Blend, ground and runtime captures. Stage the GLB at `public/assets/licensed/creatures/KoboldScout.glb`. Transfer private files separately. The installed game remains at the seven-creature build.

## Sync status

Source checkpoint is on the roster branch. Verify the remote with the personal project account.
