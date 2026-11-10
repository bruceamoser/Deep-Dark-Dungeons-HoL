// Shared animation library for the KayKit Adventurers 2.0 rig.
//
// The 2.0 characters and the Series 4-6 packs ship without embedded animation; they
// share one 23-bone rig and take their clips from a set of separate rig libraries.
// The game asks for clips by older names (Idle, 2H_Ranged_Shoot, Spellcast_Shoot ...),
// so this module merges every rig file once and re-exports the clips under the names
// the rest of the code already uses.

const RIG_FILES = [
  "General",
  "MovementBasic",
  "MovementAdvanced",
  "CombatMelee",
  "CombatRanged",
  "Tools",
  "Simulation",
  "Special",
].map((name) => `/assets/animations/Rig_Medium_${name}.glb`);

/**
 * Library clip name -> the name the game asks for. First match wins.
 * Skeleton-rigged enemies get their own idle/walk/death pass, which reads far better
 * than human locomotion on a bare skeleton.
 */
const ALIASES = {
  Idle: ["Idle_A", "Idle_B", "Skeletons_Idle"],
  Walking_A: ["Walking_A", "Walking_B", "Skeletons_Walking"],
  Running_A: ["Running_A", "Running_B"],
  Death_A_Pose: ["Death_A_Pose", "Death_B_Pose", "Skeletons_Death_Pose"],
  Hit_A: ["Hit_A", "Hit_B"],
  "1H_Melee_Attack_Slice_Diagonal": [
    "Melee_1H_Attack_Slice_Diagonal",
    "Melee_1H_Attack_Slice_Horizontal",
    "Melee_1H_Attack_Chop",
  ],
  "2H_Ranged_Shoot": [
    "Ranged_2H_Shoot",
    "Ranged_Bow_Release",
    "Ranged_1H_Shoot",
  ],
  Spellcast_Shoot: [
    "Ranged_Magic_Spellcasting",
    "Ranged_Magic_Shoot",
    "Ranged_Magic_Raise",
  ],
  Unarmed_Melee_Attack_Punch_A: [
    "Melee_Unarmed_Attack_Punch_A",
    "Melee_Unarmed_Attack_Kick",
  ],
  Block: ["Melee_Block", "Melee_Blocking"],
  PickUp: ["PickUp", "Interact"],
  Throw: ["Throw"],
  Taunt: ["Skeletons_Taunt", "Cheering"],
};

/** Skeleton rigs prefer their own clip set where one exists. */
const SKELETON_OVERRIDES = {
  Idle: ["Skeletons_Idle"],
  Walking_A: ["Skeletons_Walking"],
  Death_A_Pose: ["Skeletons_Death_Pose", "Skeletons_Death"],
};

let library = new Map();
let ready = false;

/** Merge every rig file into one clip map. Safe to call more than once. */
export async function loadAnimationLibrary(loader) {
  if (ready) return library;
  const merged = new Map();
  const results = await Promise.all(
    RIG_FILES.map(async (url) => {
      try {
        return await loader.loadAsync(url);
      } catch {
        return null;
      }
    }),
  );
  for (const gltf of results) {
    if (!gltf?.animations) continue;
    for (const clip of gltf.animations) {
      // Later files win for a duplicate name; the sets are disjoint in practice.
      merged.set(clip.name, clip);
    }
  }
  library = merged;
  ready = merged.size > 0;
  return library;
}

export function animationLibraryReady() {
  return ready;
}

export function libraryClipNames() {
  return [...library.keys()].sort();
}

/**
 * Clips renamed to the names the game requests, in a stable order.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.skeleton] prefer the skeleton-specific clip set
 * @param {boolean} [opts.dart] prefer one-handed shooting for a held dart
 * @returns {Array} AnimationClip list, safe to hand to an AnimationMixer
 */
export function resolveClips(clipsByName, opts = {}) {
  const overrides = opts.skeleton ? SKELETON_OVERRIDES : {};
  const clips = [];
  for (const [gameName, candidates] of Object.entries(ALIASES)) {
    // Preferred set first (skeleton overrides), then the general candidates, so a
    // missing override never leaves a rig with no clip at all.
    const weapon =
      opts.spear && gameName === "1H_Melee_Attack_Slice_Diagonal"
        ? ["Melee_1H_Attack_Stab"]
        : opts.dart && gameName === "2H_Ranged_Shoot"
          ? ["Ranged_1H_Shoot", "Ranged_1H_Shooting"]
          : [];
    const names = [...weapon, ...(overrides[gameName] ?? []), ...candidates];
    let source = null;
    for (const n of names) {
      if (clipsByName.has(n)) {
        source = clipsByName.get(n);
        break;
      }
    }
    if (!source) continue;
    const clip = source.clone();
    clip.name = gameName;
    clips.push(clip);
  }
  return clips;
}

/** Clips for the loaded library, under the names the game requests. */
export function gameClips(opts = {}) {
  if (!ready) return [];
  return resolveClips(library, opts);
}

/** Fallback used before the library loads, so callers always get an array. */
export function clipsOrFallback(fallback) {
  const clips = gameClips();
  return clips.length ? clips : (fallback ?? []);
}
