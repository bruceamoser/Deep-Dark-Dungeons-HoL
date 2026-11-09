import { FIERCENESS } from "../core/fierceness.mjs";
export function fiercenessIndicator(danger) {
  return `<div class="area-fierceness" style="--danger-color:${danger.color}" role="meter" aria-label="Creatures in the area" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${danger.tier}" aria-valuetext="${danger.label}"><span>Creatures in the area · <b>${danger.label}</b></span><span class="fierceness-scale" aria-hidden="true">${FIERCENESS.map((d, i) => `<i style="background:${d.color}" class="${i === danger.tier ? "selected" : ""}"></i>`).join("")}</span></div>`;
}
