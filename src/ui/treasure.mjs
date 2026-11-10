import { icon, itemIcon, esc } from "./icons.mjs";
import { disciplineIcon } from "./book-symbols.mjs";
import { effectStatus, slotOf, magicItem } from "../core/treasure.mjs";
export function enchantmentDetails(h, item) {
  if (item.base)
    item = {
      ...item,
      effects: magicItem(item.seed, item.depth, {
        base: item.base,
        power: item.power,
        affixes: item.affixes,
        revision: item.revision ?? 1,
        relic: item.relic,
      }).effects,
    };
  return `<div class="enchantment-list">${(item.effects ?? [])
    .map((e) => {
      const gate = effectStatus(h, e);
      const equipped =
        item.carried !== false && (item.hands ? item.held : item.worn);
      const active =
        gate.active &&
        (e.effect === "light" || equipped) &&
        (e.effect !== "illumination" || item.lightEnabled !== false);
      const label = !gate.active
        ? "DORMANT"
        : active
          ? "ACTIVE"
          : e.effect === "illumination" && item.lightEnabled === false
            ? "OFF"
            : "EQUIP TO ACTIVATE";
      return `<div class="enchantment ${gate.active ? "unlocked" : "dormant"}">${e.discipline ? disciplineIcon(e.discipline) : icon("star")}<div><b>${esc(e.name)} <small>${label}</small></b><p>${esc(e.text)}</p><span>${esc(gate.requirement)}${e.discipline ? ` · Owned ${gate.rank}` : ""}</span></div></div>`;
    })
    .join(
      "",
    )}</div>${item.effects?.some((e) => !effectStatus(h, e).active) ? '<p class="dormant-note">Ordinary equipment remains usable. Only locked magical effects are inactive.</p>' : ""}`;
}
export function itemComparison(h, item) {
  const slot = slotOf(item),
    old = h.preview.inventory.items.filter(
      (i) =>
        i.instanceId !== item.instanceId &&
        (i.held || i.worn) &&
        i.catalogId !== "item-travel-clothes" &&
        (slotOf(i) === slot || (item.hands === 2 && i.held)),
    );
  return `<div class="item-comparison"><span class="eyebrow">${old.length ? "CURRENTLY EQUIPPED" : "SLOT AVAILABLE"}</span>${old.map((i) => `<b>${esc(i.definition.name)}</b>${enchantmentDetails(h, i)}`).join("") || "<p>No item to replace.</p>"}</div>`;
}
export function lootScreen({ root, game, id, close, attempt }) {
  let selected = game.selected;
  function draw() {
    const world = game.worldInteractions().find((i) => i.id === id),
      items = world?.source.items ?? [],
      h = game.party[selected];
    root.innerHTML = `<div class="veil"><section class="loot-window" role="dialog" aria-label="Recovered treasures"><header><span class="eyebrow">BENEATH THE DUST</span><button class="close icon-button" aria-label="Close">${icon("close")}</button><h2>Recovered treasures</h2><p>Choose who will carry each find. Bonuses apply while equipped; matching bonuses use the strongest value.</p></header><nav class="sheet-party">${game.party.map((p, i) => `<button data-loot-hero="${i}" class="${i === selected ? "chosen" : ""}">${esc(p.name)}</button>`).join("")}</nav><div class="loot-grid">${items.map((item) => `<article class="loot-card ${item.rarity ?? ""}"><div class="loot-icon">${icon(itemIcon(item))}</div><span class="eyebrow">${esc(item.rarity ?? "supply")} · ${esc(item.slot ?? "pack")}</span><h3>${esc(item.definition.name)}</h3><p>${item.bulk} Bulk · ${item.hands ? `${item.hands} hands` : "Carried equipment"}</p>${enchantmentDetails(h, item)}${itemComparison(h, item)}<button class="primary" data-take="${esc(item.instanceId)}">${icon("pack")} Give to ${esc(h.name.split(" ")[0])}</button></article>`).join("") || '<p class="empty-state">The coffer is empty. Your finds are in the company’s inventories.</p>'}</div><footer><button data-finish>Return to the dungeon</button></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelector("[data-finish]").onclick = close;
    root.querySelectorAll("[data-loot-hero]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = +b.dataset.lootHero;
          draw();
        }),
    );
    root.querySelectorAll("[data-take]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.takeTreasure(id, b.dataset.take, selected);
            draw();
          })),
    );
  }
  draw();
}
