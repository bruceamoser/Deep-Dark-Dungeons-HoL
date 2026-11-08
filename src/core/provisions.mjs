export const SUPPLY_CADENCE = Object.freeze({
  foodSteps: 80,
  waterSteps: 40,
  lightSteps: 25,
  foodHours: 4,
  waterHours: 2,
  lightHours: 1,
});
export function prepareProvisions(campaign) {
  campaign.provisionTrail ??= { steps: 0, seconds: 0 };
  for (const n of [
    campaign.provisionTrail.steps,
    campaign.provisionTrail.seconds,
  ])
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("Invalid saved supply progress.");
}
export const provisionMethods = {
  provisionCheck(h, catalogId, purpose) {
    const field = catalogId === "item-food-bundle" ? "ateAt" : "drankAt",
      due = field === "ateAt" ? "foodDue" : "waterDue";
    const item = this.supplyItem(h, catalogId);
    if (item) {
      h.needs[field] = this.clock().seconds;
      h.needs[due] = false;
      h.needs.warned = h.needs.warned.filter((k) => k !== field);
      this.checkSupply(h, item, purpose);
      return;
    }
    h.needs[due] = true;
    if (!h.needs.warned.includes(field)) {
      h.needs.warned.push(field);
      this.supplyNotice(
        h,
        { name: field === "ateAt" ? "Food" : "Water" },
        `No usable ${field === "ateAt" ? "food" : "water"} for this provision check. Replenish the company's supplies.`,
      );
    }
  },
  movementSupplies(steps = 1) {
    if (!Number.isSafeInteger(steps) || steps < 0)
      throw new Error("Movement must be whole nonnegative steps.");
    if (!["exploration", "combat"].includes(this.mode) || !steps) return;
    prepareProvisions(this.campaign);
    const trail = this.campaign.provisionTrail,
      before = trail.steps;
    trail.steps += steps;
    for (const [n, id, name] of [
      [SUPPLY_CADENCE.waterSteps, "item-water-flask", "water"],
      [SUPPLY_CADENCE.foodSteps, "item-food-bundle", "food"],
    ])
      for (let i = Math.floor(before / n); i < Math.floor(trail.steps / n); i++)
        for (const h of this.party.filter(
          (h) => h.survival.status === "active",
        ))
          this.provisionCheck(h, id, `${name} after ${n} party steps`);
    for (const h of this.party.filter((h) => h.torch?.lit)) {
      h.torch.steps = (h.torch.steps ?? 0) + steps;
      while (h.torch.steps >= SUPPLY_CADENCE.lightSteps) {
        h.torch.steps -= SUPPLY_CADENCE.lightSteps;
        const item = this.supplyItem(h, "item-lighting-bundle");
        if (!item) {
          h.torch.lit = false;
          h.torch.steps %= SUPPLY_CADENCE.lightSteps;
          break;
        }
        this.checkSupply(
          h,
          item,
          `torch after ${SUPPLY_CADENCE.lightSteps} party steps`,
        );
      }
    }
    this.syncTorches();
  },
  stationarySupplies(seconds, { camping = false } = {}) {
    if (this.mode !== "exploration" || !seconds) return;
    prepareProvisions(this.campaign);
    const trail = this.campaign.provisionTrail,
      before = trail.seconds;
    trail.seconds += seconds;
    for (const [hours, id, name] of [
      [SUPPLY_CADENCE.waterHours, "item-water-flask", "water"],
      [SUPPLY_CADENCE.foodHours, "item-food-bundle", "food"],
    ])
      for (
        let i = Math.floor(before / (hours * 3600));
        i < Math.floor(trail.seconds / (hours * 3600));
        i++
      )
        for (const h of this.party.filter(
          (h) => h.survival.status === "active",
        ))
          this.provisionCheck(h, id, `${name} after ${hours} hours at rest`);
    if (camping) {
      for (
        let i = Math.floor(before / 3600);
        i < Math.floor(trail.seconds / 3600);
        i++
      ) {
        const owner = this.party.find(
          (h) => this.canAct(h) && this.supplyItem(h, "item-lighting-bundle"),
        );
        const magic = this.party.some((h) => this.canAct(h) && h.lantern);
        this.campaign.camp.fireLit = !!(owner || magic);
        if (owner)
          this.checkSupply(
            owner,
            this.supplyItem(owner, "item-lighting-bundle"),
            "campfire fuel for one hour",
          );
        else if (!magic)
          this.campEvent(
            "No lighting supplies remain. The campfire goes dark.",
          );
        this.campLight();
      }
    } else
      for (const h of this.party.filter((h) => h.torch?.lit)) {
        h.torch.seconds += seconds;
        while (h.torch.seconds >= 3600) {
          h.torch.seconds -= 3600;
          const item = this.supplyItem(h, "item-lighting-bundle");
          if (!item) {
            h.torch.lit = false;
            break;
          }
          this.checkSupply(h, item, "torch during one hour of stationary work");
        }
      }
  },
  provisionCountdown() {
    prepareProvisions(this.campaign);
    const p = this.campaign.provisionTrail;
    return {
      food: SUPPLY_CADENCE.foodSteps - (p.steps % SUPPLY_CADENCE.foodSteps),
      water: SUPPLY_CADENCE.waterSteps - (p.steps % SUPPLY_CADENCE.waterSteps),
      foodHours:
        SUPPLY_CADENCE.foodHours -
        ((p.seconds / 3600) % SUPPLY_CADENCE.foodHours),
      waterHours:
        SUPPLY_CADENCE.waterHours -
        ((p.seconds / 3600) % SUPPLY_CADENCE.waterHours),
    };
  },
};
