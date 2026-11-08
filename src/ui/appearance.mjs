import { normalizeAppearance, randomAppearance } from "../core/identity.mjs";
import { MASON_OPTIONS, MELEE_VARIANTS } from "../core/mason-appearance.mjs";
import { esc } from "./icons.mjs";
const titles = {
  oneHandType: "One-handed melee type",
  twoHandType: "Two-handed melee type",
  oneHandVariant: "One-handed variant",
  twoHandVariant: "Two-handed variant",
  bow: "Equipped bow style",
  arrow: "Arrow style",
  body: "Outfit / body",
  head: "Head",
  hair: "Hair",
  eyes: "Eyes",
  mouth: "Mouth",
  brows: "Eyebrows",
  headpiece: "Headpiece",
  facialHair: "Facial hair",
  ears: "Ears",
  horns: "Horns",
  crown: "Crown",
  eyewear: "Eyewear",
  mask: "Face covering",
  ornament: "Extra accessory",
  cloak: "Cloak",
  backpack: "Equipped backpack style",
  shield: "Equipped shield style",
  weapon: "Equipped melee weapon style",
};
const label = (id) =>
  ({ auto: "Ancestry suggestion", class: "Class signature", none: "None" })[
    id
  ] ??
  id
    .replace(/^AC\d+_/, "")
    .replace(/^Body/, "Outfit ")
    .replace(/^Hat/, "Headwear ")
    .replace(/^HeadArmor/, "Armoured headwear ")
    .replace(/^OHS/, "One-handed ")
    .replace(/^THS/, "Two-handed ")
    .replace(/^THA/, "Two-handed axe ")
    .replace(/^THH/, "Two-handed hammer ")
    .replace(/_/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2");
export function appearanceControls(
  root,
  {
    appearance,
    ancestry,
    name,
    onChange,
    disabled = false,
    masonAvailable = false,
  },
) {
  let value = normalizeAppearance(appearance, ancestry, name);
  const emit = () => onChange(structuredClone(value));
  function draw() {
    const mason = true;
    const select = (key, title, choices, selected, group = "look") =>
      `<label class="creator-field"><span>${esc(title)}</span><select data-${group}="${key}" aria-label="${esc(title)}">${choices.map(([id, text]) => `<option value="${esc(id)}" ${selected === id ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></label>`;
    const options = mason
      ? Object.entries(MASON_OPTIONS)
          .filter(([key]) => !["weapon", "body"].includes(key))
          .map(([key, choices]) => {
            if (key === "oneHandVariant")
              choices = [
                "auto",
                ...MELEE_VARIANTS.one[value.mason.oneHandType],
              ];
            if (key === "twoHandVariant")
              choices = [
                "auto",
                ...MELEE_VARIANTS.two[value.mason.twoHandType],
              ];
            return select(
              key,
              titles[key],
              choices.map((id) => [
                id,
                id === "auto"
                  ? key === "body"
                    ? "Class outfit"
                    : key.endsWith("Variant")
                      ? "Default variant"
                      : "Suggested head"
                  : label(id),
              ]),
              value.mason[key],
              "part",
            );
          })
          .join("")
      : "";
    root.innerHTML = `<div class="appearance-editor"><div class="appearance-heading"><div><span class="eyebrow">PERSONAL APPEARANCE</span><h3>A hero to remember</h3><p>Make your hero your own. Drag to rotate; scroll to inspect.</p></div></div>${disabled ? '<p class="cost-note">Return to Greyhaven to change your look.</p>' : ""}${mason && !masonAvailable ? '<p class="cost-note">Dungeon Mason assets are not installed in this build. The preview uses a KayKit character.</p>' : ""}<fieldset ${disabled ? "disabled" : ""}><div class="appearance-selects">${
      mason
        ? select(
            "sex",
            "Head style",
            [
              ["male", "Masculine"],
              ["female", "Feminine"],
            ],
            value.sex,
          )
        : ""
    }${options}</div>${mason ? `<div class="appearance-palette"><label class="creator-field"><span>Skin colour</span><input type="color" data-look="skin" aria-label="Skin colour" value="${value.skin}"></label><label class="creator-field"><span>Hair colour</span><input type="color" data-look="hairColor" aria-label="Hair colour" value="${value.hairColor}"></label>${value.outfitColors.map((color, i) => `<label class="creator-field"><span>Palette ${i + 1}</span><input type="color" data-tint="${i}" aria-label="Palette ${i + 1}" value="${color ?? "#ffffff"}"></label>`).join("")}<button type="button" data-tint-reset>Original outfit colours</button></div>` : ""}<div class="appearance-tools"><button type="button" data-look-random>Randomize look</button><button type="button" data-look-reset>Reset look</button></div></fieldset><p class="appearance-note">${mason ? "Your class determines your outfit and suggests signature headwear. Customize the headwear, colours and accessories. Headwear hides hair; choose None to show your hairstyle. Backpacks, weapons and shields appear only when equipped; worn headgear replaces cosmetic headwear. Your class outfit is cosmetic; equipped armour determines protection. Ordinary weapon styles can be changed at any time. Magic weapons keep their own fixed form and variant. Palette colours affect the matching authored regions across clothing and accessories. Regions vary by outfit. Some accessory combinations may overlap." : "KayKit characters keep their original clothing, hair and faces. Their parts do not mix with Dungeon Mason parts."} Appearance never changes statistics.</p></div>`;
    root.querySelectorAll("[data-look]").forEach(
      (el) =>
        (el.onchange = () => {
          value[el.dataset.look] = el.value;
          emit();
          if (el.dataset.look === "sex") draw();
        }),
    );
    root.querySelectorAll("[data-tint]").forEach(
      (el) =>
        (el.onchange = () => {
          value.outfitColors[Number(el.dataset.tint)] = el.value;
          emit();
        }),
    );
    const resetTint = root.querySelector("[data-tint-reset]");
    if (resetTint)
      resetTint.onclick = () => {
        value.outfitColors = Array(8).fill(null);
        emit();
        draw();
      };
    root.querySelectorAll("[data-part]").forEach(
      (el) =>
        (el.onchange = () => {
          value.mason[el.dataset.part] = el.value;
          if (el.dataset.part === "oneHandType")
            value.mason.oneHandVariant = "auto";
          if (el.dataset.part === "twoHandType")
            value.mason.twoHandVariant = "auto";
          emit();
          if (el.dataset.part.endsWith("Type")) draw();
        }),
    );
    root.querySelector("[data-look-random]").onclick = () => {
      value = randomAppearance(ancestry);
      value.family = "mason";
      if (mason)
        for (const key of [
          "body",
          "head",
          "hair",
          "eyes",
          "mouth",
          "brows",
          "facialHair",
          "ears",
          "ornament",
        ]) {
          const choices = MASON_OPTIONS[key];
          value.mason[key] =
            choices[Math.floor(Math.random() * choices.length)];
        }
      emit();
      draw();
    };
    root.querySelector("[data-look-reset]").onclick = () => {
      value = normalizeAppearance({}, ancestry, name);
      value.family = "mason";
      emit();
      draw();
    };
  }
  draw();
}
