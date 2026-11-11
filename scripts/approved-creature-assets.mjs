import { readFileSync, existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";

// Missing private inputs retain public fallbacks. Changed approved inputs fail
// visibly rather than silently shipping a different experimental model.
export function resolveApprovedCreatureAssets(
  root,
  manifest,
  { required = false } = {},
) {
  const models = {},
    missing = [],
    publicRoot = resolve(root, "public");
  const seen = new Set(),
    seenCreatures = new Set();
  for (const asset of manifest.assets) {
    if (seen.has(asset.model) || seenCreatures.has(asset.creatureId))
      throw Error("Duplicate approved creature entry");
    seen.add(asset.model);
    seenCreatures.add(asset.creatureId);
    const file = resolve(publicRoot, `.${asset.path}`);
    if (
      !asset.path.startsWith("/assets/licensed/creatures/") ||
      !file.startsWith(publicRoot + sep) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256)
    )
      throw Error(`Invalid approved asset: ${asset.model}`);
    if (!existsSync(file)) {
      missing.push(asset.model);
      continue;
    }
    const actual = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
    if (actual !== asset.sha256)
      throw Error(
        `Approved ${asset.model} hash mismatch; restore the reviewed export or complete a new review.`,
      );
    models[asset.model] = asset.path;
  }
  if (required && missing.length)
    throw Error(`Missing private creature assets: ${missing.join(", ")}`);
  return { models, missing };
}
