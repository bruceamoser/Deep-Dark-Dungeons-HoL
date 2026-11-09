import test from "node:test";
import assert from "node:assert/strict";
import {
  FIERCENESS,
  locationFierceness,
  campProbability,
  campEncounterRandom,
} from "../src/core/fierceness.mjs";
import { generate } from "../src/core/dungeon.mjs";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
test("seven labelled bands yield 2–50 percent per eight hours and accumulate with duration", () => {
  assert.equal(FIERCENESS.length, 7);
  for (let tier = 0; tier < 7; tier++) {
    const p = campProbability(tier, 8);
    assert.ok(Math.abs(p.total - FIERCENESS[tier].risk) < 1e-12);
    assert.ok(campProbability(tier, 16).total > p.total);
    assert.ok(campProbability(tier, 8, true).total < p.total);
  }
  assert.ok(Math.abs(campProbability(6, 16).total - 0.75) < 1e-12);
});
test("room and corridor ratings persist, including deterministic migration of older maps", () => {
  const map = generate(451),
    old = structuredClone(map);
  const ratings = map.rooms.map(
    (r) => locationFierceness(map, { x: r.cx, z: r.cz }).tier,
  );
  assert.equal(ratings[0], 0);
  assert.ok(new Set(ratings).size >= 3);
  assert.deepEqual(
    old.rooms.map((r) => locationFierceness(old, { x: r.cx, z: r.cz }).tier),
    ratings,
  );
  const saved = structuredClone(map);
  assert.deepEqual(
    saved.rooms.map(
      (r) => locationFierceness(saved, { x: r.cx, z: r.cz }).tier,
    ),
    ratings,
  );
});
test("independent encounter samples reproduce the full-camp probabilities without certain encounters", () => {
  const n = 20000;
  for (const tier of [0, 3, 6]) {
    let encounters = 0;
    for (let seed = 0; seed < n; seed++) {
      for (let hour = 0; hour < 8; hour++)
        if (
          campEncounterRandom(seed, hour).next() <
          campProbability(tier, 1).hourly
        ) {
          encounters++;
          break;
        }
    }
    assert.ok(
      Math.abs(encounters / n - FIERCENESS[tier].risk) < 0.015,
      `${tier}: ${encounters / n}`,
    );
  }
});
test("camp stores its location tier and resumes the same independent encounter stream", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.traits = () => [];
  g.map.rooms.forEach((r) => (r.fierceness = 6));
  const assignments = Object.fromEntries(
    g.party.map((h) => [h.heroId, ["guard", "guard"]]),
  );
  g.startCamp(assignments);
  assert.equal(g.campaign.camp.fierceness, 6);
  const copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  copy.traits = () => [];
  const calls = [[], []];
  for (const [i, game] of [g, copy].entries()) {
    game.campWanderers = () => {
      calls[i].push(game.campaign.camp.elapsed);
      return [];
    };
    game.campDuty = (h, d, rng) => {
      for (let n = 0; n < i * 32; n++) rng.next();
    };
    for (let h = 0; h < 8; h++) game.campHour();
  }
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(copy.campaign.camp.fierceness, 6);
});
