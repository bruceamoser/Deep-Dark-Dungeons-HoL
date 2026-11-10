import { recipeBook } from "./recipes.mjs";
import { CRAFT_MATERIALS } from "../core/crafting.mjs";
import { esc, icon } from "./icons.mjs";
export function workshopScreen({ root, game, close, attempt, supplies }) {
  if (game.C.gamePowers)
    return recipeBook({ root, game, close, attempt, supplies });
  let hero = game.selected,
    selected = "",
    supply = "";
  function draw() {
    const h = game.party[hero],
      options = game
        .craftingOptions(hero)
        .filter(
          (o, i, all) =>
            all.findIndex((p) => p.recipe.id === o.recipe.id) === i,
        );
    selected = options.some(
      (o) => `${o.recipe.id}/${o.ability.id}` === selected,
    )
      ? selected
      : options[0]
        ? `${options[0].recipe.id}/${options[0].ability.id}`
        : "";
    const choice = options.find(
        (o) => `${o.recipe.id}/${o.ability.id}` === selected,
      ),
      material = choice && CRAFT_MATERIALS[choice.recipe.id];
    const matches = choice
      ? h.preview.inventory.items.filter(
          (i) => i.carried && i.catalogId === choice.recipe.product,
        )
      : [];
    if (!matches.some((i) => i.instanceId === supply)) supply = "";
    const reason = choice
      ? game.craftReason(hero, choice.recipe.id, choice.ability.id, supply)
      : "";
    root.innerHTML = `<div class="veil"><section class="camp-window workshop-window" role="dialog" aria-label="Downtime workshop"><header><div><span class="eyebrow">GREYHAVEN · DOWNTIME</span><h2>The workshop</h2></div><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="camp-clock"><label>Artisan <select id="artisan">${game.party.map((p, i) => `<option value="${i}" ${i === hero ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><b>${game.campaign.bank} vault coins</b><small>One hour per attempt · Tools & materials required</small></div><div class="workshop-layout"><nav>${options.map((o) => `<button data-recipe="${o.recipe.id}/${o.ability.id}" class="${selected === `${o.recipe.id}/${o.ability.id}` ? "chosen" : ""}">${esc(o.recipe.name)}<small>${esc(o.ability.name)}</small></button>`).join("") || "<p>No supported recipes known. Learn Trail Workshop, Make Something Useful or Bottled Morning and choose recipes during training.</p>"}</nav><article>${choice ? `<span class="eyebrow">${esc(choice.ability.name)}</span><h3>${esc(choice.recipe.name)}</h3><p>${choice.recipe.maximumDie ? `Make a new supply or refill an existing one, up to d${choice.recipe.maximumDie}.` : `Accumulate ${choice.recipe.target} progress to finish one item.`} ${choice.ability.id === "ability-bottled-morning" && choice.recipe.id === "recipe-lesser-healing-bottle" ? "No roll is required." : "Knowledge: Weak 1, Standard 2, Strong 3 steps."}</p><p>Requires ${esc(material.name)} and ${material.tool === "either" ? "craft tools or a mixing kit" : material.tool.replace("item-", "").replaceAll("-", " ")}.</p><div class="material-purchase"><b>Materials · d6</b><button id="materials" ${game.campaign.bank < Math.ceil(material.price * Math.min(1, ...game.traits(h).map((t) => t.buyRate ?? 1))) ? "disabled" : ""}>Buy · ${Math.ceil(material.price * Math.min(1, ...game.traits(h).map((t) => t.buyRate ?? 1)))} coins</button></div><p>Each attempt uses and checks one compatible material supply. Ingredients are never free.</p>${choice.recipe.maximumDie ? `<label class="creator-field"><span>Result destination</span><select id="craft-supply"><option value="">Make a new supply</option>${matches.map((i) => `<option value="${esc(i.instanceId)}" ${i.instanceId === supply ? "selected" : ""}>${esc(i.definition.name)} · ${game.supplyValue(h, i) ? "d" + game.supplyValue(h, i) : "Empty"}</option>`).join("")}</select></label>` : `<p>Progress: ${h.draft.play?.crafting?.[choice.recipe.id]?.progress ?? 0}/${choice.recipe.target}</p>`}<button id="craft" class="primary" ${reason ? "disabled" : ""}>Work for one hour</button><p class="cost-note">${esc(reason || "The result appears in this hero’s inventory.")}</p>` : "<h3>Knowledge becomes equipment</h3><p>Choose an artisan with a learned recipe and the matching crafting permission.</p>"}</article></div><footer>Materials are named for a specific recipe. Specialist healing ingredients use the book’s 80-coin price. Crafting spends world time; daily needs still apply.</footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelector("#artisan").onchange = (e) => {
      hero = +e.target.value;
      selected = "";
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
    root.querySelector("#materials")?.addEventListener("click", () =>
      attempt(() => {
        game.buyMaterials(hero, choice.recipe.id);
        draw();
      }),
    );
    root.querySelector("#craft-supply")?.addEventListener("change", (e) => {
      supply = e.target.value;
      draw();
    });
    root.querySelector("#craft")?.addEventListener("click", () =>
      attempt(() => {
        game.craft(hero, choice.recipe.id, choice.ability.id, supply);
        draw();
      }),
    );
  }
  draw();
}
