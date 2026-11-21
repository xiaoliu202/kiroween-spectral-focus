# Spectral Focus · Halloween Town

**A little focus. A little hocus-pocus.** A private Halloween-themed productivity web app: settle your tasks, keep a candle burning and discover the stories behind the glow.

## Live demo
https://xiaoliu202.github.io/kiroween-spectral-focus/
## Run

No build step, account, backend, runtime dependencies or API keys are required.

```sh
npm start
```

Open **http://127.0.0.1:8000**. Node.js 20+ is required for the bundled development server. Alternatively, serve the root directory with any static host, e.g. `python -m http.server 8000`. The production app is just `index.html`, `style.css`, `model.js`, `art.js`, `lore.js`, `ambience.js`, `app.js` and `favicon.svg`.

## Four places to make a little progress

| Place | What you can do |
| --- | --- |
| **The Town** | Explore the original illustrated street, where bats flap past the moon, chimney smoke rises, pumpkins flicker and a small ghost wanders between the cottages. Behind every page, ghosts, your equipped lantern and bats drift across the night: one ghost per unsettled task (up to four), so the sky clears as you settle your hauntings. The drift calms during a focus session and disappears with reduced motion. open the task house, Candle Room or Folklore Cabinet; see your selected lantern, current session, completed-task count and seven local days of focus. |
| **Hauntings** | Add and edit tasks with notes and priorities; search/filter, complete/reopen, delete and clear settled tasks. A first completion releases the task's ghost with a floating +10 and earns 10 virtual candy. |
| **Candle Room** | Link a task to a 15/25/45-minute focus session; pause, resume or reset; take a five-minute rest. A shrinking candle visualizes the remaining time; when it burns out, smoke curls from the wick. Synthesized night wind is opt-in with volume control. |
| **Folklore Cabinet** | Spend virtual candy on lanterns, equip your favourite, and discover six original, source-cited culture cards. Sources remain readable even when a card is locked. Export a private JSON backup or preview and confirm a validated restore. |

### Small rewards, honest rules

- Every unique task earns **10 candy only on its first completion**. Reopening, completing again or deleting it does not reset that ledger.
- Lanterns: **Harvest Jack** (included), **Old-world Turnip** (10), **Moonlit Pumpkin** (20), **Ember Keeper** (30). Buying and equipping are atomic; an owned lantern is free to reuse.
- Stories unlock at: lanterns (always), Samhain (1 first task completion), All Hallows’ Eve (1 completed focus session), costumes/doorsteps (3 first completions), ghost stories (2 focus sessions), seasonal foods (5 first completions).
- **Candy and unlocks are invented game mechanics, not historical customs. Candy is not money or Kiro credit.**
- Only fully completed focus sessions enter statistics. Resets, partial time and breaks do not. Finishing a session never automatically completes a task.

## Culture, not a collection of stereotypes

The design draws on carved lanterns, costume visits, autumn gatherings and oral storytelling. Cards acknowledge variation, label tales as folklore and avoid presenting disputed claims as settled history. Halloween is not treated as interchangeable with Día de Muertos. Sources, interpretive boundaries and asset provenance are in [CULTURE.md](CULTURE.md).

All scene, ghost, icon and lantern illustrations are original SVG/CSS. The wind is synthesized through Web Audio; no recordings are used. System fonts keep the app self-contained. There are no remote fonts, images, analytics or automatic external requests. Source links open only when you choose them.

## Privacy, persistence and migration

Data stays in this browser’s localStorage under `spectral-focus-v2`. It includes task notes, a once-only reward ledger, owned lanterns, settings and completed focus sessions. Nothing is uploaded. In **Folklore Cabinet → Local data backup**, download a versioned JSON copy or select a backup to preview and restore. Restore replaces this site’s local data only after explicit confirmation; it does not merge. A timer in a backup is restored paused at its saved remaining time. Backup files contain task notes and history, so keep them private.

Backups and restores are limited to **1 MB (1,000,000 bytes)** and use backup format v1 containing app data v2. Invalid JSON, unsupported versions, duplicate IDs and out-of-bound fields are rejected rather than repaired and saved. Cancelling the preview or failing to write storage leaves existing data unchanged. Backups are plain JSON, not encrypted. Download a current copy before replacing data; restoring is not an undo/merge operation.

If v2 does not exist, the app restores valid `spectral-focus-v1` task titles/completion states, selected duration and running or paused timer. **The original v1 record is never removed or overwritten.** Previously completed tasks receive no retroactive candy and cannot be farmed by reopening them.

Storage is specific to the browser, profile and origin. `file://`, `localhost`, `127.0.0.1`, different ports and a later hosted URL have separate stores. Open the same origin you previously used to migrate its records; this app does not secretly transfer data between origins or devices. Multiple open tabs are not synchronized: use one app tab at a time.

If storage is damaged or inaccessible, a persistent warning explains the limitation. Damaged records are kept; that visit operates in memory rather than silently overwriting them. Changes made in memory may be lost on refresh. A local clock change can affect an absolute-deadline timer; this is not a background alarm service.

## Repeatable verification

Development-only test tools are pinned in `package-lock.json`.

```sh
npm ci
npm run verify
```

This runs JavaScript/HTML-id checks, Node model tests (example and property-based), then real Chromium UI and axe accessibility checks. `npm run verify:report` does the same and writes `evidence/verification.txt` with local paths and the user name removed. The browser tests use installed Google Chrome by default, **launch their own headless browser and disposable contexts**, and start their own loopback server on a free port. They never reuse a personal Chrome profile or reset user data.

If Chrome is elsewhere, set `SPECTRAL_BROWSER_PATH` to its executable. An installed Edge can instead use `SPECTRAL_BROWSER_CHANNEL=msedge`. On Windows PowerShell, use `$env:SPECTRAL_BROWSER_CHANNEL = 'msedge'` before running the tests.

See [TESTING.md](TESTING.md), [ACCEPTANCE.md](ACCEPTANCE.md) and [the screenshot gallery](evidence/gallery.html). `npm run test:browser` regenerates the browser JSON report and screenshots. Screenshots show isolated test fixtures, including intentionally long task text, not user records.

## Project map

- `model.js`: testable task/reward/timer/migration/statistics engine (UMD).
- `app.js`: rendering, routes, accessible dialogs and event handling.
- `art.js`, `style.css`: original artwork and responsive visual system.
- `lore.js`: original cultural summaries and source metadata.
- `ambience.js`: user-activated, synthesized wind.
- `tests/`: example tests, property-based tests (fast-check) and real-browser verification; `scripts/`: local server, checks and a privacy-safe verification report.
- `.kiro/`: specs, steering and agent hooks. See [KIRO.md](KIRO.md).

## Built with Kiro

The base app was first built with an external coding agent and is labelled that way in `.kiro/specs/spectral-focus/`. The second iteration was done in **Kiro IDE**. It added a spec (`.kiro/specs/kiro-iteration/`), property-based tests that found and fixed a real timer bug, the ghost-release and candle-smoke effects, steering for tech and testing, three agent hooks and CI/Pages deployment. The full, honest account is in [KIRO.md](KIRO.md).

## Deploy

`.github/workflows/pages.yml` runs `npm run verify` on every push and pull request. On `main` it publishes only the eight production files to GitHub Pages. Enable it under **Settings → Pages → Source: GitHub Actions**.
## License

MIT. See [LICENSE](LICENSE). Third-party source texts and recordings are not included or relicensed by this project.
