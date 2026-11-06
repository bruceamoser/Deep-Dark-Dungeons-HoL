**v0.4.1 — More choices for early training**

- Fix the empty purchase list after culture and background grant Arms and Armor, and the same shortage in other disciplines. Every discipline now has five starter powers: its existing origin grant plus four purchases costing 1, 2, 2 and 3 DP.
- Add six general powers for any build, including 1-DP choices for remaining points. The catalog now has 165 powers; all 2,304 culture/background pairings have enough choices to spend their early-training pool. Discipline purchases still begin at level 1.
- New options include Hamstring, Pommel Rattle, Blade Ward, Plated Advance, Covering Shot, Vital Spark, and recipe training. They use actual combat, movement, healing and crafting mechanics with explicit limits.
- Preserve existing origin grants, saved heroes and legacy ability mappings. Learning another weapon technique no longer grants a duplicate starter weapon. Block redundant recipe training.
- Explain when all DP is spent, label rank-1 purchases correctly during early training, and prevent condition-cleansing powers from wasting actions on unaffected targets. Mixed healing/cleansing works on afflicted allies even at full HP.

### Install

- **Debian/Ubuntu x64:** download `Deep-Dark-Dungeons-HoL-0.4.1-amd64.deb`, then run `sudo apt install ./Deep-Dark-Dungeons-HoL-0.4.1-amd64.deb`. The package configures its own sandbox helper.
- **Other Linux x64:** download the AppImage or `linux-x64.tar.gz` installer bundle. Extract the bundle and run `bash install-linux.sh`. Restricted Ubuntu AppImage users need Chrome/Chromium's trusted sandbox helper.
- **Windows x64:** run `Deep-Dark-Dungeons-HoL-Setup-0.4.1-x64.exe`. The installer is unsigned.

Installed games check and download updates. **Updates → Save & restart to install** saves the current journey first; Debian upgrades may request administrator authorization. The source-checkout launcher runs its rebuilt local copy instead of self-updating.

This remains a playable development release; long-term balance and production art remain in development. Original book/Foundry files and vendored rules are unchanged.
