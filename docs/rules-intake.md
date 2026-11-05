# HoL rules intake

## Located sources

- Authoritative book checkout: `/home/bmoser/repos/heroes-of-legend`.
- Existing implementation: `/home/bmoser/repos/heroes-of-legend-foundry`.
- Book HEAD observed: `f3713b60f3000d4fefc44c69428a8d358fe3be5b`.
- Foundry HEAD observed: `137cbd9afaf00d5e1520f920c2aadba57d7ea3d2`.
- Foundry content source-lock book pin: `24e545e6d860e8c1b03a21356fd22cae1c039785`.

The standalone implementation and catalogs are imported at the Foundry pin, with hashes in `hol-source-lock.json`. No changes were found in the relevant book source families between its content pin and the observed book HEAD. Imports read committed Git objects; unrelated uncommitted work and historical archives are excluded.

## Required coverage

Character creation includes attributes, ten ancestries and trait choices, culture/background paired grants, languages, separate level-0 and level-1 DP ledgers, class minimums, discipline rank prices, signatures, ability requirements, duplicate compensation, equipment grants, recipes, shopping, held items, Bulk and derived statistics.

Preserve 3d6 plus one attribute, canceling Boons/Banes and retaining best/worst three; no skill bonus. Preserve card-defined outcomes and player-facing defense rolls. Do not introduce conventional random weapon damage, mana, spell slots or opposed attack rolls.

Preserve all five wound tables, conditions, Grit, Dying, Last Words and recovery. Ordinary rest never refreshes Grit. Full rules text and catalog availability do not establish full automation: track supported behavior explicitly.

## Adaptation policy

Record every computer-game adaptation separately from canonical HoL. Procedural encounter selection, automated judgments, encounter detection, exploration timing and death/save policy require explicit game design decisions. Never label an invented approximation as an inherited HoL rule.

Foundry-independent rules modules and the complete web Character Workshop are reused in the desktop runtime. Neither source repository is modified.
