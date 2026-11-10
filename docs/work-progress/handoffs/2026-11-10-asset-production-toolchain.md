# November 10 — Asset-production preparation

- Machine: `/home/bmoser/Documents/ChatGPT/HoL Procedural Game`.
- Branch: `codex/asset-production-toolchain`; base `2c3dbeb1997ffb4b7d7062780827cd79cf645962`.
- Request: install Blender/useful tools, add DeepSeek as a worker and review the supplied cloud-generation/Blender blueprint. Bruce subsequently clarified Meshy may not be needed and has no Meshy account. He saved his existing DeepSeek key locally using the new hidden-input helper.

## Complete

Verified official Blender archive SHA-256, installed 5.2.4 LTS per-user with a PATH symlink/menu entry. Enabled bundled Rigify and installed MCP for Blender 2.2.7 in isolated uv environment with matching addon. Registered Blender MCP in local Codex config on loopback 9876. Isolated workspace disables cloud providers and telemetry. No Unity/TextureCraft/Meshy installation required for this path; Meshy is explicitly deferred. Existing SolidCraft remains available.

Migrated obsolete DeepSeek profile table to the current dedicated profile file. Scoped official DeepSeek metadata keeps GPT default/catalog intact. Command-backed provider auth uses an owner-only local key file entered by the user; no key in repository/TOML/logs or model prompts. Removed the ignored legacy preferred_auth_method option after runtime diagnostics. Config backup remains local. `codex --profile deepseek` is verified; this running chat’s built-in subagent list/mixed-provider desktop UI was not changed/tested. New MCP registration may require a fresh app session.

Added a validated repo skill, reviewed workflow, readonly Blender inspector, structural roundtrip script, configure/start/probe helpers and credential helper source. No base/runtime models, source book, Foundry, licensed source assets, live saves or game build changed. No release.

## Verification

- Blender --version/checksum and background addon/Rigify setup pass.
- MCP initialize/list and get_scene_info pass against the open isolated Blender scene (9 tools; 3 objects).
- Actual DeepSeek Responses request completed; a separate Codex-profile smoke replied READY.
- Final DeepSeek worker called only Blender get_scene_info successfully and reported Scene / 3 objects. Initial call was blocked by default tool approval. The corrected probe allowed/preapproved only that read-only tool; no scene-write permissions were enabled. Preserve per-tool scope. An ignored legacy config warning was removed; remaining unrelated existing skill-icon/fallback-metadata warnings were not treated as asset failures.
- Wolf inspection: 2,820 triangles, 9 bones, 8 clips; skinned mesh has no unweighted vertices. Export/import preserves bone/action/skinned-mesh/texture counts. This is structural, not full visual/deformation acceptance.
- Credential helper fixture checks: missing/insecure files rejected; owner-only retrieval works; noninteractive secret entry rejected. No real key values printed.
- Skill frontmatter validation and Python compilation pass. No gameplay tests are needed for these new local-only scripts/docs; previous 357-test source baseline was already green. CI still runs the repository rules/build gate for this PR.

Logs: `/tmp/fld-blender-setup-final.log`, `/tmp/fld-blender-mcp-probe.log`, `/tmp/fld-deepseek-worker-smoke.jsonl`, `/tmp/fld-deepseek-blender-smoke-final.jsonl`, `/tmp/fld-asset-inspection.log`, `/tmp/fld-asset-roundtrip.log`. Generated GLB/reports live under ignored `test-results/asset-toolchain/`.

## Blueprint corrections / next

The supplied Markdown was mislabeled YAML and had broken code fences. The sound hybrid concept is retained, but mandatory weld/purge/decimate/apply-transforms rules are not adopted. Inspect first, preserve original/rest/bind data, use anatomical landmarks, measure exported triangles/material/texture/skin cost, and inspect real motion/Three.js output. Model roles are a task-routing policy, not proof of spatial quality or sub-minute rigging.

Next authorized direction is preparation for Goblin Spearhand, Clay Helper, Wererat and Air Elemental pilots. No pilot has been remodeled. Read the complete 58-entry visual-fit survey before proceeding. Keep generated/licensed intermediate files private according to actual license and preserve originals. Do not reroute GPT defaults or patch the desktop app to simulate native DeepSeek subagents.

## Transfer / local state

Tool installs, user preferences, MCP config, provider profile/catalog, credential helper installation and key are local-only. Source/scripts/skill/docs travel through Git. Another machine needs deliberate installs and its own key entry, never a key copied into Git. An isolated Blender instance was opened for tests; it contains a default cube/camera/light only and is separate from personal work. Checkout launcher is still 0.8.5, installed game 0.8.4, source 0.8.7; no rebuild was part of preparation.
