# HoL rules intake

## Located sources

- Authoritative book checkout: `/home/bmoser/repos/heroes-of-legend`.
- Existing implementation: `/home/bmoser/repos/heroes-of-legend-foundry`.
- Book HEAD observed: `f3713b60f3000d4fefc44c69428a8d358fe3be5b`.
- Foundry HEAD observed: `137cbd9afaf00d5e1520f920c2aadba57d7ea3d2`.
- Foundry content source-lock book pin: `24e545e6d860e8c1b03a21356fd22cae1c039785`.

These are intake observations, not a reconciled game content baseline. Compare later source changes and approval records before importing. Read Git objects at the chosen pin; do not import unrelated uncommitted work or historical archives.

## Required coverage

Character creation includes attributes, ten ancestries and trait choices, culture/background paired grants, languages, separate level-0 and level-1 DP ledgers, class minimums, discipline rank prices, signatures, ability requirements, duplicate compensation, equipment grants, recipes, shopping, held items, Bulk and derived statistics.

Preserve 3d6 plus one attribute, canceling Boons/Banes and retaining best/worst three; no skill bonus. Preserve card-defined outcomes and player-facing defense rolls. Do not introduce conventional random weapon damage, mana, spell slots or opposed attack rolls.

Preserve all five wound tables, conditions, Grit, Dying, Last Words and recovery. Ordinary rest never refreshes Grit. Full rules text and catalog availability do not establish full automation: track supported behavior explicitly.

## Adaptation policy

Record every computer-game adaptation separately from canonical HoL. Procedural encounter selection, automated judgments, encounter detection, exploration timing and death/save policy require explicit game design decisions. Never label an invented approximation as an inherited HoL rule.

Existing Foundry-independent rules modules and web Character Workshop are reuse candidates. Assess dependencies and tests before selecting an engine integration strategy. Do not modify either source repository as part of game implementation.
