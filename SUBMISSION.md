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

- [ ] Open **Agent Hooks** in Kiro, confirm the three hooks are listed, save `model.js` once to see the test hook run, and note the result in KIRO.md. (Hook commands and matchers were checked by hand only; the panel was not observed.)
- [x] Public GitHub repository: https://github.com/xiaoliu202/kiroween-spectral-focus
- [x] GitHub detects the MIT license. Still check by eye that `.kiro/` is visible in the repo.
- [x] Pages source is GitHub Actions. CI (verify + deploy) passed. Live app URL: https://xiaoliu202.github.io/kiroween-spectral-focus/ (no login needed, so no judge credentials).
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
- Robust: absolute deadlines that survive refresh, a non-destructive v1 → v2 migration, damaged storage that is preserved, never overwritten, and a versioned JSON backup with a previewed, confirmed restore.

## How I used Kiro (paste into Devpost; details in KIRO.md)

I built the base app with another coding agent, then moved it into **Kiro IDE** for a spec-driven iteration.

- **Specs.** In Kiro I reviewed the existing spec against the code, then wrote `.kiro/specs/kiro-iteration` with requirements in WHEN/THEN form, a design and a task list. Kiro implemented the tasks in order. Because I wrote the model rules as invariants first ("balance = 10 × first completions − lantern costs", "remaining time never exceeds the chosen duration"), they could be tested directly. Vibe coding would have produced example tests instead.
- **Property-based testing.** Kiro turned the eight invariants into fast-check properties that run random sequences over the real model API. Within seconds they found a bug that 52 example tests had missed. A stored deadline 1 ms more than a full session away showed 25:01 and made the candle taller than full, for example after the local clock moved backwards. The fix is `clampDeadline()`, and the shrunk counterexample is now a regression test. A second failure was a bug in my own property, and Kiro fixed the test rather than the model.
- **Steering.** `product.md` holds the culture, privacy and accessibility rules, `tech.md` the static eight-file architecture and commands, and `testing.md` (fileMatch on `tests/**`) the testing lessons. With these in place, Kiro's new effects came out `aria-hidden` and static under reduced motion without extra prompting, and Kiro never added a framework or build step.
- **Hooks.** Three hooks are defined in `.kiro/hooks`: one runs the model and property tests when `model.js` or its tests are saved, one re-checks citations and framing when folklore text changes, and one runs fast checks when the agent stops. (Change "defined" to "run" only after you have seen them fire in the Agent Hooks panel.)
- **Verification.** Kiro ran the full suite (63 model tests including 6 properties, 15 real-Chrome groups with axe) after each change. It also noticed the old report leaked a local username and wrote a scrubbing report script.

## Devpost form: final text

**Project name** (31/60): `Spectral Focus · Halloween Town`

**Elevator pitch** (190/200): `A haunted little town for your to-do list: every unfinished task is a ghost, focus is a candle that burns down, and finishing work clears the night sky. Private, no account, built with Kiro.`

**Built with:** Kiro, HTML5, CSS3, JavaScript, SVG, Web Audio API, fast-check, Playwright, axe-core, GitHub Actions, GitHub Pages

**Try it out links:** https://xiaoliu202.github.io/kiroween-spectral-focus/ and https://github.com/xiaoliu202/kiroween-spectral-focus

**Category:** Costume Contest

### About the project (Markdown)

```markdown
## Inspiration

I wanted a to-do app that treats unfinished work the way Halloween treats ghosts: something that hangs around until you settle it. Most focus timers are a number counting down. I wanted a candle you can watch burn, and a night sky that gets quieter as you finish things.

## What it does

**Spectral Focus · Halloween Town** is a private productivity app with four places to visit:

- **The Town:** an illustrated street where bats cross the moon, chimney smoke rises, and a small ghost wanders between cottages. Each unfinished task is also a ghost drifting across every page, so the sky clears as you settle your list.
- **Hauntings:** tasks with notes, priorities, search and filters. The first time you complete a task, its ghost lifts away and a +10 candy floats up.
- **Candle Room:** a 15, 25 or 45-minute focus session as a candle that burns down in real time, plus a five-minute rest. When the candle goes out, smoke curls from the wick. The timer uses absolute deadlines, so it survives a refresh.
- **Folklore Cabinet:** candy buys four lanterns. The lanterns hop and gulp down a candy. Focus sessions and first completions unlock six folklore cards, each with its own small animation and cited sources (Library of Congress and others). Folklore is labelled as folklore, and Halloween is not mixed up with Día de Muertos.

Everything stays in your browser: no account, no backend, no tracking, and no remote images or fonts. All art is original SVG and CSS, and the night wind is synthesized with Web Audio. It respects reduced-motion settings, works from 375px to 1280px, and can export and restore a private JSON backup.

Honest rules: candy is only earned on a task's first completion, only fully finished focus sessions count, and finishing a session never marks a task done for you.

## How I built it

It is plain HTML, CSS and JavaScript with no build step. Production is eight static files, deployed to GitHub Pages by GitHub Actions. `model.js` holds every rule and has no DOM code, so it can be tested on its own.

The first version of the app was generated with another coding agent. I then moved the project into **Kiro IDE** and did the rest of the work there:

- **Spec-driven development.** I reviewed the existing spec against the code, then wrote a new spec in `.kiro/specs/kiro-iteration` (requirements in WHEN/THEN form, a design, and a task list) before changing any code. Kiro then worked through the tasks in order.
- **Property-based testing.** I wrote the model rules as invariants first, for example "balance always equals 10 × first completions minus lantern costs" and "remaining time never exceeds the chosen duration". Kiro turned them into six fast-check properties that run random operation sequences against the real model.
- **Steering.** Three steering files hold the product, culture and accessibility rules, the static architecture and commands, and testing lessons. Kiro kept new decoration `aria-hidden`, kept it away from controls, and never added a framework.
- **Hooks.** Three hooks are defined in `.kiro/hooks`. One runs the model tests when `model.js` or its tests are saved. One re-checks citations when the folklore text changes. One runs fast checks when the agent finishes.
- **Verification.** Every change was checked with 63 model tests, 15 groups of real-Chrome tests with axe accessibility scans, and a CI run on GitHub.

`KIRO.md` in the repository records, step by step, what was done in Kiro and what was not.

## Challenges

- **A bug the example tests missed.** The property tests found, within seconds, that a stored timer deadline slightly further away than a full session made the clock show 25:01 and the candle grow taller than full. This can happen if the computer's clock is set backwards. The 52 example tests I already had never built that input. The fix is a small clamp, and the shrunk counterexample is now a regression test.
- **Decoration that must not get in the way.** The drifting ghosts sit behind the content and never block clicks. They fade during a focus session and disappear with reduced motion.
- **A stale cache.** After one deploy, a browser with an old cached stylesheet showed a ghost the size of the whole page. I now version asset URLs on every deploy, hide the drifting layer until its styles are confirmed, and have a browser test that reproduces the stale-CSS case.

## Accomplishments that I'm proud of

- A property-based test suite that found a real defect in the timer logic.
- An app that is playful on the surface, but whose rules are strict and tested: rewards cannot be farmed, damaged storage is never overwritten, and migration from the first version never deletes old data.
- Cultural content with sources, instead of invented history.

## What I learned

Writing invariants before code changes how you review the code. The properties also showed where my own tests were wrong, and one early failure was a bug in my test, not in the app.

## What's next

An installable offline version, more lantern designs, and a gentle weekly summary of focus time, all kept local.

**Live app:** https://xiaoliu202.github.io/kiroween-spectral-focus/
**Source:** https://github.com/xiaoliu202/kiroween-spectral-focus
```