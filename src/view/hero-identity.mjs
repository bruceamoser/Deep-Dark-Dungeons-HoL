import {
  ANCESTRY_LOOKS,
  normalizeAppearance,
  signatureFor,
} from "../core/identity.mjs";
// Preserve each model's authored face, costume and texture; apply game ancestry stature.
export function dressIdentity(model, hero) {
  const ancestry =
    hero.draft?.ancestryId ?? hero.ancestryId ?? "ancestry-human";
  const look = ANCESTRY_LOOKS[ancestry] ?? ANCESTRY_LOOKS["ancestry-human"];
  const a = normalizeAppearance(
    hero.draft?.appearance ?? hero.appearance,
    ancestry,
    hero.name ?? "",
  );
  const sig = signatureFor(ancestry);
  const build = { slender: 0.9, balanced: 1, broad: 1.13 }[a.build];
  if (sig.hunch) {
    const spine =
      model.getObjectByName("spine") ?? model.getObjectByName("chest");
    if (spine) spine.rotation.x += sig.hunch;
  }
  if (sig.handScale)
    for (const name of ["hand.l", "hand.r", "handl", "handr"])
      model.getObjectByName(name)?.scale.multiplyScalar(sig.handScale);
  const head = model.getObjectByName("head");
  if (sig.longNeck && head) head.position.y += 0.12;
  model.scale.set(
    model.scale.x * look.width * build,
    model.scale.y * look.height,
    model.scale.z * look.width * build,
  );
  model.userData.height = 2.2 * look.height * 0.85;
  model.userData.appearance = { ...a, ancestry };
  return a;
}
