# Ash Demon — heat-veined fiend

Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, text15c6f36ace676ad5bc914776e7bbaf4472dc1cb0f329032ed99b9f50aa7a109f. Burning striker made of ash/smoke and inner heat, with horns, wings and tail. Source portrait reviewed.

Owned search compared the earlier Ash Demon (useful separable anatomy but a crude body/face), Mason Body01 and the now-reviewed Cinder Imp assembly. Retained owned body/claws/expressive face, old demon horn/wing/tail parts and their reviewed animation approach. No gear: a book, armor or pitchfork would obscure the elemental role. Larger scale, hunched posture and molten dark surface distinguish this from small orange-winged Cinder Imp and armored red Horned Devil. Original sources remain untouched.

TextureCraft Asphalt starts the material. Rejected glowing Pores dots and overly broad Voronoi patches; Marble veins with matching color/emission/height now forms readable hot fissures through charcoal. Six mapped surfaces plus dark hip surface receive explicit emission maps. Runtime ambient adds one point-cloud smoke draw following spine_03 and a subtle heat pulse on cloned emissive materials; no source material mutation. Smoke drifts behind the head and fades upward.

320 frames across six clips reviewed; final surface stills reviewed after material revisions. Floor clearance0.002m across all states. Reimport is read-only, no loose/zero-area/unweighted geometry. Muted final bestiary and six-Ash/four-hero dungeon review passed, including18 moving finite smoke points per actor and zero page/console errors. Smoke size was corrected for both orthographic dungeon and perspective bestiary cameras.376 tests and required-assets production build pass (existing chunk warning). Final hash `d57c5718279e8bfe3fc3839f30a9d26d36b33eb71930e901b21702b74682d8fd`,3,139,312 bytes,28,690 triangles,46 bones,six clips,16 materials/18 primitives,28 packed maps.

Private root `~/.local/share/four-lanterns-creature-production/ash-demon/`. Rebuild JSON through owned builder, `assemble-cinder-imp.py` into the private Ash anatomy folder, `texture-ash-demon.py`, `animate-ash-demon.py`. Purchased inputs/exports private-only.

Author fit80/100: anatomy4, silhouette4, signature4, gear4, materials4, distinction4. Remaining: a solid stylized body rather than fully volumetric ash, one-joint wing panels and shared fiend facial structure. Bulk user review/install/performance deferred.
