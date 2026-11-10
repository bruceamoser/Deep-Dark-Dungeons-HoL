# Creature visual-fit audit — November 10, 2026

Audited game source: `a56aacc824a0376774c08c4d435247731c73826b` (v0.8.7 plus publication docs). Book reference: pinned HoL commit `24e545e6d860e8c1b03a21356fd22cae1c039785`. This is an author visual assessment of **current output**, not an independent review, similarity algorithm, player recognition study or animation certification.

## Finding

**The current roster averages 44.8/100. Only 14 of 58 creatures reach 65; 32 are below 50.** Many creatures have functional stat adapters but weak visual casting. Previous automated render checks prove that meshes exist and have acceptable bounds; they do not prove anatomical correctness or even visible pixels. The previous casting audit overstated several matches, especially the Golem-key constructs and corpse models.

The runtime roster contains **58 of the source catalogue's 192 entries (30.2%)**, using **25 assigned base keys: 23 GLB bases and 2 procedural bodies**. The other 134 source entries are **not in the runtime roster**, not 134 additional invisible or failing models. They are excluded from this fit average. Reusing a base is acceptable when identity and combat role remain legible; one base per creature is not a requirement.

| Result | Score | Creatures |
| --- | --- | ---: |
| Strong match | 80–100 | 5 |
| Usable, needs work | 65–79 | 9 |
| Approximate placeholder | 50–64 | 12 |
| Weak / misleading | 30–49 | 14 |
| Failing current fit | 0–29 | 18 |

The score is a decision aid, **not “44.8% accurate.”** Small differences of about five points should not determine purchasing decisions. Clear body mismatches are more reliable findings than exact ranking among similar placeholders.

## Rating system

Each criterion gets an integer **0–5**: 0 absent/contradictory, 1 very weak, 2 partial broad resemblance, 3 recognizable approximation, 4 close with limited omissions, 5 fully communicates the requirement at this game's stylized level. Polygons and photorealistic detail are not prerequisites. A well-designed stylized monster can score 100.

| Code | Criterion | Weight | What earns credit |
| --- | --- | ---: | --- |
| A | Anatomy / body identity | 30 | Correct species/body plan, head, limbs, tail, wings; skeleton vs living flesh, physical vs elemental body. |
| S | Silhouette / proportions / scale | 15 | Broad vs gaunt, long vs squat, grounded vs drifting, relevant relative size. Shared fixed camera scale prevents magnifying small models into compliance. |
| F | Signature identity | 20 | Features that identify this particular creature: decay, coat of fur, hollow wind center, spectral form, hybrid face, eyes, flame. |
| G | Gear / role | 15 | Visible expected weapon, shield, tools, costume and role props; no misleading substituted weapon. A creature requiring no equipment gets credit when no inappropriate props are present. |
| M | Material / theme | 10 | Stone/clay/glass/ice/slime/fire/shadow reads appropriately; relevant colour and weathering, not exact colour matching. |
| D | Distinction | 10 | Can it be separated visually from its nearest roster neighbours without a nameplate? For example, goblin slinger vs firestarter, wight vs vampire, wolf vs winter wolf. This is reviewer judgment, not a blinded user study. |

**Score = 6A + 3S + 4F + 3G + 2M + 2D.** A fundamental wrong-body cast (A ≤ 1) cannot exceed 39. A body not visibly rendered receives 0 overall and is marked as a rendering failure; no species score is inferred from its filename. The latter applies to the bat in this environment and needs native packaged reproduction. Missing props count principally under G; material issues principally under M. D measures the separate gameplay cost of visually colliding identities.

Text and images both matter: explicit prose requirements take priority if illustration details differ; the difference is documented. Incidental sex, exact pose, and every small illustrated accessory are not mandatory. Body type, creature-defining details and readable role are. The kobold Emberkeeper's wings are illustration evidence, while its copper scales/brazier are explicit prose; the current model meets neither.

These bands describe **semantic fit**, not final production quality. Even the best matches mix cute, blocky and chibi art with a darker and more naturalistic book. Animation, effects, style consistency and gameplay-scale recognition deserve separate acceptance checks. No current 80+ score is a claim that high-end presentation is finished.

## Evidence and limits

Every one of the 58 authored flavour descriptions and pinned illustrations was inspected against two newly rendered views using the **actual equipmentAppearance creature factory**, current GLBs, normal idle at 0.3 seconds and current weapon attachment code. Neutral lighting and fixed camera scale make anatomy visible; they do not reproduce every dungeon lighting situation. The model factory's normal normalization is retained. Mesh frustum culling is disabled just as in Scene.addEntity. No hypothetical theme decoration is credited.

All eight actual-game browser gallery groups were also captured with the existing creature visual harness; 58 adapters and 17 condition layers completed. A focused browser scene reproduced the invisible bat with its entity visible and no conditions. These checks used isolated headless Chromium/SwiftShader on this Linux desktop, not Bruce's saves. **The installed/native 0.8.7 binary, full attack/locomotion cycles and every camera/lighting environment were not requalified for this audit.** The bat is a confirmed observed failure here, not proof it fails on every GPU/platform. Other body and equipment findings follow both visible output and current code.

Local evidence (ignored; regenerate on another machine):

- `test-results/creature-fit-audit/comparison.html`: all 58 reference/front/rear cards, editable ordering by score; embeds images for offline viewing.
- `test-results/creature-fit-audit/sheet-01.png` through `sheet-08.png`: contact sheets, roster order.
- Individual front/rear PNGs, `evidence.json`, and focused `bat-game.png` in the same folder.
- `test-results/book-creatures-{0,8,16,24,32,40,48,56}.png`: actual-game gallery (shared QA paths; later runs may overwrite).

Reproduce neutral comparisons from the repository root:

```sh
npm run dev -- --port 5187
# In a second terminal:
node scripts/creature-fit-capture.mjs
```

The capture creates an isolated page, loads current model/appearance modules directly and never loads saves or connects to a running installed game. Source art stays in its pinned vendor location; no purchased source assets, new third-party assets or standalone artwork copies are committed. Machine-readable ratings include source paths, model SHA-256, six components, caps and evidence filenames: [JSON](2026-11-10-creature-fit.json), [CSV](2026-11-10-creature-fit.csv).

## Entire runtime bestiary, lowest first

Components are **A/S/F/G/M/D**, each out of 5; final score is out of 100. † observed rendering failure, not an anatomy judgment. The bat's zero component placeholders mean “not visibly assessable,” not six independent anatomical failures.

| Creature | Current base | Components | Fit | Evidence-based assessment |
| --- | --- | --- | ---: | --- |
| Cave Bat | Bat | 0/0/0/0/0/0 | **0**† | No visible bat body in either neutral capture or a focused actual-game browser scene on this machine, despite visible entity/valid mesh bounds. Do not award an anatomy score from the filename. Packaged/native reproduction still needed. |
| Animated Statue | Golem | 0/0/0/0/1/0 | **2** | Golem key loads a floating winged green creature, not a humanoid civic statue; no stone figure, spear or planted feet. |
| Stone Knuckle | Golem | 0/0/0/2/0/0 | **6** | Floating winged Goleling is not a planted pebble elemental; no dense stone core or blunt hands. |
| Clay Helper | Golem | 0/0/0/3/0/0 | **9** | Smaller floating winged Goleling has no clay humanoid body, broad hands, feet or maker marks. |
| Kobold Emberkeeper | OrcRaider | 1/1/0/0/0/0 | **9** | Green orc lacks copper scales, dragon head, tail and illustrated wings; no travelling brazier. |
| Air Elemental | Ghost | 0/1/0/2/1/0 | **11** | Skull-faced floating ghost replaces a hollow vortex of dust, leaves and cloud; transparency alone does not supply wind anatomy. |
| Cinder Strider | Demon | 1/0/0/1/1/0 | **11** | Same squat winged imp; no tall narrow flame body, long ember limbs or trailing smoke. |
| Kobold Trapkeeper | OrcRaider | 1/2/0/0/1/0 | **14** | Green orc humanoid has no reptile muzzle, scales, tail or clawed feet; dart case and tools absent. |
| Kobold Tunnel Scout | OrcRaider | 1/2/0/0/1/0 | **14** | Same tailless green orc as trapkeeper; no reptilian head, dart launcher, ribbon, chalk or twine. |
| Emberling | Demon | 1/1/0/1/1/1 | **16** | Red winged imp with horns and pitchfork rather than a small body of coals and flame. |
| Wererat | WerewolfMan | 1/2/0/1/1/1 | **19** | Human lumberjack with sword; no rat head, tail, digitigrade legs, thief coat or small knife. |
| Plague Zombie | WerewolfMan | 2/2/0/1/1/0 | **23** | Same tinted lumberjack as ghoul; no burial wrapping, swelling, decomposition or grave flies. |
| Werebear | Monstrosity | 1/2/0/3/1/0 | **23** | Stitched hooded humanoid monstrosity has neither bear head nor bear paws/fur; not recognizable as a werebear. |
| Ash Demon | Demon | 2/1/1/1/1/0 | **24** | Same solid cartoon imp, without animal-like smoke/fire body or soot; not distinct from other Demon-key creatures. |
| Hobgoblin Marshal | OrcBrute | 2/1/1/1/1/0 | **24** | Same green brute as warband melee units; no officer's helm/map board or readable marshal identity. |
| Crypt Ghoul | WerewolfMan | 2/2/0/2/1/0 | **26** | Healthy lumberjack proportions in red shirt with brown/green tint; no gaunt corpse anatomy, stretched lips or long nails. |
| Ghast | Monstrosity | 2/1/1/1/2/0 | **26** | Broad stitched hooded monster instead of taut, long-nailed undead in stolen finery; same body as werebear. |
| Hobgoblin Shieldguard | OrcBrute | 2/1/1/1/1/1 | **26** | Orc brute instead of disciplined hobgoblin; sword and small round shield replace spear and rectangular shield. |
| Grave Wisp | Ghost | 2/1/1/4/1/0 | **33** | Dark skull-faced ghost is not a pale drifting light with an indistinct inner face; same Ghost body as shadow/wraith. |
| Goblin Firestarter | OrcRaider | 3/3/1/0/2/0 | **35** | Barehanded orc proxy; goggles, bottles and fire-bearing equipment absent; indistinguishable from rattlechanter. |
| Goblin Rattlechanter | OrcRaider | 3/3/1/0/2/0 | **35** | Barehanded orc proxy; no bells, pans or rhythm gear to communicate its support role. |
| Shadow | Ghost | 2/2/1/3/2/0 | **35** | Volumetric skull-faced ghost, not a person's moving shadow; shared blue tint does not establish shadow material. |
| Wight | Vampire | 2/3/1/1/1/4 | **38** | Healthy-looking moustached vampire in a red coat; no armoured corpse, decay or ancient lord's regalia. |
| Goblin Smoke Slinger | OrcRaider | 3/3/2/0/3/0 | **41** | Barehanded orc proxy; no sling, pots or mouth scarf; visually duplicates the other goblin specialists. |
| Goblin Spearhand | OrcRaider | 3/3/2/0/3/0 | **41** | Exactly the scrapper body with a sword; neither spear nor saucepan helmet is rendered. |
| Glass Sentinel | FrostGolem | 3/2/1/4/1/0 | **42** | Opaque icy crystal brute rather than a clear reflective glass humanoid with coloured seams; identical to ice warden. |
| Hobgoblin Longbow | OrcRaider | 2/2/1/4/1/3 | **42** | Bow is present, but green lightly clothed orc replaces reddish disciplined armoured hobgoblin; quiver/bowcase absent. |
| Horned Devil | Demon | 4/2/2/0/2/0 | **42** | Horns/wings read as generic devil; pitchfork replaces chains and ledger, no enforcer regalia or rank silhouette. |
| Orc Warcaller | OrcBrute | 4/2/2/0/3/0 | **44** | Same armoured brute as shieldbreaker; no drum or staff, with a visible sword-like prop instead. |
| Grave Cultist | Witch | 5/2/1/1/1/0 | **45** | Cheerful orange-hatted witch, glasses and skirt; no ash robes, burial tokens or ritual relic; identical to hedge sorcerer. |
| Goblin Boss | OrcBrute | 3/2/2/2/3/1 | **46** | Small-scale heavily armoured orc brute with trophies, not a goblin officer in an oversized pocketed coat. |
| Wraith | Ghost | 3/3/2/3/2/0 | **48** | Floating ghost silhouette broadly works; large skull replaces torn robe/two pale sparks; no distinction from other Ghost entries. |
| Lich — Tomb Sage | Necromancer | 3/3/2/1/2/4 | **50** | Necromancer mage reads as caster, but living-looking face, neat outfit and no books miss preserved undead scholar/blackened bones. |
| Clockwork Scout | Clanker | 3/2/2/1/3/5 | **51** | Mechanical robot is recognizable, but large barrel torso/twin exhausts and arms replace small brass surveying device with lens and jointed feet. |
| Goblin Scrapper | OrcRaider | 3/3/2/3/3/1 | **52** | Small green orc proxy reads broadly goblinoid; broad head/short ears miss wiry goblin anatomy and scavenger pockets. |
| Barrow Guard | SkeletonGolem | 3/2/2/3/3/3 | **53** | Oversized bare skeletal brute rather than an armoured burial guardian; sword/shield only partly convey the role. |
| Orc Shieldbreaker | OrcBrute | 4/2/3/1/3/1 | **53** | Armoured orc brute fits strength but has sword instead of hooked axe; excessive shoulders/trophies, no shield-boss belt. |
| Dire Wolf | Wolf | 4/2/1/5/2/1 | **55** | Only 15% larger than wolf; no broad muzzle, winter ruff or distinct heavy build. |
| Hell Hound | Wolf | 4/3/1/5/1/1 | **56** | Brown/red version of blocky wolf, without black coat, furnace mouth or convincing flame; not a distinct infernal body. |
| Mire Ooze | Ooze | 3/2/1/5/2/5 | **57** | Blob communicates slime, but the prominent cartoon eye contradicts eyelessness; lacks mud texture and suspended scraps. |
| Hedge Sorcerer | Witch | 5/3/3/2/2/0 | **61** | Witch silhouette implies caster, but no visible focus/charms; identical to cultist and markedly brighter than reference. |
| Winter Wolf | Wolf | 4/3/2/5/2/1 | **62** | Blue-grey version of wolf; lacks white fur, pronounced mane and visible icy mouth; distinction is mainly tint. |
| Wolf | Wolf | 4/3/2/5/2/1 | **62** | Recognizable quadruped canine but extremely blocky, short-legged and without dense fur/long muzzle; shares all wolf variants. |
| Cinder Imp | Demon | 4/4/3/2/2/3 | **64** | Small horned winged fiend fits; flat red body/pitchfork miss coal skin, grasping claws and a clearly readable barbed tail. |
| Skeleton Champion | SkeletonWarrior | 5/4/2/3/3/1 | **67** | Same horned warrior body as sentry; shield helps but crooked crown and veteran regalia are absent. |
| Orc Outrider | OrcRaider | 4/3/3/4/3/3 | **69** | Orc species and blade are recognizable; squat chibi proportions and sparse travel gear miss the long-legged scout. |
| Death Knight | BlackKnight | 5/4/3/3/3/1 | **71** | Armoured closed-helm knight reads correctly; bright plume and generic sword/shield lack burned heraldry and spectral menace; same body as animated armour. |
| Werewolf | WerewolfWolf | 4/3/3/4/3/4 | **71** | Wolf-headed humanoid with claws reads; tidy red lumberjack shirt and modest arms miss torn cuffs and powerful hybrid bulk. |
| Animated Armor | BlackKnight | 5/4/3/4/3/1 | **74** | Closed armour, sword and shield fit; emptiness is not demonstrated, bright plume/cape match death knight exactly. |
| Bandit Bow | Ninja | 5/4/2/4/2/4 | **74** | Human and bow are correct, but black/red ninja mask and topknot replace camouflaged roadside archer. |
| Masked Duelist | Ninja | 5/4/3/3/2/4 | **75** | Masked sword-user reads, but ninja topknot/face covering replace distinctive duelling mask, light coat and fine blade. |
| Skeleton Sentry | SkeletonWarrior | 5/4/3/3/3/3 | **75** | Correct skeleton and sword; horned helmet replaces exposed skull, uniform tatters and the illustrated shield are missing. |
| Giant Rat | Rat | 4/4/3/5/3/5 | **79** | Rat body, four legs, rounded ears and long tail read; smooth primitives lack fur, scars and thick tail. |
| Shield Soldier | Paladin | 5/4/3/4/2/5 | **80** | Human armour, sword and shield read as soldier; blue heroic cape and bright heraldry replace weathered service gear. |
| Icebound Warden | FrostGolem | 5/4/4/5/4/1 | **83** | Broad ice/crystal humanoid with blunt fists is a good semantic fit; crystalline spikes replace layered lake ice and bubble eyes. |
| Road Bandit | Survivalist | 5/4/3/4/4/5 | **84** | Human survivalist, practical clothes, belt gear and blade communicate robber well; missing ragged cloak/pack detail. |
| Skeleton Archer | SkeletonRogue | 5/4/4/4/3/4 | **84** | Clearly a skeleton archer with bow; hood obscures skull, quiver and ragged uniform are missing. |
| Giant Spider | Spider | 5/4/4/5/3/5 | **89** | Eight legs, segmented abdomen, clustered eyes and fangs read clearly; simple legs lack hooked feet and silk glands. |

## What this changes about the previous audit

1. **Golem is a misleading key.** It points to `/assets/creatures/Goleling.glb`, visibly a floating green winged creature. Animated Statue, Clay Helper and Stone Knuckle are not stone/clay humanoids. A smaller scale does not fix their anatomy.
2. **Humanoid theme geometry is bypassed.** `equipmentAppearance` returns the humanoid path for KayKit bodies; `dressCreature` runs only inside the other `creatureAppearance` path. Theme feature lists therefore do not establish a rendered crown, rattle, trophy or frost ornament on humanoids. Textured authored materials also often retain bright original colours because tinting only replaces particular untextured white materials (with a narrower dead-skin exception).
3. **Weapon metadata is not proof of equipment.** The humanoid attachment branch uses a sword for melee/spear/chain. It does not attach the intended spear, drum, sling, dart launcher or brazier. Spell-role entries often have empty hands. This is an implementation/assembly problem as well as an asset problem.
4. **The death models are not convincing corpses.** WerewolfMan is a healthy lumberjack body. Tinting parts of it does not create ghoul anatomy, zombie wrappings or a rat hybrid. Vampire is visibly a dressed living-looking vampire, not an armoured wight.
5. **Render regression coverage has a blind spot.** Existing checks count visible meshes, bounds and coloured materials, not pixels. The bat passes those structural checks while being invisible in this audit's neutral and focused game scenes. This finding does not diagnose its root cause.

## Recommended correction order

**First: fix correctness/assembly without purchasing.** Diagnose the bat. Replace the Golem-key casting with actual stone/clay humanoids if the owned inventory has them; inspect the geometry rather than trust names. Attach the correct spear/shield shapes, sling, darts, drum, goggles/bottles, rattle gear, crown and books. Give goblin roles and warband leaders separate visible kits. Reassess scores after actual renders.

**Next: secure the genuinely missing bodies.** Reptilian tailed kobolds; rat/bear hybrids; gaunt undead and wrapped zombies; wind/fire elementals; appropriate shadow/wisp/wraith forms. Hobgoblins need disciplined humanoid anatomy and kit rather than another green orc brute. Prefer reusable bodies with authored variants, not 58 unrelated downloads. No purchase is implied or made by this audit.

**Then: materials, wolves and polish.** Transparent glass vs opaque ice, mud-coloured eyeless slime, white/furred winter wolf and furnace-mouthed hell hound. Preserve the useful skeleton, human fighter and ice-body foundations while aligning their style, equipment, locomotion and effects with the intended high-end dark fantasy presentation.

Prioritize **body/render failures**, then common early-floor roles, then boss distinction, then small detail fidelity. Neither depth/CV nor encounter-frequency weighting was used in the average; a common goblin has the same one-entry weight as a late boss. A second pass should record real encounter frequency and conduct nameplate-free playtests before treating a small numerical improvement as a gameplay improvement.
