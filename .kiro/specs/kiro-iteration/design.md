# Kiro iteration 1 · Design

## Property tests (R1)

- New file `tests/model.property.test.cjs`, run by `npm test` together with the existing example tests. It uses `fast-check` (dev dependency only) with `node:test`.
- A command model generates operation lists: `add`, `edit`, `toggle(i, done)`, `delete(i)`, `buy(skin)`, `select(skin)`, `setTimer(mode, minutes, linkTask)`, `start(dt)`, `pause(dt)`, `tick(dt)`, `reset`. Task indexes are taken modulo the current task count so every generated operation is meaningful. The clock only moves forward (`dt ≥ 0`), with occasional large jumps past the deadline.
- After every operation the test checks the global invariants (R1.1, R1.2, R1.4) and the monotonic progress/unlock counters (R1.3). After the run it does a save/load round trip through an in-memory storage (R1.5).
- Arbitrary storage content uses `fc.jsonValue()` and record shapes that look like real v2/v1 data, so the normalizer receives both garbage and near-valid input (R1.6, R1.7).
- `numRuns` is kept moderate (200–300) so `npm test` stays fast enough for the save hook. A failing seed is printed by fast-check and can be replayed.

## Visual polish (R2)

- `app.js`: on a first-completion toggle (the reward is non-zero), add a `just-settled` class to the task card plus two decorative `aria-hidden` spans (`.settle-wisp`, `.settle-treat`) that remove themselves on `animationend` or after a timeout fallback. Rendering and the model are not changed.
- `app.js` `renderTimer`: toggle `is-snuffed` on `.candle-wrap` when a focus session is finished and not running.
- `index.html`: add an `aria-hidden` `.smoke` element inside `.candle-wrap` above the flame.
- `style.css`: keyframes `ghost-release`, `treat-rise`, `smoke-curl`. The existing global reduced-motion rules already disable animations. Each effect also needs a static fallback: the smoke stays visible at low opacity and the wisp/treat are hidden.

## Kiro artifacts (R3)

- `.kiro/steering/tech.md` (always), `.kiro/steering/testing.md` (`fileMatch` on `tests/**`).
- `.kiro/hooks/model-tests-on-save.json`: `PostFileSave`, matcher `model\.js|tests[\\/]`, runs `npm test`.
- `.kiro/hooks/culture-guardrails.json`: `PostFileSave`, matcher `lore\.js|CULTURE\.md`, agent prompt that restates the cultural guardrails.

## CI and Pages (R4)

`.github/workflows/pages.yml`: on push/PR, `npm ci`, install Chrome with Playwright, run `npm run verify`. On push to `main`, copy the eight production files into `_site/` and deploy with `actions/deploy-pages`. Only the static files are deployed, never tests, evidence or `.kiro`.
