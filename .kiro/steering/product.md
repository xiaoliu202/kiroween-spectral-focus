---
inclusion: always
---
# Spectral Focus conventions

- Preserve Spectral Focus's task/candle/ghost premise and the four-view Halloween Town experience. Keep production static, self-contained and usable without accounts.
- Use English UI and submission materials. Prefer original SVG/CSS over remote images, fonts, copied characters or recordings.
- Use midnight purple, pumpkin-orange actions, candle gold and readable bone-white text. Keep decoration in scene/art areas rather than obscuring controls.
- Culture is source-led: keep citations, regional context and uncertainty. Distinguish folklore from historical events; don't conflate Halloween and Día de Muertos. Candy, lantern prices and unlock thresholds are original game mechanics, not traditional rules or real Kiro credit.
- Use semantic HTML, named controls, visible keyboard focus, forward/reverse dialog focus management, Escape restoration, and both system/app reduced-motion support.
- Never interpret task titles or notes as HTML. Do not add analytics, automatic external requests or data uploads.
- Keep once-only task rewards independent of task deletion and completed sessions deduplicated by ID. Derive culture unlocks and statistics from persisted records, not parallel mutable counters.
- Use absolute timer deadlines. Preserve running/paused state on refresh; don't count breaks/resets/partial sessions or auto-complete tasks.
- Never delete or overwrite the legacy v1 storage key. Guard storage reads/writes and preserve damaged originals. Test with isolated contexts, never a personal browser profile or user task data.
- Run `npm run verify` after functional changes; refresh relevant evidence screenshots after visual changes. Document tests not performed rather than claiming them.
- Keep `.kiro/` tracked. Never commit account IDs, credentials, verification documents or credit codes. Public GitHub publishing, deployment and submissions require a separate request.
- The base implementation was prepared outside Kiro; later iterations are recorded in KIRO.md. Only describe Kiro actions actually performed through Kiro; never fabricate hook runs or tool-use evidence.
