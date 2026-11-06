import { FORGE_NODES } from "../core/forge-catalog.mjs";
import { appearanceControls } from "./appearance.mjs";
import { buildPanel } from "./builds.mjs";
import { EQUIPMENT_SLOTS, slotOf } from "../core/treasure.mjs";
import { enchantmentDetails, itemComparison } from "./treasure.mjs";
import { abilityType, disciplineIcon } from "./book-symbols.mjs";
import { experienceDetails } from "./experience.mjs";
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
  respec,
}) {
  let tab = "equipment",
    filter = "all",
    query = "",
    selection = null,
    selectedSlot = null,
    view;
  const gearOperation = (item) => {
    const wearable =
      /item-ordinary-(light|medium|heavy)-armor/.test(item.catalogId) ||
      (item.slot && !item.hands);
    return wearable
      ? item.worn
        ? "remove"
        : "wear"
      : item.hands
        ? item.held
          ? "stow"
          : "ready"
        : null;
  };
  const slotMatches = (item) =>
    !selectedSlot ||
    slotOf(item) === selectedSlot ||
    (item.slot === "ring" && selectedSlot.startsWith("ring-")) ||
    (selectedSlot === "off" && item.hands === 2);
  const changeGear = (item, operation, ringSlot = selectedSlot) => {
    const scroll = root.querySelector(".sheet-content")?.scrollTop ?? 0;
    game.equip(
      index,
      item.instanceId,
      operation,
      item.slot === "ring" ? ringSlot : null,
    );
    if (game.pendingProvocation || game.pendingDefense) return;
    selection = item.instanceId;
    view.update(game.party[index]);
    draw();
    root.querySelector(".sheet-content").scrollTop = scroll;
  };
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
     .join(
       "",
     )}</div><div class="dossier-disciplines"><span class="eyebrow">DISCIPLINES</span>${Object.entries(
     p.state.ranks,
   )
     .map(
       ([id, rank]) =>
         `<span title="${esc(name(id))}">${disciplineIcon(id)}${esc(name(id))}<b>${rank}</b></span>`,
     )
     .join(
       "",
     )}</div>${game.powerStat(h, "hidden") ? '<div class="concealment-badge">◈ CONCEALED · Your next attack reveals you</div>' : ""}<button id="sheet-training" class="primary">${h.earnedLevel > p.state.level ? `Level up → ${h.earnedLevel}` : "Develop character"}</button><button id="sheet-respec" class="respec-button" ${game.respecReason(index) ? "disabled" : ""} title="${esc(game.respecReason(index) || "Rebuild from the first step; keep this hero’s XP and possessions")}">Respec from beginning</button><div class="dossier-footer"></div></aside>
   <main class="character-details"><nav class="sheet-tabs" aria-label="Character sections">${[
     ["equipment", "pack", "Equipment"],
     ["abilities", "bolt", "Abilities"],
     ["build", "star", "Build forge"],
     ["journey", "book", "Journey"],
     ["appearance", "star", "Appearance"],
   ]
     .map(([id, i, t]) => `<button data-tab="${id}">${icon(i)}${t}</button>`)
     .join(
       "",
     )}</nav><div class="sheet-content"></div></main></div><footer class="character-footer"><span><kbd>Esc</kbd> Close <i>·</i> Changes are saved automatically</span><span class="sheet-timing"></span></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelector("#sheet-respec").onclick = () => respec(index);
    root.querySelector("#sheet-training").onclick = () => {
      if (game.mode !== "town")
        return game.notify(
          "Return to Greyhaven to train. Your XP and earned levels are saved.",
        );
      if (h.earnedLevel > p.state.level || p.development.current > 0)
        train(index);
      else {
        tab = "build";
        draw();
      }
    };
    root.querySelectorAll("[data-companion]").forEach(
      (b) =>
        (b.onclick = () => {
          view?.dispose();
          index = +b.dataset.companion;
          selection = null;
          selectedSlot = null;
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
    const slots = EQUIPMENT_SLOTS.map(([slot, label, g]) => [
      label,
      items.find(
        (i) =>
          i.carried &&
          (i.held || i.worn) &&
          slotOf(i) === slot &&
          i.catalogId !== "item-travel-clothes",
      ) ?? (slot === "off" ? items.find((i) => i.held && i.hands === 2) : null),
      g,
      slot,
    ]);
    root.querySelector(".gear-slots").innerHTML = slots
      .map(
        ([label, i, g, slot]) =>
          `<button class="gear-slot ${i ? "filled" : ""} ${selectedSlot === slot ? "chosen" : ""} ${i?.rarity ?? ""}" data-slot="${esc(i?.instanceId ?? "")}" data-slot-kind="${slot}" aria-label="${label}: ${esc(i?.definition.name ?? "Empty · choose equipment")}" title="${label}: ${esc(i?.definition.name ?? "Empty · choose equipment")}">${icon(i ? itemIcon(i) : g)}<small>${label}</small></button>`,
      )
      .join("");
    root.querySelector(".attribute-grid").innerHTML = Object.entries(
      h.draft.attributes,
    )
      .map(
        ([k, v]) =>
          `<div title="${esc(k)}"><small>${esc(k.slice(0, 3))}</small><b class="${game.attribute(h, k) !== v ? "enhanced" : ""}">${game.attribute(h, k) >= 0 ? "+" : ""}${game.attribute(h, k)}</b></div>`,
      )
      .join("");
    root.querySelectorAll("[data-slot]").forEach(
      (b) =>
        (b.onclick = () => {
          tab = "equipment";
          filter = "all";
          query = "";
          selectedSlot = b.dataset.slotKind;
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
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">PREPARE FOR THE DEPTHS</span><h3>Inventory</h3></div><div class="pack-weight ${p.inventory.encumbrance ? "overweight" : ""}">${icon("pack")}<b>${p.inventory.bulk}</b> / ${p.inventory.capacity}<small>BULK</small></div></div><div class="torch-controls"><span>☀ <b>${h.torch?.held ? (h.torch.lit ? "Torch burning" : "Torch doused in light") : "Torch stowed"}</b> · ${game.freeHands(h)} free hand${game.freeHands(h) === 1 ? "" : "s"}</span><button id="sheet-torch" ${game.torchReason(index) ? "disabled" : ""} title="${esc(game.torchReason(index))}">${h.torch?.held ? "Stow torch" : "Ready torch"}</button></div><div class="pack-toolbar"><div class="filter-tabs">${[
        ["all", "All"],
        ["weapons", "Weapons"],
        ["armor", "Armor"],
        ["relics", "Relics"],
        ["supplies", "Supplies"],
      ]
        .map(
          ([k, n]) =>
            `<button data-filter="${k}" class="${filter === k ? "chosen" : ""}">${n}</button>`,
        )
        .join(
          "",
        )}</div><input id="pack-search" type="search" placeholder="Search pack…" aria-label="Search inventory" value="${esc(query)}"></div><p class="equipment-help">Use <b>Equip / Ready</b> on any item. <b>Unequip / Stow</b> returns it to your backpack. Click a slot beside your hero to find matching gear.</p>${selectedSlot ? `<div class="slot-filter"><span>Choosing equipment · <b>${esc(EQUIPMENT_SLOTS.find(([id]) => id === selectedSlot)?.[1])}</b></span><button id="clear-slot">Show all slots</button></div>` : ""}<div class="inventory-workspace"><div class="inventory-grid equipment-list"></div><aside class="item-inspector"></aside></div><div class="pack-note">${p.inventory.encumbrance ? `Overburdened · Speed reduced by ${p.inventory.encumbrance}.` : "Unequipping keeps the item. Replaced gear goes back into your backpack."}</div>`;
      root.querySelector("#sheet-torch").onclick = () =>
        attempt(() => {
          game.toggleTorch(index);
          view.update(h);
          draw();
        });
      const drawItems = () => {
        const list = items.filter(
          (i) =>
            slotMatches(i) &&
            (filter === "all" ||
              (filter === "weapons" && /weapon|shield/.test(i.catalogId)) ||
              (filter === "armor" && /armor|clothes/.test(i.catalogId)) ||
              (filter === "relics" && i.effects?.length) ||
              (filter === "supplies" &&
                !/weapon|shield|armor|clothes/.test(i.catalogId))) &&
            i.definition.name.toLowerCase().includes(query.toLowerCase()),
        );
        if (!list.some((i) => i.instanceId === selection))
          selection = list[0]?.instanceId;
        root.querySelector(".inventory-grid").innerHTML =
          [true, false]
            .map((equipped) => {
              const group = list.filter(
                (i) => !!(i.held || i.worn) === equipped,
              );
              if (!group.length) return "";
              return (
                `<h4 class="pack-group">${equipped ? "Readied & worn" : "Backpack"}<small>${group.length} items</small></h4>` +
                group
                  .map((i) => {
                    const operation = gearOperation(i),
                      reason = operation
                        ? game.gearReason(index, i.instanceId, operation)
                        : "";
                    const label = {
                      ready: "Ready",
                      stow: "Stow",
                      wear: "Equip",
                      remove: "Unequip",
                    }[operation];
                    const plan = operation
                      ? game.gearPlan(
                          index,
                          i.instanceId,
                          operation,
                          selectedSlot,
                        )
                      : null;
                    return `<div class="inventory-card"><button class="inventory-tile ${i.rarity ?? ""} ${selection === i.instanceId ? "selected" : ""} ${i.held || i.worn ? "equipped" : ""}" data-item="${esc(i.instanceId)}" aria-label="${esc(i.definition.name)}${i.held ? ", readied" : i.worn ? ", worn" : ""}"><span class="tile-state">${i.held ? "READIED" : i.worn ? "WORN" : i.quantity > 1 ? "×" + i.quantity : "BACKPACK"}</span>${icon(itemIcon(i))}<span class="tile-name">${esc(i.definition.name.replace("Ordinary ", ""))}</span><small>${i.inventoryDie ? (h.supplies[i.instanceId] === 0 ? "EMPTY" : `d${h.supplies[i.instanceId] ?? i.inventoryDie}`) : i.hands ? `${i.hands} HAND${i.hands === 2 ? "S" : ""}` : `${i.bulk} BULK`}</small></button>${operation ? `<button class="quick-equip" data-quick-gear="${esc(i.instanceId)}" data-operation="${operation}" aria-label="${label} ${esc(i.definition.name)}" title="${esc(reason || (plan.stow.length ? "Returns replaced gear to your backpack." : ""))}" ${reason ? "disabled" : ""}>${icon(equipped ? "pack" : "hand")}${label}${game.mode === "combat" ? `<small>${plan.cost} M</small>` : ""}</button>` : '<span class="supply-label">Select to use or inspect</span>'}${reason ? `<small class="quick-gear-reason">${esc(reason)}</small>` : ""}</div>`;
                  })
                  .join("")
              );
            })
            .join("") ||
          '<p class="empty-state">No matching equipment in this hero’s pack.</p>';
        root.querySelectorAll("[data-item]").forEach(
          (b) =>
            (b.onclick = () => {
              selection = b.dataset.item;
              drawItems();
              inspect();
            }),
        );
      };
      root.querySelector("#clear-slot")?.addEventListener("click", () => {
        selectedSlot = null;
        draw();
      });
      root
        .querySelector(".inventory-grid")
        .addEventListener("click", (event) => {
          const button = event.target.closest("[data-quick-gear]");
          if (!button || button.disabled) return;
          const item = items.find(
            (i) => i.instanceId === button.dataset.quickGear,
          );
          attempt(() => changeGear(item, button.dataset.operation));
        });
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
          wearable = isArmor || (i.slot && !i.hands),
          operation = wearable
            ? i.worn
              ? "remove"
              : "wear"
            : i.held
              ? "stow"
              : "ready",
          canHandle = wearable || i.hands > 0,
          reason = canHandle
            ? game.gearReason(index, i.instanceId, operation)
            : "";
        const plan = game.gearPlan(index, i.instanceId, operation),
          replaces = items.filter((i) => plan.stow.includes(i.instanceId));
        host.innerHTML = `<div class="inspector-icon">${icon(itemIcon(i))}</div><span class="eyebrow">${i.held ? "IN HAND" : i.worn ? "EQUIPPED" : "IN YOUR PACK"}</span><h3>${esc(i.definition.name)}</h3><div class="item-facts"><span>Bulk<b>${i.bulk}</b></span>${i.hands ? `<span>Hands<b>${i.hands}</b></span>` : ""}${i.inventoryDie ? `<span>Supply<b>${h.supplies[i.instanceId] === 0 ? "Empty" : "d" + (h.supplies[i.instanceId] ?? i.inventoryDie)}</b></span>` : ""}</div><p>${isArmor ? "Requires the matching armor training. Worn armor contributes its printed resistance." : i.hands === 2 ? "Two-handed equipment occupies both hands." : /shield/.test(i.catalogId) ? "Hold to use Shield Block when an enemy attacks." : /melee/.test(i.catalogId) ? "Ready for melee attacks and weapon techniques." : /ranged/.test(i.catalogId) ? "A ranged weapon needs usable ammunition." : "Carried equipment and supplies contribute to bulk."}</p>${replaces.length ? `<p class="swap-note">Stows: ${replaces.map((x) => esc(x.definition.name)).join(", ")}</p>` : ""}${canHandle ? `<button data-gear="${operation}" class="primary equip-button" ${reason ? "disabled" : ""}>${icon(operation === "ready" ? "hand" : itemIcon(i))}${{ ready: "Ready weapon / gear", stow: "Stow in pack", wear: isArmor ? "Wear armor" : "Equip item", remove: "Remove item" }[operation]}</button><p class="cost-note">${esc(reason || (game.mode === "combat" ? `Costs ${plan.cost} Maneuver${plan.cost === 1 ? "" : "s"}` : "No combat action required"))}</p>` : '<p class="cost-note">Supply checks occur after successful use.</p>'}`;
        if (i.effects?.length) {
          const facts = host.querySelector(".item-facts");
          facts.nextElementSibling?.remove();
          facts.insertAdjacentHTML("afterend", enchantmentDetails(h, i));
          if (!(i.held || i.worn))
            host.insertAdjacentHTML(
              "beforeend",
              `<details class="equipment-compare"><summary>Compare equipped item</summary>${itemComparison(h, i)}</details>`,
            );
        }
        if (i.slot === "ring" && !i.worn)
          host.insertAdjacentHTML(
            "beforeend",
            '<label class="creator-field"><span>Ring slot</span><select id="ring-slot"><option value="ring-left">Left ring</option><option value="ring-right">Right ring</option></select></label>',
          );
        if (host.querySelector("#ring-slot"))
          host.querySelector("#ring-slot").value = selectedSlot?.startsWith(
            "ring-",
          )
            ? selectedSlot
            : (plan.slot ?? "ring-left");
        if (game.mode !== "combat") {
          host.insertAdjacentHTML(
            "beforeend",
            `<label class="creator-field"><span>Give to companion</span><select id="transfer-to">${game.party.map((p, n) => (n !== index ? `<option value="${n}">${esc(p.name)}</option>` : "")).join("")}</select></label><button id="transfer-item">Transfer item</button>`,
          );
          host.querySelector("#transfer-item").onclick = () =>
            attempt(() => {
              game.transferTreasure(
                index,
                i.instanceId,
                +host.querySelector("#transfer-to").value,
              );
              view.update(game.party[index]);
              draw();
            });
        }
        host.insertAdjacentHTML(
          "beforeend",
          `<button id="drop-item" ${game.mode !== "exploration" ? "disabled" : ""}>Drop ${i.quantity > 1 ? "stack" : "item"} on dungeon floor</button><p class="cost-note">Ground caches persist with this floor and can be recovered. Dropping reduces carried bulk.</p>`,
        );
        host.querySelector("#drop-item").onclick = () =>
          attempt(() => {
            game.dropItem(index, i.instanceId);
            selection = null;
            view.update(game.party[index]);
            draw();
          });
        if (i.kind === "scroll") {
          const reason = game.recallReason(index);
          host.insertAdjacentHTML(
            "beforeend",
            `<p>Opens a two-way passage to Greyhaven. The same floor remains waiting for your return.</p><button id="read-recall" class="primary" ${reason ? "disabled" : ""}>Read Scroll of Return</button><p class="cost-note">${esc(reason || "Consumes this scroll · One free hand")}</p>`,
          );
          host.querySelector("#read-recall").onclick = () =>
            attempt(() => {
              game.useRecall(index, i.instanceId);
              close();
            });
        }
        if (game.R.HEALING_POTION_IDS.includes(i.catalogId)) {
          const free = game.freeHands(h);
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
            changeGear(
              i,
              operation,
              host.querySelector("#ring-slot")?.value ?? selectedSlot,
            );
          }),
        );
      };
      root.querySelectorAll("[data-filter]").forEach(
        (b) =>
          (b.onclick = () => {
            filter = b.dataset.filter;
            selectedSlot = null;
            draw();
          }),
      );
      root.querySelector("#pack-search").oninput = (e) => {
        query = e.target.value;
        drawItems();
        inspect();
      };
      drawItems();
      inspect();
    } else if (tab === "build") {
      buildPanel(content, { game, index, attempt, train });
    } else if (tab === "abilities") {
      const cards = C.choices.filter(
        (c) =>
          c.kind === "ability" &&
          (game.powerIds(h).includes(c.id) || c.universal),
      );
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">YOUR COMBAT REPERTOIRE</span><h3>Abilities & favorites</h3></div><span class="favorite-count">${icon("star")} ${(h.favorites ?? []).length} / 8</span></div><p class="section-intro">Pin actions to your combat bar. Select a card for its cost, range and full rules.</p><h3 class="subheading">Ancestry gifts</h3><div class="ancestry-gifts">${game
        .traits(h)
        .map(
          (t) =>
            `<article class="trait-choice"><strong>${esc(name(t.id))}</strong><p>${esc(t.text)}</p>${t.daily || t.debt ? `<button data-prepare-trait="${t.id}" aria-pressed="${h.preparedTraits?.includes(t.id) ?? false}" ${h.traitUses?.[t.id] === game.clock().day ? "disabled" : ""}>${h.traitUses?.[t.id] === game.clock().day ? "Used today" : h.preparedTraits?.includes(t.id) ? "Prepared · click to cancel" : "Prepare for next eligible roll"}</button>` : "<small>PASSIVE · AUTOMATIC</small>"}</article>`,
        )
        .join(
          "",
        )}</div><h3 class="subheading">Learned actions</h3><div class="ability-library">${cards
        .sort((a, b) => Number(!!ABILITIES[b.id]) - Number(!!ABILITIES[a.id]))
        .map((c) => {
          const a =
              (game.powerSpec(c.id, h) ?? ABILITIES[c.id])?.category ===
              "passive"
                ? null
                : (game.powerSpec(c.id, h) ?? ABILITIES[c.id]),
            f = h.favorites?.includes(c.id),
            granted = FORGE_NODES.find((n) => n.grant === c.id),
            status = game.powerSpec(c.id, h)
              ? {
                  status: "included",
                  reason: game.powerSpec(c.id, h).description,
                }
              : granted
                ? { status: "included", reason: granted.description }
                : coverage(c.id);
          return `<article class="ability-entry ${a ? "playable" : ""}"><div class="ability-symbol">${abilityType(c, a)}</div><details><summary><strong>${esc(c.name)}</strong><small>${a ? `${a.category.toUpperCase()} · ${a.range ? `${a.range} SQUARES` : "SELF"}${a.attribute ? " · " + a.attribute.toUpperCase() : ""}` : esc(status.status === "included" ? "PASSIVE / CONTEXTUAL" : status.status.toUpperCase())}</small></summary><div class="ability-rules"><p class="dungeon-rule">${esc(status.reason)}</p>${a ? `<button data-use="${c.id}" ${game.actionReason(c.id, h) ? "disabled" : ""}>Use action</button><p class="cost-note">${esc(game.actionReason(c.id, h) || "Select a target in the dungeon.")}</p>` : `<p class="cost-note">${esc(status.reason)}</p>`}</div></details>${a ? `<button class="favorite-toggle ${f ? "pinned" : ""}" data-favorite="${c.id}" aria-label="${f ? "Unfavorite" : "Favorite"} ${esc(c.name)}" aria-pressed="${!!f}" title="${f ? "Remove from" : "Pin to"} combat bar">${icon("star")}</button>` : ""}</article>`;
        })
        .join("")}</div>`;
      root.querySelectorAll("[data-prepare-trait]").forEach(
        (b) =>
          (b.onclick = () =>
            attempt(() => {
              game.prepareTrait(index, b.dataset.prepareTrait);
              draw();
            })),
      );
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
    } else if (tab === "appearance") {
      appearanceControls(content, {
        appearance: h.draft.appearance,
        ancestry: h.draft.ancestryId,
        name: h.name,
        disabled: game.mode !== "town",
        onChange: (value) => {
          game.setAppearance(index, value);
          view.update(h);
        },
      });
    } else {
      content.innerHTML = `<div class="section-heading"><div><span class="eyebrow">A LIFE BEFORE THE DARK</span><h3>Journey & development</h3></div><b class="level-medallion">${p.state.level}</b></div><div class="journey-grid"><div><span class="eyebrow">ORIGINS</span><h3>${esc(name(h.draft.culture.id))}</h3><p>${esc(name(h.draft.background.id))}</p><p>${esc(p.summary.languages.map((l) => l.name).join(" · "))}</p></div><div><span class="eyebrow">TRAINING</span><h3>${p.development.current} DP available</h3><p>Earned level ${h.earnedLevel} · ${p.development.spent} DP spent</p><p>Gain XP from discovery, encounters and treasure. Apply earned levels by training here.</p>${game.mode === "town" ? '<button id="train-hero" class="primary">Develop this hero</button>' : '<span class="cost-note">Return to Greyhaven to train.</span>'}</div></div>${experienceDetails(h, game.campaign.depth)}<h3 class="subheading">Disciplines</h3><div class="discipline-grid">${Object.entries(
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
                        `<button data-treat="${w.id}" data-healer="${o.healer}" data-treatment="${o.card.id}" ${w.treatment?.attempts.some((a) => a.dayKey === `day-${game.clock().day}`) ? "disabled" : ""}>${esc(game.party[o.healer].name)} · ${esc(name(o.card.catalogId))} · 1 hour</button>`,
                    )
                    .join("")
                : ""
            }</article>`,
        )
        .join(
          "",
        )}${game.mode === "town" && h.wounds.length ? `<p class="cost-note">Campaign day ${game.clock().day} · One attempt per wound per day across all healers.</p><button id="next-care-day">Wait until next treatment day</button>` : ""}`;
      if (C.gamePowers) {
        content.querySelectorAll(".wound").forEach((node, n) => {
          const w = h.wounds[n],
            q = game.careQuote(index, w.id, "camp"),
            town = game.careQuote(index, w.id, "town");
          node.innerHTML = `<h3>${esc(w.record.injury)}</h3><p>${w.treatment?.completed ? "Recovered · scar and injury history retained" : q.exceptional ? "Severe injury · restoration treatment required" : "Treatable wound · field dressing or town care"}</p>${w.treatment?.completed ? "" : `<button data-care="${w.id}" data-method="camp" ${q.reason ? "disabled" : ""}>${q.exceptional ? "Use restoration draught" : "Use field dressing"} · ${q.minutes} min</button><p class="cost-note">${esc(q.reason || "Consumes one supply. Repairs this wound; HP and Grit are unchanged.")}</p>${game.mode === "town" ? `<button data-care="${w.id}" data-method="town" ${town.reason ? "disabled" : ""}>Infirmary · ${town.cost} coins · ${town.minutes} min</button>` : ""}`}`;
        });
        content
          .querySelector("#next-care-day")
          ?.previousElementSibling?.remove();
        content.querySelector("#next-care-day")?.remove();
        content.querySelectorAll("[data-care]").forEach(
          (b) =>
            (b.onclick = () =>
              attempt(() => {
                game.treatGameWound(index, b.dataset.care, b.dataset.method);
                draw();
              })),
        );
      }
      const retired = C.gamePowers ? [] : game.retiredPurchases(h);
      if (retired.length)
        content.insertAdjacentHTML(
          "beforeend",
          `<h3 class="subheading">Retired training</h3><p class="section-intro">Replace these source purchases at no coin cost. Each replacement must satisfy its original purchase stage and DP cost. Acquired equipment, XP and injuries stay with your hero.</p>${retired.map((r, n) => `<article class="trait-choice"><strong>${esc(name(r.id))}</strong>${game.mode === "town" ? `<button data-retrain-open="${n}">Choose replacement</button><div data-retrain-options="${n}"></div>` : "<p>Return to Greyhaven to retrain.</p>"}</article>`).join("")}`,
        );
      root.querySelectorAll("[data-retrain-open]").forEach(
        (b) =>
          (b.onclick = () =>
            attempt(() => {
              const n = +b.dataset.retrainOpen,
                receipt = retired[n],
                options = game.retrainingOptions(index, receipt),
                host = root.querySelector(`[data-retrain-options="${n}"]`);
              host.innerHTML = options.length
                ? `<select aria-label="Replacement ability">${options.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><p class="cost-note"></p><button>Commit free retraining</button>`
                : "<p>No compatible replacement at this stage. Your purchase and its original benefits remain preserved.</p>";
              if (options.length) {
                const select = host.querySelector("select");
                const describe = () =>
                  (host.querySelector("p").textContent = coverage(
                    select.value,
                  ).reason);
                select.onchange = describe;
                describe();
                host.querySelector("button").onclick = () =>
                  attempt(() => {
                    game.retrain(index, receipt, select.value);
                    draw();
                  });
              }
            })),
      );
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
