# Native roster performance — November 12, 2026

All 58 approved creatures passed a 10-second live dungeon combat sample with six opponents and four heroes, at 1600×1000/DPR1 on one NVIDIA RTX3090. Heroes have boosted HP and pass turns; creatures use their actual AI. Six enemy models remain rendered through smoke/concealment in cases21–58; the first20 already remained visible throughout. This is a controlled presentation/load test, not a balance test or a guarantee for every resolution and dungeon. Screenshots were taken after timing.

Average FPS across cases: 58.60–60.00. Worst p95: 16.8ms. Largest individual frame: 116.7ms; short samples include occasional hitches, so averages do not mean perfectly uniform pacing. All ten actors stayed visible/in frame; all six enemies stayed alive and turns advanced in every case. Zero JavaScript errors.

Normal user-service launch, exact launch-game.sh, aa-exec unconfined, mute-audio and isolated test saves. Final process checks confirm unconfined main process, space-free runtime, renderer Seccomp2 and no no-sandbox flag. Private raw results/screenshots: test-results/roster-performance/.

| Creature | Average FPS | p95 ms | p99 ms | Worst frame ms | Max draw calls | Max rendered triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Goblin Spearhand | 59.90 | 16.8 | 16.8 | 33.3 | 459 | 561,016 |
| Air Elemental | 59.60 | 16.8 | 16.8 | 33.4 | 470 | 526,272 |
| Wolf | 59.80 | 16.8 | 16.8 | 33.3 | 576 | 1,599,128 |
| Goblin Scrapper | 60.00 | 16.7 | 16.8 | 16.8 | 450 | 601,194 |
| Road Bandit | 59.80 | 16.7 | 16.8 | 33.3 | 462 | 288,844 |
| Shield Soldier | 60.00 | 16.7 | 16.8 | 16.8 | 506 | 278,600 |
| Goblin Firestarter | 59.60 | 16.8 | 16.8 | 33.4 | 646 | 578,208 |
| Grave Cultist | 60.00 | 16.8 | 16.8 | 16.8 | 546 | 269,652 |
| Hedge Sorcerer | 59.80 | 16.8 | 16.8 | 33.3 | 590 | 302,656 |
| Orc Outrider | 59.80 | 16.7 | 16.8 | 33.3 | 563 | 307,140 |
| Orc Shieldbreaker | 58.60 | 16.7 | 33.3 | 116.7 | 574 | 308,060 |
| Hobgoblin Shieldguard | 59.70 | 16.7 | 16.8 | 33.4 | 551 | 311,062 |
| Hobgoblin Marshal | 59.50 | 16.8 | 16.8 | 33.4 | 489 | 297,048 |
| Masked Duelist | 59.70 | 16.8 | 16.8 | 33.4 | 580 | 265,188 |
| Goblin Boss | 60.00 | 16.7 | 16.8 | 16.8 | 454 | 543,228 |
| Orc Warcaller | 59.60 | 16.8 | 16.8 | 33.4 | 599 | 290,784 |
| Lich — Tomb Sage | 59.30 | 16.8 | 33.3 | 33.4 | 550 | 285,816 |
| Bandit Bow | 60.00 | 16.8 | 16.8 | 16.8 | 627 | 279,340 |
| Hobgoblin Longbow | 59.70 | 16.8 | 16.8 | 33.4 | 643 | 314,429 |
| Goblin Rattlechanter | 59.70 | 16.7 | 16.8 | 33.4 | 706 | 598,468 |
| Goblin Smoke Slinger | 59.40 | 16.8 | 16.8 | 50.1 | 636 | 592,788 |
| Skeleton Sentry | 60.00 | 16.7 | 16.8 | 16.8 | 548 | 282,832 |
| Skeleton Archer | 60.00 | 16.7 | 16.8 | 16.8 | 497 | 291,372 |
| Skeleton Champion | 59.70 | 16.7 | 16.8 | 33.4 | 639 | 284,254 |
| Barrow Guard | 59.80 | 16.7 | 16.8 | 33.3 | 676 | 294,296 |
| Wight | 59.50 | 16.8 | 16.8 | 33.3 | 568 | 281,668 |
| Death Knight | 59.90 | 16.8 | 16.8 | 33.4 | 569 | 277,664 |
| Plague Zombie | 59.90 | 16.7 | 16.8 | 33.3 | 512 | 281,324 |
| Crypt Ghoul | 59.90 | 16.8 | 16.8 | 33.3 | 460 | 277,471 |
| Ghast | 59.90 | 16.7 | 16.8 | 33.4 | 366 | 291,140 |
| Kobold Tunnel Scout | 59.90 | 16.8 | 16.8 | 33.4 | 470 | 275,122 |
| Kobold Trapkeeper | 59.90 | 16.7 | 16.8 | 33.4 | 484 | 310,444 |
| Kobold Emberkeeper | 59.80 | 16.7 | 16.8 | 33.3 | 516 | 308,444 |
| Wererat | 59.30 | 16.8 | 33.3 | 33.4 | 424 | 311,328 |
| Werewolf | 59.60 | 16.8 | 16.8 | 33.4 | 362 | 280,084 |
| Werebear | 59.90 | 16.7 | 16.8 | 33.4 | 469 | 257,316 |
| Cinder Imp | 60.00 | 16.7 | 16.8 | 16.8 | 432 | 563,742 |
| Horned Devil | 59.60 | 16.8 | 16.8 | 33.3 | 669 | 612,460 |
| Ash Demon | 59.30 | 16.8 | 33.3 | 33.4 | 651 | 567,872 |
| Dire Wolf | 59.90 | 16.8 | 16.8 | 33.4 | 438 | 1,636,172 |
| Winter Wolf | 58.80 | 16.8 | 33.3 | 83.3 | 766 | 1,639,237 |
| Hell Hound | 59.90 | 16.7 | 16.8 | 33.2 | 614 | 1,639,808 |
| Giant Rat | 60.00 | 16.8 | 16.8 | 16.8 | 342 | 1,632,184 |
| Cave Bat | 60.00 | 16.8 | 16.8 | 16.8 | 370 | 1,588,204 |
| Giant Spider | 59.60 | 16.8 | 16.8 | 33.3 | 293 | 734,308 |
| Animated Armor | 60.00 | 16.7 | 16.8 | 16.8 | 465 | 247,824 |
| Animated Statue | 59.50 | 16.8 | 16.8 | 33.4 | 568 | 301,268 |
| Clay Helper | 60.00 | 16.7 | 16.8 | 16.8 | 417 | 1,646,330 |
| Clockwork Scout | 59.70 | 16.8 | 16.8 | 33.4 | 287 | 564,436 |
| Glass Sentinel | 59.90 | 16.7 | 16.8 | 33.3 | 615 | 502,995 |
| Stone Knuckle | 60.00 | 16.7 | 16.8 | 16.8 | 411 | 266,664 |
| Icebound Warden | 59.60 | 16.8 | 16.8 | 33.4 | 656 | 2,904,917 |
| Emberling | 59.90 | 16.8 | 16.8 | 33.3 | 448 | 400,484 |
| Cinder Strider | 59.90 | 16.7 | 16.8 | 33.3 | 483 | 1,708,844 |
| Grave Wisp | 60.00 | 16.8 | 16.8 | 16.8 | 409 | 439,008 |
| Shadow | 59.90 | 16.8 | 16.8 | 33.4 | 380 | 995,456 |
| Wraith | 59.30 | 16.7 | 33.3 | 33.4 | 510 | 247,814 |
| Mire Ooze | 59.70 | 16.8 | 16.8 | 33.4 | 539 | 2,488,213 |
