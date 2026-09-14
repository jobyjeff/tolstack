---
type: review
handoff: stack_title_style_pass
reviewer: review agent (dispatch)
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# REVIEW — stack_title_style_pass (2026-09-14)

Two commits on `handoff/stack_title_style_pass` (`164a07b`, `4855171`), tactical
worktree clean — nothing to commit on the author's behalf. Merged into
`review/stack_title_style_pass`; `git merge-base --is-ancestor` said NOT MERGED
first, so the merge was real and the green suite below means something.

## What I verified

**No number moved, and no id moved.** The whole JSON change is one diff filter
away from provable: every added line under `docs/tolerance_stacks/` and
`docs/topologies/` is a `"title"` or a `"description"`, and every removed line is
a `"title"` — zero other lines, across 37 files. No `id`, no element value, no
`source_ref`, no `confidence`, no sign, no `lmc`/`mmc`, no check, no filename.
The mandatory stack checks 1–6 are therefore addressed by construction rather
than by re-reading each element; check 7 I re-derived anyway, and it is
unchanged: **5 traced / 3 inferred / 18 untraced, out of 26 element instances**
across the three seeded slice-1 stacks (30 / 9 / 20 of 59 across all seven).

**Tests, re-run by me, not taken from the report.**

- `venv-win/Scripts/python.exe -m pytest -q` → **802 passed, 1 skipped**.
- `node apps/viewer/run_tests.cjs` against a freshly-built projection →
  **285/286**, fixture key-set drift guard green (see the projection note below
  for the one failure and why it is not this work's).
- **No test pollution**: nothing under `C:\workspace\tolstack\data\` has an mtime
  from my run; the newest file there is a sibling handoff's build.

**Every new guard observed failing, not accepted on green.** Four separate
breakages, each reverted and the tree confirmed clean afterwards:

- planted `"… as a topology (degrees)"` on `topology_pitch_system.json` →
  `test_a_title_is_a_short_noun_phrase[docs/topologies/topology_pitch_system.json]`
  red, naming the right file and quoting the matched substring;
- renamed the SOP heading to `### Naming an artifact` →
  `test_the_sop_still_carries_the_title_rule` red. That is the doc-scan family's
  deleted-section hole, and the author closed it deliberately;
- deleted the study row's `setTooltip` call → *"a description authored on a
  topology, a study or a stack is the row's hover tooltip…"* red;
- replaced the topology row's click hint with `null` → *"the topology row's
  description does not displace the click hint"* red. That last one is the test
  worth having: the hint is the only statement anywhere of what clicking a
  topology row does, and the obvious implementation of this deliverable
  overwrites it.

**The counts inside the new descriptions.** Two topology descriptions restate the
graph's shape; I recounted both from the JSON rather than trusting them —
`pitch_link_to_pitch_plate` is 4 parts / 7 nodes / 8 edges and
`tan_link_to_pitch_plate_take2` is 4 / 7 / 7, both as written. The two *new*
factual claims in descriptions also hold: `rotor_fastener_length` has exactly
nine `fastener_grip_u*h` edges and exactly nine `study_rotor_fastener_grip_*`
files, and `study_tan_link_take2_worst_case_protrusion` does `closes` the
`protrusion` edge, whose kind is `gap`. Everything else in the descriptions is
lifted verbatim from prose already on `integration` (`notes` / `scope`), which is
the right way to demote — no new prose asserting engineering conclusions.

**Schema additivity is real.** `description` defaults to `None` on all three
dataclasses, `Study.from_dict` picks it up through its existing
`__dataclass_fields__` filter (so it needed no edit and correctly got none),
nothing in `fold()` / `traverse()` / `summarize()` reads it, and both projection
builders carry it through verbatim. `/v0` staying put is correct and matches the
precedent the author cites.

**`PROVENANCE.md`.** Four amendment rows, one per imported file actually touched
(three stacks plus `tolerance_stack/stack.py`), each stating `title`-only or
`title`-plus-`description` and that the `id` did not move. `test_provenance` is
green, which is the mechanised half; the prose half reads correctly.

**Out of scope, respected.** No viewer geometry / layout / grid code touched —
`views/nav.js` gains only a `title=` attribute and a nine-line helper. Nothing
written into drawing-checker; `data/inbox/specs/` untouched.

## Findings

### should-fix (1) — filed, not fixed inline

**`description` sits outside the structural-count guard's key tuple.**
`tests/test_topology.py::test_a_topologys_own_notes_count_the_graph_they_describe`
scans `{"title", "notes", "provenance"}`. The new `description` is not in that
set, so the two topologies above now carry their graph inventory in **two**
places: the `notes` copy, which goes red when an edge is added, and the
`description` copy — **the one the viewer actually renders on hover** — which
goes stale in silence. Both are right today; the pairing is the defect, and it is
this repo's most-repeated shape.

Not fixed inline: adding `"description"` to the tuple is one word, but it needs a
replay asserting the *scope* (a planted wrong count in `description` is caught)
to be trustworthy, and a fix I would want a test for is past the inline-fix
boundary. Filed as
`ISSUE_20260914_topology_description_sits_outside_the_structural_count_guard.md`
(`type: bug`, `priority: med`), and added to this repo's overlay as a recurring
entry generalised past counts: *whenever a diff adds a prose field, grep every
doc-scan guard for a hard-coded key set.*

### nits (3) — grouped, none filed

- **`BANNED_SHAPES` has no replay of its own motivating instances, and one
  pattern is wider than its label.** The third column of each entry names the
  exact authored title that motivated it, and nothing asserts the pattern still
  matches that string — the parametrised scan only proves no *live* title trips
  it, so a pattern that stopped biting would be silent. Separately, the unit
  matcher alternates on the bare English word `in`, so `"Main spindle bearing
  seats (M1 as-built, in service)"` is rejected as *"a unit in parentheses"*: the
  right verdict (a noun phrase takes no parenthetical) for a reason the author
  reading the message cannot act on. Both are one-liners; both are in the overlay
  now, as the second sighting of the existing false-positive entry.
- **`description` now means two different things at two nesting levels.**
  `topology.joint.description` (the joint's physical description) has existed
  since the topology archetype; `topology.description` is the new tooltip. No
  functional collision — `load_topology` reads the top level only — but the SOP's
  new schema-table row and its "Titling an artifact" section do not distinguish
  them, and an author skimming either will meet `description` twice.
- **Two studies now share the title "Shank out"** (`pitch_link_shank_out`,
  `vpa_output_shank_out`). Unambiguous in the nav, which nests each under its own
  topology, and the descriptions do distinguish them; it would read ambiguously
  in any flat listing. Accepted as the cost of the rule, noted so the next person
  does not read it as an oversight.

## Note on the projections — not a finding against this work

`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` **fails** the
topology fixture drift guard, and it is not this branch's doing. The shared
`data/projections/viewer/topologies.json` in the main checkout was rebuilt at
23:37 UTC by the concurrently-active `annotate_affordances_flyout_and_mesh_gating`
worktree, eight minutes after this handoff built it at 23:29 — so the live file
carries annotate's `parts[].mesh` and **not** this handoff's `description`, and
the guard correctly reports drift in both directions. `results.json` and
`crops.json` are still this handoff's build (`164a07b`). Rebuilding the topology
projection into a scratch `--data-root` from the merged tree and re-running the
node tier gives a green drift guard, which is the check that matters.

I did **not** rebuild `topologies.json` in the main checkout: my tree does not
contain annotate's head, so the provenance gate refuses, and `--allow-older-tree`
would clobber a live session's build to fix a file that a rebuild after both
merges fixes properly. This is
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`,
already open — no new issue. **Action for whoever lands the next merge: rebuild
all three projections from a tree containing both handoffs.**

## For the next reviewer

The handoff's lesson is unusually good and worth reading before the diff — the
before → after table is complete, and its §3 ("where shortening lost a real
distinction") names the two end-stop studies as a deliberate, revisitable loss of
at-a-glance information. That kind of self-report makes a review cheap; it was
accurate everywhere I checked it.

**Verdict: APPROVE.** 0 blockers. Merged to `integration`.
