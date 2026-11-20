---
inclusion: fileMatch
fileMatchPattern: "tests/**"
---
# Testing guide

- Model rules get both an example test in `tests/model.test.cjs` and, where an invariant exists, a property in `tests/model.property.test.cjs`.
- When a property finds a counterexample, first decide whether the model or the property is wrong. Fix the model only for a real defect, then add the shrunk counterexample as a named `regression (found by PBT)` example test.
- Keep property run counts small enough that `npm test` finishes in a few seconds; the save hook runs it.
- Generated clocks must only move forward unless the test is specifically about a clock moving backwards.
- Browser tests use `makePage()` disposable contexts and a controlled clock (`page.clock`). Never use a personal browser profile, real user data or wall-clock waits longer than about one second.
- Read computed styles after transitions settle, or disable the transition for the read; otherwise the test samples a mid-transition value.
- Decorative effects must be checked for `aria-hidden` and for being absent or static under both the app and system reduced-motion settings.
