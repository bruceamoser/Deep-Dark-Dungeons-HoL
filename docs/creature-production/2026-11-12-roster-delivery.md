# Complete roster — local review delivery, November 12, 2026

All **58 creatures** are source-integrated and installed in the normal per-user menu AppImage and primary checkout's packaged launcher. Each has recorded model, animation, game-view and integration evidence; approval means author review unless Bruce explicitly approved it. User bulk art review remains the next step. Private models stay outside Git.

## Verification

- **379 unit tests pass.** Required-assets AppImage and Debian packages build; all 58 staged GLB hashes match the approved manifest (184 MiB total).
- **All 58 native six-creature/four-hero encounters pass**, averaging **58.60–60.00 FPS**, with worst p95 **16.8 ms**, at 1600×1000/DPR1 on one RTX3090. All ten actors stay visible/in frame and AI turns advance. These are 10-second controlled samples with boosted hero HP and heroes passing turns, not combat-balance or universal-resolution guarantees. Occasional hitches remain: largest individual frame 116.7 ms. See [complete timing table](2026-11-12-roster-performance.md).
- Exact launcher passes the full 58-entry bestiary/book-art comparison, all five preview states for every approved model, reusable context, camera/keyboard/search/layout/cleanup, disk save and save-on-close. No JavaScript errors. Muted, isolated test saves; ordinary terminal AppArmor context, enabled sandbox, renderer Seccomp2 and space-free runtime.
- Werebear, Horned Devil and Ash Demon received refreshed exact-final-hash full motion captures after their material-only refinements: 400/256/320 frames respectively. Reviewed attachment/deformation again; no asset bytes changed. Other 55 entries retain their recorded qualified motion evidence, including the three original approved anchors.
- Installed menu AppImage independently passes the full bestiary/animation/save/sandbox checks. The exact original primary launcher path also passes native render, disk-save, save-on-close and sandbox verification.

## Harness corrections

The queue tests assumed at least two unfinished creatures; explicit fixtures now keep them valid after roster completion. A reloaded saved combat initially leaked into the next benchmark; each case now starts a fresh party fixture. Smoke Slinger correctly concealed the enemies, invalidating its original visible-load sample; the benchmark now forces only render visibility, preserving AI/gameplay conditions. The first 20 fully visible samples were retained and the remaining cases rerun. Electron may combine arguments into its process title, so sandbox argument checks use token-boundary matching rather than array membership. These were test corrections, not gameplay changes.

The agent shell inherits NoNewPrivs1, which blocks SUID sandbox elevation. Native QA runs through a normal transient systemd user service with NoNewPrivs0, still directly invoking launch-game.sh through aa-exec unconfined. No no-sandbox workaround, global policy change or personal audio-setting change.

## Delivery and rollback

Source version remains **0.8.7**, a private local art-review build. No immutable public release was replaced, no Windows execution is claimed, and the system Debian installation is unchanged. Restart an already-running game to load the new art.

- Normal menu: `~/.local/share/deep-dark-dungeons-hol/Deep-Dark-Dungeons-HoL.AppImage`.
- Primary launcher: `/home/bmoser/Documents/ChatGPT/HoL Procedural Game/launch-game.sh`. Only its ignored packaged outputs were refreshed; historical dirty source remains untouched.
- Installers: `/home/bmoser/Downloads/FLD-Roster-Review-Build-2026-11-12/` contains AppImage, deb, supported per-user installer, icon and SHA256SUMS.
- Previous menu AppImage, primary packaged runtime and installers backed up at `~/.local/share/four-lanterns-local-backups/roster-20261112-022336/`. Personal saves and sound preferences were not modified by installation; QA uses temporary saves.
- Installed AppImage matches the built artifact: `3aab6e6737b7ab8817c39c14fe58aa1c0df4b4cfa1854f76bac9cc531ad6d48e`.
- Debian artifact: `792c80cc6e9ff39320f1cee31d211880c4088388657b8901524e95f0e310e5aa`.

## Review and private transfer

`/home/bmoser/Downloads/FLD-Creature-Review-2026-11-12/index.html` places book art beside each reviewed model and links angles/motion sheets. Five contact sheets are beside it. The installed Bestiary provides interactive animation. `scripts/toolchain/build-creature-review-gallery.py` selects captures by manifest hash, with explicit approved-anchor sources.

Private editable scenes/maps/exports/captures: `~/.local/share/four-lanterns-creature-production/`; original anchors additionally use `~/.local/share/four-lanterns-modular-pilot/2026-11-11/`. Git carries recipes, source hashes, tests and progress, not those assets or installers. Transfer private inputs separately between machines. Full timing evidence is ignored `test-results/roster-performance/`. Individual creature reports retain silhouette, topology and motion limitations; this delivery is ready for Bruce's bulk art review, not a claim that every model is beyond refinement.
