# 2026-11-10 — Werebear, Marshal and Ash Demon

- Machine: bmoser desktop, Ubuntu Linux.
- Objective: continue lowest-rated creature coverage using parallel DeepSeek authors and GPT organizer review/revisions.
- Branch: `codex/deepseek-creature-wave-04`; base `af20959d2ed6bd467d045a551e704435b2a1f9e2`.
- Status: implementation/local verification complete; Git/PR history records subsequent push/author review/merge. No release requested.

Three concurrent authors, one separate Werebear revision call; all three received concrete organizer review. Marshal and Ash addressed findings within the original bounded jobs. Four calls exited zero, no timeout/task-owned Blender remaining. [Report](../../creature-model-wave-04.md), [provenance](../../creature-wave-04-provenance.json), [ratings](../../audits/2026-11-10-creature-wave-04.json). Accepted GLBs, editable sources, portable builders, preview and reusable rig comparator are in Git.

Werebear gains recognizable head/eyes/muzzle/claws/woodcutter kit (23→78); Marshal gains helmet/armor/map board/saber (24→83); Ash Demon gains charcoal/orange winged fire body (24→74). Bear's faceted fur/exaggerated fangs and demon's solid anatomy/flat wings/faint smoke remain below target 80 and need later refinement. Not final/independent art approval. Runtime suppresses duplicate Marshal weapon, adds cosmetic Ash heat flicker and preserves its boss enlargement. Rules/IDs/stats/saves/source book/original donors unchanged.

358 unit tests pass. Portable Blender 5.2.4 rebuilds: bear/demon byte-identical; Marshal geometry/skin/JSON identical with unused UV float differences <=5.96e-8. All 23 bones/rest/binds compare (<2e-5 locals, <1e-6 inverse bind). Separate Three.js views/pixel/pose checks and actual factory rated capture pass. New unarmed reviewer mode exercises actual claw attacks.

Muted native exact launcher through terminal AppArmor/SUID context passes 16 visible updated actors, baseline poses, new actual claw attacks, previous ranged/spell/brazier, final rendered heat flicker, Ash boss scale, Marshal props/no duplicate weapon, all 58 adapters/17 conditions, isolated disk save/close, seccomp/no no-sandbox. Screenshots inspected for actual visibility. Logs `/tmp/fld-wave04-{tests,package,native}.log`; captures `test-results/creature-wave-04-{before,after}/`. Checkout launcher refreshed, labeled 0.8.7; installed/public release unchanged. Windows not exercised this wave.

Next lowest: Hobgoblin Shieldguard, Crypt Ghoul, Ghast (26 each), verify current overrides before assignment. Keep the three-worker limit, explicit canonical donor path/hash, editable inputs, actual animation/pixel/cost review and quiet QA. No pending wave-04 job. Raw jobs/rejected renders local only `~/.local/share/four-lanterns-workers/2026-11-10-wave-04/`. Credentials/tool installs/private hero exports don't travel with Git. Task-owned Vite 5187 stopped during delivery cleanup. Use Git/PR history for actual resulting checkpoint; this file does not predict commit/PR IDs.
