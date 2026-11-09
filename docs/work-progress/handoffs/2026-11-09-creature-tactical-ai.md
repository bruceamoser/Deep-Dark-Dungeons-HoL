# 2026-11-09 — Creature tactical AI

- Machine: Bruce's Linux desktop.
- Branch: `codex/creature-tactical-ai`; base `4ef2d6d` (PR #109).
- Task: varied goals, target selection and real ability use so encounter balance can be evaluated.

## Completed

Identity-driven pack/duelist/guardian/hunter/skirmisher/support/controller/ranged/bruiser behavior. All 120 Main Action entries across the 58-creature roster are considered. Printed ammo limits, nonconsecutive attacks, statuses, forced movement, legal terrain and retained action categories constrain behavior. Ranged creatures seek spacing and clear shots; packs coordinate; duelists spread; guardians favor their post/allies. Multiple specialty attacks are no longer silently ignored.

Useful support/control/terrain/mobility maneuvers now execute. Movement exemptions are scoped to the printed opponent(s), and reactive interruptions resume the same declared plan. Breath cones include friendly creatures. Creature Opportunity Attacks use their own printed Basic Melee profile. Temporary fields expire on the source's next turn/death and update torch lighting. Once-scene fields and cooldowns survive saves.

Wolf holds have paired maintained conditions and a paid Break free action. Caltrops have a paid Clear caltrops action. The bestiary describes behavior and lists all printed main attacks. Creature action logs use plain outcomes and maneuvers have floating labels. No creature stats, CVs or encounter budgets were changed. Old saves without AI state load normally; new state is validated.

See [coverage, adaptations and deliberate limitations](../../creature-ai.md), including conditional web movement, noncombat/cosmetic choices, unchanged reaction adapters and NPC cone-defense resolution. No claim of completed play balance: these are the behaviors to balance against.

## Verification

Local unit suite, production build and licensed Linux directory package checks run. Tactical unit scenarios cover all 58/120 entries plus target policies, visibility/taunts, weighted movement, ammo/cooldowns, support, fields, mobility exemptions, holds/escape, paid clearing, friendly fire, incapacitation, saved state/corrupt saves, printed opportunity damage and light expiry.

Native QA exercises actual pack turns and UI Break free, ranged movement/fire, ally support, third-action alternation, UI caltrop clearing and the full bestiary. Desktop screenshots inspected. The complete exact-launcher Linux regression uses the user systemd session then `aa-exec -p unconfined`, retains sandboxing and uses isolated saves. Final logs: `/tmp/fld-ai-unit-final.log`, `/tmp/fld-ai-native-final.log`. Final results are recorded on the PR.

Earlier validation caught and corrected: the all-powers harness needed valid hold/caltrop targets for the two new actions; the UI ground click needed stable camera placement; extra Escape in test cleanup opened Runs; a legacy direct enemyAttack call has no initialized retained categories. An added light test initializes expedition torch state before using it. These attempts remain in local logs; do not treat them as passing qualification.

## Next / transfer

Bruce subsequently requested a new release. v0.8.5 release work is tracked in [release handoff](2026-11-09-v085-release.md). Local `launch-game.sh` is rebuilt with licensed runtime assets; latest published installer remains v0.8.4. No new art/dependencies or private transfer requirements. Purchased exports and builds remain ignored/local. Final source and progress docs are pushed on the named branch and merged only after checks pass; verify PR/history for the merge state. Further balance needs player feedback on these actual behaviors rather than stat changes in the same patch.
