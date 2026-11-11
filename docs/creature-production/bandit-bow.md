# Bandit Bow — sequential production

Status: source-integrated after author review; bulk user review/delivery/performance deferred. Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, textSHAa2a673efa0e3702bf6751b7ba1dc88923115540b7d2e69718da9e9460e29a236. Light roadside robber, hunting bow/spare string/camouflage; portrait hood, face wrap, quiver, green/brown worn clothing.

Inspected owned Hat05 hood, AC08 cloth face strips, Body05/Cloak03 and the Bow/Arrow supplied meshes, deform rigs and matching20-frame attack clips. Choose Bow01 plain hunting form, Arrow01; preserve their small8/1-bone rigs and synchronized animation rather than export a rigid bow. Existing source-rest matrices verified, attachment must be reviewed with actual nock/string/hand positions. KayKit Adventurers quiver and RPG Tools rope_bundle_B provide spare ammunition/string silhouette. Green/ochre/brown palette, pale skin, dark brows; no ninja-black costume or topknot. Reuse supplied hood/cloth forms and fit recipes, no new anatomy. Review release timing/projectile duplication and gear/cloak clearance before promotion.

## Author model/motion review

6,067triangles,52bones (43humanoid +8bow +1arrow),six merged animation clips,13materials/three textures,23draw calls. Original bow and arrow rest matrices match their source animation rigs. Their NLA tracks merge with corresponding body states; idle weapon strips are trimmed to each body clip so they do not extend the walk/hit/death duration. No bone-name retargeting or rigid bow substitution.

Front/side/back and299motionframes reviewed, including all states plus actual bow draw/release. At full draw the source nock is within.023–.035 units of drawing hand; arrow shaft follows right hand and scales down on release. Exported GLB scale keys verified: full size through.4s, hidden scale.01 at13/30s, restored at.7s. Runtime release must use13/30s (not default.28 or an incorrectly zero-offset.4). The projectile launches from actual BowJoint05 plus shaft-center offset. Quiver first clipped hood; tilted outward so fletching clears it. Reimport zero degenerates/unweighted vertices and finite skinning including bow attack pass.

Fit A5/S4/F4/G5/M4/D4 =89/100. Hood/face wrap, hunting bow, quiver and spare string communicate roadside ambusher. Clean short cape replaces torn layered camouflage; source bow has broad reinforced limbs, slightly ornate for a plain hunting bow. Basic close attack is an improvised strike with the held arrow, preserving source motion. No performance or user bulk approval claim.

Actual development-game projectile sampling passes: nock/hand gap.022–.033 world units during.30–.40s draw, held arrow hidden at.433s, real arrow projectile visible in flight and held arrow restored on recovery. All positions finite, no JS errors. Six-instance/four-hero game-scale and bestiary bow-clip routing also pass. A second capture uses the unobstructed far archer so stairs do not hide the shot.

The first dungeon flight capture exposed an oversized standard projectile (2.08 units versus the1.06-unit held arrow). Added a per-attack projectile scale: .84 gives1.06 units, with.54 nock-to-center offset. Repeat the actual shot capture after this visual correction; source held arrow/rig is unchanged.

Corrected-size projectile recapture passes and is visually reviewed. All371 tests and required-private-assets build passed before the final projectile scale correction; focused effect tests and actual game capture pass afterward. No installer/performance update. Review capture now clears its generated frame directory first so rejected longer captures cannot leave stale tail frames.

## Clearance revision — supersedes original fit above

A later full-frame ground inspection caught bow tips below the floor and backpack/hood penetration on the backward fall, missed by the earlier coarse screenshots. Reopened this creature. Current bow cant60°/height.77 and arrow length.75 preserve source rigs; use forward Die02 with bounded assembled root contact (maximum.1121 units). New307-frame review and every-frame ground audit pass: equipment clears ground; original sole contact is within.017 units. Reimport and finite checks pass. Current projectile scale.63/launch offset.398 match the revised.795-unit held arrow. Actual dungeon shot and bestiary recaptured; user/performance/delivery still deferred.
