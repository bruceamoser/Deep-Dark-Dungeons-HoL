import { CREATURE_GOALS } from "../core/creature-ai.mjs";
import { CREATURE_ROSTER } from "../core/creature-roster.mjs";
import { esc, icon } from "./icons.mjs";
export function bestiaryScreen({ root, game, close, selectedId }) {
  const cards = game.C.creatures.creatures.filter((c) => CREATURE_ROSTER[c.id]);
  let selected = selectedId ?? cards[0].id,
    query = "",
    family = "all";
  function draw() {
    const c = cards.find((c) => c.id === selected),
      live = game.enemies.filter((e) => e.type === c.id && e.hp > 0),
      look = CREATURE_ROSTER[c.id];
    root.innerHTML = `<div class="veil"><section class="bestiary-window" role="dialog" aria-label="Dungeon bestiary"><header><div><span class="eyebrow">HEROES OF LEGEND · FIELD GUIDE</span><h2>The things below</h2><p>${cards.length} dungeon creatures · Printed book statistics</p></div><button class="close icon-button" aria-label="Close">${icon("close")}</button></header><div class="bestiary-body"><aside><input id="creature-search" placeholder="Find a creature…" aria-label="Find a creature" value="${esc(query)}"><select id="creature-family" aria-label="Creature family"><option value="all">Every family</option>${[
      ...new Set(cards.map((c) => c.family)),
    ]
      .sort()
      .map(
        (f) => `<option ${f === family ? "selected" : ""}>${esc(f)}</option>`,
      )
      .join(
        "",
      )}</select><div class="creature-list"></div></aside><main><div class="creature-portrait"><img src="/vendor/hol/assets/bestiary/${c.id}.webp" alt="${esc(c.name)} book illustration"><span class="creature-cv">${c.cv}<small>COMBAT VALUE</small></span></div><span class="eyebrow">${esc(c.family)} · Appears from depth ${look.depth}</span><h2>${esc(c.name)}</h2><p>${esc(c.classification.role)}</p><div class="creature-stat-row"><span>HEALTH<b>${c.hp.max}</b></span><span>SPEED<b>${c.speed.ordinary}</b></span><span>STABILITY<b>${c.defenses.stability}</b></span></div><p><b>Resistances</b> · ${esc(c.resistances.sourceText)}<br><b>Immunities</b> · ${esc(c.immunities.join(", ") || "None")}<br><b>Evasion</b> · ${esc(c.defenses.evasion.sourceText)}<br><b>Threat</b> · ${esc(c.defenses.threat.sourceText)}</p><h3>Combat behavior</h3><p>${esc(CREATURE_GOALS[game.enemyPersonality({ type: c.id })])}</p><h3>Attacks</h3>${c.actions.main.actions
      .map(
        (a) =>
          `<article class="creature-action"><b>${esc(a.name)}</b><small>${esc(a.defense.sourceText)} defense</small><div>${["weak", "standard", "strong"].map((t) => `<span>${t.toUpperCase()}<strong>${esc(a.outcomes[t])}</strong></span>`).join("")}</div></article>`,
      )
      .join(
        "",
      )}<p class="bestiary-note">The dungeon AI uses these attacks and a curated set of printed maneuvers and reactions. Alternate attacks and narrative traits remain tracked separately in the implementation coverage.</p>${live.length ? `<p>${live.length} living on this floor · ${live.map((e) => `${e.hp}/${e.maxHp} HP${e.boss ? " · Guardian" : ""}`).join(" / ")}</p>` : ""}</main></div></section></div>`;
    const list = () => {
      root.querySelector(".creature-list").innerHTML = cards
        .filter(
          (c) =>
            (family === "all" || family === c.family) &&
            c.name.toLowerCase().includes(query.toLowerCase()),
        )
        .map(
          (c) =>
            `<button data-creature="${c.id}" class="${c.id === selected ? "chosen" : ""}"><img src="/vendor/hol/assets/bestiary/${c.id}.webp" alt=""><span>${esc(c.name)}<small>${esc(c.family)}</small></span><b>${c.cv}</b></button>`,
        )
        .join("");
      root.querySelectorAll("[data-creature]").forEach(
        (b) =>
          (b.onclick = () => {
            selected = b.dataset.creature;
            draw();
          }),
      );
    };
    list();
    root.querySelector(".close").onclick = close;
    root.querySelector("#creature-search").oninput = (e) => {
      query = e.target.value;
      list();
    };
    root.querySelector("#creature-family").onchange = (e) => {
      family = e.target.value;
      list();
    };
  }
  draw();
}
