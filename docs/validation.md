# Validation — development preview 0.1

## Automated rules and state checks

`npm test`: **11 passed**. Includes 100 reproducible generated-floor connectivity cases with scenery obstacles; blocked-corner movement; all four published example characters passing full creation validation; immutable source hashes for 317 HoL inputs; all 280 wound entries; Boon/Bane caps and natural extremes; safe-breath Grit retention; combat action/movement budgets; save round-trips and malformed save rejection; validated replacement preserving position.

## Rendered interaction checks

`npm run test:play` against the local dev server passed:

- Open the embedded Character Workshop, change a hero's name, recruit using full rules validation.
- Click the actual 3D ground to move the hero in real time.
- Introduce a deterministic nearby enemy fixture, then use the rendered interface to attack and end the turn.
- Verify the attack's fixed damage/resistance and spent Main Action, opponent defense resolution, alternating side order and saved combat state.
- No JavaScript page errors in the checked flow.

`npm run test:visual` previously captured the town/dungeon and found no JavaScript or console errors. Screenshots were inspected; this establishes rendering, not final art-quality acceptance.

The original Playwright Electron-driver check masked the normal-launch sandbox failure reported by Bruce. It did not prove a terminal launch worked. The corrected native test spawns the exact `launch-game.sh` command and attaches via CDP, without injecting sandbox-disabling flags. It checks renderer seccomp filtering as well as scene rendering and disk saving, in an isolated user-data directory. Windows x64 ZIP packaging passed; **Windows execution remains untested**.

`npm audit --omit=dev`: zero runtime dependency advisories at the time of checking. Build-tool dependencies still report moderate advisories; this is not a security certification.

## Artcraft

Initialize/tools-list handshakes passed for PhotoCraft 0.18.0, VectorCraft 0.19.0 and SolidCraft 0.29.0. After relocating the project, the probes passed again. VectorCraft successfully opened the seal SVG, saved its editable document and exported the PNG used by the game.

## Limits

No balance or complete-game acceptance is established. The original preview lacked automated wounds; later passes below supersede that limitation. Most learned abilities still require adapters; current boundaries are documented in `implementation-status.md`. No sustained performance or controller/accessibility certification was attempted. Review was by the implementing agent, not an independent reviewer.

## Second-pass regression evidence

Core regression suite adds single-hero movement, formation ordering/save compatibility, Cinder Cast/Burning, Rime Grip/Slowed/Freezing, invalid-action non-spending, Defend plus Shield Block timing, stabilization resource preservation, Last Words gates, immutable/earned development and final-use ammunition checks. Every pinned source hash remains checked.

`test:controls` exercises right-drag and wheel input, formation selection/reordering, rendered sheets, spell targeting and single-hero movement through actual mouse controls. It also commits earned advancement through the original Workshop iframe and checks HP/Grit preservation. Web Audio is required to be running with a nonzero analyser signal, then silent after muting; this verifies generated/routed audio, not physical speaker audibility.

The same controls routine runs inside `test:native`, attached to the exact launcher with sandboxing enabled. A deliberately invalid inherited `CHROME_DEVEL_SANDBOX` is used for the launch regression. The packaged helper path is repaired to the installed root-owned helper. Windows packaging is checked separately; Windows execution remains untested.

Latest results: 24 core tests, browser recruitment/combat and controls checks, sandboxed Linux native controls, Linux packaging and Windows ZIP packaging passed. Screenshots in ignored `test-results/` were visually inspected for the dungeon and expanded character sheet.

### Terminal AppArmor correction

Bruce’s subsequent `LaunchProcess: failed to execvp: .../HoL` report exposed another false positive: processes launched from the desktop agent inherited `chatgpt (unconfined)`, which allows user namespaces. His Konsole shell is plain `unconfined` and reaches the SUID helper path. `aa-exec -p unconfined -- ./launch-game.sh` reproduced his exact failure before the fix. This matches the upstream [Electron path-with-spaces issue](https://github.com/electron/electron/issues/44414).

The launcher now copies the packaged runtime to a private, versioned, space-free path in the user’s local application-data directory, retaining the trusted system SUID helper. The copy uses reflinks when available, an installation lock and atomic staging. No project rename, save migration, global AppArmor change or sandbox disabling is involved.

The corrected native test runs the launcher through `aa-exec -p unconfined`, asserts the actual executable path has no whitespace and the main profile is `unconfined`, then runs the full controls suite and verifies renderer seccomp filtering. This passed, as did a plain launch without remote-debugging flags or temporary user data. The earlier profile-inheriting test alone was insufficient evidence of terminal compatibility.

## Character command screen

Author review and checks: 26 core tests; browser control and recruitment/combat checks; `scripts/character-check.mjs` exercises wear/remove resistance and appearance, readying a visible bow, favorite save/load, and a blank-to-valid character through the new interface. The same character check runs inside packaged Linux through the exact launcher under `aa-exec -p unconfined`, followed by camera/formation/audio/turn/training/disk-save checks. Inspected rendered sheet, bow and creation screenshots. Windows execution remains untested.

## Injury, recovery and curated actions

Author review: **40 core tests passed**, including typed wound consequences, forced-movement collisions, daily treatment limits, persistent scars, final-use healing potions, recipient reactions, action-category choices, Last Words/defeat progression, save migration and immutable source hashes. Browser recruitment/combat checks passed.

The packaged Linux test passed through the exact terminal launcher and normal AppArmor context. It exercised native character creation, armor and bow appearance, saved favorites, earned training with spent HP/Grit preserved, camera/formation/audio, spells and actor-only movement. The added recovery interaction acknowledged an eye wound, used an ally's potion, treated the injury across separate days, removed its blindness penalty, retained the scar and restored that state from disk. Screenshots of the sheet, combat and treated wound were inspected. Linux and Windows ZIP packaging passed; **Windows execution remains untested**. These checks establish the documented subset, not complete automation or balance of HoL.

## Weapon and spell presentation

Author-reviewed physical effects replace the earlier traveling spheres. The rendered effects check clicks the actual enemy target with a readied bow and sword, then advances deterministic animation frames to inspect the nocked arrow, flight, blade ribbon and contact. It verifies delayed hit presentation on lethal targets, cleanup after flight and entity rebuild, repeated one-shot animation restart, a lunge that preserves the actor's tactical coordinates, and a forced push that waits visually for contact. Fire, frost, life and self-target recovery effects render without projectile spheres. Screenshots of arrow flight, sword contact and the character screen were inspected.

The full packaged Linux launcher check passed again with these effects, character creation/equipment/favorites, camera/formation/audio, advancement, combat, wound treatment and disk-save checks. Renderer seccomp filtering remains enabled under the ordinary terminal AppArmor context. The core suite remains at 40 passing tests. Linux and Windows ZIP builds passed; Windows runtime, final audiovisual quality and comprehensive animation coverage remain unverified.

## Creation purchases, combat controls and world interactions

Author review: **48 core tests passed**, including allied passage without stacked saved positions, prone/difficult movement costs, coordinated corridor reversals after collecting coins, all four formations over three seeded floors, next-round hero selection, explicit loot collection, cache recovery, gathering at stairs and save/load protection against duplicate treasure. All 317 vendored source hashes remain unchanged.

The exact packaged Linux launcher passed under the ordinary terminal AppArmor context with seccomp filtering enabled. The rendered suite exercised blank recruitment and explicit saved-draft resumption; separate discipline/ability purchases; discipline filters, book icons and action badges; incomplete grant choices and owned/granted equipment counts; reversible targeting and self confirmation; re-enabled controls after movement; ally passage and next-turn selection; continued movement after collecting coins; object hover highlights and Inspect/Approach/Collect/Recover/Leave menus; and return travel through the stairs menu. Existing camera, equipment appearance, favorites, audio signal/mute, advancement, physical attack effects, wound treatment and disk-save checks also passed. Purchase, equipment, combat-targeting and world-menu screenshots were inspected.

An earlier native attempt timed out while clicking a Cinder Cast target. The standalone controls check and subsequent full packaged run passed; failure screenshots and state logging were added to the native runner for diagnosing recurrence. Browser recruitment/combat checks and both Linux and Windows ZIP packaging passed. Windows execution and physical speaker output remain untested.

## Persistent repository, fallen heroes and XP

Author review: **57 core tests passed**. New coverage verifies reserve creation without party replacement; assignment/swapping with identity, equipment, HP, spent Grit, supplies and XP retained; repository save/load; the exact source Last Words deadline before a one-time Hall entry; rejection of fallen recruitment and duplicate identities; defeat without copied replacement heroes; migration of earlier milestone levels; cumulative XP thresholds and multi-level unlocks without automatic healing/training; shared discovery/encounter XP excluding reserves and dead heroes; persisted once-only rewards; and treasure XP earned on extraction, lost on defeat and excluded from cache recovery. All pinned source hashes still pass.

The rendered repository check creates a hero, explicitly assigns them, restores a former companion without healing, reads XP history/rules and training readiness, reloads the saved repository, resolves final death through the source survival functions, inspects the Hall and reloads its record from disk. The exact sandboxed Linux launcher suite includes this check, complete character creation, controls, combat/turns, interactions, effects, recovery and disk saves. Repository, Hall and XP-sheet screenshots were visually inspected. Browser recruitment/combat checks and both desktop packages passed. Windows execution remains untested.

The existing local user campaign was loaded into an isolated in-memory Game using the new migration path: its four heroes received stable identities and remained available. The original campaign file was read only and not rewritten by that verification. XP pacing is initial tuning, not an established balance result; missing higher-level signature adapters remain a training limitation.

## Book creatures, magic equipment, return travel and saved runs

Author review: **77 core/storage tests passed**. New checks cover all 58 source roster entries across 1,200 seeded encounter compositions, exact source stats and legal placements, mixed-party CV budgets, every-fifth-floor guardians, primary outcome parsing, printed resistances/reactions/ammunition/conditions, 12 generated equipment forms, dormant/qualified enchantments, two rings and hand occupancy, resistance/Brawn stacking and Life healing, once-only coffer claims, boss gates, six finite-stock shops and sell values, paired recall through save/load, feedback deltas, canceled opposition timers, mid-movement combat saves, complete load notifications, unique treasure identities after floor regeneration, independent named slots, ordered writes, legacy migration and invalid-path/slot isolation. All 317 pinned source hashes remain unchanged.

The full **packaged Linux** suite passed through the exact launcher under `aa-exec -p unconfined`, with renderer seccomp filtering and no sandbox-disabling flag. It includes existing creation/equipment/favorites, repository/Hall/XP, camera/formation/audio, combat/turns, object interaction, weapon effects and wound treatment checks. Added rendered checks bought from the six merchants, inspected the Bestiary, looted individual magical items, displayed discipline gates and ten gear slots, read damage/healing labels, activated/cleared all 17 condition layers, rendered all 58 visual adapters, and saved/reloaded/used the same-floor return passage.

The native saved-run flow renamed a slot, made an independent copy, changed and saved the original, exited and restarted into the library, continued both different states, created a separate new company, restored spent combat actions and a pending reaction. The native close test invokes `BrowserWindow.close()` through a local test-only main-process inspector and verifies a last-moment state change reached disk before exit. This follows the native titlebar close path; a renderer `window.close()` call bypassed that event in the installed Electron build and was not valid evidence for the native close handler. No inspector is enabled on an ordinary launch.

Browser recruitment/combat checks passed, including the Bone Sentry's newly automated Fall to Pieces resistance and prone consequence. Linux packaging and Windows x64 ZIP packaging passed. Market, Bestiary, loot requirements, equipment slots, status effects, creature galleries and saved-journey screenshots were inspected. Windows execution, physical speaker output, sustained performance, long-term balance and final art-quality acceptance remain untested. Source creature alternate actions and broader hero-rule gaps remain explicit in the implementation documents.

The user's existing local combat campaign was loaded read-only into the updated Game and retained its four heroes; its original file hash was unchanged. Migration tests use isolated temporary directories. Native tests also use isolated user data and do not overwrite that campaign.

## Origin previews, level-zero purchases and scroll retention

Author-reviewed creation update: the 77 core/storage tests still pass, including all immutable source hashes. The packaged Linux suite passed through the exact sandboxed launcher. Its creation flow now verifies all 18 culture and 32 background entries, both grant-pair previews and book icons, passive/action badges, ability-name search, readable source rules, cancel without an implicit grant, explicit second-pair selection and retained selection when reopening, empty search results, and selected culture/background grant summaries. It confirms discipline purchasing is disabled at level 0 before and after choosing a class, while level-1 discipline purchasing remains available.

The same interaction flow verifies retained scroll offsets after choosing a signature, buying a discipline and purchasing equipment, allowing the natural end-of-content clamp when a resolved validation message shortens the panel. Deliberately switching chapters starts at the top. It completes a valid hero and runs the existing roster, combat, movement, gear, effects, recovery, merchants, recall and saved-run checks. A separate 1100×720 rendered check found no horizontal overflow and selected the second grant pair through the scrollable chooser. Origin-preview and selected-grant screenshots were visually inspected.

Linux and Windows x64 ZIP packages rebuilt successfully. Windows execution remains untested. Source grant pairs, duplicate refunds, purchase eligibility and creation DP rules were not modified; the level-0 rule was already enforced by the pinned validator and is now explicit in the interface.

## v0.3.0 curation and expedition validation

- 99 automated tests pass, including all 90 signature coverage assertions, execution/save round trips for every active signature, daily ancestry preparation, Oath healing caps, low-light/seismic perception, interception, last-stand wards, spell opportunity continuation and free legacy retraining.
- Supply/time/crafting tests cover torch hands and saved burn intervals, daily food/water final uses, fatigue/sleep without Grit restoration, real crafting outputs/material expenditure, Disengage and pending player opportunity saves.
- Added a real UI sequence for prepared traits, retraining choices, well refills, buying materials/crafting, held-torch meshes and enemy hover identification. Screenshots are generated in ignored `test-results/`.
- Source card hashes remain pinned and no vendor, book or Foundry files are edited.
- The complete native Linux suite passes on v0.3.0 through the exact `launch-game.sh`, under `aa-exec -p unconfined`, without `--no-sandbox`; renderer seccomp is verified. It covers the new expedition screens plus creation, model equipment, favorites, audio, camera, targeting, ally passage, loot, projectiles, wound treatment across days, merchants, 58 creature models, 17 condition layers, run copies, pending reactions and save-on-close. Test data is isolated from real saves.

## v0.4.0 game powers, identity and tactical clarity

- 122 automated tests pass. The added suite executes every active game design,
  checks complete creation with game acquisitions/signatures, rejection before
  spending, damage/DR/absorption, healing vs wounds/Grit, sleep charges, resource
  limits, a usable queued bonus Maneuver, and saved spell opportunity decisions.
- Surface checks cover both sides, forced entry, extinguishing, sight/barriers,
  one-use traps, healing turns, expiry and save/load. Recipes test learning,
  real outputs, replenishment, batches/time, exhaustion and persistence.
- Appearance normalization covers ten ancestries, supported styles, malformed
  colors and round trips. Invalid power/surface/recipe save data is rejected
  before replacing the current campaign. Existing vendored hashes still match.
- Movement tests cover weighted terrain, ally passage, legal endpoints, Slowed
  and buffs before the turn begins. Deletion tests cover active/inactive saves,
  storage failure rollback and deletion of the last migrated run without
  resurrecting its legacy backup.
- The native suite additionally edits and reloads appearance, compares the
  equipped scene model with the preview, creates a valid hero with custom hair,
  verifies the true grid/range, previews/cancels an area, casts fire and dousing,
  and deletes active/inactive runs with cancellation and restart checks. It also
  runs the existing camera/audio, gear, combat, effects, recovery, merchant,
  creature, condition, roster and save-on-close checks.
- Screenshots of the appearance sheet, movement overlay and area preview were
  visually inspected. The actual launcher runs under `aa-exec -p unconfined`
  with isolated test saves, a space-free runtime, seccomp and no `--no-sandbox`.

Author review is not independent review. All 87 designs have automated execution
coverage; long campaigns, economy/balance, physical speaker output and final
production-art acceptance still require playtesting. Windows installation and
release smoke are checked in the release workflow; the complete interactive
suite is native Linux.

Release candidate checks on GitHub passed for installed Windows, Linux AppImage
and Debian packages. A real v0.3.1 → v0.4.0 AppImage round trip passed: corrupt
checksum rejection, save-failure blocking, replacement, restart and restored
journey state. The diagnostic feed is supplied only through the Node inspector;
production exposes no feed override. The test now hooks the explicit
AppImageUpdater instance used since v0.3.1 rather than the unused default updater.
All ten ancestry variants were additionally rendered through the creator and
inspected together in `test-results/ancestry-identity-gallery.png`.

## v0.4.1 — Early-training purchase depth

`npm test`: **129 passed**. New coverage checks every one of the 2,304
culture/background game-grant pairings, all remaining balances through the
19-DP maximum, same-discipline refunds, the level-0 discipline lock, actual
creation receipts and save/load, recipe benefits and redundant purchases.
Every active power in the 165-entry catalog executes against a valid target;
focused checks verify the new movement, damage, condition and limited-use effects.
Condition-only care rejects unaffected targets without spending; mixed care can
cleanse a full-HP ally. Existing power definitions and all historical mappings
were compared with v0.4.0 and remain unchanged.

The rebuilt local desktop passed `TMPDIR=/home/bmoser/.cache/ddd-tests npm run
test:native` through the exact launcher and `aa-exec -p unconfined`, with sandboxing
and renderer seccomp enabled and isolated saves. The UI test creates Arms/Armor
origins, spends down to 3 DP, verifies four Arms choices, buys Hamstring for 2 DP
and Plated Advance for the final 1 DP, then completes recruitment. The rendered
purchase screenshot was inspected after removing duplicated power descriptions.
The full native regression also passed equipment, appearances, combat controls,
crafting, saves, reactions and shutdown persistence. Review was author self-review;
this does not establish long-term balance or final production art quality.
