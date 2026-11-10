import { stockForRecipe } from "../core/supply-stock.mjs";
import { RECIPES } from "../core/recipes.mjs";
import { icon, esc } from "./icons.mjs";
export function recipeBook({ root, game, close, attempt, supplies }) {
  let hero = game.selected,
    selected =
      RECIPES.find(
        (r) =>
          !r.basic &&
          !stockForRecipe(r.id) &&
          game.knownRecipes(game.party[hero]).has(r.id),
      )?.id ?? "recipe-smoke-flask",
    supply = "",
    filter = RECIPES.some(
      (r) =>
        !r.basic &&
        !stockForRecipe(r.id) &&
        game.knownRecipes(game.party[hero]).has(r.id),
    )
      ? "known"
      : "all",
    query = "";
  function draw() {
    const h = game.party[hero],
      known = game.knownRecipes(h),
      r = RECIPES.find((r) => r.id === selected),
      learned = known.has(r.id),
      matches = h.preview.inventory.items.filter(
        (i) => i.carried && i.catalogId === r.product,
      ),
      reason = game.recipeReason(hero, r.id, supply),
      price = game.recipePrice(h, r);
    root.innerHTML = `<div class="veil"><section class="camp-window recipe-book" role="dialog" aria-label="Recipe book"><header><div><span class="eyebrow">${game.mode === "town" ? "GREYHAVEN WORKSHOP" : "FIELD WORKSHOP"} · LEARN / CREATE / REPLENISH</span><h2>The artisan’s book</h2></div><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="camp-clock"><label>Artisan <select id="artisan">${game.party.map((p, i) => `<option value="${i}" ${i === hero ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><span>${known.size} recipes known</span><b>${game.campaign.bank} vault coins</b></div><div class="recipe-layout"><aside><input id="recipe-search" type="search" aria-label="Search recipes" placeholder="Search recipes…" value="${esc(query)}"><div class="recipe-filters"><button data-filter="known" class="${filter === "known" ? "chosen" : ""}">Known</button><button data-filter="all" class="${filter === "all" ? "chosen" : ""}">All recipes</button></div><nav>${
      RECIPES.filter(
        (x) =>
          !x.basic &&
          !stockForRecipe(x.id) &&
          (filter === "all" || known.has(x.id)) &&
          x.name.toLowerCase().includes(query.toLowerCase()),
      )
        .map(
          (x) =>
            `<button data-recipe="${x.id}" class="${x.id === r.id ? "chosen" : ""}">${icon(x.product.includes("healing") ? "heart" : "pack")}<span>${esc(x.name)}<small>${known.has(x.id) ? `${x.location === "town" ? "Town workshop" : "Camp or town"} · ${game.recipeTime(h, x)} min` : "Undiscovered · buy or find manuscript"}</small></span></button>`,
        )
        .join("") || '<p class="empty-state">No matching recipes.</p>'
    }</nav></aside><article><span class="eyebrow">${learned ? "LEARNED RECIPE" : "RECIPE MANUSCRIPT"} · LEVEL ${r.level}</span><h3>${esc(r.name)}</h3><p>${stockForRecipe(r.id) ? "Unlocks preparation in the party Supplies screen and at camp." : r.maximumDie ? `Creates a full d${r.maximumDie} supply, or replenishes a matching supply to d${r.maximumDie}.` : "Creates one item in the artisan’s backpack."} Guaranteed result when requirements are met.</p>${!stockForRecipe(r.id) ? `<div class="recipe-facts"><div><small>TIME</small><b>${game.recipeTime(h, r)} minutes</b></div><div><small>LOCATION</small><b>${r.location === "town" ? "Town workshop" : "Camp or town"}</b></div><div><small>TOOLS</small><b>${r.tool === "item-mixing-kit" ? "Mixing kit" : r.tool ? "Craft tools" : "By hand"}</b></div></div><div class="recipe-ingredients"><span class="eyebrow">ONE BATCH REQUIRED</span><h4>${esc(r.materials)}</h4><p>${h.recipeMaterials?.[r.id] ?? 0} prepared batches in your kit</p>${game.mode === "town" && learned ? `<button id="recipe-materials" ${game.campaign.bank < price ? "disabled" : ""}>Buy one batch · ${price} coins</button>` : ""}</div>` : ""}${learned && stockForRecipe(r.id) ? `<button id="recipe-supplies" class="primary">Restock in Supplies</button><p class="cost-note">Basic camp duties need no ingredients.</p>` : learned ? `<label class="creator-field"><span>Result destination</span><select id="craft-supply"><option value="">Create a new ${r.maximumDie ? "supply" : "item"}</option>${r.maximumDie ? matches.map((i) => `<option value="${i.instanceId}" ${supply === i.instanceId ? "selected" : ""}>Replenish ${esc(i.definition.name)} · ${game.supplyValue(h, i) ? "d" + game.supplyValue(h, i) : "empty"}</option>`).join("") : ""}</select></label><button id="craft-recipe" class="primary" ${reason ? "disabled" : ""}>${supply ? "Replenish supply" : "Craft item"} · ${game.recipeTime(h, r)} min</button><p class="cost-note" role="status">${esc(reason || "One ingredient batch will be consumed. Your result goes into this hero’s inventory.")}</p>` : `<p>Learn permanently from a found manuscript, a crafting power, or a Greyhaven artisan.</p><button id="learn-recipe" class="primary" ${game.mode !== "town" || game.campaign.bank < r.learnPrice ? "disabled" : ""}>Learn recipe · ${r.learnPrice} coins</button><p class="cost-note">Knowing a recipe does not consume an ability slot. Higher-level recipes can be learned early and crafted when ready.</p>`}</article></div><footer><button id="recipe-back-supplies">Party supplies</button> Special recipes and ingredient batches stay with their hero. Crafting advances world time. Fatigue, food and water still matter.</footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelector("#recipe-back-supplies").onclick = supplies;
    root.querySelector("#recipe-supplies")?.addEventListener("click", supplies);
    root.querySelector("#artisan").onchange = (e) => {
      hero = +e.target.value;
      supply = "";
      draw();
    };
    root.querySelectorAll("[data-recipe]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.recipe;
          supply = "";
          draw();
        }),
    );
    root.querySelectorAll("[data-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          filter = b.dataset.filter;
          draw();
        }),
    );
    root.querySelector("#recipe-search").oninput = (e) => {
      const pos = e.target.selectionStart;
      query = e.target.value;
      draw();
      const input = root.querySelector("#recipe-search");
      input.focus();
      input.setSelectionRange(pos, pos);
    };
    root.querySelector("#craft-supply")?.addEventListener("change", (e) => {
      supply = e.target.value;
      draw();
    });
    for (const [id, fn] of [
      ["recipe-materials", () => game.buyRecipeMaterials(hero, r.id)],
      ["learn-recipe", () => game.learnRecipe(hero, r.id)],
      ["craft-recipe", () => game.craftRecipe(hero, r.id, supply)],
    ])
      root.querySelector("#" + id)?.addEventListener("click", () =>
        attempt(() => {
          fn();
          draw();
        }),
      );
  }
  draw();
}
