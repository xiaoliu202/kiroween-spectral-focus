# Kiroween 2026 submission checklist and draft

Deadline: **Dec 4, 2026, 2:00 PM PT**. No extensions, and entries cannot be edited after the deadline. Requirements below are summarized from the official Devpost page and Official Rules (https://kiroween.devpost.com/). Re-read the Rules before submitting.

Category: **Costume Contest**. Build any app, but focus on a polished, memorable, spooky UI that supports the app's function.

## Checklist

Done in the repository:

- [x] `LICENSE` (MIT) at the root.
- [x] `/.kiro` at the root, not in `.gitignore`, with specs (`spectral-focus`, `kiro-iteration`), steering (`product`, `tech`, `testing`) and hooks (3).
- [x] All source, assets and run instructions (README). No build step and no secrets.
- [x] CI + GitHub Pages workflow (`.github/workflows/pages.yml`).
- [x] Honest Kiro write-up ([KIRO.md](KIRO.md)) and demo script ([DEMO-SCRIPT.md](DEMO-SCRIPT.md)).
- [x] English UI and documentation.

Owner steps (cannot be done locally):

- [ ] Open **Agent Hooks** in Kiro, confirm the three hooks are listed, save `model.js` once to see the test hook run, and note the result in KIRO.md.
- [ ] Create a **public GitHub** repository (not GitLab/Bitbucket) and push:
  ```sh
  git remote add origin https://github.com/<you>/spectral-focus.git
  git push -u origin main
  ```
- [ ] Check that GitHub shows "MIT license" in the About box and that `.kiro/` is visible in the repo.
- [ ] Settings → Pages → Source: **GitHub Actions**. Wait for the workflow, then open the Pages URL. This is the live app URL. No login is needed, so no judge credentials.
- [ ] Record the demo video (< 3:00) from DEMO-SCRIPT.md and upload it to YouTube publicly.
- [ ] Fill in the Devpost form: repo URL, live URL, video URL, description, and how Kiro was used (below).
- [ ] Disclose pre-existing work honestly. The base app was built with an external agent, then iterated in Kiro. Confirm that all of it was created during the submission period (on or after Oct 30, 2026).
- [ ] Optional: claim the free 4,000 Kiro credits by **Dec 1, 12:00 PM PT**.
- [ ] Optional bonus prizes. Bonus Blog Prize: publish a post during the submission period that says it was written for Kiroween 2026. Social Blitz: a post starting with `#KiroweenHackathon26`. Best Demo is automatic.

## Judging (stage 2, 20% each)

Potential Impact, Technological Implementation (depth of Kiro use), Design, Innovation/Idea, Presentation (the video). Stage 1 is pass/fail on theme fit and Kiro use.

## Description (paste into Devpost)

**Spectral Focus · Halloween Town** is a private, no-account focus app for procrastinators who like Halloween. Tasks are "hauntings" whose ghosts drift away when you settle them. A focus session is a candle that burns down in real time and leaves a curl of smoke when it goes out. First completions earn virtual candy. Candy buys lanterns, starting with the old-world turnip, and unlocks six folklore cards that cite the Library of Congress and other sources. The whole town is original SVG/CSS, the night wind is synthesized with Web Audio, and nothing leaves the browser. There is no backend, no tracking and no remote assets.

- Four views: an illustrated Town, Hauntings (tasks), Candle Room (15/25/45-minute focus and 5-minute rest), Folklore Cabinet.
- Honest rules: candy only on a task's first completion, only finished focus sessions count, and finishing focus never auto-completes a task.
- Accessible: keyboard dialogs, axe-clean WCAG A/AA scans, app and system reduced-motion, and layouts from 375px to 1280px.
- Robust: absolute deadlines that survive refresh, a non-destructive v1 → v2 migration, and damaged storage that is preserved, never overwritten.

## How I used Kiro (paste into Devpost; details in KIRO.md)

I built the base app with another coding agent, then moved it into **Kiro IDE** for a spec-driven iteration.

- **Specs.** In Kiro I reviewed the existing spec against the code, then wrote `.kiro/specs/kiro-iteration` with requirements in WHEN/THEN form, a design and a task list. Kiro implemented the tasks in order. Because I wrote the model rules as invariants first ("balance = 10 × first completions − lantern costs", "remaining time never exceeds the chosen duration"), they could be tested directly. Vibe coding would have produced example tests instead.
- **Property-based testing.** Kiro turned the eight invariants into fast-check properties that run random sequences over the real model API. Within seconds they found a bug that 52 example tests had missed. A stored deadline 1 ms more than a full session away showed 25:01 and made the candle taller than full, for example after the local clock moved backwards. The fix is `clampDeadline()`, and the shrunk counterexample is now a regression test. A second failure was a bug in my own property, and Kiro fixed the test rather than the model.
- **Steering.** `product.md` holds the culture, privacy and accessibility rules, `tech.md` the static eight-file architecture and commands, and `testing.md` (fileMatch on `tests/**`) the testing lessons. With these in place, Kiro's new effects came out `aria-hidden` and static under reduced motion without extra prompting, and Kiro never added a framework or build step.
- **Hooks.** One hook runs the model and property tests on every save of `model.js` or its tests. Another re-checks citations and framing when folklore text changes. A third runs fast checks when the agent stops.
- **Verification.** Kiro ran the full suite (59 model tests, 14 real-Chrome groups with axe) after each change. It also noticed the old report leaked a local username and wrote a scrubbing report script.
