import { esc, icon } from "./icons.mjs";
import { disciplineIcon, abilityType } from "./book-symbols.mjs";
import { coverage } from "../core/abilities.mjs";

export function originGrant(pair, choices) {
  const discipline = choices.find((c) => c.id === pair.disciplineId),
    ability = choices.find((c) => c.id === pair.abilityId);
  return `<div class="origin-grant"><div class="origin-discipline">${disciplineIcon(pair.disciplineId)}<span><small>DISCIPLINE GRANTED</small><strong>${esc(discipline.name)} <b>${pair.rank}</b></strong></span></div><div class="origin-ability">${abilityType(ability)}<span><small>ABILITY GRANTED</small><strong>${esc(ability.name)}</strong></span></div></div>`;
}

export function originPicker({
  root,
  choices,
  type,
  current,
  info,
  choose,
  attempt,
}) {
  const records = choices.filter((c) => c.originType === type),
    name = (id) => choices.find((c) => c.id === id)?.name ?? id,
    overlay = document.createElement("div"),
    opener = root.querySelector(`[data-origin="${type}"]`);
  let selected = records.find((c) => c.id === current?.id) ?? records[0];
  overlay.className = "purchase-overlay origin-overlay";
  overlay.innerHTML = `<section class="origin-window" role="dialog" aria-modal="true" aria-label="Choose ${type}"><header><div><span class="eyebrow">${type === "culture" ? "WHERE YOU GREW UP" : "THE LIFE YOU LEFT"}</span><h2>Choose your ${type}</h2><p>Choose one discipline–ability pair. Both options are shown before you commit.</p></div><button data-close-origin class="icon-button" aria-label="Close ${type} choices">${icon("close")}</button></header><div class="origin-browser"><aside><label class="creator-field"><span>Find your ${type}</span><input id="origin-search" type="search" placeholder="Name, discipline or ability…" aria-label="Search ${type}"></label><p class="origin-count" aria-live="polite"></p><nav class="origin-list" aria-label="${type === "culture" ? "Cultures" : "Backgrounds"}"></nav></aside><main class="origin-detail"></main></div><footer><span>One pair from culture + one pair from background. Duplicate grants follow HoL’s DP refund rules.</span><button data-close-origin>Cancel</button></footer></section>`;
  root.querySelector(".veil").append(overlay);
  const close = () => {
    overlay.remove();
    opener?.focus({ preventScroll: true });
  };
  overlay
    .querySelectorAll("[data-close-origin]")
    .forEach((b) => (b.onclick = close));
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key === "Tab") {
      const controls = [
        ...overlay.querySelectorAll("button,input,summary"),
      ].filter((e) => !e.disabled && e.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  function detail() {
    const target = overlay.querySelector(".origin-detail");
    target.innerHTML = `<div class="origin-detail-heading"><div><span class="eyebrow">${type.toUpperCase()}</span><h3>${esc(selected.name)}</h3></div><span class="origin-coins">${icon("coins")}<b>${selected.coins}</b> starting coins</span></div><p class="origin-choice-hint">Choose <b>one</b> of these two pairs. You receive its discipline rank and ability together.</p><div class="origin-pairs">${selected.pairs
      .map((pair, index) => {
        if (selected.legacyPairCount && index < selected.legacyPairCount)
          return "";
        const ability = choices.find((c) => c.id === pair.abilityId),
          status = coverage(pair.abilityId),
          owned = current?.id === selected.id && current?.pair === index;
        const description =
          (status.status === "included" ? status.reason : null) ??
          ability.reference?.rules?.body?.find((b) => b.text)?.text ??
          "Read the ability’s source rules below.";
        return `<article class="origin-pair ${owned ? "chosen" : ""}" data-origin-pair="${index}"><span class="eyebrow">${owned ? "YOUR CURRENT PAIR" : `OPTION ${index + 1 - (selected.legacyPairCount ?? 0)}`}</span>${originGrant(pair, choices)}<p class="origin-ability-description">${esc(description)}</p><span class="origin-coverage ${status.status === "included" ? "supported" : ""}">${status.status === "included" ? "Supported in the dungeon" : status.status === "excluded" ? "Source ability · Not included in dungeon play" : "Source ability · Dungeon automation pending"}</span>${info(ability)}<button class="primary" data-choose-origin-pair="${index}">${owned ? "Keep this pair" : "Choose this pair"}</button></article>`;
      })
      .join("")}</div>`;
    target.scrollTop = 0;
    target.querySelectorAll("[data-choose-origin-pair]").forEach(
      (b) =>
        (b.onclick = () =>
          attempt(() => {
            overlay.remove();
            choose({ id: selected.id, pair: +b.dataset.chooseOriginPair });
            root
              .querySelector(`[data-origin="${type}"]`)
              ?.focus({ preventScroll: true });
          })),
    );
  }
  function list() {
    const query = overlay
        .querySelector("#origin-search")
        .value.trim()
        .toLowerCase(),
      matches = records.filter((c) =>
        [
          c.name,
          ...c.pairs.flatMap((p) => [name(p.disciplineId), name(p.abilityId)]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    overlay.querySelector(".origin-count").textContent =
      `${matches.length} of ${records.length} ${type === "culture" ? "cultures" : "backgrounds"}`;
    overlay.querySelector(".origin-list").innerHTML =
      matches
        .map(
          (c) =>
            `<button data-browse-origin="${c.id}" aria-pressed="${c.id === selected.id}" class="${c.id === selected.id ? "chosen" : ""}"><strong>${esc(c.name)}</strong>${c.pairs
              .filter((p) => !c.legacyPairCount || p.gamePower)
              .map(
                (pair) =>
                  `<span>${disciplineIcon(pair.disciplineId)}<span><b>${esc(name(pair.disciplineId))} ${pair.rank}</b><small>${esc(name(pair.abilityId))}</small></span></span>`,
              )
              .join("")}</button>`,
        )
        .join("") ||
      '<p class="empty-state">No matching origins. Try another name, discipline or ability.</p>';
    overlay.querySelectorAll("[data-browse-origin]").forEach(
      (b) =>
        (b.onclick = () => {
          selected = records.find((c) => c.id === b.dataset.browseOrigin);
          list();
          detail();
          overlay
            .querySelector(`[data-browse-origin="${selected.id}"]`)
            ?.focus();
        }),
    );
    // Keep the detail aligned with the filtered list; searching never grants a choice.
    if (matches.length && !matches.includes(selected)) {
      selected = matches[0];
      list();
      detail();
    } else if (!matches.length)
      overlay.querySelector(".origin-detail").innerHTML =
        '<p class="empty-state">Change your search to compare grant pairs.</p>';
    else if (!overlay.querySelector(".origin-pairs")) detail();
  }
  detail();
  list();
  overlay.querySelector("#origin-search").oninput = list;
  overlay.querySelector("#origin-search").focus();
}
