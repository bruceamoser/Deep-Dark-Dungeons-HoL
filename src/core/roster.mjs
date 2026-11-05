import { xpForLevel, levelForXP } from "./experience.mjs";

export function storedHero(hero) {
  const { preview, ...record } = hero;
  return structuredClone(record);
}
export function prepareRoster(campaign) {
  campaign.reserve ??= [];
  campaign.fallenHeroes ??= [];
  campaign.pendingTreasureXP ??= 0;
  if (
    !Array.isArray(campaign.reserve) ||
    !Array.isArray(campaign.fallenHeroes) ||
    !Number.isSafeInteger(campaign.pendingTreasureXP) ||
    campaign.pendingTreasureXP < 0
  )
    throw new Error("Invalid saved hero repository.");
  for (const h of [...campaign.party, ...campaign.reserve]) {
    h.heroId ??= crypto.randomUUID();
    h.xp ??= xpForLevel(h.earnedLevel ?? h.draft.progression?.level ?? 1);
    h.xpHistory ??= [];
  }
}
export function validateRoster(campaign) {
  const heroes = [...campaign.party, ...campaign.reserve];
  if (new Set(heroes.map((h) => h.heroId)).size !== heroes.length)
    throw new Error("A hero cannot occupy more than one roster position.");
  const fallen = new Set();
  for (const entry of campaign.fallenHeroes) {
    if (
      !entry?.hero ||
      entry.heroId !== entry.hero.heroId ||
      entry.hero.survival.status !== "dead" ||
      fallen.has(entry.heroId) ||
      !Number.isSafeInteger(entry.depth) ||
      entry.depth < 1 ||
      !Number.isSafeInteger(entry.expedition) ||
      entry.expedition < 0
    )
      throw new Error("Invalid fallen hero record.");
    fallen.add(entry.heroId);
  }
  for (const h of [...heroes, ...campaign.fallenHeroes.map((e) => e.hero)]) {
    if (
      typeof h.heroId !== "string" ||
      !h.heroId ||
      !Number.isSafeInteger(h.xp) ||
      h.xp < xpForLevel(h.earnedLevel) ||
      levelForXP(h.xp) !== h.earnedLevel ||
      !Array.isArray(h.xpHistory) ||
      h.xpHistory.some(
        (e) =>
          !Number.isSafeInteger(e.amount) ||
          e.amount < 0 ||
          typeof e.reason !== "string",
      ) ||
      (fallen.has(h.heroId) && h.survival.status !== "dead")
    )
      throw new Error("Invalid hero identity or experience.");
  }
}
export const rosterMethods = {
  livingRoster() {
    return [...this.party, ...this.campaign.reserve].filter(
      (h) => h.survival.status !== "dead",
    );
  },
  recordFallen() {
    if (!this.campaign?.fallenHeroes) return;
    for (const h of [...this.party, ...this.campaign.reserve]) {
      if (
        h.survival.status !== "dead" ||
        this.campaign.fallenHeroes.some((e) => e.heroId === h.heroId)
      )
        continue;
      this.campaign.fallenHeroes.push({
        heroId: h.heroId,
        hero: storedHero(h),
        name: h.name,
        depth: this.campaign.depth,
        expedition: this.campaign.expeditions,
        cause: h.lastHarm ?? "Final death after the survival procedure",
        hours: this.campaign.hours,
      });
    }
    this.campaign.reserve = this.campaign.reserve.filter(
      (h) => h.survival.status !== "dead",
    );
  },
  createRecruit(draft) {
    if (!["town", "defeat"].includes(this.mode))
      throw new Error("Create heroes in Greyhaven.");
    if ((draft.progression?.level ?? 1) !== 1)
      throw new Error(
        "New recruits start at level 1. Use development for earned levels.",
      );
    const h = this.hero(draft, `reserve-${crypto.randomUUID()}`);
    this.campaign.reserve.push(h);
    this.note(
      `${h.name} entered the company register. Choose a party slot when ready.`,
    );
    this.emit("change");
    return h;
  },
  assignHero(index, heroId) {
    if (!["town", "defeat"].includes(this.mode))
      throw new Error("Choose companions in Greyhaven.");
    if (!Number.isInteger(index) || !this.party[index])
      throw new Error("Choose one of the four party slots.");
    const h = this.livingRoster().find((hero) => hero.heroId === heroId);
    if (!h || this.campaign.fallenHeroes.some((e) => e.heroId === heroId))
      throw new Error("That hero is no longer available.");
    this.recordFallen();
    const previous = this.party[index],
      other = this.party.indexOf(h);
    if (other === index) return;
    const position = { x: previous.x, z: previous.z };
    if (other >= 0) {
      Object.assign(previous, {
        id: `hero-${other}`,
        x: h.x,
        z: h.z,
        selected: this.selected === other,
      });
      this.party[other] = previous;
    } else {
      this.campaign.reserve = this.campaign.reserve.filter(
        (hero) => hero !== h,
      );
      if (previous.survival.status !== "dead") {
        previous.id = `reserve-${previous.heroId}`;
        previous.selected = false;
        this.campaign.reserve.push(previous);
      }
    }
    Object.assign(h, position, {
      id: `hero-${index}`,
      selected: this.selected === index,
    });
    this.party[index] = h;
    this.emit("party");
    this.emit("change");
  },
  returnAfterDefeat() {
    if (this.mode !== "defeat") return;
    this.recordFallen();
    this.mode = "town";
    this.busy = false;
    this.pendingDefense = null;
    this.woundNotices = [];
    this.campaign.depth = 1;
    this.newFloor();
    this.note(
      "The survivors return to Greyhaven. Choose the next company from the register.",
    );
    this.emit("change");
  },
};
