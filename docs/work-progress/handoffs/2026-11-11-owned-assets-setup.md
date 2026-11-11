# 2026-11-11 — Owned asset setup and modular fit experiment

- Machine: bmoser Ubuntu desktop, repository `/home/bmoser/Documents/ChatGPT/HoL Procedural Game`.
- Task: establish purchased source inventory and a no-additional-cost modular pilot.
- Branch: `codex/modular-owned-assets-pilot`.
- Base: `b6409be1d364c388b523d4acda8add6dbcacd9ae`.
- Status: WIP; no merge/release or production model acceptance.

## Completed

Installed official Unity CLI 1.0.0-beta.17, Editor 6000.3.28f1 and Hub 3.22.6 Debian package. Official Hub per-app AppArmor profile retains sandboxing. User signed in; active license verified. Successfully created and launched muted local `AssetReview` project. First pre-license partial attempt is preserved separately. Dispatched official Hub download deep link for Dungeon Mason product 231024; user was asked to Download through Package Manager. Download/import not yet verified.

User downloaded KayKit v8 to Downloads. Validated archive paths and extracted to private workshop. Inventory: 24 packs, 132 `.blend` sources, CC0 root license; hash matches previous purchase archive. Existing Dungeon Mason runtime subset inspected; full source still pending. See [report](../../owned-assets-pilot.md).

Added two isolated pilot scripts: cut a copied generated goblin head and attach it to existing Mason head bone, retain real body/gear/clips. Rendered four variants over five phases, 120 silent Three.js frames, no page errors. Corrected HTML charset and clarified the two-handed equipment label, then rerendered.

## Decisions and review

Use existing purchases before more tools or paid services. Unity is an import utility. Do not restart roster batch. Visual acceptance of modular experiment failed: red/rough neck cut, noisy face paint, oversized head/weapon clearance, and generic two-handed attack. No claim of high-end quality, correct spear selection, native performance or completed rig export. No new DeepSeek jobs.

## Verification

- `unity editors -i --json` and editor `-version`: 6000.3.28f1 installed.
- `dpkg-query`: official Unity Hub 3.22.6 installed; user service active with sandbox retained.
- `unity license status --json`: signedIn=true, active=true (credentials not exposed).
- `unity projects create ... --bare --no-cloud`: success after login; `unity open ... --args '-muteAudio'`: launched.
- Blender head copy: clean exit, 43,493 triangles; source untouched.
- `node --check` and Python AST parse: pass.
- Private Three.js fixture: 120 frames, zero page errors; idle/attack/hit screenshots visually inspected and rejected for production.
- No gameplay source changed by this checkpoint, no native dungeon benchmark or Windows check performed, no full suite warranted for isolated pilot/docs. Existing dirty gameplay edits were not validated or committed here.

## Next steps

1. Confirm Dungeon Mason download in AssetReview; inspect the package/local cache and import into this private project.
2. Inventory actual source models/clothing/head options and animations; compare with current exported subset and KayKit editable sources.
3. Choose one authored donor and create a coherent goblin equipped variant. Fix paint, neck, grip and role-specific animation before dungeon qualification.
4. Only after one representative model passes should the broader modular workflow be considered for batch production.

## Local-only state

Private workshop `/home/bmoser/Projects/DDD-Asset-Workshop`; source KayKit under `PurchasedSource/KayKit-v8/The Complete KayKit Collection v8`. Unity editor at `/home/bmoser/Unity/Hub/Editor/6000.3.28f1/Editor/Unity`. User sign-in stays local.

Experiment root `/home/bmoser/.local/share/four-lanterns-modular-pilot/2026-11-11`: GLB, `.blend`, reports, frames, screenshots. Generated head input path is in the machine record. Existing purchased runtime files under ignored `public/assets/licensed/dungeon-mason` remain necessary to reproduce. Neither sources nor generated meshes are committed.

Earlier dirty tracked gameplay changes, `current.md` history and untracked equipped/modular creature docs/scripts remain untouched outside this checkpoint. They are not transported by this WIP commit. Current progress was staged selectively to include only the new active-work section.

## Sync

Checkpoint is intended for `origin/codex/modular-owned-assets-pilot`; verify the branch hash against local HEAD after push. No PR merge until a reviewed pilot meets its acceptance criteria. Git transfers these scripts/docs, not editor installations, purchases or private renders.
