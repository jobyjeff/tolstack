---
type: chore
priority: low
status: resolved
area: guards/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
---

# The viewer's markup-scan guard is enrollable now, and the reason it was excluded no longer holds

`LESSONS_20260921_mutation_witness_enrollment_backlog.md` excluded one of its 26
transcribed rows — Set A row 13, the viewer's own

> `this page's own markup prints no repo path, module path, id or command at the reader`

— on the grounds that it was **never enrollable on any tree**:
`tests/test_mutation_witnesses.py::test_every_expect_red_resolves_to_exactly_one_
place` requires an `expect_red` to resolve once in its check source, and that
name resolves twice in `apps/viewer/tests.js` — a `skip(...)` arm fired when
`VIEWER_SRC` is absent (the browser tier) and a `test(...)` one fired when it is
present (the node-fs tier), with identical strings on purpose. The lesson
recorded it as structural rather than decay, and did not file it.

**That is no longer true.** On 2026-09-22
(`handoff/mutation_witness_repair_and_enrollment`) the pairing module learned to
pass over a `skip(`-introduced occurrence, because only the `test(` arm can ever
print the `FAIL  <name>` line the runner attributes a red to, and the two arms
are mutually exclusive by construction. It was done to unblock a different
guard — `this app holds no terminal command for a surface to render`, which has
exactly the same shape and is enrolled now as two entries
(`no-command-table-in-the-config`, `no-view-reads-the-command-table`).

So the markup-scan row is one measured, reasoned row that can be enrolled by
transcription. It is filed rather than done in that session because it is not
one of the four issues that handoff was routed against, and because it wants the
usual discipline: **run it before declaring it** (`--only <entry>`), the same way
the 2026-09-21 pass found 2 of its 26 rows did not reproduce.

Its mutation is in Set A of
`docs/sessions/lessons/LESSONS_20260918_reader_facing_surfaces_second_pass.md`.
The one thing to check first is which of the two arms the mutation-witness
runner actually reaches: the tier it names must be `fast`
(`apps/viewer/run_tests.cjs`, which injects `VIEWER_SRC`), never `browser`.

There are 7 `skip("…")` declarations in `apps/viewer/tests.js`. Four name a
TIER that is unavailable rather than a check. Of the remaining three, one is the
command-table guard enrolled on 2026-09-22, one (`worksheet sits below the
table; the right pane is its own element`) was never blocked by this at all --
its `test(` arm is worded differently, so the name already resolved once -- and
this is the third.


---

## Resolved 2026-09-23 — enrolled on the `fast` tier, replayed first

`mutation_witness_derived_enrollment_and_gating`. Enrolled at
`scripts/mutation_witnesses/fast__this-page-s-own-markup-prints-no-repo-path-module-path-i__2cb6145a.json`,
with the one thing this issue said to check first written into its `note`: the
tier is `fast` (`apps/viewer/run_tests.cjs` injects `VIEWER_SRC`), never
`browser`, because the `skip(` arm is the one that fires without it and an arm
that cannot print a FAIL line cannot be attributed a red.

The mutation is the one from Set A of
`LESSONS_20260918_reader_facing_surfaces_second_pass.md` — the subtitle in
`apps/viewer/topology.html` goes back to naming `data/projections/viewer/`.
Replayed before declaring: **1/1 witnessed**, on the declared check.

The skip-arm rule that unblocked it is now in the enumeration rather than in the
pairing module, and `test_passing_over_the_skip_arm_is_load_bearing` still holds
it honest — this guard is one of the enrolled names that exercises it.
