import { originGrant, originPicker } from "./origins.mjs";
import {
  disciplineIcon,
  disciplineStrip,
  abilityType,
} from "./book-symbols.mjs";
import { icon, esc, itemIcon } from "./icons.mjs";
import { coverage } from "../core/abilities.mjs";
import { readyExample } from "../core/presets.mjs";
import { heroPreview } from "../view/appearance.mjs";
export function creationScreen({
  root,
  game,
  scene,
  R,
  C,
  examples,
  slot,
  development,
  close,
  attempt,
  toast,
  onCreated,
}) {
  const original = game.party[slot],
    key = `ddd.recruit.${slot}`;
  let draft = development
      ? structuredClone(original.draft)
      : R.newCreationDraft(),
    resumeDraft = null,
    purchaseKind = null,
    disciplineFilter = "all",
    step = development ? 5 : 0,
    search = "",
    showAll = false,
    view;
  if (development) {
    draft.progression ??= { level: 1, levels: {} };
    draft.progression.level = Math.min(
      original.earnedLevel,
      original.preview.state.level + 1,
    );
  } else {
    try {
      resumeDraft = JSON.parse(localStorage.getItem(key));
    } catch {}
    delete draft.progression;
  }
  const steps = [
    "Identity",
    "Ancestry",
    "Origins",
    "Early training",
    "Calling",
    "Hero training",
    "Equipment",
    "Review",
  ];
  const record = (id) => C.choices.find((c) => c.id === id),
    name = (id) => record(id)?.name ?? id ?? "Not chosen";
  const options = (list, value, placeholder = "Choose…") =>
    `<option value="">${placeholder}</option>${list.map((c) => `<option value="${esc(c.id)}" ${c.id === value ? "selected" : ""}>${esc(c.name)}</option>`).join("")}`;
  const field = (label, html) =>
    `<label class="creator-field"><span>${label}</span>${html}</label>`;
  const info = (c) =>
    `<details class="choice-reference" data-rules="${esc(c?.id)}"><summary>Read rules</summary>${(c?.reference?.rules?.details ?? []).map((d) => `<p><b>${esc(d.label)}</b> ${esc(d.value)}</p>`).join("")}${(c?.reference?.rules?.body ?? []).map((b) => (b.text ? `<p>${esc(b.text)}</p>` : b.items ? `<p>${b.items.map(esc).join("<br>")}</p>` : (b.outcomes ?? []).map((o) => `<p><b>${esc(o.label)}</b> ${esc(o.text)}</p>`).join(""))).join("")}</details>`;
  const changed = ({ preserveScroll = true } = {}) => {
    const scroll = preserveScroll
      ? [".creation-content", ".purchase-scroll"].map((selector) => ({
          selector,
          top: root.querySelector(selector)?.scrollTop ?? 0,
        }))
      : [];
    const openRules = new Set(
      preserveScroll
        ? [...root.querySelectorAll("details[data-rules][open]")].map(
            (e) => e.dataset.rules,
          )
        : [],
    );
    const grips = preserveScroll
      ? [...root.querySelectorAll("[data-shop-hands]")].map((e) => [
          e.dataset.shopHands,
          e.value,
        ])
      : [];

    if (!development) {
      localStorage.setItem(key, JSON.stringify(draft));
      resumeDraft = null;
    }
    draw();
    root.querySelectorAll("details[data-rules]").forEach((e) => {
      if (openRules.has(e.dataset.rules)) e.open = true;
    });
    for (const [id, value] of grips) {
      const select = root.querySelector(`[data-shop-hands="${id}"]`);
      if (select) select.value = value;
    }
    for (const { selector, top } of scroll) {
      const panel = root.querySelector(selector);
      if (panel) panel.scrollTop = top;
    }
  };
  const bind = (selector, event, fn) =>
    root
      .querySelectorAll(selector)
      .forEach((e) => e.addEventListener(event, () => attempt(() => fn(e))));
  function draw() {
    view?.dispose();
    const p = R.workshopCharacter(draft, C),
      level = draft.progression?.level ?? 1,
      cls = record(draft.classId),
      ancestry = record(draft.ancestryId);
    const visibleSteps = development ? [5, 7] : steps.map((_, i) => i);
    root.innerHTML = `<div class="veil"><section class="creator-window character-window" role="dialog" aria-modal="true" aria-label="${development ? "Character development" : "Create character"}"><header class="character-header"><div><span class="eyebrow">${development ? "GROW INTO YOUR LEGEND" : "A NAME WORTH REMEMBERING"}</span><h2>${development ? "Train in Greyhaven" : "A new companion"}</h2></div><span class="creator-slot">${development ? `COMPANY SLOT 0${slot + 1}` : "CHARACTER REPOSITORY"}</span><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="creator-body"><nav class="creation-steps">${visibleSteps.map((i) => `<button data-step="${i}" class="${step === i ? "chosen" : ""}"><span>0${i + 1}</span>${development && i === 5 ? "Development" : steps[i]}</button>`).join("")}<div class="creation-note">${development ? "Your injuries and spent resources stay with you." : "Every choice follows the HoL character rules. Unused creation DP expires between stages."}</div>${!development ? '<button id="blank-hero" class="subtle-button">Start a blank hero</button>' : ""}</nav><main class="creation-content"><div class="section-heading"><div><span class="eyebrow">${development ? "EARNED LEVEL " + original.earnedLevel : "CHAPTER " + (step + 1) + " OF 8"}</span><h3>${development && step === 5 ? "Develop your hero" : steps[step]}</h3></div><span class="creator-step-mark">${icon(step === 6 ? "pack" : step === 5 || step === 3 ? "bolt" : "book")}</span></div><div id="creation-fields"></div></main><aside class="creation-summary"><div class="creation-preview"><canvas id="recruit-preview"></canvas></div><h3>${esc(draft.name || "Unnamed adventurer")}</h3><p>${esc(name(draft.ancestryId))}<br>${esc(name(draft.classId))}</p><div class="creation-totals"><span>Health<b>${p.summary?.maximumHp ?? "—"}</b></span><span>Grit<b>${p.summary?.gritGranted ?? "—"}</b></span><span>Speed<b>${p.summary?.speed ?? "—"}</b></span><span>Coins<b>${p.inventory.remainingCoins}</b></span></div><div class="creation-validation">${p.valid ? '<span class="ready-seal">◆ Ready for the company</span>' : `<span>${p.errors.length} choices need attention</span><small>Review lists every remaining requirement.</small>`}</div></aside></div><footer class="character-footer creator-footer"><button id="creator-back" ${visibleSteps.indexOf(step) === 0 ? "disabled" : ""}>Back</button><span>${development ? "Training commits only earned, supported choices." : "Draft saved locally as you make choices."}</span>${step === 7 ? `<button id="recruit" class="primary" ${!p.valid ? "disabled" : ""}>${development ? "Commit training" : "Save hero to repository"}</button>` : '<button id="creator-next" class="primary">Continue →</button>'}</footer></section></div>`;
    const host = root.querySelector("#creation-fields");
    const model = [
      "class-arcanist",
      "class-shepherd",
      "class-intellect",
    ].includes(draft.classId)
      ? "Mage"
      : draft.classId === "class-shadow"
        ? "Rogue"
        : draft.classId === "class-protector"
          ? "Knight"
          : "Barbarian";
    view = heroPreview(root.querySelector("#recruit-preview"), scene.assets, {
      model,
      preview: p,
    });
    root.querySelector(".close").onclick = close;
    bind("[data-step]", "click", (e) => {
      purchaseKind = null;
      step = +e.dataset.step;
      search = "";
      draw();
    });
    root.querySelector("#creator-back").onclick = () => {
      purchaseKind = null;
      step = visibleSteps[visibleSteps.indexOf(step) - 1];
      search = "";
      draw();
    };
    root.querySelector("#creator-next")?.addEventListener("click", () => {
      purchaseKind = null;
      step = visibleSteps[visibleSteps.indexOf(step) + 1];
      search = "";
      draw();
    });
    root.querySelector("#blank-hero")?.addEventListener("click", () => {
      draft = R.newCreationDraft();
      step = 0;
      changed({ preserveScroll: false });
    });
    root.querySelector("#recruit")?.addEventListener("click", () =>
      attempt(async () => {
        if (development) game.develop(slot, draft);
        else {
          const hero = game.createRecruit(draft);
          localStorage.removeItem(key);
          close();
          await onCreated?.(hero.heroId);
          toast(`${hero.name} saved to the character repository.`);
          return;
        }
        close();
        toast(
          `${game.party[slot].name}: ${development ? "training committed" : "joins the company"}.`,
        );
      }),
    );
    if (step === 0) {
      host.innerHTML = `${resumeDraft ? `<button id="resume-recruit" class="resume-draft">Resume saved draft · ${esc(resumeDraft.name || "Unnamed adventurer")}</button>` : ""}<p class="section-intro">Choose a name and assign your six attributes. Values range from −2 to +2 and must total +3.</p>${field("Hero name", `<input id="hero-name" maxlength="80" value="${esc(draft.name)}" placeholder="A name for the register">`)}<div class="attribute-allocation">${Object.entries(
        draft.attributes,
      )
        .map(
          ([k, v]) =>
            `<div><span>${esc(k)}</span><button data-attribute="${k}" data-delta="-1" ${v <= -2 ? "disabled" : ""} aria-label="Decrease ${k}">−</button><b>${v >= 0 ? "+" : ""}${v}</b><button data-attribute="${k}" data-delta="1" ${v >= 2 ? "disabled" : ""} aria-label="Increase ${k}">+</button></div>`,
        )
        .join(
          "",
        )}</div><p class="allocation-total">Attribute total <b>${Object.values(draft.attributes).reduce((a, b) => a + b, 0)} / +3</b></p>${field(
        "Home language · Common is granted",
        `<select id="home-language">${options(
          R.DEFAULT_LANGUAGES.filter((l) => l.ordinary && l.id !== "common"),
          draft.languages.home,
        )}</select>`,
      )}<h3 class="subheading">Or begin with a complete adventurer</h3><div class="preset-grid">${examples.map((e) => `<button data-preset="${e.id}">${esc(e.draft.name)}<small>${esc(name(e.draft.classId))}</small></button>`).join("")}</div>`;
      root.querySelector("#resume-recruit")?.addEventListener("click", () => {
        draft = structuredClone(resumeDraft);
        delete draft.progression;
        changed();
      });
      root.querySelector("#hero-name").onchange = (e) => {
        draft.name = e.target.value;
        changed();
      };
      root.querySelector("#home-language").onchange = (e) => {
        draft.languages.home = e.target.value;
        changed();
      };
      bind("[data-attribute]", "click", (e) => {
        draft.attributes[e.dataset.attribute] += +e.dataset.delta;
        changed();
      });
      bind("[data-preset]", "click", (e) => {
        draft = readyExample(
          examples.find((p) => p.id === e.dataset.preset).draft,
          R,
          C,
        );
        changed();
      });
    } else if (step === 1) {
      host.innerHTML = `<p class="section-intro">Choose an ancestry and two of its five traits.</p><div class="choice-grid">${C.choices
        .filter((c) => c.kind === "ancestry")
        .map(
          (c) =>
            `<button data-ancestry="${c.id}" class="choice-card ${draft.ancestryId === c.id ? "chosen" : ""}"><strong>${esc(c.name)}</strong><small>HP +${c.hp} · Speed ${c.speed}</small></button>`,
        )
        .join("")}</div>${
        ancestry
          ? `<p class="ancestry-flavor">${esc(ancestry.reference?.flavor?.[0] ?? "")}</p><h3 class="subheading">Ancestry traits <small>${draft.traitIds.length} / 2</small></h3><div class="trait-list">${ancestry.traits
              .map((id) => {
                const c = record(id);
                return `<article class="trait-choice ${draft.traitIds.includes(id) ? "chosen" : ""}"><button data-trait="${id}">${draft.traitIds.includes(id) ? "◆" : "◇"} ${esc(c.name)}</button>${info(c)}</article>`;
              })
              .join("")}</div>`
          : ""
      }${
        draft.traitIds.includes("trait-human-many-homes")
          ? `<h3 class="subheading">A Foot in Two Worlds</h3>${field(
              "Other ancestry",
              `<select id="borrowed-ancestry">${options(
                C.choices.filter(
                  (c) => c.kind === "ancestry" && c.id !== draft.ancestryId,
                ),
                draft.borrowedAncestryId,
              )}</select>`,
            )}${field("Borrowed trait", `<select id="borrowed-trait">${options((record(draft.borrowedAncestryId)?.traits ?? []).map(record), draft.borrowedTraitId)}</select>`)}${field(
              "Ancestry language",
              `<select id="ancestry-language">${options(
                R.DEFAULT_LANGUAGES.filter((l) => l.ordinary),
                draft.languages.ancestry,
              )}</select>`,
            )}`
          : ""
      }`;
      bind("[data-ancestry]", "click", (e) => {
        draft.ancestryId = e.dataset.ancestry;
        draft.traitIds = [];
        delete draft.borrowedAncestryId;
        delete draft.borrowedTraitId;
        changed();
      });
      bind("[data-trait]", "click", (e) => {
        const id = e.dataset.trait;
        if (draft.traitIds.includes(id))
          draft.traitIds = draft.traitIds.filter((x) => x !== id);
        else if (draft.traitIds.length < 2) draft.traitIds.push(id);
        else
          throw new Error(
            "Choose two traits; deselect one before choosing another.",
          );
        changed();
      });
      for (const [id, prop] of [
        ["borrowed-ancestry", "borrowedAncestryId"],
        ["borrowed-trait", "borrowedTraitId"],
      ])
        root.querySelector("#" + id)?.addEventListener("change", (e) => {
          draft[prop] = e.target.value;
          changed();
        });
      root
        .querySelector("#ancestry-language")
        ?.addEventListener("change", (e) => {
          draft.languages.ancestry = e.target.value;
          changed();
        });
    } else if (step === 2) {
      host.innerHTML = `<p class="section-intro">Your culture and background each grant <b>one</b> discipline–ability pair. Compare both options before choosing.</p><div class="origin-selections">${[
        "culture",
        "background",
      ]
        .map((type) => {
          const selected = record(draft[type]?.id),
            pair = selected?.pairs?.[draft[type]?.pair];
          return `<section class="origin-selection" data-origin-summary="${type}"><div class="origin-selection-heading"><div><span class="eyebrow">${type === "culture" ? "WHERE YOU GREW UP · CULTURE" : "THE LIFE YOU LEFT · BACKGROUND"}</span><h3>${esc(selected?.name ?? `Choose your ${type}`)}</h3></div><button data-origin="${type}">${selected ? "Change" : "Choose"} ${type}</button></div>${pair ? `${originGrant(pair, C.choices)}<p class="origin-receipt">Granted by your ${type} · ${selected.coins} starting coins</p>${info(record(pair.abilityId))}` : '<p class="origin-empty">Browse every origin, its two grant pairs and the full ability rules.</p>'}</section>`;
        })
        .join(
          "",
        )}</div><p class="section-intro">Duplicate grants refund DP through the source rules.</p>`;
      bind("[data-origin]", "click", (e) => {
        const type = e.dataset.origin;
        originPicker({
          root,
          choices: C.choices,
          type,
          current: draft[type],
          info,
          attempt,
          choose: (selection) => {
            draft[type] = selection;
            changed();
          },
        });
      });
    } else if (step === 4) {
      host.innerHTML = `<p class="section-intro">Your calling grants two starting disciplines and a level-one signature. Choose a class whose required attributes are at least zero.</p><div class="choice-grid">${C.choices
        .filter((c) => c.kind === "class")
        .map((c) => {
          const eligible = R.classEligibility(c, draft.attributes);
          return `<button class="choice-card ${draft.classId === c.id ? "chosen" : ""}" data-class="${c.id}" ${eligible.eligible ? "" : "disabled"} title="${esc(eligible.reasons.map((r) => r.text).join(" "))}"><strong>${esc(c.name)}</strong><small>HP +${c.hp} · ${c.minimumAttributes.join(" / ")} ≥ 0</small></button>`;
        })
        .join(
          "",
        )}</div>${cls ? `<h3 class="subheading">Starting disciplines · Choose two</h3><div class="choice-grid">${cls.startingDisciplines.map((id) => `<button data-class-discipline="${id}" class="choice-card ${draft.classDisciplines.includes(id) ? "chosen" : ""}">${disciplineIcon(id)}${esc(name(id))}</button>`).join("")}</div><h3 class="subheading">Signature</h3><div class="trait-list">${cls.signatures[1].map((id) => `<article class="trait-choice ${draft.signatureId === id ? "chosen" : ""}"><button data-signature="${id}">${draft.signatureId === id ? "◆" : "◇"} ${esc(name(id))}<small>${esc(coverage(id).status)}</small></button>${abilityType(record(id))}${info(record(id))}</article>`).join("")}</div>` : ""}`;
      bind("[data-class]", "click", (e) => {
        draft.classId = e.dataset.class;
        draft.classDisciplines = [];
        delete draft.signatureId;
        changed();
      });
      bind("[data-class-discipline]", "click", (e) => {
        const id = e.dataset.classDiscipline;
        if (draft.classDisciplines.includes(id))
          draft.classDisciplines = draft.classDisciplines.filter(
            (x) => x !== id,
          );
        else if (draft.classDisciplines.length < 2)
          draft.classDisciplines.push(id);
        else throw new Error("Choose two starting disciplines.");
        changed();
      });
      bind("[data-signature]", "click", (e) => {
        draft.signatureId = e.dataset.signature;
        changed();
      });
    } else if (step === 3 || step === 5) {
      const stage = step === 3 ? 0 : 1;
      let purchases, acquisitions, state;
      if (development) {
        draft.progression.levels[level] ??= R.emptyLevelDraft();
        purchases = draft.progression.levels[level].purchases;
        acquisitions = draft.progression.levels[level].acquisitions;
        state = p.state;
      } else {
        purchases = draft.purchases[stage];
        acquisitions = draft.acquisitions;
        state = p.stages[stage];
      }
      const disciplinesLocked = state.level === 0;
      const locked = development
        ? (original.draft.progression?.levels?.[level]?.purchases.length ?? 0)
        : 0;
      host.innerHTML = `<div class="training-banner"><div><b>${state.dp}</b><span>DP AVAILABLE</span></div><p>${development ? "Advancement DP carries forward. Attributes do not increase automatically." : stage === 0 ? "Level 0 · Ability purchases only. Your first pool is 10 + Knowledge + Reason + Guile. Discipline purchases begin at level 1; unused points expire before your calling." : "A separate pool of 10 + Knowledge + Reason + Guile. Unused points expire when creation ends."}</p></div>${
        development
          ? field(
              "Training level",
              `<select id="training-level">${Array.from(
                {
                  length:
                    original.earnedLevel - original.preview.state.level + 1,
                },
                (_, i) => original.preview.state.level + i,
              )
                .filter((n) => n >= 2)
                .map(
                  (n) =>
                    `<option ${n === level ? "selected" : ""}>${n}</option>`,
                )
                .join("")}</select>`,
            )
          : ""
      }<div class="purchase-receipts">${purchases.map((x, i) => `<span>${esc(name(x.id))}${x.rank ? " " + x.rank : ""}${i >= locked ? `<button data-remove-purchase="${i}" aria-label="Remove ${esc(name(x.id))}">×</button>` : ""}</span>`).join("") || "<span>No DP spent in this stage.</span>"}</div>${disciplineStrip(state, C.choices)}<div class="purchase-gateways"><button data-purchase-kind="discipline" ${disciplinesLocked ? 'disabled aria-describedby="discipline-level-lock"' : ""}>${disciplineIcon("discipline-arms")}<span>Purchase disciplines<small id="discipline-level-lock">${disciplinesLocked ? "Unlocks at level 1 · Granted by origins at level 0" : "Learn a discipline or raise a rank"}</small></span>${icon("arrow")}</button><button data-purchase-kind="ability">${icon("book")}<span>Purchase abilities<small>Browse by discipline and action type</small></span>${icon("arrow")}</button></div><div id="acquisition-choices"></div>`;
      bind("[data-purchase-kind]", "click", (e) => {
        if (e.dataset.purchaseKind === "discipline" && disciplinesLocked)
          return;
        purchaseKind = e.dataset.purchaseKind;
        search = "";
        showAll = purchaseKind === "discipline";
        disciplineFilter = "all";
        drawPicker();
      });
      function drawPicker() {
        root.querySelector(".purchase-overlay")?.remove();
        if (
          !purchaseKind ||
          (purchaseKind === "discipline" && disciplinesLocked)
        )
          return;
        const isAbility = purchaseKind === "ability";
        const overlay = document.createElement("div");
        overlay.className = "purchase-overlay";
        overlay.innerHTML = `<section class="purchase-window" role="dialog" aria-modal="true" aria-label="Purchase ${isAbility ? "abilities" : "disciplines"}"><header><div><span class="eyebrow">${esc(draft.name || "YOUR NEXT LEGEND")} · ${development ? "ADVANCEMENT" : stage === 0 ? "EARLY TRAINING" : "HERO TRAINING"}</span><h2>Purchase ${isAbility ? "abilities" : "disciplines"}</h2></div><div class="purchase-dp"><b>${state.dp}</b> DP available</div><button data-close-picker class="icon-button" aria-label="Close purchases">${icon("close")}</button></header>${disciplineStrip(state, C.choices, isAbility, disciplineFilter)}<div class="purchase-tools"><input id="training-search" type="search" placeholder="Search ${isAbility ? "abilities" : "disciplines"}…" aria-label="Search training" value="${esc(search)}">${isAbility ? `<label>Discipline<select id="discipline-filter">${options([{ id: "all", name: "All disciplines" }, { id: "owned", name: "My disciplines" }, { id: "general", name: "General abilities" }, ...C.choices.filter((c) => c.kind === "discipline")], disciplineFilter).replace('<option value="">Choose…</option>', "")}</select></label>` : ""}<label class="show-all"><input id="training-all" type="checkbox" ${showAll ? "checked" : ""}> Show unavailable</label></div><div class="purchase-scroll"><div id="training-choices" class="purchase-cards"></div></div><footer><span>A · Action &nbsp; M · Maneuver &nbsp; R · Reaction &nbsp; P · Passive</span><button data-close-picker class="primary">Done</button></footer></section>`;
        root.querySelector(".veil").append(overlay);
        const closePicker = () => {
          purchaseKind = null;
          overlay.remove();
          root
            .querySelector(
              `[data-purchase-kind="${isAbility ? "ability" : "discipline"}"]`,
            )
            ?.focus();
        };
        overlay
          .querySelectorAll("[data-close-picker]")
          .forEach((b) => (b.onclick = closePicker));
        overlay.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            closePicker();
          }
        });
        const drawChoices = () => {
          const records = C.choices
            .filter((c) => c.kind === purchaseKind && !c.universal)
            .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
            .filter((c) => {
              if (!isAbility || disciplineFilter === "all") return true;
              const reqs = (c.requirements ?? []).filter(
                (r) => r.kind === "discipline",
              );
              if (disciplineFilter === "general") return !reqs.length;
              if (disciplineFilter === "owned")
                return !reqs.length || reqs.some((r) => state.ranks[r.id] > 0);
              return reqs.some((r) => r.id === disciplineFilter);
            })
            .map((c) => ({ c, e: R.purchaseEligibility(c, state, C.choices) }))
            .filter(
              ({ c, e }) =>
                showAll ||
                e.eligible ||
                (c.purchasePolicy === "new-recipe" &&
                  e.reasons.every((r) => r.code === "recipe")),
            )
            .sort(
              (a, b) =>
                Number(b.e.eligible) - Number(a.e.eligible) ||
                a.c.name.localeCompare(b.c.name),
            );
          overlay.querySelector("#training-choices").innerHTML =
            records
              .map(({ c, e }) => {
                const unsupported =
                  development &&
                  isAbility &&
                  coverage(c.id).status !== "included";
                const requirements = (c.requirements ?? []).filter(
                  (r) => r.kind === "discipline",
                );
                return `<article class="purchase-card ${!e.eligible || unsupported ? "unavailable" : ""}" data-choice="${c.id}"><div class="purchase-card-heading">${isAbility ? abilityType(c) : disciplineIcon(c.id)}<div><h3>${esc(c.name)}</h3><small>${isAbility ? requirements.map((r) => `${esc(name(r.id))} ${r.rank}`).join(" · ") || "General ability" : `Rank ${state.ranks[c.id] ?? 0} → ${e.rank ?? "—"}`}</small></div></div><p class="purchase-description">${esc(c.reference?.flavor?.[0] ?? (isAbility ? "Read the full card below." : "Develop your training in " + c.name + "."))}</p>${isAbility ? `<div class="purchase-card-meta">${requirements.map((r) => `<span>${disciplineIcon(r.id)}${esc(name(r.id))} ${r.rank}</span>`).join("")}<span>Level ${c.minimumLevel}</span><span>${esc(coverage(c.id).status)}</span></div>${info(c)}` : ""}${
                  c.purchasePolicy === "new-recipe"
                    ? `<div class="recipe-study">${[0, 1]
                        .map(
                          (n) =>
                            `<select data-study="${c.id}" data-number="${n}">${options(
                              C.inventory.recipes.filter(
                                (r) =>
                                  state.compatibleRecipes.includes(r.id) &&
                                  !state.recipes.includes(r.id),
                              ),
                              null,
                              "Choose recipe " + (n + 1),
                            )}</select>`,
                        )
                        .join("")}</div>`
                    : ""
                }<div class="purchase-card-bottom"><small>${unsupported ? "Not available for dungeon training." : esc(e.reasons.map((r) => r.text).join(" "))}</small><button data-buy="${c.id}" ${unsupported || (!e.eligible && c.purchasePolicy !== "new-recipe") ? "disabled" : ""}>${e.cost ?? "—"} DP · ${isAbility ? "Learn" : "Purchase rank"}</button></div></article>`;
              })
              .join("") ||
            '<p class="empty-state">No matching purchases. Change the discipline filter or show unavailable choices.</p>';
          overlay.querySelectorAll("[data-buy]").forEach(
            (b) =>
              (b.onclick = () =>
                attempt(() => {
                  const c = record(b.dataset.buy),
                    selection = { id: c.id };
                  if (c.kind === "discipline")
                    selection.rank = (state.ranks[c.id] ?? 0) + 1;
                  if (c.purchasePolicy === "new-recipe")
                    selection.recipeIds = [
                      ...overlay.querySelectorAll(`[data-study="${c.id}"]`),
                    ].map((s) => s.value);
                  const check = R.purchaseEligibility(
                    c,
                    state,
                    C.choices,
                    selection,
                  );
                  if (!check.eligible)
                    throw new Error(check.reasons.map((r) => r.text).join(" "));
                  purchases.push(selection);
                  changed();
                })),
          );
        };
        drawChoices();
        overlay.querySelector("#training-search").oninput = (e) => {
          search = e.target.value;
          drawChoices();
        };
        overlay.querySelector("#training-all").onchange = (e) => {
          showAll = e.target.checked;
          drawChoices();
        };
        overlay
          .querySelector("#discipline-filter")
          ?.addEventListener("change", (e) => {
            disciplineFilter = e.target.value;
            drawChoices();
          });
        overlay.querySelectorAll("[data-filter-discipline]").forEach(
          (b) =>
            (b.onclick = () => {
              disciplineFilter = b.dataset.filterDiscipline;
              drawPicker();
            }),
        );
        overlay.querySelector("[data-close-picker]").focus();
      }
      if (purchaseKind) drawPicker();
      root.querySelector("#training-level")?.addEventListener("change", (e) => {
        draft.progression.level = +e.target.value;
        changed();
      });
      bind("[data-remove-purchase]", "click", (e) => {
        purchases.splice(+e.dataset.removePurchase, 1);
        changed();
      });
      const acquired = state.abilities.filter(
        (id) => !development || !original.preview.state.abilities.includes(id),
      );
      root.querySelector("#acquisition-choices").innerHTML = `${
        development
          ? [3, 7]
              .filter((t) => t <= level && t > original.preview.state.level)
              .map(
                (t) =>
                  `<h3 class="subheading">Level ${t} signature</h3>${field(
                    "Signature",
                    `<select data-advance-signature="${t}">${options(
                      (cls?.signatures[t] ?? [])
                        .map(record)
                        .filter((c) => coverage(c.id).status === "included"),
                      draft.progression.levels[level].signatures[t],
                      "Choose a supported signature",
                    )}</select>`,
                  )}`,
              )
              .join("")
          : ""
      }<h3 class="subheading">Granted equipment & choices</h3>${acquired
        .map((id) => {
          const a = C.inventory.acquisitions.find((a) => a.id === id);
          if (!a) return "";
          const selected = acquisitions[id] ?? {};
          const needsHands =
            a.items.includes("item-ordinary-melee-weapon") ||
            (a.weaponChoice && selected.weapon === "melee");
          return a.weaponChoice ||
            needsHands ||
            a.recipeChoices ||
            a.languageChoice ||
            a.instrumentChoice
            ? `<div class="acquisition-choice"><h4>${esc(name(id))}</h4>${
                a.weaponChoice
                  ? field(
                      "Weapon",
                      `<select data-acquire="${id}" data-key="weapon">${options(
                        a.weaponChoice.map((id) => ({ id, name: id })),
                        selected.weapon,
                      )}</select>`,
                    )
                  : ""
              }${needsHands ? field("Melee grip", `<select data-acquire="${id}" data-key="meleeHands"><option value="">Choose…</option>${[1, 2].map((n) => `<option value="${n}" ${selected.meleeHands === n ? "selected" : ""}>${n} hand${n === 2 ? "s" : ""}</option>`).join("")}</select>`) : ""}${
                a.languageChoice
                  ? field(
                      "Learned language",
                      `<select data-acquire="${id}" data-key="languageId">${options(
                        R.DEFAULT_LANGUAGES.filter((l) => l.ordinary),
                        selected.languageId,
                      )}</select>`,
                    )
                  : ""
              }${a.instrumentChoice ? field("Owned instrument", `<input data-acquire="${id}" data-key="instrument" value="${esc(selected.instrument ?? "")}">`) : ""}${
                a.recipeChoices
                  ? Array.from({ length: a.recipeChoices }, (_, n) =>
                      field(
                        "Recipe " + (n + 1),
                        `<select data-acquire="${id}" data-key="recipes" data-recipe-index="${n}">${options(
                          C.inventory.recipes.filter(
                            (r) =>
                              r.genericChoice && r.permissions.includes(id),
                          ),
                          selected.recipes?.[n],
                        )}</select>`,
                      ),
                    ).join("")
                  : ""
              }</div>`
            : "";
        })
        .join("")}`;
      bind("[data-acquire]", "change", (e) => {
        const id = e.dataset.acquire,
          k = e.dataset.key;
        acquisitions[id] ??= {};
        if (k === "recipes") {
          acquisitions[id].recipes ??= [];
          acquisitions[id].recipes[+e.dataset.recipeIndex] = e.value;
        } else acquisitions[id][k] = k === "meleeHands" ? +e.value : e.value;
        changed();
      });
      bind("[data-advance-signature]", "change", (e) => {
        draft.progression.levels[level].signatures[e.dataset.advanceSignature] =
          e.value;
        changed();
      });
    } else if (step === 6) {
      const goods = C.inventory.equipment.filter(
        (i) => !i.specialOrder && !i.grantOnly && Number.isFinite(i.price),
      );
      const owned = (id) =>
        p.inventory.items
          .filter((i) => i.catalogId === id)
          .reduce((n, i) => n + i.quantity, 0);
      const granted = (id) =>
        p.inventory.items
          .filter((i) => i.catalogId === id && i.source !== "coins")
          .reduce((n, i) => n + i.quantity, 0);
      const incomplete = p.errors.filter(
        (e) => e.code === "acquisition" && !e.equipment,
      );
      host.innerHTML = `<div class="training-banner"><div><b>${p.inventory.remainingCoins}</b><span>COINS REMAINING</span></div><p>Starting purse ${p.inventory.startingCoins} · Spent ${p.inventory.spent}<br>Bulk ${p.inventory.bulk} / ${p.inventory.capacity}. Granted gear costs no coins.</p></div><h3 class="subheading">Already in your pack</h3><div class="creation-pack">${p.inventory.items.map((i) => `<article data-owned-item="${i.catalogId}" data-source="${esc(i.source)}">${icon(itemIcon(i))}<div><strong>${i.quantity} × ${esc(i.definition.name)}</strong><small>${i.source === "coins" ? "Purchased with coins" : i.source === "creation" ? "Starting outfit · Granted" : `Granted by ${esc(name(i.source))}`}${i.hands ? ` · ${i.hands} hand${i.hands === 2 ? "s" : ""}` : ""}${i.inventoryDie ? ` · d${i.inventoryDie}` : ""}</small></div><span>${i.source === "coins" ? "BOUGHT" : "GRANTED"}</span></article>`).join("")}</div>${incomplete.length ? `<div class="creation-errors"><b>Finish your granted equipment choices</b>${incomplete.map((e) => `<p>${esc(name(e.id))}: ${esc(e.text ?? e.reasons?.map((r) => r.text).join(" ") ?? "Choose the granted equipment.")} <button data-finish-grant="${e.id}">Complete choice</button></p>`).join("")}</div>` : ""}<div class="purchase-receipts">${draft.shopping.map((x, i) => `<span>${x.quantity} × ${esc(C.inventory.equipment.find((c) => c.id === x.id)?.name)}<button data-remove-item="${i}" aria-label="Remove purchased item">×</button></span>`).join("")}</div><h3 class="subheading">Buy additional equipment</h3><div class="shop-grid">${goods.map((i) => `<article data-stock="${i.id}">${icon(itemIcon(i))}<strong>${esc(i.name)}</strong><small>${i.price} coins · ${i.bulk} bulk${i.inventoryDie ? " · d" + i.inventoryDie : ""}</small><span class="owned-count ${owned(i.id) ? "has-owned" : ""}">Owned ${owned(i.id)}${granted(i.id) ? ` · ${granted(i.id)} granted` : ""}</span>${i.handChoices.length > 1 ? `<select data-shop-hands="${i.id}">${i.handChoices.map((n) => `<option value="${n}">${n} hand${n === 2 ? "s" : ""}</option>`).join("")}</select>` : ""}<button data-shop="${i.id}" ${i.price > p.inventory.remainingCoins ? "disabled" : ""}>${owned(i.id) ? "Buy another" : "Buy"} · ${i.price} coins</button></article>`).join("")}</div>`;
      bind("[data-finish-grant]", "click", (e) => {
        step = p.stages[0].abilities.includes(e.dataset.finishGrant) ? 3 : 5;
        purchaseKind = null;
        draw();
        root
          .querySelector(`[data-acquire="${e.dataset.finishGrant}"]`)
          ?.focus();
      });
      bind("[data-shop]", "click", (e) => {
        const i = goods.find((x) => x.id === e.dataset.shop);
        draft.shopping.push({
          id: i.id,
          quantity: 1,
          hands: +(
            root.querySelector(`[data-shop-hands="${i.id}"]`)?.value ??
            i.handChoices[0] ??
            0
          ),
          instanceId: `purchase:${crypto.randomUUID()}`,
        });
        changed();
      });
      bind("[data-remove-item]", "click", (e) => {
        draft.shopping.splice(+e.dataset.removeItem, 1);
        changed();
      });
    } else {
      const unsupported = p.state.abilities.filter(
        (id) => coverage(id).status !== "included",
      );
      host.innerHTML = `<div class="review-heading">${icon(p.valid ? "shield" : "book")}<h3>${p.valid ? "Ready to write a new chapter" : "A few choices remain"}</h3></div>${p.errors.length ? `<div class="creation-errors">${p.errors.map((e) => `<p>${esc(e.text ?? e.code)}</p>`).join("")}</div>` : '<p class="section-intro">This character passes the complete HoL creation and advancement validators.</p>'}<div class="journey-grid"><div><span class="eyebrow">ORIGINS</span><h3>${esc(name(draft.culture?.id))}</h3><p>${esc(name(draft.background?.id))}</p><p>${esc((p.summary?.languages ?? []).map((l) => l.name).join(", "))}</p></div><div><span class="eyebrow">RESOURCES</span><h3>${p.summary?.maximumHp ?? "—"} HP · ${p.summary?.gritGranted ?? "—"} Grit</h3><p>${p.development.spent} DP spent · ${p.development.expired} creation DP expired</p><p>${p.inventory.remainingCoins} coins · ${p.inventory.bulk} bulk</p></div></div><h3 class="subheading">Dungeon ability coverage</h3><p class="section-intro">${p.state.abilities.length - unsupported.length} learned cards currently supported. These source choices are retained but do not yet have dungeon actions:</p><div class="coverage-tags">${unsupported.map((id) => `<span>${esc(name(id))} <small>${esc(coverage(id).status)}</small></span>`).join("") || "<span>All learned cards supported.</span>"}</div>`;
    }
    if (step !== 7) {
      const errors = development ? p.errors : R.creationStepErrors(p, step);
      if (errors.length)
        host.insertAdjacentHTML(
          "beforeend",
          `<div class="creation-errors"><span class="eyebrow">TO COMPLETE THIS BUILD</span>${errors.map((e) => `<p>${esc(e.text ?? e.code)}</p>`).join("")}</div>`,
        );
    }
  }
  draw();
  return () => view?.dispose();
}
