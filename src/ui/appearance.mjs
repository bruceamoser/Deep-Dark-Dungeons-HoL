import {
  normalizeAppearance,
  randomAppearance,
  LOOK_OPTIONS,
} from "../core/identity.mjs";
import { HERO_AVATARS } from "../core/hero-avatars.mjs";
import { esc } from "./icons.mjs";
export function appearanceControls(
  root,
  { appearance, ancestry, name, onChange, disabled = false },
) {
  let value = normalizeAppearance(appearance, ancestry, name);
  function draw() {
    const selects = [
      ["avatar", "Hero model", HERO_AVATARS.map((a) => [a.id, a.label])],
      [
        "build",
        "Build",
        LOOK_OPTIONS.build.map((b) => [b, b[0].toUpperCase() + b.slice(1)]),
      ],
    ];
    root.innerHTML = `<div class="appearance-editor"><div class="appearance-heading"><div><span class="eyebrow">PERSONAL APPEARANCE</span><h3>A hero to remember</h3><p>Choose your hero’s look. Drag to rotate; scroll to inspect.</p></div></div>${disabled ? '<p class="cost-note">Return to Greyhaven to change your look.</p>' : ""}<fieldset ${disabled ? "disabled" : ""}><div class="appearance-selects">${selects.map(([key, title, choices]) => `<label class="creator-field"><span>${title}</span><select data-look="${key}" aria-label="${title}">${choices.map(([id, label]) => `<option value="${id}" ${value[key] === id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>`).join("")}</div><div class="appearance-tools"><button type="button" data-look-random>Randomize look</button><button type="button" data-look-reset>Reset look</button></div></fieldset><p class="appearance-note">Original colors, hairstyles and faces belong to the selected model. Ancestry adjusts stature and proportions. Worn armor and held equipment appear on your hero; cosmetic model choices never change statistics.</p></div>`;
    root.querySelectorAll("[data-look]").forEach(
      (e) =>
        (e.onchange = () => {
          value[e.dataset.look] = e.value;
          onChange({ ...value });
        }),
    );
    root.querySelector("[data-look-random]").onclick = () => {
      value = randomAppearance(ancestry);
      onChange({ ...value });
      draw();
    };
    root.querySelector("[data-look-reset]").onclick = () => {
      value = normalizeAppearance({}, ancestry, name);
      onChange({ ...value });
      draw();
    };
  }
  draw();
}
