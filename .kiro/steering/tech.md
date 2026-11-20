---
inclusion: always
---
# Tech stack and commands

- Production is eight static files: `index.html`, `style.css`, `model.js`, `art.js`, `lore.js`, `ambience.js`, `app.js`, `favicon.svg`. No build step, framework, bundler or runtime dependency. Do not add one.
- `model.js` is a DOM-free UMD module (CommonJS in Node, `globalThis.SpectralModel` in browsers). All state rules live there; `app.js` only renders and wires events.
- Dev-only dependencies: `playwright`, `@axe-core/playwright`, `fast-check`. Keep them in `devDependencies` and pinned through `package-lock.json`.
- Node 20+. Commands:
  - `npm start` – loopback dev server on port 8000.
  - `npm run check` – syntax + HTML id/asset checks. Add new JS files to `scripts/check.cjs`.
  - `npm test` – example tests plus property-based tests for the model.
  - `npm run test:pbt` – property tests only. `SPECTRAL_PBT_RUNS=3000` for a deeper run.
  - `npm run test:browser` – real Chrome + axe; regenerates `evidence/`.
  - `npm run verify` – all of the above. Run it after functional changes.
- Deployment is GitHub Pages via `.github/workflows/pages.yml`, which copies only the eight production files.
- Windows PowerShell is the main dev shell. Use `$env:NAME = 'value'` for environment variables.
