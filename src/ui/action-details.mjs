import { ABILITIES, coverage } from "../core/abilities.mjs";
import { forgePowerText } from "../core/forge.mjs";
import { activeItemEffects } from "../core/treasure.mjs";
import { esc } from "./icons.mjs";
export const SHORTCUT_KEYS = Object.freeze([
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "-",
  "=",
]);
export function actionDetails(game, id, h = game.active) {
  const spec = game.powerSpec(id, h) ?? ABILITIES[id],
    choice = game.C.choices.find((c) => c.id === id);
  if (!spec)
    return {
      name: choice?.name ?? id,
      rules: coverage(id).reason,
      notes: [],
      reason: "Not playable.",
    };
  const notes = [],
    stat = (key) => game.buildStat(h, key);
  if (spec.limit)
    notes.push(
      `${Math.max(0, spec.limit - (h.powerUses?.[id] ?? 0))} / ${spec.limit} uses left this encounter.`,
    );
  if (spec.restLimit)
    notes.push(
      `${Math.max(0, spec.restLimit - (h.restPowerUses?.[id] ?? 0))} / ${spec.restLimit} charges; recover after 8 hours of sleep.`,
    );
  if (spec.once)
    notes.push(
      h.signatureUses?.includes(id)
        ? "Used this encounter."
        : "Once per encounter.",
    );
  if (spec.hpCost || spec.selfCost)
    notes.push(`Costs ${spec.hpCost ?? spec.selfCost} HP.`);
  if (spec.freeHand) notes.push("Requires a free hand.");
  if (spec.shield) notes.push("Requires a readied shield.");
  if (spec.effects?.some((e) => e.kind === "damage") || spec.damage) {
    for (const [key, label] of [
      ["damage", "all damage"],
      ["physical", "physical damage"],
      ["spell", "spell damage"],
      ["critical", "damage on Strong"],
      ["ambush", "damage from concealment"],
      ["moveDamage", "damage after moving"],
      ["flanker", "damage beside an ally"],
      ["burningDamage", "damage against Burning targets"],
    ]) {
      const n = stat(key);
      if (
        n &&
        (key !== "physical" ||
          (spec.damage && spec.type === "physical") ||
          spec.effects.some((e) => e.type === "physical")) &&
        (key !== "spell" || spec.spell)
      )
        notes.push(`${n > 0 ? "+" : ""}${n} ${label}.`);
    }
    const bonus = game.powerStat(h, "damage");
    if (bonus) notes.push(`Next attack: +${bonus} damage.`);
    if (spec.damageModifier)
      notes.push(
        `${spec.damageModifier > 0 ? "+" : ""}${spec.damageModifier} specialization damage.`,
      );
    if (spec.weapon && game.held(h, `item-ordinary-${spec.weapon}-weapon`))
      for (const e of activeItemEffects(
        h,
        game.held(h, `item-ordinary-${spec.weapon}-weapon`),
      ).filter((e) => e.effect === "damage"))
        notes.push(
          `Weapon: +${game.enchantmentDamage(h, e, spec.damageType ?? spec.type ?? spec.effects?.find((e) => e.kind === "damage")?.type)} ${e.type} damage${e.condition ? `; Strong applies ${e.condition}` : ""}.`,
        );
    notes.push(
      "Damage values are Weak / Standard / Strong before target resistances. Conditional bonuses apply when their trigger is met.",
    );
  }
  if (spec.effects?.some((e) => e.kind === "heal") && stat("heal"))
    notes.push(`+${stat("heal")} healing from learned skills.`);
  if (spec.effects?.some((e) => e.kind === "barrier") && stat("barrier"))
    notes.push(`+${stat("barrier")} barrier absorption from learned skills.`);
  for (const e of spec.effects?.filter((e) => e.kind === "condition") ?? [])
    if (stat(e.key))
      notes.push(`+${stat(e.key)} ${e.key} severity from learned skills.`);
  const integrated = {
    "ability-defend":
      "Maneuver · self. Gain +1 Boon to defense rolls until your next turn. Stacks with Shield Block.",
    "ability-disengage": `Maneuver · self. Your movement does not provoke opportunity attacks for the rest of this turn.${h.preview.state.abilities.includes("ability-quick-exit") ? " Quick Exit adds 1 movement, once this turn." : ""}`,
    "ability-stabilize":
      "Maneuver · adjacent Dying companion. Stabilize at 0 HP and clear death marks. Does not restore HP or treat wounds.",
    "ability-reduce-a-condition":
      "Main action · self or adjacent companion. Choose Bleeding, Burning or Freezing and reduce its temporary severity by 1. Persistent injury effects require treatment.",
    "ability-use-a-healing-potion":
      "Maneuver · self or adjacent companion. Requires a usable carried healing bottle and a free hand. A conscious companion spends a Reaction to receive it. Check the bottle's supply die after use; retrieving it provokes opportunity attacks. HP healing does not treat wounds.",
  };
  if (id === "ability-use-a-healing-potion") {
    const bottle = h.preview.inventory.items.find(
      (i) =>
        i.carried &&
        game.R.HEALING_POTION_IDS.includes(i.catalogId) &&
        game.supplyValue(h, i) > 0,
    );
    if (bottle)
      notes.push(
        `Selected bottle: ${bottle.definition.name}, restores ${game.R.healingPotionAdapter(bottle.catalogId, game.C.inventory).healing} HP (up to the healing maximum). Supply d${game.supplyValue(h, bottle)}.`,
      );
  }
  notes.push(
    spec.field
      ? "Available outside combat; using it advances one minute."
      : "Use on your combat turn.",
  );
  return {
    name: choice?.name ?? spec.name ?? id,
    spec,
    rules:
      integrated[id] ??
      (spec.effects ? forgePowerText(spec) : coverage(id).reason),
    notes,
    reason: game.actionReason(id, h),
  };
}
export function actionDetailsHTML(game, id, h = game.active) {
  const d = actionDetails(game, id, h);
  return `<strong>${esc(d.name)}</strong><p>${esc(d.rules)}</p>${d.notes.map((n) => `<p class="action-detail-note">${esc(n)}</p>`).join("")}<p class="action-availability ${d.reason ? "unavailable" : ""}">${esc(d.reason || "Ready · choose this action, then its target.")}</p>`;
}
