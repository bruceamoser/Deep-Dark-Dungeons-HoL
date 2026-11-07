# Art direction: stylized, leaning realistic

The brief asks for a cohesive stylized look and rejects a greybox or a pile of unrelated
free assets. The current build does not clear that bar, and the reason is measurable.

## Why the current heroes read as meeples

Head height measured against total model height, straight from the shipped GLB accessor
bounds:

| Model | Head : body | Reading |
| --- | --- | --- |
| KayKit Knight | 1 : 3.1 | chibi / meeple |
| KayKit Rogue | 1 : 3.2 | chibi / meeple |
| KayKit Skeleton | 1 : 2.5 | chibi |
| Real human | 1 : 7.5 | — |
| Stylized with realistic weight | 1 : 6 to 1 : 7 | target |

Clothing and texture work cannot fix a head that is a third of the body, so the wardrobe
and material work below is necessary but not sufficient on its own.

Two further limits compound it. Every dungeon prop shares one 1024 x 1024 palette atlas
across 203 models, and the project sets no `normalMap`, `roughnessMap`, `metalnessMap` or
`aoMap` anywhere, so every surface answers light identically. The KayKit meshes are also
palette-atlas modelled: TextureCraft measures 472% UV overlap on the dungeon barrel and
373% on the Knight, with 73 and 917 zero-area triangles, so they cannot be repainted
without re-unwrapping.

## Library assessment

Assessed against two constraints from the brief: free assets only, and recorded licences.

| Source | Licence | Verdict |
| --- | --- | --- |
| Quaternius | CC0 1.0, free tier | **Use** |
| KayKit (already in tree) | CC0 1.0 | Keep for dungeon props |
| FreeStylized | Per-asset, not blanket CC0 | Avoid unless each asset is vetted |
| CGTrader, Free3D, TurboSquid, Blendswap | Mixed, often non-commercial | Avoid; provenance and rights risk |

### Quaternius packs

- **Universal Base Characters** — free tier ships two full bodies (Superhero male and
  female). 14,318 and 15,060 triangles, 1.82 m and 1.78 m tall, 65-joint humanoid rig with
  Unreal-style joint names, and genuine PBR maps: BaseColor, Normal and Roughness per body,
  plus eye and hair sets. Verified by render.
- **Modular Character Outfits - Fantasy** — 12 outfits built from 62 separate parts, three
  texture variations each, designed to fit the base characters. This is the pack that
  matches the culture / background / class split directly.
- **Bestiary - Dungeon Monsters** — seven rigged monsters with weapons in three colour
  variations each.
- **Universal Animation Library** — the base characters ship with no animation, so this
  pack is required to get idle, locomotion, attack, hit and defeat clips.

The free tier omits the Regular and Teen proportions, which are Source-only. All ten
ancestries therefore share one build and must be separated by scale, width and feature
work rather than by body mesh. No paid purchase is authorised, so this is a hard limit,
not a preference.

Downloads are served through itch.io. Both packs above are CC0 and free.

## The in-game test overrides the studio render

A studio render of the Quaternius base body looks clearly better than the current
heroes. Dropped into the running dungeon at true isometric gameplay distance, it does
not. Measured in the live scene (`window.__ddd.scene`, same camera, fog and lighting):

- The realistic body reads as a thin, spindly silhouette against the chunky heroes.
- Its anatomy detail is invisible at the on-screen size a hero occupies, roughly two
  tiles tall, so the extra 7,000 triangles buy nothing at play distance.
- The current chibi heroes hold a stronger silhouette and their weapons and shields stay
  legible.

So the proportion number alone is the wrong target. Two things matter more at isometric
distance: silhouette mass and per-part readability. Pure realism fails both while the
chibi build overshoots the other way.

### Measured head-to-body options, rendered in the live scene

| Option | Head : body | Cost | Effect in game |
| --- | --- | --- | --- |
| Current | 1 : 3.1 | none | Clear read, but meeple |
| Head bone x0.8 | 1 : 3.9 | one line, no asset change | Noticeably more adult, silhouette intact |
| Head bone x0.65 | 1 : 4.8 | one line, no asset change | Adult heroic build, still readable |
| Quaternius base | 1 : 7.4 | full rig swap, new animations | Reads thin and loses detail |

The middle band is worth taking seriously precisely because it costs almost nothing: the
generated clothing in `src/view/outfit.mjs` is authored against joint positions, so it
follows a rescaled head without changes, and all 76 existing animation clips keep working.

## Direction

1. **Base bodies** — replace the KayKit heroes with the Quaternius base characters. This
   is the only step that moves 1 : 3.1 to roughly 1 : 7.4.
2. **Culture decides clothing** — map each of the eighteen cultures onto an outfit from the
   twelve modular outfits, with palette variants where two cultures share a silhouette.
3. **Background decides accessories** — belts, boots, bandoliers, hats and carried kit drawn
   from the sixty-two modular parts.
4. **Class decides silhouette** — hood raised for Shadow, plate and gauntlets for Protector,
   tabard and mantle for Leader, and so on over the culture layer.
5. **Equipped gear shows on the body** — found weapons, armour and worn items swap in
   modular parts rather than being drawn as placeholder boxes.
6. **Creatures** — Bestiary meshes, plus the theme and rank variation layer already built,
   which gives every one of the fifty-eight roster rows distinct colour, features and rank.
7. **Textures** — TextureCraft for normal, roughness and ambient-occlusion bakes, raising
   the flat palettes to material response.

Steps 2 to 6 already exist in this branch against the current rig. Step 1 changes the rig,
so the outfit and face geometry has to be re-fitted to the new joint names.

## Risks

- Replacing the rig invalidates the 76 KayKit animation clips and the bone-mapped armour
  swapping in `src/view/appearance.mjs`. Both need rework, and the animation library is
  required before characters can move.
- The free tier's single body build weakens ancestry silhouettes; dwarves, gnomes and
  halflings must be distinguished by scale, proportion and feature work.
- Nineteen megabytes of source textures per character if the full PBR sets ship unbaked.
  They need compressing or baking down before release.

## Provenance

Recorded here so `docs/assets.md` stays the single place for shipped asset rights.

| Asset | Source | Licence | Status |
| --- | --- | --- | --- |
| Universal Base Characters (Standard) | https://quaternius.com/packs/universalbasecharacters.html | CC0 1.0 | Downloaded, not yet in tree |
| Modular Character Outfits - Fantasy | https://quaternius.com/packs/modularcharacteroutfitsfantasy.html | CC0 1.0 | Not yet downloaded |
| Bestiary - Dungeon Monsters | https://quaternius.com/packs/bestiarydungeonmonsterskit.html | CC0 1.0 | Not yet downloaded |
| Universal Animation Library | https://quaternius.com/packs/universalanimationlibrary.html | CC0 1.0 | Not yet downloaded |
