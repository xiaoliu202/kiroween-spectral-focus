# How Kiro was used

This file records what was actually done in Kiro, and what was not. Keep it accurate. Do not add claims for features that were not used.

## Project history in two phases

| Phase | Tool | What happened |
| --- | --- | --- |
| 0 · Base build (Nov 2026) | An external coding agent, **not Kiro** | Static app, model, browser tests and the first `.kiro/specs/spectral-focus` and `.kiro/steering/product.md`, written as hand-off documents. These are labelled "prepared outside Kiro" in the files themselves. |
| 1 · Kiro iteration (Nov 20, 2026) | **Kiro IDE**, agent chat in Autopilot mode | Reviewed the existing spec against the code, wrote a new spec, then implemented every task in it: property-based tests, a model fix found by those tests, two UI effects, steering, hooks, CI/Pages and submission docs. |

## Spec-driven development

`.kiro/specs/kiro-iteration/` was written in Kiro before any code changed:

- `requirements.md` turns the competition goals into testable statements. R1 lists eight model invariants in WHEN/THEN form; these became the property tests one-to-one.
- `design.md` fixes the approach before coding: a random command sequence over the real model API, a forward-only clock, near-valid storage generators, and decorative-only UI effects that do not touch model state.
- `tasks.md` is the checklist Kiro worked through in order.

Writing the invariants first mattered. "Balance equals 10 × first completions minus lantern costs" is one line in the requirements and is checked after every random operation. As example tests, the same rule would need many hand-written cases.

## Property-based testing found a real defect

`tests/model.property.test.cjs` (fast-check, 6 properties, 250 runs each by default, also run with 3,000) checks R1.1–R1.8.

- **Model bug found.** Within seconds, the "remaining time stays within `[0, minutes × 60]`" property failed with the shrunk counterexample `{"timer":{"end": now + 1500001 ms}}`. A stored deadline more than one session away, from a local clock set backwards or from edited storage, made the clock show more than the chosen duration (25:01). The candle CSS height also grew past a full candle. The same failure appeared through v1 migration. The 52 existing example tests never built that input. Fix: `clampDeadline()` in `model.js` caps any deadline at `now + duration` on load and on tick. The counterexample is kept as a named regression test in `tests/model.test.cjs`.
- **Test bug found.** One migration property first failed because the test read `task.done` after toggling the task. The model was correct. The property was fixed rather than the model. This rule is now in `.kiro/steering/testing.md`.

Properties used: the reward/purchase ledger, lantern ownership, unlocks that never go backwards, timer range and session uniqueness, timers never completing tasks, save/load round-trip, arbitrary-JSON loading that never writes, v1 migration that never mints candy, and statistics deduplication.

## Steering

- `product.md` (always): product, culture and accessibility rules. Kiro followed them in this iteration. Examples: decorative effects are `aria-hidden` and static under reduced motion, no remote assets were added, and candy is still described as a game mechanic.
- `tech.md` (always): the eight-file static architecture and the exact commands. This kept Kiro from adding a build step or framework.
- `testing.md` (fileMatch `tests/**`): loaded only when test files are in context. It records lessons from this iteration, such as turning PBT counterexamples into regression tests and reading computed styles after transitions finish.

## Agent hooks

Files in `.kiro/hooks/`:

- `model-tests-on-save.json`: PostFileSave on `model.js` or `tests/model*.cjs` runs `npm test`, including the property tests.
- `culture-guardrails.json`: PostFileSave on `lore.js` or `CULTURE.md` injects an agent prompt that re-checks citations and framing.
- `verify-before-stop.json`: on Stop, runs the syntax check and model tests before the agent hands back.

The hook files were written by hand in the documented v1 JSON format, because the hook-creation tool was unavailable in this session. **Owner TODO:** open the Agent Hooks panel and confirm all three hooks are listed and fire. Record what you observe here before submitting.

## Iterating with Kiro

- A browser assertion for the new smoke effect failed with opacity `0.035` instead of `1`. The value was read during the 0.8 s fade-in. Kiro changed the assertion to read the settled value. It did not weaken the check or add a sleep.
- After the PBT fix, Kiro re-ran the full `npm run verify` (syntax, 59 model tests, 14 browser groups with axe) and regenerated the screenshots.
- Kiro found that the old `evidence/verification.txt` contained the local Windows username and paths. It added `scripts/verify-report.cjs`, which writes the report with those values replaced.

## Not used (so not claimed)

Kiro CLI, Kiro Web, Kiro Crew, custom agents, MCP servers and Kiro powers were not used in this project.
