import {
  ANCESTRY_LOOKS,
  LOOK_OPTIONS,
  LOOK_PALETTES,
  COLOR_NAMES,
  normalizeAppearance,
  randomAppearance,
} from "../core/identity.mjs";
import { esc } from "./icons.mjs";
const label = (s) => s[0].toUpperCase() + s.slice(1);
export function appearanceControls(
  root,
  { appearance, ancestry, name, onChange, disabled = false },
) {
  let value = normalizeAppearance(appearance, ancestry, name);
  const look = ANCESTRY_LOOKS[ancestry] ?? ANCESTRY_LOOKS["ancestry-human"];
  const groups = [
    ["skin", "Complexion", look.skins],
    ["hairColor", "Hair & facial hair", LOOK_PALETTES.hairColor],
    ["eyeColor", "Eyes", LOOK_PALETTES.eyeColor],
    ["clothColor", "Clothing theme", LOOK_PALETTES.clothColor],
    ["accentColor", "Trim & bindings", LOOK_PALETTES.accentColor],
  ];
  function draw() {
    root.innerHTML = `<div class="appearance-editor"><div class="appearance-heading"><div><span class="eyebrow">${esc(look.name.toUpperCase())} · PERSONAL APPEARANCE</span><h3>A face to remember</h3><p>Drag your hero to rotate. Scroll over the preview to inspect their face. Cosmetic choices never change statistics.</p></div></div>${disabled ? '<p class="cost-note">Return to Greyhaven to change your look.</p>' : ""}<fieldset ${disabled ? "disabled" : ""}><div class="appearance-selects">${Object.entries(
      LOOK_OPTIONS,
    )
      .map(
        ([k, values]) =>
          `<label class="creator-field"><span>${{ sex: "Sex", build: "Build", face: "Face", hair: "Hairstyle", beard: "Facial hair" }[k]}</span><select data-look="${k}" aria-label="${{ hair: "Hairstyle", beard: "Facial hair" }[k] ?? label(k)}">${values.map((v) => `<option value="${v}" ${value[k] === v ? "selected" : ""}>${label(v)}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div>${groups.map(([k, title, colors]) => `<div class="appearance-palette"><span class="eyebrow">${title}</span><div>${colors.map((c) => `<button type="button" class="look-swatch ${value[k] === c ? "chosen" : ""}" style="--swatch:${c}" data-color="${k}" data-value="${c}" title="${esc(COLOR_NAMES[c] ?? title + " " + c)}" aria-label="${esc(COLOR_NAMES[c] ?? title + " " + c)}" aria-pressed="${value[k] === c}"></button>`).join("")}<label class="custom-swatch">Custom<input type="color" data-custom="${k}" aria-label="Custom ${title.toLowerCase()}" value="${value[k]}"></label></div></div>`).join("")}<div class="appearance-tools"><button type="button" data-look-random>Randomize look</button><button type="button" data-look-reset>Reset look</button></div></fieldset><p class="appearance-note">Ancestry sets stature, proportions and distinctive features. Hair and facial hair are available to either sex. Your clothing theme stays with you as gear changes.</p></div>`;
    const commit = () => {
      onChange({ ...value });
    };
    root.querySelectorAll("[data-look]").forEach(
      (e) =>
        (e.onchange = () => {
          value[e.dataset.look] = e.value;
          commit();
        }),
    );
    root.querySelectorAll("[data-color]").forEach(
      (e) =>
        (e.onclick = () => {
          value[e.dataset.color] = e.dataset.value;
          commit();
          draw();
        }),
    );
    root.querySelectorAll("[data-custom]").forEach(
      (e) =>
        (e.onchange = () => {
          value[e.dataset.custom] = e.value;
          commit();
          draw();
        }),
    );
    root.querySelector("[data-look-random]").onclick = () => {
      value = randomAppearance(ancestry);
      commit();
      draw();
    };
    root.querySelector("[data-look-reset]").onclick = () => {
      value = normalizeAppearance({}, ancestry, name);
      commit();
      draw();
    };
  }
  draw();
}
