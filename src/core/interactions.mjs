import { distance, key, lineOfSight, pathfind } from "./dungeon.mjs";
import { XP_RULES } from "./experience.mjs";

// World interactions are a dungeon-game layer; source character rules stay intact.
export const interactionMethods = {
  worldInteractions() {
    return [
      ...this.map.chests.map((c) => ({
        ...c,
        id: `coffer:${c.id}`,
        kind: "coffer",
        name: c.opened ? "Empty coffer" : "Forgotten coffer",
        description: c.opened
          ? "The coffer has already been emptied."
          : `An old coffer holds ${c.coins} coins.`,
        available: !c.opened,
        action: "Collect coins",
        source: c,
      })),
      ...this.campaign.caches.flatMap((c, i) =>
        c.depth === this.campaign.depth && !c.recovered
          ? [
              {
                ...c,
                id: `cache:${i}`,
                kind: "cache",
                name: "Lost expedition cache",
                description: `${c.coins} coins left behind by expedition ${c.expedition}. Recover them for the company.`,
                available: true,
                action: "Recover cache",
                source: c,
              },
            ]
          : [],
      ),
      {
        ...this.map.start,
        id: "stairs:entrance",
        kind: "entrance",
        name: "Stairs to Greyhaven",
        description:
          "Gather the company here to return to town and bank your recovered treasure.",
        available: true,
        action: "Return to town",
      },
      {
        ...this.map.exit,
        id: "stairs:descent",
        kind: "descent",
        name: "Stairs into the depths",
        description:
          "Gather the company here to descend to the next dungeon floor.",
        available: true,
        action: "Descend",
      },
    ];
  },
  interactionNear(item) {
    const active = this.party.filter((h) => this.canAct(h));
    if (["entrance", "descent"].includes(item.kind))
      return active.length > 0 && active.every((h) => distance(h, item) <= 3);
    return active.some(
      (h) => distance(h, item) <= 1 && lineOfSight(this.map, h, item),
    );
  },
  interactionReason(item) {
    if (!item) return "That object is no longer here.";
    if (this.mode !== "exploration" || this.busy)
      return "Finish combat before interacting.";
    if (!item.available) return "Already collected.";
    if (!this.interactionNear(item))
      return ["entrance", "descent"].includes(item.kind)
        ? "Gather the company at these stairs."
        : "Move a companion beside it first.";
    return "";
  },
  approachInteraction(id) {
    const item = this.worldInteractions().find((i) => i.id === id);
    if (!item || this.mode !== "exploration" || this.busy)
      throw new Error("Approach objects outside combat.");
    const leader = this.party.find((h) => h.id === this.campaign.order[0]);
    const occupied = this.occupied(leader.id);
    const blocked = new Set(
      this.enemies.filter((e) => e.hp > 0).map((e) => key(e.x, e.z)),
    );
    const candidates = Object.values(this.map.tiles)
      .filter(
        (p) =>
          distance(p, item) <= 1 &&
          !this.map.obstacles?.[key(p.x, p.z)] &&
          !occupied.has(key(p.x, p.z)) &&
          lineOfSight(this.map, p, item),
      )
      .map((p) => ({ p, route: pathfind(this.map, leader, p, blocked) }))
      .filter(({ p, route }) => route.length || distance(leader, p) === 0)
      .sort((a, b) => a.route.length - b.route.length);
    if (!candidates.length)
      throw new Error("There is no clear route beside that object.");
    this.move(candidates[0].p);
    this.pendingInteraction = id;
    this.checkInteractionArrival();
  },
  checkInteractionArrival() {
    if (!this.pendingInteraction) return;
    if (this.mode !== "exploration") {
      this.pendingInteraction = null;
      return;
    }
    const item = this.worldInteractions().find(
      (i) => i.id === this.pendingInteraction,
    );
    if (!item) {
      this.pendingInteraction = null;
      return;
    }
    if ([...this.paths.values()].some((p) => p.length)) return;
    this.pendingInteraction = null;
    if (this.interactionNear(item))
      this.emit("interact-ready", { id: item.id });
    else this.notify("The route is blocked. Move closer to interact.");
  },
  interact(id) {
    const item = this.worldInteractions().find((i) => i.id === id);
    const reason = this.interactionReason(item);
    if (reason) throw new Error(reason);
    this.pendingInteraction = null;
    if (item.kind === "entrance") return this.extract();
    if (item.kind === "descent") return this.deeper();
    if (item.kind === "cache") item.source.recovered = true;
    else item.source.opened = true;
    this.campaign.haul += item.coins;
    if (item.kind === "coffer")
      this.campaign.pendingTreasureXP += item.coins * XP_RULES.coin;
    this.note(`Recovered ${item.coins} coins from ${item.name.toLowerCase()}.`);
    this.emit("loot", { chest: item.source });
    this.emit("change");
  },
};
