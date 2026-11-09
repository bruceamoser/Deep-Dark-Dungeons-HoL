// Game-owned discipline benefits; numerical weights stay out of player-facing text.
export const DISCIPLINE_FORAGING = Object.freeze({
  wilderness: {
    name: "Wilderness",
    resources: { water: 1, wood: 1, food: 1 },
    description:
      "Each rank slightly improves finding water, wood and food when foraging.",
  },
  craft: {
    name: "Craft",
    resources: { wood: 1, fletching: 1 },
    description:
      "Each rank slightly improves finding wood and fletching materials when foraging.",
  },
  medicine: {
    name: "Medicine",
    resources: { herbs: 1 },
    description:
      "Each rank slightly improves finding medicinal materials when foraging.",
  },
});
