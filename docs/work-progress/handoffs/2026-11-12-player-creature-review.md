# November 12 — Player creature review fixes

- Ubuntu, worktree `/home/bmoser/Projects/FLD-Creature-Production`, branch `codex/creature-review-fixes`, base delivery head `87edc54`. Weapon fixes complete. Creature redesign work in progress.

## Completed

Animated Armor uses an owned sword and matching sword-and-shield animation. Barrow Guard retains its full sword and diagonal attack with a revised shoulder pose and socket cant. Both pass sampled blade/head clearance, ground, GLB reimport, full motion captures and muted development bestiary and dungeon checks. See the individual creature reports. All 25 focused tests pass and required-assets AppImage/deb built. Native launcher passes the full 58-entry bestiary, sandbox, and isolated disk-save/close checks.

Menu AppImage and ignored original-launcher runtime updated. Previous builds backed up at `~/.local/share/four-lanterns-local-backups/sword-fixes-20261112-094426/`. Installed AppImage SHA-256 `3aaa012fe23572b61931dee9f5121b367511baa98f377efa3c37646910f0fdf3`. User saves and primary source files were preserved.

## Remaining

Cinder Imp is source-integrated from the new image. Its final 74,960-triangle mesh, 25-bone rig, 558-frame motion review and actual fire projectile evidence are under private `cinder-imp/rebuild/rigged-forward/`. Local Linux AppImage/deb built and passed native bestiary, launch and isolated save checks. Menu AppImage and original launcher updated with the Imp. Package folder: `~/Downloads/FLD-Cinder-Imp-Review-2026-11-12/`. AppImage SHA-256 `523f477ab759de748b8ada0a087806e99438efcf9be2267f88e8efbe299bdbd8`. Previous builds backed up under `~/.local/share/four-lanterns-local-backups/cinder-rebuild-20261112-095625/`.

Bruce clarified that goblin and kobold replacements should each start from an image and use the same reconstruction route. Goblin Boss is active, with a new reference in private `goblin-boss/rebuild/front.png` and a reviewed 73,321-triangle CuMesh reduction. Blender collapse reduction damaged the reconstructed shape and was rejected. The corrected mesh is in the texture and rigging pass. Finish its fitted sword, rig, motion and game checks. Continue one at a time with Goblin Spearhand, Scrapper, Firestarter, Rattlechanter and Smoke Slinger, then Kobold Tunnel Scout, Trapkeeper and Emberkeeper. Wererat and Werebear need fresh image-derived anatomy. Keep reference images and exports private.

## Sync

Push the work-in-progress branch and verify the remote head. Keep the in-progress redesign outside a merged delivery PR.
