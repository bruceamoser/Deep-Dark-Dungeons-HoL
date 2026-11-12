# November 12 — Player creature review fixes

- Ubuntu, worktree `/home/bmoser/Projects/FLD-Creature-Production`, branch `codex/creature-review-fixes`, base delivery head `87edc54`. Weapon fixes complete. Creature redesign work in progress.

## Completed

Animated Armor uses an owned sword and matching sword-and-shield animation. Barrow Guard retains its full sword and diagonal attack with a revised shoulder pose and socket cant. Both pass sampled blade/head clearance, ground, GLB reimport, full motion captures and muted development bestiary and dungeon checks. See the individual creature reports. All 25 focused tests pass and required-assets AppImage/deb built. Native launcher passes the full 58-entry bestiary, sandbox, and isolated disk-save/close checks.

Menu AppImage and ignored original-launcher runtime updated. Previous builds backed up at `~/.local/share/four-lanterns-local-backups/sword-fixes-20261112-094426/`. Installed AppImage SHA-256 `3aaa012fe23572b61931dee9f5121b367511baa98f377efa3c37646910f0fdf3`. User saves and primary source files were preserved.

## Remaining

Cinder Imp is the active revision. Begin from the new original bat-demon reference at `~/.local/share/four-lanterns-creature-production/cinder-imp/rebuild/front.png`. Local TRELLIS.2 reconstruction is the first mesh candidate. It requires mesh review, materials, rigging, animation and runtime acceptance. Keep its source and derived files private. Next improve Goblin Boss with a stronger officer silhouette and rebuild Wererat and Werebear from new anatomy without their old models as donors.

## Sync

Push the work-in-progress branch and verify the remote head. Keep the in-progress redesign outside a merged delivery PR.
