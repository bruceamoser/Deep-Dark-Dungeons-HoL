# Bestiary model comparison

Open **Settings → Bestiary** to compare each creature's book illustration with its actual in-game model. Shift-clicking an enemy also opens its entry. All 58 dungeon creatures use the current game appearance factory, including authored replacements, equipment, nonhumanoids and procedural creatures. The viewer uses neutral inspection lighting; it does not simulate dungeon darkness, status layers or boss variants.

- Drag with the left or right mouse button to rotate; scroll to zoom.
- Focus the model and use left/right arrows to rotate, or +/− to zoom.
- **Reset view** restores the fitted three-quarter view.
- Choose **Idle, Walk, Attack, Hit or Fallen** to inspect supported animations. Unsupported clips are disabled; procedural vermin support idle/walk through their existing motion callback. Attack prefers the creature's actual spell/ranged/claw/melee animation, with its existing melee alias as fallback.
- Search/family filters remain available, and selecting an entry preserves the creature list's scroll position.

The viewer automatically frames the model's visible posed bounds, including wide wings and gear. It keeps one canvas/WebGL context while entries change, clones game appearances, and disposes old per-instance materials, procedural geometry, skeleton resources and animation bindings. Closing by Escape, Close, or another modal path releases the viewer, observer, controls, animation frame, environment, pedestal and context. Shared source assets are retained. Both bestiary entry points register modal cleanup.

## Verification — November 10, 2026

358 existing unit tests pass. JS syntax/browser production build pass. `scripts/bestiary-preview-check.mjs`, registered in the native suite, exercises all 58 entries beside matching loaded illustrations, confirms reuse of the same live canvas, tests left/right-drag/wheel/keyboard inspection, five supported Ash Demon poses, reset, search retention, 1280×720 side-by-side layout, Escape/Close cleanup and reopening with a fresh context. Actual screenshots of Ash Demon and Werebear were inspected. No independent art-quality approval is implied by a functioning viewer.

`npm run package:dir` refreshes the checkout launcher. The muted native exact `launch-game.sh` check passes through terminal AppArmor/SUID sandbox, verifies seccomp/no `--no-sandbox`, and finishes isolated disk save/close. Final log `/tmp/fld-bestiary-native-final.log`; unit/build logs `/tmp/fld-bestiary-tests.log`, `/tmp/fld-bestiary-package-final.log`; ignored screenshots `test-results/bestiary-{model-comparison,werebear}.png`. The first native attempt failed a test selector that counted the canvas's `data-creature` alongside list buttons; the corrected button-scoped test passes. Author review also scoped the UI selection handler to buttons, preventing a click/left-drag on the canvas from rebuilding its entry; a header-identity/left-drag check covers that case. No unresolved runtime failure remains.

Branch `codex/bestiary-model-preview`, base `b13e448` (wave-04 PR #157 merged). Checkout label remains 0.8.7; installed package/public release unchanged. Windows desktop interaction was not exercised for this change. No new assets, creature statistics, source rules or save data were changed.
