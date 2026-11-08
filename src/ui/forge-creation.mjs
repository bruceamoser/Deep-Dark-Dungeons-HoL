import {
  newForgeDraft,
  forgeCharacter,
  forgeBudget,
  forgeSpent,
  forgeOrigins,
  forgeRefundPlan,
  FORGE_KITS,
} from "../core/forge.mjs";
import { FORGE_NODE } from "../core/forge-catalog.mjs";
import { forgeScreen } from "./forge.mjs";
import { disciplineStrip, disciplineIcon } from "./book-symbols.mjs";
import { DUNGEON_TRAITS } from "../core/ancestry-game.mjs";
import { normalizeAppearance } from "../core/identity.mjs";
import { appearanceControls } from "./appearance.mjs";
import { heroPreview } from "../view/appearance.mjs";
import { esc, icon } from "./icons.mjs";
export function creationScreen({
  root,
  game,
  scene,
  C,
  slot,
  respec = false,
  onRespecced,
  close,
  attempt,
  toast,
  onCreated,
}) {
  const original = game.party[slot],
    key = respec
      ? `ddd.v06.respec.${original.heroId}`
      : `ddd.v06.recruit.${slot}`;
  let draft = respec ? game.newRespecDraft(slot) : newForgeDraft(),
    step = 0,
    view,
    atlasCleanup,
    resume = null,
    shopQuery = "";
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.forge?.version === 1) resume = saved;
  } catch {}
  const steps = [
    "Identity",
    "Ancestry",
    "Origins",
    "Appearance",
    "Discipline forge",
    "Equipment",
    "Review",
  ];
  const record = (id) => C.choices.find((c) => c.id === id),
    name = (id) => record(id)?.name ?? "Not chosen";
  const options = (list, value) =>
    `<option value="">Choose…</option>${list.map((c) => `<option value="${esc(c.id)}" ${c.id === value ? "selected" : ""}>${esc(c.name)}</option>`).join("")}`;
  const field = (label, html) =>
    `<label class="creator-field"><span>${label}</span>${html}</label>`;
  function save() {
    localStorage.setItem(key, JSON.stringify(draft));
    resume = null;
  }
  function changed({ origin = false } = {}) {
    const top = root.querySelector(".creation-content")?.scrollTop ?? 0;
    if (origin) {
      const originalNodes = [...draft.forge.nodes];
      draft = forgeRefundPlan(draft, C, "__revalidate__").draft;
      const count = originalNodes.length - draft.forge.nodes.length;
      if (count)
        toast(`${count} disconnected nodes refunded after changing origins.`);
    }
    save();
    draw();
    root.querySelector(".creation-content").scrollTop = top;
  }
  const bind = (selector, event, fn) =>
    root
      .querySelectorAll(selector)
      .forEach((el) => el.addEventListener(event, () => attempt(() => fn(el))));
  function openAtlas() {
    view?.dispose();
    view = null;
    atlasCleanup = forgeScreen({
      root,
      C,
      draft,
      onChange: (value) => {
        draft = value;
        save();
      },
      attempt,
      close: () => {
        atlasCleanup?.();
        atlasCleanup = null;
        draw();
      },
    });
  }
  function draw() {
    view?.dispose();
    const p = forgeCharacter(draft, C),
      ancestry = record(draft.ancestryId),
      cls = record(draft.classId),
      remaining = forgeBudget(draft, C) - forgeSpent(draft);
    root.innerHTML = `<div class="veil"><section class="creator-window character-window" role="dialog" aria-modal="true" aria-label="${respec ? "Respec character" : "Create character"}"><header class="character-header"><div><span class="eyebrow">${respec ? "A NEW PATH · THE SAME HERO" : "A NAME WORTH REMEMBERING"}</span><h2>${respec ? "Reforge your legend" : "A new companion"}</h2></div><span class="creator-slot">LEVEL ${draft.progression.level} · ${remaining} DP AVAILABLE</span><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="creator-body"><nav class="creation-steps">${steps.map((s, i) => `<button data-step="${i}" class="${step === i ? "chosen" : ""}"><span>0${i + 1}</span>${s}</button>`).join("")}<div class="creation-note">Choose three starting disciplines through your origins. Spend DP in their circular paths. Your unspent DP carries forward.</div><button id="blank-hero" class="subtle-button">${respec ? "Restart rebuild" : "Start a blank hero"}</button></nav><main class="creation-content"><div class="section-heading"><div><span class="eyebrow">CHAPTER ${step + 1} OF ${steps.length}</span><h3>${steps[step]}</h3></div></div><div id="creation-fields"></div></main><aside class="creation-summary"><div class="creation-preview"><canvas id="recruit-preview"></canvas></div><h3>${esc(draft.name || "Unnamed adventurer")}</h3><p>${esc(name(draft.ancestryId))}<br>${esc(name(draft.classId))}</p><div class="creation-totals"><span>Maximum HP<b>${p.summary.maximumHp}</b></span><span>Grit<b>${p.summary.gritGranted}</b></span><span>Speed<b>${p.summary.speed + (p.forge.stats.movement ?? 0)}</b></span><span>DP left<b>${remaining}</b></span></div><div class="creation-validation">${p.valid ? '<span class="ready-seal">◆ Ready for the company</span>' : `<span>${p.errors.length} choices need attention</span><small>The Review step lists remaining requirements.</small>`}</div></aside></div><footer class="character-footer creator-footer"><button id="creator-back" ${!step ? "disabled" : ""}>Back</button><span>${respec ? "Your hero changes only when you confirm. Injuries and possessions are retained." : "Draft saved locally. Unspent DP is never lost."}</span>${step === 6 ? `<button id="recruit" class="primary" ${p.valid ? "" : "disabled"}>${respec ? "Confirm respec" : "Save hero to repository"}</button>` : '<button id="creator-next" class="primary">Continue →</button>'}</footer></section></div>`;
    const host = root.querySelector("#creation-fields"),
      model = ["class-arcanist", "class-shepherd", "class-intellect"].includes(
        draft.classId,
      )
        ? "Mage"
        : draft.classId === "class-shadow"
          ? "Rogue"
          : draft.classId === "class-protector"
            ? "Knight"
            : "Barbarian";
    view = heroPreview(root.querySelector("#recruit-preview"), scene.assets, {
      model,
      draft,
      name: draft.name,
      preview: p,
    });
    root.querySelector(".close").onclick = close;
    bind("[data-step]", "click", (e) => {
      step = +e.dataset.step;
      draw();
    });
    bind("#creator-next", "click", () => {
      step++;
      draw();
    });
    bind("#creator-back", "click", () => {
      step--;
      draw();
    });
    bind("#blank-hero", "click", () => {
      draft = respec ? game.newRespecDraft(slot) : newForgeDraft();
      step = 0;
      save();
      draw();
    });
    bind("#recruit", "click", async () => {
      if (respec) {
        game.respec(slot, draft, original.heroId);
        localStorage.removeItem(key);
        close();
        await onRespecced?.(slot);
        toast("Your legend has been reforged.");
      } else {
        const hero = game.createRecruit(draft);
        localStorage.removeItem(key);
        close();
        await onCreated?.(hero.heroId);
        toast(`${hero.name} saved to the character repository.`);
      }
    });
    if (step === 0) {
      host.innerHTML = `${resume ? `<button id="resume-recruit" class="resume-draft">Resume saved draft · ${esc(resume.name || "Unnamed adventurer")}</button>` : ""}<p class="section-intro">A new hero begins with a blank slate. Distribute 3 attribute points, up to 2 in any attribute.</p>${field("Hero name", `<input id="hero-name" maxlength="64" value="${esc(draft.name)}" placeholder="A name for the register">`)}<div class="attribute-allocation">${Object.entries(
        draft.attributes,
      )
        .map(
          ([k, v]) =>
            `<label class="creator-field"><span>${k[0].toUpperCase() + k.slice(1)}</span><select data-attribute="${k}" aria-label="${k}">${[0, 1, 2].map((n) => `<option ${v === n ? "selected" : ""} value="${n}">+${n}</option>`).join("")}</select></label>`,
        )
        .join(
          "",
        )}</div><p class="forge-origin-help">${3 - Object.values(draft.attributes).reduce((a, b) => a + b, 0)} points remaining. Brawn helps melee attacks and carrying; Fortitude supports health; Agility helps movement and bows; Guile supports stealth and tricks; Knowledge helps remedies and study; Reason drives many spells.</p>`;
      bind("#resume-recruit", "click", () => {
        draft = resume;
        resume = null;
        draw();
      });
      root.querySelector("#hero-name").oninput = (e) => {
        draft.name = e.target.value;
        save();
        root.querySelector(".creation-summary h3").textContent =
          draft.name || "Unnamed adventurer";
      };
      bind("[data-attribute]", "change", (e) => {
        draft.attributes[e.dataset.attribute] = +e.value;
        changed();
      });
    } else if (step === 1) {
      host.innerHTML = `${field(
        "Ancestry",
        `<select id="ancestry">${options(
          C.choices.filter((c) => c.kind === "ancestry"),
          draft.ancestryId,
        )}</select>`,
      )}${ancestry ? `<p class="ancestry-flavor">${esc(ancestry.reference?.flavor?.[0] ?? "")}</p><h3 class="subheading">Choose two traits · ${draft.traitIds.length}/2</h3><div class="trait-list">${ancestry.traits.map((id) => `<article class="trait-choice ${draft.traitIds.includes(id) ? "chosen" : ""}"><button data-trait="${id}" aria-pressed="${draft.traitIds.includes(id)}">${draft.traitIds.includes(id) ? "◆" : "◇"} ${esc(name(id))}</button><p class="dungeon-rule">${esc(DUNGEON_TRAITS[id]?.text ?? "")}</p></article>`).join("")}</div>` : ""}${
        draft.traitIds.includes("trait-human-many-homes")
          ? `<h3 class="subheading">A Foot in Two Worlds</h3>${field(
              "Other ancestry",
              `<select id="borrowed-ancestry">${options(
                C.choices.filter(
                  (c) => c.kind === "ancestry" && c.id !== "ancestry-human",
                ),
                draft.borrowedAncestryId,
              )}</select>`,
            )}${field("Borrowed trait", `<select id="borrowed-trait">${options((record(draft.borrowedAncestryId)?.traits ?? []).map(record), draft.borrowedTraitId)}</select>`)}<p>${esc(DUNGEON_TRAITS[draft.borrowedTraitId]?.text ?? "")}</p>`
          : ""
      }`;
      bind("#ancestry", "change", (e) => {
        draft.ancestryId = e.value;
        draft.traitIds = [];
        delete draft.borrowedAncestryId;
        delete draft.borrowedTraitId;
        draft.appearance = normalizeAppearance({}, e.value, draft.name);
        changed();
      });
      bind("[data-trait]", "click", (e) => {
        const id = e.dataset.trait;
        if (draft.traitIds.includes(id))
          draft.traitIds = draft.traitIds.filter((t) => t !== id);
        else if (draft.traitIds.length < 2) draft.traitIds.push(id);
        else return toast("Remove one trait before choosing another.");
        changed();
      });
      bind("#borrowed-ancestry", "change", (e) => {
        draft.borrowedAncestryId = e.value;
        delete draft.borrowedTraitId;
        changed();
      });
      bind("#borrowed-trait", "change", (e) => {
        draft.borrowedTraitId = e.value;
        changed();
      });
    } else if (step === 3) {
      appearanceControls(host, {
        appearance: draft.appearance,
        masonAvailable: scene.assets.has("DungeonMason"),
        ancestry: draft.ancestryId,
        name: draft.name,
        onChange: (value) => {
          draft.appearance = value;
          save();
          view.update({ model, draft, name: draft.name, preview: p });
        },
      });
    } else if (step === 2) {
      const disciplineChoices = (ids, current, key) =>
        `<div class="forge-origin-options">${ids.map((id) => `<button data-origin-key="${key}" data-origin-discipline="${id}" class="${current === id ? "chosen" : ""}">${disciplineIcon(id)}<span>${esc(name(id))}<small>Rank I origin · opens four paths</small></span></button>`).join("")}</div>`;
      host.innerHTML = `<p class="section-intro">Class, culture and background each grant one discipline origin. Your choices determine where you begin, never where you must finish. Duplicate origins return 3 DP each.</p>${field(
        "Class starting point",
        `<select id="class">${options(
          C.choices.filter((c) => c.kind === "class"),
          draft.classId,
        )}</select>`,
      )}${cls ? disciplineChoices(cls.startingDisciplines, draft.classDisciplines[0], "class") : ""}${[
        "culture",
        "background",
      ]
        .map((k) => {
          const r = record(draft[k].id);
          return `<h3 class="subheading">${k === "culture" ? "Where you grew up" : "Your former life"}</h3>${field(
            k,
            `<select data-origin="${k}">${options(
              C.choices.filter((c) => c.id.startsWith("origin-" + k + "-")),
              draft[k].id,
            )}</select>`,
          )}${
            r
              ? disciplineChoices(
                  r.pairs.map((p) => p.disciplineId),
                  draft[k].discipline,
                  k,
                )
              : ""
          }`;
        })
        .join(
          "",
        )}${disciplineStrip(p.state, C.choices)}<p class="forge-origin-help">${forgeOrigins(draft, C).length}/3 starting points chosen. ${forgeBudget(draft, C)} total DP available across your paths. Origins grant ranks; learn attacks and techniques by purchasing circles in the forge.</p>`;
      bind("#class", "change", (e) => {
        draft.classId = e.value;
        draft.classDisciplines = [];
        changed({ origin: true });
      });
      bind("[data-origin]", "change", (e) => {
        draft[e.dataset.origin] = { id: e.value };
        changed({ origin: true });
      });
      bind("[data-origin-discipline]", "click", (e) => {
        if (e.dataset.originKey === "class")
          draft.classDisciplines = [e.dataset.originDiscipline];
        else draft[e.dataset.originKey].discipline = e.dataset.originDiscipline;
        changed({ origin: true });
      });
    } else if (step === 4) {
      host.innerHTML = `<div class="forge-summary-hero"><span class="eyebrow">ONE CURRENCY · EVERY PATH</span><h3>${remaining} DP to shape your hero</h3><p>Follow the circles around each starting discipline. Basic attacks, techniques, recipes and passive improvements all live in the same atlas.</p>${disciplineStrip(p.state, C.choices)}<button class="primary" id="open-creation-forge">Open discipline forge</button></div><h3 class="subheading">Your purchased circles · ${draft.forge.nodes.length}</h3><div class="forge-owned-powers">${draft.forge.nodes.map((id) => `<article><h4>${esc(FORGE_NODE[id].name)}</h4><p>${esc(FORGE_NODE[id].discipline ?? "Confluence")} · ${FORGE_NODE[id].cost} DP</p></article>`).join("") || "<p>No circles purchased yet. Learn a basic attack or spell before setting out.</p>"}</div><p class="cost-note">Saving unspent DP is allowed. New disciplines can be purchased from level 2. Rank II paths open from level 3 and rank III from level 7.</p>`;
      root.querySelector("#open-creation-forge").onclick = openAtlas;
    } else if (step === 5) {
      if (respec) {
        host.innerHTML = `<p class="forge-origin-help">Your ${original.preview.inventory.items.length} inventory stacks and remaining supplies stay with this hero. Rebuilding does not grant another equipment kit or starting purse.</p><div class="forge-owned-powers">${original.preview.inventory.items.map((i) => `<article><h4>${esc(i.definition.name)}</h4><p>Quantity ${i.quantity}</p></article>`).join("")}</div>`;
        return;
      }
      host.innerHTML = `<p class="section-intro">Choose a kit, then spend up to 60 coins on extra equipment. All kits include clothes, food, water, torches and a healing bottle. Armor requires its matching forge training.</p><div class="forge-kit-grid">${Object.entries(
        FORGE_KITS,
      )
        .map(
          ([id, k]) =>
            `<button data-kit="${id}" class="${draft.kit === id ? "chosen" : ""}"><b>${k.name}</b><small>${k.text}</small></button>`,
        )
        .join(
          "",
        )}</div><h3 class="subheading">Pack · ${p.inventory.bulk} bulk / ${p.inventory.capacity} capacity</h3><div class="forge-pack">${p.inventory.items.map((i) => `<div class="forge-shop-row"><span>${esc(i.definition.name)} ×${i.quantity}<small>${i.bulk} bulk ${i.held ? "· readied" : i.worn ? "· worn" : ""}</small></span>${i.instanceId.startsWith("extra:") ? `<button data-remove="${i.instanceId}">Remove</button>` : "<small>KIT</small>"}</div>`).join("")}</div><h3 class="subheading">Extra supplies · ${p.inventory.remainingCoins} coins left</h3>${field("Find equipment", `<input type="search" id="creation-shop-search" value="${esc(shopQuery)}" placeholder="Weapons, armor, food, arrows…">`)}<div id="creation-shop"></div>`;
      bind("[data-kit]", "click", (e) => {
        draft.kit = e.dataset.kit;
        changed();
      });
      bind("[data-remove]", "click", (e) => {
        draft.shopping = draft.shopping.filter(
          (s) => s.instanceId !== e.dataset.remove,
        );
        changed();
      });
      const shop = () => {
        root.querySelector("#creation-shop").innerHTML = C.inventory.equipment
          .filter(
            (i) =>
              !i.grantOnly &&
              !i.specialOrder &&
              Number.isFinite(i.price) &&
              i.name.toLowerCase().includes(shopQuery.toLowerCase()),
          )
          .map(
            (i) =>
              `<div class="forge-shop-row"><span>${esc(i.name)}<small>${i.price} coins · ${i.bulk} bulk</small></span>${i.handChoices?.length ? `<select data-hands="${i.id}" aria-label="Hands for ${esc(i.name)}">${i.handChoices.map((n) => `<option value="${n}">${n}H</option>`).join("")}</select>` : "<span></span>"}<button data-add="${i.id}" ${p.inventory.remainingCoins < i.price ? "disabled" : ""}>+ Add</button></div>`,
          )
          .join("");
        bind("[data-add]", "click", (e) => {
          const item = C.inventory.equipment.find(
              (i) => i.id === e.dataset.add,
            ),
            hands = +(
              root.querySelector(`[data-hands="${item.id}"]`)?.value ?? 0
            );
          draft.shopping.push({
            id: item.id,
            quantity: 1,
            instanceId: "extra:" + crypto.randomUUID(),
            ...(item.handChoices?.length ? { hands } : {}),
          });
          changed();
        });
      };
      root.querySelector("#creation-shop-search").oninput = (e) => {
        shopQuery = e.target.value;
        shop();
      };
      shop();
    } else {
      host.innerHTML = `<h3>${esc(draft.name || "Unnamed adventurer")}</h3><p class="section-intro">${esc(name(draft.ancestryId))} · ${esc(name(draft.classId))} · Level ${draft.progression.level}</p>${disciplineStrip(p.state, C.choices)}<div class="forge-stats"><span>Health<b>${p.summary.maximumHp}</b></span><span>Melee profile<b>${p.forge.profiles.melee.join("/")}</b></span><span>Bow profile<b>${p.forge.profiles.ranged.join("/")}</b></span><span>DP carried forward<b>${remaining}</b></span></div>${p.valid ? '<p class="forge-origin-help">Your hero is ready. Open the company register after saving to assign them to a party slot.</p>' : `<h3 class="subheading">Complete these choices</h3><ul class="creation-errors">${p.errors.map((e) => `<li>${esc(e.text)}</li>`).join("")}</ul>`}${!draft.forge.nodes.some((id) => FORGE_NODE[id].power) ? '<p class="cost-note">You have not learned any powers. Visit the forge to learn attacks or spells before descending.</p>' : ""}${respec ? '<p class="cost-note">Maximum HP may change, but current HP never increases from rebuilding. Grit already spent, wounds, possessions and XP are retained.</p>' : ""}`;
    }
  }
  draw();
  return () => {
    view?.dispose();
    atlasCleanup?.();
  };
}
