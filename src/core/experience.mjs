export const XP_RULES = Object.freeze({
  firstLevel: 1000,
  levelGrowth: 250,
  room: 60,
  roomDepth: 10,
  enemy: 100,
  enemyDepth: 20,
  coin: 5,
});
export function xpForLevel(level) {
  const n = Math.max(0, Math.min(100, level) - 1);
  return n * XP_RULES.firstLevel + (n * (n - 1) * XP_RULES.levelGrowth) / 2;
}
export function levelForXP(xp) {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  return level;
}
export function xpProgress(hero) {
  const level = Math.max(hero.earnedLevel, levelForXP(hero.xp ?? 0));
  const floor = xpForLevel(level),
    next = level < 100 ? xpForLevel(level + 1) : null;
  return {
    level,
    total: hero.xp ?? 0,
    current: (hero.xp ?? 0) - floor,
    required: next === null ? 0 : next - floor,
    next,
    percent:
      next === null
        ? 100
        : Math.max(
            0,
            Math.min(100, (((hero.xp ?? 0) - floor) / (next - floor)) * 100),
          ),
  };
}
export const experienceMethods = {
  awardXP(claim, amount, reason) {
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error("Invalid XP award.");
    this.map.xpClaims ??= [];
    if (this.map.xpClaims.includes(claim) || amount === 0) return false;
    const recipients = this.party.filter((h) => h.survival.status !== "dead");
    if (!recipients.length) return false;
    this.map.xpClaims.push(claim);
    for (const h of recipients) {
      h.xp = (h.xp ?? xpForLevel(h.earnedLevel)) + amount;
      h.earnedLevel = Math.max(h.earnedLevel, levelForXP(h.xp));
      h.xpHistory ??= [];
      h.xpHistory.push({
        amount,
        reason,
        depth: this.campaign.depth,
        expedition: this.campaign.expeditions,
      });
      h.xpHistory = h.xpHistory.slice(-40);
    }
    this.note(`+${amount} XP each · ${reason}.`);
    this.emit("xp", { amount, reason });
    return true;
  },
  discoverRooms() {
    if (!["exploration", "combat"].includes(this.mode)) return;
    this.map.rooms.forEach((r, index) => {
      if (index === 0) return; // Entering the safe arrival chamber is not a discovery reward.
      if (
        this.party.some(
          (h) =>
            this.canAct(h) &&
            h.x >= r.x &&
            h.x < r.x + r.w &&
            h.z >= r.z &&
            h.z < r.z + r.h,
        )
      )
        this.awardXP(
          `room:${index}`,
          XP_RULES.room + XP_RULES.roomDepth * (this.campaign.depth - 1),
          `Discovered chamber ${index + 1}`,
        );
    });
  },
  awardEncounterXP(ids) {
    const defeated = this.enemies.filter(
      (e) =>
        ids.includes(e.id) &&
        e.hp <= 0 &&
        !this.map.xpClaims.includes(`enemy:${e.id}`),
    );
    if (!defeated.length) return;
    const amount =
      defeated.length *
      (XP_RULES.enemy + XP_RULES.enemyDepth * (this.campaign.depth - 1));
    if (
      this.awardXP(
        `encounter:${defeated
          .map((e) => e.id)
          .sort()
          .join(",")}`,
        amount,
        `Overcame ${defeated.length} ${defeated.length === 1 ? "sentry" : "sentries"}`,
      )
    )
      this.map.xpClaims.push(...defeated.map((e) => `enemy:${e.id}`));
  },
  bankTreasureXP() {
    const amount = this.campaign.pendingTreasureXP ?? 0;
    if (amount)
      this.awardXP(
        `treasure:${this.campaign.expeditions}`,
        amount,
        "Brought treasure safely to Greyhaven",
      );
    this.campaign.pendingTreasureXP = 0;
  },
};
