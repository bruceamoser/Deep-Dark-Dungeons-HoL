import { ABILITIES } from "../core/abilities.mjs";
import { esc } from "./icons.mjs";
const disciplines = new Set([
  "arms",
  "armor",
  "athletics",
  "calling",
  "craft",
  "flame",
  "frost",
  "guard",
  "influence",
  "life",
  "marksmanship",
  "medicine",
  "mind",
  "radiance",
  "scholarship",
  "storm",
  "subterfuge",
  "wilderness",
]);
export function disciplineIcon(id) {
  const slug = id?.replace(/^discipline-/, "");
  return disciplines.has(slug)
    ? `<img class="discipline-symbol" src="/vendor/hol/assets/${slug}.webp" alt="" aria-hidden="true">`
    : "";
}
export function abilityType(record) {
  const action =
    (ABILITIES[record.id]
      ? { main: "Main Action", maneuver: "Maneuver", reaction: "Reaction" }[
          ABILITIES[record.id].category
        ]
      : null) ??
    record.reference?.rules?.details?.find((d) => d.label === "Action")
      ?.value ??
    "";
  const codes = [
    [/Main Action/i, "A"],
    [/Maneuver/i, "M"],
    [/Reaction/i, "R"],
    [/Passive/i, "P"],
  ]
    .filter(([pattern]) => pattern.test(action))
    .map(([, code]) => code);
  return `<span class="ability-type" title="${esc(action)}" aria-label="${esc(action)}"><b aria-hidden="true">${codes.join("/") || "·"}</b><small>${esc(action || "Special")}</small></span>`;
}
export function disciplineStrip(
  state,
  choices,
  interactive = false,
  selected = "",
) {
  const owned = Object.entries(state.ranks ?? {}).filter(
    ([, rank]) => rank > 0,
  );
  return `<div class="owned-disciplines"><span class="eyebrow">YOUR DISCIPLINES</span><div>${
    owned
      .map(([id, rank]) => {
        const label = choices.find((c) => c.id === id)?.name ?? id;
        const content = `${disciplineIcon(id)}<span>${esc(label)}<small>Rank ${rank}</small></span>`;
        return interactive
          ? `<button data-filter-discipline="${id}" class="discipline-chip ${selected === id ? "chosen" : ""}" aria-label="Filter by ${esc(label)}">${content}</button>`
          : `<span class="discipline-chip">${content}</span>`;
      })
      .join("") ||
    '<p class="empty-state">Choose your origins to gain your first disciplines.</p>'
  }</div></div>`;
}
