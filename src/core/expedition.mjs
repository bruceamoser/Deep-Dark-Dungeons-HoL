import { distance, lineOfSight } from "./dungeon.mjs";
import {
  partyCanSee,
  heroCanSee,
  visionPenalty,
  naturallyLit,
  magicallyLit,
} from "./lighting.mjs";

// Computer-game time/survival adaptation. HoL has no exhaustion track. Keep
// these values separate from the immutable source and never replenish Grit.
export const EXPEDITION_TIME = Object.freeze({
  explorationStep: 10,
  combatRound: 6,
  dailyNeeds: 24 * 3600,
  awakeLimit: 16 * 3600,
  fatigueStep: 4 * 3600,
  sleep: 8 * 3600,
});
export const SUPPLY_DICE = Object.freeze({
  "item-food-bundle": 8,
  "item-water-flask": 6, // A filled flask gains a supply die in this adaptation.
  "item-lighting-bundle": 6,
});
export function prepareExpedition(campaign) {
  campaign.clockSeconds ??= (campaign.hours ?? 0) * 3600;
  if (!Number.isSafeInteger(campaign.clockSeconds) || campaign.clockSeconds < 0)
    throw new Error("Invalid world clock.");
  campaign.supplyNotices ??= [];
  if (
    !Array.isArray(campaign.supplyNotices) ||
    campaign.supplyNotices.some(
      (n) => !n || typeof n.id !== "string" || typeof n.message !== "string",
    )
  )
    throw new Error("Invalid supply notices.");
  for (const h of [...campaign.party, ...(campaign.reserve ?? [])]) {
    if (
      h.unavailableHp &&
      (!Number.isSafeInteger(h.unavailableHp.amount) ||
        h.unavailableHp.amount < 1 ||
        !Number.isSafeInteger(h.unavailableHp.until) ||
        h.unavailableHp.until < 0)
    )
      throw new Error("Invalid saved unavailable HP.");
    if (
      h.tactics &&
      (!Array.isArray(h.tactics) ||
        h.tactics.some(
          (t) =>
            !t ||
            typeof t.id !== "string" ||
            typeof t.source !== "string" ||
            !Number.isSafeInteger(t.expires) ||
            t.expires < 0 ||
            !t.effects ||
            typeof t.effects !== "object",
        ))
    )
      throw new Error("Invalid saved tactical effects.");
    if (
      h.preparedTraits &&
      (!Array.isArray(h.preparedTraits) ||
        h.preparedTraits.some((t) => typeof t !== "string"))
    )
      throw new Error("Invalid prepared ancestry gifts.");
    h.needs ??= {
      restedAt: campaign.clockSeconds,
      ateAt: campaign.clockSeconds,
      drankAt: campaign.clockSeconds,
      sleepProgress: 0,
      warned: [],
    };
    for (const field of ["restedAt", "ateAt", "drankAt", "sleepProgress"])
      if (!Number.isSafeInteger(h.needs[field]) || h.needs[field] < 0)
        throw new Error("Invalid saved daily needs.");
    h.needs.warned ??= [];
    h.torch ??= {
      held: false,
      lit: false,
      seconds: 0,
      steps: 0,
      supplyId: null,
    };
    if (h.torch.steps === undefined) {
      h.torch.steps = Math.floor((Math.min(1799, h.torch.seconds) * 25) / 1800);
      h.torch.seconds = 0;
    }
    if (!Number.isSafeInteger(h.torch.steps) || h.torch.steps < 0)
      throw new Error("Invalid saved torch movement.");
    if (
      !Number.isSafeInteger(h.torch.seconds) ||
      h.torch.seconds < 0 ||
      typeof h.torch.held !== "boolean"
    )
      throw new Error("Invalid saved torch.");
  }
}
export const expeditionMethods = {
  lanternReason(index) {
    const h = this.party[index];
    if (!h.preview.state.abilities.includes("ability-lantern-in-the-palm"))
      return "Learn Lantern in the Palm first.";
    if (!this.canAct(h) || this.busy) return "This hero cannot cast now.";
    if (!h.lantern && this.freeHands(h) < 1)
      return "Casting requires a free hand.";
    if (
      this.mode === "combat" &&
      (h !== this.active || this.encounter.nextSide !== "players")
    )
      return "Cast on this hero’s turn.";
    if (
      !h.lantern &&
      !this.continuingProvocation &&
      this.mode === "combat" &&
      this.encounter.current &&
      !this.budget?.remaining.maneuver
    )
      return "Requires a Maneuver.";
    return "";
  },
  toggleLantern(index) {
    const reason = this.lanternReason(index);
    if (reason) throw new Error(reason);
    const h = this.party[index];
    if (!h.lantern && this.mode === "combat") {
      this.spend("maneuver", "ability-lantern-in-the-palm");
      if (this.provoke(h, { kind: "lantern", index, label: "casting a light" }))
        return;
    }
    h.lantern = !h.lantern;
    this.syncTorches();
    this.note(
      `${h.name} ${h.lantern ? "casts Lantern in the Palm · radius 3 · hands remain free after casting" : "ends the magical light"}.`,
    );
    this.emit("light");
    this.emit("change");
  },
  canSee(p) {
    return partyCanSee(this.map, this.party, p);
  },
  heroCanSee(h, p) {
    return heroCanSee(this.map, this.party, h, p);
  },
  visionPenalty(h, p) {
    return visionPenalty(this.map, this.party, h, p);
  },
  freeHands(h) {
    return (
      2 -
      Number(!!h.torch?.held) -
      h.preview.inventory.items
        .filter((i) => i.carried && i.held)
        .reduce((n, i) => n + (i.hands ?? 0), 0)
    );
  },
  torchReason(index) {
    const h = this.party[index];
    if (!this.canAct(h)) return "This hero cannot carry a torch.";
    if (this.busy || !["town", "exploration", "combat"].includes(this.mode))
      return "Wait for your company’s turn.";
    if (
      this.mode === "combat" &&
      (h !== this.active || this.encounter.nextSide !== "players")
    )
      return "Only the acting hero can ready a torch.";
    if (!h.torch?.held && this.freeHands(h) < 1)
      return "Requires a free hand. Stow a weapon or shield first.";
    if (!h.torch?.held && !this.supplyItem(h, "item-lighting-bundle"))
      return "No usable lighting supplies. Buy a Lighting Bundle.";
    if (
      this.mode === "combat" &&
      !this.continuingProvocation &&
      (this.encounter.current ? (this.budget?.remaining.maneuver ?? 0) : 1) < 1
    )
      return "Requires one Maneuver.";
    return "";
  },
  toggleTorch(index) {
    prepareExpedition(this.campaign);
    const reason = this.torchReason(index);
    if (reason) throw new Error(reason);
    const h = this.party[index];
    if (this.mode === "combat")
      this.spend("maneuver", "ability-handle-an-item");
    if (this.provoke(h, { kind: "torch", index, label: "handling a torch" }))
      return;
    h.torch.held = !h.torch.held;
    this.syncTorches();
    this.note(
      `${h.name} ${h.torch.held ? "readies a torch · one hand occupied; automatically lit only in darkness" : "stows the torch · hand freed"}.`,
    );
    this.emit("party");
    this.emit("change");
  },
  syncTorches({ silent = false } = {}) {
    prepareExpedition(this.campaign);
    let changed = false;
    for (const h of this.party) {
      const before = h.torch.lit;
      const usedHands = h.preview.inventory.items
        .filter((i) => i.carried && i.held)
        .reduce((n, i) => n + (i.hands ?? 0), 0);
      if (usedHands > 1 || !this.canAct(h)) h.torch.held = false;
      const supply = this.supplyItem(h, "item-lighting-bundle");
      h.torch.supplyId = supply?.instanceId ?? null;
      h.torch.lit = !!(
        h.torch.held &&
        supply &&
        this.mode !== "town" &&
        !naturallyLit(this.map, h) &&
        !magicallyLit(this.map, this.party, h)
      );
      changed ||= before !== h.torch.lit;
    }
    if (changed && !silent) this.emit("light");
  },
  finishCombatTurn() {
    const round = this.encounter.round;
    this.encounter = this.R.finishTurn(this.encounter);
    if (this.encounter.round !== round)
      this.advanceTime(EXPEDITION_TIME.combatRound);
  },
  clock() {
    const seconds = this.campaign.clockSeconds ?? this.campaign.hours * 3600;
    const shifted = seconds + 8 * 3600;
    return {
      seconds,
      day: Math.floor(shifted / 86400) + 1,
      hour: Math.floor(shifted / 3600) % 24,
      minute: Math.floor(shifted / 60) % 60,
    };
  },
  needs(h) {
    const now = this.clock().seconds,
      n = h.needs;
    if (!n) return { awake: 0, fatigue: 0, hungry: false, thirsty: false };
    const awake = Math.max(0, now - n.restedAt);
    const limit =
      Math.max(16, ...this.traits(h).map((t) => t.awakeHours ?? 16)) * 3600;
    return {
      awake,
      fatigue:
        awake < limit
          ? 0
          : Math.min(
              3,
              1 + Math.floor((awake - limit) / EXPEDITION_TIME.fatigueStep),
            ),
      hungry: !!n.foodDue || now - n.ateAt >= EXPEDITION_TIME.dailyNeeds,
      thirsty: !!n.waterDue || now - n.drankAt >= EXPEDITION_TIME.dailyNeeds,
    };
  },
  fatigueSources(h) {
    const n = this.needs(h);
    return [
      {
        kind: "bane",
        amount: Math.min(3, n.fatigue + Number(n.hungry) + Number(n.thirsty)),
        label: "Fatigue, hunger and thirst",
      },
    ];
  },
  supplyValue(h, item) {
    return (
      h.supplies[item.instanceId] ??
      item.inventoryDie ??
      SUPPLY_DICE[item.catalogId] ??
      0
    );
  },
  supplyItem(h, catalogId) {
    return h.preview.inventory.items.find(
      (i) =>
        i.carried && i.catalogId === catalogId && this.supplyValue(h, i) > 0,
    );
  },
  supplyNotice(h, item, message) {
    const notice = {
      id: crypto.randomUUID(),
      heroId: h.heroId,
      name: h.name,
      item: item.definition?.name ?? item.name ?? "Supplies",
      message,
    };
    this.campaign.supplyNotices.push(notice);
    this.emit("supply", notice);
  },
  checkSupply(h, item, purpose, retained = null) {
    const die = this.supplyValue(h, item);
    if (!die) throw new Error(`${item.definition.name} is empty.`);
    const result = this.R.inventoryCheck({
      die,
      retained:
        retained ??
        (purpose === "crafting materials" &&
        this.traits(h).some((t) => t.salvage)
          ? Math.max(this.supplyDie(die), this.supplyDie(die))
          : this.supplyDie(die)),
    });
    h.supplies[item.instanceId] = result.after;
    const owned = h.treasure?.find((i) => i.instanceId === item.instanceId);
    if (result.exhausted && owned?.reserveDice?.length) {
      const next = owned.reserveDice.shift();
      h.supplies[item.instanceId] = next;
      owned.supplyRemaining = next;
      item.reserveDice = [...owned.reserveDice];
      this.note(
        `${h.name} · ${purpose}: ${item.definition.name} d${die}, rolled ${result.retained}; next combined supply d${next}.`,
      );
      return { ...result, after: next, exhausted: false, continued: true };
    }
    if (owned?.reserveDice) owned.supplyRemaining = result.after;
    this.note(
      `${h.name} · ${purpose}: ${item.definition.name} d${die}, rolled ${result.retained}${result.exhausted ? " · exhausted after use" : result.after !== die ? ` → d${result.after}` : " · retained"}.`,
    );
    if (result.exhausted)
      this.supplyNotice(
        h,
        item,
        `${item.definition.name} is exhausted. This final use still takes effect.`,
      );
    return result;
  },
  acknowledgeSupply(id) {
    this.campaign.supplyNotices = this.campaign.supplyNotices.filter(
      (n) => n.id !== id,
    );
    this.emit("change");
  },
  autoProvisions() {
    for (const h of this.party.filter((h) => h.survival.status === "active")) {
      for (const [field, catalogId, verb] of [
        ["ateAt", "item-food-bundle", "eats a daily meal"],
        ["drankAt", "item-water-flask", "drinks a daily water ration"],
      ]) {
        if (
          !h.needs[field === "ateAt" ? "foodDue" : "waterDue"] &&
          this.clock().seconds - h.needs[field] < EXPEDITION_TIME.dailyNeeds
        )
          continue;
        const item = this.supplyItem(h, catalogId);
        if (item) {
          h.needs[field] = this.clock().seconds;
          h.needs[field === "ateAt" ? "foodDue" : "waterDue"] = false;
          h.needs.warned = h.needs.warned.filter((k) => k !== field);
          this.checkSupply(h, item, verb);
        } else if (!h.needs.warned.includes(field)) {
          h.needs.warned.push(field);
          this.supplyNotice(
            h,
            { name: field === "ateAt" ? "Food" : "Water" },
            `No usable ${field === "ateAt" ? "food" : "water"} remains. Buy or make supplies; water flasks can be refilled in town.`,
          );
        }
      }
    }
  },
  advanceTime(
    seconds,
    { sleeping = false, sleepingHeroes = null, provisions = false } = {},
  ) {
    if (!Number.isSafeInteger(seconds) || seconds < 0)
      throw new Error("Time must be whole nonnegative seconds.");
    prepareExpedition(this.campaign);
    this.campaign.clockSeconds += seconds;
    this.expireBattlefield();
    this.campaign.hours = Math.floor(this.campaign.clockSeconds / 3600);
    for (const h of this.party.filter((h) => h.survival.status !== "dead")) {
      const asleep = sleeping || sleepingHeroes?.includes(h.heroId);
      if (asleep && h.survival.status === "active") {
        h.needs.restedAt += seconds; // Sleep itself is not time spent awake.
        h.needs.sleepProgress += seconds;
        if (
          h.needs.sleepProgress >=
          (sleepingHeroes ? 6 * 3600 : EXPEDITION_TIME.sleep)
        ) {
          h.needs.restedAt = this.clock().seconds;
          h.needs.sleepProgress = 0;
          h.restPowerUses = {};
          h.needs.warned = h.needs.warned.filter((k) => k !== "fatigue");
        }
      }
      if (this.needs(h).fatigue && !h.needs.warned.includes("fatigue")) {
        h.needs.warned.push("fatigue");
        this.supplyNotice(
          h,
          { name: "Rest needed" },
          `This hero has been awake for ${Math.floor(this.needs(h).awake / 3600)} hours and is getting tired. Sleep to remove fatigue.`,
        );
      }
    }
    if (provisions && seconds >= 60)
      this.stationarySupplies(seconds, { camping: !!sleepingHeroes });
    if (provisions) this.autoProvisions();
    if (!sleeping && !sleepingHeroes)
      for (const h of this.party) h.needs.sleepProgress = 0;
    this.emit("time");
  },
  refillWater(index) {
    if (this.mode !== "town") throw new Error("Use the well in Greyhaven.");
    const h = this.party[index],
      flasks = h.preview.inventory.items.filter(
        (i) => i.carried && i.catalogId === "item-water-flask",
      );
    if (!flasks.length) throw new Error("This hero needs a water flask.");
    for (const item of flasks)
      h.supplies[item.instanceId] = Math.max(6, this.supplyValue(h, item));
    this.note(
      `${h.name} refills ${flasks.length} water flask${flasks.length === 1 ? "" : "s"} at the well.`,
    );
    this.autoProvisions();
    this.emit("change");
  },
  sleepReason() {
    if (this.party.some((h) => h.wounds.some((w) => !w.applied)))
      return "Resolve outstanding wounds before making camp.";
    if (!["town", "exploration"].includes(this.mode))
      return "Finish the encounter before sleeping.";
    if (
      this.party.some((h) => ["dying", "lastWords"].includes(h.survival.status))
    )
      return "Resolve your companions’ survival first.";
    if (
      this.party.some((h) =>
        h.conditions.some((c) =>
          ["burning", "bleeding", "freezing", "poisoned"].includes(c.key),
        ),
      )
    )
      return "Treat ongoing harmful conditions before sleeping.";
    if (
      this.mode !== "town" &&
      this.enemies.some(
        (e) =>
          e.hp > 0 &&
          this.party.some(
            (h) => distance(h, e) <= 8 && lineOfSight(this.map, h, e),
          ),
      )
    )
      return "Enemies are too close to make camp.";
    return "";
  },
  sleepHour() {
    if (this.mode !== "town")
      throw new Error("Choose duties in the dungeon camp screen.");
    const reason = this.sleepReason();
    if (reason) throw new Error(reason);
    this.paths.clear();
    for (const h of this.party) h.torch.lit = false;
    this.advanceTime(3600, { sleeping: true, provisions: true });
    for (const h of this.party.filter((h) => h.survival.status === "active")) {
      const before = h.survival.hp;
      h.survival = this.R.receiveHealing(h.survival, 2);
      h.survival.hp = Math.max(
        before,
        Math.min(h.survival.hp, this.healingMaximum(h)),
      );
    }
    this.note("The company sleeps for one hour. Wounds and spent Grit remain.");
    return { interrupted: false };
  },
};
