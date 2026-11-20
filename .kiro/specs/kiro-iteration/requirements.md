# Kiro iteration 1 · Requirements

Status: written in Kiro IDE (Kiro agent session, November 2026) after reviewing the existing `spectral-focus` spec against `model.js`, `app.js`, `style.css` and the tests. This is the first iteration performed inside Kiro. Earlier work was done outside Kiro and is labelled that way in `../spectral-focus/`.

## Goal

Get Spectral Focus ready for the Kiroween 2026 Costume Contest submission. Make the model invariants machine-checked, make the two signature moments (ghost settles, candle burns out) more memorable, and add the Kiro workflow, CI and deployment files the submission needs.

## Requirements

### R1 Property-based tests for the model

1. WHEN any random sequence of task, reward, purchase and lantern operations runs THEN `balance` SHALL equal `10 × |rewardedTaskIds| − Σ cost(owned lanterns)` and SHALL never be negative.
2. WHEN that sequence runs THEN `rewardedTaskIds` and `owned` SHALL stay duplicate-free, `owned` SHALL contain `harvest`, and `lantern` SHALL be an owned design.
3. WHEN a task is reopened, completed again or deleted THEN the number of first completions and every unlocked culture card SHALL never decrease.
4. WHEN any random sequence of timer operations runs with a non-decreasing clock THEN completed session IDs SHALL be unique, each session SHALL be a 15/25/45-minute focus session, `remaining` SHALL stay within `[0, minutes × 60]`, and no task's `done` flag SHALL change.
5. WHEN a state produced by those operations is saved and loaded THEN the loaded state SHALL equal the saved state and produce no warning.
6. WHEN arbitrary JSON is stored under the v2 key THEN `load` SHALL not throw, SHALL return a state that satisfies R1.2, and SHALL not write to storage.
7. WHEN arbitrary v1 data is migrated THEN the v1 bytes SHALL stay unchanged, the starting balance SHALL be 0, and every completed task SHALL already be in the reward ledger.
8. WHEN statistics are computed THEN `totalMinutes` SHALL equal the sum over unique valid focus sessions, there SHALL be 7 days, and the 7-day sum SHALL not exceed the total.

### R2 Costume Contest polish

1. WHEN a task is completed for the first time from the Hauntings board THEN its ghost SHALL drift upward and fade with a short wisp, and a small "+10" treat SHALL float from the card.
2. WHEN a focus session ends THEN the extinguished candle SHALL show a curl of smoke above the wick.
3. WHEN the app motion setting or the system reduced-motion preference is on THEN both effects SHALL be static (no animation) and the final states SHALL still be readable.
4. Decorative effects SHALL be `aria-hidden` and SHALL not change model state or announcements.

### R3 Kiro workflow artifacts

1. Add steering for tech/commands and a test-file-scoped testing guide.
2. Add hooks that actually run during development: a command hook that runs the model tests when model or test files are saved, and an agent hook that reminds Kiro of the cultural guardrails when `lore.js` or `CULTURE.md` is saved.

### R4 Submission readiness

1. A GitHub Actions workflow SHALL run `npm run verify` and deploy only the static production files to GitHub Pages from `main`.
2. README, TESTING, the earlier spec, `SUBMISSION.md` and a new `KIRO.md` SHALL describe what was done in Kiro truthfully and keep the earlier "outside Kiro" labels.
3. A sub-3-minute demo video script SHALL exist.
4. Publishing, deploying, recording and submitting stay manual steps for the owner.
