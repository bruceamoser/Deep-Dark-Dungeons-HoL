# Production brief

## Experience

Four heroes venture into a dangerous, procedurally assembled underworld. Exploration is continuous and responsive; an encounter shifts into legible tactical turns. Dungeon layout, encounters, discoveries and resource pressure support repeated expeditions.

## Presentation acceptance

The target is a cohesive, polished desktop game. A greybox or collection of unrelated free assets does not satisfy that target.

- Orthographic 3D camera with deliberate framing, zoom, wall occlusion and readable silhouettes.
- A coherent stylized dark-fantasy palette, authored lighting, atmospheric depth and strong points of interest.
- Rigged characters with locomotion, attack, hit and defeat animations; equipment must attach correctly and outfits must avoid obvious clipping.
- Responsive selection, path previews, formation travel, interaction feedback and camera control.
- Clear turn transitions, action costs, targeting, outcomes, conditions and combat history.
- Consistent typography and restrained interface styling; keyboard access, scalable UI and configurable audio.
- Spatial ambience, footsteps and distinct action feedback.
- Reliable saves and deterministic dungeon generation, with reproducible bug reports.

## Delivery gates

1. Pin HoL source and assess reuse of existing character creation and rules modules.
2. Evaluate desktop engine, modular characters, animations and environment assets. Record licenses and source URLs.
3. Build one polished dungeon floor with a complete exploration/combat/return loop.
4. Integrate the complete character-creation workflow and explicit automation coverage for every ability and trait.
5. Expand procedural generation, encounter variety, items, progression and persistence.
6. Validate actual desktop play, performance and visual quality before release.

The first floor is a quality benchmark, not a declaration that the whole game is finished. Do not silently narrow the final requirement to a handful of classes or attacks.

## Confirmed platform and expedition direction

Linux and Windows desktop; single-player control of four heroes. Bruce has dual RTX 3090 GPUs; the renderer targets a single GPU and does not depend on multi-GPU features. A persistent town supports repeated descents. Defeat should support recovery with roguelike replacement parties; exact rescue/loss terms remain proposals.

Electron and Three.js were selected after confirming that the existing complete HoL Character Workshop and pure rules modules can run locally without Foundry. This avoids a second independent character-creation implementation. Native Godot was evaluated as a candidate but is not the selected runtime.

Free assets initially. No paid asset purchase is authorized. The first visual pass is not final quality acceptance.
