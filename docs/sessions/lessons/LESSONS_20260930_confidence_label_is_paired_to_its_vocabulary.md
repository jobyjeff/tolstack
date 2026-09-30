# LESSONS 2026-09-30 — confidence_label_is_paired_to_its_vocabulary

Handoff: `HANDOFF_20260930_confidence_label_is_paired_to_its_vocabulary.md`, from
`ISSUE_20260923_confidence_label_is_keyed_by_a_generated_vocabulary_but_not_paired_to_it.md`.

## Deliverable 1 — converted, not exempted

`VA.CONFIDENCE_LABEL` (`apps/viewer/viewer.js`) now reads
`VOCAB.table("CONFIDENCES", { traced: ..., inferred: ..., untraced: ...,
no_source_ref: ... })`. The argument, written beside it in the code: every one
of this table's thirteen read sites is `VA.CONFIDENCE_LABEL[x] || x`, and that
fallback exists for a genuinely-unrecognised value, not for a word generation
already knows about and this table forgot to learn. A page that still renders
cannot tell those two cases apart — only the load-time key-set check can, and
only before a reader sees the raw machine word (`no_source_ref`) where a
citation badge (`NO CITATION`) belongs. This is the same call the 2026-09-23
handoff made for `VA.VERDICTS` and the other nine converted tables; nothing
about `CONFIDENCE_LABEL`'s shape argued for treating it differently, so it
went the same way.

## Deliverable 2 — VA.NAV_VERDICT_LEVELS

Given the comment it was owed (`apps/viewer/topology.js`, beside the table):
a composition of `stack.py`'s `VERDICTS` plus `none` and `error`, the two
states a nav row can carry that no verdict ever does. No single Python owner
to generate from — same posture as `AA.BINDING_STATES`.

## Deliverable 3 — the sweep came back empty

Walked every top-level `VA.<NAME> = {`/`VOCAB.table(...)` assignment in
`apps/viewer/*.js`, `apps/viewer/views/*.js` and `apps/annotate/*.js`, and
grepped independently for the literal words of every Python-owned vocabulary
(`traced`/`inferred`/`untraced`/`no_source_ref`, `pass`/`marginal`/`fail`,
`bound`/`owner_not_in_set`, `established`/`unestablished`) as object keys
elsewhere in the two apps. Nothing else is a straight, total copy of a
Python-owned vocabulary that is neither generated nor annotated:

* `VA.STUDY_FINDING_SOURCES` (`topology.js`) shares three of `GAP_KINDS`' four
  keys, but it is a deliberate **partial** map (`hardware_entry` has no
  finding-source row by design) with its own comment already saying so
  ("A kind here that GAP_KINDS does not declare is a vocabulary that has
  drifted, and a test says so") — not a candidate for `VOCAB.table`, which
  requires an exact key-set match, and already annotated.
* `VA.EXPORT_CHIP_TEXT` and `VA.VALUES_CHIP_TEXT` each contain ONE
  Python-owned word (`unestablished`, `not_transcribed`) alongside JS-invented
  "field missing" sentinels (`unlabelled`, `identity_unlabelled`) — mixed
  tables, not copies, already commented.
* `VA.ATTENTION`, `VA.EXPORT_SUBJECTS`, `VA.PROJECTION_LABELS`,
  `VA.STACK_NAV_ALERT_KINDS`, `VA.ROW_DENSITIES`, `VA.EDGE_LENGTH_MODES`,
  `VA.LEADER_STYLES`, `VA.SUPERSEDED_STACKS`: all JS-owned display/bucket
  vocabularies with no Python definition at all.
* `apps/annotate/scene.js`'s `MARK_COLORS` and `apps/annotate/app.js`'s
  `state: "owner_not_in_set"` literal are incidental word matches, not tables
  keyed by the vocabulary (the former has its own 3-colour set unrelated to
  `AA.VERDICTS`; the latter is a single value assignment, not a lookup).

## Could a check have found this, rather than a reviewer?

No — and that is worth stating plainly rather than leaving implicit.
`tests/test_js_python_vocabulary.py`'s `viewer_tables()` scan anchors on
`VA.<NAME> = {` (hand-authored) or reads the generated registry by name
(`VOCAB.table("NAME", {`). `VA.CONFIDENCE_LABEL = { ... }` matched the first
shape perfectly — it just was never *compared* against `VA.CONFIDENCES`'
words, because nothing in that module treats "two hand-authored tables with
the same key set" as a fact worth checking. The pairing that would have
caught this is a **same-key-set assertion between sibling VA tables**, not a
Python-vs-JS scan, and nothing in the 2026-09-23 generation pass added one —
that pass's whole design (per its own lesson, §5) was "generate the words,
leave the per-value copy where it is," which is exactly the shape that made
this gap possible: converting a table changes what anchors it, but nothing
scans the *unconverted* survivors for "this one's keys equal an already-paired
table's keys, three lines up." The selection step (which of the 26 originally
undergo conversion) was a human read of the file, once, and missed one; nobody
has since added a check that would catch a second.

## Test fallout from the conversion

Converting `VA.CONFIDENCE_LABEL` to `VOCAB.table(...)` removed it from the
`VA.<NAME> = {` shape that `tests/test_js_python_vocabulary.py`'s
`js_object_keys`/`js_array_strings` extractors anchor on — which is correct
(it is no longer hand-authored in that sense) but broke
`test_the_extractor_fails_loudly_when_the_table_is_not_there`, which used
`VA.CONFIDENCE_LABEL` by name as its worked example of a still-hand-authored
table. Repointed the test (and the `viewer_tables()` docstring's example list)
at `VA.EXPORT_SUBJECTS`, which still has the `= {` shape. No coverage is lost:
`CONFIDENCE_LABEL`'s key set is identical to `CONFIDENCES`', which the
generated-registry half of `viewer_tables()` already carries under that name.
Anyone converting one of the remaining hand-authored tables should expect the
same fallout if this test file's worked example happens to name it.

## Verified

* `node apps/viewer/run_tests.cjs --repo .` (this worktree, no live-data
  tier): 422/422 passed, 1 tier SKIPPED (node-fs `[real]` tier — no
  `data/projections/` here, expected in a worktree per CLAUDE.md).
* `venv-win/Scripts/python.exe -m pytest -q tests/test_js_python_vocabulary.py`:
  4 passed (after the extractor-example fix above).
* `venv-win/Scripts/python.exe -m pytest -q` (full suite, this worktree): 1243
  passed, 1 failed — `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the expected worktree-only failure (no `data/projections/` here; CLAUDE.md
  names this exact test as red-by-design in a worktree).
* In the **main checkout** (`C:\workspace\tolstack`), after
  `scripts/rebuild_projections.ps1` (rebuilt clean — the regenerated
  `vocab.gen.js` and all three projections came back byte-identical to what
  `master` already has, since nothing here touches Python or the vocabulary
  registry):
  * `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`: 516/516
    passed, 0 skipped.
  * `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`:
    25/25 browser checks passed (every named suite, file:// and http, 100%).
  * `node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack`
    (ran ~10 minutes): **125/125 declared mutations witnessed**, exit code 0.
    No rot from either edit — expected, since neither `VA.CONFIDENCE_LABEL`
    nor `VA.NAV_VERDICT_LEVELS` had a witness quoting their old literal (a
    prior grep for both names against `scripts/mutation_witnesses/` came back
    empty), and the conversion routed `CONFIDENCE_LABEL` through the already-
    witnessed `VOCAB.table`/freeze machinery rather than adding a new guard.
    Declared-guard census unchanged from the 2026-09-23 lesson's note
    (`apps/viewer/tests.js` 50/516/516, `apps/annotate/run_tests.cjs`
    9/151/151, `scripts/run_viewer_browser_tests.mjs` 49/475/506 enrolled/
    enrollable/declared) — this handoff added no new guard, so nothing needed
    enrolling.

## Left undone

Nothing filed. Deliverable 3's sweep is a negative result, not deferred work.
