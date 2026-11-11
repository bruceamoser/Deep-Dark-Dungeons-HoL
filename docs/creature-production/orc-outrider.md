# Orc Outrider — sequential production

Status: source-integrated after author review; bulk user review and installed delivery deferred.

Pinned source `24e545e6d860e8c1b03a21356fd22cae1c039785`, text SHA `770e3d58e8e5af34808d624da9ceee2ab9e4429436cbd9f99f995ef068214352`. Strong orc scout on foot, weathered travel gear, well-kept blade; patrol/caravan role. Illustration: olive skin, small pointed ears, stern jaw, dark tied hair, leather/green cloth, curved blade and packed bedroll. No mount required by profile.

Owned search: inspected source human head variants (none is a finished orc), all mouths and accessory ears. Test Head01_Male with supplied AC04_ShortEars, toothed Mouth06 and angled brows to establish a distinct orc face; no invented head sculpt unless this fails. Hair12 tied-back dark style fits scout. Body17 has asymmetric light shoulder protection and scarf; Cloak02 provides a short travel layer, BackPack01 carries rolled supplies. Supplied OHS08 curved sword already reviewed on Road Bandit: reuse source mesh with steel/olive/leather palette, original SingleSword motion. Do not add bow-only gear merely for decoration when this profile fights with its blade.

Adapted library checked: reuse packed-travel palette ideas, source source-rig cloak handling and curved-blade assembly. Reject Soldier's heavy enclosed helmet and Cultist's robe. Owned nonweapon candidates include bedroll pack, flask, rope and quiver; choose pack as main support detail to avoid overloading cloak/weapon silhouette. Palette: olive green skin/cloth, dark hair, brown leather, muted metal; preserve teeth/eye contrast. Check ears through hair and pack through cloak in all states.

## Reviewed adaptation

8,016 triangles, 43 bones, five source clips; zero degenerate faces/unweighted vertices after reimport. Front/side/back and 242-frame source motion reviewed. Initial AC04 ears were top-mounted animal ears and looked feline; rejected that placement. Refit each supplied half around inspected pivots, outward/downward to lateral ear position. Identified original Head01's two detached ear components (73 vertices each), removed only those from the copy to avoid double ears. Main closed head/nose preserved; guarded topology edit expects exactly two components. No global weld/hidden-face purge.

Hair12's silhouette was also too animal-like with those ears; final uses Hair07 dark tied topknot. Toothed Mouth06, angled brows and olive skin distinguish the orc from existing human/goblin heads. Existing source sword grip, cloak bones and packed bedroll remain attached through slash, walk, hit and full death.

Author fit A4/S4/F4/G4/M4/D4 = 80/100. Coherent clean orc scout adaptation; chibi proportions rather than long legs, stylized toothy mouth rather than realistic lower tusks, simplified pale metal accents and clean travel gear. Quiver omitted because current combat profile uses a blade. Bulk user review can flag these identity choices for refinement; no user-per-creature approval claimed.

Actual development bestiary five-state controls and six Outriders beside four heroes passed with correct asset routing and no JS errors. Eight focused production/equipped tests pass. Modified head/ears and scout kit registered in adapted library. Installed game unchanged.
