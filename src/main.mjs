import "./style.css";
import { Scene } from "./view/scene.mjs";
import { Game } from "./core/game.mjs";
import { readyExample } from "./core/presets.mjs";
import { key, distance } from "./core/dungeon.mjs";
import { serialize, deserialize } from "./core/save.mjs";
const ui = document.querySelector("#ui"),
  modal = document.querySelector("#modal-root");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let toastTimer;
function toast(text) {
  const e = document.querySelector("#toast");
  e.textContent = text;
  e.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove("show"), 4200);
}
const attempt = (fn) => {
  try {
    const p = fn();
    if (p?.catch) p.catch((e) => toast(e.message));
  } catch (e) {
    toast(e.message);
  }
};
ui.innerHTML =
  '<div class="loading-screen"><div class="eyebrow">HEROES OF LEGEND</div><h1>Deep Dark Dungeons</h1><div class="spinner"></div><p>Lighting the way beneath Greyhaven…</p></div>';
let game,
  scene,
  C,
  R,
  examples,
  sound,
  muted = false,
  saveTimer,
  initialized = false;
async function init() {
  const modules = [
    "workshop-character",
    "creation",
    "portable-character",
    "roll",
    "damage",
    "survival",
    "wounds",
    "encounter",
    "actions",
  ];
  R = {};
  for (const name of modules)
    Object.assign(
      R,
      await import(/* @vite-ignore */ `/vendor/hol/rules/${name}.mjs`),
    );
  const load = async (n) => {
    const r = await fetch(`/vendor/hol/data/${n}.json`);
    if (!r.ok) throw new Error(`Missing HoL catalog ${n}`);
    return r.json();
  };
  const [choices, inventory, wounds, party] = await Promise.all(
    ["choices", "inventory", "wounds", "party"].map(load),
  );
  C = {
    choices: choices.records,
    inventory,
    wounds,
    commit: choices.sourceCommit,
  };
  examples = party;
  game = new Game(R, C, toast);
  scene = new Scene(document.querySelector("#world"), clickTile, (p) => {
    if (modal.children.length || game.mode === "town") return;
    scene.showPath(game.route(p));
  });
  await scene.load();
  game.listeners.push((type, data) => {
    if (type === "floor") {
      scene.tilesDetail = [];
      scene.build(game.map);
      scene.resetEntities(game.party, game.enemies);
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "party") {
      scene.resetEntities(game.party, game.enemies);
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "move") {
      scene.focusOn(game.active);
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "attack") {
      scene.animate(data.attacker, "1H_Melee_Attack_Slice_Diagonal", true);
      scene.animate(data.target, "Hit_A", true);
      tone(95, 0.12);
    }
    if (type === "combat") {
      tone(65, 0.7);
      scene.showPath([]);
    }
    if (type === "loot") {
      toast(`Recovered ${data.chest.coins} coins`);
      tone(520, 0.18);
    }
    if (type === "dying") dying(data.hero);
    if (type === "wound") woundReview(data);
    if (type !== "move") render();
    scheduleSave();
  });
  game.fresh(
    [
      "borin-bridgekeeper",
      "lira-ashbow",
      "pip-copperwink",
      "vaelis-emberglass",
    ].map((id) => readyExample(examples.find((e) => e.id === id).draft, R, C)),
  );
  // Demo starts from legal published characters, never randomized partial builds.
  scene.updateVisibility(game.party, game.seen);
  render();
  setInterval(() => {
    if (!modal.children.length) game.step();
  }, 170);
  document.addEventListener("keydown", (e) => {
    if (
      modal.children.length ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      attempt(() => game.endTurn());
    }
    if (/^[1-4]$/.test(e.key)) attempt(() => game.select(Number(e.key) - 1));
    if (e.key.toLowerCase() === "q") scene.rotate(-1);
    if (e.key.toLowerCase() === "e") scene.rotate(1);
    if (e.key.toLowerCase() === "f") scene.focusOn(game.active);
    if (e.key === "Escape") help();
  });
  initialized = true;
  window.__ddd = { game, scene, R, C };
}
function tone(frequency, duration) {
  if (muted) return;
  sound ??= new AudioContext();
  sound.resume();
  const osc = sound.createOscillator(),
    gain = sound.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, sound.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    frequency * 0.5,
    sound.currentTime + duration,
  );
  gain.gain.setValueAtTime(0.04, sound.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, sound.currentTime + duration);
  osc.connect(gain).connect(sound.destination);
  osc.start();
  osc.stop(sound.currentTime + duration);
}
function className(h) {
  return C.choices.find((c) => c.id === h.draft.classId)?.name ?? "Adventurer";
}
function button(label, action, sub = "", primary = false) {
  return `<button data-action="${action}" class="${primary ? "primary" : ""}">${label}${sub ? `<small>${sub}</small>` : ""}</button>`;
}
function render() {
  if (!game?.campaign) return;
  const town = ["town", "defeat"].includes(game.mode),
    h = game.active,
    c = game.campaign;
  const header = `<div class="topbar"><div class="brand"><img src="/art/greyhaven-seal.png" alt="Greyhaven seal">DEEP DARK DUNGEONS<small>HEROES OF LEGEND</small></div><div class="location"><div class="eyebrow">${town ? "THE LAST LIGHT ABOVE" : "THE DROWNED RELIQUARY"}</div><h2>${town ? "Greyhaven" : `Depth ${c.depth} · The Old Crypt`}</h2></div><div class="top-tools">${button("Save", "save")}${button(muted ? "Sound off" : "Sound on", "sound")}${button("?", "help")}</div></div>`;
  if (town) {
    ui.innerHTML =
      header +
      `<section class="town"><div class="town-copy"><div class="eyebrow">A COMPANY OF FOUR</div><h1>${game.mode === "defeat" ? "The dark<br>remembers." : "Some things<br>should stay<br>buried."}</h1><p class="intro">${game.mode === "defeat" ? "Their expedition ended below. Assemble a new company. What they carried may still be found." : "Below Greyhaven, the old roads descend into a kingdom without a sun. Choose your companions. Bring back what you can."}</p><div class="rule"></div><div class="town-actions">${button(game.mode === "defeat" ? "Assemble a new company" : "Enter the depths", game.mode === "defeat" ? "new-party" : "descend", "BEGIN EXPEDITION", true)}${button("The company register", "roster", "CREATE & RECRUIT")}${button("The provisioner", "shop", "EQUIPMENT & SUPPLIES")}${button("Continue saved expedition", "load", "LOCAL SAVE")}</div><div class="town-status"><div><b>${c.bank}</b><small>Vault coins</small></div><div><b>${c.expeditions}</b><small>Expeditions</small></div><div><b>${c.memorial.length}</b><small>Lost companies</small></div></div><div class="edition">DEVELOPMENT BUILD 0.1 · COMBAT COVERAGE IN PROGRESS</div></div></section><div class="town-party">${game.party.map((h, i) => `<button data-hero="${i}"><strong>${esc(h.name.split(" ")[0])}</strong><small>${esc(className(h))} · ${h.survival.hp} HP</small></button>`).join("")}</div>`;
    scene.focusOn({ x: game.map.start.x - 3, z: game.map.start.z + 1 });
  } else {
    const combat = game.mode === "combat",
      b = game.budget;
    let phase = combat
      ? `ROUND ${game.encounter.round} · ${game.encounter.nextSide === "players" ? "YOUR COMPANY" : "OPPOSITION"}`
      : game.mode === "wound-review"
        ? "INJURY · INTEGRATION PAUSE"
        : "REAL-TIME EXPLORATION";
    ui.innerHTML =
      header +
      `<div class="hero-panel">${game.party.map((p, i) => `<button class="hero-card ${i === game.selected ? "active" : ""}" data-select="${i}"><span class="number">0${i + 1}</span><div style="flex:1"><h3>${esc(p.name)}</h3><div class="class">${esc(className(p))} · ${p.survival.status}</div><div class="bar"><span style="width:${(p.survival.hp / p.survival.maxHp) * 100}%"></span></div><div class="vitals"><span>${p.survival.hp} / ${p.survival.maxHp} HP</span><span>${p.survival.gritAvailable} GRIT</span></div></div></button>`).join("")}<div class="party-hint">1–4 SELECT · CLICK GROUND TO MOVE</div></div><div class="compass">N<b>◇</b>Q ↶ &nbsp; ↷ E</div><div class="minimap"><canvas id="map" width="155" height="155"></canvas><footer>${c.haul} COINS IN THE PACK</footer></div><aside class="eventlog"><div class="eyebrow">EXPEDITION JOURNAL</div>${game.log
        .slice(-4)
        .map((l) => `<p>${esc(l)}</p>`)
        .join(
          "",
        )}</aside><div class="bottom"><div class="phase ${combat ? "combat" : ""}">${phase}</div><div class="actionbar">${button("Character", "sheet", "ABILITIES & GEAR")}${combat ? button("Move farther", "convert", "MANEUVER → MOVE") + button("End turn", "end", b ? `${b.remaining.main} MAIN · ${R.movementRemaining(b)} MOVE` : "SPACE", true) : button("Safe breath", "rest", "RESTORE HP") + button("Return", "extract", "ENTRANCE STAIRS") + button("Descend", "deeper", "FAR STAIRS", true)}</div><div class="hint">${combat ? "Click an adjacent enemy for a basic attack. All rolls and damage appear in the journal." : "Scroll to zoom · Q / E rotate · F focus · Coffers open when approached"}</div></div>`;
    drawMap();
  }
  bind();
}
function bind() {
  ui.querySelectorAll("[data-select]").forEach(
    (b) => (b.onclick = () => attempt(() => game.select(+b.dataset.select))),
  );
  ui.querySelectorAll("[data-hero]").forEach(
    (b) => (b.onclick = () => sheet(+b.dataset.hero)),
  );
  ui.querySelectorAll("[data-action]").forEach(
    (b) => (b.onclick = () => attempt(() => action(b.dataset.action))),
  );
}
function action(a) {
  switch (a) {
    case "descend":
      game.descend();
      scene.focusOn(game.active);
      break;
    case "save":
      return save(true);
    case "load":
      return load();
    case "sound":
      muted = !muted;
      render();
      break;
    case "roster":
      roster();
      break;
    case "shop":
      shop();
      break;
    case "help":
      help();
      break;
    case "sheet":
      sheet(game.selected);
      break;
    case "end":
      game.endTurn();
      break;
    case "convert":
      game.convert();
      break;
    case "rest":
      game.rest();
      break;
    case "extract":
      game.extract();
      break;
    case "deeper":
      game.deeper();
      break;
    case "new-party":
      game.mode = "town";
      [
        "borin-bridgekeeper",
        "lira-ashbow",
        "pip-copperwink",
        "vaelis-emberglass",
      ].forEach((id, i) =>
        game.replace(
          i,
          readyExample(examples.find((e) => e.id === id).draft, R, C),
        ),
      );
      game.newFloor();
      render();
      break;
  }
}
function drawMap() {
  const cv = document.querySelector("#map");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#081015";
  ctx.fillRect(0, 0, 155, 155);
  const scale = 3;
  for (const p of Object.values(game.map.tiles)) {
    if (!game.seen[key(p.x, p.z)]) continue;
    ctx.fillStyle = "#40555c";
    ctx.fillRect(p.x * scale, p.z * scale, scale - 1, scale - 1);
  }
  for (const h of game.party) {
    ctx.fillStyle = h === game.active ? "#e5c180" : "#83bab1";
    ctx.fillRect(h.x * scale - 1, h.z * scale - 1, 4, 4);
  }
  ctx.fillStyle = "#b99860";
  ctx.fillRect(game.map.start.x * scale, game.map.start.z * scale, 3, 3);
}
function clickTile(p) {
  if (modal.children.length) return;
  attempt(() => {
    const enemy = game.enemies.find(
      (e) => e.hp > 0 && e.x === p.x && e.z === p.z,
    );
    if (enemy) game.attack(enemy.id);
    else game.move(p);
  });
}
function dialog(title, content, footer = "") {
  modal.innerHTML = `<div class="veil"><section class="dialog" role="dialog" aria-modal="true"><header><div class="eyebrow">DEEP DARK DUNGEONS</div><button class="close" aria-label="Close">×</button></header><h2>${title}</h2>${content}<footer>${footer}</footer></section></div>`;
  modal.querySelector(".close").onclick = () => modal.replaceChildren();
}
function help() {
  dialog(
    "A light in the dark",
    `<p>Lead four heroes through the crypt. Click the floor to travel together. Sentries stop real-time movement and begin alternating HoL turns.</p><p>Choose heroes with <b>1–4</b>. In combat, click an adjacent sentry for Basic Melee (a held melee weapon) or Basic Unarmed. Click the floor to spend movement; convert a Maneuver for more. <b>Space</b> ends a turn. <b>Q / E</b> rotate, mouse wheel zooms, <b>F</b> follows your selected hero.</p><p>The Character Workshop includes the full imported character-creation catalog. Combat currently automates basic melee/unarmed, player defense, damage/resistance and the alternating turn structure. Other abilities remain readable, not automated. Wounds are rolled from all five complete tables; this build pauses on a wound rather than silently dropping its effects.</p><p>Expedition recovery, loot and Greyhaven are game-specific playtest proposals. This is an early playable foundation, not a finished HoL adaptation.</p>`,
  );
}
function roster() {
  dialog(
    "The company register",
    `<p>Recruit from the published examples or build your own hero with the full HoL workshop.</p><div class="catalog-list">${game.party.map((h, i) => `<button data-edit="${i}">${esc(h.name)}<small>${esc(className(h))} · Replace or customize slot ${i + 1}</small></button>`).join("")}</div>`,
  );
  modal
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => workshop(+b.dataset.edit)));
}
function workshop(slot) {
  const h = game.party[slot];
  localStorage.setItem(
    "hol.workshop.v1",
    JSON.stringify({
      character: JSON.parse(R.writePortableCharacter(h.draft, C)),
      mode: "builder",
      step: 0,
      isExample: false,
    }),
  );
  modal.innerHTML = `<div class="veil"><section class="workshop-dialog"><header><span class="caps">Recruit · Slot ${slot + 1}</span><p>Finish both DP stages, equipment and review. Recruit validates the complete character.</p><button id="recruit" class="primary">Recruit this hero</button><button id="cancel-workshop">Close</button></header><iframe title="Heroes of Legend character workshop" src="/vendor/hol/index.html"></iframe></section></div>`;
  modal.querySelector("#cancel-workshop").onclick = () =>
    modal.replaceChildren();
  modal.querySelector("#recruit").onclick = () =>
    attempt(() => {
      const stored = JSON.parse(localStorage.getItem("hol.workshop.v1"));
      const parsed = R.readPortableCharacter(stored.character, C);
      game.replace(slot, parsed.draft);
      modal.replaceChildren();
      toast(`${game.party[slot].name} joins the company.`);
    });
}
function sheet(index) {
  const h = game.party[index];
  const cards = C.choices.filter(
    (c) => h.preview.state.abilities.includes(c.id) || c.universal,
  );
  dialog(
    esc(h.name),
    `<div class="eyebrow">${esc(className(h))} · LEVEL ${h.preview.state.level}</div><div class="sheet-summary"><span>${h.survival.hp}/${h.survival.maxHp} HP</span><span>${h.survival.gritAvailable} Grit</span><span>Speed ${h.preview.summary.speed}</span><span>Bulk ${h.preview.inventory.bulk}/${h.preview.inventory.capacity}</span></div><div class="card-list">${cards.map((c) => `<details><summary>${esc(c.name)} <span class="tag">${["ability-basic-melee", "ability-basic-unarmed"].includes(c.id) ? "PLAYABLE" : "RULES REFERENCE"}</span></summary>${c.reference?.rules.details.map((d) => `<p><b>${esc(d.label)}:</b> ${esc(d.value)}</p>`).join("") ?? ""}${c.reference?.rules.body.map((b) => (b.text ? `<p>${esc(b.text)}</p>` : (b.outcomes?.map((o) => `<p><b>${esc(o.label)}:</b> ${esc(o.text)}</p>`).join("") ?? ""))).join("") ?? ""}</details>`).join("")}</div>`,
    game.mode === "town"
      ? '<button id="edit-hero">Customize in workshop</button>'
      : "",
  );
  const edit = modal.querySelector("#edit-hero");
  if (edit) edit.onclick = () => workshop(index);
}
function shop() {
  dialog(
    "The provisioner",
    `<p>Equipment, supplies, coins, Bulk and acquisition grants are available in each hero’s Workshop. Select a hero to review their inventory and shopping ledger.</p><p class="muted">Expedition-vault purchases are not yet implemented; the workshop currently handles creation equipment.</p><div class="catalog-list">${game.party.map((h, i) => `<button data-shop="${i}">${esc(h.name)}<small>${h.preview.inventory.remainingCoins} creation coins remaining</small></button>`).join("")}</div>`,
  );
  modal
    .querySelectorAll("[data-shop]")
    .forEach((b) => (b.onclick = () => workshop(+b.dataset.shop)));
}
function dying(h) {
  dialog(
    `${esc(h.name)} is Dying`,
    `<p>Spend Grit to return to full available HP, or make a Fortitude death roll. Spent Grit does not return through ordinary rest.</p>`,
    `<button id="death-roll">Make death roll</button><button id="grit" ${h.survival.gritAvailable ? "" : "disabled"}>Spend 1 Grit</button>`,
  );
  for (const [id, kind] of [
    ["death-roll", "roll"],
    ["grit", "grit"],
  ])
    modal.querySelector("#" + id).onclick = () =>
      attempt(() => {
        game.survivalChoice(kind);
        modal.replaceChildren();
      });
}
function woundReview({ hero, wound }) {
  dialog(
    "A lasting wound",
    `<p><b>${esc(hero.name)} · ${esc(wound.record.injury)}</b></p><p>${esc(wound.record.remedy)}</p><p>This result is preserved in the campaign. Automated wound consequences and treatment are still being integrated; this build pauses here to avoid changing HoL’s harm rules.</p>`,
    button("Save expedition", "save-wound"),
  );
  modal.querySelector("[data-action]").onclick = () => save(true);
}
function scheduleSave() {
  if (!initialized) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save(false), 900);
}
async function save(show = false) {
  if (!game) return;
  const text = serialize(game.snapshot());
  if (window.desktop) await window.desktop.save(text);
  else localStorage.setItem("ddd.campaign.v1", text);
  if (show) toast("Expedition saved on this computer.");
}
async function load() {
  const text = window.desktop
    ? await window.desktop.load()
    : localStorage.getItem("ddd.campaign.v1");
  if (!text) throw new Error("No saved expedition yet.");
  game.load(deserialize(text));
  scene.updateVisibility(game.party, game.seen);
  scene.focusOn(game.active);
  toast("Saved expedition restored.");
}
init().catch((e) => {
  console.error(e);
  ui.innerHTML = `<div class="loading-screen"><h1>The gate could not open</h1><p>${esc(e.message)}</p></div>`;
});
