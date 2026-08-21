# LESSONS 2026-08-19 — enumerated_state_doc_guard

Handoff: `HANDOFF_20260819_enumerated_state_doc_guard.md`. Branch:
`handoff/enumerated_state_doc_guard`.

## What this closes

`ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`, shape 2
of `BRIEF_20260817_doc_scan_deletion_guards.md`: derive the documentation
requirement from the code's enumerated states rather than from a hand-kept list
of required headings (shape 1, rejected — prose gets restructured legitimately
and a heading list goes stale exactly the way a hand-kept state list would) or a
stored baseline of how many claims a scan finds (shape 3, rejected — the
baseline is itself a number nobody re-derives). Marked `resolved` with a
`## Resolution` section in the issue file; a line added to
`docs/prompts/REVIEW_AGENT.md`'s existing entry on this issue says the same for
reviewers, and names the boundary that is still unguarded.

## Which surfaces own which enums

Only `apps/viewer/` has enumerated states with a "the viewer needs a total
function for this" flavor. `tests/test_js_python_vocabulary.py`'s module
docstring already inventories six such vocabularies; checking each by hand
against `apps/viewer/README.md` (grep for the code spelling, not the on-screen
label):

| vocabulary | Python definition | states | named by spelling in the README? |
|---|---|---|---|
| `VA.EXPORT_STATUSES` | `tolerance_stack/stack.py: EXPORT_STATUSES` | `established`, `unestablished` | yes — both, **and this is the pair the new guard covers** |
| `VA.VALUES_STATUSES` | `tolerance_stack/thermal.py`, the `values_status` check | `inline`, `library`, `not_transcribed` | yes — all three, **the other half the new guard covers** |
| `VA.CROP_RULES` | `scripts/build_viewer_crops.py`, `resolved_by` literals | `source_ref_export`, `spec_pile`, `joint_export_run` | yes — all three ("Hover crops" table) |
| `VA.IDENTITY_RULES` | `scripts/build_viewer_projection.py: identity_rule_of_ref` | `spec_pile_filename` | yes |
| `VA.CONFIDENCES` / `PROJECTION_CONFIDENCES` | `tolerance_stack/stack.py: CONFIDENCES` + `NO_SOURCE_REF` | `traced`, `inferred`, `untraced`, `no_source_ref` | **no** — see below |
| `VA.VERDICT_SCOPES` | `tolerance_stack/stack.py: VERDICT_SCOPES` | `joint`, `budget` | yes (`joint` as plain prose, `budget` by spelling) |

**`no_source_ref` is undocumented by its code spelling today.** It renders as
the label `NO CITATION` (`viewer.js:73`), and that row is in the README ("filled
magenta `NO CITATION` — worse than untraced: no `source_ref` at all"), but the
string `no_source_ref` itself appears nowhere in the file — unlike every other
state in every other vocabulary above, which is named by its exact code
spelling somewhere. Filed, not fixed:
`ISSUE_20260821_no_source_ref_is_the_one_viewer_confidence_state_not_named_by_spelling_in_the_readme.md`.
Not fixed here because (a) it is a different vocabulary than the two this
handoff scoped the guard to, and (b) the handoff's scope note says not to
restructure the live documents beyond what the failing-then-passing
demonstration needs.

The new guard (`_ENUMERATED_STATE_VOCABULARIES` in
`tests/test_tolerance_stack.py`) covers only the first two rows, per the
handoff. Widening it to the other four is mechanical — each already has a
`python_*_rules()`/`python_*_statuses()` extractor in
`tests/test_js_python_vocabulary.py` — and is a natural follow-up if a
`VA.CROP_RULES`/`VA.IDENTITY_RULES`/`VA.CONFIDENCES`/`VA.VERDICT_SCOPES` entry
ever loses its documentation the same way `EXPORT_STATUSES` did on 2026-08-12.

## The mistake I made and caught before it shipped

My first version searched **every** live document (`live_documents()` walked
whole, `_prose_blocks` over each) for a state's name, on the theory that this
was the more "self-updating" reading of the handoff's "the guard walks
`live_documents()`" line — if the viewer's docs ever moved to a different file,
the guard would not need to move with them.

That version could never fail. Every stack and materials JSON under `docs/`
carries these same words as literal **field values**
(`"status": "established"` on a `source_ref.export`), and `_prose_blocks` walks
every string in a JSON file as a prose block. A corpus-wide search finds
`established` and `unestablished` in half a dozen strategy briefs, the SOP, the
review checklist, and a few dozen JSON leaves, so deleting the one section that
actually *explains* the state leaves the search still trivially satisfied by
data that was never prose in the first place. I only caught this by actually
running the replay test and watching it fail to fail (`assert ... <= set()`),
then grepping `live_documents()`'s own output by hand to see why.

**The fix: scope each vocabulary to its one owning surface (a small, explicit
`vocabulary -> README path` map), read through `live_documents()` so a surface
that stops being live raises instead of going quiet.** That map is not the
hand-kept list shape 1 was rejected for — shape 1 hand-keeps *which headings
must exist in the prose*, which drifts every time prose is reworded; this
hand-keeps *which file is the viewer's own documentation*, which changes only
when the surface itself moves. Scoping the search to one `.md` file also
sidesteps the JSON-field-value problem for free: a Markdown file has exactly one
prose block, no embedded data to confuse with prose.

**Takeaway for the next agent extending a doc-scan guard to a specific surface's
documentation:** searching the whole `live_documents()` corpus is right when the
question is "does *any* live text disagree with the data" (the hardware-count
and traced-ratio guards, both cross-corpus by design). It is wrong when the
question is "does *this* surface's own doc name *this* state" — the JSON blocks
alone are enough live text to make that search vacuously true everywhere.

## Demonstrations run

`test_the_enumerated_state_doc_guard_catches_the_08_12_deletion` is the
demonstration and runs as part of the suite (no manual probe needed): it takes
the live `apps/viewer/README.md`, cuts `## Which bytes the number was read off`
and the `EXPORT UNESTABLISHED` / `CTE NOT TRANSCRIBED` legend rows in memory,
and asserts the sibling guard would flag `established` and `unestablished` on
that text. Ran alone first (both new tests green), then the full suite.

Full suite: **443 passed, 1 skipped**, measured in the worktree
(`handoff/enumerated_state_doc_guard`) with the main checkout's interpreter,
`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`. 126 tests
collected from `tests/test_tolerance_stack.py` (124 before this handoff). The
one skip is `test_viewer_js_suite`'s node-fs tier, which needs a populated
`data/`.

## Gotchas for the next agent here

- **`test_this_branch_amended_the_row_of_every_imported_file_it_changed` fires
  on this file too.** Touching `tests/test_tolerance_stack.py` requires an
  "Amended again" clause on `PROVENANCE.md:96` — same trap the
  `traced_ratio_guard_freshness` lesson already names, still live.
- **`venv-win` is gitignored and absent from this worktree** — run the main
  checkout's interpreter by absolute path.
- **Cross-test-module imports are the established pattern here**
  (`from tests.test_sop_vocabulary import ...`, `from tests.test_hub_bearing_thermal_fit import ...`).
  I imported `python_values_statuses` from `tests/test_js_python_vocabulary.py`
  rather than re-deriving the `values_status` vocabulary a third time — no
  circular import, since that module imports nothing from
  `test_tolerance_stack.py`.

## Follow-ups (filed, not fixed)

- `ISSUE_20260821_no_source_ref_is_the_one_viewer_confidence_state_not_named_by_spelling_in_the_readme.md`
  — the one enumerated state found undocumented today.
- Widening `_ENUMERATED_STATE_VOCABULARIES` to `VA.CROP_RULES`,
  `VA.IDENTITY_RULES`, `VA.CONFIDENCES` and `VA.VERDICT_SCOPES` is mechanical
  (each already has a Python-side extractor) but out of this handoff's scope,
  which named only `VA.EXPORT_STATUSES` and `values_status`.
