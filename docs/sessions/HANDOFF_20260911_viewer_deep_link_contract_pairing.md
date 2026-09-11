---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-11 — viewer_deep_link_contract_pairing: pair the README deep-link table with `VA.DEEP_LINK_PARAMS`

Source: `docs/issues/ISSUE_20260911_deep_link_contract_readme_table_unpaired.md`
(filed from review). Baseline: trunk after the 2026-09-11 batch merge
(master e9386a8). Scope: `tests/` (the new pairing scan) and, only if a
mismatch already exists, `apps/viewer/README.md`'s "Deep links in" section;
do NOT touch `apps/viewer/viewer.js` or `apps/viewer/tests.js` (the constant
and its six-param pin are correct as-is).

## Deliverables

1. **A pairing test.** `apps/viewer/README.md`'s "Deep links in — the URL
   contract" table hand-copies the six params of `VA.DEEP_LINK_PARAMS`
   (`apps/viewer/viewer.js`), and that section is the one document a sibling
   repo consumes without reading the code (drawing-checker's
   `analyses_viewer_deep_link` reads the contract from exactly there).
   Nothing pairs them: a seventh param added to the constant and its tests
   ships with a stale contract wearing a green suite. Fix shape from the
   issue (verify against current code): extract the array from `viewer.js`
   with the existing `js_array_strings` helper
   (`tests/test_js_python_vocabulary.py`), scope the README text to the
   "Deep links in" section (heading to next `## `), require every param to
   appear as `` `<param>=<id>` `` in that section, and — the other
   direction — that the section names no param the constant lacks.
2. **Why the naive version was rejected — don't rebuild it.** The repo's
   existing states-named-in-README guard
   (`_ENUMERATED_STATE_VOCABULARIES`, `tests/test_tolerance_stack.py`)
   matches a name anywhere in the README, which is vacuous here (`stack`,
   `edge`, `node`, `element`, `topology` appear all over unrelated prose).
   Section-scoping and the `` `<param>=<id>` `` claim shape are the point.
   Read the doc-scan entries in `docs/prompts/REVIEW_AGENT.md` first — this
   repo has a documented history of these scans going vacuous or
   false-positive.
3. **Can-fail replay.** Demonstrate the scan fails when it should: cut one
   table row in a scratch copy and watch the test go red (record the exact
   failure message in the lesson); same for a phantom row naming a param the
   constant lacks.

## Definition of done

- New test green against the real README + `viewer.js` pair, red under both
  replay mutations above.
- Full suite green (`venv-win/Scripts/python.exe -m pytest`; 759 passed +
  1 skipped at the 2026-09-11 batch merge) and the viewer JS fast tier still
  green per repo convention.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_viewer_deep_link_contract_pairing.md`):
  the replay evidence, and whether the section-scoping approach generalizes
  to the README's other contract tables (name them; don't build more scans).
