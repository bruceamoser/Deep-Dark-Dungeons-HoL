import { gameCatalog, POWERS } from "./core/powers.mjs";
import { workshopScreen } from "./ui/workshop.mjs";
import { campScreen } from "./ui/camp.mjs";
import { SaveLibrary, browserSaveStorage } from "./core/save-library.mjs";
import { runsScreen } from "./ui/runs.mjs";
import { bestiaryScreen } from "./ui/bestiary.mjs";
import { marketScreen } from "./ui/market.mjs";
import { lootScreen } from "./ui/treasure.mjs";
import { abilityType } from "./ui/book-symbols.mjs";
import { rosterScreen } from "./ui/roster.mjs";
import { xpMeter } from "./ui/experience.mjs";
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
let toastTimer, modalCleanup, updateStatus;
function closeModal() {
  modalCleanup?.();
  modalCleanup = null;
  modal.replaceChildren();
  scene?.highlightInteraction(null);
  document.querySelector("#world-hint").hidden = true;
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
  savedFallen = 0,
  initialized = false,
  runsOpen = false,
  runsBusy = false,
  library;
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
  const [choices, inventory, wounds, party, creatures] = await Promise.all(
    ["choices", "inventory", "wounds", "party", "creatures"].map(load),
  );
  C = gameCatalog({
    choices: choices.records,
    inventory,
    creatures,
    wounds,
    commit: choices.sourceCommit,
  });
  examples = party;
  game = new Game(R, C, toast);
  scene = new Scene(
    document.querySelector("#world"),
    clickTile,
    (p, id, event) => {
      const hint = document.querySelector("#world-hint");
      const item =
        p &&
        !modal.children.length &&
        !selectedAction &&
        ["exploration", "combat"].includes(game.mode) &&
        game.worldInteractions().find((i) => i.id === id);
      scene.highlightInteraction(item ? id : null);
      if (
        selectedAction &&
        POWERS[selectedAction.id] &&
        p &&
        !modal.children.length
      ) {
        const spec = game.powerSpec(selectedAction.id),
          unit =
            spec.target === "enemy"
              ? game.enemies.find(
                  (e) => e.id === id?.slice(9) || (e.x === p.x && e.z === p.z),
                )
              : game.party.find((h) => h.x === p.x && h.z === p.z);
        let target = document.querySelector("#power-target-hint");
        if (!target) {
          target = document.createElement("div");
          target.id = "power-target-hint";
          document.body.append(target);
        }
        try {
          const plan = game.powerPlan(
            spec.id,
            spec.target === "ground"
              ? p
              : spec.target === "self"
                ? game.active.id
                : unit?.id,
          );
          scene.showPowerTarget(plan);
          target.className = "power-target-hint";
          target.innerHTML = `<b>${esc(spec.name)}</b><small>${esc(plan.recipients.map((p) => p.name).join(", ") || `${plan.cells.length} affected squares`)} · ${spec.effects.some((e) => e.kind === "zone") ? "Persistent surfaces affect both sides" : "Allies spared by hostile effects"}</small>`;
        } catch (error) {
          scene.showPowerTarget({ cells: [p] }, false);
          target.className = "power-target-hint invalid";
          target.textContent = error.message;
        }
        scene.showPath([]);
        hint.hidden = true;
        return;
      }
      const creature = id?.startsWith("creature:")
        ? game.enemies.find((e) => e.id === id.slice(9))
        : null;
      hint.hidden = !item && !creature;
      if (item) {
        hint.innerHTML = `<strong>${esc(item.name)}</strong><small>CLICK TO INTERACT</small>`;
        hint.style.left = `${Math.min(innerWidth - 250, event.clientX + 18)}px`;
        hint.style.top = `${Math.max(12, Math.min(innerHeight - 75, event.clientY - 65))}px`;
      } else if (creature && !modal.children.length) {
        hint.innerHTML = `<strong>${esc(creature.name)}${creature.boss ? " · GUARDIAN" : ""}</strong><small>${creature.hp}/${creature.maxHp} HP · CV ${creature.cv ?? 8} · SHIFT-CLICK TO INSPECT</small>`;
        hint.style.left = `${Math.min(innerWidth - 300, event.clientX + 18)}px`;
        hint.style.top = `${Math.max(12, event.clientY - 65)}px`;
      } else if (p && !modal.children.length && game.mode !== "town") {
        scene.showPath(game.route(p));
        if (game.mode === "combat" && !selectedAction) {
          const cell = scene.movementCells?.get(`${p.x},${p.z}`);
          hint.hidden = false;
          hint.innerHTML = `<strong>${cell?.canEnd ? `Move · ${cell.cost} / ${game.movementLeft()}` : cell ? "Companion · pass through only" : "Outside movement range"}</strong><small>TEAL: REACHABLE · GOLD: LAST MOVEMENT</small>`;
          hint.style.left = `${Math.min(innerWidth - 280, event.clientX + 18)}px`;
          hint.style.top = `${Math.max(12, event.clientY - 65)}px`;
        }
      } else {
        scene.showPath([]);
        if (!p) {
          scene.showPowerTarget(null);
          document.querySelector("#power-target-hint")?.remove();
        }
      }
    },
  );
  await scene.load();
  game.listeners.push((type, data) => {
    if (type === "feedback") scene.floatingText(data);
    if (["time", "light", "change", "battlefield"].includes(type) && scene.map)
      scene.updateVisibility(game.party, game.seen);
    if (type === "supply") queueMicrotask(showSupplyNotice);
    if (type === "floor") {
      scene.clearBattlefield();
      scene.clearFloatingText();
      scene.tilesDetail = [];
      scene.build(game.map);
      scene.syncInteractions(game.worldInteractions());
      scene.resetEntities(game.party, game.enemies);
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "party") {
      scene.syncInteractions(game.worldInteractions());
      scene.resetEntities(game.party, game.enemies);
      scene.updateVisibility(game.party, game.seen);
    }
    if (type === "move") {
      scene.queueMovement(data?.steps ?? []);
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
      scene.highlightInteraction(null);
      scene.syncInteractions(game.worldInteractions());
      scene.updateVisibility(game.party, game.seen);
      toast(data.message ?? "Treasure recovered");
      sound.play("loot");
    }
    if (!runsOpen && type === "reaction") reaction(data);
    if (!runsOpen && type === "opportunity") opportunity(data);
    if (!runsOpen && type === "dying") dying(data.hero);
    if (!runsOpen && type === "wound") woundReview(data);
    if (!runsOpen && type === "turnchoices") turnChoices(data);
    if (type === "level-ready")
      toast(
        `${data.hero.name} earned level ${data.level}! Return to Greyhaven and choose Level up on their sheet.`,
      );
    if (type === "xp") {
      const ready = game.party.filter(
        (h) => h.earnedLevel > h.preview.state.level,
      );
      toast(
        `+${data.amount} XP each · ${data.reason}${ready.length ? " · LEVEL UP AVAILABLE — train in Greyhaven" : ""}`,
      );
    }
    if (type === "interact-ready") worldMenu(data.id);
    if (
      selectedAction &&
      ((game.mode !== "combat" && !POWERS[selectedAction.id]?.field) ||
        (game.mode === "combat" && game.encounter.nextSide !== "players") ||
        selectedAction.hero !== game.active.id ||
        selectedAction.round !== game.encounter?.round ||
        selectedAction.serial !== game.encounter?.serial ||
        game.actionReason(selectedAction.id))
    ) {
      selectedAction = null;
      scene.showPowerTarget(null);
      scene.showPath([]);
    }
    if (
      type !== "move" ||
      (game.mode === "combat" && !game.paths.get(game.active.id)?.length)
    )
      render();
    scheduleSave();
  });
  library = new SaveLibrary(
    window.desktop?.saves ?? browserSaveStorage(localStorage),
  );
  await library.initialize();
  const saved = library.active ? await library.read(library.active) : null;
  if (saved) game.load(deserialize(saved));
  else {
    game.fresh(startingDrafts());
    if (library.firstLaunch)
      await library.create("The first company", serialize(game.snapshot()));
  }
  // Demo starts from legal published characters, never randomized partial builds.
  scene.updateVisibility(game.party, game.seen);
  render();
  showSupplyNotice();
  setInterval(() => {
    if (!modal.children.length) game.step();
  }, 170);
  document.addEventListener("keydown", (e) => {
    if (supplyDialog) return;
    if (e.key === "Escape" && runsOpen) {
      e.preventDefault();
      if (library.active && !runsBusy) resumeRun();
      return;
    }
    if (runsOpen) return;
    if (
      e.key === "Escape" &&
      (game.pendingDefense ||
        game.pendingProvocation ||
        game.woundNotices?.length ||
        (game.mode === "combat" && game.active.survival.status === "dying"))
    ) {
      e.preventDefault();
      attempt(openRuns);
      return;
    }
    if (
      e.key === "Escape" &&
      modal.children.length &&
      !game.pendingDefense &&
      !game.pendingProvocation &&
      !["wound-review"].includes(game.mode) &&
      !game.woundNotices?.length &&
      !(
        game.active.survival.status === "dying" &&
        game.active.survival.due === game.active.survival.ownTurn
      )
    ) {
      closeModal();
      cancelTargeting();
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
    if (e.key.toLowerCase() === "g") {
      scene.gridEnabled = !scene.gridEnabled;
      scene.updateTacticalGrid(game, {
        targeting: !!selectedAction,
        force: true,
      });
      toast(
        scene.gridEnabled
          ? "Exploration grid on · combat grid is always visible"
          : "Exploration grid off · combat grid is always visible",
      );
    }
    if (e.key === "Escape") {
      if (selectedAction) cancelTargeting();
      else attempt(openRuns);
    }
  });
  initialized = true;
  window.desktop?.onClose(() =>
    attempt(async () => {
      game.pause();
      try {
        await save();
        window.desktop.close();
      } catch (error) {
        window.desktop.cancelClose(error.message);
        if (!runsOpen) game.resume();
        throw error;
      }
    }),
  );
  if (window.desktop?.updates) {
    window.desktop.updates.subscribe(receiveUpdateStatus);
    receiveUpdateStatus(await window.desktop.updates.status());
  }
  if (!library.active) await openRuns();
  window.__ddd = {
    game,
    scene,
    R,
    C,
    sound,
    library,
    get selectedAction() {
      return selectedAction;
    },
  };
}
function className(h) {
  return C.choices.find((c) => c.id === h.draft.classId)?.name ?? "Adventurer";
}
function button(label, action, sub = "", primary = false) {
  return `<button data-action="${action}" class="${primary ? "primary" : ""}">${label}${sub ? `<small>${sub}</small>` : ""}</button>`;
}
function render() {
  if (!selectedAction) document.querySelector("#power-target-hint")?.remove();
  if (scene?.map && game?.map)
    scene.updateTacticalGrid(game, { targeting: !!selectedAction });
  if (!game?.campaign) return;
  const town = ["town", "defeat"].includes(game.mode),
    h = game.active,
    c = game.campaign;
  const header = `<div class="topbar"><div class="brand"><img src="/art/greyhaven-seal.png" alt="Greyhaven seal">DEEP DARK DUNGEONS<small>HEROES OF LEGEND</small></div><div class="location"><div class="eyebrow">${town ? "THE LAST LIGHT ABOVE" : "THE DROWNED RELIQUARY"}</div><h2>${town ? "Greyhaven" : `Depth ${c.depth} · ${c.depth % 5 === 0 ? "Guardian’s Domain" : "The Old Crypt"}`}</h2></div><div class="top-tools">${button(`Day ${game.clock().day} · ${String(game.clock().hour).padStart(2, "0")}:${String(game.clock().minute).padStart(2, "0")}`, "camp", "CAMP & SUPPLIES")}${button("Bestiary", "bestiary")}${button("Save", "save")}${button("Runs", "runs")}${window.desktop?.updates ? button(updateStatus?.phase === "downloaded" ? "Update ready" : "Updates", "updates") : ""}${button(sound.muted ? "Sound off" : "Sound on", "sound")}${button("?", "help")}</div></div>`;
  if (town) {
    ui.innerHTML =
      header +
      `<section class="town"><div class="town-copy"><div class="eyebrow">A COMPANY OF FOUR</div><h1>${game.mode === "defeat" ? "The dark<br>remembers." : "Some things<br>should stay<br>buried."}</h1><p class="intro">${game.mode === "defeat" ? "Their expedition ended below. Assemble a new company. What they carried may still be found." : "Below Greyhaven, the old roads descend into a kingdom without a sun. Choose your companions. Bring back what you can."}</p><div class="rule"></div><div class="town-actions">${button(game.mode === "defeat" ? "Assemble a new company" : game.campaign.returnPassage ? `Return to depth ${game.campaign.returnPassage.depth}` : "Enter the depths", game.mode === "defeat" ? "new-party" : "descend", "BEGIN EXPEDITION", true)}${button("The company register", "roster", "HEROES & PARTY")}${button("Hall of Fallen Heroes", "fallen", "REMEMBER THEIR NAMES")}${button("The market quarter", "shop", "EQUIPMENT & SUPPLIES")}${button("Training & builds", "training", "LEVEL UP & SPECIALIZE")}${button("The workshop", "workshop", "DOWNTIME CRAFTING")}${button("Camp & supplies", "camp", "REST & PROVISIONS")}${button("Saved journeys", "runs", "RUNS & CHECKPOINTS")}</div><div class="town-status"><div><b>${c.bank}</b><small>Vault coins</small></div><div><b>${c.expeditions}</b><small>Expeditions</small></div><div><b>${c.fallenHeroes.length}</b><small>Fallen heroes</small></div></div><div class="edition">EARLY PLAYABLE · COMBAT COVERAGE IN PROGRESS</div></div></section><div class="town-party">${game.party.map((h, i) => `<button data-hero="${i}"><strong>${esc(h.name.split(" ")[0])}</strong><small>${esc(className(h))} · ${h.survival.hp} HP</small>${xpMeter(h, true)}</button>`).join("")}</div>`;
    if (scene.follow)
      scene.focusOn({ x: game.map.start.x - 3, z: game.map.start.z + 1 });
  } else {
    const combat = game.mode === "combat",
      b = game.budget;
    const heroState = (p) => {
      if (!combat) return "";
      if (game.encounter.current === p.id) return "ACTING";
      if (game.encounter.acted.includes(p.id)) return "ACTED";
      return "READY";
    };
    const selectable = (p) =>
      !combat ||
      (!game.busy &&
        game.encounter.nextSide === "players" &&
        (game.encounter.current
          ? game.encounter.current === p.id
          : game.R.availableParticipants(game.encounter).some(
              (a) => a.id === p.id,
            )));
    let phase = combat
      ? `ROUND ${game.encounter.round} · ${game.encounter.nextSide === "players" ? "YOUR COMPANY" : "OPPOSITION"}`
      : game.mode === "wound-review"
        ? "INJURY · INTEGRATION PAUSE"
        : "REAL-TIME EXPLORATION";
    ui.innerHTML =
      header +
      `<div class="hero-panel">${game.party.map((p, i) => `<button class="hero-card ${i === game.selected && (!combat || game.encounter.nextSide === "players") ? "active" : ""}" data-select="${i}" ${selectable(p) ? "" : "disabled"} aria-label="${esc(p.name)}${combat ? " · " + heroState(p) : ""}"><span class="number">0${i + 1}</span><div style="flex:1"><h3>${esc(p.name)}</h3><div class="class">${esc(className(p))} · ${p.survival.status}${combat ? ` <b class="hero-turn-state">${heroState(p)}</b>` : ""}</div><div class="bar"><span style="width:${(p.survival.hp / p.survival.maxHp) * 100}%"></span></div><div class="vitals"><span>${p.survival.hp} / ${p.survival.maxHp} HP</span><span>${p.survival.gritAvailable} GRIT</span></div>${xpMeter(p, true)}</div></button>`).join("")}<div class="party-hint">1–4 SELECT · CLICK GROUND TO MOVE</div></div><div class="compass">N<b>◇</b>Q ↶ &nbsp; ↷ E</div><div class="minimap"><canvas id="map" width="155" height="155"></canvas><footer>${c.haul} COINS IN THE PACK${c.pendingTreasureXP ? `<small>+${c.pendingTreasureXP} XP EACH ON RETURN</small>` : ""}</footer></div><aside class="eventlog"><div class="eyebrow">EXPEDITION JOURNAL</div>${game.log
        .slice(-4)
        .map((l) => `<p>${esc(l)}</p>`)
        .join(
          "",
        )}</aside><div class="bottom ${combat ? "combat-bottom" : ""}"><div class="phase ${combat ? "combat" : ""}">${phase}</div>${combat ? combatDock() : ""}<div class="actionbar">${button("Character", "sheet", "ABILITIES & GEAR")}${button("Formation", "formation", esc(FORMATIONS[c.formation].name))}${combat ? button("Actions", "actions", "CARDS & TARGETS") + button("Move farther", "convert", "MANEUVER → MOVE") + button("End turn", "end", b ? `${b.remaining.main} MAIN · ${b.remaining.maneuver} MANEUVER · ${game.movementLeft()} MOVE` : "SPACE", true) : button("Recipes", "workshop", "CRAFT & REPLENISH") + button("Safe breath", "rest", "RESTORE HP") + button("Return", "extract", "ENTRANCE STAIRS") + button("Descend", "deeper", "FAR STAIRS", true)}</div><div class="hint">${combat ? (selectedAction ? `TARGETING: ${esc(C.choices.find((c) => c.id === selectedAction.id).name)} · Click a target · Esc cancels` : `${esc(h.name)} acts alone · Teal squares: movement range · Gold: last movement · Right-drag pans`) : "Right-drag to pan · Wheel to zoom · Q / E rotate · F follow · G grid · Formation sets marching order"}</div></div>`;
    drawMap();
  }
  bind();
}
function bind() {
  if (game.mode === "combat") {
    for (const kind of ["end", "convert"]) {
      const control = ui.querySelector(`[data-action="${kind}"]`);
      if (control)
        control.disabled =
          game.busy ||
          game.encounter.nextSide !== "players" ||
          !!game.paths.get(game.active.id)?.length;
    }
  }
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
    case "runs":
      return openRuns();
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
    case "fallen":
      roster({ hall: true });
      break;
    case "bestiary":
      closeModal();
      bestiaryScreen({ root: modal, game, close: closeModal });
      break;
    case "training":
      sheet(game.selected);
      modal.querySelector('[data-tab="build"]')?.click();
      break;
    case "workshop":
      closeModal();
      workshopScreen({ root: modal, game, close: closeModal, attempt });
      break;
    case "camp":
      closeModal();
      modalCleanup = campScreen({
        root: modal,
        game,
        close: closeModal,
        attempt,
      });
      break;
    case "shop":
      shop();
      break;
    case "help":
      help();
      break;
    case "updates":
      updatesScreen();
      break;
    case "sheet":
      sheet(game.selected);
      break;
    case "cancel-target":
      cancelTargeting();
      break;
    case "confirm-self":
      commitTarget(game.active.id);
      break;
    case "end":
      cancelTargeting(false);
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
      game.returnAfterDefeat();
      roster();
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
  for (const item of game.worldInteractions())
    if (
      ["coffer", "cache"].includes(item.kind) &&
      item.available &&
      game.map.knownInteractions?.[item.id]
    ) {
      ctx.fillStyle = "#dcb777";
      ctx.fillRect(item.x * scale, item.z * scale, 3, 3);
    }
  for (const h of game.party) {
    ctx.fillStyle = h === game.active ? "#e5c180" : "#83bab1";
    ctx.fillRect(h.x * scale - 1, h.z * scale - 1, 4, 4);
  }
  ctx.fillStyle = "#b99860";
  ctx.fillRect(game.map.start.x * scale, game.map.start.z * scale, 3, 3);
  if (
    game.seen[key(game.map.exit.x, game.map.exit.z)] ||
    game.party.some(
      (h) => game.canAct(h) && game.traits(h).some((t) => t.stairs),
    )
  ) {
    ctx.fillStyle = "#78ead3";
    ctx.fillText("▼", game.map.exit.x * scale - 3, game.map.exit.z * scale + 4);
  }
}
function clickTile(p, interactionId, event) {
  if (modal.children.length) return;
  attempt(() => {
    const enemy = game.enemies.find(
      (e) =>
        e.hp > 0 &&
        (interactionId === `creature:${e.id}` || (e.x === p.x && e.z === p.z)),
    );
    if (enemy && event?.shiftKey) {
      closeModal();
      bestiaryScreen({
        root: modal,
        game,
        close: closeModal,
        selectedId: enemy.type,
      });
      return;
    }
    if (selectedAction) {
      const ally = game.party.find((h) => h.x === p.x && h.z === p.z);
      const type = (
        game.powerSpec(selectedAction.id) ?? ABILITIES[selectedAction.id]
      ).target;
      if (type === "ground") {
        commitTarget(p);
        return;
      }
      const target = type === "enemy" ? enemy : ally;
      if (!target || (type === "self" && target.id !== game.active.id))
        throw new Error(
          type === "enemy"
            ? "Choose a living enemy, or cancel to move."
            : type === "self"
              ? "Click the acting hero or Use on self."
              : "Choose a companion, or cancel to move.",
        );
      commitTarget(target.id);
    } else if (enemy) game.attack(enemy.id);
    else if (interactionId) worldMenu(interactionId, event);
    else game.move(p);
  });
}
function worldMenu(id, event) {
  const item = game.worldInteractions().find((i) => i.id === id);
  if (!item) return;
  closeModal();
  game.paths.clear();
  game.pendingInteraction = null;
  scene.showPath([]);
  scene.highlightInteraction(id);
  document.querySelector("#world-hint").hidden = true;
  const reason = game.interactionReason(item);
  const canApproach =
    game.mode === "exploration" && !game.busy && !game.interactionNear(item);
  modal.innerHTML = `<div class="interaction-scrim"><section class="world-menu" role="dialog" aria-label="${esc(item.name)}"><header><span class="eyebrow">${item.kind === "cache" ? "LOST EXPEDITION" : item.kind === "coffer" ? "TREASURE" : "PASSAGE"}</span><h3>${esc(item.name)}</h3></header><div class="world-menu-options"><button data-world-option="use" ${reason ? "disabled" : ""}>${icon(item.kind === "coffer" || item.kind === "cache" ? "pack" : "arrow")}<span>${esc(item.action)}<small>${esc(reason || (item.coins !== undefined ? `${item.coins} coins · Company haul` : "Travel with the company"))}</small></span></button>${canApproach ? `<button data-world-option="approach">${icon("boot")}<span>Approach<small>Walk closer and reopen this menu</small></span></button>` : ""}<button data-world-option="inspect">${icon("book")}<span>Inspect<small>Examine this object</small></span></button><div class="world-description" hidden>${esc(item.description)}</div><button data-world-option="leave">${icon("close")}<span>Leave<small>ESC · Return to the dungeon</small></span></button></div></section></div>`;
  const menu = modal.querySelector(".world-menu");
  menu.style.left = `${Math.max(12, Math.min(innerWidth - 352, event?.clientX ?? innerWidth / 2 - 170))}px`;
  menu.style.top = `${Math.max(12, Math.min(innerHeight - 460, event?.clientY ?? innerHeight / 2 - 170))}px`;
  modal.querySelector(".interaction-scrim").onclick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };
  modal.querySelectorAll("[data-world-option]").forEach(
    (b) =>
      (b.onclick = () =>
        attempt(() => {
          if (b.dataset.worldOption === "inspect") {
            menu.querySelector(".world-description").hidden = false;
            return;
          }
          if (b.dataset.worldOption === "use") {
            game.interact(id);
            if (item.source?.items?.length) {
              closeModal();
              lootScreen({ root: modal, game, id, close: closeModal, attempt });
              return;
            }
          }
          closeModal();
          scene.highlightInteraction(null);
          if (b.dataset.worldOption === "approach")
            game.approachInteraction(id);
        })),
  );
  menu.querySelector("button:not(:disabled)").focus();
}
function dialog(title, content, footer = "") {
  closeModal();
  modal.innerHTML = `<div class="veil"><section class="dialog" role="dialog" aria-modal="true"><header><div class="eyebrow">DEEP DARK DUNGEONS</div><button class="close" aria-label="Close">×</button></header><h2>${title}</h2>${content}<footer>${footer}</footer></section></div>`;
  modal.querySelector(".close").onclick = () => closeModal();
}
function help() {
  dialog(
    "A light in the dark",
    `<p>Lead four heroes through the crypt. Click the floor to travel together. Nearby creatures start alternating HoL turns. Choose heroes with <b>1–4</b>; only the acting hero moves in combat.</p><p><b>Right-drag</b> grabs and pans the ground, <b>wheel</b> zooms, <b>Q / E</b> rotate, and <b>F</b> follows. <b>G</b> toggles exploration squares; combat always shows the tactical grid. Teal squares are reachable with your remaining movement; gold squares use the last of it. Hover a square for its cost. Allies allow passage but cannot be endpoints.</p><p><b>C / I</b> opens your hero. Ready weapons and armor in Equipment, pin favorite powers in Abilities, and customize individual looks in Appearance while in town. In combat, choose a power then its target; Escape cancels freely. Ground powers preview their affected squares. Instant area strikes spare allies; persistent fire and hazards affect both sides. Strongest matching power buffs and debuffs apply; extra actions and healing have limits.</p><p>HP healing, stabilization and wound treatment are separate. Journey shows camp supplies or infirmary prices for treatment. Scars, wound count and spent Grit persist. The <b>recipe book</b> lets you learn, craft, or replenish supplies using prepared batches. Crafting and treatment advance time; food, water, torches and sleep matter.</p><p><b>Runs</b> pauses and saves. Name journeys, keep separate checkpoints, or delete old saves after confirmation. Save &amp; exit returns to the library. Escape reaches it during a combat decision. The company register holds reserve heroes and the fallen hall. XP comes from exploration, encounters and recovered treasure; train in town. Six merchants supply the expedition, a Scroll of Return opens a two-way passage, and every fifth floor has a guardian.</p><p>HoL supplies the base mechanics. This game's powers, recipes, simplified treatment and dungeon progression are explicit computer-game adaptations.</p>`,
  );
}
function roster(options = {}) {
  closeModal();
  modalCleanup = rosterScreen({
    root: modal,
    game,
    scene,
    C,
    close: closeModal,
    create: (slot) => workshop(slot),
    attempt,
    ...options,
  });
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
    onCreated: async (heroId) => {
      await save(false);
      roster({ slot, selection: heroId });
    },
  });
}
function sheet(index) {
  cancelTargeting();
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
function cancelTargeting(refresh = true) {
  selectedAction = null;
  document.querySelector("#power-target-hint")?.remove();
  scene.showPowerTarget(null);
  scene.showPath([]);
  if (refresh) render();
}
function selectAction(id, options) {
  selectedAction = {
    id,
    options,
    hero: game.active.id,
    round: game.encounter?.round,
    serial: game.encounter?.serial,
  };
  scene.showPath([]);
  render();
}
function commitTarget(targetId) {
  if (!selectedAction) return;
  const selection = selectedAction;
  const reason = game.actionReason(selection.id);
  if (reason) throw new Error(reason);
  game.useAbility(selection.id, targetId, selection.options);
  cancelTargeting();
}
function activateAction(id) {
  attempt(() => {
    if (selectedAction?.id === id) {
      closeModal();
      cancelTargeting();
      return;
    }
    const reason = game.actionReason(id);
    if (reason) throw new Error(reason);
    closeModal();
    cancelTargeting(false);
    if (
      id === "ability-lantern-in-the-palm" ||
      (ABILITIES[id]?.exploration && game.mode === "exploration")
    ) {
      game.useAbility(id);
      return;
    }
    if (POWERS[id]?.field && game.mode !== "combat") {
      if (POWERS[id].target === "self") {
        game.useAbility(id, game.active.id);
        return;
      }
      if (game.mode === "town" && POWERS[id].target === "ally") {
        dialog(
          POWERS[id].name,
          `<p>${esc(POWERS[id].description)}</p><div class="catalog-list">${game.party.map((h) => `<button data-field-target="${h.id}">${esc(h.name)} · ${h.survival.hp}/${h.survival.maxHp} HP</button>`).join("")}</div>`,
        );
        modal.querySelectorAll("[data-field-target]").forEach(
          (b) =>
            (b.onclick = () =>
              attempt(() => {
                game.useAbility(id, b.dataset.fieldTarget);
                closeModal();
              })),
        );
        return;
      }
    }
    if (id === "ability-reduce-a-condition") {
      dialog(
        "Reduce a condition",
        '<p>Choose the aid you will give, then click yourself or an adjacent companion.</p><div class="catalog-list">' +
          [
            ["bleeding", "Apply pressure"],
            ["burning", "Smother flames"],
            ["freezing", "Warm the affected area"],
          ]
            .map(
              ([key, label]) =>
                `<button data-reduce="${key}">${label}<small>${key} −1 · Main</small></button>`,
            )
            .join("") +
          "</div>",
      );
      modal.querySelectorAll("[data-reduce]").forEach(
        (b) =>
          (b.onclick = () => {
            closeModal();
            selectAction(id, { condition: b.dataset.reduce });
          }),
      );
      render();
      return;
    }
    selectAction(id);
  });
}
function combatDock() {
  const h = game.active,
    b = game.encounter.current === h.id ? game.budget : null;
  const cards = (h.favorites ?? [])
    .map((id) => C.choices.find((c) => c.id === id))
    .filter(Boolean);
  const targeting = selectedAction
    ? `<div class="targeting-tray" role="status"><div><span class="eyebrow">READY TO USE · NO COST SPENT</span><strong>${esc(C.choices.find((c) => c.id === selectedAction.id)?.name)}</strong><small>${(game.powerSpec(selectedAction.id) ?? ABILITIES[selectedAction.id]).target === "self" ? "Use on yourself, or choose a different action." : "Click a target, or select another action to switch."}</small></div>${(game.powerSpec(selectedAction.id) ?? ABILITIES[selectedAction.id]).target === "self" ? button("Use on self", "confirm-self", "CONFIRM", true) : ""}${button("Cancel", "cancel-target", "ESC · RETURN TO MOVEMENT")}</div>`
    : "";
  return `<div class="combat-dock">${targeting}<div class="combat-status"><strong>${game.encounter.nextSide === "players" ? esc(h.name) : "Opposition is acting"}</strong><div class="budget-pips">${game.encounter.nextSide === "players" ? `<span><b>${b?.remaining.main ?? 1}</b> MAIN</span><span><b>${b?.remaining.maneuver ?? 1}</b> MANEUVER</span><span><b>${b?.remaining.reaction ?? 1}</b> REACTION</span><span><b>${game.movementLeft()}</b> MOVE</span>` : "<span>WAIT FOR YOUR COMPANY</span>"}</div></div><div class="favorite-bar">${
    cards
      .map((c, i) => {
        const reason = game.actionReason(c.id);
        return `<button class="hot-action ${selectedAction?.id === c.id ? "active" : ""}" data-hot-action="${c.id}" title="${esc(c.name)} · ${(game.powerSpec(c.id) ?? ABILITIES[c.id]).category}${reason ? " · " + esc(reason) : ""}" aria-label="${esc(c.name)}" ${reason ? "disabled" : ""}><small>${i + 5 <= 9 ? i + 5 : ""}</small>${icon(actionIcon(c.id))}${abilityType(c, game.powerSpec(c.id) ?? ABILITIES[c.id])}<span>${esc(c.name)}</span></button>`;
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
        const a = game.powerSpec(c.id) ?? ABILITIES[c.id];
        const reason = game.actionReason(c.id);
        return `<button data-card="${c.id}" title="${esc(coverage(c.id).reason)}" class="action-choice ${selectedAction?.id === c.id ? "chosen" : ""}" ${reason ? "disabled" : ""}>${abilityType(c, game.powerSpec(c.id) ?? ABILITIES[c.id])}<span>${esc(c.name)}<small>${reason ? esc(reason) : `${a.attribute ?? "No roll"}${a.range ? ` · ${a.range} squares` : " · Self"}`}</small></span></button>`;
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
function receiveUpdateStatus(status) {
  const previous = updateStatus?.phase;
  updateStatus = status;
  if (status.phase === "error" && previous === "installing" && !runsOpen)
    game.resume();
  const control = ui.querySelector('[data-action="updates"]');
  if (control) {
    control.textContent =
      status.phase === "downloaded" ? "Update ready" : "Updates";
    control.classList.toggle("update-ready", status.phase === "downloaded");
  }
  if (modal.querySelector("#update-panel")) drawUpdateStatus();
  if (status.phase === "downloaded" && previous !== "downloaded")
    toast(`Version ${status.next} is ready. Open Updates to save and restart.`);
}
function updatesScreen() {
  dialog("Keep the lantern lit", '<div id="update-panel"></div>');
  drawUpdateStatus();
}
function drawUpdateStatus() {
  const s = updateStatus ?? { phase: "idle" };
  const busy = ["checking", "downloading", "saving", "installing"].includes(
    s.phase,
  );
  const descriptions = {
    idle: "Checks for new releases when the game opens and every four hours.",
    checking: "Checking GitHub Releases…",
    current:
      "You have the latest release. Your lantern is ready for the depths.",
    available: "A new release is available.",
    downloading:
      "Downloading your update in the background. You can keep playing.",
    downloaded:
      "Your update is ready. Save this journey and restart whenever you are ready.",
    saving: "Saving your journey before installing…",
    installing: "Installing the update and restarting…",
    unsupported:
      "This is a development build. Install the release version to receive updates in the game.",
    error:
      "The update could not finish. You can keep playing and try again later.",
  };
  modal.querySelector("#update-panel").innerHTML =
    `<div class="update-version"><img src="/art/greyhaven-seal.png" alt=""><div><span class="eyebrow">DEEP DARK DUNGEONS · RELEASES</span><h3>Version ${esc(s.current ?? "—")}</h3>${s.next ? `<small>New release · ${esc(s.next)}</small>` : ""}</div></div><p role="status">${descriptions[s.phase] ?? descriptions.idle}</p>${s.phase === "downloading" ? `<progress max="100" value="${s.percent ?? 0}" aria-label="Update download progress"></progress><p>${Math.floor(s.percent ?? 0)}% downloaded</p>` : ""}${s.error ? `<p class="update-error">${esc(s.error)}</p>` : ""}<p class="update-note">Updates download automatically from our GitHub releases. Installation waits for you; saved journeys and heroes stay on this computer.</p><footer>${s.phase === "unsupported" ? "" : `<button id="check-update" ${busy || s.phase === "downloaded" ? "disabled" : ""}>Check for updates</button>`}${s.phase === "downloaded" ? '<button id="install-update" class="primary">Save & restart to install</button>' : ""}<button id="release-page">View releases</button></footer>`;
  const check = modal.querySelector("#check-update");
  if (check)
    check.onclick = () => attempt(() => window.desktop.updates.check());
  const install = modal.querySelector("#install-update");
  if (install)
    install.onclick = () => attempt(() => window.desktop.updates.install());
  modal.querySelector("#release-page").onclick = () =>
    attempt(() => window.desktop.updates.releases());
}
function shop() {
  closeModal();
  marketScreen({ root: modal, game, close: closeModal, attempt });
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
    `<p><b>${esc(hero.name)} · ${esc(wound.record.injury)}</b></p><p>${esc(C.gamePowers ? (wound.record.recoveryValue ? "Treat this injury with a field dressing at a safe camp, or pay the Greyhaven infirmary. Open Character → Journey for the exact cost and time." : "This exceptional injury requires a restoration draught or advanced care at the Greyhaven infirmary. Open Character → Journey.") : wound.record.remedy)}</p><div class="condition-tags">${wound.effects.map((e) => `<span>${esc(e.kind === "condition" ? `${e.key} ${e.rating}${e.persistence === "starred" ? "*" : ""}` : e.kind === "movementPenalty" ? `Movement −${e.amount}` : e.kind === "rollModifier" ? `${e.amount} ${e.polarity}: ${e.context}` : e.kind === "forcedMovement" ? `${e.direction} ${e.distance}` : "Last Words")}</span>`).join("")}</div>${
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
  if (!initialized || runsOpen || !library?.active) return;
  clearTimeout(saveTimer);
  if (game.campaign.fallenHeroes.length > savedFallen) {
    savedFallen = game.campaign.fallenHeroes.length;
    void save(false).catch((e) => toast(e.message));
    return;
  }
  saveTimer = setTimeout(
    () => void save(false).catch((e) => toast(e.message)),
    900,
  );
}
function startingDrafts() {
  return [
    "borin-bridgekeeper",
    "lira-ashbow",
    "pip-copperwink",
    "vaelis-emberglass",
  ].map((id) => readyExample(examples.find((e) => e.id === id).draft, R, C));
}
async function save(show = false) {
  clearTimeout(saveTimer);
  if (!game || !library?.active) return;
  await library.write(library.active, serialize(game.snapshot()));
  if (show) toast("Expedition saved on this computer.");
}
function resumeRun() {
  closeModal();
  runsOpen = false;
  game.resume();
  render();
  showSupplyNotice();
}
async function openRuns() {
  if (runsOpen) return;
  game.pause();
  selectedAction = null;
  scene.freezePositions();
  scene.showPath([]);
  scene.showPowerTarget(null);
  runsOpen = true;
  runsBusy = true;
  closeModal();
  modal.innerHTML =
    '<div class="veil"><section class="runs-window"><header><h2>Saving your journey…</h2></header></section></div>';
  try {
    await save();
  } catch (error) {
    runsBusy = false;
    resumeRun();
    throw error;
  }
  runsBusy = false;
  await runsScreen({
    onBusy: (value) => {
      runsBusy = value;
    },
    root: modal,
    library,
    attempt,
    resume: resumeRun,
    exit: async () => {
      await save();
      await library.activate(null);
      render();
    },
    remove: async (id) => {
      await library.remove(id, { allowActive: true });
      render();
    },
    copy: (name) => library.create(name, serialize(game.snapshot()), false),
    create: async (name) => {
      await save();
      const candidate = new Game(R, C);
      candidate.fresh(startingDrafts());
      candidate.pause();
      const text = serialize(candidate.snapshot());
      await library.create(name, text);
      game.load(deserialize(text), { resume: false });
      savedFallen = game.campaign.fallenHeroes.length;
      scene.focusOn(game.active);
      resumeRun();
    },
    load: async (id) => {
      await save();
      const text = await library.read(id);
      const candidate = new Game(R, C);
      candidate.load(deserialize(text), { resume: false });
      await library.activate(id);
      game.load(deserialize(text), { resume: false });
      savedFallen = game.campaign.fallenHeroes.length;
      scene.focusOn(game.active);
      resumeRun();
      toast("Saved journey restored.");
    },
    quit: window.desktop
      ? async () => {
          await save();
          window.desktop.close();
        }
      : null,
  });
}

init().catch((e) => {
  console.error(e);
  ui.innerHTML = `<div class="loading-screen"><h1>The gate could not open</h1><p>${esc(e.message)}</p></div>`;
});

let supplyDialog, supplyWasSuspended;
function showSupplyNotice() {
  if (!game?.campaign?.supplyNotices?.length || runsOpen || supplyDialog)
    return;
  const notice = game.campaign.supplyNotices[0];
  supplyWasSuspended = game.suspended;
  game.pause();
  supplyDialog = document.createElement("div");
  supplyDialog.className = "supply-alert veil";
  supplyDialog.innerHTML = `<section role="alertdialog" aria-modal="true" aria-label="Supply warning"><span class="eyebrow">EXPEDITION SUPPLIES</span><h2>${esc(notice.item)}</h2><h3>${esc(notice.name)}</h3><p>${esc(notice.message)}</p><button class="primary">Continue</button></section>`;
  document.body.append(supplyDialog);
  const button = supplyDialog.querySelector("button");
  button.onclick = () => {
    game.acknowledgeSupply(notice.id);
    supplyDialog.remove();
    supplyDialog = null;
    if (!supplyWasSuspended) game.resume();
    showSupplyNotice();
  };
  button.focus();
}

function opportunity({ hero, enemy }) {
  dialog(
    "Opportunity attack",
    `<p>${esc(enemy.name)} provokes ${esc(hero.name)}. Spend this hero’s Reaction to make a Basic Melee attack before the creature continues?</p>`,
    '<button id="skip-opportunity">Keep Reaction</button><button id="take-opportunity" class="primary">Basic Melee · Reaction</button>',
  );
  modal.querySelector(".close").onclick = () =>
    toast("Choose whether to take this opportunity.");
  for (const [id, use] of [
    ["skip-opportunity", false],
    ["take-opportunity", true],
  ])
    modal.querySelector(`#${id}`).onclick = () =>
      attempt(() => {
        closeModal();
        game.resolveOpportunity(use);
      });
}
