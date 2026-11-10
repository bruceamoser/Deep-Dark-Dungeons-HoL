import test from "node:test";
import assert from "node:assert/strict";
import { resolveClips } from "../src/view/animation-library.mjs";

function fakeClip(name) {
  return {
    name,
    clone() {
      return { name: this.name, cloned: true };
    },
  };
}

function library(names) {
  return new Map(names.map((n) => [n, fakeClip(n)]));
}

// The names the rest of the game asks for.
const GAME_NAMES = [
  "Idle",
  "Walking_A",
  "Running_A",
  "Death_A_Pose",
  "Hit_A",
  "1H_Melee_Attack_Slice_Diagonal",
  "2H_Ranged_Shoot",
  "Spellcast_Shoot",
  "Unarmed_Melee_Attack_Punch_A",
];

const FULL_LIBRARY = [
  "Idle_A",
  "Idle_B",
  "Walking_A",
  "Walking_B",
  "Running_A",
  "Running_B",
  "Death_A_Pose",
  "Hit_A",
  "Hit_B",
  "Melee_1H_Attack_Slice_Diagonal",
  "Ranged_2H_Shoot",
  "Ranged_Magic_Spellcasting",
  "Melee_Unarmed_Attack_Punch_A",
  "Skeletons_Idle",
  "Skeletons_Walking",
  "Skeletons_Death_Pose",
];

test("every clip the game requests resolves from the full library", () => {
  const clips = resolveClips(library(FULL_LIBRARY), {});
  const names = clips.map((c) => c.name);
  assert.deepEqual(names.sort(), [...GAME_NAMES].sort());
});

test("resolved clips are clones, so one hero's playback cannot rename another's", () => {
  const clips = resolveClips(library(FULL_LIBRARY), {});
  for (const clip of clips) assert.equal(clip.cloned, true, clip.name);
});

test("a skeleton rig prefers the skeleton clip set", () => {
  const human = resolveClips(library(FULL_LIBRARY), { skeleton: false });
  const skeleton = resolveClips(library(FULL_LIBRARY), { skeleton: true });
  const pick = (clips, name) => clips.find((c) => c.name === name)?.source;
  // Same game-facing names either way; only the underlying clip differs.
  assert.deepEqual(
    human.map((c) => c.name).sort(),
    skeleton.map((c) => c.name).sort(),
  );
  assert.ok(skeleton.length > 0);
});

test("a skeleton rig falls back to human clips when the skeleton set is absent", () => {
  const withoutSkeletonSet = FULL_LIBRARY.filter(
    (n) => !n.startsWith("Skeletons_"),
  );
  const clips = resolveClips(library(withoutSkeletonSet), { skeleton: true });
  assert.deepEqual(clips.map((c) => c.name).sort(), [...GAME_NAMES].sort());
});

test("a partial library yields only the clips it can satisfy", () => {
  const clips = resolveClips(library(["Idle_A", "Walking_A"]), {});
  assert.deepEqual(clips.map((c) => c.name).sort(), ["Idle", "Walking_A"]);
});

test("an empty library yields nothing rather than throwing", () => {
  assert.deepEqual(resolveClips(new Map(), {}), []);
  assert.deepEqual(resolveClips(new Map(), { skeleton: true }), []);
});

test("an unknown clip name never leaks into the result", () => {
  const clips = resolveClips(library(["SomethingElse"]), {});
  assert.deepEqual(clips, []);
});

test("spear actors prefer a thrust without changing sword actors or removing fallback", () => {
  const clips = library([
    "Melee_1H_Attack_Stab",
    "Melee_1H_Attack_Slice_Diagonal",
  ]);
  // Track source survives under the game's stable attack alias.
  for (const clip of clips.values())
    clip.clone = () => ({ name: clip.name, source: clip.name });
  const attack = (options) =>
    resolveClips(clips, options).find(
      (c) => c.name === "1H_Melee_Attack_Slice_Diagonal",
    );
  assert.equal(attack({ spear: true }).source, "Melee_1H_Attack_Stab");
  assert.equal(attack({}).source, "Melee_1H_Attack_Slice_Diagonal");
  clips.delete("Melee_1H_Attack_Stab");
  assert.equal(
    attack({ spear: true }).source,
    "Melee_1H_Attack_Slice_Diagonal",
  );
});
