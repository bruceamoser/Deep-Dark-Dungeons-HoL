import { gearPreview, ordinaryItem } from "./treasure.mjs";
import { isTrainable, POWERS } from "./powers.mjs";
import { coverage } from "./abilities.mjs";
import { SUPPLY_DICE } from "./expedition.mjs";

export const respecMethods = {
  respecReason(index) {
    const h = this.party[index];
    if (this.mode !== "town") return "Return to Greyhaven to rebuild a hero.";
    if (!h || h.survival.status !== "active")
      return "Only a living, active hero can respec.";
    if (this.busy) return "Finish the current activity first.";
    return "";
  },
  newRespecDraft(index) {
    if (this.C.forge) return this.forgeRespecDraft(index);
    const reason = this.respecReason(index);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      draft = this.R.newCreationDraft();
    draft.name = h.name;
    draft.appearance = structuredClone(h.draft.appearance);
    draft.progression = { level: h.preview.state.level, levels: {} };
    for (let level = 2; level <= draft.progression.level; level++)
      draft.progression.levels[level] = this.R.emptyLevelDraft();
    return draft;
  },
  prepareRespecChoices(index, draft) {
    // Existing possessions replace all physical creation grants. Supply mandatory
    // grip/weapon receipts without making the player choose gear they will not get.
    const h = this.party[index];
    const grip =
      h.preview.inventory.items.find(
        (i) => i.catalogId === "item-ordinary-melee-weapon",
      )?.hands ?? 1;
    const complete = (choices, ids) => {
      for (const id of ids) {
        const grant = this.C.inventory.acquisitions.find((a) => a.id === id);
        if (POWERS[id] && grant?.items.includes("item-ordinary-melee-weapon")) {
          choices[id] ??= {};
          choices[id].meleeHands ??= grip;
        }
      }
    };
    const origins = [draft.culture, draft.background].map(
      (o) =>
        this.C.choices.find((c) => c.id === o?.id)?.pairs?.[o?.pair]?.abilityId,
    );
    complete(draft.acquisitions, [
      ...origins,
      draft.signatureId,
      ...Object.values(draft.purchases)
        .flat()
        .map((p) => p.id),
    ]);
    for (const level of Object.values(draft.progression?.levels ?? {}))
      complete(level.acquisitions, [
        ...level.purchases.map((p) => p.id),
        ...Object.values(level.signatures),
      ]);
    return draft;
  },
  respecPreview(index, proposed) {
    const reason = this.respecReason(index);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      draft = structuredClone(proposed);
    if ((draft.progression?.level ?? 1) !== h.preview.state.level)
      throw new Error(
        "Rebuild through your current trained level. Earned XP and untrained levels are retained.",
      );
    if (
      Object.keys(draft.progression?.levels ?? {}).some(
        (n) =>
          !Number.isSafeInteger(+n) || +n < 2 || +n > h.preview.state.level,
      )
    )
      throw new Error("Only previously trained levels belong in this rebuild.");
    // No creation purse, workshop play additions, or new possessions on respec.
    draft.shopping = [];
    draft.loadout = {};
    delete draft.play;
    this.prepareRespecChoices(index, draft);
    const creation = this.R.workshopCharacter(draft, this.C);
    if (!creation.valid)
      throw new Error(
        creation.errors
          .map(
            (e) => e.text ?? e.reasons?.map((r) => r.text).join("; ") ?? e.code,
          )
          .join("\n"),
      );
    for (const id of creation.state.abilities) {
      const record = this.C.choices.find((c) => c.id === id);
      if (
        !record ||
        !isTrainable(record, this.C) ||
        coverage(id).status !== "included"
      )
        throw new Error(
          "Choose current dungeon powers instead of legacy build options.",
        );
    }
    const next = structuredClone(h);
    next.draft = draft;
    next.treasure = [];
    next.supplies = {};
    next.soldItems = [
      ...new Set([
        ...(h.soldItems ?? []),
        ...creation.inventory.items.map((i) => i.instanceId),
        ...h.preview.inventory.items
          .filter(
            (i) => !h.treasure?.some((t) => t.instanceId === i.instanceId),
          )
          .map((i) => i.instanceId),
      ]),
    ];
    for (const owned of h.preview.inventory.items) {
      const saved = h.treasure?.find((i) => i.instanceId === owned.instanceId);
      const item = saved
        ? structuredClone(saved)
        : ordinaryItem(
            this.C,
            owned.catalogId,
            `carried-${h.heroId}-${owned.instanceId}`,
          );
      Object.assign(item, {
        quantity: owned.quantity,
        hands: owned.hands,
        carried: owned.carried,
        held: owned.held,
        worn: owned.worn,
      });
      const armor = owned.catalogId.match(
        /item-ordinary-(light|medium|heavy)-armor/,
      )?.[1];
      if (
        armor &&
        !creation.state.abilities.includes(`ability-wear-${armor}-armor`)
      )
        item.worn = false;
      if (item.inventoryDie || SUPPLY_DICE[item.catalogId]) {
        item.supplyRemaining = this.supplyValue(h, owned);
        next.supplies[item.instanceId] = item.supplyRemaining;
      }
      next.treasure.push(item);
    }
    // All existing damage and spent Grit survive changed maximums. Keep the
    // highest spent count so toggling through a low-Grit build cannot refill it.
    const spent = Math.max(
      h.respecGritSpent ?? 0,
      h.preview.summary.gritGranted - h.survival.gritAvailable,
      0,
    );
    next.respecGritSpent = spent;
    next.survival.maxHp = Math.max(
      1,
      h.survival.maxHp +
        creation.summary.maximumHp -
        h.preview.summary.maximumHp,
    );
    next.survival.hp = Math.min(h.survival.hp, next.survival.maxHp);
    next.survival.gritAvailable = Math.max(
      0,
      creation.summary.gritGranted - spent,
    );
    next.build = { talents: {}, specializations: {} };
    next.preparedTraits = [];
    next.powerPendingManeuver = false;
    next.powerEffects = (h.powerEffects ?? []).filter((e) =>
      Object.values(e.stats).some((n) => typeof n === "number" && n < 0),
    );
    next.tactics = [];
    next.buffs = {};
    const shell = this.hero(draft, index);
    next.model = shell.model;
    next.name = draft.name;
    next.draft.appearance = shell.draft.appearance;
    next.preview = gearPreview(this.R, this.C, next);
    this.R.validateSurvival(next.survival);
    this.R.validateContributions(next.conditions);
    const available = this.availableActions(next);
    next.favorites = [
      ...new Set([
        ...(h.favorites ?? []).filter((id) =>
          available.some((c) => c.id === id),
        ),
        ...available.filter((c) => !c.universal).map((c) => c.id),
      ]),
    ].slice(0, 8);
    return next;
  },
  respec(index, proposed, expectedHeroId) {
    if (this.C.forge)
      return this.forgeCommit(index, proposed, {
        respec: true,
        expectedHeroId,
      });
    const h = this.party[index];
    if (expectedHeroId !== h?.heroId)
      throw new Error(
        "This party slot changed. Reopen the intended hero’s respec.",
      );
    const next = this.respecPreview(index, proposed);
    next.respecHistory = [
      ...(h.respecHistory ?? []),
      {
        at: this.clock().seconds,
        from: h.draft.classId,
        to: next.draft.classId,
        level: next.preview.state.level,
      },
    ].slice(-20);
    // Validation above is side-effect free. Commit once, preserving roster identity.
    this.party[index] = next;
    this.syncTorches();
    this.note(
      `${next.name} rebuilt from the beginning at level ${next.preview.state.level}. XP, possessions and injuries retained; mastery refunded.`,
    );
    this.emit("party");
    this.emit("change");
  },
};
