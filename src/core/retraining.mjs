import { coverage } from "./abilities.mjs";
import { gearPreview, ordinaryItem } from "./treasure.mjs";
function purchaseLists(draft) {
  return [
    ...Object.entries(draft.purchases ?? {}).map(([level, purchases]) => ({
      key: `creation:${level}`,
      purchases,
    })),
    ...Object.entries(draft.progression?.levels ?? {}).map(
      ([level, entry]) => ({
        key: `level:${level}`,
        purchases: entry.purchases,
      }),
    ),
  ];
}
export const retrainingMethods = {
  retiredPurchases(h) {
    return purchaseLists(h.draft).flatMap((list) =>
      list.purchases.flatMap((p, index) =>
        coverage(p.id).status === "retired" &&
        this.C.choices.find((c) => c.id === p.id)?.kind === "ability"
          ? [{ key: list.key, index, id: p.id }]
          : [],
      ),
    );
  },
  retrainingDraft(h, receipt, id) {
    const current = this.retiredPurchases(h).find(
      (p) =>
        p.key === receipt.key &&
        p.index === receipt.index &&
        p.id === receipt.id,
    );
    const before = this.C.choices.find((c) => c.id === receipt.id),
      after = this.C.choices.find((c) => c.id === id);
    if (
      !current ||
      after?.kind !== "ability" ||
      coverage(id).status !== "included" ||
      after.classId ||
      after.universal ||
      after.cost !== before.cost
    )
      throw new Error("Choose a supported replacement with the same DP cost.");
    const draft = structuredClone(h.draft),
      list = purchaseLists(draft).find((l) => l.key === receipt.key);
    list.purchases[receipt.index] = { id };
    const p = gearPreview(this.R, this.C, h, draft);
    if (!p.valid)
      throw new Error(
        "That replacement does not meet this purchase stage’s rules or needs acquisition choices.",
      );
    return { draft, preview: p };
  },
  retrainingOptions(index, receipt) {
    const h = this.party[index];
    return this.C.choices
      .filter(
        (c) =>
          c.kind === "ability" &&
          coverage(c.id).status === "included" &&
          !c.classId &&
          !c.universal,
      )
      .filter((c) => {
        try {
          this.retrainingDraft(h, receipt, c.id);
          return true;
        } catch {
          return false;
        }
      });
  },
  retrain(index, receipt, id) {
    if (this.mode !== "town") throw new Error("Retrain in Greyhaven.");
    const h = this.party[index],
      { draft, preview } = this.retrainingDraft(h, receipt, id);
    // Acquired possessions are already real objects, not a refundable source of coins.
    const missing = h.preview.inventory.items.filter(
      (i) =>
        !preview.inventory.items.some((n) => n.instanceId === i.instanceId),
    );
    const replacements = missing.map((i) => {
      const item = ordinaryItem(
        this.C,
        i.catalogId,
        `retained-${crypto.randomUUID()}`,
      );
      return {
        ...item,
        quantity: i.quantity,
        hands: i.hands,
        held: i.held,
        worn: i.worn,
        carried: i.carried,
      };
    });
    const next = {
      ...h,
      draft,
      treasure: [...(h.treasure ?? []), ...replacements],
    };
    const validated = gearPreview(this.R, this.C, next);
    if (!validated.valid)
      throw new Error(
        "The retained equipment needs attention before retraining.",
      );
    for (let i = 0; i < missing.length; i++)
      if (h.supplies[missing[i].instanceId] !== undefined)
        h.supplies[replacements[i].instanceId] =
          h.supplies[missing[i].instanceId];
    h.treasure = next.treasure;
    h.draft = draft;
    this.refreshHero(h);
    h.retraining ??= [];
    h.retraining.push({
      from: receipt.id,
      to: id,
      stage: receipt.key,
      at: this.clock().seconds,
    });
    this.note(
      `${h.name} retrains ${this.C.choices.find((c) => c.id === receipt.id).name} → ${this.C.choices.find((c) => c.id === id).name}. No coins, XP, injuries or possessions lost.`,
    );
    this.emit("party");
    this.emit("change");
  },
};
