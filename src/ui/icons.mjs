export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  hat: "M4 17 8 4l4 5 4-5 4 13M2 18h20M4 21h16",
  belt: "M2 8h20v8H2zM9 7h6v10H9zM12 12h6",
  ring: "M16 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0M7 5l3-3 3 3-3 5z",
  necklace: "M4 3c0 12 16 12 16 0M12 12l4 5-4 5-4-5z",
  plus: "M12 4v16M4 12h16",
  search: "M16 16l6 6M18 10a8 8 0 1 1-16 0 8 8 0 1 1 16 0",
  sword: "M5 19 17 7M14 4l6-1-1 6-9 9-4-4zM3 15l6 6M3 21l3-3",
  bow: "M6 3c15 2 15 16 0 18l4-9zM3 12h18m-4-3 4 3-4 3",
  shield: "M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6zM12 6v12",
  armor: "M8 3 3 6l2 6 2-1-1 10h12l-1-10 2 1 2-6-5-3-4 3zM8 11h8M8 15h8",
  pack: "M7 7V5a5 5 0 0 1 10 0v2M5 7h14l2 14H3zM8 12h8v5H8z",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  flame:
    "M13 2c1 6-4 7-2 11 2-1 4-3 4-5 7 7 5 14-3 14C3 22 1 13 7 9c-1 5 2 5 2 3 0-4 3-6 4-10z",
  frost:
    "M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4M8 20l4-4 4 4M3 11l5-1-1-5M17 19l-1-5 5-1M3 13l5 1-1 5M17 5l-1 5 5 1",
  hand: "M8 12V5a1 1 0 0 1 2 0v6-8a1 1 0 0 1 2 0v8-7a1 1 0 0 1 2 0v8-5a1 1 0 0 1 2 0v9l-2 5H8l-5-7a2 2 0 0 1 3-2z",
  heart: "M12 21S1 14 2 7c1-6 8-6 10-1 2-5 9-5 10 1 1 7-10 14-10 14z",
  bolt: "m13 2-9 12h7l-1 8 10-13h-8z",
  boot: "M7 2h9v11l5 4v4H3v-7h5zM3 17h18",
  book: "M12 5C7 2 3 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1zM12 5v16",
  coins:
    "M18 6c0 3-16 3-16 0s16-3 16 0zM2 6v5c0 3 16 3 16 0V6M2 11v5c0 3 16 3 16 0v-5M18 10h4v10c-2 2-8 2-10 1",
  potion: "M9 2h6M9 2v6L4 18q-1 4 3 4h10q4 0 3-4L15 8V2M7 15h10",
  eye: "M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  close: "m5 5 14 14M5 19 19 5",
  arrow: "M4 12h16m-6-6 6 6-6 6",
};
export const icon = (name, cls = "") =>
  `<svg class="glyph ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.book}"/></svg>`;
export function itemIcon(item) {
  if (item.icon) return item.icon;
  const id = item.catalogId ?? item.id;
  return /ranged|ammunition/.test(id)
    ? "bow"
    : /melee/.test(id)
      ? "sword"
      : /armor|clothes/.test(id)
        ? "armor"
        : /shield/.test(id)
          ? "shield"
          : /potion/.test(id)
            ? "potion"
            : "pack";
}
export function actionIcon(id) {
  return /ranged|shot/.test(id)
    ? "bow"
    : /cinder|fire/.test(id)
      ? "flame"
      : /rime|cold/.test(id)
        ? "frost"
        : /defend|block/.test(id)
          ? "shield"
          : /stabilize|heal|shared-breath|sap-and-breath|mercy|gentle-return|relieve|rouse|reduce-a-condition/.test(
                id,
              )
            ? "heart"
            : /unarmed/.test(id)
              ? "hand"
              : "sword";
}
