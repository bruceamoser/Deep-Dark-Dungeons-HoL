import { disciplineStrip } from "./book-symbols.mjs";
import { FORGE_NODE } from "../core/forge-catalog.mjs";
import { esc } from "./icons.mjs";
export function buildPanel(host, { game, index, train }) {
  const h = game.party[index],
    p = h.preview;
  const labels = {
    hp: "Maximum HP",
    capacity: "Carrying capacity",
    movement: "Movement",
    rangedRange: "Bow range",
    heal: "HP restored",
    healingWard: "Barrier on healing",
    barrier: "Barrier strength",
    reduction: "Damage reduction",
    physical: "Physical damage",
    fire: "Fire damage",
    radiant: "Radiant damage",
    mental: "Mental damage",
    lightning: "Lightning damage",
    burning: "Burning applied",
    freezing: "Freezing applied",
    bleeding: "Bleeding applied",
    dazed: "Dazed applied",
    burningDamage: "Damage vs Burning",
    impact: "Wall impact damage",
    critical: "Strong-hit damage",
    ambush: "Concealed-hit damage",
    flanker: "Flanking damage",
    moveDamage: "Damage after moving",
    killHeal: "HP per kill",
    killMove: "Movement per kill",
    shatter: "Shatter bonus",
    chain: "Wet lightning bonus",
    rallyMove: "Movement on healing",
    craftSpeed: "Crafting time reduction",
    craftDiscount: "Ingredient discount",
    damage: "All direct damage",
    venom: "Poison on weapon hits",
    permafrost: "Freezing on cold hits",
  };
  const benefits = Object.entries(p.forge.stats)
    .map(
      ([key, value]) =>
        `<span>${esc(labels[key] ?? key)}<b>${value > 0 ? "+" : ""}${key.startsWith("craft") ? Math.round(value * 100) + "%" : value}</b></span>`,
    )
    .join("");
  host.innerHTML = `<section class="build-forge"><div class="forge-summary-hero"><span class="eyebrow">THE DISCIPLINE FORGE</span><h3>${p.development.current} DP · Countless directions</h3><p>Follow circular paths, improve your techniques and join disciplines at their confluences. Every touching circle is required to unlock a combined skill.</p><div class="forge-summary-actions"><button id="open-build-forge" class="primary">Open discipline atlas</button>${h.earnedLevel > p.state.level ? `<span class="cost-note">Level ${h.earnedLevel} is ready to train · +${(h.earnedLevel - p.state.level) * 4} DP</span>` : ""}</div>${disciplineStrip(p.state, game.C.choices)}</div><h3 class="subheading">Your foundation</h3><div class="forge-stats"><span>Trained level<b>${p.state.level}</b></span><span>Melee profile<b>${p.forge.profiles.melee.join("/")}</b></span><span>Bow profile<b>${p.forge.profiles.ranged.join("/")}</b></span><span>Purchased circles<b>${h.draft.forge.nodes.length}</b></span><span>DP spent<b>${p.development.spent}</b></span></div>${benefits ? `<h3 class="subheading">Path bonuses</h3><div class="forge-stats">${benefits}</div>` : ""}<h3 class="subheading">Learned techniques</h3><div class="forge-owned-powers">${
    h.draft.forge.nodes
      .map((id) => FORGE_NODE[id])
      .filter((n) => n.power)
      .map(
        (n) =>
          `<article><h4>${esc(n.name)}</h4><p>${esc(game.powerSpec(n.power, h).description)} ${esc(n.bonusText ?? "")}</p><small>${esc(n.discipline ?? n.disciplines.join(" + "))}</small></article>`,
      )
      .join("") || "<p>Open the atlas to learn your first technique.</p>"
  }</div><h3 class="subheading">Battlefield combinations</h3><div class="combo-guide"><p><b>Shatter</b> Physical hits consume one Freezing stack for +2 damage. Frost paths improve this.</p><p><b>Conduct</b> Lightning hitting water arcs to nearby enemies. Storm paths increase the arc damage.</p><p><b>Wall slam</b> A blocked push deals 2 + unused push distance physical damage. Impact paths amplify it.</p><p><b>Stack & exploit</b> Burning, Bleeding and other severity conditions accumulate. Concealment, flanking and movement create openings.</p></div></section>`;
  host.querySelector("#open-build-forge").onclick = () => train(index);
}
