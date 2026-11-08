import { normalizeAppearance, randomAppearance } from "../core/identity.mjs";
import { MASON_OPTIONS, MELEE_VARIANTS } from "../core/mason-appearance.mjs";
import { appearanceEquipment } from "../core/appearance-preview.mjs";
import { esc } from "./icons.mjs";
const titles = {
  head: "Face",
  hair: "Hair",
  eyes: "Eyes",
  mouth: "Mouth",
  brows: "Eyebrows",
  headpiece: "Headpiece",
  facialHair: "Facial hair",
  ears: "Ears",
  horns: "Horns",
  crown: "Crown",
  mask: "Face covering",
  ornament: "Extra accessory",
  cloak: "Cloak",
  oneHandType: "One-handed melee type",
  twoHandType: "Two-handed melee type",
  oneHandVariant: "One-handed variant",
  twoHandVariant: "Two-handed variant",
  bow: "Equipped bow style",
  arrow: "Arrow style",
  shield: "Equipped shield style",
  backpack: "Equipped backpack style",
};
const names = {
  auto: "Default",
  class: "Class signature",
  none: "None",
  Head01_Male: "Masculine face",
  Head02_Female: "Feminine face",
  AC04_ShortEars: "Pointed ears",
  AC02_Leaf: "Leaf ornament",
  AC07_PiratePatch: "Eye patch",
  Hat01: "Witch hat",
  Hat02: "Horned helmet",
  Hat04: "Leather hood",
  Hat05: "Cloth hood",
  Hat06: "Ranger hat",
  Hat07: "Spiked helmet",
  Hat08: "Wizard hat",
  Hat10: "Crowned helmet",
  Hat11: "Circlet helmet",
  Hat12: "Ornate helmet",
  Hat13: "Monster helm",
  Hat14: "Soldier helmet",
};
const label = (id) =>
  names[id] ??
  id
    .replace(/^AC10_Mustache/, "Moustache ")
    .replace(/^AC11_Mustache/, "Beard ")
    .replace(/^AC\d+_/, "")
    .replace(/^OHS/, "One-handed ")
    .replace(/^THS/, "Two-handed ")
    .replace(/^THA/, "Two-handed axe ")
    .replace(/^THH/, "Two-handed hammer ")
    .replace(/_/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2");
function colourName(hex) {
  const rgb = hex.match(/\w\w/g).map((n) => parseInt(n, 16) / 255),
    max = Math.max(...rgb),
    min = Math.min(...rgb),
    d = max - min;
  if (d < 0.13) return max < 0.2 ? "Dark" : max > 0.8 ? "Light" : "Grey";
  let h =
    max === rgb[0]
      ? ((rgb[1] - rgb[2]) / d + 6) % 6
      : max === rgb[1]
        ? (rgb[2] - rgb[0]) / d + 2
        : (rgb[0] - rgb[1]) / d + 4;
  h *= 60;
  return h < 18 || h >= 345
    ? "Red"
    : h < 48
      ? max < 0.65
        ? "Brown"
        : "Orange"
      : h < 75
        ? "Gold"
        : h < 165
          ? "Green"
          : h < 205
            ? "Teal"
            : h < 260
              ? "Blue"
              : h < 295
                ? "Purple"
                : "Pink";
}
export function appearanceControls(
  root,
  {
    appearance,
    ancestry,
    name,
    onChange,
    hero = {},
    onPreview = () => {},
    onHighlight = () => {},
    paletteAreas = () => [],
    disabled = false,
    masonAvailable = false,
  },
) {
  let value = normalizeAppearance(appearance, ancestry, name),
    previewKey = null;
  const gear = appearanceEquipment(hero);
  const note = () => {
    const node = root.querySelector("[data-preview-note]");
    if (node)
      node.textContent = previewKey
        ? "Previewing your selection. Real equipment is unchanged."
        : "Showing equipped gear. Select a carried item style to preview it.";
  };
  const emit = (key) => {
    if (
      key &&
      [
        "oneHandType",
        "twoHandType",
        "oneHandVariant",
        "twoHandVariant",
        "bow",
        "arrow",
        "shield",
        "backpack",
        "headpiece",
        "hair",
        "hairColor",
      ].includes(key)
    )
      previewKey = key;
    onChange(structuredClone(value), previewKey);
    note();
  };
  const select = (key, choices = MASON_OPTIONS[key], title = titles[key]) =>
    !choices || choices.length < 2
      ? ""
      : `<label class="creator-field"><span>${esc(title)}</span><select data-part="${key}" aria-label="${esc(title)}">${choices.map((id) => `<option value="${esc(id)}" ${value.mason[key] === id ? "selected" : ""}>${esc(label(id))}</option>`).join("")}</select></label>`;
  function draw() {
    const scrolls = [];
    for (
      let node = root;
      node && node !== document.body;
      node = node.parentElement
    )
      if (node.scrollTop) scrolls.push([node, node.scrollTop]);
    const focused = root.contains(document.activeElement)
      ? document.activeElement.dataset.part
      : null;
    const gearFields = [
      ...(gear.one ? ["oneHandType", "oneHandVariant"] : []),
      ...(gear.two ? ["twoHandType", "twoHandVariant"] : []),
      ...(gear.bow ? ["bow", "arrow"] : []),
      ...(gear.shield ? ["shield"] : []),
      ...(gear.backpack ? ["backpack"] : []),
    ];
    root.innerHTML = `<div class="appearance-editor"><div class="appearance-heading"><span class="eyebrow">MAKE THIS HERO YOUR OWN</span><h3>Appearance</h3><p>Changes appear immediately. Drag the hero to rotate; scroll to inspect.</p></div>${!masonAvailable ? '<p class="cost-note">Licensed character art is unavailable in this build.</p>' : ""}<div class="appearance-preview-tools"><p data-preview-note role="status"></p><button type="button" data-equipped-preview>Show equipped gear</button></div><fieldset ${disabled ? "disabled" : ""}><section class="appearance-section"><h4>Face & hair</h4><div class="appearance-selects"><label class="creator-field"><span>Head style</span><select data-look="sex" aria-label="Head style"><option value="male" ${value.sex === "male" ? "selected" : ""}>Masculine</option><option value="female" ${value.sex === "female" ? "selected" : ""}>Feminine</option></select></label>${["head", "hair", "facialHair", "eyes", "brows", "mouth", "ears"].map((k) => select(k)).join("")}</div><div class="appearance-colours">${[
      ["skin", "Skin colour"],
      ["hairColor", "Hair colour"],
    ]
      .map(
        ([k, title]) =>
          `<label class="creator-field"><span>${title}</span><input type="color" data-look="${k}" aria-label="${title}" value="${value[k]}"></label>`,
      )
      .join(
        "",
      )}</div></section><details class="appearance-section" open><summary>Headwear & fantasy details</summary><div class="appearance-selects">${["headpiece", "horns", "crown", "mask", "ornament", "cloak"].map((k) => select(k)).join("")}</div><p class="cost-note">Headwear can hide hair. Hair selections temporarily hide headwear in the preview.</p></details><section class="appearance-section"><h4>Your equipment</h4><p class="cost-note">Only carried equipment offers style choices. Enchanted weapons keep their own form.</p><div class="appearance-selects">${gearFields.map((k) => select(k, k === "oneHandVariant" ? ["auto", ...MELEE_VARIANTS.one[value.mason.oneHandType]] : k === "twoHandVariant" ? ["auto", ...MELEE_VARIANTS.two[value.mason.twoHandType]] : MASON_OPTIONS[k])).join("") || "<p>No customizable equipment is carried yet.</p>"}</div></section><section class="appearance-section"><h4>Outfit & equipment colours</h4><p class="cost-note">Hover or focus a colour to light up the affected areas. Names refer to original colours. Only colours used by this preview are shown.</p><div class="appearance-colours">${paletteAreas()
      .map(
        (a) =>
          `<label class="creator-field palette-area" data-area="${a.index}"><span>${colourName(a.original)} areas</span><small>${esc(a.parts.join(", "))}</small><input type="color" data-tint="${a.index}" aria-label="${colourName(a.original)} areas — ${esc(a.parts.join(", "))}" value="${value.outfitColors[a.index] ?? a.original}"></label>`,
      )
      .join(
        "",
      )}</div><button type="button" data-tint-reset>Original outfit colours</button></section><div class="appearance-tools"><button type="button" data-look-random>Randomize face & hair</button><button type="button" data-look-reset>Reset look</button></div></fieldset><p class="appearance-note">Your class sets the outfit. Previewing carried equipment never equips it or changes statistics. Equipped headgear takes precedence in play. Some accessory combinations may overlap.</p></div>`;
    for (const [node, top] of scrolls) node.scrollTop = top;
    if (focused)
      root
        .querySelector(`[data-part="${focused}"]`)
        ?.focus({ preventScroll: true });
    note();
    root.querySelector("[data-equipped-preview]").onclick = () => {
      previewKey = null;
      onPreview(null);
      draw();
    };
    root.querySelectorAll("[data-part]").forEach(
      (el) =>
        (el.onchange = () => {
          const k = el.dataset.part;
          value.mason[k] = el.value;
          if (k === "oneHandType") value.mason.oneHandVariant = "auto";
          if (k === "twoHandType") value.mason.twoHandVariant = "auto";
          emit(k);
          draw();
        }),
    );
    root.querySelectorAll("[data-look]").forEach(
      (el) =>
        (el[el.type === "color" ? "oninput" : "onchange"] = () => {
          value[el.dataset.look] = el.value;
          emit(el.dataset.look);
          if (el.dataset.look === "sex") draw();
        }),
    );
    root.querySelectorAll("[data-tint]").forEach((el) => {
      el.oninput = () => {
        value.outfitColors[+el.dataset.tint] = el.value;
        emit();
      };
      el.onfocus = () => onHighlight(+el.dataset.tint);
      el.onblur = () => onHighlight(null);
    });
    root.querySelectorAll("[data-area]").forEach((el) => {
      el.onpointerenter = () => onHighlight(+el.dataset.area);
      el.onpointerleave = () => onHighlight(null);
    });
    root.querySelector("[data-tint-reset]").onclick = () => {
      value.outfitColors = Array(8).fill(null);
      emit();
      draw();
    };
    root.querySelector("[data-look-random]").onclick = () => {
      const random = randomAppearance(ancestry);
      value.skin = random.skin;
      value.hairColor = random.hairColor;
      for (const k of [
        "head",
        "hair",
        "eyes",
        "mouth",
        "brows",
        "facialHair",
        "ears",
      ]) {
        const list = MASON_OPTIONS[k];
        value.mason[k] = list[Math.floor(Math.random() * list.length)];
      }
      emit("hair");
      draw();
    };
    root.querySelector("[data-look-reset]").onclick = () => {
      value = normalizeAppearance({}, ancestry, name);
      previewKey = null;
      emit();
      draw();
    };
  }
  draw();
}
