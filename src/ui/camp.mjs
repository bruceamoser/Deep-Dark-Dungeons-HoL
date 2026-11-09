import { fiercenessIndicator } from "./fierceness.mjs";
import { SUPPLY_CADENCE } from "../core/provisions.mjs";
import { CAMP_SUPPLIES } from "../core/camp-medical.mjs";
import { CAMP_DUTIES, campPeriod } from "../core/camp.mjs";
import { campBackdrop } from "../view/camp-backdrop.mjs";
import "./camp.css";
export function campScreen(props) {
  return props.game.mode === "town"
    ? townCampScreen(props)
    : dungeonCampScreen(props);
}
import { esc, icon } from "./icons.mjs";
function townCampScreen({ root, game, close, attempt }) {
  let timer = null,
    sleeping = false,
    hours = 0;
  const stop = () => {
    clearTimeout(timer);
    timer = null;
    sleeping = false;
  };
  function draw() {
    const clock = game.clock(),
      reason = game.sleepReason();
    root.innerHTML = `<div class="veil"><section class="camp-window" role="dialog" aria-label="Camp and supplies"><header><div><span class="eyebrow">${game.mode === "town" ? "THE WAYFARER’S REST" : "A CIRCLE OF LIGHT"}</span><h2>Camp & supplies</h2></div><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="camp-clock"><b>Day ${clock.day}</b><span>${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}</span><small>Time passes while travelling, fighting and working.</small></div><div class="camp-party">${game.party
      .map((h, i) => {
        const n = game.needs(h),
          reason = game.torchReason(i);
        const supplies = [
          ["Food", "item-food-bundle"],
          ["Water", "item-water-flask"],
          ["Torches", "item-lighting-bundle"],
        ]
          .map(([name, id]) => {
            const items = h.preview.inventory.items.filter(
              (x) => x.carried && x.catalogId === id,
            );
            return `<div><small>${name}</small><b>${items.length ? items.map((x) => (game.supplyValue(h, x) ? `d${game.supplyValue(h, x)}` : "Empty")).join(" · ") : "None"}</b></div>`;
          })
          .join("");
        return `<article class="camp-hero"><h3>${esc(h.name)}</h3><p class="${n.fatigue || n.hungry || n.thirsty ? "needs-warning" : ""}">${Math.floor(n.awake / 3600)}h awake${n.fatigue ? ` · Fatigue ${n.fatigue}` : " · Rested"}${n.hungry ? " · Hungry" : ""}${n.thirsty ? " · Thirsty" : ""}</p><div class="supply-meter">${supplies}</div><p>${h.torch?.held ? (h.torch.lit ? "Torch burning" : "Torch ready · automatically doused in light") : "Torch stowed"} · ${game.freeHands(h)} free hands</p><button data-torch="${i}" ${reason || sleeping ? "disabled" : ""} title="${esc(reason)}">${h.torch?.held ? "Stow torch" : "Ready torch"}</button>${h.preview.state.abilities.includes("ability-lantern-in-the-palm") ? `<button data-lantern="${i}" ${game.lanternReason(i) || sleeping ? "disabled" : ""}>${h.lantern ? "End magical light" : "Lantern in the Palm"}</button>` : ""}${reason ? `<small class="cost-note">${esc(reason)}</small>` : ""}${game.mode === "town" ? `<button data-water="${i}" ${sleeping || !h.preview.inventory.items.some((x) => x.catalogId === "item-water-flask") ? "disabled" : ""}>Refill water at the well</button>` : ""}</article>`;
      })
      .join(
        "",
      )}</div><div class="camp-rest"><div><h3>${sleeping ? `Sleeping · ${hours}/8 hours` : "Rest until ready"}</h3><p>Eight hours of sleep clears fatigue. Food and water are used automatically each day. Sleep restores 2 HP per hour without restoring Grit or removing wounds.</p>${reason ? `<p class="cost-note">${esc(reason)}</p>` : ""}</div><button id="sleep" class="primary" ${!sleeping && reason ? "disabled" : ""}>${sleeping ? "Wake the company" : "Sleep for 8 hours"}</button></div><footer>Torches occupy a hand. One lighting check per 25 burning party steps; campfire fuel is checked hourly. Automatic dousing preserves the remaining burn time. Fatigue begins after 16 hours awake.</footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelectorAll("[data-torch]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.toggleTorch(+b.dataset.torch);
            if (!game.pendingProvocation && !game.pendingDefense) draw();
          })),
    );
    root.querySelectorAll("[data-lantern]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.toggleLantern(+b.dataset.lantern);
            if (!game.pendingProvocation && !game.pendingDefense) draw();
          })),
    );
    root.querySelectorAll("[data-water]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.refillWater(+b.dataset.water);
            draw();
          })),
    );
    root.querySelector("#sleep").onclick = () => {
      if (sleeping) {
        stop();
        draw();
        return;
      }
      sleeping = true;
      hours = 0;
      draw();
      const next = () => {
        if (!sleeping) return;
        // An exhaustion notice pauses this UI timer as well as world movement.
        if (game.campaign.supplyNotices.length) {
          timer = setTimeout(next, 500);
          return;
        }
        attempt(() => {
          const result = game.sleepHour();
          hours++;
          if (result.interrupted) {
            stop();
            close();
            game.resume();
            return;
          }
          if (hours >= 8) stop();
          draw();
          if (sleeping) timer = setTimeout(next, 650);
        });
      };
      timer = setTimeout(next, 650);
    };
  }
  draw();
  return () => {
    stop();
    game.syncTorches();
  };
}

function dungeonCampScreen({ root, game, close, attempt, assets }) {
  let timer = null,
    running = false,
    disposed = false,
    total = 8;
  const defaults = [
    ["guard", "water"],
    ["forage", "arrows"],
    ["forage", "cook"],
    ["forage", "torches"],
  ];
  let assignments = Object.fromEntries(
    game.party.map((h, i) => [h.heroId, [...defaults[i]]]),
  );
  let targets = Object.fromEntries(
    game.party.map((h) => [
      h.heroId,
      [{ heroId: h.heroId }, { heroId: h.heroId }],
    ]),
  );
  if (game.campCanResume()) {
    assignments = structuredClone(game.campaign.camp.assignments);
    total = game.campaign.camp.total;
    targets = structuredClone(game.campaign.camp.targets ?? targets);
  }
  root.innerHTML = `<div class="veil camp-veil"><section class="dungeon-camp" role="dialog" aria-modal="true" aria-label="Dungeon camp"><header><div><span class="eyebrow">BENEATH THE LAST LIGHT</span><h2>A circle in the dark</h2></div><button class="icon-button camp-close" aria-label="Close camp">${icon("close")}</button></header><div class="camp-landscape"><canvas aria-label="Animated company campsite"></canvas></div><div class="camp-plan"></div></section></div>`;
  root.querySelector(".camp-close").onclick = close;
  const disposeBackdrop = campBackdrop(
    root.querySelector("canvas"),
    assets,
    game.party,
  );
  const host = root.querySelector(".camp-plan");
  function stop() {
    clearTimeout(timer);
    timer = null;
    running = false;
  }
  function draw() {
    if (disposed) return;
    const camp = game.campCanResume() ? game.campaign.camp : null;
    const last = game.campaign.camp;
    const elapsed =
      camp?.elapsed ?? (last?.status === "complete" ? last.elapsed : 0);
    const period = campPeriod(game.party, assignments, elapsed);
    const countdown = game.provisionCountdown();
    const fireLit = camp
      ? camp.fireLit !== false
      : game.party.some(
          (h) => h.lantern || game.supplyItem(h, "item-lighting-bundle"),
        );
    disposeBackdrop.setFire?.(fireLit);
    const reason = game.sleepReason();
    const forecast = !reason
      ? game.campForecast(assignments, total, targets)
      : null;
    const diceSummary = (heroes, id) => {
      const dice = heroes
        .flatMap((h) =>
          h.preview.inventory.items
            .filter(
              (i) =>
                i.carried &&
                (Array.isArray(id)
                  ? id.includes(i.catalogId)
                  : i.catalogId === id),
            )
            .flatMap((i) => [game.supplyValue(h, i), ...(i.reserveDice ?? [])]),
        )
        .filter(Boolean);
      const counts = new Map();
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1);
      const batches =
        id === "item-material-bundle"
          ? heroes.reduce(
              (sum, h) =>
                sum +
                Object.values(h.recipeMaterials ?? {}).reduce(
                  (n, v) => n + v,
                  0,
                ),
              0,
            )
          : 0;
      const diceText =
        [...counts]
          .sort((a, b) => b[0] - a[0])
          .map(([d, n]) => `d${d}${n > 1 ? ` × ${n}` : ""}`)
          .join(" + ") || "Empty";
      return batches
        ? `${batches} batches${diceText !== "Empty" ? ` + ${diceText}` : ""}`
        : diceText;
    };
    const supplyOverview = `<section class="camp-stocks" aria-label="Party supplies and projected levels"><div class="camp-forecast-heading"><span class="eyebrow">COMPANY STORES · NOW → PROJECTED END</span><small>Range assumes a completed camp. Supply and treatment rolls vary; foraging may fail.</small></div><div>${CAMP_SUPPLIES.map(
      ([name, id]) => {
        const now = diceSummary(game.party, id),
          low = forecast
            ? diceSummary(
                forecast.supplyLow?.[Array.isArray(id) ? id.join(",") : id] ??
                  forecast.low,
                id,
              )
            : "—",
          high = forecast
            ? diceSummary(
                forecast.supplyHigh?.[Array.isArray(id) ? id.join(",") : id] ??
                  forecast.high,
                id,
              )
            : "—";
        const next =
          name === "Food"
            ? `${countdown.food} steps / ${Math.ceil(countdown.foodHours)}h rest`
            : name === "Water"
              ? `${countdown.water} steps / ${Math.ceil(countdown.waterHours)}h rest`
              : name === "Light"
                ? `${SUPPLY_CADENCE.lightSteps} lit steps / 1h camp`
                : "";
        return `<article><small>${name}</small><b>${now}</b><span>→ ${low === high ? low : `${low} to ${high}`}</span>${next ? `<small class="camp-next-check">Next: ${next}</small>` : ""}</article>`;
      },
    ).join("")}</div></section>`;
    const danger = game.campDanger(
      camp ? camp.total - camp.elapsed : total,
      camp ?? game.active,
    );
    host.innerHTML = `<div class="camp-plan-top"><div><span class="eyebrow">${last?.status === "complete" && !camp ? "CAMP COMPLETE" : camp?.status === "interrupted" ? "WATCH INTERRUPTED" : "REST & RECOVERY"}</span><h3>${camp ? `Hour ${elapsed} of ${camp.total}` : "Plan the watch"}</h3><p><b>2 HP per sleeping hour</b> · six hours sleep per eight-hour rota · Guard: +1 Boon · no Grit recovery</p></div><label>Camp length<select id="camp-length" ${camp ? "disabled" : ""}>${Array.from(
      { length: 89 },
      (_, i) => i + 8,
    )
      .map(
        (h) =>
          `<option value="${h}" ${h === total ? "selected" : ""}>${h} hours</option>`,
      )
      .join(
        "",
      )}</select></label><button id="camp-until-healed" ${camp ? "disabled" : ""}>Plan until HP recovered</button></div><div class="camp-danger">${fiercenessIndicator(danger)}<p><b>${(danger.total * 100).toFixed(1)}% interruption chance</b> over ${camp ? camp.total - camp.elapsed : total} ${camp ? "remaining " : ""}hours${danger.warning ? " · Leaf Listener reduces risk" : ""}. Watch duties affect ambush detection.</p></div>${supplyOverview}<div class="camp-rota-heading"><span>COMPANION</span><span>CONDITION · PROJECTED END</span><span>FIRST DUTY</span><span>SECOND DUTY</span></div><div class="camp-rota">${game.party
      .map((h, i) => {
        const sleeps = Array.from({ length: total }, (_, p) =>
          campPeriod(game.party, assignments, p).sleepers.includes(h),
        ).filter(Boolean).length;
        const activity = camp
          ? period.worker === h
            ? CAMP_DUTIES.find((d) => d.id === period.duty)?.name
            : h.survival.status === "active"
              ? "Sleeping"
              : "Unavailable"
          : `${sleeps} hours sleep · up to ${sleeps * 2} HP`;
        const projectedLow = forecast?.low[i],
          projectedHigh = forecast?.high[i];
        const projectedHp = projectedLow
          ? projectedLow.survival.hp === projectedHigh.survival.hp
            ? projectedLow.survival.hp
            : `${projectedLow.survival.hp}–${projectedHigh.survival.hp}`
          : "—";
        const untreated = h.wounds.filter((w) => !w.treatment?.completed);
        const careSummary = `<div class="camp-health" aria-label="${esc(h.name)} health projection"><span>HP now → end <b>${h.survival.hp} → ${projectedHp} <small>/ ${game.healingMaximum(h)}</small></b></span><span>Untreated wounds <b>${untreated.length} → ${projectedLow ? (projectedHigh.wounds.filter((w) => !w.treatment?.completed).length === projectedLow.wounds.filter((w) => !w.treatment?.completed).length ? projectedLow.wounds.filter((w) => !w.treatment?.completed).length : `${projectedHigh.wounds.filter((w) => !w.treatment?.completed).length}–${projectedLow.wounds.filter((w) => !w.treatment?.completed).length}`) : "—"}</b></span>${
          untreated.length || h.conditions.length
            ? `<details class="camp-wounds"><summary>View injuries & conditions</summary>${
                untreated
                  .map((w) => {
                    const low = projectedLow?.wounds.find((p) => p.id === w.id),
                      high = projectedHigh?.wounds.find((p) => p.id === w.id);
                    return `<p><b>${esc(w.record.injury)}</b><small>${w.record.recoveryValue ? `Recovery ${w.treatment?.progress ?? 0}/${w.record.recoveryValue}${low ? ` → ${Math.min(w.record.recoveryValue, low.treatment?.progress ?? 0)}–${Math.min(w.record.recoveryValue, high.treatment?.progress ?? 0)}` : ""}` : "Severe · restoration care"}${w.treatment?.attempts?.some((a) => a.dayKey === `day-${game.clock().day}`) ? " · today's attempt used" : ""}</small></p>`;
                  })
                  .join("") || "<small>No untreated wounds</small>"
              }${h.conditions.length ? `<p>${h.conditions.map((c) => esc(c.key)).join(" · ")}</p>` : ""}</details>`
            : ""
        }</div>`;
        return `<article class="camp-member ${camp && period.worker === h ? "on-watch" : ""}"><div class="camp-member-title"><span class="camp-number">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(h.name)}</h3><small>${esc(activity)}</small></div></div>${careSummary}${[
          0, 1,
        ]
          .map((slot) => {
            const duty = assignments[h.heroId][slot],
              desc = CAMP_DUTIES.find((d) => d.id === duty);
            const target = targets[h.heroId]?.[slot];
            const warning = game.campDutyReason(h, duty, target);
            const patientOptions =
              duty === "heal"
                ? game.party
                    .filter(
                      (p) =>
                        !["dead", "dying", "lastWords"].includes(
                          p.survival.status,
                        ),
                    )
                    .map((p) => ({
                      value: `${p.heroId}|`,
                      name: `${p.name} · ${p.survival.hp}/${game.healingMaximum(p)} HP`,
                    }))
                : game.party.flatMap((p) =>
                    p.wounds
                      .filter((w) => !w.treatment?.completed)
                      .map((w) => ({
                        value: `${p.heroId}|${w.id}`,
                        name: `${p.name} · ${w.record.injury}`,
                      })),
                  );
            const forage = duty === "forage" ? game.campForageTable(h) : null;
            const forageDetails = forage
              ? `<details class="camp-forage-odds"><summary>${forage.findChance}% find chance · d100 bands</summary><table><tbody>${forage.bands.map((b) => `<tr><td>${b.start}–${b.end}</td><td>${b.name}</td><td>${b.chance}%${b.bonus ? ` (+${b.bonus})` : ""}</td></tr>`).join("")}</tbody></table>${forage.modifiers.length ? `<small>${forage.modifiers.map((m) => esc(m.name)).join(" · ")}</small>` : "<small>Baseline chances · one resource per find.</small>"}</details>`
              : "";
            const patientSelect = ["heal", "treat"].includes(duty)
              ? `<select data-camp-target="${h.heroId}" data-target-slot="${slot}" aria-label="${esc(h.name)} patient ${slot + 1}" ${running ? "disabled" : ""}><option value="">Choose ${duty === "heal" ? "companion" : "wound"}</option>${patientOptions.map((p) => `<option value="${p.value}" ${p.value === `${target?.heroId ?? ""}|${target?.woundId ?? ""}` ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>${duty === "heal" ? `<small>${game.campHealSkills(h).length} learned healing skills · +${4 * game.campHealSkills(h).length} HP/hour with dressings</small>` : ""}`
              : "";
            return `<label class="camp-duty"><span title="${esc(desc.detail)}">Hour ${i + 1 + slot * 4} · ⓘ</span><select data-camp-hero="${h.heroId}" data-camp-slot="${slot}" aria-label="${esc(h.name)} duty ${slot + 1}" ${running || h.survival.status !== "active" ? "disabled" : ""}>${CAMP_DUTIES.map((d) => `<option value="${d.id}" ${d.id === duty ? "selected" : ""}>${d.name}</option>`).join("")}</select>${patientSelect}${forageDetails}<small class="camp-duty-description">${esc(desc.detail)}</small>${warning ? `<small class="camp-duty-warning">${esc(warning)}</small>` : ""}</label>`;
          })
          .join("")}</article>`;
      })
      .join(
        "",
      )}</div><div class="camp-watchline"><span class="eyebrow">EIGHT-HOUR ROTA · REPEATS FOR LONGER CAMPS</span><div>${Array.from(
      { length: 8 },
      (_, p) => {
        const { worker, duty } = campPeriod(game.party, assignments, p);
        return `<span class="${camp && p === elapsed % 8 ? "current" : ""}"><small>${p + 1}</small><b>${esc(worker?.name.split(" ")[0] ?? "No watch")}</b><small>${esc(CAMP_DUTIES.find((d) => d.id === duty)?.name ?? "Unguarded")}</small></span>`;
      },
    ).join(
      "",
    )}</div></div><div class="camp-progress"><progress value="${elapsed}" max="${total}" aria-label="Camp hours completed"></progress><span role="status">${running ? "The watch is passing…" : camp ? "Camp paused · resume when ready" : "Wandering creatures can interrupt any hour, even on a cleared floor."}</span></div><div class="camp-journal" aria-label="Camp journal" aria-live="polite">${(
      last?.events ?? []
    )
      .slice(-1)
      .map((e) => `<p>${esc(e)}</p>`)
      .join(
        "",
      )}</div><footer><div><small>${esc(reason || (game.campWaterSource() ? "Water source nearby · gather water is available." : "No water source nearby · carried water must last."))}</small><small>Closing pauses the camp. Completed hours, supplies and healing are saved.</small></div><button id="camp-break" ${!camp ? "disabled" : ""}>Break camp</button><button id="camp-hour" ${reason || running ? "disabled" : ""}>Advance one hour</button><button id="camp-run" class="primary" ${reason ? "disabled" : ""}>${running ? "Pause" : camp ? "Continue camp" : "Make camp"}</button></footer>`;
    host.querySelector("#camp-length").onchange = (e) => {
      total = +e.target.value;
      draw();
    };
    host.querySelector("#camp-until-healed").onclick = () => {
      total = game.campRecoveryHours(assignments);
      draw();
    };
    const revised = () => {
      if (game.campCanResume()) game.updateCampDuties(assignments, targets);
      draw();
    };
    host.querySelectorAll("[data-camp-hero]").forEach(
      (s) =>
        (s.onchange = () => {
          assignments[s.dataset.campHero][+s.dataset.campSlot] = s.value;
          if (["heal", "treat"].includes(s.value)) {
            const patient =
              s.value === "heal"
                ? [...game.party]
                    .filter((p) => p.survival.status === "active")
                    .sort((a, b) => a.survival.hp - b.survival.hp)[0]
                : game.party.find((p) =>
                    p.wounds.some((w) => !w.treatment?.completed),
                  );
            targets[s.dataset.campHero] ??= [null, null];
            targets[s.dataset.campHero][+s.dataset.campSlot] = patient
              ? {
                  heroId: patient.heroId,
                  ...(s.value === "treat"
                    ? {
                        woundId: patient.wounds.find(
                          (w) => !w.treatment?.completed,
                        ).id,
                      }
                    : {}),
                }
              : null;
          }
          revised();
        }),
    );
    host.querySelectorAll("[data-camp-target]").forEach(
      (s) =>
        (s.onchange = () => {
          const [heroId, woundId] = s.value.split("|");
          targets[s.dataset.campTarget][+s.dataset.targetSlot] = heroId
            ? { heroId, ...(woundId ? { woundId } : {}) }
            : null;
          revised();
        }),
    );
    const start = () => {
      if (!game.campCanResume()) game.startCamp(assignments, total, targets);
    };
    host.querySelector("#camp-break").onclick = () =>
      attempt(() => {
        stop();
        game.breakCamp();
        draw();
      });
    host.querySelector("#camp-hour").onclick = () =>
      attempt(() => {
        start();
        advance();
      });
    host.querySelector("#camp-run").onclick = () =>
      attempt(() => {
        if (running) {
          stop();
          draw();
          return;
        }
        start();
        running = true;
        draw();
        timer = setTimeout(advance, 1000);
      });
  }
  function advance() {
    if (disposed) return;
    if (game.campaign.supplyNotices.length) {
      if (running) timer = setTimeout(advance, 500);
      return;
    }
    let result;
    attempt(() => {
      result = game.campHour();
    });
    if (!result) stop();
    if (result?.interrupted) {
      stop();
      close();
      game.resume();
      return;
    }
    if (result?.complete) stop();
    draw();
    if (running) timer = setTimeout(advance, 1000);
  }
  draw();
  return () => {
    disposed = true;
    stop();
    disposeBackdrop();
    if (game.mode !== "combat") {
      game.map.lights =
        game.map.lights?.filter((l) => l.id !== "camp-fire") ?? [];
      game.syncTorches();
    }
  };
}
