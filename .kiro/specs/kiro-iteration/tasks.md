# Kiro iteration 1 · Tasks

All tasks were executed in Kiro IDE on November 20, 2026. Notes record what actually happened.

- [x] 1. Property-based tests (R1)
  - [x] 1.1 Add `fast-check` as a dev dependency and include the new test file in `npm test` and `scripts/check.cjs`.
  - [x] 1.2 Operation-sequence property for rewards, purchases, lanterns and monotonic unlocks (R1.1–R1.3).
  - [x] 1.3 Timer-sequence property with a forward-only clock (R1.4).
  - [x] 1.4 Save/load round-trip property (R1.5).
  - [x] 1.5 Arbitrary v2 JSON and v1 migration properties (R1.6, R1.7).
  - [x] 1.6 Statistics property (R1.8).
  - [x] 1.7 Run, investigate and fix any counterexample; record findings in `KIRO.md`.
    - Model defect: a deadline more than one session away let `remaining` exceed the duration. Fixed with `clampDeadline()`; regression example test added.
    - Test defect: the migration property read `task.done` after toggling. Fixed in the test.
- [x] 2. Costume Contest polish (R2)
  - [x] 2.1 Ghost-release wisp and floating treat on first completion.
  - [x] 2.2 Candle smoke after a finished focus session.
  - [x] 2.3 Reduced-motion fallbacks; browser test assertions for both effects.
    - A smoke opacity assertion first sampled mid-transition (0.035). Fixed to read the settled value.
- [x] 3. Kiro workflow artifacts (R3)
  - [x] 3.1 Steering: `tech.md`, `testing.md`.
  - [x] 3.2 Hooks: model tests on save, culture guardrails reminder, plus fast checks on agent Stop. The JSON was written by hand because the hook tool was unavailable. The owner still needs to confirm the hooks in the Agent Hooks panel.
- [x] 4. Submission readiness (R4)
  - [x] 4.1 GitHub Actions verify + Pages deploy workflow. It has not run on GitHub yet.
  - [x] 4.2 `KIRO.md`, README, TESTING, earlier spec status, `SUBMISSION.md`.
  - [x] 4.3 `DEMO-SCRIPT.md` for a video under 3 minutes.
  - [x] 4.4 Run `npm run verify:report` (59 model tests, 14 browser groups, 10 screenshots) and refresh evidence. Added a path-scrubbing report script after finding the user name in the old report.
  - [x] 4.5 Initialize a local git repository and make the first commit (no push).
