import {
  BASIC_SUPPLIES,
  MATERIAL_STOCKS,
  SUPPLY_TARGETS,
} from "../core/supply-stock.mjs";
import { esc, icon } from "./icons.mjs";
import "./supplies.css";
const die = (n) => (n ? `d${n}` : "Empty");
const refKey = (r) => `${r.hero}|${r.supply}|${r.itemId ?? ""}`;
const readRef = (key) => {
  const [hero, supply, itemId] = key.split("|");
  return { hero, supply, itemId: itemId || null };
};

export function suppliesScreen({ root, game, close, attempt, camp, recipes }) {
  let filter = "all",
    showMissing = false,
    target = game.campaign.restockTarget ?? 8,
    review = null,
    lastResult = "",
    changed = new Set();
  function draw() {
    const town = game.mode === "town",
      partyPlan = town ? game.departurePlan(target) : null;
    const rows = game
      .supplyRows()
      .filter(
        (r) =>
          (filter === "all" || r.supply === filter) &&
          (showMissing || !r.missing || ["food", "water"].includes(r.supply)),
      );
    root.innerHTML = `<div class="veil supplies-veil"><section class="supplies-window" role="dialog" aria-modal="true" aria-label="Party supplies"><header><div><span class="eyebrow">THE COMPANY'S STORES</span><h2>Ready for the road</h2><p>Improve the supplies your companions carry. Larger dice last longer.</p></div><button class="icon-button close" aria-label="Close supplies">${icon("close")}</button></header><div class="supplies-toolbar"><nav aria-label="Supply categories">${[{ id: "all", name: "All supplies" }, ...BASIC_SUPPLIES].map((s) => `<button data-supply-filter="${s.id}" aria-pressed="${s.id === filter}">${s.name}</button>`).join("")}</nav><label><input id="show-missing-supplies" type="checkbox" ${showMissing ? "checked" : ""}> Empty slots</label></div><div class="supplies-layout"><aside><h3>Shared ingredients</h3><p>Available to every capable companion. Ingredients keep their carried Bulk.</p>${MATERIAL_STOCKS.map(
      (s) => {
        const buyPrice = game.ingredientPurchasePrice(s.id, 4),
          sources = game.materialSources(s.id),
          owners = new Map();
        for (const x of sources)
          owners.set(x.hero.name, (owners.get(x.hero.name) ?? 0) + x.units);
        return `<article class="ingredient-stock" data-stock="${s.id}"><header><strong>${s.name}</strong><b>${game.materialCount(s.id)}</b></header><small>${[...owners].map(([name, n]) => `${esc(name.split(" ")[0])} ${n}`).join(" · ") || "Find ingredients while foraging."}</small>${town ? `<button data-buy-stock="${s.id}" ${game.supplyWorkReason() || game.campaign.bank < buyPrice ? "disabled" : ""}>Buy 4 · ${buyPrice} coins<small>1 Bulk · carried automatically</small></button>` : ""}</article>`;
      },
    ).join(
      "",
    )}<div class="supplies-rule"><b>A familiar ladder</b><p>Empty → d4 → d6 → d8 → d10 → d12 → d20</p><p>Supplies step down when a depletion check rolls 1. Restocking moves them upward.</p><p>Higher tiers need more ingredients. Prepared results are guaranteed when requirements are met.</p></div></aside><main>${review ? reviewHTML() : `<div class="departure-plan">${town ? `<div><h3>Prepare the company</h3><p>Restock carried supplies and add missing food or water. Larger existing dice are preserved.</p></div><label>Departure stock<select id="departure-target">${SUPPLY_TARGETS.map((n) => `<option value="${n}" ${target === n ? "selected" : ""}>d${n}</option>`).join("")}</select></label><button id="review-party-restock" class="primary" ${partyPlan.reason ? "disabled" : ""}>Review party restock<small>${partyPlan.total} coins · ${game.campaign.bank} available</small></button>${partyPlan.reason ? `<small class="supplies-warning">${esc(partyPlan.reason)}</small>` : ""}` : `<div><h3>Prepare at camp</h3><p>Choose a supply to plan a camp duty. A skilled companion can improve it further using the shared ingredients.</p></div><button id="supplies-camp" ${game.supplyWorkReason() ? "disabled" : ""}>Open camp</button>`}</div><div class="supply-list">${rows.map(rowHTML).join("") || '<p class="supply-empty">No matching carried supplies. Show empty slots to add some.</p>'}</div>`}<p class="supplies-result" role="status" aria-live="polite">${esc(lastResult)}</p></main></div><footer><span>Supplies remain on individual heroes. Ordinary restocking keeps the bundle's Bulk; adding a new supply adds its listed Bulk.</span><button id="supplies-recipes">Advanced recipes & training</button></footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelectorAll("[data-supply-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          changed = new Set();
          filter = b.dataset.supplyFilter;
          review = null;
          draw();
        }),
    );
    root.querySelector("#show-missing-supplies").onchange = (e) => {
      showMissing = e.target.checked;
      draw();
    };
    root.querySelector("#departure-target")?.addEventListener("change", (e) => {
      target = +e.target.value;
      game.campaign.restockTarget = target;
      game.emit("change");
      draw();
    });
    root.querySelectorAll("[data-buy-stock]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.buySupplyIngredients(b.dataset.buyStock);
            lastResult = "Ingredients added to the party's carried stores.";
            draw();
          })),
    );
    root.querySelectorAll("[data-review-supply]").forEach(
      (b) =>
        (b.onclick = () => {
          const ref = readRef(b.dataset.reviewSupply),
            plan = game.townRestockPlan(ref, target);
          review = {
            rows: [plan],
            total: plan.price,
            target,
            ref,
            expected: JSON.stringify([plan.before, plan.after, plan.price]),
          };
          draw();
          root.querySelector("#confirm-restock")?.focus();
        }),
    );
    root
      .querySelector("#review-party-restock")
      ?.addEventListener("click", () => {
        review = { ...game.departurePlan(target), party: true };
        draw();
        root.querySelector("#confirm-restock")?.focus();
      });
    root.querySelector("#cancel-restock")?.addEventListener("click", () => {
      review = null;
      draw();
    });
    root.querySelector("#confirm-restock")?.addEventListener("click", () =>
      attempt(() => {
        const count = review.rows.length;
        const improved = review.rows.map(refKey);
        if (review.party) game.restockParty(review.target, review.fingerprint);
        else game.restockInTown(review.ref, review.target, review.expected);
        changed = new Set(improved);
        lastResult = `${count} ${count === 1 ? "supply" : "supplies"} restocked. Ready for the road.`;
        review = null;
        draw();
      }),
    );
    root
      .querySelector("#supplies-camp")
      ?.addEventListener("click", () => camp());
    root.querySelectorAll("[data-plan-supply]").forEach(
      (b) =>
        (b.onclick = () => {
          const ref = readRef(b.dataset.planSupply),
            best = game.bestSupplyWorker(ref);
          if (best)
            camp({
              worker: best.hero.heroId,
              duty: best.plan.spec.duty,
              target: { heroId: ref.hero, supplyId: ref.itemId ?? "new" },
            });
        }),
    );
    root.querySelector("#supplies-recipes").onclick = recipes;
  }
  function rowHTML(row) {
    const spec = BASIC_SUPPLIES.find((s) => s.id === row.supply),
      town = game.mode === "town";
    const plan = town
      ? game.townRestockPlan(row, target)
      : game.bestSupplyWorker(row)?.plan;
    const helper = !town && game.bestSupplyWorker(row)?.hero;
    const reason = town
      ? plan.reason ||
        (plan.price > game.campaign.bank ? "Not enough vault coins." : "")
      : plan?.reason;
    const after = plan?.after ?? row.before;
    return `<article class="supply-row" data-supply-row="${esc(refKey(row))}"><div class="supply-die ${row.before <= 4 ? "supply-low" : ""} ${changed.has(refKey(row)) ? "supply-improved" : ""}" aria-label="${die(row.before)}">${die(row.before)}</div><div class="supply-description"><h3>${spec.name} <small>${esc(row.name)}</small></h3><p>${row.missing ? "No carried supply" : `${row.bulk} Bulk · carried`}${town && after === row.before ? " · At or above departure stock" : ""}</p><div class="supply-next">${row.before < 20 && after > row.before ? `${die(row.before)} <span>→</span> <b>${die(after)}</b> · ${town ? `${plan.price} coins${plan.bulkAdded ? ` · +${plan.bulkAdded} Bulk` : ""}` : plan.water ? "Fill carried flasks at the water source" : `${plan.units} ${plan.material.name.toLowerCase()} · one duty`}` : row.before === 20 ? "Maximum supply" : town ? "Ready" : "Choose a camp project"}</div>${!town && helper ? `<small>${esc(helper.name)}${plan?.steps > 1 ? ` · skilled preparation, up to ${plan.steps} steps` : ""}</small>` : ""}${reason ? `<small class="supplies-warning">${esc(reason)}</small>` : ""}</div>${town ? `<button data-review-supply="${esc(refKey(row))}" ${reason || after === row.before ? "disabled" : ""}>${row.missing ? "Add supply" : "Restock"}</button>` : `<button data-plan-supply="${esc(refKey(row))}" ${game.supplyWorkReason() || !helper ? "disabled" : ""}>Plan at camp</button>`}</article>`;
  }
  function reviewHTML() {
    return `<section class="restock-review" aria-label="Review restock"><span class="eyebrow">BEFORE YOU SET OUT</span><h3>Review restock</h3><div>${review.rows.map((r) => `<p><strong>${esc(r.name ?? game.supplyRef(r).hero.name)}</strong><span>${BASIC_SUPPLIES.find((s) => s.id === r.supply).name} · ${die(r.before)} → ${die(r.after)}</span><b>${r.price} coins</b>${r.bulkAdded ? `<small>+${r.bulkAdded} Bulk</small>` : ""}</p>`).join("")}</div><p class="restock-total">Total <b>${review.total} coins</b><small>${game.campaign.bank} available</small></p><div class="dialog-actions"><button id="cancel-restock">Back</button><button id="confirm-restock" class="primary" ${game.supplyWorkReason() || game.campaign.bank < review.total ? "disabled" : ""}>Confirm restock · ${review.total} coins</button></div></section>`;
  }
  draw();
}
