---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-22 — stack_page_alert_marks_and_drawn_glyph: finish the "one quiet mark" pass on the last loud column, and stop typing the triangle

Source: two issues, routed together by the 2026-09-22 triage sweep because they
edit the same two functions in the same two files:

- `docs/issues/ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud.md`
  (feature, med) — **"Still open (1)" only**; every other half of that issue has
  shipped, and the issue says so in its own 2026-09-21 and 2026-09-22 sections.
- `docs/issues/ISSUE_20260922_the_alert_glyph_is_still_a_character_on_two_rails.md`
  (chore, low).

Baseline: trunk `master` @ `836f11e` — the 2026-09-22 batch merge has landed
(`viewer_nav_verdict_into_alert_and_icon` and `viewer_summary_balance_sheet` are
both in `completed/`), projections rebuilt, full suite green.
Scope: `apps/viewer/views/stack.js`, `apps/viewer/viewer.js`,
`apps/viewer/views/dom.js`, `apps/viewer/style.css`, `apps/annotate/app.js`,
`apps/annotate/binding_state.js`, `apps/annotate/run_tests.cjs`, and the tests
that read them. Do NOT touch `apps/viewer/topology.js`'s
`VA.splitAuthoredFinding` / `VA.studyFindings` or `apps/viewer/views/topology.js`
— `HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md` owns those.
Do NOT restructure `checkCard()` — `HANDOFF_20260922_stack_page_check_card_balance_sheet.md`
owns it and is sequenced behind you. Do NOT touch
`scripts/mutation_witnesses.json`.

## Why this is not a design question any more

Jeff's 2026-09-16 note ("Left side menu is now impressively 'loud'… roll all the
alert badges into one single alert badge (something like a triangle ! icon)")
was ambiguous about *which* rail he meant, and that ambiguity is what kept the
source issue at `audience: strategy` for six days. **He answered it on
2026-09-21** — quoted in the issue: *"the alerts still haven't been replaced
with a single triangle ! (hover over to see details)"*, and of the annotator's
badge, *"same purpose, just in a different place."* Two handoffs then shipped
the nav rail's study rows and its loose-stack leaf rows. What is left is the one
surface nobody has taken, plus two sites still typing the character. The
direction is settled; the remaining calls are small and local, and they are
named below so you make them rather than re-open them.

## Deliverables

1. **The materials table's source column stops shouting.**
   `materialSourcingCell` (`apps/viewer/views/stack.js:544`) renders
   `VA.valuesProvenance(authored)` as a filled all-caps chip —
   `CTE NOT TRANSCRIBED`, `VALUES_STATUS UNKNOWN` — styled by the
   `.chip--values-*` rules (`apps/viewer/style.css:283–293`, whose own comment
   already flags this cell as "the literal" description in Jeff's sentence).
   This is always visible, in a source column, on the same page whose elements
   table already folded. Fold it the way the elements table did: the mechanism
   is `VA.rowAlerts` (`apps/viewer/viewer.js:672`) + `VA.alertBadge`
   (`apps/viewer/views/dom.js:135`) + the `alerts` card kind
   (`views/cards.js`), used at `views/stack.js:367`.
   **The one real decision, and it is yours to make and record:** the elements
   table's alert vocabulary lives in the alert model, and
   `CTE NOT TRANSCRIBED` is not in it. Decide where those words live — a
   `values` branch on `VA.rowAlerts` is the cheap and probably right answer, but
   whatever you pick, the words must be written once and read from one place,
   not copied into a second table's renderer. State the choice and the reason in
   the lesson.
   *Standing rule this must obey* (from the 2026-09-22 rail pass, recorded in
   `apps/viewer/README.md`): a row states what asks you to look, and nothing
   else; verdicts stay chips, anything that asks the reader to act or distrust
   folds into the ⚠. A values-provenance state is a "distrust this number"
   fact, so it folds.

2. **The mark becomes a drawing on the viewer's elements-table badge.**
   `VA.alertBadge`'s default is still `VA.ALERT_ICON` — the `⚠` character
   (`apps/viewer/viewer.js:666`), inside a `.chip--alert`. The nav rail's badge
   already draws it (`VA.warningIcon`, `apps/viewer/views/dom.js:94`: one SVG
   path sized in px, coloured by `currentColor`). The reasons are recorded at
   `views/dom.js:67` and :131 and are not taste: a character is sized by
   `font-size`, whose steps are owned by `tests/test_app_type_scale.py`, so
   making one triangle bigger is a type-scale decision taken by an icon; and
   U+26A0 renders as a **colour emoji** on Windows as often as not, which
   overrules the semantic colour the level class sets. `VA.alertBadge` already
   takes `opts.className` / `opts.icon`, so the swap is small. **Decide whether
   the chip framing survives in a table cell** — unlike on a row, a border there
   may genuinely be doing work. Say which you chose and why.

3. **The annotator's badge too.** `AA.ALERT_ICON`
   (`apps/annotate/binding_state.js:65`) is set on `badge.textContent`
   (`apps/annotate/app.js:943`). Jeff, 2026-09-21: *"same purpose, just in a
   different place."* Note `apps/annotate/run_tests.cjs:1099` asserts
   `ALERT_ICON` is **one glyph and not letters** — that is a real guard written
   against a character. Do not delete it; **replace** it with the shape the
   viewer's drawn icon is pinned by (a single-path SVG, sized in px), so the
   annotator's mark stays guarded after it stops being text.
   The annotate app has no access to `apps/viewer/views/dom.js`. Choose between
   a deliberate copy with a comment naming the other site, or a third shared
   file, and **write the choice down** — the source issue names this as the only
   design question in it. A copy is acceptable if the comment pairs the two; a
   silent second definition is not.

## Definition of done

- On the live `hub_bearing_thermal_fit_m1` and `_m2` stack pages
  (`C:\workspace\tolstack\data\projections\viewer\`), the materials table's
  source column carries at most a quiet mark per row, and the words
  `CTE NOT TRANSCRIBED` / `VALUES_STATUS UNKNOWN` are reachable from the card it
  opens. Screenshot before/after in the lesson — this is a visual change and the
  lesson is where the judgement is recorded.
- No `⚠` character remains as a rendered mark in either app; `grep -n '⚠'` over
  `apps/` returns only comments/history, and the annotate guard has been
  rewritten rather than dropped.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`,
  `node apps/annotate/run_tests.cjs`, the browser tier, and the `venv-win`
  pytest run all green, including `tests/test_app_type_scale.py`.
- Lesson (`docs/sessions/lessons/LESSONS_20260922_stack_page_alert_marks_and_drawn_glyph.md`):
  the three decisions above (where the values words live; whether the chip frame
  survives in a table cell; copy vs shared module for the annotate icon), and
  whether anything is now left of the 2026-09-16 "loud" thread — the source
  issue has been closing one half at a time for six days and the next reader
  should be able to tell from one line whether it is finally empty.
