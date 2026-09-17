---
type: feature
priority: low
status: open
area: docs/topologies
reporter: agent
audience: strategy
found_by: docs/sessions/lessons/LESSONS_20260916_viewer_hover_deslop_and_banner_purge.md
---

# A topology `note` does two jobs, so the viewer has to guess where the description ends

`viewer_hover_deslop_and_banner_purge` (2026-09-16) had to show "a short
always-visible description" on a hover card with the rest folded away, and
found there is no such field to show. A live `note` is one string carrying
**two** things:

> "Plain bushing, aluminium bronze, .1900 in ID X .1875 in long, per the 217755
> parts-list nomenclature. **Ballooned 8X in DETAIL B of 217755 sheet 4.
> Drawing 214820-002 itself is not in this repo, so nothing here can re-read
> the 4.76 +0.00/-0.13 length the operator read off it, and it stays on the gap
> list.**"

— a description, then the sourcing narrative behind it. The viewer splits them
with `VA.leadSentence`, which returns the prose up to the first `.`/`!`/`?`
followed by whitespace and a capital. That is a **guess**, deliberately a
conservative one (it returns a prefix of the record or the whole of it, never a
rewording), and it is right on today's notes. It is still a guess, and it has
two failure shapes already visible in the live data:

* a note whose first sentence is bookkeeping rather than the fact — five of
  them, catalogued in
  `ISSUE_20260916_five_authored_notes_lead_with_handoff_bookkeeping_instead_of_the_fact.md`,
  which is the *authoring* half of this and can be fixed by reordering;
* a note with no sentence break at all, which is returned whole and clamped by
  CSS — the pre-2026-09-16 behaviour, for that note.

**The question for a strategy agent, and the reason this is `feature` and not
`chore`:** should a topology document (and, by the same argument, a stack's
`source_ref`) carry a short `description` distinct from `note` — something
*written* to be the line a reader is shown without asking, with `note` free to
stay the full written argument it is today?

What makes it a real design question rather than an obvious yes:

* it is a **schema** change across `docs/topologies/*.json` and every
  ground-truth test standing on those files, not a viewer change;
* the repo's posture is that a record is not edited to suit a surface. A second
  field is the honest way to give the surface something to show — but it is
  also a second place for the same fact to live, and the third bullet of
  CLAUDE.md's "things that cost previous sessions time" is about exactly that
  shape;
* "one sentence" may be the wrong unit anyway. The annotation surface and the
  spec library both have their own ideas of what identifies a thing;
* doing nothing is survivable: `VA.leadSentence` is correct on every live note
  today, and the five bad leads are fixable by reordering prose that is already
  there.

Filed so the question is asked once rather than answered five times by
whoever next reorders a note.
