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

No balance or complete-game acceptance is established. Wound consequences and most learned abilities are not automated in the dungeon runtime; the explicit implementation boundary is documented in `implementation-status.md`. No sustained performance or controller/accessibility certification was attempted. Review was by the implementing agent, not an independent reviewer.

## Second-pass regression evidence

Core regression suite adds single-hero movement, formation ordering/save compatibility, Cinder Cast/Burning, Rime Grip/Slowed/Freezing, invalid-action non-spending, Defend plus Shield Block timing, stabilization resource preservation, Last Words gates, immutable/earned development and final-use ammunition checks. Every pinned source hash remains checked.

`test:controls` exercises right-drag and wheel input, formation selection/reordering, rendered sheets, spell targeting and single-hero movement through actual mouse controls. It also commits earned advancement through the original Workshop iframe and checks HP/Grit preservation. Web Audio is required to be running with a nonzero analyser signal, then silent after muting; this verifies generated/routed audio, not physical speaker audibility.

The same controls routine runs inside `test:native`, attached to the exact launcher with sandboxing enabled. A deliberately invalid inherited `CHROME_DEVEL_SANDBOX` is used for the launch regression. The packaged helper path is repaired to the installed root-owned helper. Windows packaging is checked separately; Windows execution remains untested.

Latest results: 24 core tests, browser recruitment/combat and controls checks, sandboxed Linux native controls, Linux packaging and Windows ZIP packaging passed. Screenshots in ignored `test-results/` were visually inspected for the dungeon and expanded character sheet.
