---
type: chore
priority: med
status: open
area: tests/provenance
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_citation_identity_correctness.md
---

# `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit` no longer describes what it checks, and six live documents name it

On 2026-09-16 `citation_identity_correctness` re-cited
`stack_pitch_link_to_pitch_plate.json::pitch_plate_flange` from the PRELIM
215197 fixture to the released 215735-A. That took the three 215197 runs out of
the stack. The two 215735-A runs that replaced them —
`20260813_180734` (2026-08-14T01:07:56Z) and `20260819_153213`
(2026-08-19T22:32:36Z) — **postdate** both commits the test checks against:
`d6829f2` (`pitch_link_stack`'s first commit, 2026-08-04T22:42:57Z) and
`e7bd996` (tolstack's root commit, 2026-08-03T23:05:08Z).

So the sentence the function name makes is now **false**: the pitch link
stack's cited runs do not predate that session's first commit. Not one of them
does.

## What was done instead, and why the name was kept

The body was restructured rather than renamed. It now clears every cited run
either by timestamp *or* by an enumerated entry in
`_RUNS_CLEARED_WITHOUT_A_TIMESTAMP` that records the weaker argument standing
in (both runs carry `"purpose": "eager"` in drawing-checker's own
`run_meta.json`, and tolstack has no write path into that repo —
`ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`). It fails on
an unlisted postdating run, on a listed run nobody cites, and on any change to
the cited set, so it kept its bite. The strongest form — *a cited run existed
before this repo did* — moved to a new
`test_the_strongest_read_only_claim_still_has_a_subject`, which checks it
across every stack; the tan-link and VPA stacks still cite four pre-root runs
between them.

The name was kept because renaming it breaks prose in files that session did
not own, including **a staged handoff that has not been worked yet**:

| file | why it matters |
|---|---|
| `docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md` (lines 54, 194) | **staged, not yet run** — instructs a future agent by this name |
| `docs/prompts/REVIEW_AGENT.md` (line 3224) | live prompt served to review agents |
| `docs/issues/ISSUE_20260915_the_joint_assembly_export_is_prose_so_its_runs_have_no_ts.md` | open issue |
| `docs/sessions/lessons/LESSONS_20260807_readonly_invariant_evidence.md`, `LESSONS_20260915_pitch_link_known_bands.md` | historical, correctly frozen |
| `docs/sessions/reviews/REVIEW_20260812_hardware_counts_doc_guard.md`, `REVIEW_20260915_pitch_link_known_bands.md` | historical, correctly frozen |

Renaming under a staged handoff is the more expensive mistake, so the cheaper
one was taken deliberately and recorded here rather than left implicit.

## What closing this looks like

Rename the function to what it now claims — something on the order of
`test_every_run_the_pitch_link_stack_cites_is_cleared_as_not_ours` — and in
the same commit update the two **live** references (`REVIEW_AGENT.md` and
`HANDOFF_20260916_python_value_and_schema_pins.md`, if that handoff has not
been consumed by then; if it has, its lesson instead). The lessons and reviews
are records of what was true when written and should **not** be edited — the
repo's convention for those is a dated correction blockquote if anything at
all.

Sequencing note: `HANDOFF_20260916_python_value_and_schema_pins.md` is one of
five handoffs staged in parallel with this one and also touches
`tests/test_tolerance_stack.py`. Doing the rename before it runs would change
the file under it. Best done after it lands.
