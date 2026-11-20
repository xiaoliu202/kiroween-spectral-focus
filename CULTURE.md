# Culture, interpretation and asset provenance

Spectral Focus is a contemporary productivity game with Halloween imagery, not a reconstruction of a religious practice. Its town, task ghosts, focus spells, candy economy and unlock rules are original inventions. The app distinguishes those inventions from source-based cultural notes.

## Editorial decisions

- **Lanterns:** the American Folklife Center's transcript of Jack Santino's 1982 lecture describes carved root lanterns as well as American pumpkins. The Jack-o'-lantern narrative is explicitly a folktale with variants. A turnip option acknowledges that the visual history is broader than pumpkins.
- **Samhain:** seasonal change provides context, not a claim that every modern custom descends unchanged from one festival. The 2013 American Folklife Center article specifically notes uncertainty over the popular claim that Samhain marked the Celtic new year. The card preserves that caution.
- **All Hallows' Eve:** the calendar connection is explained alongside variation in observance. Halloween and Día de Muertos are not presented as interchangeable. We did not build the previously suggested generic altar or describe productivity as worship or the spiritual release of the dead.
- **Costume visits:** source-documented costumes, neighbourhood visits, decorated yards, parties and parades inform the welcoming street. We avoid asserting a single uninterrupted origin for all these customs.
- **Storytelling:** the card identifies named examples discussed in a Folklife Center program, rather than copying the recordings, transcriptions or a performer's version. Supernatural stories are labelled as stories, not verified events.
- **Food and games:** a secondary editorial overview supplies modest context for apples, nuts, pumpkins and seasonal games. Its broader ancient-origin claims are not repeated as certainties.

## Six field notes and unlocks

All prose in `lore.js` is newly written summary and interpretation. Sources are linked with institution and article title on every card, including locked cards; external reading is not gated by progress.

| Field note | Context | Unlock | Sources |
| --- | --- | --- | --- |
| A light before the pumpkin | Britain, Ireland and North America; lanterns and a folktale with variants | Always available | S2 |
| At the turning of the season | Ireland; Samhain and disputed calendar interpretations | 1 unique first task completion | S1 |
| The evening in the name | Christian calendar and varied observances | 1 completed focus session | S1, S4 |
| A different face at the door | Costume and neighbourhood customs | 3 unique first task completions | S1 |
| Pull up a chair. Tell a tale. | Oral storytelling in US collections | 2 completed focus sessions | S3 |
| Apples, games & autumn tables | Seasonal gatherings in Britain and America | 5 unique first task completions | S5 |

Thresholds are product design, not traditional rules. Imported already-completed tasks count toward first-completion milestones but do not receive retroactive candy. Deleting a task does not erase its contribution to earned progress.

## Sources

**S1 · Library of Congress, American Folklife Center.** Stephen Winick, *Welcome to Folklife Today, and…Happy Halloween!*, October 30, 2013. Relevant sections: the Samhain/new-year caveat, All Hallows observances, stories, costume visits and local variation.  
https://blogs.loc.gov/folklife/2013/10/welcome-to-folklife-today/

**S2 · Library of Congress, American Folklife Center.** Stephen Winick, *Spooky Stories for Halloween 2022 on the Folklife Today Podcast*, October 28, 2022. Relevant section: Jack Santino's Jack-o'-Lantern, with an explicitly versioned folktale and discussion of carved lantern materials.  
https://blogs.loc.gov/folklife/2022/10/spooky-stories-for-halloween-2022-on-the-folklife-today-podcast/

**S3 · Library of Congress, American Folklife Center.** Stephen Winick, *Scary Stories for Halloween 2024 on the Folklife Today Podcast*, October 30, 2024. Relevant sections: named storytellers, regional recordings, variant tales, and the distinction between folklore and reliable etymology/history.  
https://blogs.loc.gov/folklife/2024/10/scary-stories-for-halloween-2024-on-the-folklife-today-podcast/

**S4 · Library of Congress, American Folklife Center.** Stephen Winick, *LOC Halloween: Enter the Chambers of Mystery!*, October 4, 2017. The exhibition describes Halloween costumes/stories and a separately identified Día de Muertos altar; these practices should not be collapsed into one generic aesthetic.  
https://blogs.loc.gov/folklife/2017/10/loc-halloween-enter-the-chambers-of-mystery/

**S5 · HISTORY.** HISTORY.com Editors, *Halloween: Origins, Movies & Traditions* (page heading may change seasonally). Secondary editorial overview used only for the limited seasonal-food/party-game summary.  
https://www.history.com/articles/history-of-halloween

All five URLs returned HTTP 200 when checked on November 17, 2026. See `evidence/source-results.json`. Source websites remain third-party services and future availability is not guaranteed. Their existence does not imply endorsement of this app.

## What is original and what is not included

- Town, cottages, bare trees, moon, ghosts, pumpkin/turnip lanterns, bats and small UI icons: original SVG path artwork in `art.js` and `favicon.svg`.
- Candle, fog, focus lighting, reduced-motion styling and mobile moon: original CSS in `style.css`.
- Wind: filtered noise and low-frequency modulation synthesized locally in `ambience.js`; no copyrighted recordings or music.
- Typography: system fonts; no external font service.
- Cultural text: original short English summaries, linked to their references. No full articles, archive images, videos or audio are bundled.
- Test screenshots: produced from this app using isolated test fixtures; they are not historical images or real user productivity records.

The MIT license covers this project's original code and artwork, not the externally linked source material.
