# November 12 — Player creature review fixes

- Ubuntu, worktree `/home/bmoser/Projects/FLD-Creature-Production`, branch `codex/creature-review-fixes`, base delivery head `87edc54`. Weapon fixes complete. Creature redesign work in progress.

## Completed

Animated Armor uses an owned sword and matching sword-and-shield animation. Barrow Guard retains its full sword and diagonal attack with a revised shoulder pose and socket cant. Both pass sampled blade/head clearance, ground, GLB reimport, full motion captures and muted development bestiary and dungeon checks. See the individual creature reports. All 25 focused tests pass and required-assets AppImage/deb built. Native launcher passes the full 58-entry bestiary, sandbox, and isolated disk-save/close checks.

Menu AppImage and ignored original-launcher runtime updated. Previous builds backed up at `~/.local/share/four-lanterns-local-backups/sword-fixes-20261112-094426/`. Installed AppImage SHA-256 `3aaa012fe23572b61931dee9f5121b367511baa98f377efa3c37646910f0fdf3`. User saves and primary source files were preserved.

## Remaining

Cinder Imp is source-integrated from the new image. Its final 74,960-triangle mesh, 25-bone rig, 558-frame motion review and actual fire projectile evidence are under private `cinder-imp/rebuild/rigged-forward/`. Local Linux AppImage/deb built and passed native bestiary, launch and isolated save checks. Menu AppImage and original launcher updated with the Imp. Package folder: `~/Downloads/FLD-Cinder-Imp-Review-2026-11-12/`. AppImage SHA-256 `523f477ab759de748b8ada0a087806e99438efcf9be2267f88e8efbe299bdbd8`. Previous builds backed up under `~/.local/share/four-lanterns-local-backups/cinder-rebuild-20261112-095625/`.

Bruce clarified that goblin and kobold replacements should each start from an image and use the same reconstruction route. Goblin Boss is source-integrated and installed after a 474-frame motion review, fitted officer blade/head clearance and actual game checks. Its first Blender reduction damaged the mesh. CuMesh preserved the geometry and the final reconstruction has 73,540 triangles. Private final files are under `goblin-boss/rebuild/rigged-coat-fitted/`. The installed Boss build passed native bestiary, launch and isolated save checks. Its AppImage SHA-256 is `c3c847f16e36dbb98d5eaf087156029739f6f85a5d04aa06db2d3beb3d8f3938` and rollback files are under `~/.local/share/four-lanterns-local-backups/goblin-boss-20261112-101043/`.

Spearhand is source-integrated and installed from its own new image with a separate fitted spear. Final 74,900 triangles and 474 reviewed motion frames, all game-view checks pass. Private files under `goblin-spearhand/image-rebuild/rigged-final/`. The installed AppImage passed native bestiary, launch and isolated save checks. SHA-256 `35f94b47638fd866aa865c7615c9d49f5918759c416c7ce78ce6359983c760c0`. Installers are under `~/Downloads/FLD-Image-Creature-Review-2026-11-12/`, with rollback at `~/.local/share/four-lanterns-local-backups/image-spearhand-20261112-101743/`.

Scrapper is source-integrated after its fresh reconstruction, hand fit, short scrap knife and 474-frame motion and development game checks. The verified final scene and evidence are under `goblin-scrapper/image-rebuild/rigged-clean/`. It awaits local delivery with the next batch. Goblin rig recipe is `scripts/toolchain/rig-reconstructed-goblin.py`. The focused geometry checks, full 379-test suite and required-private-assets build passed.

Next image rebuilds in order: Firestarter, Rattlechanter, Smoke Slinger, Kobold Tunnel Scout, Trapkeeper and Emberkeeper. Wererat and Werebear need fresh image-derived anatomy as requested. Keep the references and exports private. No model generation or packaging is running at this checkpoint.

## Sync

Push the work-in-progress branch and verify the remote head. Keep the in-progress redesign outside a merged delivery PR.
