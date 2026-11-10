**v0.8.6 — Ready for the road**

- One party Supplies screen with reviewed Greyhaven restocking, preferred departure stock and exact coin/Bulk previews.
- Shared food, crafting and medicinal ingredients; deterministic specialist camp projects with recipient selection and work-order shortage previews. Advanced crafting remains separate.
- Compatible migration preserves existing supplies and legacy material value/weight. Maker’s Gift retains its daily limit.
- Fixes field ability targeting, combat diagonal movement and consent before movement through hazards. Creatures escape harmful areas and use applicable condition remedies.

Existing journeys remain compatible. Installers retain the same save and application identifiers.

### Install

Debian/Ubuntu: `sudo apt install ./Four-Lanterns-Deep-0.8.6-amd64.deb`. Other Linux: AppImage or Linux installer bundle. Windows: `Four-Lanterns-Deep-Setup-0.8.6-x64.exe`. Installed releases: **Settings → Updates**.

---

**v0.8.5 — The creatures fight back**

- **Distinct enemy tactics.** Pack hunters coordinate, duelists seek separate opponents, guardians protect nearby ground and allies, predators pursue exposed heroes, and ranged creatures seek clear shots and firing distance. Supports relieve afflicted allies and controllers disrupt the company.
- **Real creature abilities.** Creatures choose from all their printed main attacks, including third attacks. They use useful control, support, terrain and movement maneuvers, obey ammunition and attack cooldowns, and avoid poor friendly-fire angles. Breath cones affect allied creatures too. The bestiary explains behavior and lists every attack.
- **Counterplay to control.** Use **Break free** to spend a Main Action escaping a creature's hold, or **Clear caltrops** to remove a nearby patch. Creature movement follows terrain, occupancy and the printed opportunity-attack exemptions. Creature opportunity strikes use their own basic attack profiles.
- **Simpler camp planning.** Choose two tasks per companion. Injured heroes show expected healing. Company stores show each hero's current supplies, actual portrait and possible gains; arrow controls set camp work order before resting. The bottom hourly rota, odds tables, stock projections and consumption counters are gone. Outcomes report what was found, made or healed.
- **Rest preserves supplies.** Dungeon camp and town sleep no longer automatically consume food, water or lighting supplies, or defer those costs until departure. Crafting and care still require materials. Water flasks have a larger starting/refilled supply, while existing partially used supplies remain until refilled.
- **Discipline competence.** Wilderness, Craft and Medicine each provide small relevant foraging benefits that improve with rank, stacking with stronger dedicated abilities. Existing characters gain them automatically.
- **Torch and portrait fixes.** Held torch illumination follows the animated flame instead of the head. Portraits frame the equipped character's face correctly. Temporary creature light fields correctly release automatically doused torches when they expire.

Existing Forge journeys continue; no character rebuild or respec is required. Creature statistics and encounter budgets are unchanged in this behavior update. The same installed identifiers and save locations are retained.

### Install

Debian/Ubuntu: `sudo apt install ./Four-Lanterns-Deep-0.8.5-amd64.deb`. Other Linux: the AppImage or Linux installer bundle. Windows: `Four-Lanterns-Deep-Setup-0.8.5-x64.exe`. Installed releases can use **Settings → Updates → Save & restart to install**.

---

**v0.8.4 — A quieter interface, a warmer welcome**

- The illustrated loading screen stays until you choose **Enter Greyhaven**. Click, Enter or Space enters after models, town assets, fonts, portraits, building images, music recordings and initial scene shaders are prepared. World simulation stays paused behind the screen.
- Greyhaven's directory now lists Lantern Inn (I), Market Square (M), Guildhall (G), Ember Smithy (S), Wayfarer Lodge (L), Healer’s House (H), The Shrine (Shift+S) and The Depths (D), with building thumbnails and descriptions. Shift+S resolves the two requested S shortcuts.
- The company cards have portraits rendered from each hero's actual appearance and equipped gear.
- Day/time sits beside the location at the center of the header. Save, runs, sound, updates, help, bestiary and camp controls are grouped under the settings gear in town and dungeon.
- **Tab** toggles the dungeon map; **J** toggles the expedition journal. These shortcuts do not consume combat actions or interfere with text fields and modal dialogs.
- Completed dungeon camps show actual HP recovery, wound changes, remaining material gains and a full activity record of foraging, production, water gathering and care. Reports survive saves and reopening until acknowledged. Breaking camp early reports completed work; town sleep also gets a recovery summary.

Existing Forge journeys remain compatible. Installers retain the same package/save identifiers. Licensed character sources remain private.

### Install

Debian/Ubuntu: `sudo apt install ./Four-Lanterns-Deep-0.8.4-amd64.deb`. Other Linux: the AppImage or Linux installer bundle. Windows: `Four-Lanterns-Deep-Setup-0.8.4-x64.exe`. Installed releases can use **Settings → Updates → Save & restart to install**.

---

**v0.8.3 — Four Lanterns Deep**

A new identity, clearer character customization and smoother dungeon play.

- **Four Lanterns Deep.** Illustrated title artwork, a matching desktop icon and four flickering lanterns with drifting embers on the loading screen. Reduced-motion settings keep the presentation still. The repository and current documentation now use the new name.
- **Better facial hair and fantasy choices.** Real fitted short/long beards, two genuinely distinct moustaches and one colour-customizable Mask. Pointed ears, crowns and the leaf ornament are removed; saved appearance choices migrate safely.
- **Correct equipment presentation.** Shields face forward upright with or without a weapon. Hammer heads turn correctly, and swords angle upper-left from the grip while retaining their ready pose.
- **Reliable prepared counters.** Retaliating Guard and similar preparations remain through the next turn. Shield Block explains that it spends the Reaction needed to strike back.
- **Continuous music.** Decoded recordings overlap on the audio clock with equal-power crossfades, avoiding a late stop/restart at the battle-loop seam.
- **Click to approach and open.** Chest/cache clicks walk over and open their contents. Stair clicks gather the company and show the travel dialog. Shift-click keeps Inspect; Escape or another movement order cancels the approach.
- **Manage action shortcuts.** Each hero gets a searchable popup for adding, removing and reordering eight shortcuts on **5–9, 0, minus and equals**. Hover/focus help explains current effects, costs, requirements, bonuses and availability, including disabled actions.
- **Choose a safer camp.** Locations have seven persistent fierceness tiers, shown as **Creatures in the area** on a green-to-red scale. Base eight-hour interruption chances range from **2% to 50%**; longer camps accumulate risk. The planner shows the selected duration's risk, including ancestry warnings. Guard improves ambush detection, and completed hours remain saved.
- **Compact-window polish.** Character rebuild controls stay above their footer, and action help no longer blocks combat clicks.

**Existing v0.6–v0.8 journeys continue.** Inventory, progression, injuries and spent Grit are preserved. The app's installed identifiers and save directory remain compatible. Old repository URLs redirect to the renamed release feed; existing installations can still check for updates.

### Install or update

- **Debian/Ubuntu x64:** install `Four-Lanterns-Deep-0.8.3-amd64.deb` with `sudo apt install ./Four-Lanterns-Deep-0.8.3-amd64.deb`.
- **Other Linux x64:** download the AppImage or Linux bundle. Extract the bundle and run `bash install-linux.sh`. Restricted Ubuntu AppImage installations require a system Chrome/Chromium sandbox helper.
- **Windows x64:** run `Four-Lanterns-Deep-Setup-0.8.3-x64.exe` (unsigned).

Installed releases can use **Updates → Save & restart to install**. Debian upgrades may request administrator authentication. Finished apps include licensed Dungeon Mason characters and KayKit scenery. Purchased source files and standalone models are not distributed.
