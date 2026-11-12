# Reusable adapted asset library

Search this library alongside the owned-source inventory during every creature brief. When a source item is modified into a useful new variant, add it here before completing that creature. Record the source/license, recipe/spec, private editable file, attachment/fit, palette and review status. Reuse does not imply that fit or animation clearance transfers to another body: inspect and refit the copy. Keep original sources untouched and purchased derivatives out of Git.

| Variant | Source / reproducible modification | Private editable source | Fit, appearance and reuse limits | Review |
| --- | --- | --- | --- | --- |
| Scrapper fitted leather cap | Dungeon Mason Hat04; `scripts/toolchain/build-goblin-scrapper.py` scales (1.04, 1, .86), lowers .04 around head socket | `~/.local/share/four-lanterns-creature-production/goblin-scrapper/goblin-scrapper.blend`; supplied cap is part of `Scrapper head gear` | Approved goblin head; ochre leather, full crown/side/back coverage, ears clear. Extract/copy the cap recipe for a different wearer; do not copy the entire creature. | User approved appearance; five animation states reviewed |
| Soldier hornless enclosed helmet | Dungeon Mason Hat02; `config/creature-production/shield-soldier.json` and `build-owned-humanoid.py` remove the two inspected isolated horns (194 vertices), retain shell/rim/crest/face guards | `~/.local/share/four-lanterns-creature-production/shield-soldier/shield-soldier.blend`; Hat02 | Original humanoid head socket; steel/green palette. Suitable armored roles after head/ear clearance checks. Guarded topology edit requires expected source components. | User approved appearance; five animation states reviewed |
| Soldier fitted kite shield | Dungeon Mason Shield08; same spec, constant bind rotation fitted in Idle frame 6 | Same Soldier scene; Shield08 | Left weapon socket, upright forward-facing green shield/crossed bands. Orientation depends on the selected animation family. | Author-reviewed full motion/game view |

| Goblin workshop goggles | Dungeon Mason AC03_NerdGlass; `config/creature-production/goblin-firestarter.json`, `partFit` and `paintRegions` retain the round frame and separate dark lenses from brass | `~/.local/share/four-lanterns-creature-production/goblin-firestarter/goblin-firestarter.blend`; AC03_NerdGlass | Approved goblin head socket, lowered/scaled round frame, clear nose/ears. Other heads require refit; lens paint regions use inspected world coordinates. | Author-reviewed front/side/back, all five states and dungeon |
| Held fuel flask and belt reserves | KayKit Dungeon bottle_A_brown; same Firestarter spec, `externalParts` and `fitUpright`; supplied UV/material retained | Same Firestarter scene; Firestarter held flask, Firestarter reserve left/right | Held copy: neck grip on weapon_r, constant upright bind fit to NoWeapon Idle; two smaller pelvis-bound reserves. Runtime throw releases the actual prop, returns it on recovery. Refit for other animation families. | Author-reviewed grip, throw flight/recovery, other states and dungeon |
| Workshop supply pack palette | Dungeon Mason BackPack02; Firestarter `partPalette` | Same Firestarter scene; BackPack02 | BackpackBone, coordinated leather/brass work kit. Head and arm clearance need recheck on other bodies. | Author-reviewed full motion and game view |

Dungeon Mason entries are private Unity Asset Store derivatives from RPG Tiny Hero Wave Polyart. The table/recipes are portable; the licensed meshes are not supplied by this repository. The owned inventory remains the authority for unmodified parts. New candidates must be labeled candidate until their visual and motion review is complete.

## Roster pass additions

| Variant | Source and recipe | Private editable file/object | Fit and review status |
| --- | --- | --- | --- |
| Ash ritual hood/robe | Dungeon Mason Hat05/Body11; Grave Cultist palette in `config/creature-production/grave-cultist.json` | `~/.local/share/four-lanterns-creature-production/grave-cultist/grave-cultist.blend`; Hat05, Body11 | Original human rig/head; ash/charcoal, full hood coverage. Author turnarounds/motion reviewed; recheck hair/ears on other heads. |
| Bone skull on wood focus | Dungeon Mason Wand07; same spec paintBands separates source shaft from skull, fitUpright at Idle frame6 | Same scene; Wand07 | weapon_r, MagicWand idle/cast and separate SingleSword swing checked. Refitting required for a different stance. |
| Belt ritual tome | KayKit Mixed Bag 2 necronomicon_A; same spec externalParts | Same scene; Cultist ritual book | Pelvis-bound .38-scale leather tome at outer left hip; source face-cover detail retained. Author motion review; avoid arm/sleeve clipping on other bodies. |

| Plain traveling cloak and field coat | Dungeon Mason Cloak01/Body12; `config/creature-production/hedge-sorcerer.json` retains supplied cloak bones, green/cream palette, paints out royal crown motif | `~/.local/share/four-lanterns-creature-production/hedge-sorcerer/hedge-sorcerer.blend`; Cloak01, Body12 | Human rig; author front/side/back/six-state and runtime review. Recheck long hair/pack overlap; no cloth simulation. |
| Wooden traveler focus | Dungeon Mason Wand02; same spec solid wood palette and upright grip fit | Same scene; Wand02 | MagicWand idle/cast, SingleSword melee swing. Retains original shaped tip. |
| Belt field kit | KayKit RPG Tools journal_closed and Dungeon bottle_A_brown; same spec externalParts | Same scene; Hedge field journal, Hedge amber flask | Pelvis attachments with two different scale/offsets; visible at game scale, author motion reviewed. |

| Orc facial assembly with lateral ears | Dungeon Mason Head01_Male, AC04_ShortEars, Mouth06, Eye01/Eyebrow02; `config/creature-production/orc-outrider.json` | `~/.local/share/four-lanterns-creature-production/orc-outrider/orc-outrider.blend`; named head/ear/face objects | Guarded removal of two detached round ears (146 vertices); supplied pointed ear halves repositioned out/down around inspected pivots. Olive palette, toothy mouth, original head bone. Author model/motion reviewed; source topology assertion and all fit parameters in spec. |
| Orc scout travel set | Body17/Cloak02/BackPack01, Hair07 and OHS08_Sword; same Outrider spec | Same Outrider scene; original part names | Olive/leather/steel, packed bedroll, short cloak, dark topknot. Five-state source review; refit straps/pack/hair for different roles. |

| Shieldbreaker trophy belt | Dungeon Mason Shield02/04/11; `config/creature-production/orc-shieldbreaker.json` partFit scales .23/.23/.20 and pelvis offsets | `~/.local/share/four-lanterns-creature-production/orc-shieldbreaker/orc-shieldbreaker.blend`; three named shield objects | Reuses detailed supplied round/damaged shield forms as small trophies; no held shield or gameplay bonus. Author five-state/runtime review; refit waist/legs on new wearer. |
| Heavy hooked axe and veteran plate | Dungeon Mason OHS13_Axe/Body15/Hair02; same Shieldbreaker spec, axe .9-scale, iron/leather/olive/brass palette | Same Shieldbreaker scene; original part names | Source SingleSword rig/attack retained; full swing and fall inspected. Complete breastplate differs from bare-chested illustration. Private Unity Asset Store derivatives. |

| Memorial tower shield | Dungeon Mason Shield07; `config/creature-production/hobgoblin-shieldguard.json` scale1.25, crimson/brass tint, eight surface-projected baked names | `~/.local/share/four-lanterns-creature-production/hobgoblin-shieldguard/hobgoblin-shieldguard.blend`; Shield07 | Letters joined to original weapon_l-bound shield before constant Idle-frame6 fit. First flat labels clipped; per-vertex projection corrected them. Author front/side/back/five-state review. Private Unity Asset Store derivative; new letter geometry uses Blender's built-in font. |
| Ranked guard spear | Dungeon Mason Spear03, same spec scale .68 and thrust fit frame9 | Same Shieldguard scene; Spear03 | Forward thrust uses source SwordAndShield Attack03, contact8/30s. Retains supplied head/shaft detail; refit with other clip families. |
| Guard belt keys | KayKit Dungeon keyring_hanging, same spec externalParts | Same Shieldguard scene; Shieldguard gate keys | .15-scale pelvis-bound patrol/gate prop; preserved source colors, author motion clearance checked. |

| Pointed-ear officer helm | Dungeon Mason Hat02, Soldier hornless recipe plus `config/creature-production/hobgoblin-marshal.json` fit and paired lower-skirt notches | `~/.local/share/four-lanterns-creature-production/hobgoblin-marshal/hobgoblin-marshal.blend`; Hat02 | Human-size hobgoblin head; .88Z/.10-up fit, explicit world-space notch bounds below rim, crown topology retained. Lower panels deliberately faceted; author five-state review. Refit new head/ear dimensions. Private Unity Asset Store derivative. |
| Officer field-map board | KayKit Restaurant cuttingboard + RPG Tools map; same Marshal externalParts, X/Z rotation and shared left-socket fit | Same Marshal scene; Marshal map backing, Marshal field map | .42 wood backing/.30 curled textured map; book-sized held prop, no shield stats. Two separable meshes move together through original source clips. Author motion review. |
| Green officer armor/cloak | Dungeon Mason Body18/Cloak02 and OHS08 curved saber, Marshal palette | Same Marshal scene; named owned objects | Bright steel, green/bronze cloak, dark leather. SwordAndShield stance/slash; distinguish from crimson tower-shield guard. |

| Fitted ivory masquerade mask | Dungeon Mason Head01_Male face copy; `config/creature-production/masked-duelist.json` faceShells region, offset, thickness and two eye cuts | `~/.local/share/four-lanterns-creature-production/masked-duelist/masked-duelist.blend`; Duelist ivory mask | Separate thin source-contour shell, ivory/gold, head-bound with actual eye apertures; original head/eyes retained. Author five-state review; refit face/eye dimensions on new wearer. Private Unity Asset Store derivative. |
| Narrow dueling blade | Dungeon Mason OHS06_Sword; same spec partFit and bladeFits preserve hilt, narrow blade above .2 from grip, fitted source thrust | Same Duelist scene; OHS06_Sword | Source SwordAndShield Attack03; point-first contact frame9. Slender ordinary blade, not a basket-hilt rapier. |
| Feather-hat dueling outfit | Dungeon Mason Hat01/Body12/Cloak03; same Duelist palette/spec | Same Duelist scene; named source objects | Crimson feathered brimmed hat, dark coat/cloak, ivory/gold trim. Author model/motion review, no heavy armor or added pack. |

| Goblin borrowed officer coat | Dungeon Mason Body12/OHS08_Sword plus approved Spearhand goblin head; `config/creature-production/goblin-boss.json` | `~/.local/share/four-lanterns-creature-production/goblin-boss/goblin-boss.blend`; original named objects | Green/brass coat, matching green hands, original SingleSword rig/slash. Author five-state review. Private Dungeon Mason derivative; approved head fixture remains separate/private. |
| Pocket provisions and map | KayKit Medieval Hexagon sack, Restaurant cheese, RPG Tools map_rolled and Dungeon coin; same Boss externalParts | Same Boss scene; Boss snack pouch/pocket cheese/pocket map/bribe coin | Miniature sack enlarged/rotated to pouch; small cheese at top, opposite rolled map and chest coin. Fixed pelvis/spine attachments, motion/arm clearance checked. Preserve original source textures; refit scale/socket on other bodies. |

| Warcaller hide drum and beater | KayKit Dungeon barrel_small and RPG Tools mallet; `config/creature-production/orc-warcaller.json`, sourceCap/sourcePaintBands/externalParts | `~/.local/share/four-lanterns-creature-production/orc-warcaller/orc-warcaller.blend`; Warcaller hide drum, Warcaller drum mallet | Barrel shortened along original Z, rotated to torso, wood/hoops retained; small authored hide membrane covers bung/planks. Original UVs retained. Torso drum/left hand upright beater; six states reviewed. Ready stance, no bespoke drumming. Refitting required for other animation families. KayKit owned source, private derivatives retained locally. |
| Warcaller long hair and crimson wrap kit | Dungeon Mason Hair12/Body07/Cloak03 plus registered orc head/Wand07 assembly; same role spec | Same scene; named original parts | Olive head, long dark hair, red cape, brown/cream wraps, bone staff. Supplied cloth bones and exact source rig retained. Author turnarounds/motion reviewed; simplified clean face lacks book scars. |

| Tomb Sage fitted skull/hood | KayKit Halloween skull + Dungeon Mason Hat05; `config/creature-production/tomb-sage.json` | `~/.local/share/four-lanterns-creature-production/tomb-sage/tomb-sage.blend`; Sage skull, Hat05 | Separate skull rigidly bound to head; fitted below hood, charcoal bone/dark measured eye recesses, green/ivory/brass garment. No human face underneath. Front/side/back and six-state author review. Recheck head/hood scale on other wearers; no jaw articulation. |
| Inward-reading scholar tome | KayKit Adventurers spellbook_open; same role spec plus builder inscriptions/fitShield with right-hand socket and inward normal | Same scene; Sage open tome | Brown leather/aged pages, six baked text lines conformed to page geometry; lower-edge grip, pages face wearer. Original outward fit was corrected following Bruce's feedback. Six-state review includes tome strike/cast; refit to other stances. |
| Scholar belt volume | KayKit RPG Tools journal_closed; same role spec externalParts | Same scene; Sage belt volume | Small pelvis-bound volume, source leather/clasps retained. Author motion review; avoid sleeves/leg overlap on other bodies. |

| Animated hunting bow and nocked arrow | Dungeon Mason BowsSkinnedMesh/Bow01, ArrowsSkinnedMesh/Arrow01 and matching BowAndArrow source clips; `config/creature-production/bandit-bow.json`, builder weaponRigs | `~/.local/share/four-lanterns-creature-production/bandit-bow/bandit-bow.blend`; Hunting bow rig/Bow01, Nocked arrow rig/Arrow01 | Original8/1-bone deformation rigs retained, parented to left/right character weapon sockets, constant fit at full draw. Matching rest matrices asserted. Source arrow shrink/recovery retained; release13/30s in exported GLB. Recheck nock/hand distances for every stance. Private Unity Asset Store derivative; author turnarounds/299frame review. |
| Roadside hood/wrap/cloak palette | Dungeon Mason Hat05/AC08_NinjaMask01/Body05/Cloak03; same spec | Same scene; named supplied parts | Olive/ochre/brown; face strip fits below visible eyes, no topknot. Original body/cloth rig. |
| Archer quiver and spare string | KayKit Adventurers quiver, RPG Tools rope_bundle_B; same spec | Same scene; Bandit quiver, Bandit spare string | Tilt quiver25° outward with.28Xoffset to clear hood; smaller pelvis coil. Source UV/material details retained. Role fit/motion reviewed; recheck cloth/headwear clearance on reuse. |

### Hobgoblin Longbow — fitted military bow and weather case

- Owned Dungeon Mason Bow03/Arrow01 retain their separate source deformation rigs, source UVs and synchronized draw/release. Recipe `config/creature-production/hobgoblin-longbow.json`: bow cant60°/height.77, arrow length.75; source weapon sockets remain fixed. Green/bronze military palette, brown wooden accents. Forward source fall with bounded assembled contact correction replaces rejected backpack-first fall.
- KayKit Mixed Bag2 guitarcase becomes a tapered closed bowcase by a shared cross-section width profile applied to both lid/body. Preserve handle/hinges and original UVs; brown recolor, thin fitted profile, BackpackBone opposite orderly quiver. Reuse this recipe for long tool/weapon cases; do not reuse the raw guitar silhouette unchanged.
- Editable private scene `~/.local/share/four-lanterns-creature-production/hobgoblin-longbow/hobgoblin-longbow.blend`, separable Military longbow rig/Nocked arrow rig/Longbow weather case objects. Licensed owned source copies only, no redistribution in Git. Author turnarounds/307 motion frames/full-frame ground inspection/runtime shot reviewed; user bulk review pending. New fit still requires clearance check on each body.

Bandit Bow fit revision: same cant60°/height.77/arrowlength.75 recipe as Hobgoblin Longbow, source forward Die02, bounded fall contact. This supersedes its initial upright bow/backward fall. Private blend and role JSON retain the exact revised attachment.307-frame review/full-frame floor audit, GLB and runtime checks required for the revised hash; no user approval or FPS claim.

### Goblin Rattlechanter — musician kit and contact motion

- Owned KayKit Restaurant pan_A/.34 and pan_B/.22, RPG Tools mallet/.42, Holiday plain bells/.16. Grip the pan by its existing handle; retain bell clappers/rings, wood/steel/brass materials. Three torso bells and paired belt pans, rust/brown Dungeon Mason Body05, supplied Hair12 recolored rust and fitted to approved goblin head. Decorated holiday bell rejected.
- Recipe `config/creature-production/goblin-rattlechanter.json`; private editable `~/.local/share/four-lanterns-creature-production/goblin-rattlechanter/goblin-rattlechanter.blend`. Named separable Rattle hand pan, Rattle mallet, Rattle chest bell and Rattle belt pan parts, source UVs retained. Owned licenses/private exports unchanged.
- `prop_strike.py` derives a pan tap from inspected source landmarks and source arm geometry, preserving the skeleton/weights/fingers. Wrist reach and exact contact assertions; source idle endpoints. Reuse requires new landmark/grip/clearance review, not blind application. Forward fall/bounded contact replaces long-hair floor penetration.
- Author318-frame/turnaround/contact/reimport/finite/ground/runtime reviews pass; rigid bells/clean clothing are limits. Bulk user review/performance deferred. Sonic rings use the actual pan-strike clip and do not replace gameplay mechanics.

### Goblin Smoke Slinger — retained sling and clay reserves

- Authored missing two-cord sling, leather pouch and three prop bones on the original Dungeon Mason weapon_r socket; owned KayKit Space Base rock_A is the grey physical payload. Recipe `config/creature-production/goblin-smoke-slinger.json` and `scripts/toolchain/owned_sling.py`; private editable `~/.local/share/four-lanterns-creature-production/goblin-smoke-slinger/goblin-smoke-slinger.blend`. Separable Sling retention cord, Sling release cord, Sling leather pouch and Slinger_stone; preserved source body rig/weights, no generator or purchased originals modified.
- Original body carry/throw clip with authored compact underhand arc, retained hand anchor, loose-cord release/recovery and ground clearance. Runtime launches a frozen copy of the actual stone at14/30s. Reuse requires hand/arc/ground and projectile review, not blind attachment. No rope simulation or overhead windup claim.
- KayKit Adventurers smokebomb becomes three pelvis-carried clay reserves, RPG Tools rope_bundle_A spare cord. Body09 oxblood/brown neck wrap and tied black Hair07; source material regions retained, solid hair/payload deliberately recolored. Raised AC08 mask was rejected; no reusable fitted goblin face mask is claimed.
- Author turnarounds/343 motion frames, exact release, reimport, finite skinning and every-frame floor checks pass; game review recorded in creature report. Private owned-source derivatives remain outside Git.

### Skeleton Sentry — preserved skeleton kit and equipped collapse

- Owned KayKit Skeletons1.1 Skeleton_Minion keeps its23-bone rig, separated skull/jaw/ribs/limbs and skin weights. Faded green copied cloth material, pale source bone texture and restrained cold eye material; original sources untouched. General humanoid clips were rejected in favor of compatible Character Animations1.1 Skeletons_Idle/Walking/Death, plus original melee/hit.
- `config/creature-production/bone-sentry.json` and `scripts/toolchain/build-owned-kaykit.py` reproduce the private `~/.local/share/four-lanterns-creature-production/bone-sentry/bone-sentry.blend`. Separable Sentry rusted sword (Adventurers sword_1handed), Sentry worn shield (Skeleton_Shield_Small_A) and Sentry duty key (RPGTools key_A). Original source UVs retained; blade-root oxidation/cutting edge and source wood-region green recolor distinguish material surfaces.
- Exact source glTF socket transforms, matching rig rest matrices/hierarchy and constant inspected idle fits precede export. Collapse rotates each hand and its child socket together to lay equipment flat; bounded floor contact follows. Reuse requires its own grip/pose/ground checks. This is baked motion, not ragdoll physics or an assumed universal skeleton fit.
- Author turnarounds/756-frame/wide-collapse/reimport/finite/ground reviews pass; actual game evidence in creature report. Private owned-source derivatives stay outside Git. Simplified clean uniform and chibi anatomy remain explicit limits.

## Skeleton Archer bow, arrow and collapse quiver

- Owned source/license: KayKit Adventurers2.0 `bow_withString`, bare `bow`, `arrow_bow`, `quiver`, CC0 under the verified KayKit collection license; derivatives remain private under the project delivery workflow.
- Recipe: `config/creature-production/bone-archer.json`, `build-owned-kaykit.py`, `owned_bow.py`. Keep original UVs/topology. Compare bare/string bow vertex positions to isolate cord/knots; add modest Draw morph and hand-driven BowNock/ArrowNock. Preserve original character bones. Added quiver bone keeps normal chest fit and settles loose gear during skeleton collapse.
- Editable private objects: `~/.local/share/four-lanterns-creature-production/bone-archer/bone-archer.blend`, `Archer bow`, `Archer_arrow`, `Archer quiver`.
- Fit/palette: left socket bow, right-hand nock, brown wood/leather with contrasting pale string and feathered steel-tipped arrow; olive skeleton cloth. Review all fits again on a different donor. Same owned arrow supplies the runtime projectile at matching scale.
- Review: author model,768-frame motion, ground/reimport and actual bestiary/dungeon projectile gates pass; see Archer report/queue. User bulk review and performance deferred. Reload is a timed presentation restore, not a bespoke quiver-fetch motion.

## Skeleton Champion royal equipment

- Source/license: owned Dungeon Mason `AC06_Crown01`, `Shield14`, `OHS05_Sword` with original Albedo/MaskTint textures; Unity Asset Store private derivatives. KayKit Warrior body/cloth/armor CC0, original inputs untouched.
- Recipe: `config/creature-production/skeleton-champion.json`, `build-owned-kaykit.py`, `owned_mason_palette.py`. Crown centered/resized to skull with slight tilt; source-height band makes green gem caps. Shield's inspected separate132-vertex heraldic decoration recolored gold, green field/aged-gold edge. Steel/gold/leather sword uses original tint regions. No procedural replacement crown/shield.
- Private editable objects: `~/.local/share/four-lanterns-creature-production/skeleton-champion/skeleton-champion.blend`, `Champion crown`, `Champion heraldic shield`, `Champion oath sword`.
- Fit: crown on head, sword/right socket, shield/left socket; wrists align gear to ground during collapse and one added crown bone settles loose headwear. Crown has nonuniform fit; do not apply transforms indiscriminately. Refit to every new donor.
- Author front/side/back,756-frame motion, floor/reimport and bestiary/dungeon review passed. Bulk user review/performance deferred. Open crown and short cloth are deliberate simplifications relative to the book's crowned helm/cape.

## Barrow Guard burial kit

- Owned sources/license: Mason Hat05, Shield07, OHS09_Sword and original tint masks (private Unity Asset Store derivatives); KayKit Skeleton Warrior and Forest Nature Grass_1_A/D (CC0). Originals unchanged.
- Recipe `config/creature-production/barrow-guard.json`, `build-owned-kaykit.py`, `owned_mason_palette.py`. Fitted enclosing hood, muted bronze/olive shield/blade, two scaled earthy turf clumps attached in shield-source coordinates. Private atlas copy tints inspected armor UV region while preserving bone/cloth/leather and gradients.
- Editable private scene `~/.local/share/four-lanterns-creature-production/barrow-guard/final/barrow-guard.blend`; objects `Barrow hood`, `Barrow oath blade`, `Barrow turf shield`, `Barrow hanging turf`, `Barrow rim grass`. Head/right/left original sockets; hood1.75 fit is specific to this skeleton skull, not universal. Hood's loose-head floor correction applies only to skeleton collapse.
- Author turnarounds,756-frame motion, ground/reimport/finite and actual bestiary/dungeon review pass. User review/performance deferred. Refit each new wearer; keep turf grounded in role rather than arbitrary decoration.

## Wight noble burial equipment

Owned Mason Body15/Cloak03/Hair09/Crown01/OHS05 and KayKit Halloween skull (Mason private Asset Store derivatives; KayKit CC0). `config/creature-production/wight.json` with `build-owned-humanoid.py` preserves original43-bone rig and supplied cloth weights. Forest-green mantle/armor, old gold, pale hair and death mask. Crown1.7XY/1.2Z fit, raised/back-shifted hair, sword fixed upright at inspected grip; skull's eye regions separately painted. Editable private `~/.local/share/four-lanterns-creature-production/wight/wight.blend`, separable named supplied parts and `Wight death mask`. Forward fall replaces rejected hair-through-floor backward fall.256-frame, ground/reimport/finite and actual-game author reviews pass; refit on every donor. Simplified skull face/short mantle are explicit limits; no independent/user approval claim.

## Death Knight crowned shell and oath kit

Owned Mason Hat10 enclosed crown helmet, Body18/Cloak03, Shield14, OHS09 and KayKit Halloween skull. Private Asset Store derivatives plus CC0 skull; originals unchanged. `config/creature-production/death-knight.json` and humanoid builder reproduce private `~/.local/share/four-lanterns-creature-production/death-knight/death-knight.blend`. Supplied helmet/head socket, skull fitted inside with cold painted eye regions; charcoal shell/bronze crown, ivory shield panels and preserved heraldic geometry, pale cold blade, dark cape. Right/left weapon sockets retain grips. Backward fall fits this gear; forward fall rejected.242-frame/ground/reimport/finite and actual-game author review pass. Refit every donor; no user approval or performance claim.

## Plague Zombie fitted burial linen

The current surface uses TextureCraft Linen with an oversized weave, soil stains and matte roughness. The named strips remain separable in `plague-zombie/texturecraft/leather-bold/bold-paint/plague-zombie.blend` under the private production root. The sibling TextureCraft projects and recipes preserve the adjustable grain and palette. See the [Plague Zombie report](plague-zombie.md) for the reviewed export.

Owned Mason Body01/Head01 surfaces (private Asset Store derivatives) copied into raised diagonal chest/hip, ankle and brow strips. `surfaceWraps` in humanoid builder bisects only disposable copies, joins their split seams, retains/interpolates original deform weights and applies world-space clearance/thickness before armature. Source body untouched; no global weld. Spec `config/creature-production/plague-zombie.json`, private `~/.local/share/four-lanterns-creature-production/plague-zombie/plague-zombie.blend`; named `Burial …` objects remain separable. Dirty ivory against olive skin, smooth vertex-painted eye discoloration; bounded original posture adaptation.272-frame/ground/reimport/finite/runtime review passes. Refit and test deformation on every donor. Runtime grave flies are separate owned disposable geometry. Neat strips/intact skin are explicit simplifications; bulk user review pending.

## Crypt Ghoul waist rag and nails

The waist rag is a narrower Body01-derived cloth copy, fitted for the Ghoul and painted with TextureCraft Linen. The ten authored ivory tips use the measured rest-space finger surfaces and source distal finger weights. Both remain separable in `crypt-ghoul/clustered-pits/crypt-ghoul.blend`. See the [Ghoul report](crypt-ghoul.md) and the role JSON for the private material recipe and socket coordinates. Refit to the next donor and review motion before reusing either part.

## Ghast's dirt-stained finery

Dungeon Mason Body12, Cloak03 and Hair12 with the Ghoul's refitted nail tips. The coat and tattered cloak have coarse Linen, worn gold and hem dirt driven by baked position and occlusion. Hair12 is shortened and colored pale cream. The editable parts, TextureCraft project and recipe are under `ghast/deep-sockets/` in the private production root. The [Ghast report](ghast.md) records motion fit and materials.

## Kobold Scout head, tail and dart kit

CC0 KayKit Ninja donor rig and project-authored Scout geometry. The refined builder creates a wedge skull with carved eye pockets, a curved tail and the re-angled, shortened bronze launcher. The loaded dart remains a separate skinned object and the muzzle marker follows the grip. Reuse requires checking the next wearer's carried, firing and fall poses. See the [Scout report](kobold-tunnel-scout.md) for the editable scene and TextureCraft scale recipe.

## Refined Trapkeeper outfit and thrown dart

CC0 KayKit-derived prior Trapkeeper recipe, refitted to the refined Scout anatomy. Smooth moss tunic/tan apron, leather back dart case, brass belt tools, marked ivory cords and separate Loaded_Dart; reproducible through `build-kobold-trapkeeper-refined.py`. Private editable `kobold-trapkeeper/final-v2/kobold-trapkeeper.blend`. Chest/hips/hand sockets preserve the 27-bone rest rig; TrapkeeperDartMuzzle supplies the dart axis. Full motion and muted dungeon checks passed; new recipients require separate fit checks. TextureCraft maps and smooth cloth recipe are in `texture-kobold-trapkeeper.py`.

## Emberkeeper wings and suspended brazier

CC0 KayKit-derived legacy Emberkeeper recipe adapted to refined kobold anatomy. Open batlike wings on wing.l/wing.r; bronze cup and short chains on dedicated brazier joint. `build-kobold-emberkeeper-refined.py` preserves original27 rest bones; `animate-kobold-emberkeeper.py` bakes gravity alignment and floor clearance. Private editable `kobold-emberkeeper/animated/kobold-emberkeeper.blend`. Green robe, textured brown wing membranes and bronze charms contrast with red-copper skin and bright coals. Front/side/back,513 frames and muted dungeon checks passed. Reusing these on another body requires separate grip, wing and floor checks.

## Wererat thief coat, knife, keys and rat anatomy

Owned Mason Body12/OHS02_Niddle, KayKit Dungeon keyring and prior CC0-derived rat head/tail. `config/creature-production/wererat.json` fits knife/keyring to weapon_r/pelvis; `refine-wererat-anatomy.py` narrows/lowers the existing rat head, recesses eyes and fits four tail joints without changing original43 bone rests. `texture-wererat.py` applies wool-based short fur, smooth leather and subtle cloth. Private editable `wererat/final/wererat.blend`;256-frame and muted dungeon checks passed. Use separate fit checks on another body.

## Werewolf fitted head, toe claws and fur brush

CC0 KayKit Werewolf_Wolf head/toe claws and prior rat tail adapted to owned Mason Body01, with existing Ghoul nail recipe. `refine-werewolf-anatomy.py` preserves43 source rests and adds four tail joints. `texture-werewolf.py` supplies Wool-based fur and linen trunks. Private editable `werewolf/final/werewolf.blend`;280 frames and actual dungeon reviewed. New wearers require fresh anatomy and clearance checks.

## Refined bear anatomy and rustic vest

Existing authored CC0 Ninja-based Werebear assembly, refined through `refine-werebear.py`: shorter bear fangs, independently lit amber eyes, retained vest/waist panels/strap/pouch. `texture-werebear.py` demonstrates tighter UV packing for assemblies with many disconnected pieces; original excessive margin flattened texture detail. Private `werebear/final/werebear.blend`;400-frame motion review and final material/dungeon review passed. Bear retains layered stylized fur clumps.

## Cinder Imp horns, wings and coil-tail assembly

Ash Demon's existing CC0-derived separable anatomy fitted by `assemble-cinder-imp.py` to Mason Body01/approved goblin head. Dedicated wing.l/wing.r/imp_tail joints preserve original43 source bones. `texture-cinder-imp.py` gives soot skin and orange leather membranes; `animate-cinder-imp.py` bakes restrained wing pulses/folding and tail pivot. Private editable `cinder-imp/final/cinder-imp.blend`.320 frames and muted dungeon reviewed; one-joint wing and coiled tail remain stylized. Reuse requires fresh scale/attachment/motion review.

## Horned Devil contract book and animated barbed chain

Mason Body19 armor, KayKit Adventurers spellbook_closed on weapon_l, Mixed Bag1 chainlink and RPG Tools fishing_hook_B on eight independent chain joints. `assemble-horned-devil.py` builds the reusable link/hook assembly and reuses fitted fiend anatomy. `animate-horned-devil.py` extends the chain on strike and curls it near ground; rotations remove rig scale before writing pose matrices. Private `horned-devil/final/horned-devil.blend`.256 frames, floor and dungeon reviewed. Chain is posed, not simulated physics; new bearers need grip/reach/fall checks.

## Ash heat-vein materials and smoke presentation

Reusable TextureCraft Asphalt base with Marble veins driving matching base color, height and emission (`texture-ash-demon.py`). Pores and Voronoi prototypes were rejected as dots/flat patches. Private `ash-demon/materials/ash-demon.tcraft`, packed final Blend/GLB under `ash-demon/final/`. Runtime `ambient: ash-smoke` adds one fading point-cloud draw following the owned spine_03 joint and pulses cloned emissive materials; orthographic/perspective sizing and disposal tested.320 motion frames plus final material/runtime review passed. Suitable for heat/ash forms after separate palette, scale and readability review.

## Dire Wolf pale ruff and heavier chest

Reviewed private Wolf donor, localized upper-chest morph plus ivory/charcoal vertex coat. `prepare-dire-wolf.py`; private `dire-wolf/final/dire-wolf.blend`. Original23-bone jaw rig/five clips preserved, bite aliased to canonical attack identifier. Private distribution provenance unchanged.485 motion frames and actual dungeon reviewed; reusable animal variant recipe, no gear.

## Winter Wolf icy coat and mouth socket

Approved private Wolf donor, white/glacial-blue vertex coat, cyan irises, new inhale/open-jaw Spellcast_Shoot and Head-parented BreathMuzzle. `prepare-winter-wolf.py`; private `winter-wolf/final/winter-wolf.blend`.585 rendered frames and actual mouth-launched frost attack reviewed. Original23 bones retained; no gear. Useful breath/socket recipe for other qualified quadrupeds; fresh visual checks required.

## Hell Hound charcoal and furnace surfaces

Approved private Wolf body/jaw, TextureCraft Asphalt/Marble veins maps (matching height/emission), black nose mask, furnace eye/mouth/teeth materials. `prepare-hell-hound.py` then `texture-hell-hound.py`; private `hell-hound/final/hell-hound.blend`.485 frames and dungeon reviewed. Reusable heat-surface recipe, preserve donor provenance; no gear.

## Giant Rat facial fittings and grounded clips

Existing private multiview quadruped donor, fitted amber eyes/black sockets and paired ivory incisors. `prepare-giant-rat.py` preserves22-bone anatomy/four-joint tail and corrects source root floor drift. Source muzzle is offset x0.057; do not assume symmetry. Private `giant-rat/final/giant-rat.blend`;450 final frames and real dungeon reviewed. Mouth remains a lunge/nip without separate jaw hinge.

## Cave Bat leather membrane and flight landing

Existing private clean-sheet multiview bat, original22-bone rig. `prepare-cave-bat.py` retains atlas/body, separates green membranes, lifts live flight and grounds death; `texture-cave-bat.py` adds Leather grain. Private `cave-bat/final/cave-bat.blend`.405 frames and actual dungeon reviewed. Shoulder-driven panels, not full finger flexion. No gear.
