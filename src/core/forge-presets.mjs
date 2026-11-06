import { newForgeDraft, forgeCharacter } from "./forge.mjs";
export function forgeStartingDrafts(examples, C) {
  const settings = [
    {
      classId: "class-protector",
      classRoot: "guard",
      culture: "origin-culture-walled-communities",
      cultureRoot: "armor",
      background: "origin-background-household-guard",
      backgroundRoot: "arms",
      kit: "vanguard",
      nodes: [
        "arms:0:0",
        "arms:0:1",
        "arms:0:2",
        "armor:0:0",
        "guard:0:0",
        "armor:1:0",
        "arms:1:0",
        "armor:2:0",
      ],
    },
    {
      classId: "class-blade",
      classRoot: "marksmanship",
      culture: "origin-culture-forest-communities",
      cultureRoot: "wilderness",
      background: "origin-background-messenger",
      backgroundRoot: "influence",
      kit: "ranger",
      nodes: [
        "marksmanship:0:0",
        "marksmanship:0:1",
        "marksmanship:0:2",
        "marksmanship:0:3",
        "marksmanship:1:0",
        "marksmanship:1:1",
        "wilderness:0:0",
        "influence:0:0",
      ],
    },
    {
      classId: "class-shepherd",
      classRoot: "life",
      culture: "origin-culture-free-harbors",
      cultureRoot: "influence",
      background: "origin-background-physician-s-student",
      backgroundRoot: "medicine",
      kit: "medic",
      nodes: [
        "life:0:0",
        "life:0:1",
        "life:0:2",
        "medicine:0:0",
        "medicine:0:1",
        "life:1:0",
        "influence:0:0",
        "medicine:3:0",
      ],
    },
    {
      classId: "class-arcanist",
      classRoot: "flame",
      culture: "origin-culture-learning-houses",
      cultureRoot: "scholarship",
      background: "origin-background-weather-apprentice",
      backgroundRoot: "storm",
      kit: "arcanist",
      nodes: [
        "flame:0:0",
        "flame:0:1",
        "flame:0:2",
        "flame:1:0",
        "flame:2:0",
        "storm:0:0",
        "storm:1:0",
        "scholarship:0:0",
      ],
    },
  ];
  return settings.map((s, i) => {
    const old = examples[i]?.draft ?? examples[i],
      d = newForgeDraft();
    for (const k of [
      "name",
      "attributes",
      "ancestryId",
      "traitIds",
      "appearance",
    ])
      if (old?.[k] !== undefined) d[k] = structuredClone(old[k]);
    if (
      !Object.values(d.attributes).every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 2,
      ) ||
      Object.values(d.attributes).reduce((n, v) => n + v, 0) !== 3
    )
      d.attributes = {
        brawn: 1,
        fortitude: 1,
        agility: 1,
        guile: 0,
        knowledge: 0,
        reason: 0,
      };
    d.classId = s.classId;
    d.classDisciplines = ["discipline-" + s.classRoot];
    d.culture = { id: s.culture, discipline: "discipline-" + s.cultureRoot };
    d.background = {
      id: s.background,
      discipline: "discipline-" + s.backgroundRoot,
    };
    d.kit = s.kit;
    d.forge.nodes = s.nodes;
    const p = forgeCharacter(d, C);
    if (!p.valid)
      throw new Error(
        `Starting company: ${d.name}: ${p.errors.map((e) => e.text).join("; ")}`,
      );
    return d;
  });
}
