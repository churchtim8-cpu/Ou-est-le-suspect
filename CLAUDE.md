# Où est le suspect ? Notes for Claude

A French prepositions detective game set in Bellevue (TypeScript + Phaser, GitHub Pages). It is its own game on its own site, a sister to *Les Chasseurs de Primes Ultimes*: it shares the town, cast and lessons learned, not code at run time.

## Architecture rules

- `src/engine/` is pure TypeScript: no Phaser, no DOM, no `Math.random`. `tests/unit/enginePurity.test.ts` enforces this. All randomness goes through the seeded `Rng`.
- The street model (`src/content/*.ts`: landmarks and spots) is the source of truth for where things are. Artwork never decides what a tap means.
- A clue is a structured `{ prep, ref, part? }`; the French sentence is derived from it (`phraseFr`). Every clue must be true (`holds`) and unambiguous (`isUnambiguous`): exactly one spot on the street fits. `tests/unit/readerBot.ts` reads only the French and must always find the right spot.
- Tunable numbers (timers, scoring, twists) live in `src/engine/difficulty.ts`, never inline in scenes.

## Owner's rules

- Menus and buttons in ENGLISH; radio lines, characters' lines, signs and the case content stay FRENCH. English help only on Easy.
- Only places and prepositions approved in the plan (the town-deck places, 12 lesson-3 prepositions + 14 more, in tiers). No conditional structures.
- Never concatenate audio words. Voices (Gemini) only after the owner's explicit go for that exact batch, with the request count stated first; voices vibrant and happy, each character recorded separately, no pitch or speed changes.
- Moving traffic is never red or blue: "la voiture rouge" / "la voiture bleue" are the parked landmarks.
- Check proportions with screenshots before going live.

## Checks before pushing

`npm run check` (typecheck, unit tests, build) and `npm run test:e2e`. In the Claude cloud container, run browser tests with `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`.
