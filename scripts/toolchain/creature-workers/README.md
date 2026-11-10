# Accepted creature builders

These are the DeepSeek workers' authored Blender scripts, with the organizer adapting paths for this checkout. They read the unchanged CC0 KayKit Ninja donor from `public/assets/characters/series4/Ninja.glb` and write review output under ignored `test-results/asset-workers/<creature>/`. They never overwrite the accepted runtime models or editable sources automatically.

From the repository root, in separate background processes:

```sh
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/stone-knuckle.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/kobold-tunnel-scout.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/plague-zombie.py
```

All three were rerun from these portable paths. Their GLB structure/counts match the accepted submissions. Blender is 5.2.4 LTS; material/normal/export behavior can change between versions. Each script exits immediately only after successful writes/renders, avoiding a demonstrated sandboxed Blender audio/shutdown hang. Use a fresh background process, never an unrelated interactive scene.

Accepted GLBs: `public/assets/creatures/wave-01/`. Editable sources: `art/source/creatures/`. Provenance and counts: `docs/creature-wave-01-provenance.json`. Original rig rest transforms stay intact; the kobold adds four weighted tail joints. New geometry/materials are project assets without a new public license assignment. See `docs/asset-worker-process.md` for assignment/review/revision rather than directly publishing worker output.

## Wave 02

Accepted Cave Bat, Animated Statue and Kobold Emberkeeper builders use the same isolated output convention:

```sh
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/cave-bat.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/animated-statue.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/kobold-emberkeeper.py
```

Bat reads the original Quaternius `public/assets/creatures/bat.glb`; statue uses the Ninja rig; emberkeeper builds from the accepted `public/assets/creatures/wave-01/KoboldScout.glb`. Bat and emberkeeper rebuild byte-identically. Statue rebuild has identical JSON, vertex attributes/bind data and oriented triangle sets, with Blender reordering some index triplets; do not claim its GLB is byte-identical. See `docs/creature-wave-02-provenance.json` and `docs/creature-model-wave-02.md` for review/revisions and actual renderer costs.

## Wave 03

```sh
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/cinder-strider.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/kobold-trapkeeper.py
timeout --kill-after=3s 45s blender --background --factory-startup --threads 4 --python scripts/toolchain/creature-workers/emberling.py
```

All three rebuild byte-identically with Blender 5.2.4 LTS. Strider and Emberling directly import the supplied Ninja; Strider's deliberate outer presentation scale preserves a tall silhouette without a guessed skeleton. Trapkeeper uses the accepted Scout. See `docs/creature-model-wave-03.md` and `docs/creature-wave-03-provenance.json` for the returned rig/palette/crown/prop-cost revisions, measured binding differences and actual renderer costs. Raw worker logs/rejected drafts are not part of these accepted builders.
