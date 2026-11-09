import { ABILITIES } from "../core/abilities.mjs";
import { esc, icon } from "./icons.mjs";
import { SHORTCUT_KEYS, actionDetailsHTML } from "./action-details.mjs";
export function shortcutManager({
  root,
  game,
  index,
  close,
  attempt,
  character,
}) {
  let query = "",
    category = "all";
  function draw(focus = null) {
    const h = game.party[index],
      favorites = h.favorites ?? [],
      cards = game.availableActions(h).filter((c) => {
        const s = game.powerSpec(c.id, h) ?? ABILITIES[c.id];
        return (
          (category === "all" || (s?.category ?? "") === category) &&
          `${c.name} ${s?.description ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      });
    root.innerHTML = `<div class="veil"><section class="shortcut-window" role="dialog" aria-modal="true" aria-label="Manage action shortcuts"><header><div><span class="eyebrow">YOUR COMBAT REPERTOIRE</span><h2>${esc(h.name)} · Shortcuts</h2><p>Add, remove and reorder actions. Changes save immediately and spend no actions.</p></div><button class="close icon-button" aria-label="Close">${icon("close")}</button></header><nav class="sheet-party" aria-label="Companions">${game.party.map((p, i) => `<button data-shortcut-hero="${i}" class="${i === index ? "chosen" : ""}" aria-pressed="${i === index}">${esc(p.name.split(" ")[0])}</button>`).join("")}</nav><div class="shortcut-layout"><section class="shortcut-slots"><div class="section-heading"><h3>Action bar</h3><span>${favorites.length} / 8</span></div><p>Keys 1–4 select heroes. These eight keys use shortcuts.</p><ol>${SHORTCUT_KEYS.map(
      (key, i) => {
        const id = favorites[i],
          name = id
            ? game.C.choices.find((c) => c.id === id)?.name
            : "Empty slot";
        return `<li><kbd>${key}</kbd><span>${esc(name ?? id)}</span>${id ? `<button data-shortcut-move="${i}" data-direction="-1" aria-label="Move ${esc(name)} earlier" ${i === 0 ? "disabled" : ""}>↑</button><button data-shortcut-move="${i}" data-direction="1" aria-label="Move ${esc(name)} later" ${i === favorites.length - 1 ? "disabled" : ""}>↓</button><button data-shortcut-remove="${id}" aria-label="Remove ${esc(name)}">×</button>` : "<small>Add an action →</small>"}</li>`;
      },
    ).join(
      "",
    )}</ol></section><section class="shortcut-library"><div class="shortcut-search"><label>Search actions<input id="shortcut-query" type="search" value="${esc(query)}" placeholder="Name or effect"></label><label>Action cost<select id="shortcut-category">${[
      ["all", "All costs"],
      ["main", "Main action"],
      ["maneuver", "Maneuver"],
      ["reaction", "Reaction"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${v === category ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="shortcut-cards">${cards.map((c) => `<article><details><summary>${esc(c.name)}</summary><div class="shortcut-rules">${actionDetailsHTML(game, c.id, h)}</div></details><button data-shortcut-add="${c.id}" ${favorites.includes(c.id) || favorites.length === 8 ? "disabled" : ""}>${favorites.includes(c.id) ? "Added" : favorites.length === 8 ? "Bar full" : "+ Add"}</button></article>`).join("") || "<p>No matching learned actions.</p>"}</div></section></div><footer><button id="shortcut-character">Character sheet</button><button class="primary" id="shortcut-done">Done</button></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelector("#shortcut-done").onclick = close;
    root.querySelector("#shortcut-character").onclick = () => character(index);
    root.querySelectorAll("[data-shortcut-hero]").forEach(
      (b) =>
        (b.onclick = () => {
          index = +b.dataset.shortcutHero;
          draw();
        }),
    );
    root.querySelector("#shortcut-query").oninput = (e) => {
      const pos = e.target.selectionStart;
      query = e.target.value;
      draw("query");
      root.querySelector("#shortcut-query").setSelectionRange(pos, pos);
    };
    root.querySelector("#shortcut-category").onchange = (e) => {
      category = e.target.value;
      draw("category");
    };
    root.querySelectorAll("[data-shortcut-add],[data-shortcut-remove]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.favorite(
              index,
              b.dataset.shortcutAdd ?? b.dataset.shortcutRemove,
            );
            draw();
            const added = b.dataset.shortcutAdd;
            (added
              ? root.querySelector(`[data-shortcut-remove="${added}"]`)
              : root.querySelector("#shortcut-query")
            )?.focus();
          })),
    );
    root.querySelectorAll("[data-shortcut-move]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            const ids = [...h.favorites],
              from = +b.dataset.shortcutMove,
              to = from + Number(b.dataset.direction);
            [ids[from], ids[to]] = [ids[to], ids[from]];
            game.setShortcuts(index, ids);
            draw();
            root.querySelector(`[data-shortcut-remove="${ids[to]}"]`)?.focus();
          })),
    );
    if (focus)
      root
        .querySelector(
          focus === "query" ? "#shortcut-query" : "#shortcut-category",
        )
        .focus();
  }
  draw();
  root.querySelector(".close").focus();
}
