# Equipment bonuses

Game adaptation approved by Bruce in #144 on November 10, 2026. Source rules and Foundry stay unchanged. Equipment grants its stated bonus only while carried and equipped: weapons/shields/tools held, other forms worn. Light reduces the item's own Bulk even while stowed. Tools remain optional; basic camp supply tasks need no kit, ingredients or recipe.

| Form | Available bonuses |
| --- | --- |
| Weapons | Accuracy (1 attack Boon), +1 physical/fire/cold/lightning/mental damage, +2 Strong-hit damage, +2 hidden-attack damage, Push 1 on Strong hits; bows can gain +2 range. Elemental/physical affixes can inflict their named condition at rating 1 on Strong hits. |
| Armour | +1 physical DR, specific resistance 2, physical defence Boon, +1 Speed, named condition protection, Light, light source. |
| Shields | Additional Shield Block Boon, +1 physical DR during Shield Block, specific resistance 2 while held, Push 1 with a Strong Shield Bash, Light, light source. |
| Rings | +1 named attribute, specific resistance 2, named condition protection, discipline competence. |
| Brooches/neckwear | Ring options plus a light source. |
| Boots | +1 Speed, 1 Boon against attacks that can knock Prone, ignore difficult-terrain movement surcharge, named condition protection, discipline competence, Light. Hazards still hurt and prone occupants still cost extra movement. |
| Gloves | +1 Brawn/Agility, weapon accuracy Boon, discipline competence, Fire/Cold resistance 2, Light. |
| Belts | +2 Bulk capacity, +1 Brawn/Fortitude, discipline competence, Light. |
| Cloaks | Physical defence Boon, specific resistance 2, named condition protection, discipline competence, Light, light source. |
| Headwear | +1 named attribute, +1 physical DR, named condition protection, discipline competence, Light, light source. |
| Backpacks | +2 Bulk capacity, Light, storage reducing the total Bulk of stowed contents by up to 2. |
| Tools/kits | Discipline competence, 25% less advanced crafting time, Light, light source. Hold the kit while using it. |

“Light” halves the item's own Bulk, with a 0.25 minimum; current generated bases weigh 1, so Light bases weigh 0.5. Storage reduces only carried, unequipped contents, never below zero. Cloaks and backpacks share the Back slot. Kits occupy one hand. A magical backpack uses the existing equipped backpack appearance.

Use the **strongest matching equipment bonus** for each attribute, damage resistance, discipline, Speed, carrying-capacity effect, accuracy or other matching effect. Distinct effects still work together. Normal armour contributes its normal DR; the strongest equipment DR enhancement and Shield Block can improve it, respecting the existing resistance cap of 3. Do not add duplicate Boons from two items. Skill/Forge bonuses remain separate.

Discipline competence adds one Boon to rolls for every ability in the named discipline, including nonattack healing/treatment and matching intersection abilities. It grants neither an ability nor eligibility. Multiple matching disciplines on one intersection do not multiply the equipment competence Boon. Fixed effects without a roll are unchanged. Weapon bonuses affect only attacks actually made with that weapon; gloves' accuracy applies to weapon attacks generally. Push 1 triggers on Strong hits, uses normal forced movement and does not stack with an equal or stronger push already supplied by an ability. There is no armour-penetration affix, equipment “Impact” bonus or activated magical-ability affix.

Named condition protection reduces each incoming rating by 1, to a minimum of zero, through both creature and power resolvers; existing wounds and conditions are not erased by equipping it. Protection names its condition explicitly. Attribute bonuses do not retroactively change creation points, maximum HP or learning eligibility.

Light sources illuminate within three squares with line of sight, without a fuel roll. Toggle them in the item inspector at any time no action is resolving. They illuminate only while equipped by an active companion. Toggle state survives saves and transfers; stowing removes the illumination. The toggle does not ready or wear the item for free.

## Saved items

New treasure uses revision 3 and form-specific affix pools. Revision 1/2 receipts remain valid: deterministic reconstruction preserves seed, receipt version, base, instance ID, historical name, ownership and equipment state, while replacing obsolete effects with legal form-specific bonuses. Unique relics keep their names and identities but receive explicit approved pairs. Persisted effect values are never trusted. Existing inventory, floor caches, market stock and transferred items rebuild from the same receipts when acquired/previewed.

Legacy off-form effects translate deterministically: for example a Ram's belt becomes a carrying-capacity belt, a Wardweaver shield improves Shield Block, and a Lifebloom ring provides Life discipline competence. Their saved affix receipts remain historical; the current effect description explains what actually applies. The Cinder Sovereign now provides physical DR and Flame competence instead of opaque wildfire/fire build statistics.
