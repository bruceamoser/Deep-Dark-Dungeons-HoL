import test from "node:test";
import assert from "node:assert/strict";
import { C, R, drafts } from "./game-fixture.mjs";
import {
  creationLedger,
  purchase,
  purchaseEligibility,
} from "../public/vendor/hol/rules/development.mjs";
import {
  gameCatalog,
  gamePurchaseEligibility,
  isTrainable,
  mappedPower,
  POWERS,
} from "../src/core/powers.mjs";
import { Game } from "../src/core/game.mjs";
import { RECIPES } from "../src/core/recipes.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";

const catalogs = gameCatalog(C);
const rules = { ...R, purchaseEligibility };
const candidates = catalogs.choices.filter(
  (c) => c.kind === "ability" && !c.universal && isTrainable(c, catalogs),
);
const eligible = (state) =>
  candidates.filter(
    (c) => gamePurchaseEligibility(c, state, catalogs, rules).eligible,
  );
function blank() {
  const d = structuredClone(drafts[0]);
  d.purchases = { 0: [], 1: [] };
  d.acquisitions = { "power-driving-cut": { meleeHands: 1 } };
  d.culture = { id: "origin-culture-walled-communities", pair: 2 };
  d.background = { id: "origin-background-household-guard", pair: 2 };
  d.signatureId = "power-signature-sworn-guardian";
  return d;
}
function spendPlan(state) {
  if (!state.dp) return [];
  for (const c of eligible(state).sort(
    (a, b) => b.cost - a.cost || a.id.localeCompare(b.id),
  )) {
    const next = purchase(state, c, catalogs.choices, { id: c.id });
    assert.ok(next.applied);
    const rest = spendPlan(next.state);
    if (rest) return [c.id, ...rest];
  }
  return null;
}

test("Arms and Armor origins leave meaningful 1, 2 and 3 DP purchases in early training", () => {
  const d = blank(),
    p = R.workshopCharacter(d, catalogs);
  assert.equal(p.valid, true, JSON.stringify(p.errors));
  for (const dp of [1, 2, 3]) {
    const state = { ...p.stages[0], dp };
    const available = eligible(state);
    for (const discipline of ["discipline-arms", "discipline-armor"]) {
      assert.ok(
        available.some(
          (c) =>
            c.cost === dp && c.requirements.some((r) => r.id === discipline),
        ),
        `${discipline}: ${dp} DP`,
      );
    }
    assert.ok(spendPlan(state));
    for (const c of catalogs.choices.filter((c) => c.kind === "discipline"))
      assert.equal(
        gamePurchaseEligibility(c, state, catalogs, rules).eligible,
        false,
      );
  }
  assert.equal(
    eligible(p.stages[0]).filter((c) =>
      ["power-driving-cut", "power-brace"].includes(c.id),
    ).length,
    0,
  );
});

test("every origin pairing can spend the entire early pool, including maximum DP and duplicate refunds", () => {
  const origins = (type) =>
    catalogs.choices
      .filter((c) => c.kind === "origin" && c.originType === type)
      .flatMap((c) =>
        c.pairs.flatMap((p, pair) => (p.gamePower ? [{ id: c.id, pair }] : [])),
      );
  const checked = new Set();
  let pairings = 0,
    largest = 0;
  for (const culture of origins("culture"))
    for (const background of origins("background")) {
      const d = blank();
      Object.assign(d, {
        culture,
        background,
        ancestryId: "ancestry-human",
        traitIds: ["trait-human-far-walker", "trait-human-shared-table"],
        attributes: {
          brawn: -1,
          fortitude: -1,
          agility: -1,
          guile: 2,
          knowledge: 2,
          reason: 2,
        },
      });
      const state = creationLedger(d, catalogs.choices).stages[0];
      largest = Math.max(largest, state.dp);
      pairings++;
      const key = state.abilities.slice().sort().join(",") + ":" + state.dp;
      if (checked.has(key)) continue;
      checked.add(key);
      // Every possible remaining balance is spendable, not just even totals.
      for (let dp = 1; dp <= state.dp; dp++)
        assert.ok(spendPlan({ ...state, dp }), `${key}: cannot spend ${dp} DP`);
    }
  assert.equal(pairings, 2304);
  assert.equal(largest, 19);
  assert.ok(checked.size > 50);
});

test("each discipline has four additional starter choices with stable origin and legacy mappings", () => {
  for (const discipline of catalogs.choices.filter(
    (c) => c.kind === "discipline",
  )) {
    const starters = Object.values(POWERS).filter(
      (p) => p.discipline === discipline.id && p.rank === 1,
    );
    assert.equal(starters.length, 5, discipline.id);
    assert.deepEqual(
      starters.slice(1).map((p) => p.cost),
      [1, 2, 2, 3],
    );
    for (const origin of catalogs.choices.filter((c) => c.kind === "origin"))
      for (const pair of origin.pairs.filter(
        (p) => p.gamePower && p.disciplineId === discipline.id,
      ))
        assert.equal(pair.abilityId, starters[0].id);
    for (const old of C.choices.filter((c) => {
      const primary = c.requirements?.find((r) => r.kind === "discipline");
      return primary?.id === discipline.id && primary.rank === 1;
    }))
      if (!old.classId && old.kind === "ability")
        assert.equal(mappedPower(old.id, catalogs), starters[0].id);
  }
});

test("new purchases persist through actual creation, recruitment and save/load without duplicate weapon grants", () => {
  const d = blank();
  // 10 DP spent exactly, leaving both the origin grants and the new techniques.
  d.purchases[0] = [
    "power-hamstring",
    "power-pommel-rattle",
    "power-blade-ward",
    "power-plated-advance",
    "power-watchful-stance",
    "power-catch-breath",
  ].map((id) => ({ id }));
  const p = R.workshopCharacter(d, catalogs);
  assert.equal(p.valid, true, JSON.stringify(p.errors));
  assert.equal(p.stages[0].dp, 0);
  assert.equal(
    p.inventory.items.filter(
      (i) =>
        i.catalogId === "item-ordinary-melee-weapon" && i.source !== "coins",
    ).length,
    1,
  );
  const game = new Game(R, catalogs);
  game.fresh([d, ...drafts.slice(1)]);
  game.pause();
  const saved = deserialize(serialize(game.snapshot()));
  const loaded = new Game(R, catalogs);
  loaded.load(saved, { resume: false });
  for (const { id } of d.purchases[0]) {
    assert.ok(loaded.powerIds(loaded.party[0]).includes(id));
    assert.ok(
      loaded.availableActions(loaded.party[0]).some((a) => a.id === id),
    );
  }
});

test("recipe training has real passive benefits and redundant recipe purchases are blocked", () => {
  const game = new Game(R, catalogs);
  game.fresh(drafts);
  game.pause();
  const h = game.party[0];
  h.preview.state.abilities = ["power-apothecary-apprentice"];
  assert.ok(game.knownRecipes(h).has("recipe-lesser-healing-bottle"));
  assert.ok(game.knownRecipes(h).has("recipe-field-dressing"));
  const state = {
    ...R.workshopCharacter(blank(), catalogs).stages[0],
    dp: 19,
    abilities: [...h.preview.state.abilities],
  };
  const record = catalogs.choices.find((c) => c.id === "power-camp-apothecary");
  const verdict = gamePurchaseEligibility(record, state, catalogs, rules);
  assert.equal(verdict.eligible, false);
  assert.ok(verdict.reasons.some((r) => r.code === "redundant-training"));
  const r = RECIPES.find((r) => r.id === "recipe-field-dressing");
  assert.equal(game.recipeTime(h, r), 30);
  h.preview.state.abilities.push("power-dressing-maker");
  assert.equal(game.recipeTime(h, r), 23);
  h.preview.state.abilities.push("power-field-artisan");
  assert.equal(game.recipeTime(h, r), 23, "25% benefits do not stack");
});
