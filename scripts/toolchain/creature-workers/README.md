# Accepted wave-01 builders

These are the DeepSeek workers' authored Blender scripts, with the organizer adapting paths for this checkout. They read the unchanged CC0 KayKit Ninja donor from `public/assets/characters/series4/Ninja.glb` and write review output under ignored `test-results/asset-workers/<creature>/`. They never overwrite the accepted runtime models or editable sources automatically.

From the repository root, in separate background processes:

```sh
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/stone-knuckle.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/kobold-tunnel-scout.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/plague-zombie.py
```

All three were rerun from these portable paths. Their GLB structure/counts match the accepted submissions. Blender is 5.2.4 LTS; material/normal/export behavior can change between versions. Each script exits immediately only after successful writes/renders, avoiding a demonstrated sandboxed Blender audio/shutdown hang. Use a fresh background process, never an unrelated interactive scene.

Accepted GLBs: `public/assets/creatures/wave-01/`. Editable sources: `art/source/creatures/`. Provenance and counts: `docs/creature-wave-01-provenance.json`. Original rig rest transforms stay intact; the kobold adds four weighted tail joints. New geometry/materials are project assets without a new public license assignment. See `docs/asset-worker-process.md` for assignment/review/revision rather than directly publishing worker output.
