import {
  BUILD_BRANCHES,
  TALENTS,
  masteryBudget,
  masterySpent,
  specializationOptions,
} from "../core/builds.mjs";
import { POWERS } from "../core/powers.mjs";
import { esc } from "./icons.mjs";
import { disciplineIcon } from "./book-symbols.mjs";

export function buildPanel(host, { game, index, attempt, train }) {
  let branch = "steel",
    selected = "";
  const draw = () => {
    const h = game.party[index],
      remaining = masteryBudget(h) - masterySpent(h),
      safe = game.mode === "town";
    const learned = game
      .powerIds(h)
      .map((id) => POWERS[id])
      .filter((p) => specializationOptions(p).length);
    selected ||= learned[0]?.id ?? "";
    const current = h.build?.specializations?.[selected] ?? "";
    const stats = [
      ...new Set([
        ...Object.values(TALENTS).flatMap((n) => Object.keys(n.stats)),
        ...game
          .powerIds(h)
          .flatMap((id) => Object.keys(POWERS[id]?.buildStats ?? {})),
        ...(h.preview.equipmentEffects ?? [])
          .filter((e) => e.effect === "build")
          .map((e) => e.stat),
      ]),
    ]
      .map((k) => [k, game.buildStat(h, k)])
      .filter(([, v]) => v);
    const names = {
      attack: "Attack Boons",
      defense: "Defense Boons",
      mental: "Mental damage",
      poisoned: "Poisoned applied",
      physical: "Physical damage",
      fire: "Fire damage",
      cold: "Cold damage",
      lightning: "Lightning damage",
      critical: "Strong-hit damage",
      impact: "Wall impact",
      movement: "Movement",
      burning: "Burning applied",
      bleeding: "Bleeding applied",
      barrier: "Barriers",
      heal: "Healing",
      reduction: "Damage reduction",
      dr: "Physical DR",
      flanker: "Flanking damage",
      ambush: "Concealed-hit damage",
      spell: "Spell damage",
      moveDamage: "Damage after moving",
      damage: "Direct damage",
      shatter: "Shatter damage",
      chain: "Wet chain damage",
      killHeal: "HP per kill",
      killMove: "Movement per kill",
      wildfire: "Wildfire enabled",
      venom: "Poison on weapon hit",
      permafrost: "Freezing on cold hit",
      burningDamage: "Damage vs Burning",
      healingWard: "Barrier on healing",
      rallyMove: "Movement on healing",
    };
    host.innerHTML = `<section class="build-forge"><div class="section-heading"><div><span class="eyebrow">MAKE YOUR OWN MONSTER</span><h3>Build forge</h3></div><div class="mastery-total"><b>${remaining}</b><span>MASTERY AVAILABLE</span></div></div><p class="section-intro">Two points at level 1, two more per trained level. Each talent rank or specialized power costs one point. Refund freely in Greyhaven. Capstones require level 4 and three basic ranks in their branch.</p>${h.earnedLevel > h.preview.state.level ? `<button id="build-level-up" class="primary" ${safe ? "" : "disabled"}>Apply earned level ${h.earnedLevel} · gain mastery and DP</button>` : ""}<div class="build-stats">${stats.map(([k, v]) => `<span><b>${v > 0 ? "+" : ""}${v}</b>${esc(names[k] ?? k)}</span>`).join("") || "Your first investment starts your build."}</div><nav class="build-branches">${BUILD_BRANCHES.map(([id, name, icon]) => `<button data-branch="${id}" class="${id === branch ? "chosen" : ""}">${disciplineIcon(`discipline-${icon}`)}${esc(name)}</button>`).join("")}</nav><div class="talent-grid">${Object.values(
      TALENTS,
    )
      .filter((n) => n.branch === branch)
      .map((n) => {
        const rank = h.build?.talents?.[n.id] ?? 0;
        const basic = Object.entries(h.build?.talents ?? {})
          .filter(
            ([id]) => TALENTS[id]?.branch === branch && !TALENTS[id]?.capstone,
          )
          .reduce((s, [, r]) => s + r, 0);
        const blocked =
          !safe ||
          !remaining ||
          rank >= n.maxRank ||
          h.preview.state.level < n.level ||
          (n.capstone &&
            (basic < 3 ||
              Object.keys(h.build?.talents ?? {}).some(
                (id) =>
                  TALENTS[id]?.branch === branch &&
                  TALENTS[id]?.capstone &&
                  id !== n.id,
              )));
        return `<article class="talent-node ${rank ? "invested" : ""} ${n.capstone ? "capstone" : ""}" data-talent-card="${n.id}"><small>${n.capstone ? "◆ CAPSTONE · LEVEL 4" : "MASTERY"}</small><h4>${esc(n.name)}</h4><p>${esc(n.text)}</p><footer><button data-refund="${n.id}" aria-label="Refund ${esc(n.name)}" ${!safe || !rank ? "disabled" : ""}>−</button><strong>${rank} / ${n.maxRank}</strong><button data-invest="${n.id}" aria-label="Invest in ${esc(n.name)}" ${blocked ? "disabled" : ""}>+</button></footer></article>`;
      })
      .join(
        "",
      )}</div><div class="specialization-heading"><h3>Shape your skills</h3><span>1 MASTERY EACH · ONE SPECIALIZATION PER POWER</span></div><select id="specialize-power" aria-label="Power to specialize">${learned.map((p) => `<option value="${p.id}" ${selected === p.id ? "selected" : ""}>${esc(p.name)}${h.build?.specializations?.[p.id] ? " · specialized" : ""}</option>`).join("")}</select><p class="section-intro">${esc(POWERS[selected]?.description ?? "Learn powers to unlock specializations.")}</p><div class="specialization-grid">${specializationOptions(
      POWERS[selected],
    )
      .map(
        (s) =>
          `<button data-specialize="${s.id}" class="${s.id === current ? "chosen" : ""}" ${!safe || (!remaining && !current) ? "disabled" : ""}><strong>${esc(s.name)}${s.id === current ? " ◆" : ""}</strong><span>${esc(s.text)}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="build-controls"><button id="clear-specialization" ${!safe || !current ? "disabled" : ""}>Refund specialization</button><button id="reset-mastery" ${!safe || !masterySpent(h) ? "disabled" : ""}>Refund all mastery · free</button></div><p class="cost-note">${safe ? "Changes apply immediately. Skill range and action previews include your specialization. Refund a capstone before its required ranks." : "Inspect your build here; return to Greyhaven to make changes."}</p><h3>Combat combinations</h3><div class="combo-guide"><p><b>Shatter</b> Physical hits against Freezing consume one stack for +2 damage, before your build bonuses.</p><p><b>Conduct</b> Lightning hitting a creature in water arcs for 2 damage to nearby enemies. Conductor and Storm relics increase it.</p><p><b>Wall slam</b> A blocked push deals 2 + unused push distance physical damage. Impact builds amplify it.</p><p><b>Stack & exploit</b> Burning, Bleeding and other severity conditions accumulate. Hide before an ambush, flank with an ally, or move before a Stormrunner strike.</p></div></section>`;
    const change = (edit) =>
      attempt(() => {
        const top = host.scrollTop;
        game.editBuild(index, edit);
        draw();
        host.scrollTop = top;
      });
    host.querySelectorAll("[data-branch]").forEach(
      (b) =>
        (b.onclick = () => {
          branch = b.dataset.branch;
          draw();
        }),
    );
    host
      .querySelectorAll("[data-invest]")
      .forEach(
        (b) =>
          (b.onclick = () => change({ talent: b.dataset.invest, delta: 1 })),
      );
    host
      .querySelectorAll("[data-refund]")
      .forEach(
        (b) =>
          (b.onclick = () => change({ talent: b.dataset.refund, delta: -1 })),
      );
    host.querySelector("#specialize-power").onchange = (e) => {
      selected = e.target.value;
      draw();
    };
    host
      .querySelectorAll("[data-specialize]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            change({ power: selected, specialization: b.dataset.specialize })),
      );
    host.querySelector("#clear-specialization").onclick = () =>
      change({ power: selected, specialization: "" });
    host.querySelector("#reset-mastery").onclick = () =>
      change({ reset: true });
    host
      .querySelector("#build-level-up")
      ?.addEventListener("click", () => train(index));
  };
  draw();
}
