import { creationScreen } from "./ui/creation.mjs";
import "./style.css";
import { characterSheet } from "./ui/character.mjs";
import { icon, itemIcon, actionIcon } from "./ui/icons.mjs";
import { ABILITIES, coverage } from "./core/abilities.mjs";
import { FORMATIONS } from "./core/formations.mjs";
import { GameAudio } from "./view/audio.mjs";
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
let toastTimer, modalCleanup;
function closeModal() {
  modalCleanup?.();
  modalCleanup = null;
  modal.replaceChildren();
}
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
  sound = new GameAudio(),
  selectedAction = null,
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
    "conditions",
    "inventory",
    "passive-defenses",
    "development",
    "identity",
    "potions",
    "treatment",
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
      if (game.mode === "exploration" && scene.follow)
        scene.focusOn(
          game.party.find((h) => h.id === game.campaign.order[0]),
          false,
        );
      sound.play("step");
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "attack") {
      scene.attackEffect(data, {
        release: (kind) =>
          sound.play(data.spell ? "spell" : kind === "arrow" ? "bow" : "swing"),
        impact: (kind) =>
          sound.play(
            data.element === "life" && data.damage === 0
              ? "loot"
              : kind === "arrow"
                ? "arrow-hit"
                : "hit",
          ),
      });
    }
    if (type === "combat") {
      sound.play("combat");
      scene.freezePositions();
      selectedAction = null;
      scene.showPath([]);
    }
    if (type === "loot") {
      toast(`Recovered ${data.chest.coins} coins`);
      sound.play("loot");
    }
    if (type === "reaction") reaction(data);
    if (type === "dying") dying(data.hero);
    if (type === "wound") woundReview(data);
    if (type === "turnchoices") turnChoices(data);
    if (type !== "move") {
      if (selectedAction && selectedAction.hero !== game.active.id)
        selectedAction = null;
      render();
    }
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
      e.key === "Escape" &&
      modal.children.length &&
      !game.pendingDefense &&
      !["wound-review"].includes(game.mode) &&
      !game.woundNotices?.length &&
      !(
        game.active.survival.status === "dying" &&
        game.active.survival.due === game.active.survival.ownTurn
      )
    ) {
      closeModal();
      return;
    }
    if (
      modal.children.length ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      attempt(() => game.endTurn());
    }
    if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "i")
      sheet(game.selected);
    if (/^[5-9]$/.test(e.key)) {
      const id = game.active.favorites?.[+e.key - 5];
      if (id) activateAction(id);
    }
    if (/^[1-4]$/.test(e.key)) attempt(() => game.select(Number(e.key) - 1));
    if (e.key.toLowerCase() === "q") scene.rotate(-1);
    if (e.key.toLowerCase() === "e") scene.rotate(1);
    if (e.key.toLowerCase() === "f") scene.focusOn(game.active);
    if (e.key === "Escape") {
      selectedAction = null;
      scene.showPath([]);
      render();
    }
  });
  initialized = true;
  window.__ddd = { game, scene, R, C, sound };
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
  const header = `<div class="topbar"><div class="brand"><img src="/art/greyhaven-seal.png" alt="Greyhaven seal">DEEP DARK DUNGEONS<small>HEROES OF LEGEND</small></div><div class="location"><div class="eyebrow">${town ? "THE LAST LIGHT ABOVE" : "THE DROWNED RELIQUARY"}</div><h2>${town ? "Greyhaven" : `Depth ${c.depth} · The Old Crypt`}</h2></div><div class="top-tools">${button("Save", "save")}${button(sound.muted ? "Sound off" : "Sound on", "sound")}${button("?", "help")}</div></div>`;
  if (town) {
    ui.innerHTML =
      header +
      `<section class="town"><div class="town-copy"><div class="eyebrow">A COMPANY OF FOUR</div><h1>${game.mode === "defeat" ? "The dark<br>remembers." : "Some things<br>should stay<br>buried."}</h1><p class="intro">${game.mode === "defeat" ? "Their expedition ended below. Assemble a new company. What they carried may still be found." : "Below Greyhaven, the old roads descend into a kingdom without a sun. Choose your companions. Bring back what you can."}</p><div class="rule"></div><div class="town-actions">${button(game.mode === "defeat" ? "Assemble a new company" : "Enter the depths", game.mode === "defeat" ? "new-party" : "descend", "BEGIN EXPEDITION", true)}${button("The company register", "roster", "CREATE & RECRUIT")}${button("The provisioner", "shop", "EQUIPMENT & SUPPLIES")}${button("Continue saved expedition", "load", "LOCAL SAVE")}</div><div class="town-status"><div><b>${c.bank}</b><small>Vault coins</small></div><div><b>${c.expeditions}</b><small>Expeditions</small></div><div><b>${c.memorial.length}</b><small>Lost companies</small></div></div><div class="edition">DEVELOPMENT BUILD 0.1 · COMBAT COVERAGE IN PROGRESS</div></div></section><div class="town-party">${game.party.map((h, i) => `<button data-hero="${i}"><strong>${esc(h.name.split(" ")[0])}</strong><small>${esc(className(h))} · ${h.survival.hp} HP</small></button>`).join("")}</div>`;
    if (scene.follow)
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
        )}</aside><div class="bottom ${combat ? "combat-bottom" : ""}"><div class="phase ${combat ? "combat" : ""}">${phase}</div>${combat ? combatDock() : ""}<div class="actionbar">${button("Character", "sheet", "ABILITIES & GEAR")}${button("Formation", "formation", esc(FORMATIONS[c.formation].name))}${combat ? button("Actions", "actions", "CARDS & TARGETS") + button("Move farther", "convert", "MANEUVER → MOVE") + button("End turn", "end", b ? `${b.remaining.main} MAIN · ${b.remaining.maneuver} MANEUVER · ${game.movementLeft()} MOVE` : "SPACE", true) : button("Safe breath", "rest", "RESTORE HP") + button("Return", "extract", "ENTRANCE STAIRS") + button("Descend", "deeper", "FAR STAIRS", true)}</div><div class="hint">${combat ? (selectedAction ? `TARGETING: ${esc(C.choices.find((c) => c.id === selectedAction.id).name)} · Click a target · Esc cancels` : `${esc(h.name)} acts alone · Actions opens learned cards · Right-drag pans`) : "Right-drag to pan · Wheel to zoom · Q / E rotate · F follow · Formation sets marching order"}</div></div>`;
    drawMap();
  }
  bind();
}
function bind() {
  ui.querySelectorAll("[data-hot-action]").forEach(
    (b) => (b.onclick = () => activateAction(b.dataset.hotAction)),
  );
  ui.querySelectorAll("[data-quick-gear]").forEach(
    (b) =>
      (b.onclick = () =>
        attempt(() => {
          const item = game.active.preview.inventory.items.find(
            (i) => i.instanceId === b.dataset.quickGear,
          );
          game.equip(
            game.selected,
            item.instanceId,
            item.held ? "stow" : "ready",
          );
        })),
  );
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
      audioSettings();
      break;
    case "formation":
      formation();
      break;
    case "actions":
      actions();
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
    if (selectedAction) {
      const ally = game.party.find((h) => h.x === p.x && h.z === p.z);
      const target =
        ABILITIES[selectedAction.id].target === "ally" ? ally : enemy;
      game.useAbility(selectedAction.id, target?.id, selectedAction.options);
      selectedAction = null;
      render();
    } else if (enemy) game.attack(enemy.id);
    else game.move(p);
  });
}
function dialog(title, content, footer = "") {
  closeModal();
  modal.innerHTML = `<div class="veil"><section class="dialog" role="dialog" aria-modal="true"><header><div class="eyebrow">DEEP DARK DUNGEONS</div><button class="close" aria-label="Close">×</button></header><h2>${title}</h2>${content}<footer>${footer}</footer></section></div>`;
  modal.querySelector(".close").onclick = () => closeModal();
}
function help() {
  dialog(
    "A light in the dark",
    `<p>Lead four heroes through the crypt. Click the floor to travel together. Sentries stop real-time movement and begin alternating HoL turns.</p><p>Choose heroes with <b>1–4</b>. In combat, click an adjacent sentry for Basic Melee (a held melee weapon) or Basic Unarmed. Click the floor to spend movement; convert a Maneuver for more. <b>Space</b> ends a turn. Right-drag pans, <b>Q / E</b> rotate, mouse wheel zooms, <b>F</b> follows your selected hero. Formation controls marching order outside combat.</p><p>The in-game creator uses the full character-creation catalog. C or I opens your equipment sheet; pin favorites in Abilities, then use them from the combat bar. Combat includes melee/unarmed, ranged ammunition, Cinder Cast, Rime Grip, Hook and Drive, Pinning Shot, Defend, Shield Block, Stabilize and alternating turns. The playable roster is curated: Actions lists supported learned cards. Character sheets mark included, excluded, planned adaptations and cards awaiting review. Wounds use all five tables and apply numerical penalties, conditions and Last Words. Acknowledge the injury, resolve any displacement, and continue. The Journey tab offers matching one-hour wound treatment in Greyhaven. Scars and spent Grit persist.</p><p>Expedition recovery, loot and Greyhaven are game-specific playtest proposals. This is an early playable foundation, not a finished HoL adaptation.</p>`,
  );
}
function roster() {
  dialog(
    "The company register",
    `<p>Recruit from the published examples or build your own hero with the complete in-game HoL creator.</p><div class="catalog-list">${game.party.map((h, i) => `<button data-edit="${i}">${esc(h.name)}<small>${esc(className(h))} · Replace or customize slot ${i + 1}</small></button>`).join("")}</div>`,
  );
  modal
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => workshop(+b.dataset.edit)));
}
function workshop(slot, development = false) {
  closeModal();
  modalCleanup = creationScreen({
    root: modal,
    game,
    scene,
    R,
    C,
    examples,
    slot,
    development,
    close: closeModal,
    attempt,
    toast,
  });
}
function sheet(index) {
  closeModal();
  modalCleanup = characterSheet({
    root: modal,
    game,
    scene,
    C,
    index,
    close: closeModal,
    attempt,
    activate: activateAction,
    train: (i) => workshop(i, true),
  });
}
function activateAction(id) {
  attempt(() => {
    const reason = game.actionReason(id);
    if (reason) throw new Error(reason);
    closeModal();
    if (id === "ability-reduce-a-condition") {
      dialog(
        "Reduce a condition",
        '<p>Choose the aid you will give, then click yourself or an adjacent companion. Reduces one temporary rating; persistent injuries need their printed remedy.</p><div class="catalog-list">' +
          [
            ["bleeding", "Apply pressure"],
            ["burning", "Smother flames"],
            ["freezing", "Warm the affected area"],
          ]
            .map(
              ([id, label]) =>
                `<button data-reduce="${id}">${label}<small>${id} −1 · Main</small></button>`,
            )
            .join("") +
          "</div>",
      );
      modal.querySelectorAll("[data-reduce]").forEach(
        (b) =>
          (b.onclick = () => {
            selectedAction = {
              id,
              hero: game.active.id,
              options: { condition: b.dataset.reduce },
            };
            closeModal();
            render();
          }),
      );
      return;
    }
    if (ABILITIES[id].target === "self") game.useAbility(id);
    else selectedAction = { id, hero: game.active.id };
    render();
  });
}
function combatDock() {
  const h = game.active,
    b = game.encounter.current === h.id ? game.budget : null;
  const cards = (h.favorites ?? [])
    .map((id) => C.choices.find((c) => c.id === id))
    .filter(Boolean);
  return `<div class="combat-dock"><div class="combat-status"><strong>${esc(h.name)}</strong><div class="budget-pips"><span><b>${b?.remaining.main ?? 1}</b> MAIN</span><span><b>${b?.remaining.maneuver ?? 1}</b> MANEUVER</span><span><b>${b?.remaining.reaction ?? 1}</b> REACTION</span><span><b>${game.movementLeft()}</b> MOVE</span></div></div><div class="favorite-bar">${
    cards
      .map((c, i) => {
        const reason = game.actionReason(c.id);
        return `<button class="hot-action ${selectedAction?.id === c.id ? "active" : ""}" data-hot-action="${c.id}" title="${esc(c.name)} · ${ABILITIES[c.id].category}${reason ? " · " + esc(reason) : ""}" aria-label="${esc(c.name)}" ${reason ? "disabled" : ""}><small>${i + 5 <= 9 ? i + 5 : ""}</small>${icon(actionIcon(c.id))}<span>${esc(c.name)}</span></button>`;
      })
      .join("") ||
    '<span class="cost-note">Pin favorite actions from Character → Abilities.</span>'
  }</div><div class="quick-gear"><span>READY / STOW</span>${h.preview.inventory.items
    .filter((i) => i.carried && i.hands)
    .map(
      (i) =>
        `<button class="${i.held ? "readied" : ""}" data-quick-gear="${esc(i.instanceId)}" ${game.gearReason(game.selected, i.instanceId, i.held ? "stow" : "ready") ? "disabled" : ""} title="${esc(game.gearReason(game.selected, i.instanceId, i.held ? "stow" : "ready") || (i.held ? "Stow" : "Ready"))} ${esc(i.definition.name)}">${icon(itemIcon(i))}${i.held ? "✓ " : ""}${esc(i.definition.name.replace("Ordinary ", ""))} · ${game.gearPlan(game.selected, i.instanceId, i.held ? "stow" : "ready").cost} M</button>`,
    )
    .join("")}</div></div>`;
}
function actions() {
  const h = game.active;
  dialog(
    `${esc(h.name)} · Actions`,
    `<p>Choose an action, then click its target in the dungeon. Each card uses its own attribute, range, outcomes and action cost.</p><div class="catalog-list">${game
      .availableActions()
      .map((c) => {
        const a = ABILITIES[c.id];
        return `<button data-card="${c.id}">${esc(c.name)}<small>${a.category.toUpperCase()} · ${a.attribute ?? "No roll"}${a.range ? ` · ${a.range} squares` : " · Self"}</small></button>`;
      })
      .join("")}</div>`,
    '<button id="main-convert">Main → Maneuver</button><button id="stand">Stand · 2 movement</button>',
  );
  modal
    .querySelectorAll("[data-card]")
    .forEach((b) => (b.onclick = () => activateAction(b.dataset.card)));
  modal.querySelector("#main-convert").onclick = () =>
    attempt(() => {
      game.convert("main");
      closeModal();
    });
  modal.querySelector("#stand").onclick = () =>
    attempt(() => {
      game.stand();
      closeModal();
    });
}
function formation() {
  const order = [...game.campaign.order];
  dialog(
    "Marching order",
    `<p>The first hero leads exploration. Formation slots follow the direction of travel and contract around walls. Combat movement always controls one hero.</p><label>Formation <select id="formation-kind">${Object.entries(
      FORMATIONS,
    )
      .map(
        ([id, f]) =>
          `<option value="${id}" ${id === game.campaign.formation ? "selected" : ""}>${f.name}</option>`,
      )
      .join("")}</select></label><div id="marching-list"></div>`,
    '<button id="apply-formation" class="primary">Apply formation</button>',
  );
  const draw = () => {
    modal.querySelector("#marching-list").innerHTML = order
      .map(
        (id, i) =>
          `<div class="order-row"><b>${i + 1}</b><span>${esc(game.party.find((h) => h.id === id).name)}</span><button data-up="${i}" ${i === 0 ? "disabled" : ""}>↑</button><button data-down="${i}" ${i === 3 ? "disabled" : ""}>↓</button></div>`,
      )
      .join("");
    for (const dir of ["up", "down"])
      modal.querySelectorAll(`[data-${dir}]`).forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset[dir],
              j = i + (dir === "up" ? -1 : 1);
            [order[i], order[j]] = [order[j], order[i]];
            draw();
          }),
      );
  };
  draw();
  modal.querySelector("#apply-formation").onclick = () =>
    attempt(() => {
      game.setFormation(modal.querySelector("#formation-kind").value, order);
      closeModal();
    });
}
function reaction({ hero, enemy }) {
  dialog(
    "Shield Block?",
    `<p>${esc(enemy.name)} attacks ${esc(hero.name)}. Spend their Reaction for +1 defense Boon until their next turn. This stacks with Defend.</p>`,
    '<button id="skip-block">Keep Reaction</button><button id="use-block" class="primary">Shield Block</button>',
  );
  modal.querySelector(".close").onclick = () =>
    toast("Resolve the pending attack to continue.");
  for (const [id, block] of [
    ["skip-block", false],
    ["use-block", true],
  ])
    modal.querySelector(`#${id}`).onclick = () =>
      attempt(() => {
        closeModal();
        game.resolveReaction(block);
      });
}
function audioSettings() {
  dialog(
    "Sound",
    `<p>Original ambient wind, footsteps, impacts and spell tones.</p><label>Master volume <input id="volume" type="range" min="0" max="1" step="0.05" value="${sound.volume}"></label><p id="audio-status">${sound.context?.state ?? "Waiting for a click"}</p>`,
    '<button id="mute-sound">Toggle mute</button><button id="test-sound" class="primary">Play test sound</button>',
  );
  modal.querySelector("#volume").oninput = (e) =>
    sound.setVolume(e.target.value);
  modal.querySelector("#mute-sound").onclick = () => {
    sound.toggle();
    render();
    modal.querySelector("#audio-status").textContent = sound.muted
      ? "Muted"
      : "Sound enabled";
  };
  modal.querySelector("#test-sound").onclick = () =>
    attempt(async () => {
      await sound.unlock();
      sound.play("loot");
      modal.querySelector("#audio-status").textContent = sound.muted
        ? "Muted — toggle mute to hear audio"
        : `Audio ${sound.context.state} · volume ${Math.round(sound.volume * 100)}%`;
    });
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
  modal.querySelector(".close").onclick = () =>
    toast("Resolve the Dying choice to continue.");
  for (const [id, kind] of [
    ["death-roll", "roll"],
    ["grit", "grit"],
  ])
    modal.querySelector("#" + id).onclick = () =>
      attempt(() => {
        game.survivalChoice(kind);
        closeModal();
      });
}
function turnChoices({ hero, count }) {
  dialog(
    `${esc(hero.name)} · Retained actions`,
    `<p>Dazed / Grappled leaves ${count} action categories this turn. Movement follows its separate restrictions.</p><div class="catalog-list">${["main", "maneuver", "reaction"].map((c) => `<label><input type="checkbox" name="retained" value="${c}"> ${c}</label>`).join("")}</div>`,
    '<button id="retain-actions" class="primary">Begin turn</button>',
  );
  modal.querySelector("#retain-actions").onclick = () =>
    attempt(() => {
      const chosen = [
        ...modal.querySelectorAll('[name="retained"]:checked'),
      ].map((e) => e.value);
      if (chosen.length !== count)
        throw new Error(`Choose ${count} categories.`);
      closeModal();
      game.beginHero(chosen);
    });
}
function woundReview({ hero, wound }) {
  const forced = wound.effects.filter((e) => e.kind === "forcedMovement");
  dialog(
    "A lasting wound",
    `<p><b>${esc(hero.name)} · ${esc(wound.record.injury)}</b></p><p>${esc(wound.record.remedy)}</p><div class="condition-tags">${wound.effects.map((e) => `<span>${esc(e.kind === "condition" ? `${e.key} ${e.rating}${e.persistence === "starred" ? "*" : ""}` : e.kind === "movementPenalty" ? `Movement −${e.amount}` : e.kind === "rollModifier" ? `${e.amount} ${e.polarity}: ${e.context}` : e.kind === "forcedMovement" ? `${e.direction} ${e.distance}` : "Last Words")}</span>`).join("")}</div>${
      forced.length
        ? '<p>Select displacement direction on the dungeon grid. Walls and creatures resolve collision damage and Stability.</p><select id="wound-direction"><option value="">Choose direction…</option>' +
          [
            [0, -1, "North"],
            [1, -1, "Northeast"],
            [1, 0, "East"],
            [1, 1, "Southeast"],
            [0, 1, "South"],
            [-1, 1, "Southwest"],
            [-1, 0, "West"],
            [-1, -1, "Northwest"],
          ]
            .map(([x, z, n]) => `<option value="${x},${z}">${n}</option>`)
            .join("") +
          "</select>"
        : ""
    }<p class="muted">The scar and accumulated wound count remain after treatment. Physical and mental penalties apply to their corresponding attributes.</p>`,
    '<button id="acknowledge-wound" class="primary">Continue</button>',
  );
  modal.querySelector(".close").onclick = () =>
    toast("Acknowledge this wound before continuing.");
  modal.querySelector("#acknowledge-wound").onclick = () =>
    attempt(() => {
      const value = modal.querySelector("#wound-direction")?.value;
      if (forced.length && !value)
        throw new Error("Choose the displacement direction.");
      const [x, z] = (value ?? "0,0").split(",").map(Number);
      closeModal();
      game.acknowledgeWound({ x, z });
    });
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
