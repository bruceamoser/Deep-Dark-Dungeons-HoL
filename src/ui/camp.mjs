import { esc, icon } from "./icons.mjs";
export function campScreen({ root, game, close, attempt }) {
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
      )}</div><div class="camp-rest"><div><h3>${sleeping ? `Sleeping · ${hours}/8 hours` : "Rest until ready"}</h3><p>Eight hours of sleep clears fatigue. Food and water are used automatically each day. Dungeon sleep may be interrupted by enemies. Sleep never restores Grit or removes wounds.</p>${reason ? `<p class="cost-note">${esc(reason)}</p>` : ""}</div><button id="sleep" class="primary" ${!sleeping && reason ? "disabled" : ""}>${sleeping ? "Wake the company" : "Sleep for 8 hours"}</button></div><footer>Torches occupy a hand. One supply check per 30 minutes burning. Automatic dousing preserves the remaining burn time. Fatigue begins after 16 hours awake.</footer></section></div>`;
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
