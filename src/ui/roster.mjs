import { icon, esc } from "./icons.mjs";
import { heroPreview } from "../view/appearance.mjs";
import { xpMeter } from "./experience.mjs";
export function rosterScreen({
  root,
  game,
  scene,
  C,
  close,
  create,
  attempt,
  slot = 0,
  selection,
  hall = false,
}) {
  let query = "",
    view;
  const name = (id) => C.choices.find((c) => c.id === id)?.name ?? id;
  function draw() {
    view?.dispose();
    game.recordFallen();
    const entries = hall
      ? game.campaign.fallenHeroes.map((e) => ({ hero: e.hero, memorial: e }))
      : game.livingRoster().map((hero) => ({ hero }));
    const filtered = entries.filter(({ hero }) =>
      `${hero.name} ${name(hero.draft.classId)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    const selected =
      entries.find(({ hero }) => hero.heroId === selection) ?? filtered[0];
    selection = selected?.hero.heroId;
    const h = selected?.hero,
      member = h && game.party.findIndex((p) => p.heroId === h.heroId);
    const level = h?.preview?.state.level ?? h?.draft.progression?.level ?? 1;
    root.innerHTML = `<div class="veil"><section class="register-window" role="dialog" aria-label="${hall ? "Hall of Fallen Heroes" : "Character repository"}"><header class="character-header"><div><span class="eyebrow">GREYHAVEN · THE COMPANY REGISTER</span><h2>${hall ? "Hall of Fallen Heroes" : "Choose your company"}</h2><p>${hall ? "Their names remain when their journeys end." : "Every hero has a place here. Choose four for the depths."}</p></div><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><nav class="register-tabs"><button data-register-tab="living" class="${hall ? "" : "chosen"}">Living heroes <b>${game.livingRoster().length}</b></button><button data-register-tab="fallen" class="${hall ? "chosen" : ""}">Hall of Fallen Heroes <b>${game.campaign.fallenHeroes.length}</b></button><button id="create-roster-hero" class="primary">${icon("plus")} Create a hero</button></nav><div class="register-body"><aside class="register-company"><span class="eyebrow">EXPEDITION COMPANY</span><p>Select the slot to fill.</p>${game.party.map((p, i) => `<button data-roster-slot="${i}" class="${slot === i ? "chosen" : ""} ${p.survival.status === "dead" ? "fallen" : ""}"><span class="slot-number">0${i + 1}</span><span><strong>${esc(p.name)}</strong><small>${p.survival.status === "dead" ? "FALLEN · Choose a replacement" : `${esc(name(p.draft.classId))} · Level ${p.preview.state.level}`}</small></span></button>`).join("")}<p class="register-note">Swapping a companion sends them to the reserve with their equipment, injuries and experience intact. Only final death closes a hero’s story.</p></aside><main class="register-catalog"><label class="register-search">${icon("search")}<input id="roster-search" type="search" aria-label="Search heroes" placeholder="Search names or classes…" value="${esc(query)}"></label><div class="hero-register-list">${filtered.map(({ hero, memorial }) => `<button data-roster-hero="${hero.heroId}" class="register-hero ${hero.heroId === selection ? "chosen" : ""}"><div><strong>${esc(hero.name)}</strong><span class="hero-roster-state">${memorial ? `DEPTH ${memorial.depth}` : game.party.some((p) => p.heroId === hero.heroId) ? "IN COMPANY" : "IN RESERVE"}</span></div><small>${esc(name(hero.draft.ancestryId))} · ${esc(name(hero.draft.classId))}</small>${xpMeter(hero, true)}</button>`).join("") || `<div class="register-empty">${icon(hall ? "book" : "shield")}<h3>${hall ? "No fallen heroes" : "No matching heroes"}</h3><p>${hall ? "May the hall remain quiet." : "Create a hero to add them to the repository."}</p></div>`}</div></main><aside class="register-inspector">${h ? `<div class="register-preview"><canvas id="roster-preview" aria-label="Selected hero preview"></canvas></div><span class="eyebrow">${hall ? "REMEMBERED IN GREYHAVEN" : member >= 0 ? `COMPANY SLOT 0${member + 1}` : "READY IN RESERVE"}</span><h3>${esc(h.name)}</h3><p>${esc(name(h.draft.classId))} · Level ${level}</p>${xpMeter(h)}${hall ? `<dl class="fallen-record"><div><dt>Last expedition</dt><dd>${selected.memorial.expedition}</dd></div><div><dt>Final depth</dt><dd>${selected.memorial.depth}</dd></div><div><dt>Scars</dt><dd>${h.survival.wounds}</dd></div></dl><p class="fallen-cause">${esc(selected.memorial.cause)}</p><span class="fallen-seal">A NAME THE DARK COULD NOT TAKE</span>` : `<div class="register-vitals"><span>${h.survival.hp} / ${h.survival.maxHp} HP</span><span>${h.survival.gritAvailable} GRIT</span><span>${h.wounds.length} SCARS</span></div><button id="assign-roster-hero" class="primary" ${member === slot ? "disabled" : ""}>${member === slot ? "Assigned to this slot" : `${member >= 0 ? "Swap into" : "Assign to"} slot 0${slot + 1}`}</button><p class="register-note">${h.survival.status === "active" ? "Choose this hero for the next expedition." : "This hero survives, but needs recovery before descending."}</p>`}` : ""}</aside></div><footer class="character-footer"><span>${hall ? `${game.campaign.fallenHeroes.length} individual heroes remembered` : `${game.livingRoster().length} living heroes · ${game.campaign.reserve.length} in reserve`}</span><span>Saved on this computer · <kbd>Esc</kbd> Close</span></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelectorAll("[data-register-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          hall = b.dataset.registerTab === "fallen";
          selection = null;
          query = "";
          draw();
        }),
    );
    root.querySelectorAll("[data-roster-slot]").forEach(
      (b) =>
        (b.onclick = () => {
          slot = +b.dataset.rosterSlot;
          draw();
        }),
    );
    root.querySelectorAll("[data-roster-hero]").forEach(
      (b) =>
        (b.onclick = () => {
          selection = b.dataset.rosterHero;
          draw();
        }),
    );
    root.querySelector("#create-roster-hero").onclick = () => create(slot);
    root.querySelector("#roster-search").oninput = (e) => {
      query = e.target.value;
      const caret = e.target.selectionStart;
      draw();
      const input = root.querySelector("#roster-search");
      input.focus();
      if (input.type === "text") input.setSelectionRange(caret, caret);
    };
    root.querySelector("#assign-roster-hero")?.addEventListener("click", () =>
      attempt(() => {
        game.assignHero(slot, h.heroId);
        draw();
      }),
    );
    if (h)
      view = heroPreview(root.querySelector("#roster-preview"), scene.assets, {
        ...h,
        preview: h.preview ?? game.R.workshopCharacter(h.draft, C),
      });
  }
  draw();
  return () => view?.dispose();
}
