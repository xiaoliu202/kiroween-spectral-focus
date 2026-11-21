# Verification · Halloween Town v2

## Stale-cache fix (November 21, 2026)

After the drift release, a browser that still had the previous `style.css` cached (GitHub Pages sends `max-age=600`) rendered the new drift ghosts unsized, at full page width. Fixes: the drift layer ships `hidden` and `app.js` reveals it only when its stylesheet rule is active (otherwise it removes it); asset URLs carry `?v=`, which the Pages workflow stamps with the commit id on each deploy. A new browser assertion serves a stylesheet without the drift rules at 1024px and checks that the layer is removed and no ghost is wider than 200px.

## Night drift and living town (November 21, 2026)

Added a page-wide, `aria-hidden`, pointer-transparent drift layer behind the content, with ghosts, the equipped lantern and bats, plus scene motion: flapping bats, chimney smoke, flickering pumpkin faces, a breathing moon glow and a wandering ghost. Browser checks now confirm that the layer is decorative, never sits on top of a control at its centre, runs its animations, shows two ghosts on an empty board and one per unsettled task (max four) afterwards, and is removed under both the app and system reduced-motion settings, which also freeze the town. `npm run verify:report` passed: 63 model tests, 15 browser groups, no console errors.

## Observed result — November 21, 2026 (local improvement phases 0–1)

These changes were implemented with an external coding agent, not as a new Kiro iteration. The current local verification passed with **63 model tests** (57 examples and 6 fast-check properties), **15 real-Chrome browser groups**, no console/runtime errors, and syntax/HTML-id/asset checks. The browser JSON records the actual Chrome version. Current evidence is regenerated in `evidence/`; the section below retains the historical November 20 counts and attribution.

- Timer reset and confirmed delete/clear now wait for the asynchronous operation's persisted result before checking UI/counts, without a fixed sleep. The reset correction passed twice on the 59-test/14-group baseline; the final 63-test/15-group verification also passed twice consecutively after the delete/clear correction.
- Four new model tests cover versioned backup round-trips, timer snapshots without mutating live timers or awarding offline time, malformed/unknown-version/oversized files, duplicate IDs/field limits, and reward/session ledger preservation.
- The additional browser group exercises an actual backup download, the file chooser, version/count preview, forward/reverse keyboard focus containment, cancel/focus restoration, confirmed full replacement, reload persistence, imported settings, no second reward, invalid JSON/oversized rejection, and storage-quota failure preserving both stored and live tasks. After a failed restore, ordinary task edits remain saveable when storage becomes available again.
- The backup preview is also scanned with axe under the existing WCAG 2/2.1 A/AA tags. These checks do not claim WCAG 2.2 conformance, cross-browser support or a human screen-reader audit.
- Only complete, versioned backups up to 1,000,000 bytes are accepted. Restoration is full replacement after confirmation; no merge, remote transfer or automatic upload is added. Timers are saved/restored paused and do not count elapsed time while a file is away.

## Observed result — November 20, 2026 (Kiro iteration)

`npm run verify:report` passed in Kiro IDE on this date. The evidence files now hold the latest local verification; this section records the historical Kiro iteration results.

- Syntax checks for ten JavaScript files, unique HTML IDs and production asset references: **passed**.
- Node model tests: **59 passed, 0 failed** = 53 example tests (including one PBT regression) + 6 fast-check properties (250 runs each by default; also passed with `SPECTRAL_PBT_RUNS=3000`).
- Real-browser check groups: **14 passed**, with no console/runtime errors.
- Axe checks tagged WCAG 2 A/AA and 2.1 AA: **no reported violations** in the four views and all three dialog types.
- Layout checks: **375px, 768px and 1280px**, all four views, including a 120-character unbroken task title and a long note: **no page-level horizontal overflow**.
- Rendered screenshots: **10 PNGs**, four views at 375px and 1280px plus active and burned-out candle desktop captures.
- Cultural source GET checks (November 17, not repeated in the Kiro iteration): all **5 returned HTTP 200**. An actual click on the source of a still-locked Samhain card opened the expected Library of Congress article in a new browser page; exactly one story was initially readable in that fresh session.

## Reproduce

Use Node 20+ and installed Google Chrome. Tests do not use the personal browser profile.

```sh
npm ci
npm run verify
```

Individual commands:

```sh
npm run check
npm test
npm run test:browser
```

Browser tests launch their own headless Chrome, start a temporary loopback server on an available port, use disposable contexts and close both when finished. `SPECTRAL_BROWSER_PATH` supports a custom executable; `SPECTRAL_BROWSER_CHANNEL=msedge` selects installed Edge. Test tools are development dependencies; no runtime package is shipped to the app.

## Property-based tests (`tests/model.property.test.cjs`)
Spec: `.kiro/specs/kiro-iteration/requirements.md` R1.1–R1.8. Generators run random sequences over the real model API with a forward-only clock, plus arbitrary and near-valid stored JSON.
1. Balance always equals `10 × first completions − lantern costs` and is never negative; ledgers have no duplicates; the selected lantern is owned.
2. First-completion counts and discovered stories never go backwards after reopen/delete.
3. Timer sequences keep `remaining` in `[0, minutes × 60]`, never duplicate a session, never record a rest and never change task completion.
4. Save → load is an identity with no warning.
5. Arbitrary v2 content loads without throwing, produces a valid state and never writes.
6. v1 migration keeps legacy bytes, starts at 0 candy and pre-ledgers old completions.
7. Statistics count each unique valid focus session exactly once over seven distinct local days.

**Found:** property 3/5 shrank to a stored deadline 1 ms more than a full session away. The clock showed 25:01 and the candle grew taller than full. Fixed by `clampDeadline()` in `model.js`; kept as the regression example test. See [KIRO.md](KIRO.md).

## What the 53 example model tests cover

- UMD/CommonJS/browser exports, independent default state and collision-safe fallback IDs.
- v2 precedence, exact v1-byte preservation, valid running/paused/expired migration, completed legacy tasks without retroactive candy.
- Invalid JSON, malformed records, duplicate/prototype-like IDs, invalid numerics, read denial, write/quota failures and guarded serialization.
- Atomic task validation and editing, unknown IDs, note/title/priority boundaries and completion ledger persistence after deletion/reload.
- Wallet affordability, once-only purchase, owned-lantern selection and settings round trips.
- Focus/rest configuration, absolute deadlines, ceiling to display seconds, pause/resume identity, no reset/partial/rest credit, refresh recovery, late Start and duplicate completion protection.
- All six exact culture unlock thresholds, retained task milestones and deduplicated progress.
- Local-date padding and seven consecutive dates, day-boundary attribution, time zones ahead of UTC and both US daylight-saving transitions.

## What the 14 browser groups actually did
Kiro iteration additions: group 3 now also checks the burned-out candle's decorative smoke and saves `focus-complete-1280.png`; group 4 checks the first-completion ghost wisp and `+10` treat, their `aria-hidden` state, clean-up, and that a repeat completion has no reward moment; group 10 checks that smoke is static and the release effect is absent under system reduced motion.

1. Visited all populated views via named navigation and scene buttons; observed no remote runtime requests during navigation.
2. Submitted blank text, created and edited task title/note/priority, searched, and confirmed HTML-like task text stayed literal.
3. Linked a task, started a 25-minute candle, advanced five minutes, paused through an hour, resumed, navigated/reloaded and finished exactly once without auto-completing the task.
4. Completed/reopened/recompleted a task, checked the ghost opacity faded below 0.2, kept candy at 10, and verified active/completed filters.
5. Bought/equipped the turnip, blocked unaffordable purchases, opened earned stories, closed with Escape and retained state after reload.
6. Selected 45 minutes, cancelled duration/mode/reset changes, accepted reset, completed a 15-minute focus and five-minute rest; only the focus added time.
7. Reached every culture milestone, opened all six cards with source metadata, bought another lantern and switched owned designs without another charge.
8. Cancelled/confirmed deletion and cleared settled tasks without erasing candy/milestones; checked two completed focus sessions, 40 minutes and seven local dates.
9. Verified no initial audio context, explicitly enabled synthesized wind, adjusted volume, suspended/resumed it and reloaded silently with volume retained.
10. Opened the editor from the keyboard, looped forward/reverse Tab, restored focus with Escape, persisted the motion setting, respected system reduced motion and retained functional timing.
11. Ran axe on four views and three dialog types; looped Tab/Shift+Tab and checked Escape restoration in confirmation/folklore dialogs too.
12. Measured viewport/document widths in all four views at 375/768/1280px; checked mobile header controls do not overlap and the recomposed moon exists; saved nine real screenshots.
13. Loaded v1 running and paused fixtures, preserved original bytes, recovered timing, prevented duplicate session credit after refresh and guarded already-paid legacy completions.
14. Loaded corrupt storage and a blocked-storage context, showed persistent warnings and retained usable in-memory task editing without overwriting damaged data.

## Evidence

- [Full verification output](evidence/verification.txt)
- [Machine-readable browser results](evidence/browser-results.json)
- [Screenshot gallery](evidence/gallery.html)
- [Town desktop](evidence/town-1280.png) · [Town mobile](evidence/town-375.png)
- [Active candle](evidence/focus-active-1280.png) · [Burned-out candle](evidence/focus-complete-1280.png) · [Cabinet desktop](evidence/cabinet-1280.png)
- [Source availability](evidence/source-results.json) · [Real source-link navigation](evidence/source-navigation.json)
- [Criterion-by-criterion acceptance report](ACCEPTANCE.md)

Screenshot records use isolated test tasks, including deliberately unattractive long strings for overflow checks. They are not user data, historical images or a claim about real completed work. Old failure screenshots from intermediate test runs are not part of the retained final evidence.

## Limits — not claimed

- Timed end-to-end checks use Playwright's controlled clock. They exercise actual DOM interactions, app interval callbacks, persistence and completion logic, but are **not a 45-minute real-time endurance test**.
- Web Audio was verified through user activation, context running/suspended state and volume controls, not a human listening/production-audio audit.
- Axe plus keyboard/geometry checks are not a guarantee of complete accessibility or a human screen-reader audit. Current Chrome was tested; Safari, Firefox and physical mobile devices were not.
- Original v1 data is retained only within its existing browser/origin. The app does not sync origins, devices or concurrently open tabs. It is not an operating-system alarm service.
- Source checks describe availability on the check date, not a guarantee about third-party sites.
- The built-in preview screenshot endpoint timed out during gallery inspection. Independent Chrome screenshots succeeded and are the retained evidence; the endpoint failure did not substitute for the browser tests.
- The CI workflow has not run on GitHub yet. Public deployment, GitHub publishing, video upload and Devpost submission are owner steps (see SUBMISSION.md).
