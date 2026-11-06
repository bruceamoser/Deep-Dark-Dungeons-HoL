import { FORGE_NODE, FORGE_LEVEL_CAP } from "./forge-catalog.mjs";
import {
  forgeCharacter,
  forgeRequirements,
  forgeRefundPlan,
  newForgeDraft,
} from "./forge.mjs";
import { gearPreview } from "./treasure.mjs";
export const forgeGameMethods = {
  forgeFavorites(h) {
    const actions = this.availableActions(h),
      score = (c) =>
        ["power-forge-strike", "power-forge-shot"].includes(c.id)
          ? 0
          : this.powerSpec(c.id, h)?.effects?.some((e) => e.kind === "damage")
            ? 1
            : this.powerSpec(c.id, h)?.effects?.some((e) => e.kind === "survey")
              ? 3
              : 2;
    const learned = actions
      .filter((c) => !c.universal)
      .sort((a, b) => score(a) - score(b))
      .map((c) => c.id);
    return [
      ...new Set([
        ...learned,
        ...(!learned.length ? ["power-forge-unarmed"] : []),
        "ability-defend",
        "ability-disengage",
        "ability-use-a-healing-potion",
        "ability-aid",
        "ability-reduce-a-condition",
      ]),
    ]
      .filter((id) => actions.some((c) => c.id === id))
      .slice(0, 6);
  },
  forgeReason(index) {
    const h = this.party[index];
    if (this.mode !== "town")
      return "Return to Greyhaven to develop your paths.";
    if (!h || h.survival.status !== "active")
      return "Choose a living, active hero.";
    if (this.busy || this.pendingDefense || this.pendingProvocation)
      return "Finish the current event first.";
    return "";
  },
  forgeCommit(index, draft, { respec = false, expectedHeroId } = {}) {
    const why = this.forgeReason(index);
    if (why) throw new Error(why);
    const h = this.party[index];
    if (expectedHeroId && h.heroId !== expectedHeroId)
      throw new Error("The party slot changed. Reopen this hero’s forge.");
    const p = forgeCharacter(draft, this.C);
    if (!p.valid) throw new Error(p.errors.map((e) => e.text).join("\n"));
    const level = p.state.level;
    if (
      level > h.earnedLevel ||
      level < h.preview.state.level ||
      level > FORGE_LEVEL_CAP
    )
      throw new Error("Train only earned levels.");
    const next = structuredClone(h);
    next.draft = structuredClone(draft);
    // Progression never changes possessions, the campaign purse or remaining supplies.
    for (const k of ["kit", "shopping", "loadout"])
      next.draft[k] = structuredClone(
        h.draft[k] ?? (k === "shopping" ? [] : {}),
      );
    if (respec) {
      delete next.build;
      next.preparedTraits = [];
      next.tactics = [];
      next.buffs = {};
      next.powerEffects = (next.powerEffects ?? []).filter((e) =>
        Object.values(e.stats).some((v) => typeof v === "number" && v < 0),
      );
      next.powerPendingManeuver = false;
    }
    next.preview = gearPreview(this.R, this.C, next);
    if (!next.preview.valid)
      throw new Error(next.preview.errors.map((e) => e.text).join("\n"));
    // No healing or Grit cycling when rebuilding to smaller/larger maximums.
    next.survival.maxHp = Math.max(
      1,
      h.survival.maxHp +
        next.preview.summary.maximumHp -
        h.preview.summary.maximumHp,
    );
    next.survival.hp = Math.min(h.survival.hp, next.survival.maxHp);
    next.respecGritSpent = Math.max(
      h.respecGritSpent ?? 0,
      h.preview.summary.gritGranted - h.survival.gritAvailable,
    );
    next.survival.gritAvailable = Math.max(
      0,
      next.preview.summary.gritGranted - next.respecGritSpent,
    );
    next.name = next.draft.name;
    if (respec) {
      const shell = this.hero(next.draft, index);
      next.model = shell.model;
      next.draft.appearance = shell.draft.appearance;
      next.respecHistory = [
        ...(h.respecHistory ?? []),
        {
          at: this.clock().seconds,
          level,
          from: h.draft.classId,
          to: next.draft.classId,
        },
      ].slice(-20);
    }
    // Unequip portable armor if its training was refunded, without removing the item.
    for (const item of next.treasure ?? []) {
      const tier = item.catalogId.match(
        /item-ordinary-(light|medium|heavy)-armor/,
      )?.[1];
      if (
        tier &&
        !next.preview.state.abilities.includes(`ability-wear-${tier}-armor`)
      )
        item.worn = false;
    }
    next.preview = gearPreview(this.R, this.C, next);
    this.R.validateSurvival(next.survival);
    const available = this.availableActions(next);
    next.favorites = [
      ...new Set([
        ...(respec ? this.forgeFavorites(next) : (next.favorites ?? [])).filter(
          (id) => available.some((a) => a.id === id),
        ),
        ...available.filter((a) => !a.universal).map((a) => a.id),
      ]),
    ].slice(0, 8);
    this.party[index] = next;
    this.syncTorches();
    this.note(
      `${next.name}: ${respec ? "rebuilt their disciplines" : `forge updated at level ${level}`} · ${next.preview.development.current} DP available.`,
    );
    this.emit("party");
    this.emit("change");
    return next;
  },
  editForge(index, { buy, refund, reset = false } = {}) {
    const h = this.party[index],
      draft = structuredClone(h.draft);
    if (buy) {
      const why = forgeRequirements(FORGE_NODE[buy], draft, this.C);
      if (why.length) throw new Error(why.join(" "));
      draft.forge.nodes.push(buy);
    } else if (refund || reset) {
      const plan = forgeRefundPlan(draft, this.C, reset ? null : refund);
      draft.forge.nodes = plan.draft.forge.nodes;
    } else throw new Error("Choose a node to buy or refund.");
    return this.forgeCommit(index, draft);
  },
  trainForge(index) {
    const h = this.party[index],
      draft = structuredClone(h.draft);
    draft.progression.level = Math.min(FORGE_LEVEL_CAP, h.earnedLevel);
    if (draft.progression.level <= h.preview.state.level)
      throw new Error("No untrained level is available.");
    return this.forgeCommit(index, draft);
  },
  forgeRespecDraft(index) {
    const why = this.forgeReason(index);
    if (why) throw new Error(why);
    const h = this.party[index],
      draft = newForgeDraft();
    draft.name = h.name;
    draft.appearance = structuredClone(h.draft.appearance);
    draft.progression.level = h.preview.state.level;
    for (const k of ["kit", "shopping", "loadout"])
      draft[k] = structuredClone(h.draft[k]);
    return draft;
  },
};
