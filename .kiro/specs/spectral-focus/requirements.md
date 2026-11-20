# Spectral Focus · Halloween Town requirements

Status: current specification and handoff documentation, prepared outside Kiro. This file does not prove Kiro execution. The exact approved goal is retained in `.pi/goal/spectral-focus-万圣夜小镇-文化驱动的前端与功能升级-20261117-2116.md`. Later Kiro work is in `../kiro-iteration/`; the numbers below (52 model tests, nine screenshots) describe the November 17 baseline.

## Product goal

Build a private, self-contained Halloween productivity app with an original illustrated town. Retain tasks, candle-based focus visualization and fading task ghosts. Add culture-led exploration, lantern collection, once-only task treats and honest focus statistics. No altar/worship metaphor, backend, tracking, accounts or real-money rewards.

## Functional requirements

1. Offer four named, keyboard-accessible views: Town, Hauntings, Candle Room, Folklore Cabinet. Routing must not reset a session.
2. The scene must visibly contain original cottages, a moon, lanterns, bare trees and friendly ghosts, using midnight purple, pumpkin orange and candle gold. A selected lantern must appear in Town; running focus lights its cottage; first completions reveal a settled spirit.
3. Tasks support a nonblank 1–120 character title, optional note of at most 500 characters, low/normal/high priority, editing, completion/reopening, deletion, clearing completed, state filtering and search. All user text is plain text.
4. Focus supports 15/25/45 minutes and a separate five-minute rest, with start/pause/resume/reset and task association. Use absolute deadlines and preserve state after refresh. Confirm changes that reset partial/running sessions. Finishing focus never marks a task done automatically.
5. Award exactly 10 virtual candy on a task ID's first completion. Preserve a reward ledger after reopening/deleting and after refresh. No new rewards for migrated completed tasks. No negative balance or duplicate skin charges.
6. Include Harvest Jack by default; unlock Old-world Turnip for 10, Moonlit Pumpkin for 20 and Ember Keeper for 30 candy. Owned designs are free to switch; unavailable purchases are blocked.
7. Include six original, source-cited English culture notes: lanterns, Samhain, All Hallows' Eve, costume visits, ghost stories, seasonal foods/games. Lanterns are free to read; unlock the others at 1 task, 1 focus session, 3 tasks, 2 focus sessions and 5 tasks respectively. Source links are always available, including for locked notes.
8. Show today's completed focus sessions, lifetime completed focus minutes and seven local completion dates. Ignore breaks, resets and unfinished sessions; deduplicate completed session IDs.
9. Offer locally synthesized wind with explicit opt-in, volume and off controls. Never autoplay or restore a playing state after refresh. Respect both the app motion setting and system reduced-motion preference.
10. Restore valid v1 titles/completion states, selected duration and running/paused timing into v2 when v2 is absent, without deleting or overwriting the original v1 record. Validate imported data and remain usable with warnings if storage is damaged or blocked.
11. Fit 375px, 768px and 1280px without horizontal overflow, including long text. Dialogs manage focus in both Tab directions, close with Escape and restore focus. Decorative artwork is hidden from screen readers; controls have accessible names and visible keyboard focus.
12. Provide repeatable syntax, model and real-browser verification; save actual screenshots and verification results. Keep README, TESTING, CULTURE and these specs accurate about features, limitations and actual tool usage.

## Cultural guardrails

See `CULTURE.md` and `lore.js` for citations and context. Do not make the disputed Celtic-new-year claim definitive, conflate Halloween with Día de Muertos, or imply that a folktale's supernatural events are verified. Game rewards and illustrations are contemporary original designs, not historical evidence.

## Non-goals and remaining external actions

No public publishing, deployment, competition submission, credit application or identity verification is part of this implementation. Actual Kiro development, retained genuine Kiro artifacts and an accurate competition workflow account remain separate work. Do not fabricate hook files or tool-use evidence.
