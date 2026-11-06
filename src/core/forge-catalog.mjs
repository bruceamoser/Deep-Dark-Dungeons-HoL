// Game-owned progression. A discipline is a self-contained set of circular paths;
// intersections require every named contact, never merely a nearby discipline.
export const FORGE_VERSION = 1;
export const FORGE_LEVEL_CAP = 30;
export const FORGE_DISCIPLINES = [
  ["flame", "Flame", "Ignition, spreading fire and battlefield heat.", 0, 0],
  [
    "marksmanship",
    "Marksmanship",
    "Arrow profiles, reach, volleys and penetration.",
    1,
    0,
  ],
  [
    "wilderness",
    "Wilderness",
    "Roots, supplies, concealment and the hunt.",
    2,
    0,
  ],
  ["life", "Life", "Healing, living wards and restoration.", 3, 0],
  [
    "medicine",
    "Medicine",
    "Field care, cleansing and practical recovery.",
    4,
    0,
  ],
  ["radiance", "Radiance", "Revelation, courage and protective light.", 5, 0],
  ["frost", "Frost", "Cold, slowing, barriers and shattering.", 6, 0],
  ["calling", "Calling", "Spirit wards, traps and spatial exchanges.", 7, 0],
  ["mind", "Mind", "Mental pressure, force and enemy disruption.", 8, 0],
  ["subterfuge", "Subterfuge", "Concealment, misdirection and escape.", 9, 0],
  ["athletics", "Athletics", "Mobility, forced movement and rescue.", 10, 0],
  ["storm", "Storm", "Lightning, wind and rapid repositioning.", 11, 0],
  [
    "arms",
    "Arms",
    "Weapon profiles, impact, control and sweeping strikes.",
    0,
    1,
  ],
  [
    "armor",
    "Armor",
    "Armor proficiency, endurance and damage absorption.",
    1,
    1,
  ],
  ["guard", "Guard", "Interception, counters and protecting companions.", 2, 1],
  [
    "influence",
    "Influence",
    "Rallying, recovery and coordinated offense.",
    3,
    1,
  ],
  [
    "scholarship",
    "Scholarship",
    "Surveying, analysis and exploiting weaknesses.",
    4,
    1,
  ],
  ["craft", "Craft", "Recipes, devices, repairs and preparation.", 5, 1],
].map(([id, name, description, position, inner]) => ({
  id,
  name,
  description,
  position,
  inner,
}));
const S = (name, description, stats) => ({ name, description, stats, cost: 1 });
const P = (power, name, cost = 1) => ({
  power: "power-" + power,
  name,
  cost,
  kind: "skill",
});
const U = (name, power, changes, description) => ({
  name,
  upgrade: { power: "power-" + power, ...changes },
  description,
  cost: 1,
});
const profile = (name, key, value) => ({
  name,
  profile: { key, value },
  description: `${key === "ranged" ? "Bow" : "Melee"} attack profile becomes ${value.join("/")}. Replaces the earlier profile.`,
  cost: 1,
});
const PATHS = {
  marksmanship: [
    [
      "Ballistics",
      [
        P("forge-shot", "Bow attack"),
        profile("Steady release", "ranged", [1, 2, 2]),
        profile("Draw weight", "ranged", [1, 2, 3]),
        profile("Killing flight", "ranged", [2, 3, 5]),
        P("forge-twin-shot", "Twin Shot", 3),
      ],
    ],
    [
      "Longbow",
      [
        S("Far sight", "+1 range to all bow powers.", { rangedRange: 1 }),
        S("Long draw", "+1 range to all bow powers.", { rangedRange: 1 }),
        P("hunters-focus", "Hunter’s Focus", 2),
        S("Horizon shot", "+2 range to all bow powers.", { rangedRange: 2 }),
      ],
    ],
    [
      "Penetration",
      [
        P("barbed-arrow", "Barbed Arrow"),
        S("Open wounds", "+1 Bleeding applied.", { bleeding: 1 }),
        U(
          "Serrated arrow",
          "barbed-arrow",
          { condition: 1 },
          "Barbed Arrow applies one additional Bleeding.",
        ),
        P("piercing-flight", "Piercing Flight", 3),
      ],
    ],
    [
      "Skirmishing",
      [
        P("point-blank-shot", "Point-blank Shot"),
        P("leg-shot", "Leg Shot", 2),
        S("Moving aim", "+1 damage after spending movement this turn.", {
          moveDamage: 1,
        }),
        P("covering-shot", "Covering Shot", 3),
      ],
    ],
  ],
  arms: [
    [
      "Bladework",
      [
        P("forge-strike", "Melee attack"),
        profile("Measured edge", "melee", [1, 2, 2]),
        profile("Heavy edge", "melee", [1, 2, 3]),
        profile("Master’s edge", "melee", [2, 3, 5]),
        P("sweeping-blade", "Sweeping Blade", 3),
      ],
    ],
    [
      "Impact",
      [
        P("driving-cut", "Driving Cut"),
        S("Hard contact", "+1 wall collision damage.", { impact: 1 }),
        S("Crushing contact", "+2 wall collision damage.", { impact: 2 }),
        P("forge-battering-cut", "Battering Cut", 3),
      ],
    ],
    [
      "Disruption",
      [
        P("hamstring", "Hamstring"),
        U(
          "Deep cut",
          "hamstring",
          { condition: 1 },
          "Hamstring applies one additional Slowed.",
        ),
        P("pommel-rattle", "Pommel Rattle", 2),
        S("Punish openings", "+2 damage on Strong hits.", { critical: 2 }),
      ],
    ],
    [
      "Duelist",
      [
        P("blade-ward", "Blade Ward"),
        S(
          "Flanking edge",
          "+1 damage while a capable ally is adjacent to the target.",
          { flanker: 1 },
        ),
        P("execution-edge", "Execution Edge", 2),
        S("Follow through", "Gain 1 movement after a kill.", { killMove: 1 }),
      ],
    ],
  ],
  armor: [
    [
      "Harness",
      [
        {
          name: "Light armor",
          grant: "ability-wear-light-armor",
          description: "Wear light armor effectively: physical DR 1.",
          cost: 1,
        },
        S("Padding", "+2 maximum HP.", { hp: 2 }),
        {
          name: "Medium armor",
          grant: "ability-wear-medium-armor",
          description: "Wear medium armor effectively: physical DR 2.",
          cost: 2,
        },
        {
          name: "Heavy armor",
          grant: "ability-wear-heavy-armor",
          description: "Wear heavy armor effectively: physical DR 3.",
          cost: 3,
        },
      ],
    ],
    [
      "Bracing",
      [
        P("brace", "Brace"),
        U(
          "Hold fast",
          "brace",
          { turns: 1 },
          "Brace lasts one additional turn.",
        ),
        P("iron-skin", "Iron Skin", 2),
        P("adamant-ward", "Adamant Ward", 3),
      ],
    ],
    [
      "Marching",
      [
        P("plated-advance", "Plated Advance"),
        S("Load bearing", "+3 carrying capacity.", { capacity: 3 }),
        P("clear-visor", "Clear Visor", 2),
        S("Iron endurance", "+3 maximum HP.", { hp: 3 }),
      ],
    ],
    [
      "Deflection",
      [
        P("deflecting-stance", "Deflecting Stance"),
        S("Layered ward", "+1 absorption from barrier powers.", { barrier: 1 }),
        P("reinforced-guard", "Reinforced Guard", 2),
        S("Tempered body", "Reduce incoming damage by 1.", { reduction: 1 }),
      ],
    ],
  ],
  flame: [
    [
      "Embers",
      [
        P("ember-lance", "Ember Lance"),
        U(
          "Hot spark",
          "ember-lance",
          { damage: 1 },
          "Ember Lance deals +1 damage.",
        ),
        S("Kindling", "+1 Burning applied.", { burning: 1 }),
        U(
          "Searing lance",
          "ember-lance",
          { damage: 1, range: 1 },
          "Ember Lance gains +1 damage and +1 range.",
        ),
      ],
    ],
    [
      "Conflagration",
      [
        P("flame-fan", "Flame Fan"),
        S("Feed the fire", "+1 damage against Burning enemies.", {
          burningDamage: 1,
        }),
        P("firebreak", "Firebreak", 2),
        P("sunburst", "Sunburst", 3),
      ],
    ],
    [
      "Ash",
      [
        P("ash-veil", "Ash Veil"),
        U(
          "Thick ash",
          "ash-veil",
          { turns: 1 },
          "Ash Veil lasts one additional turn.",
        ),
        P("searing-mark", "Searing Mark", 2),
        S("Pyre", "+1 fire damage.", { fire: 1 }),
      ],
    ],
    [
      "Hearth",
      [
        P("cinderlight", "Cinderlight"),
        U(
          "Lasting ember",
          "cinderlight",
          { rounds: 2 },
          "Cinderlight remains for two additional rounds.",
        ),
        S("Heat shield", "+2 barrier absorption.", { barrier: 2 }),
        S("Phoenix spark", "Recover 1 HP after a kill; wounds are unchanged.", {
          killHeal: 1,
        }),
      ],
    ],
  ],
  frost: [
    [
      "Rime",
      [
        P("winter-bolt", "Winter Bolt"),
        U(
          "Cold point",
          "winter-bolt",
          { damage: 1 },
          "Winter Bolt deals +1 damage.",
        ),
        S("Deep chill", "+1 Freezing applied.", { freezing: 1 }),
        U(
          "Winter reach",
          "winter-bolt",
          { range: 2 },
          "Winter Bolt gains +2 range.",
        ),
      ],
    ],
    [
      "Glacier",
      [
        P("frost-patch", "Frost Patch"),
        U(
          "Slow thaw",
          "frost-patch",
          { rounds: 2 },
          "Frost Patch lasts two additional rounds.",
        ),
        P("glacial-wall", "Glacial Wall", 2),
        S("Ice armor", "+2 barrier absorption.", { barrier: 2 }),
      ],
    ],
    [
      "Shatter",
      [
        P("brittle-armor", "Brittle Armor"),
        S("Fracture", "+2 physical damage when shattering a Freezing enemy.", {
          shatter: 2,
        }),
        S("Splinter", "+2 additional Shatter damage.", { shatter: 2 }),
        S("Permafrost", "Your cold hits apply Freezing 1; −1 direct damage.", {
          permafrost: 1,
          damage: -1,
        }),
      ],
    ],
    [
      "Thaw",
      [
        P("cool-blood", "Cool Blood"),
        U(
          "Calm blood",
          "cool-blood",
          { cleanse: 1 },
          "Cool Blood removes one additional condition severity.",
        ),
        P("dousing-rain", "Dousing Rain", 2),
        P("rime-shell", "Rime Shell", 3),
      ],
    ],
  ],
  guard: [
    [
      "Shield",
      [
        {
          name: "Shield block",
          grant: "ability-shield-block",
          description: "Spend your Reaction to block with a readied shield.",
          cost: 1,
        },
        P("stand-firm", "Stand Firm"),
        U(
          "Firm footing",
          "stand-firm",
          { turns: 1 },
          "Stand Firm lasts one additional turn.",
        ),
        P("hold-the-line", "Hold the Line", 3),
      ],
    ],
    [
      "Protection",
      [
        P("guardian-link", "Guardian Link"),
        U(
          "Close formation",
          "guardian-link",
          { range: 1 },
          "Guardian Link gains +1 range; interception still requires adjacency.",
        ),
        P("shielding-step", "Shielding Step", 2),
        S("Safe harbor", "+2 absorption from barrier powers.", { barrier: 2 }),
      ],
    ],
    [
      "Riposte",
      [
        P("retaliating-guard", "Retaliating Guard"),
        S("Counter edge", "+1 physical damage.", { physical: 1 }),
        S("Exact reply", "+2 damage on Strong hits.", { critical: 2 }),
        U(
          "Patient guard",
          "retaliating-guard",
          { selfWard: 3 },
          "Retaliating Guard also grants a 3-point barrier.",
        ),
      ],
    ],
    [
      "Withdrawal",
      [
        P("warning-call", "Warning Call"),
        U(
          "Loud warning",
          "warning-call",
          { range: 2 },
          "Warning Call gains +2 range.",
        ),
        P("guarded-retreat", "Guarded Retreat", 2),
        S("Rearguard", "+3 maximum HP.", { hp: 3 }),
      ],
    ],
  ],
  athletics: [
    [
      "Footwork",
      [
        P("fleet-step", "Fleet Step"),
        P("quick-roll", "Quick Roll"),
        S("Long stride", "+1 movement.", { movement: 1 }),
        P("bounding-step", "Bounding Step", 3),
      ],
    ],
    [
      "Leaping",
      [
        P("vault", "Vault"),
        U("Long vault", "vault", { range: 1 }, "Vault gains +1 range."),
        U(
          "Sure landing",
          "vault",
          { selfWard: 2 },
          "Vault grants a 2-point barrier.",
        ),
        U("Great vault", "vault", { range: 2 }, "Vault gains +2 range."),
      ],
    ],
    [
      "Force",
      [
        P("shoulder-check", "Shoulder Check"),
        U(
          "Driving shoulder",
          "shoulder-check",
          { push: 1 },
          "Shoulder Check pushes one additional square.",
        ),
        S("Hard landing", "+2 wall collision damage.", { impact: 2 }),
        S("Momentum", "+2 damage after spending movement this turn.", {
          moveDamage: 2,
        }),
      ],
    ],
    [
      "Rescue",
      [
        P("drag-to-safety", "Drag to Safety"),
        U(
          "Long reach",
          "drag-to-safety",
          { range: 1 },
          "Drag to Safety gains +1 range.",
        ),
        P("rescue-line", "Rescue Line", 2),
        S("Strong back", "+4 carrying capacity.", { capacity: 4 }),
      ],
    ],
  ],
  calling: [
    [
      "Ward spirits",
      [
        P("spirit-ward", "Spirit Ward"),
        U(
          "Strong spirit",
          "spirit-ward",
          { barrier: 2 },
          "Spirit Ward absorbs 2 additional damage.",
        ),
        U(
          "Patient spirit",
          "spirit-ward",
          { turns: 1 },
          "Spirit Ward lasts one additional turn.",
        ),
        S("Spirit shelter", "+2 barrier absorption.", { barrier: 2 }),
      ],
    ],
    [
      "Haunting",
      [
        P("spirit-needle", "Spirit Needle"),
        U(
          "Keen whisper",
          "spirit-needle",
          { damage: 1 },
          "Spirit Needle deals +1 damage.",
        ),
        P("phantom-sentry", "Phantom Sentry", 2),
        U(
          "Lingering sentry",
          "phantom-sentry",
          { rounds: 2 },
          "Phantom Sentry lasts two additional rounds.",
        ),
      ],
    ],
    [
      "Crossing",
      [
        P("spectral-hand", "Spectral Hand"),
        U(
          "Distant hand",
          "spectral-hand",
          { range: 2 },
          "Spectral Hand gains +2 range.",
        ),
        P("spirit-crossing", "Spirit Crossing", 2),
        U(
          "Far crossing",
          "spirit-crossing",
          { range: 2 },
          "Spirit Crossing gains +2 range.",
        ),
      ],
    ],
    [
      "Ancestors",
      [
        P("wisp-lantern", "Wisp Lantern"),
        U(
          "Watchful wisp",
          "wisp-lantern",
          { rounds: 2 },
          "Wisp Lantern lasts two additional rounds.",
        ),
        P("ancestral-guidance", "Ancestral Guidance", 2),
        U(
          "Enduring guidance",
          "ancestral-guidance",
          { turns: 1 },
          "Ancestral Guidance lasts one additional turn.",
        ),
      ],
    ],
  ],
  craft: [
    [
      "Workshop",
      [
        P("field-artisan", "Field Artisan"),
        S("Efficient hands", "Craft recipes 10% faster.", { craftSpeed: 0.1 }),
        P("resourceful-maker", "Resourceful Maker", 2),
        P("master-artisan", "Master Artisan", 3),
      ],
    ],
    [
      "Alchemy",
      [
        P("apothecary-apprentice", "Apothecary Apprentice"),
        S("Measured batches", "Craft recipes 10% faster.", { craftSpeed: 0.1 }),
        {
          name: "Greater remedies",
          recipes: ["recipe-greater-healing-bottle"],
          description: "Learn Greater healing potion crafting.",
          cost: 2,
        },
        {
          name: "Restoration formula",
          recipes: ["recipe-restoration-draught"],
          description: "Learn Restoration draught crafting.",
          cost: 3,
        },
      ],
    ],
    [
      "Fieldworks",
      [
        P("makeshift-screen", "Makeshift Screen"),
        U(
          "Lasting screen",
          "makeshift-screen",
          { rounds: 2 },
          "Makeshift Screen lasts two additional rounds.",
        ),
        P("repair-ward", "Repair Ward", 2),
        U(
          "Reinforced repair",
          "repair-ward",
          { barrier: 3 },
          "Repair Ward absorbs 3 additional damage.",
        ),
      ],
    ],
    [
      "Preparation",
      [
        P("edge-honing", "Edge Honing"),
        U(
          "Long honing",
          "edge-honing",
          { turns: 1 },
          "Edge Honing lasts one additional turn.",
        ),
        S("Tool belt", "+3 carrying capacity.", { capacity: 3 }),
        S("Prepared armor", "+2 barrier absorption.", { barrier: 2 }),
      ],
    ],
  ],
  influence: [
    [
      "Command",
      [
        P("rally", "Rally"),
        U("Carrying voice", "rally", { range: 2 }, "Rally gains +2 range."),
        P("press-advantage", "Press Advantage", 2),
        S(
          "Coordinated blows",
          "+2 damage while a capable ally is adjacent to the target.",
          { flanker: 2 },
        ),
      ],
    ],
    [
      "Morale",
      [
        P("reassuring-word", "Reassuring Word"),
        U(
          "Firm reassurance",
          "reassuring-word",
          { heal: 2 },
          "Reassuring Word restores 2 additional HP.",
        ),
        P("second-wind", "Second Wind", 2),
        S("Renewed courage", "+1 HP restored by healing powers.", { heal: 1 }),
      ],
    ],
    [
      "Disruption",
      [
        P("draw-attention", "Draw Attention"),
        U(
          "Commanding call",
          "draw-attention",
          { range: 2 },
          "Draw Attention gains +2 range.",
        ),
        P("demoralize", "Demoralize", 2),
        U(
          "Crushing morale",
          "demoralize",
          { turns: 1 },
          "Demoralize lasts one additional turn.",
        ),
      ],
    ],
    [
      "Inspiration",
      [
        P("rouse", "Rouse"),
        U("Distant courage", "rouse", { range: 2 }, "Rouse gains +2 range."),
        S("Shared resolve", "+2 barrier absorption.", { barrier: 2 }),
        S(
          "Rallying care",
          "Healing powers grant the recipient +1 movement this turn.",
          { rallyMove: 1 },
        ),
      ],
    ],
  ],
  life: [
    [
      "Mending",
      [
        P("mending-touch", "Mending Touch"),
        U(
          "Kind touch",
          "mending-touch",
          { heal: 1 },
          "Mending Touch restores 1 additional HP.",
        ),
        U(
          "Distant touch",
          "mending-touch",
          { range: 2 },
          "Mending Touch gains +2 range.",
        ),
        S("Renewal", "+2 HP restored by healing powers.", { heal: 2 }),
      ],
    ],
    [
      "Sanctuary",
      [
        P("living-ward", "Living Ward"),
        U(
          "Living shelter",
          "living-ward",
          { barrier: 2 },
          "Living Ward absorbs 2 additional damage.",
        ),
        P("renewal-circle", "Renewal Circle", 2),
        S("Sheltering care", "Healing powers grant a 2-point barrier.", {
          healingWard: 2,
        }),
      ],
    ],
    [
      "Restoration",
      [
        P("cleanse-blood", "Cleanse Blood"),
        U(
          "Pure blood",
          "cleanse-blood",
          { cleanse: 1 },
          "Cleanse Blood removes one additional severity.",
        ),
        P("renew-flesh", "Renew Flesh", 3),
        S("Second breath", "+4 maximum HP.", { hp: 4 }),
      ],
    ],
    [
      "Vitality",
      [
        P("vital-spark", "Vital Spark"),
        U(
          "Bright spark",
          "vital-spark",
          { range: 2 },
          "Vital Spark gains +2 range.",
        ),
        P("life-spring", "Life Spring", 2),
        U(
          "Abundant spring",
          "life-spring",
          { rounds: 2 },
          "Life Spring lasts two additional rounds.",
        ),
      ],
    ],
  ],
  medicine: [
    [
      "First aid",
      [
        P("field-care", "Field Care"),
        U(
          "Clean dressing",
          "field-care",
          { heal: 1 },
          "Field Care restores 1 additional HP.",
        ),
        P("dressing-maker", "Dressing Maker", 2),
        U(
          "Practiced care",
          "field-care",
          { heal: 2 },
          "Field Care restores 2 additional HP.",
        ),
      ],
    ],
    [
      "Detoxification",
      [
        P("field-antidote", "Field Antidote"),
        U(
          "Strong antidote",
          "field-antidote",
          { cleanse: 1 },
          "Field Antidote removes one additional severity.",
        ),
        P("purging-tonic", "Purging Tonic", 2),
        U(
          "Deep purge",
          "purging-tonic",
          { cleanse: 1 },
          "Purging Tonic removes one additional severity.",
        ),
      ],
    ],
    [
      "Trauma",
      [
        P("emergency-care", "Emergency Care"),
        U(
          "Rapid recovery",
          "emergency-care",
          { heal: 2 },
          "Emergency Care restores 2 additional HP.",
        ),
        P("battle-surgeon", "Battle Surgeon", 3),
        S("Surgeon’s hands", "+2 HP restored by healing powers.", { heal: 2 }),
      ],
    ],
    [
      "Clarity",
      [
        P("clear-head", "Clear Head"),
        U(
          "Clear mind",
          "clear-head",
          { cleanse: 1 },
          "Clear Head removes one additional severity.",
        ),
        U(
          "Field signal",
          "clear-head",
          { range: 2 },
          "Clear Head gains +2 range.",
        ),
        S("Healthy reserve", "+4 maximum HP.", { hp: 4 }),
      ],
    ],
  ],
  mind: [
    [
      "Pressure",
      [
        P("mind-needle", "Mind Needle"),
        U(
          "Sharp thought",
          "mind-needle",
          { damage: 1 },
          "Mind Needle deals +1 damage.",
        ),
        P("fracture-focus", "Fracture Focus", 2),
        S("Mental edge", "+1 mental damage.", { mental: 1 }),
      ],
    ],
    [
      "Force",
      [
        P("telekinetic-shove", "Telekinetic Shove"),
        U(
          "Strong shove",
          "telekinetic-shove",
          { push: 1 },
          "Telekinetic Shove moves its target one additional square.",
        ),
        P("force-hand", "Force Hand", 2),
        S("Psychic impact", "+2 wall collision damage.", { impact: 2 }),
      ],
    ],
    [
      "Confusion",
      [
        P("distract", "Distract"),
        U(
          "Persistent distraction",
          "distract",
          { turns: 1 },
          "Distract lasts one additional turn.",
        ),
        P("mindstorm", "Mindstorm", 3),
        S("Dazed prey", "+1 Dazed applied.", { dazed: 1 }),
      ],
    ],
    [
      "Focus",
      [
        P("shared-focus", "Shared Focus"),
        U(
          "Distant focus",
          "shared-focus",
          { range: 2 },
          "Shared Focus gains +2 range.",
        ),
        U(
          "Lasting focus",
          "shared-focus",
          { turns: 1 },
          "Shared Focus lasts one additional turn.",
        ),
        S("Precise mind", "+2 damage on Strong hits.", { critical: 2 }),
      ],
    ],
  ],
  radiance: [
    [
      "Sunlight",
      [
        P("dawn-ray", "Dawn Ray"),
        U("Bright ray", "dawn-ray", { damage: 1 }, "Dawn Ray deals +1 damage."),
        P("judgments-cone", "Judgment’s Cone", 3),
        S("Luminous edge", "+1 radiant damage.", { radiant: 1 }),
      ],
    ],
    [
      "Revelation",
      [
        P("guiding-light", "Guiding Light"),
        U(
          "Steady beacon",
          "guiding-light",
          { rounds: 2 },
          "Guiding Light lasts two additional rounds.",
        ),
        P("revealing-brand", "Revealing Brand", 2),
        U(
          "Distant brand",
          "revealing-brand",
          { range: 2 },
          "Revealing Brand gains +2 range.",
        ),
      ],
    ],
    [
      "Aegis",
      [
        P("dawn-shield", "Dawn Shield"),
        U(
          "Strong dawn",
          "dawn-shield",
          { barrier: 2 },
          "Dawn Shield absorbs 2 additional damage.",
        ),
        P("halo-ward", "Halo Ward", 2),
        S("Halo strength", "+2 barrier absorption.", { barrier: 2 }),
      ],
    ],
    [
      "Courage",
      [
        P("kindle-courage", "Kindle Courage"),
        U(
          "Lasting courage",
          "kindle-courage",
          { turns: 1 },
          "Kindle Courage lasts one additional turn.",
        ),
        S("Warmth", "+1 HP restored by healing powers.", { heal: 1 }),
        S("Dawn reserve", "+3 maximum HP.", { hp: 3 }),
      ],
    ],
  ],
  scholarship: [
    [
      "Cartography",
      [
        P("read-the-depths", "Read the Depths"),
        U(
          "Surveyor’s ward",
          "read-the-depths",
          { selfWard: 2 },
          "Surveying grants a 2-point barrier.",
        ),
        S("Expedition packs", "+3 carrying capacity.", { capacity: 3 }),
        S("Careful route", "+1 movement.", { movement: 1 }),
      ],
    ],
    [
      "Anatomy",
      [
        P("anatomists-strike", "Anatomist’s Strike"),
        U(
          "Exact incision",
          "anatomists-strike",
          { damage: 1 },
          "Anatomist’s Strike deals +1 damage.",
        ),
        P("expose-weakness", "Expose Weakness", 2),
        S("Critical study", "+2 damage on Strong hits.", { critical: 2 }),
      ],
    ],
    [
      "Analysis",
      [
        P("threat-analysis", "Threat Analysis"),
        U(
          "Lasting analysis",
          "threat-analysis",
          { turns: 1 },
          "Threat Analysis lasts one additional turn.",
        ),
        P("calculated-opening", "Calculated Opening", 2),
        S(
          "Exploit formation",
          "+2 damage against an enemy adjacent to a capable ally.",
          { flanker: 2 },
        ),
      ],
    ],
    [
      "Instruction",
      [
        P("measured-advice", "Measured Advice"),
        U(
          "Clear advice",
          "measured-advice",
          { range: 2 },
          "Measured Advice gains +2 range.",
        ),
        P("alchemical-primer", "Alchemical Primer", 2),
        S("Practiced process", "Craft recipes 10% faster.", {
          craftSpeed: 0.1,
        }),
      ],
    ],
  ],
  storm: [
    [
      "Lightning",
      [
        P("static-arc", "Static Arc"),
        U(
          "High voltage",
          "static-arc",
          { damage: 1 },
          "Static Arc deals +1 damage.",
        ),
        P("thunder-line", "Thunder Line", 3),
        S("Conductor", "+2 wet-chain lightning damage.", { chain: 2 }),
      ],
    ],
    [
      "Gales",
      [
        P("gale-bolt", "Gale Bolt"),
        U(
          "Driving gale",
          "gale-bolt",
          { push: 1 },
          "Gale Bolt pushes one additional square.",
        ),
        P("crosswind", "Crosswind", 2),
        S("Storm impact", "+2 wall collision damage.", { impact: 2 }),
      ],
    ],
    [
      "Motion",
      [
        P("tailwind", "Tailwind"),
        U(
          "Lasting wind",
          "tailwind",
          { turns: 1 },
          "Tailwind lasts one additional turn.",
        ),
        P("storm-hop", "Storm Hop", 2),
        S("Stormrunner", "+2 damage after spending movement this turn.", {
          moveDamage: 2,
        }),
      ],
    ],
    [
      "Weather",
      [
        P("gust-screen", "Gust Screen"),
        U(
          "Holding wind",
          "gust-screen",
          { turns: 1 },
          "Gust Screen lasts one additional turn.",
        ),
        S("Static charge", "+1 lightning damage.", { lightning: 1 }),
        S("Charged shelter", "+2 barrier absorption.", { barrier: 2 }),
      ],
    ],
  ],
  subterfuge: [
    [
      "Concealment",
      [
        P("vanish", "Vanish"),
        U(
          "Patient shadow",
          "vanish",
          { turns: 1 },
          "Vanish lasts one additional turn; attacking or taking damage still reveals you.",
        ),
        S("Ambush", "+2 damage when attacking from concealment.", {
          ambush: 2,
        }),
        S("Silent execution", "+3 additional concealed-attack damage.", {
          ambush: 3,
        }),
      ],
    ],
    [
      "Escape",
      [
        P("sidestep", "Sidestep"),
        U(
          "Long sidestep",
          "sidestep",
          { range: 1 },
          "Sidestep gains +1 range.",
        ),
        P("shadow-step", "Shadow Step", 2),
        P("escape-route", "Escape Route", 3),
      ],
    ],
    [
      "Dirty fighting",
      [
        P("pocket-sand", "Pocket Sand"),
        U(
          "Wider throw",
          "pocket-sand",
          { range: 1 },
          "Pocket Sand gains +1 range.",
        ),
        P("low-blow", "Low Blow", 2),
        S("Venomhand", "Weapon hits apply Poisoned 1; −1 direct damage.", {
          venom: 1,
          damage: -1,
        }),
      ],
    ],
    [
      "Smoke",
      [
        P("smoke-screen", "Smoke Screen"),
        U(
          "Lingering smoke",
          "smoke-screen",
          { rounds: 2 },
          "Smoke Screen lasts two additional rounds.",
        ),
        S(
          "Exploit distraction",
          "+1 damage against an enemy adjacent to a capable ally.",
          { flanker: 1 },
        ),
        S("Slip away", "Gain 1 movement after a kill.", { killMove: 1 }),
      ],
    ],
  ],
  wilderness: [
    [
      "Entanglement",
      [
        P("snaring-roots", "Snaring Roots"),
        U(
          "Tight roots",
          "snaring-roots",
          { rounds: 2 },
          "Snaring Roots lasts two additional rounds.",
        ),
        P("hunting-snare", "Hunting Snare", 2),
        U(
          "Waiting snare",
          "hunting-snare",
          { rounds: 2 },
          "Hunting Snare lasts two additional rounds.",
        ),
      ],
    ],
    [
      "Foraging",
      [
        P("field-replenishment", "Field Replenishment"),
        P("forager-remedies", "Forager Remedies", 2),
        S("Trail packs", "+3 carrying capacity.", { capacity: 3 }),
        S("Hardy traveler", "+4 maximum HP.", { hp: 4 }),
      ],
    ],
    [
      "Briars",
      [
        P("briar-lash", "Briar Lash"),
        U(
          "Long briar",
          "briar-lash",
          { range: 2 },
          "Briar Lash gains +2 range.",
        ),
        S("Tearing thorns", "+1 Bleeding applied.", { bleeding: 1 }),
        U(
          "Thorny lash",
          "briar-lash",
          { damage: 2 },
          "Briar Lash deals +2 damage.",
        ),
      ],
    ],
    [
      "Canopy",
      [
        P("brush-cover", "Brush Cover"),
        U(
          "Thick canopy",
          "brush-cover",
          { turns: 1 },
          "Brush Cover lasts one additional turn.",
        ),
        P("nightfall", "Nightfall", 2),
        S("Forest step", "+1 movement.", { movement: 1 }),
      ],
    ],
  ],
};
// Recipe paths retain value even when a manuscript already taught the recipe.
const recipeBonuses = {
  "power-forager-remedies": { stats: { hp: 2 }, bonusText: "+2 maximum HP." },
  "power-dressing-maker": {
    stats: { heal: 1 },
    bonusText: "+1 HP restored by healing powers.",
  },
  "power-alchemical-primer": {
    stats: { capacity: 2 },
    bonusText: "+2 carrying capacity.",
  },
  "power-resourceful-maker": {
    stats: { capacity: 3 },
    bonusText: "+3 carrying capacity.",
  },
  "power-apothecary-apprentice": {
    stats: { heal: 1 },
    bonusText: "+1 HP restored by healing powers.",
  },
};
for (const paths of Object.values(PATHS))
  for (const [, entries] of paths)
    for (const entry of entries)
      if (recipeBonuses[entry.power])
        Object.assign(entry, recipeBonuses[entry.power]);
export const FORGE_NODES = [];
export const FORGE_PATHS = [];
for (const d of FORGE_DISCIPLINES) {
  const origin = `${d.id}:origin`;
  FORGE_NODES.push({
    id: origin,
    discipline: d.id,
    name: d.name,
    kind: "origin",
    cost: 3,
    requires: [],
    rank: 1,
    description: `Open the ${d.name} paths. Rank I activates matching enchantments. Learn additional disciplines from level 2.`,
    local: { x: 0, y: 0 },
  });
  FORGE_NODES.push({
    id: `${d.id}:rank2`,
    discipline: d.id,
    name: `${d.name} II`,
    kind: "rank",
    cost: 2,
    requires: [origin],
    rank: 2,
    investment: 4,
    minimumLevel: 3,
    description: `Rank II: unlock advanced ${d.name} nodes and rank-II enchantments. Requires four purchased nodes in this discipline.`,
    local: { x: -45, y: 60 },
  });
  FORGE_NODES.push({
    id: `${d.id}:rank3`,
    discipline: d.id,
    name: `${d.name} III`,
    kind: "rank",
    cost: 3,
    requires: [`${d.id}:rank2`],
    rank: 3,
    investment: 9,
    minimumLevel: 7,
    description: `Rank III: unlock the deepest ${d.name} paths and rank-III enchantments. Requires nine purchased nodes in this discipline.`,
    local: { x: 45, y: 60 },
  });
  PATHS[d.id].forEach(([name, entries], p) => {
    const path = { id: `${d.id}:path${p}`, discipline: d.id, name, nodes: [] };
    entries.forEach((entry, i) => {
      const id = `${d.id}:${p}:${i}`,
        major = i === entries.length - 1;
      // Four independent circular lobes around an origin. Follow the circle from its inner end.
      const direction = -Math.PI / 2 + (p * Math.PI) / 2,
        center = { x: Math.cos(direction) * 153, y: Math.sin(direction) * 153 };
      const a =
        direction + Math.PI + (i / (entries.length - 1)) * Math.PI * 1.7;
      const local = {
        x: Math.round(center.x + Math.cos(a) * 105),
        y: Math.round(center.y + Math.sin(a) * 105),
      };
      FORGE_NODES.push({
        id,
        discipline: d.id,
        path: path.id,
        pathName: name,
        kind: major ? "major" : "minor",
        cost: major ? Math.max(2, entry.cost) : entry.cost,
        requires: [i ? `${d.id}:${p}:${i - 1}` : origin],
        minimumRank: major ? (p === 3 ? 3 : 2) : 1,
        ...entry,
        local,
      });
      path.nodes.push(id);
    });
    FORGE_PATHS.push(path);
  });
}
const contact = (discipline, path = 0) =>
  FORGE_PATHS.find(
    (p) => p.discipline === discipline && p.id === `${discipline}:path${path}`,
  ).nodes.at(-1);
const intersections = [
  ["flaming-arrow", "Flaming Arrow", ["flame", "marksmanship"], [0, 0]],
  ["thorn-arrow", "Thorn Arrow", ["marksmanship", "wilderness"], [2, 0]],
  ["renewing-grove", "Renewing Grove", ["wilderness", "life"], [3, 1]],
  ["vital-surgery", "Vital Surgery", ["life", "medicine"], [2, 2]],
  ["purifying-light", "Purifying Light", ["medicine", "radiance"], [1, 2]],
  ["aurora-ward", "Aurora Ward", ["radiance", "frost"], [2, 1]],
  ["winter-spirit", "Winter Spirit", ["frost", "calling"], [0, 1]],
  ["psychic-crossing", "Psychic Crossing", ["calling", "mind"], [2, 1]],
  ["phantom-knife", "Phantom Knife", ["mind", "subterfuge"], [0, 0]],
  ["shadow-dancer", "Shadow Dancer", ["subterfuge", "athletics"], [1, 0]],
  ["thunder-charge", "Thunder Charge", ["athletics", "storm"], [2, 1]],
  ["firestorm", "Firestorm", ["storm", "flame"], [0, 1]],
  ["iron-cleave", "Iron Cleave", ["arms", "armor"], [0, 0]],
  ["bastion", "Bastion", ["armor", "guard"], [1, 0]],
  ["rallying-bulwark", "Rallying Bulwark", ["guard", "influence"], [1, 0]],
  ["battle-plan", "Battle Plan", ["influence", "scholarship"], [3, 2]],
  [
    "alchemical-insight",
    "Alchemical Insight",
    ["scholarship", "craft"],
    [3, 1],
  ],
  ["tempered-edge", "Tempered Edge", ["craft", "arms"], [3, 0]],
  ["furnace-blade", "Furnace Blade", ["flame", "arms"], [2, 1]],
  ["armored-volley", "Armored Volley", ["marksmanship", "armor"], [3, 3]],
  ["sheltering-thicket", "Sheltering Thicket", ["wilderness", "guard"], [3, 2]],
  ["inspiring-renewal", "Inspiring Renewal", ["life", "influence"], [0, 1]],
  [
    "clinical-precision",
    "Clinical Precision",
    ["medicine", "scholarship"],
    [3, 1],
  ],
  ["rune-lantern", "Rune Lantern", ["radiance", "craft"], [1, 2]],
  [
    "cinder-tempest",
    "Cinder Tempest",
    ["flame", "marksmanship", "storm"],
    [1, 0, 0],
  ],
  [
    "unbroken-company",
    "Unbroken Company",
    ["armor", "guard", "influence"],
    [3, 1, 0],
  ],
  [
    "verdant-resurrection",
    "Verdant Renewal",
    ["life", "medicine", "wilderness"],
    [1, 2, 1],
  ],
  [
    "phantom-hunt",
    "Phantom Hunt",
    ["calling", "mind", "subterfuge"],
    [1, 2, 0],
  ],
  [
    "glacial-engine",
    "Glacial Engine",
    ["frost", "craft", "scholarship"],
    [1, 2, 2],
  ],
  [
    "sunfire-sanctuary",
    "Sunfire Sanctuary",
    ["radiance", "life", "flame"],
    [2, 1, 3],
  ],
  [
    "thunderous-assault",
    "Thunderous Assault",
    ["arms", "athletics", "storm"],
    [1, 2, 1],
  ],
  [
    "silent-storm",
    "Silent Storm",
    ["marksmanship", "subterfuge", "mind"],
    [2, 2, 1],
  ],
  [
    "fourfold-aegis",
    "Fourfold Aegis",
    ["armor", "guard", "life", "radiance"],
    [1, 0, 1, 2],
  ],
];
for (const [slug, name, disciplines, paths] of intersections)
  FORGE_NODES.push({
    id: `intersection:${slug}`,
    name,
    kind: "intersection",
    disciplines,
    cost: disciplines.length + 1,
    requires: disciplines.map((d, i) => contact(d, paths[i])),
    power: `power-forge-${slug}`,
    minimumLevel: disciplines.length >= 3 ? 7 : 3,
    description: `Unlock every touching circle from ${disciplines.map((id) => FORGE_DISCIPLINES.find((d) => d.id === id).name).join(" + ")}.`,
    tier: disciplines.length,
    ...(slug === "alchemical-insight"
      ? {
          stats: { craftDiscount: 0.25 },
          bonusText: "Recipe ingredient batches cost 25% less.",
        }
      : {}),
  });
export const FORGE_NODE = Object.freeze(
  Object.fromEntries(FORGE_NODES.map((n) => [n.id, Object.freeze(n)])),
);
export function disciplinePosition(id) {
  const d = FORGE_DISCIPLINES.find((d) => d.id === id);
  const angle = (d.position / (d.inner ? 6 : 12)) * Math.PI * 2;
  const radius = d.inner ? 585 : 1250;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
const DISCIPLINE_CENTERS = FORGE_DISCIPLINES.map((d) =>
  disciplinePosition(d.id),
);
const intersectionPositions = new Map();
for (const n of FORGE_NODES.filter((n) => n.kind === "intersection")) {
  const points = n.disciplines.map(disciplinePosition);
  const origin = {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
  let best;
  for (let ring = 0; ring < 120 && !best; ring++) {
    const count = Math.max(1, ring * 12),
      distance = ring * 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2,
        p = {
          x: origin.x + Math.cos(a) * distance,
          y: origin.y + Math.sin(a) * distance,
        };
      if (
        DISCIPLINE_CENTERS.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < 345)
      )
        continue;
      if (
        [...intersectionPositions.values()].some(
          (c) => Math.hypot(p.x - c.x, p.y - c.y) < 165,
        )
      )
        continue;
      best = p;
      break;
    }
  }
  if (!best) throw new Error("No space for forge intersection " + n.id);
  intersectionPositions.set(n.id, best);
}
export function nodePosition(node) {
  if (node.kind === "intersection")
    return { ...intersectionPositions.get(node.id) };
  const p = disciplinePosition(node.discipline);
  return { x: p.x + node.local.x, y: p.y + node.local.y };
}
