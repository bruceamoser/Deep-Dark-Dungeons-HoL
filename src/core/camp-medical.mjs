import { POWERS } from "./powers.mjs";
import { ABILITIES } from "./abilities.mjs";
const treatmentCards = {
  Bone: "treat-bone",
  Elemental: "treat-elemental-injury",
  Life: "treat-life-injury",
  Mental: "treat-mental-trauma",
  Radiant: "treat-radiant-injury",
  "Soft Tissue": "treat-soft-tissue",
};
export const CAMP_SUPPLIES = [
  ["Food", "item-food-bundle"],
  ["Water", "item-water-flask"],
  ["Light", "item-lighting-bundle"],
  ["Arrows", "item-ammunition-bundle"],
  ["Dressings", "item-field-dressing"],
  [
    "Healing potions",
    [
      "item-lesser-healing-bottle",
      "item-greater-healing-bottle",
      "item-superior-healing-bottle",
    ],
  ],
  ["Restoration", "item-restoration-draught"],
  ["Materials", "item-material-bundle"],
];
export const campMedicalMethods = {
  campHealSkills(h) {
    return [...new Set(this.powerIds(h))].filter(
      (id) =>
        POWERS[id]?.effects?.some(
          (e) =>
            e.kind === "heal" || (e.kind === "zone" && e.surface === "healing"),
        ) || ABILITIES[id]?.healing,
    );
  },
  campMedicalSupply(id) {
    for (const h of this.party.filter((p) => this.canAct(p))) {
      const item = this.supplyItem(h, id);
      if (item) return { hero: h, item };
    }
    return null;
  },
  campMedicalTarget(target = {}) {
    const patient = this.party.find((p) => p.heroId === target.heroId);
    return {
      patient,
      wound: patient?.wounds.find((w) => w.id === target.woundId),
    };
  },
  campMedicalReason(h, duty, target = {}) {
    const { patient, wound } = this.campMedicalTarget(target);
    if (
      !patient ||
      ["dead", "lastWords", "dying"].includes(patient.survival.status)
    )
      return "Choose a living, stabilized patient.";
    if (duty === "heal") {
      if (!this.campHealSkills(h).length)
        return "This hero has no learned HP-healing skill.";
      if (patient.survival.hp >= this.healingMaximum(patient))
        return "This companion is already at available maximum HP.";
      return this.campMedicalSupply("item-field-dressing")
        ? ""
        : "No usable field dressings; no HP boost.";
    }
    if (!wound || wound.treatment?.completed)
      return "Choose an untreated wound.";
    if (
      !this.campHealSkills(h).length &&
      !this.treatmentOptions(patient, wound).some(
        (o) => this.party[o.healer] === h,
      )
    )
      return "Requires an HP-healing skill or matching wound-treatment skill.";
    const dayKey = `day-${this.clock().day}`;
    if (wound.record.recoveryValue) {
      if (wound.treatment?.attempts?.some((a) => a.dayKey === dayKey))
        return "This wound has already had its treatment attempt today.";
      return this.campMedicalSupply("item-field-dressing")
        ? ""
        : "Wound treatment requires a field dressing.";
    }
    if (wound.campCare && wound.campCare.minutes < wound.campCare.required)
      return "";
    return this.campMedicalSupply("item-restoration-draught")
      ? ""
      : "This severe injury requires a restoration draught and four hours of care.";
  },
  campMedicalDuty(h, duty, target) {
    const { patient, wound } = this.campMedicalTarget(target),
      reason = this.campMedicalReason(h, duty, target);
    if (reason) {
      this.campEvent(`${h.name}: ${reason}`);
      return;
    }
    if (duty === "heal") {
      const skills = this.campHealSkills(h).length,
        supply = this.campMedicalSupply("item-field-dressing");
      const before = patient.survival.hp;
      patient.survival = this.R.receiveHealing(
        patient.survival,
        Math.min(
          4 * skills,
          Math.max(0, this.healingMaximum(patient) - before),
        ),
      );
      this.checkSupply(supply.hero, supply.item, "camp healing dressings");
      this.campEvent(
        `${h.name} tends ${patient.name}: +${patient.survival.hp - before} HP (${skills} healing skill${skills === 1 ? "" : "s"}); dressing checked.`,
      );
      return;
    }
    if (!wound.record.recoveryValue) {
      if (!wound.campCare) {
        const supply = this.campMedicalSupply("item-restoration-draught");
        supply.hero.supplies[supply.item.instanceId] = 0;
        wound.campCare = {
          minutes: 0,
          required: this.careQuote(this.party.indexOf(patient), wound.id)
            .minutes,
          dayKey: `day-${this.clock().day}`,
        };
      }
      wound.campCare.minutes += 60;
      if (wound.campCare.minutes >= wound.campCare.required)
        this.completeWound(patient, wound, "camp restoration care");
      this.campEvent(
        `${h.name} treats ${patient.name}'s ${wound.record.injury}: ${Math.min(wound.campCare.minutes, wound.campCare.required)}/${wound.campCare.required} minutes${wound.treatment?.completed ? " · treated; scar remains" : ""}.`,
      );
      return;
    }
    const cardId = treatmentCards[wound.record.capability],
      card = this.R.treatmentCardAdapter(cardId, this.C.inventory);
    const reservation = this.R.reserveWoundTreatment({
      operationId: `camp-care-${crypto.randomUUID()}`,
      dayKey: `day-${this.clock().day}`,
      elapsedHours: 1,
      cardId,
      woundId: wound.record.id,
      woundEventId: wound.id,
      inventoryCatalog: this.C.inventory,
      woundCatalog: this.C.wounds,
      treatment: wound.treatment ?? null,
      healer: {
        actorId: h.id,
        survival: h.survival,
        learnedAbilityIds: [...h.preview.state.abilities, card.catalogId],
        ownTurn: true,
        turn: this.R.startTurn({
          turnId: `camp-care-${crypto.randomUUID()}`,
          speed: this.speed(h),
        }),
        conditions: this.restrictions(h),
      },
      target: {
        actorId: patient.id,
        survival: patient.survival,
        relation: patient === h ? "self" : "other",
        willing: true,
        kind: "character",
      },
      woundApplicable: true,
    });
    const supply = this.campMedicalSupply("item-field-dressing");
    const roll = this.heroRoll(h, card.attribute, "treatment");
    const settled = this.R.settleWoundTreatment({
      reservation,
      currentTreatment: reservation.treatment,
      attribute: card.attribute,
      outcome: roll.tier,
    });
    wound.treatment = structuredClone(settled.treatment);
    this.checkSupply(supply.hero, supply.item, "camp wound dressings");
    if (wound.treatment.completed)
      patient.conditions = patient.conditions.filter(
        (c) => !(c.woundId === wound.id && c.persistence === "starred"),
      );
    this.campEvent(
      `${h.name} treats ${patient.name}'s ${wound.record.injury}: ${roll.tier}, recovery ${wound.treatment.progress}/${wound.record.recoveryValue}${wound.treatment.completed ? " · penalties relieved; scar remains" : " · today's attempt used"}.`,
    );
  },
  campForecast(assignments, total, targets = {}) {
    const run = (favorable) => {
      const copy = Object.assign(
        Object.create(Object.getPrototypeOf(this)),
        this,
        {
          campaign: structuredClone(this.campaign),
          map: structuredClone(this.map),
          enemies: [],
          paths: new Map(),
          log: [],
          listeners: [],
          notify: () => {},
          note: () => {},
          emit: () => {},
          campWanderers: () => [],
          supplyNotice: () => {},
          dice: (n = 3) => Array(n).fill(favorable ? 6 : 1),
          supplyDie: (die) => (favorable ? die : 1),
          heroRoll: () => ({ tier: favorable ? "strong" : "weak" }),
        },
      );
      copy.campaign.supplyNotices = [];
      if (!this.campCanResume()) copy.startCamp(assignments, total, targets);
      // Forecasts bound all supply/treatment rolls, with no wandering interruption.
      let count = 0;
      while (copy.campCanResume() && count++ < 96) copy.campHour();
      return copy.party;
    };
    return { low: run(false), high: run(true) };
  },
};
