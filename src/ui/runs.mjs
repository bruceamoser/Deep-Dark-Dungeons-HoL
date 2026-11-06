import { esc, icon } from "./icons.mjs";
export function runsScreen({
  root,
  library,
  resume,
  exit,
  load,
  create,
  copy,
  quit,
  attempt,
  onBusy,
  remove = (id) => library.remove(id),
}) {
  let selected = library.active,
    deleting = null,
    working = false;
  const perform = (fn) =>
    attempt(async () => {
      if (working) return;
      working = true;
      onBusy(true);
      root.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        await fn();
      } finally {
        working = false;
        onBusy(false);
        if (root.querySelector(".runs-window")) await draw();
      }
    });
  async function draw() {
    const slots = await library.list();
    if (!slots.some((s) => s.id === selected)) selected = slots[0]?.id;
    const chosen = slots.find((s) => s.id === selected);
    root.innerHTML = `<div class="veil runs-veil"><section class="runs-window" role="dialog" aria-label="Saved runs"><header><div><span class="eyebrow">THE CHRONICLES OF GREYHAVEN</span><h2>${library.active ? "A moment by the lantern" : "Your journeys await"}</h2><p>${library.active ? "Run paused. Your latest state is saved." : "Choose a saved company or begin a separate journey."}</p></div>${library.active ? `<button class="primary" id="resume-run">Resume run ${icon("close")}</button>` : ""}</header><div class="runs-body"><aside><span class="eyebrow">${slots.length} SAVED ${slots.length === 1 ? "JOURNEY" : "JOURNEYS"}</span><div class="run-list">${slots.map((s) => `<button data-run="${s.id}" class="${s.id === selected ? "chosen" : ""}"><span class="run-emblem">${s.invalid ? "?" : s.mode === "combat" ? "⚔" : s.mode === "town" ? "⌂" : "◇"}</span><span><strong>${esc(s.name)}</strong><small>${s.incompatible ? "Earlier edition · preserved" : s.invalid ? "Cannot read save" : `${s.mode === "town" ? "Greyhaven" : `Depth ${s.depth}`} · ${s.mode === "combat" ? `Combat · Round ${s.round}` : s.mode.replaceAll("-", " ")}`}</small><small>${s.updatedAt ? esc(new Date(s.updatedAt).toLocaleString()) : ""}</small></span>${s.id === library.active ? '<b class="run-active">ACTIVE</b>' : ""}</button>`).join("") || '<p class="muted">No saved journeys yet.</p>'}</div></aside><main>${chosen ? `<span class="eyebrow">${chosen.id === library.active ? "CURRENT RUN" : "SAVED RUN"}</span><h3>${esc(chosen.name)}</h3>${chosen.invalid ? (chosen.incompatible ? "<p>This journey uses the earlier ability system. Its save remains on disk. Start a new journey to play the discipline forge in v0.6.</p>" : "<p>This save could not be read. Other runs remain available.</p>") : `<div class="run-facts"><span><b>${chosen.depth}</b>Depth</span><span><b>${chosen.bank}</b>Vault coins</span><span><b>${chosen.heroes.filter((h) => h.status !== "dead").length}</b>Survivors</span></div><div class="run-company">${chosen.heroes.map((h) => `<div><strong>${esc(h.name)}</strong><small>Level ${h.level} · ${h.hp} HP · ${esc(h.status)}</small></div>`).join("")}</div>${chosen.returnDepth ? `<p class="run-passage">A return passage leads to depth ${chosen.returnDepth}.</p>` : ""}<button id="load-run" class="primary">${chosen.id === library.active ? "Resume this run" : "Continue this run"}</button>`}<form id="rename-run"><label>Run name<input id="run-rename" maxlength="64" required value="${esc(chosen.name)}"></label><button>Rename</button></form>${deleting === chosen.id ? `<div class="run-delete-confirm" role="alert"><p>Permanently delete <b>${esc(chosen.name)}</b>? Its party, progress and fallen heroes will be removed from this run. Other runs are kept.</p><button id="confirm-delete" class="danger">Delete save permanently</button><button id="cancel-delete">Keep this run</button></div>` : `<button id="delete-run" class="danger delete-run-button">${icon("close")} Delete run…</button>`}` : "<h3>A new chapter</h3><p>Each journey keeps its own company, discoveries, treasury and fallen heroes.</p>"}</main></div><footer><div class="run-new"><label>Name a journey<input id="run-name" maxlength="64" placeholder="e.g. The Ember Company" value=""></label><button id="new-run">New run</button>${library.active ? '<button id="copy-run">Save a separate copy</button>' : ""}</div><div class="run-exit">${library.active ? '<button id="exit-run">Save & exit run</button>' : ""}${quit ? '<button id="quit-game">Save & quit game</button>' : ""}</div><p>New runs start with the four example heroes; use the company register to create your own. Each slot is independent and autosaves when played. Copies preserve another point in your journey.</p></footer></section></div>`;
    root.querySelectorAll("[data-run]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.run;
          deleting = null;
          void draw();
        }),
    );
    const click = (id, fn) => {
      const b = root.querySelector(id);
      if (b) b.onclick = () => perform(fn);
    };
    click("#resume-run", resume);
    click("#load-run", () =>
      selected === library.active ? resume() : load(selected),
    );
    root.querySelector("#rename-run")?.addEventListener("submit", (event) => {
      event.preventDefault();
      perform(() =>
        library.rename(selected, root.querySelector("#run-rename").value),
      );
    });
    click("#new-run", () =>
      create(
        root.querySelector("#run-name").value ||
          `New company ${slots.length + 1}`,
      ),
    );
    click("#copy-run", async () => {
      selected = await copy(
        root.querySelector("#run-name").value ||
          `Journey copy ${slots.length + 1}`,
      );
    });
    click("#exit-run", exit);
    click("#quit-game", quit);
    click("#delete-run", () => {
      deleting = selected;
    });
    click("#cancel-delete", () => {
      deleting = null;
    });
    click("#confirm-delete", async () => {
      await remove(selected);
      selected = null;
      deleting = null;
    });
  }
  return draw();
}
