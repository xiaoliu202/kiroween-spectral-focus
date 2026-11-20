# Design · Halloween Town v2

Prepared outside Kiro. This describes the actual implementation and is a handoff for future genuine Kiro work, not evidence of prior Kiro use. Later Kiro work is in `../kiro-iteration/`; the numbers below (52 model tests, nine screenshots) describe the November 17 baseline.

## Static architecture

- `index.html` contains semantic, independently named Town/Tasks/Focus/Cabinet sections and three native dialogs.
- `model.js` is a DOM-free, mutable UMD engine: CommonJS in Node, `SpectralModel` in browsers. Task operations, rewards, purchases, normalization, timing and stats live here.
- `app.js` renders state, switches hash routes without replacing the running timer, manages dialogs and delegates task/collection actions. User text uses DOM text nodes, labels, options and `textContent`, never HTML interpretation.
- `art.js` generates only original known SVG strings. `style.css` supplies midnight/amber visual styling, responsive layouts, original candle/fog animations and system/app motion overrides.
- `lore.js` contains six original summaries and institution/title/URL metadata, not external runtime fetches.
- `ambience.js` lazily creates a Web Audio noise buffer, lowpass filter, gain and slow frequency modulation after a user click. It can resume/suspend and adjust volume; playing state is deliberately not persisted.
- `scripts/serve.cjs` is an optional loopback-only development server with an explicit public-file allowlist. Deployment needs only eight static production files; no Node runtime is needed on a static host.

## State and invariants

`spectral-focus-v2` stores version, tasks, balance, rewardedTaskIds, owned lantern IDs, selected lantern, timer, sessions and settings. A task has a unique ID, text, note, priority, done flag and creation timestamp. The reward ledger is independent of current tasks, so reopening/deletion cannot reset reward eligibility. Purchases validate ownership and balance before mutation.

The timer has mode, selected minutes, remaining seconds, an absolute deadline, session ID and optional task ID. A paused session retains its ID and remaining time. Reset/configuration clears its ID. Tick settles a focus run once per ID at its deadline, records that deadline as completion time and does not mark a task complete. Breaks produce no focus-statistics record. Late and repeated settlement cannot duplicate sessions.

Statistics derive only from deduplicated completed focus records. Local-date calendar arithmetic, rather than subtracting 24-hour blocks, produces the seven-day window across daylight-saving transitions. A session spanning midnight belongs to the date of its deadline.

Culture unlocks derive from persistent first-completion and focus-session counts. There is no separate mutable counter to get out of sync. Deleted tasks do not remove earned milestones. Requirements are shown beside each card; source reading is never locked.

## Migration and failure behavior

When no v2 record exists, normalize v1 and write only the new key. Preserve the original v1 bytes. Previously completed tasks enter the reward ledger without minting candy. Restore valid running deadlines and paused remaining time. Inputs, duplicate IDs, settings, durations and numeric fields are validated.

Corrupt JSON or repaired current data keeps its original storage value; the UI warns and treats the current visit as memory-only. Read/write denial or quota failures do not crash the app. A failed write blocks further writes for that visit and shows a persistence warning. Storage is origin-specific and multiple tabs do not synchronize.

## Accessible UI and responsive artwork

Main navigation and scene destinations expose real named controls. Hidden sections use `hidden`, not off-screen interactive duplicates. Dialogs use `showModal`, an explicit forward/reverse Tab loop, Escape dismissal and trigger-focus restoration with a sensible fallback after a row is replaced. Status changes use polite live regions; the clock is a non-live timer. Decorative SVGs are aria-hidden.

The scene's width is explicitly constrained so its aspect ratio and minimum height cannot widen a tablet layout. At small widths the sidebar becomes four navigation tabs, panels stack, cards wrap and the moon is separately composed in CSS so it does not disappear in the landscape crop. All tasks, notes and summaries wrap long text. The app and system reduced-motion settings suppress animation without altering timer logic.

## Verification and limitations

`npm run verify` executes syntax/id checks, 52 Node tests and 14 browser check groups. Browser checks use installed Chrome with isolated contexts, a temporary loopback server, a controlled clock and axe scans of four views plus all three dialog types. Actual 375px and 1280px screenshots and a 768px overflow check are included.

No cloud sync, background alarm guarantee, public deployment, competition submission, real Kiro operation or human screen-reader audit is implied. See TESTING.md and ACCEPTANCE.md for observed evidence and limits.
