import { abilityType, disciplineIcon } from "./book-symbols.mjs";
import { icon, itemIcon, actionIcon, esc } from "./icons.mjs";
import { ABILITIES, coverage } from "../core/abilities.mjs";
import { heroPreview } from "../view/appearance.mjs";
export function characterSheet({
  root,
  game,
  scene,
  C,
  index,
  close,
  attempt,
  activate,
  train,
}) {
  let tab = "equipment",
    filter = "all",
    query = "",
    selection = null,
    view;
  const name = (id) => C.choices.find((c) => c.id === id)?.name ?? id;
  const shell = () => {
    const h = game.party[index],
      p = h.preview;
    root.innerHTML = `<div class="veil character-veil"><section class="character-window" role="dialog" aria-modal="true" aria-label="Character sheet">
   <header class="character-header"><div><span class="eyebrow">THE COMPANY OF GREYHAVEN</span><h2>${esc(h.name)}</h2><p>${esc(name(h.draft.ancestryId))} <i>·</i> ${esc(name(h.draft.classId))} <i>·</i> Level ${p.state.level}</p></div><nav class="sheet-party" aria-label="Companions">${game.party.map((c, i) => `<button data-companion="${i}" class="${i === index ? "chosen" : ""}" title="${esc(c.name)}"><span>0${i + 1}</span>${esc(c.name.split(" ")[0])}</button>`).join("")}</nav><button class="icon-button close" aria-label="Close">${icon("close")}</button></header>
   <div class="character-body"><aside class="hero-dossier"><div class="hero-stage"><div class="stage-orbit"></div><canvas id="hero-preview" aria-label="Equipped hero preview"></canvas><div class="stage-caption">DRAG TO ROTATE</div><div class="gear-slots"></div></div><div class="hero-vitals"></div><div class="attribute-grid">${Object.entries(
     h.draft.attributes,
   )
     .map(
       ([k, v]) =>
         `<div title="${esc(k)}"><small>${esc(k.slice(0, 3))}</small><b>${v >= 0 ? "+" : ""}${v}</b></div>`,
     )
     .join("")}</div><div class="dossier-footer"></div></aside>
   <main class="character-details"><nav class="sheet-tabs" aria-label="Character sections">${[
     ["equipment", "pack", "Equipment"],
     ["abilities", "bolt", "Abilities"],
     ["journey", "book", "Journey"],
   ]
     .map(([id, i, t]) => `<button data-tab="${id}">${icon(i)}${t}</button>`)
     .join(
       "",
     )}</nav><div class="sheet-content"></div></main></div><footer class="character-footer"><span><kbd>Esc</kbd> Close <i>·</i> Changes are saved automatically</span><span class="sheet-timing"></span></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelectorAll("[data-companion]").forEach(
      (b) =>
        (b.onclick = () => {
          view?.dispose();
          index = +b.dataset.companion;
          selection = null;
          shell();
        }),
    );
    root.querySelectorAll("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.tab;
          query = "";
          draw();
        }),
    );
    view = heroPreview(root.querySelector("#hero-preview"), scene.assets, h);
    draw();
  };
  function draw() {
    const h = game.party[index],
      p = h.preview,
      items = p.inventory.items;
    root
      .querySelectorAll("[data-tab]")
      .forEach((b) => b.classList.toggle("chosen", b.dataset.tab === tab));
    root.querySelector(".hero-vitals").innerHTML =
      `<div><span>${icon("heart")} HEALTH</span><b>${h.survival.hp}<small> / ${h.survival.maxHp}</small></b><div class="bar"><span style="width:${(h.survival.hp / h.survival.maxHp) * 100}%"></span></div></div><div><span>${icon("bolt")} GRIT</span><b>${h.survival.gritAvailable}<small> / ${p.summary.gritGranted}</small></b><div class="grit-pips">${Array.from({ length: p.summary.gritGranted }, (_, i) => `<i class="${i < h.survival.gritAvailable ? "full" : ""}"></i>`).join("")}</div></div>`;
    root.querySelector(".dossier-footer").innerHTML =
      `<span>${icon("boot")} Speed <b>${game.speed(h)}</b></span><span>${icon("shield")} Physical resistance <b>${p.resistances.physical ?? 0}</b></span>`;
    const armor = items.find((i) => i.worn && /armor/.test(i.catalogId)),
      held = items.filter((i) => i.held);
    const slots = [
      ["Body", armor, "armor"],
      ["Main hand", held.find((i) => !/shield/.test(i.catalogId)), "sword"],
      [
        "Off hand",
        held.find((i) => /shield/.test(i.catalogId)) ??
          (held[0]?.hands === 2 ? held[0] : held[1]),
        "shield",
      ],
    ];
    root.querySelector(".gear-slots").innerHTML = slots
      .map(
        ([label, i, g]) =>
          `<button class="gear-slot ${i ? "filled" : ""}" data-slot="${esc(i?.instanceId ?? "")}" title="${label}: ${esc(i?.definition.name ?? "Empty")}">${icon(i ? itemIcon(i) : g)}<small>${label}</small></button>`,
      )
      .join("");
    root.querySelectorAll("[data-slot]").forEach(
      (b) =>
        (b.onclick = () => {
          tab = "equipment";
          filter = "all";
          selection = b.dataset.slot || null;
          draw();
        }),
    );
    root.querySelector(".sheet-timing").textContent =
      game.mode === "combat"
        ? "Proper stowing · 1 Maneuver per item"
        : "Equipment changes available";
    const content = root.querySelector(".sheet-content");
    if (tab === "equipment") {
      if (!items.some((i) => i.instanceId === selection))
        selection =
          items.find((i) => i.held)?.instanceId ?? items[0]?.instanceId;
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">PREPARE FOR THE DEPTHS</span><h3>Inventory</h3></div><div class="pack-weight ${p.inventory.encumbrance ? "overweight" : ""}">${icon("pack")}<b>${p.inventory.bulk}</b> / ${p.inventory.capacity}<small>BULK</small></div></div><div class="pack-toolbar"><div class="filter-tabs">${[
        ["all", "All"],
        ["weapons", "Weapons"],
        ["armor", "Armor"],
        ["supplies", "Supplies"],
      ]
        .map(
          ([k, n]) =>
            `<button data-filter="${k}" class="${filter === k ? "chosen" : ""}">${n}</button>`,
        )
        .join(
          "",
        )}</div><input id="pack-search" type="search" placeholder="Search pack…" aria-label="Search inventory" value="${esc(query)}"></div><div class="inventory-workspace"><div class="inventory-grid equipment-list"></div><aside class="item-inspector"></aside></div><div class="pack-note">${p.inventory.encumbrance ? `Overburdened · Speed reduced by ${p.inventory.encumbrance}.` : "Everything you need. Nothing you can’t carry."}</div>`;
      const drawItems = () => {
        const list = items.filter(
          (i) =>
            (filter === "all" ||
              (filter === "weapons" && /weapon|shield/.test(i.catalogId)) ||
              (filter === "armor" && /armor|clothes/.test(i.catalogId)) ||
              (filter === "supplies" &&
                !/weapon|shield|armor|clothes/.test(i.catalogId))) &&
            i.definition.name.toLowerCase().includes(query.toLowerCase()),
        );
        root.querySelector(".inventory-grid").innerHTML =
          list
            .map(
              (i) =>
                `<button class="inventory-tile ${selection === i.instanceId ? "selected" : ""} ${i.held || i.worn ? "equipped" : ""}" data-item="${esc(i.instanceId)}" aria-label="${esc(i.definition.name)}${i.held ? ", readied" : i.worn ? ", worn" : ""}"><span class="tile-state">${i.held ? "READIED" : i.worn ? "WORN" : i.quantity > 1 ? "×" + i.quantity : ""}</span>${icon(itemIcon(i))}<span class="tile-name">${esc(i.definition.name.replace("Ordinary ", ""))}</span><small>${i.inventoryDie ? (h.supplies[i.instanceId] === 0 ? "EMPTY" : `d${h.supplies[i.instanceId] ?? i.inventoryDie}`) : i.hands ? `${i.hands} HAND${i.hands === 2 ? "S" : ""}` : `${i.bulk} BULK`}</small></button>`,
            )
            .join("") || '<p class="empty-state">No matching equipment.</p>';
        root.querySelectorAll("[data-item]").forEach(
          (b) =>
            (b.onclick = () => {
              selection = b.dataset.item;
              drawItems();
              inspect();
            }),
        );
      };
      const inspect = () => {
        const i = items.find((i) => i.instanceId === selection),
          host = root.querySelector(".item-inspector");
        if (!i) {
          host.innerHTML = "Select an item to inspect it.";
          return;
        }
        const isArmor = /item-ordinary-(light|medium|heavy)-armor/.test(
            i.catalogId,
          ),
          operation = isArmor
            ? i.worn
              ? "remove"
              : "wear"
            : i.held
              ? "stow"
              : "ready",
          canHandle = isArmor || i.hands > 0,
          reason = canHandle
            ? game.gearReason(index, i.instanceId, operation)
            : "";
        const plan = game.gearPlan(index, i.instanceId, operation),
          replaces = items.filter((i) => plan.stow.includes(i.instanceId));
        host.innerHTML = `<div class="inspector-icon">${icon(itemIcon(i))}</div><span class="eyebrow">${i.held ? "IN HAND" : i.worn ? "EQUIPPED" : "IN YOUR PACK"}</span><h3>${esc(i.definition.name)}</h3><div class="item-facts"><span>Bulk<b>${i.bulk}</b></span>${i.hands ? `<span>Hands<b>${i.hands}</b></span>` : ""}${i.inventoryDie ? `<span>Supply<b>${h.supplies[i.instanceId] === 0 ? "Empty" : "d" + (h.supplies[i.instanceId] ?? i.inventoryDie)}</b></span>` : ""}</div><p>${isArmor ? "Requires the matching armor training. Worn armor contributes its printed resistance." : i.hands === 2 ? "Two-handed equipment occupies both hands." : /shield/.test(i.catalogId) ? "Hold to use Shield Block when an enemy attacks." : /melee/.test(i.catalogId) ? "Ready for melee attacks and weapon techniques." : /ranged/.test(i.catalogId) ? "A ranged weapon needs usable ammunition." : "Carried equipment and supplies contribute to bulk."}</p>${replaces.length ? `<p class="swap-note">Stows: ${replaces.map((x) => esc(x.definition.name)).join(", ")}</p>` : ""}${canHandle ? `<button data-gear="${operation}" class="primary equip-button" ${reason ? "disabled" : ""}>${icon(operation === "ready" ? "hand" : itemIcon(i))}${{ ready: "Ready weapon / gear", stow: "Stow in pack", wear: "Wear armor", remove: "Remove armor" }[operation]}</button><p class="cost-note">${esc(reason || (game.mode === "combat" ? `Costs ${plan.cost} Maneuver${plan.cost === 1 ? "" : "s"}` : "No combat action required"))}</p>` : '<p class="cost-note">Supply checks occur after successful use.</p>'}`;
        if (game.R.HEALING_POTION_IDS.includes(i.catalogId)) {
          const free =
            2 -
            items.filter((i) => i.held).reduce((n, i) => n + (i.hands ?? 0), 0);
          host.insertAdjacentHTML(
            "beforeend",
            `<label class="creator-field"><span>Give to</span><select id="potion-recipient">${game.party.map((p) => `<option value="${p.id}" ${p === h ? "selected" : ""}>${esc(p.name)} · ${p.survival.hp}/${p.survival.maxHp} HP</option>`).join("")}</select></label><button id="drink-potion" class="primary equip-button" ${free < 1 || h.supplies[i.instanceId] === 0 ? "disabled" : ""}>${icon("potion")} Use potion</button><p class="cost-note">${free < 1 ? "Stow equipment to free one hand." : game.mode === "combat" ? "Maneuver · An active ally also spends a Reaction." : "Restores its printed HP. Check d4 after use."}</p>`,
          );
          host.querySelector("#drink-potion").onclick = () =>
            attempt(() => {
              game.drinkPotion(
                index,
                i.instanceId,
                host.querySelector("#potion-recipient").value,
              );
              draw();
            });
        }
        host.querySelector("[data-gear]")?.addEventListener("click", () =>
          attempt(() => {
            game.equip(index, i.instanceId, operation);
            view.update(game.party[index]);
            draw();
          }),
        );
      };
      root.querySelectorAll("[data-filter]").forEach(
        (b) =>
          (b.onclick = () => {
            filter = b.dataset.filter;
            draw();
          }),
      );
      root.querySelector("#pack-search").oninput = (e) => {
        query = e.target.value;
        drawItems();
      };
      drawItems();
      inspect();
    } else if (tab === "abilities") {
      const cards = C.choices.filter(
        (c) =>
          c.kind === "ability" &&
          (p.state.abilities.includes(c.id) || c.universal),
      );
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">YOUR COMBAT REPERTOIRE</span><h3>Abilities & favorites</h3></div><span class="favorite-count">${icon("star")} ${(h.favorites ?? []).length} / 8</span></div><p class="section-intro">Pin actions to your combat bar. Select a card for its cost, range and full rules.</p><div class="ability-library">${cards
        .sort((a, b) => Number(!!ABILITIES[b.id]) - Number(!!ABILITIES[a.id]))
        .map((c) => {
          const a = ABILITIES[c.id],
            f = h.favorites?.includes(c.id),
            status = coverage(c.id);
          return `<article class="ability-entry ${a ? "playable" : ""}"><div class="ability-symbol">${abilityType(c)}</div><details><summary><strong>${esc(c.name)}</strong><small>${a ? `${a.category.toUpperCase()} · ${a.range ? `${a.range} SQUARES` : "SELF"}${a.attribute ? " · " + a.attribute.toUpperCase() : ""}` : esc(status.status === "included" ? "PASSIVE / CONTEXTUAL" : status.status.toUpperCase())}</small></summary><div class="ability-rules">${c.reference?.rules.details.map((d) => `<p><b>${esc(d.label)}</b> ${esc(d.value)}</p>`).join("") ?? ""}${c.reference?.rules.body.map((b) => (b.text ? `<p>${esc(b.text)}</p>` : (b.outcomes ?? []).map((o) => `<p><b>${esc(o.label)}</b> ${esc(o.text)}</p>`).join(""))).join("") ?? ""}${a ? `<button data-use="${c.id}" ${game.actionReason(c.id, h) ? "disabled" : ""}>Use action</button><p class="cost-note">${esc(game.actionReason(c.id, h) || "Select a target in the dungeon.")}</p>` : `<p class="cost-note">${esc(status.reason)}</p>`}</div></details>${a ? `<button class="favorite-toggle ${f ? "pinned" : ""}" data-favorite="${c.id}" aria-label="${f ? "Unfavorite" : "Favorite"} ${esc(c.name)}" aria-pressed="${!!f}" title="${f ? "Remove from" : "Pin to"} combat bar">${icon("star")}</button>` : ""}</article>`;
        })
        .join("")}</div>`;
      root.querySelectorAll("[data-favorite]").forEach(
        (b) =>
          (b.onclick = () =>
            attempt(() => {
              game.favorite(index, b.dataset.favorite);
              draw();
            })),
      );
      root
        .querySelectorAll("[data-use]")
        .forEach((b) => (b.onclick = () => activate(b.dataset.use)));
    } else {
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">A LIFE BEFORE THE DARK</span><h3>Journey & development</h3></div><b class="level-medallion">${p.state.level}</b></div><div class="journey-grid"><div><span class="eyebrow">ORIGINS</span><h3>${esc(name(h.draft.culture.id))}</h3><p>${esc(name(h.draft.background.id))}</p><p>${esc(p.summary.languages.map((l) => l.name).join(" · "))}</p></div><div><span class="eyebrow">TRAINING</span><h3>${p.development.current} DP available</h3><p>Earned level ${h.earnedLevel} · ${p.development.spent} DP spent</p><p>Clear a new depth and return to Greyhaven to earn a level.</p>${game.mode === "town" ? '<button id="train-hero" class="primary">Develop this hero</button>' : '<span class="cost-note">Return to Greyhaven to train.</span>'}</div></div><h3 class="subheading">Disciplines</h3><div class="discipline-grid">${Object.entries(
        p.state.ranks,
      )
        .map(
          ([k, v]) =>
            `<div><span>${disciplineIcon(k)}${esc(name(k))}</span><b>${"◆".repeat(v)}${"◇".repeat(3 - v)}</b></div>`,
        )
        .join(
          "",
        )}</div><h3 class="subheading">Condition & injuries</h3><p>${esc(h.survival.status)} · ${h.survival.marks} death marks · ${h.wounds.length} wounds</p><div class="condition-tags">${h.conditions.map((c) => `<span>${esc(c.key)} ${c.rating ?? ""}</span>`).join("") || "<span>No active conditions</span>"}</div>${h.wounds
        .map(
          (w) =>
            `<article class="wound"><h3>${esc(w.record.injury)}</h3><p>${esc(w.record.remedy)}</p><p class="cost-note">${w.record.recoveryValue ? `Recovery ${w.treatment?.progress ?? 0}/${w.record.recoveryValue}${w.treatment?.completed ? " · Treated; scar remains" : ""}` : "Requires the printed exceptional remedy."}</p>${
              game.mode === "town" && !w.treatment?.completed
                ? game
                    .treatmentOptions(h, w)
                    .map(
                      (o) =>
                        `<button data-treat="${w.id}" data-healer="${o.healer}" data-treatment="${o.card.id}" ${w.treatment?.attempts.some((a) => a.dayKey === `day-${Math.floor((game.campaign.hours ?? 0) / 24) + 1}`) ? "disabled" : ""}>${esc(game.party[o.healer].name)} · ${esc(name(o.card.catalogId))} · 1 hour</button>`,
                    )
                    .join("")
                : ""
            }</article>`,
        )
        .join(
          "",
        )}${game.mode === "town" && h.wounds.length ? `<p class="cost-note">Campaign day ${Math.floor((game.campaign.hours ?? 0) / 24) + 1} · One attempt per wound per day across all healers.</p><button id="next-care-day">Wait until next treatment day</button>` : ""}`;
      root.querySelectorAll("[data-treat]").forEach(
        (b) =>
          (b.onclick = () =>
            attempt(() => {
              game.treatWound(
                index,
                b.dataset.treat,
                +b.dataset.healer,
                b.dataset.treatment,
              );
              draw();
            })),
      );
      root.querySelector("#next-care-day")?.addEventListener("click", () =>
        attempt(() => {
          game.nextTreatmentDay();
          draw();
        }),
      );
      root
        .querySelector("#train-hero")
        ?.addEventListener("click", () => train(index));
    }
  }
  shell();
  return () => view?.dispose();
}
