import { equipmentRollBonus } from "./equipment-bonuses.mjs";
import { ancestryTraitIds } from "../../public/vendor/hol/rules/ancestry.mjs";
import { distance } from "./dungeon.mjs";
export const traitIds = (h) => ancestryTraitIds(h.draft);
const rule = (decision, text, effects = {}) => ({ decision, text, ...effects });
// Dungeon decisions are separate from the unchanged source cards. Stable IDs
// preserve existing heroes, including a Human's borrowed trait.
export const DUNGEON_TRAITS = Object.freeze({
  "trait-deep-dwarf-eyes-for-the-dark": rule(
    "keep",
    "Low-Light Vision 2 removes up to two lighting Banes. It does not grant sight in complete darkness.",
    { lowLight: 2 },
  ),
  "trait-deep-dwarf-stone-tells-you": rule(
    "adapt",
    "Sense active grounded creatures within 6 squares through connected dungeon stone, even in darkness. Attacks still require a clear path.",
    { seismic: 6 },
  ),
  "trait-deep-dwarf-never-off-the-map": rule(
    "replace",
    "Stone compass: the location of the descending stairs is marked on your map on every floor.",
    { stairs: true },
  ),
  "trait-deep-dwarf-holds-its-own": rule(
    "replace",
    "A patient breath removes one Bane caused by Poisoned from your attribute, attack and defense rolls.",
    { poisonTolerance: 1 },
  ),
  "trait-deep-dwarf-where-tall-folk-cannot-stand": rule(
    "adapt",
    "Ignore the extra movement cost of low, narrow dungeon passages.",
    { terrain: "low" },
  ),
  "trait-dwarf-deep-constitution": rule(
    "keep",
    "Maximum HP +1. Applied during character creation.",
  ),
  "trait-dwarf-low-center": rule(
    "keep",
    "Stability +1 and one Boon on Guile rolls.",
    { guile: 1, stability: 1 },
  ),
  "trait-dwarf-carved-history": rule(
    "keep",
    "The first enemy to damage you each encounter is permanently marked. Gain one Boon when attacking a marked creature.",
    { grudge: true },
  ),
  "trait-dwarf-maker-s-eye": rule(
    "adapt",
    "The first crafted recipe each day preserves its prepared ingredient batch. Tools and ingredients must still be present.",
    { craftImprove: true },
  ),
  "trait-dwarf-stone-reader": rule(
    "replace",
    "Read the structure: gain one Boon when attacking constructs. Craft recipes 25% faster.",
    { structure: true },
  ),
  "trait-elf-age-of-memory": rule(
    "adapt",
    "Prepare ancestral memory: once per day, add one Boon to your next Knowledge or Reason roll.",
    { daily: 1, attributes: ["knowledge", "reason"] },
  ),
  "trait-elf-leaf-listener": rule(
    "replace",
    "The dungeon's small living sounds warn your camp. Halve the hourly ambush chance while this hero is alive.",
    { campWarning: true },
  ),
  "trait-elf-light-tread": rule(
    "replace",
    "Light feet ignore rubble and difficult ground. Low passages still cost extra.",
    { terrain: "rubble" },
  ),
  "trait-elf-star-familiar": rule(
    "adapt",
    "Wakeful reverie counts as sleep. If the company is ambushed while this hero rests, your company acts first.",
    { reverie: true },
  ),
  "trait-elf-unhurried-grace": rule(
    "keep",
    "Base Speed +1. Applied during character creation.",
  ),
  "trait-gnome-bright-idea": rule(
    "adapt",
    "Prepare a bright idea: once per day, add two Boons to your next Knowledge or Reason roll.",
    { daily: 2, attributes: ["knowledge", "reason"] },
  ),
  "trait-gnome-fingers-in-the-works": rule(
    "replace",
    "Crafted smoke and flash-powder surfaces last one extra round. Ward charms absorb 2 additional damage.",
    { device: 1 },
  ),
  "trait-gnome-one-more-question": rule(
    "replace",
    "See through the false impression: gain one Boon to defenses against mental attacks.",
    { mentalDefense: 1 },
  ),
  "trait-gnome-small-target": rule(
    "keep",
    "Gain one Boon to every defense. Uses the source defense calculator.",
  ),
  "trait-gnome-whats-it-made-of": rule(
    "replace",
    "Practical analysis reduces recipe crafting time by 25%.",
    { craft: 1 },
  ),
  "trait-goblin-more-of-us-than-you": rule(
    "keep",
    "Your first attack each turn gains one Boon if its target is adjacent to at least two of your allies.",
    { packAttack: true },
  ),
  "trait-goblin-never-where-you-aim": rule(
    "replace",
    "Once on your turn, stow one held item without spending a Maneuver. Handling it can still provoke.",
    { quickStow: true },
  ),
  "trait-goblin-other-side-of-the-fire": rule(
    "replace",
    "A good salvage bargain: sell your items for 60% of their listed price instead of 50%.",
    { sellRate: 0.6 },
  ),
  "trait-goblin-run-away-better": rule(
    "keep",
    "Base Speed +1. Applied during character creation.",
  ),
  "trait-goblin-scavenger": rule(
    "replace",
    "Salvage expertise reduces the price of recipe ingredients by 25%.",
    { salvage: true },
  ),
  "trait-halfling-good-cheer": rule(
    "adapt",
    "Prepare a little luck: once per day, add three Boons to your next attribute roll.",
    { daily: 3 },
  ),
  "trait-halfling-quiet-company": rule(
    "replace",
    "Quick bargaining: pay 10% less when buying equipment or crafting materials for this hero.",
    { buyRate: 0.9 },
  ),
  "trait-halfling-resilient": rule(
    "keep",
    "Bulk capacity +1. Applied by the source inventory calculator.",
  ),
  "trait-halfling-small-passage": rule(
    "replace",
    "Shelter behind a larger adjacent ally: gain two Boons against physical projectile attacks while that ally is capable.",
    { shelter: 2 },
  ),
  "trait-halfling-stout-heart": rule(
    "keep",
    "Maximum HP +1, and one Boon to rolls affected by Frightened.",
    { courage: 1 },
  ),
  "trait-high-elf-name-that-opens-doors": rule(
    "replace",
    "Measured force grants one Boon to Brawn attacks that push their target.",
    { force: 1 },
  ),
  "trait-high-elf-old-courtesies": rule(
    "adapt",
    "Still Water grants one Boon to Reason rolls while Dazed or Frightened.",
    { focus: 1 },
  ),
  "trait-high-elf-practised-hand": rule(
    "keep",
    "Gain one Boon to Knowledge crafting rolls with the required tools.",
    { craft: 1 },
  ),
  "trait-high-elf-starlight-eyes": rule(
    "keep",
    "Low-Light Vision 1 removes one lighting Bane; complete darkness still requires light.",
    { lowLight: 1 },
  ),
  "trait-high-elf-weight-of-centuries": rule(
    "adapt",
    "Prepare remembered experience: once per day, add two Boons to your next Knowledge or Reason roll.",
    { daily: 2, attributes: ["knowledge", "reason"] },
  ),
  "trait-human-far-walker": rule(
    "keep",
    "Far Walker grants +1 movement and +2 carrying capacity in the discipline forge.",
  ),
  "trait-human-many-homes": rule(
    "keep",
    "Learn the selected ancestry language and gain the dungeon version of your selected borrowed trait. Keep Human base HP and Speed.",
  ),
  "trait-human-practiced-patience": rule(
    "adapt",
    "Patient hands reduce recipe crafting and wound treatment time by 25%.",
    { careSpeed: 0.25, craftTime: 0.25 },
  ),
  "trait-human-shared-table": rule(
    "replace",
    "Improvise craft tools and mixing equipment for known recipes at camp or in town.",
    { improvise: true },
  ),
  "trait-human-weathered": rule(
    "keep",
    "Maximum HP +1 and one Boon to Fortitude rolls against death marks.",
    { death: 1 },
  ),
  "trait-oath-bound-bound-by-your-word": rule(
    "adapt",
    "Your oath is invoked automatically for Fortitude rolls: gain one Boon.",
    { fortitude: 1 },
  ),
  "trait-oath-bound-neither-here-nor-there": rule(
    "adapt",
    "Your oath is invoked automatically for Agility rolls: gain one Boon.",
    { agility: 1 },
  ),
  "trait-oath-bound-read-the-oath": rule(
    "adapt",
    "Your oath is invoked automatically for Knowledge rolls: gain one Boon.",
    { knowledge: 1 },
  ),
  "trait-oath-bound-the-debt-comes-due": rule(
    "adapt",
    "Prepare a second chance. Once per day, automatically reroll your next Weak attribute result for 1 HP. That HP cannot be recovered until dawn; the new result stands.",
    { debt: true },
  ),
  "trait-oath-bound-the-mark": rule(
    "adapt",
    "Your oath is invoked automatically for Reason rolls: gain one Boon.",
    { reason: 1 },
  ),
  "trait-tallfolk-a-big-shadow": rule(
    "replace",
    "Your imposing presence grants one defense Boon against adjacent enemies.",
    { terror: 1 },
  ),
  "trait-tallfolk-broad-back": rule(
    "keep",
    "Bulk capacity +3. Applied by the source inventory calculator.",
  ),
  "trait-tallfolk-built-for-the-weather": rule(
    "replace",
    "Long-march endurance delays fatigue until 20 hours awake instead of 16.",
    { awakeHours: 20 },
  ),
  "trait-tallfolk-long-reach": rule(
    "keep",
    "Object interactions and non-attack touch abilities reach 2 squares. Attack ranges remain unchanged.",
    { reach: 2 },
  ),
  "trait-tallfolk-you-take-the-blow": rule(
    "keep",
    "Base Speed +1. Applied during character creation.",
  ),
});
export const traitsOf = (h) =>
  traitIds(h).map((id) => ({ id, ...DUNGEON_TRAITS[id] }));
export const ancestryGameMethods = {
  traits(h) {
    return traitsOf(h);
  },
  touchRange(h) {
    return Math.max(1, ...traitsOf(h).map((t) => t.reach ?? 1));
  },
  prepareTrait(index, id) {
    const h = this.party[index],
      t = traitsOf(h).find((t) => t.id === id);
    if (!t || !(t.daily || t.debt)) throw new Error("This trait is passive.");
    h.traitUses ??= {};
    h.preparedTraits ??= [];
    if (h.traitUses[id] === this.clock().day)
      throw new Error("This trait has been used today.");
    h.preparedTraits = h.preparedTraits.includes(id)
      ? h.preparedTraits.filter((x) => x !== id)
      : [...h.preparedTraits, id];
    this.emit("change");
  },
  rollFor(h, attribute, boons = 0, banes = 0, context = {}) {
    const traits = traitsOf(h),
      mode = context.mode ?? "attribute",
      target = context.target;
    if (["attack", "defense"].includes(mode))
      banes += this.visionPenalty(h, target ?? h);
    h.traitUses ??= {};
    let bonus = equipmentRollBonus(h, context);
    if (mode !== "death" && traits.some((t) => t.poisonTolerance))
      banes = Math.max(
        0,
        banes -
          Math.min(1, this.R.conditionSummary(h.conditions).poisoned.rating),
      );
    if (mode === "attack") {
      bonus += this.tacticValue(h, "attack") + (target?.companyMark ?? 0);
      h.tactics = this.activeTactics(h).map((e) =>
        e.effects.charges ? { ...e, effects: { ...e.effects, attack: 0 } } : e,
      );
    }
    if (mode === "defense") {
      bonus += this.tacticValue(h, "defense");
      if (target && distance(h, target) <= 1 && traits.some((t) => t.terror))
        bonus++;
    }
    for (const t of traits) {
      bonus += t[attribute] ?? 0;
      if (t.death && mode === "death") bonus += t.death;
      if (t.courage && h.conditions.some((c) => c.key === "frightened"))
        bonus += t.courage;
      if (
        t.focus &&
        attribute === "reason" &&
        h.conditions.some((c) => ["dazed", "frightened"].includes(c.key))
      )
        bonus += t.focus;
      if (mode === "craft") {
        bonus += t.craft ?? 0;
        if (
          t.structure &&
          ["recipe-fletched-ammunition", "recipe-twisted-cord"].includes(
            context.recipe,
          )
        )
          bonus++;
        if (
          t.improvise &&
          h.traitUses.improvise !==
            `${this.campaign.expeditions}:${this.campaign.depth}`
        ) {
          bonus++;
          h.traitUses.improvise = `${this.campaign.expeditions}:${this.campaign.depth}`;
        }
      }
      if (mode === "attack") {
        if (t.grudge && h.grudges?.includes(this.creatureIdentity(target)))
          bonus++;
        if (
          t.structure &&
          /golem|construct|statue|animated-armor/.test(target?.type ?? "")
        )
          bonus++;
        if (t.device && context.spec?.requiredItem) bonus += t.device;
        if (t.force && attribute === "brawn" && context.spec?.push)
          bonus += t.force;
        if (
          t.terror &&
          context.spec?.conditions?.some((xs) =>
            xs.some(([k]) => k === "frightened"),
          )
        )
          bonus += t.terror;
        if (
          t.packAttack &&
          h.traitUses.packTurn !== this.encounter?.serial &&
          target &&
          this.party.filter(
            (a) => a !== h && this.canAct(a) && distance(a, target) <= 1,
          ).length >= 2
        )
          bonus++;
      }
      if (mode === "defense") {
        if (t.mentalDefense && context.type === "mental")
          bonus += t.mentalDefense;
        if (
          t.shelter &&
          context.projectile &&
          this.party.some(
            (a) =>
              a !== h &&
              this.canAct(a) &&
              distance(a, h) <= 1 &&
              ![
                "ancestry-halfling",
                "ancestry-gnome",
                "ancestry-goblin",
              ].includes(a.draft.ancestryId),
          )
        )
          bonus += t.shelter;
      }
      if (
        t.daily &&
        h.preparedTraits?.includes(t.id) &&
        h.traitUses[t.id] !== this.clock().day &&
        (!t.attributes || t.attributes.includes(attribute)) &&
        (!t.noncombat || ["craft", "treatment"].includes(mode))
      ) {
        bonus += t.daily;
        h.traitUses[t.id] = this.clock().day;
        h.preparedTraits = h.preparedTraits.filter((id) => id !== t.id);
        this.note(
          `${h.name} · ${this.C.choices.find((c) => c.id === t.id).name}: +${t.daily} Boons · used for today.`,
        );
      }
    }
    if (mode === "attack") h.traitUses.packTurn = this.encounter?.serial;
    let result = this.roll(
      this.attribute(h, attribute),
      boons + Math.max(0, bonus),
      banes + Math.max(0, -bonus),
    );
    const debt = traits.find(
      (t) =>
        t.debt &&
        h.preparedTraits?.includes(t.id) &&
        h.traitUses[t.id] !== this.clock().day,
    );
    if (debt && result.tier === "weak" && h.survival.hp > 1) {
      h.survival.hp--;
      h.unavailableHp = {
        amount:
          1 +
          (h.unavailableHp?.until > this.clock().seconds
            ? h.unavailableHp.amount
            : 0),
        until:
          this.clock().seconds +
          86400 -
          ((this.clock().seconds + 7200) % 86400),
      };
      h.traitUses[debt.id] = this.clock().day;
      h.preparedTraits = h.preparedTraits.filter((id) => id !== debt.id);
      result = this.roll(
        this.attribute(h, attribute),
        boons + Math.max(0, bonus),
        banes + Math.max(0, -bonus),
      );
      this.note(
        `${h.name} calls on the oath: rerolled to ${result.tier}; 1 HP unavailable until dawn.`,
      );
    }
    return result;
  },
  creatureIdentity(e) {
    return e
      ? `${this.campaign.seed}:${this.campaign.depth}:${this.campaign.lootGeneration}:${e.id}`
      : "";
  },
  healingMaximum(h) {
    return Math.max(
      1,
      h.survival.maxHp -
        (h.unavailableHp?.until > this.clock().seconds
          ? h.unavailableHp.amount
          : 0),
    );
  },
};
