import {
  viewNodePosition,
  viewDisciplinePosition as disciplinePosition,
  nodeRadius,
  PATH_OFFSET,
  avoidLabelOverlap,
} from "./forge-view-layout.mjs";
import {
  FORGE_DISCIPLINES as DISCIPLINES,
  FORGE_NODES as NODES,
  FORGE_PATHS as PATHS,
  FORGE_NODE as NODE,
} from "../core/forge-catalog.mjs";
import {
  forgeOwned,
  forgeBudget,
  forgeSpent,
  forgeRanks,
  forgeRequirements,
  forgeRefundPlan,
  forgeCharacter,
  forgePower,
  forgePowerText,
} from "../core/forge.mjs";
import { POWERS } from "../core/powers.mjs";
import { esc, icon } from "./icons.mjs";
import { disciplineIcon, abilityType } from "./book-symbols.mjs";
import "./forge.css";
const roman = ["", "I", "II", "III"];
const point = viewNodePosition,
  radius = nodeRadius;
export function forgeScreen({
  root,
  game,
  C,
  index,
  draft: initial,
  onChange,
  close,
  attempt = (fn) => fn(),
}) {
  let draft = initial ?? game.party[index].draft,
    selected = null,
    refund = null,
    search = "",
    focus = null,
    columns = false,
    scale = 0.26,
    tx = 0,
    ty = 0,
    drag = null,
    moved = false,
    disposed = false;
  const live = () => !onChange,
    readOnly = () => (live() ? game.forgeReason(index) : ""),
    owned = () => forgeOwned(draft, C);
  root.innerHTML = `<div class="veil forge-veil"><section class="forge-window" role="dialog" aria-modal="true" aria-label="Discipline forge"><header class="forge-header"><div><span class="eyebrow">THE DISCIPLINE FORGE</span><h2>${esc(draft.name || "Your unwritten legend")}</h2></div><div class="forge-currency"></div><button class="icon-button forge-close" aria-label="Close forge">${icon("close")}</button></header><div class="forge-layout"><aside class="forge-library"><label class="forge-search"><span class="eyebrow">FIND A PATH</span><input type="search" placeholder="Search nodes or disciplines" aria-label="Search forge"></label><div class="forge-results"></div><nav class="forge-disciplines"></nav></aside><main class="forge-canvas"><div class="forge-map-tools"><button data-view="fit">Whole atlas</button><button data-view="owned">My disciplines</button><button data-view="columns">Column view</button><button data-view="in" aria-label="Zoom in">+</button><button data-view="out" aria-label="Zoom out">−</button><span class="forge-zoom"></span></div><svg class="forge-svg" aria-label="Discipline paths" role="img"><defs><radialGradient id="forge-disc-glow"><stop stop-color="#c6a054" stop-opacity=".09"/><stop offset="1" stop-color="#c6a054" stop-opacity="0"/></radialGradient></defs><g class="forge-world"></g></svg><div class="forge-path-view" hidden></div><div class="forge-map-caption"><strong>18 DISCIPLINES · 72 PATHS · 33 CONFLUENCES</strong><span>Drag to explore · Wheel to zoom · Select a circle to inspect</span></div><div class="forge-legend"><span class="learned">◆ Learned</span><span class="available">○ Available</span><span>○ Locked</span><span>◎ All border contacts required</span></div></main><aside class="forge-inspector"></aside></div><footer class="forge-footer"><span class="forge-status"></span><button class="forge-reset">Refund purchased nodes</button></footer></section></div>`;
  const svg = root.querySelector(".forge-svg"),
    world = root.querySelector(".forge-world"),
    inspector = root.querySelector(".forge-inspector"),
    pathView = root.querySelector(".forge-path-view"),
    canvas = root.querySelector(".forge-canvas");
  const bounds = () => svg.getBoundingClientRect();
  function transform() {
    world.setAttribute("transform", `translate(${tx} ${ty}) scale(${scale})`);
    svg.classList.toggle("detail", scale > 0.5);
    world
      .querySelectorAll(".forge-discipline-name")
      .forEach((t) => (t.style.fontSize = `${Math.max(22, 11 / scale)}px`));
    world
      .querySelectorAll(".forge-path-name")
      .forEach((t) => (t.style.fontSize = `${11 / scale}px`));
    const b = bounds();
    avoidLabelOverlap({
      world,
      nodes: NODES,
      nodeById: NODE,
      point,
      scale,
      tx,
      ty,
      width: b.width,
      height: b.height,
      selected,
      focus,
    });
    root.querySelector(".forge-zoom").textContent =
      `${Math.round(scale * 100)}%`;
  }
  function center(p, s = 1.05) {
    const b = bounds();
    scale = s;
    tx = b.width / 2 - p.x * scale;
    ty = (b.height - 70) / 2 - p.y * scale;
    transform();
  }
  function fit() {
    columns = false;
    svg.removeAttribute("hidden");
    pathView.hidden = true;
    canvas.classList.remove("column-view");
    const b = bounds();
    center(
      { x: 0, y: 0 },
      Math.max(0.08, Math.min(b.width - 40, b.height - 120) / 5200),
    );
    focus = null;
  }
  function zoom(factor, x = bounds().width / 2, y = bounds().height / 2) {
    const next = Math.max(0.08, Math.min(2.2, scale * factor));
    tx = x - ((x - tx) * next) / scale;
    ty = y - ((y - ty) * next) / scale;
    scale = next;
    transform();
  }
  function inspect(id, { jump = false } = {}) {
    selected = id;
    refund = null;
    if (jump) {
      focus =
        NODE[id].discipline ??
        (NODE[id].disciplines.includes(focus)
          ? focus
          : NODE[id].disciplines[0]);
      if (!columns)
        center(point(NODE[id]), NODE[id].kind === "intersection" ? 1.1 : 1.2);
    }
    draw();
  }
  function perform(fn) {
    attempt(() => {
      fn();
      if (live()) draft = game.party[index].draft;
      else onChange(structuredClone(draft));
      refund = null;
      draw();
    });
  }
  function buy(id) {
    perform(() => {
      if (live()) game.editForge(index, { buy: id });
      else {
        const reasons = forgeRequirements(NODE[id], draft, C);
        if (reasons.length) throw new Error(reasons.join(" "));
        draft = structuredClone(draft);
        draft.forge.nodes.push(id);
      }
    });
  }
  function refundCommit() {
    const plan = refund;
    perform(() => {
      if (live())
        game.editForge(index, { refund: plan.id, reset: plan.id === null });
      else draft = plan.draft;
    });
  }
  const stateClass = (n, set) =>
    set.has(n.id)
      ? "learned"
      : forgeRequirements(n, draft, C).length
        ? "locked"
        : "available";
  function draw() {
    if (disposed) return;
    const set = owned(),
      ranks = forgeRanks(draft, C),
      remaining = forgeBudget(draft, C) - forgeSpent(draft),
      h = live() ? game.party[index] : null;
    root.querySelector(".forge-currency").innerHTML =
      `<span>LEVEL ${draft.progression.level}</span><b>${remaining}</b><span>DP AVAILABLE</span>${h && h.earnedLevel > h.preview.state.level ? `<button class="primary forge-train" ${readOnly() ? "disabled" : ""}>Train level ${h.earnedLevel} · +${(h.earnedLevel - h.preview.state.level) * 4} DP</button>` : ""}`;
    root
      .querySelector(".forge-train")
      ?.addEventListener("click", () => perform(() => game.trainForge(index)));
    root.querySelector(".forge-status").textContent =
      readOnly() ||
      "8 starting DP · +4 per level · Unspent DP carries forward · Free refunds in Greyhaven";
    root.querySelector(".forge-reset").disabled =
      !!readOnly() || !draft.forge.nodes.length;
    root.querySelector(".forge-disciplines").innerHTML = DISCIPLINES.map(
      (d) =>
        `<button data-discipline="${d.id}" class="${ranks["discipline-" + d.id] ? "owned" : ""} ${focus === d.id ? "chosen" : ""}">${disciplineIcon(d.id)}<span>${d.name}<small>${ranks["discipline-" + d.id] ? "RANK " + roman[ranks["discipline-" + d.id]] : "UNLEARNED · 3 DP"}</small></span></button>`,
    ).join("");
    root.querySelectorAll("[data-discipline]").forEach(
      (b) =>
        (b.onclick = () => {
          focus = b.dataset.discipline;
          selected = focus + ":origin";
          refund = null;
          if (!columns)
            center(
              disciplinePosition(focus),
              Math.min(bounds().width - 60, bounds().height - 140) / 850,
            );
          draw();
        }),
    );
    svg.toggleAttribute("hidden", columns);
    pathView.hidden = !columns;
    canvas.classList.toggle("column-view", columns);
    root.querySelector('[data-view="columns"]').textContent = columns
      ? "Connected tree"
      : "Column view";
    root.querySelector('[data-view="in"]').disabled = columns;
    root.querySelector('[data-view="out"]').disabled = columns;
    if (columns) {
      world.replaceChildren();
      drawColumns(set);
      drawResults();
      drawInspector();
      root.querySelector(".forge-zoom").textContent = "OPTIONAL COLUMNS";
      return;
    }
    pathView.replaceChildren();
    const related = new Set(
      selected
        ? [
            selected,
            ...NODE[selected].requires,
            ...NODES.filter((n) => n.requires.includes(selected)).map(
              (n) => n.id,
            ),
          ]
        : [],
    );
    const connections = NODES.filter((n) => n.kind !== "intersection")
      .flatMap((n) =>
        (n.requires ?? []).map((id) => {
          const a = point(NODE[id]),
            b = point(n);
          const cls = `forge-link ${set.has(id) && set.has(n.id) ? "learned" : ""} ${selected === id || selected === n.id ? "selected-link" : ""}`;
          return n.path && n.path === NODE[id].path
            ? `<path class="${cls}" fill="none" d="M ${a.x} ${a.y} A 105 105 0 0 1 ${b.x} ${b.y}"/>`
            : `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        }),
      )
      .join("");
    const gates = NODES.filter((n) => n.kind === "intersection")
      .map((n) => {
        const p = point(n),
          ready = n.requires.every((id) => set.has(id));
        const contacts = n.requires
          .map((id, i) => {
            const angle = -Math.PI / 2 + (i / n.requires.length) * Math.PI * 2,
              x = p.x + Math.cos(angle) * 56,
              y = p.y + Math.sin(angle) * 56,
              learned = set.has(id);
            return `<line class="forge-contact-line ${learned ? "learned" : ""}" x1="${p.x}" y1="${p.y}" x2="${x}" y2="${y}"/><g role="button" tabindex="0" aria-label="${esc(NODE[id].name)} prerequisite" data-node="${id}" class="forge-contact ${learned ? "learned" : ""}" transform="translate(${x} ${y})"><circle r="12"/><text y="4">${learned ? "✓" : i + 1}</text><title>${esc(NODE[id].name)} · ${learned ? "learned" : "required"}</title></g>`;
          })
          .join("");
        return `<circle class="forge-gate ${ready ? "open" : ""} ${n.tier > 2 ? "greater" : ""}" cx="${p.x}" cy="${p.y}" r="56"/>${contacts}<text class="forge-gate-count" x="${p.x}" y="${p.y + 43}">${n.requires.filter((id) => set.has(id)).length}/${n.requires.length}</text>`;
      })
      .join("");
    const selectedLinks =
      selected && NODE[selected].kind === "intersection"
        ? NODE[selected].requires
            .map((id) => {
              const a = point(NODE[id]),
                b = point(NODE[selected]);
              return `<path class="forge-cross-link ${set.has(id) ? "learned" : ""}" d="M ${a.x} ${a.y} Q ${a.x} ${b.y} ${b.x} ${b.y}"/>`;
            })
            .join("")
        : "";
    world.innerHTML =
      DISCIPLINES.map((d) => {
        const p = disciplinePosition(d.id);
        return `<circle cx="${p.x}" cy="${p.y}" r="385" fill="url(#forge-disc-glow)"/><text class="forge-discipline-name" x="${p.x}" y="${p.y - 395}">${d.name.toUpperCase()}</text>${PATHS.filter(
          (path) => path.discipline === d.id,
        )
          .map((path, i) => {
            const a = -Math.PI / 2 + (i * Math.PI) / 2,
              x = p.x + Math.cos(a) * PATH_OFFSET,
              y = p.y + Math.sin(a) * PATH_OFFSET;
            return `<circle class="forge-path-ring" cx="${x}" cy="${y}" r="105"/><text class="forge-path-name" x="${x}" y="${y + 5}">${esc(path.name)}</text>`;
          })
          .join("")}`;
      }).join("") +
      connections +
      selectedLinks +
      gates +
      NODES.map((n) => {
        const p = point(n),
          r = radius(n),
          category = n.power ? POWERS[n.power]?.category : "passive",
          letter =
            { main: "A", maneuver: "M", reaction: "R", passive: "P" }[
              category
            ] ?? "◆";
        return `<g role="button" tabindex="0" aria-label="${esc(n.name)} · ${stateClass(n, set)}" data-node="${n.id}" data-state="${stateClass(n, set)}" class="forge-node ${n.kind} ${stateClass(n, set)} ${selected === n.id ? "selected" : ""} ${related.has(n.id) ? "related" : ""}" transform="translate(${p.x} ${p.y})"><line class="forge-label-leader" x1="0" y1="0" x2="0" y2="0"/><circle class="node-halo" r="${r + 5}"/><circle class="node-body" r="${r}"/>${n.kind === "origin" ? `<image href="/vendor/hol/assets/${n.discipline}.webp" x="-20" y="-20" width="40" height="40"/>` : `<text y="5">${n.rank ? roman[n.rank] : n.kind === "intersection" ? "✦" : n.power ? letter : set.has(n.id) ? "✓" : "·"}</text>`}<text class="forge-node-label" y="${n.kind === "intersection" ? 92 : r + 20}">${esc(n.name)}</text><title>${esc(n.name)} · ${n.cost} DP · ${stateClass(n, set)}</title></g>`;
      }).join("");
    world.querySelectorAll("[data-node]").forEach((el) => {
      el.onclick = () => {
        if (!moved) inspect(el.dataset.node);
      };
      el.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inspect(el.dataset.node);
        }
      };
    });
    drawResults();
    drawInspector();
    transform();
  }
  function drawColumns(set) {
    const d = DISCIPLINES.find((d) => d.id === focus),
      current = NODE[selected];
    const card = (n) =>
      `<button data-node="${n.id}" data-state="${stateClass(n, set)}" aria-label="${esc(n.name)} · ${stateClass(n, set)}" class="forge-node forge-flow-node ${stateClass(n, set)} ${selected === n.id ? "selected" : ""} ${current?.requires.includes(n.id) ? "required" : ""}"><b>${esc(n.name)}</b><span>${set.has(n.id) ? "✓ Learned" : stateClass(n, set) === "available" ? "Available" : "Locked"}<small>${n.cost} DP · Rank ${roman[n.rank ?? n.minimumRank ?? 1]}</small></span></button>`;
    pathView.innerHTML = `<div class="forge-path-heading">${disciplineIcon(focus)}<div><span class="eyebrow">OPTIONAL COLUMN VIEW · SAME CONNECTED TREE</span><h3>${esc(d.name)}</h3></div></div><div class="forge-rank-row">${[":origin", ":rank2", ":rank3"].map((id) => card(NODE[focus + id])).join("")}</div><div class="forge-path-columns">${PATHS.filter(
      (p) => p.discipline === focus,
    )
      .map(
        (p) =>
          `<section class="forge-path-column"><h4>${esc(p.name)}</h4><ol>${p.nodes.map((id) => `<li>${card(NODE[id])}</li>`).join("")}</ol></section>`,
      )
      .join(
        "",
      )}</div><h4 class="forge-confluence-title">Linked confluences · all contacts required</h4><div class="forge-column-confluences">${NODES.filter(
      (n) => n.kind === "intersection" && n.disciplines.includes(focus),
    )
      .map(
        (n) =>
          `<article>${card(n)}<small>${n.requires.filter((id) => set.has(id)).length}/${n.requires.length} prerequisites learned</small></article>`,
      )
      .join("")}</div>`;
    pathView
      .querySelectorAll("[data-node]")
      .forEach((b) => (b.onclick = () => inspect(b.dataset.node)));
  }
  function drawResults() {
    const results = search.trim()
      ? NODES.filter((n) =>
          (
            n.name +
            " " +
            (n.discipline ?? n.disciplines?.join(" ")) +
            " " +
            (n.description ?? "") +
            " " +
            (n.pathName ?? "")
          )
            .toLowerCase()
            .includes(search.toLowerCase()),
        ).slice(0, 30)
      : [];
    root.querySelector(".forge-results").innerHTML = search
      ? `<small>${results.length ? results.length + " matches" : "No matching nodes"}</small>${results.map((n) => `<button data-result="${n.id}"><span>${esc(n.name)}</span><small>${owned().has(n.id) ? "LEARNED" : n.cost + " DP"} · ${esc(n.discipline ?? "CONFLUENCE")}</small></button>`).join("")}`
      : "";
    root.querySelector(".forge-disciplines").hidden = !!search;
    root
      .querySelectorAll("[data-result]")
      .forEach(
        (b) => (b.onclick = () => inspect(b.dataset.result, { jump: true })),
      );
  }
  function drawInspector() {
    if (refund) {
      inspector.innerHTML = `<span class="eyebrow">REFUND PREVIEW</span><h3>Unravel this path?</h3><p>Refunding returns <b>${refund.refund} DP</b>. These ${refund.removed.length} nodes lose their prerequisites and will be removed together.</p><div class="forge-refund-list">${refund.removed.map((id) => `<span>${esc(NODE[id].name)} <small>${NODE[id].cost} DP</small></span>`).join("")}</div><button class="primary" data-confirm-refund>Refund ${refund.refund} DP</button><button data-cancel-refund>Keep this path</button><p class="cost-note">Equipment and supplies stay with your hero. Refunds do not heal or restore Grit.</p>`;
      inspector.querySelector("[data-confirm-refund]").onclick = refundCommit;
      inspector.querySelector("[data-cancel-refund]").onclick = () => {
        refund = null;
        drawInspector();
      };
      return;
    }
    const n = NODE[selected];
    if (!n) {
      inspector.innerHTML = `<span class="eyebrow">AN ATLAS OF POSSIBILITIES</span><h3>Make your own legend.</h3><p>Each discipline is an origin surrounded by four circular paths. Select a discipline to explore its branches.</p><div class="forge-instructions"><p><b>Follow the circles</b><br>Learn connected nodes with DP. Small circles improve your build. Lettered circles unlock powers.</p><p><b>Bring down the border</b><br>A confluence combines disciplines. Every circle touching its border must be learned before you can buy the central skill.</p><p><b>Broaden your build</b><br>From level 2, spend 3 DP to open another discipline anywhere on the atlas. Rank II unlocks from level 3; rank III from level 7.</p><p><b>A · M · R · P</b><br>Action · Maneuver · Reaction · Passive</p></div>`;
      return;
    }
    const set = owned(),
      learned = set.has(n.id),
      reasons = forgeRequirements(n, draft, C),
      preview = forgeCharacter(draft, C),
      spec = n.power ? forgePower(POWERS[n.power], { draft, preview }) : null;
    const description =
      (spec ? forgePowerText(spec) : n.description) +
      (n.bonusText ? " " + n.bonusText : "");
    inspector.innerHTML = `<span class="eyebrow">${n.kind === "intersection" ? n.tier + " DISCIPLINES · CONFLUENCE" : esc(n.discipline.toUpperCase() + " · " + (n.pathName ?? (n.kind === "origin" ? "ORIGIN" : "DISCIPLINE RANK")))}</span><div class="forge-node-heading">${n.discipline ? disciplineIcon(n.discipline) : '<span class="confluence-sigil">✦</span>'}<h3>${esc(n.name)}</h3></div>${spec ? abilityType({ id: spec.id }, spec) : ""}<p class="forge-effect">${esc(description ?? "")}</p>${n.kind === "intersection" ? '<p class="cost-note">Every touching prerequisite is required. Opening the border makes this skill available to purchase.</p>' : ""}<div class="forge-node-price"><b>${n.cost}</b> DP ${learned ? "<span>◆ LEARNED</span>" : ""}</div>${n.requires.length ? `<h4>${n.kind === "intersection" ? "Border contacts" : "Connected from"}</h4><div class="forge-prerequisites">${n.requires.map((id) => `<button data-prerequisite="${id}" class="${set.has(id) ? "learned" : ""}"><span>${set.has(id) ? "✓" : "○"} ${esc(NODE[id].name)}</span><small>${esc(NODE[id].discipline)} · ${NODE[id].pathName ?? "Origin"}</small></button>`).join("")}</div>` : ""}${!learned && reasons.length ? `<ul class="forge-reasons">${reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}${learned ? `<button data-refund-node ${readOnly() || !draft.forge.nodes.includes(n.id) ? "disabled" : ""}>${draft.forge.nodes.includes(n.id) ? "Preview refund" : "Starting discipline · granted"}</button>` : `<button data-buy-node="${n.id}" class="primary" ${reasons.length || readOnly() ? "disabled" : ""}>Learn ${esc(n.name)} · ${n.cost} DP</button>`}${readOnly() ? `<p class="cost-note">${esc(readOnly())}</p>` : ""}${n.power ? '<p class="cost-note">At will. Action, equipment, positioning and supply requirements still apply. Values include this technique’s upgrades. Traits, gear and situational bonuses also apply.</p>' : ""}`;
    const unlocks = NODES.filter(
      (next) =>
        next.requires.includes(n.id) ||
        (n.kind === "rank" &&
          next.discipline === n.discipline &&
          next.minimumRank === n.rank),
    );
    if (unlocks.length)
      inspector.insertAdjacentHTML(
        "beforeend",
        `<h4>Prerequisite for</h4><div class="forge-prerequisites forge-unlocks">${unlocks.map((next) => `<button data-prerequisite="${next.id}" class="${set.has(next.id) ? "learned" : ""}"><span>${esc(next.name)}</span><small>${esc(next.discipline ?? "Confluence")} · ${set.has(next.id) ? "Learned" : forgeRequirements(next, draft, C).length ? "Other requirements remain" : "Available"}</small></button>`).join("")}</div>`,
      );
    inspector
      .querySelector("[data-buy-node]")
      ?.addEventListener("click", () => buy(n.id));
    inspector
      .querySelector("[data-refund-node]")
      ?.addEventListener("click", () => {
        refund = { ...forgeRefundPlan(draft, C, n.id), id: n.id };
        drawInspector();
      });
    inspector
      .querySelectorAll("[data-prerequisite]")
      .forEach(
        (b) =>
          (b.onclick = () => inspect(b.dataset.prerequisite, { jump: true })),
      );
  }
  root.querySelector(".forge-close").onclick = close;
  root.querySelector(".forge-search input").oninput = (e) => {
    search = e.target.value;
    drawResults();
  };
  root.querySelector(".forge-reset").onclick = () => {
    refund = { ...forgeRefundPlan(draft, C), id: null };
    drawInspector();
  };
  root.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        if (b.dataset.view === "columns") {
          columns = !columns;
          focus ??=
            NODE[selected]?.discipline ??
            DISCIPLINES.find((d) => owned().has(d.id + ":origin"))?.id ??
            "arms";
          if (!columns) {
            svg.removeAttribute("hidden");
            center(
              disciplinePosition(focus),
              Math.min(bounds().width - 60, bounds().height - 140) / 850,
            );
          }
          draw();
        } else if (b.dataset.view === "fit") {
          fit();
          draw();
        } else if (b.dataset.view === "owned") {
          const d = DISCIPLINES.find((d) => owned().has(d.id + ":origin"));
          if (d) {
            focus = d.id;
            selected = d.id + ":origin";
            center(
              disciplinePosition(d.id),
              Math.min(bounds().width - 60, bounds().height - 140) / 850,
            );
            draw();
          }
        } else zoom(b.dataset.view === "in" ? 1.3 : 1 / 1.3);
      }),
  );
  svg.oncontextmenu = (e) => e.preventDefault();
  svg.onpointerdown = (e) => {
    if (![0, 2].includes(e.button)) return;
    moved = false;
    drag = { x: e.clientX, y: e.clientY, tx, ty };
    if (e.button === 2) e.preventDefault();
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) moved = true;
    if (moved) {
      tx = drag.tx + dx;
      ty = drag.ty + dy;
      transform();
    }
  };
  const up = () => {
    drag = null;
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const b = bounds();
      zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - b.left, e.clientY - b.top);
    },
    { passive: false },
  );
  const resize = new ResizeObserver(() => {
    if (!disposed && !columns && scale <= 0.3) fit();
  });
  resize.observe(svg);
  draw();
  fit();
  return () => {
    disposed = true;
    resize.disconnect();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
}
