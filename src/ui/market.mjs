import { MERCHANTS } from "../core/market.mjs";
import { icon, itemIcon, esc } from "./icons.mjs";
import { enchantmentDetails } from "./treasure.mjs";
export function marketScreen({ root, game, close, attempt }) {
  let selected = "general",
    hero = game.selected,
    mode = "buy";
  function draw() {
    const m = MERCHANTS.find((m) => m.id === selected),
      h = game.party[hero],
      stock = game.market().stock[selected];
    root.innerHTML = `<div class="veil"><section class="market-window" role="dialog" aria-label="Greyhaven merchants"><header><div><span class="eyebrow">THE MARKET OF GREYHAVEN</span><h2>Trade by lanternlight</h2></div><span class="market-purse">${icon("coins")} ${game.campaign.bank} <small>COINS</small></span><button class="icon-button close" aria-label="Close">${icon("close")}</button></header><div class="market-body"><nav class="merchant-list">${MERCHANTS.map((t) => `<button data-merchant="${t.id}" class="${selected === t.id ? "chosen" : ""}">${icon(t.icon)}<span>${esc(t.trade)}<small>${esc(t.name)}</small></span></button>`).join("")}</nav><main><div class="merchant-intro"><span class="eyebrow">${esc(m.name)}</span><h3>${esc(m.shop)}</h3><p>“${esc(m.quote)}”</p></div><div class="market-toolbar"><div class="filter-tabs"><button data-market-mode="buy" class="${mode === "buy" ? "chosen" : ""}">Buy</button><button data-market-mode="sell" class="${mode === "sell" ? "chosen" : ""}">Sell</button></div><label>For <select id="market-hero">${game.party.map((p, i) => `<option value="${i}" ${i === hero ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label></div><div class="market-stock">${
      mode === "buy"
        ? stock
            .map(
              (e) =>
                `<article class="stock-card ${e.item.rarity ?? ""}"><div class="stock-title">${icon(itemIcon(e.item))}<div><h4>${esc(e.item.definition.name)}</h4><small>${e.item.bulk} Bulk · ${e.quantity} in stock</small></div></div>${enchantmentDetails(h, e.item)}${e.item.kind === "scroll" ? "<p>A two-way passage to town. Read outside combat with a free hand; return to the same preserved floor.</p>" : ""}<button data-buy="${esc(e.id)}" ${!e.quantity || game.campaign.bank < game.buyPrice(h, e.item) ? "disabled" : ""}>${icon("coins")} ${game.buyPrice(h, e.item)} · Buy</button></article>`,
            )
            .join("")
        : h.preview.inventory.items
            .filter((i) => i.carried && i.definition.price > 0)
            .map(
              (i) =>
                `<article class="stock-card"><div class="stock-title">${icon(itemIcon(i))}<div><h4>${esc(i.definition.name)}</h4><small>${i.held || i.worn ? "Remove or stow before selling" : "Your sale price"}</small></div></div><button data-sell="${esc(i.instanceId)}" ${i.held || i.worn ? "disabled" : ""}>Sell · ${game.sellPrice(h, i)} coins</button></article>`,
            )
            .join("")
    }</div></main></div><footer>Stock refreshes when a new expedition begins. Buying equipment grants no training or discipline ranks.</footer></section></div>`;
    root.querySelector(".close").onclick = close;
    root.querySelectorAll("[data-merchant]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.merchant;
          draw();
        }),
    );
    root.querySelectorAll("[data-market-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          mode = b.dataset.marketMode;
          draw();
        }),
    );
    root.querySelector("#market-hero").onchange = (e) => {
      hero = +e.target.value;
      draw();
    };
    root.querySelectorAll("[data-buy]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.buy(selected, b.dataset.buy, hero);
            draw();
          })),
    );
    root.querySelectorAll("[data-sell]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            game.sell(selected, hero, b.dataset.sell);
            draw();
          })),
    );
  }
  draw();
}
