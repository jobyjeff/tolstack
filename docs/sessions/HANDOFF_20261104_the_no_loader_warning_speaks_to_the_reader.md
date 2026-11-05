---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-04 — the_no_loader_warning_speaks_to_the_reader: the stack page's "no loader" branch stops printing a script path and a constant name

Source: `docs/issues/ISSUE_20260922_the_stack_pages_no_loader_warning_is_the_fifth_terminal_command_in_the_viewer.md`
(woken 2026-11-04 by its date trigger; triaged by the 2026-11-04 sweep — read
it in full). Baseline: tolstack `integration` (the string is still present
there, `apps/viewer/views/stack.js:821`). Scope: `apps/viewer/views/stack.js`
and the viewer's node-side tests (`apps/viewer/tests.js` or wherever
`surfaceIsClean` walks are enrolled). Do NOT touch the browser-tier runner
`run_viewer_browser_tests.mjs` — `the_browser_tier_is_green_on_trunk_again`
(staged) owns that tier, and this fix does not need it; that is why this
handoff does not `depends_on` it. Do not touch `scripts/build_viewer_projection.py`.

## Deliverables

1. **Rewrite the sentence in the reader's terms.** In the
   `!(stackProj.checks || []).length` arm of the checks section, the page
   today says the archetype's checks are generated, the projection has "NO
   LOADER", and to "Add the archetype's loader to ARCHETYPE_LOADERS in
   `scripts\build_viewer_projection.py` and rebuild". Keep the one fact a
   reader needs — *this stack does have checks; they are generated from its
   archetype block and this page cannot show them yet* — and drop the script
   path, the constant name and the instruction. `VA.PROJECTION_BUILT_ELSEWHERE`
   in `viewer.js` is the established sentence for "the work happens in the
   repo"; reuse it rather than coining a sibling.
2. **Render the branch in a test, from its own domain.** No fixture or live
   projection reaches this arm (it needs `checks_generated_not_rendered: true`
   with an empty `checks`, and every archetype in the tree has a loader), so
   the shared ban list (`apps/viewer/reader_facing_bans.js`) has never seen
   the string. Render `VA.renderStack` over a synthetic projection carrying
   exactly that shape and put the result through `surfaceIsClean`, the way
   `tests.js` already scans "every branch of the CTE sourcing vocabulary …
   including the ones no live or fixture entry reaches". Wrong outcome this
   prevents (per the template's guard rule): the four sibling command sites
   `HANDOFF_20260921_policy_free_brief_residues` removed came back exactly this
   way; misfire payer is the next tactical agent (a red test), never Jeff.
3. **Sites:** this arm only. Name in the lesson any other unreachable arm in
   `views/stack.js` you noticed carrying repo vocabulary, without fixing it.

## Definition of done

- The new test renders the arm and passes `surfaceIsClean`; it fails if the
  old sentence is restored (show that once, in the lesson).
- Default tier green as tolstack's `CLAUDE.md` spells it.
- Lesson (`docs/sessions/lessons/LESSONS_20261104_the_no_loader_warning_speaks_to_the_reader.md`):
  the final sentence, the mutation check, and any sibling arms noticed.
