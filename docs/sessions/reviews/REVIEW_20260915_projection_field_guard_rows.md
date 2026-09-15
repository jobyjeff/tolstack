---
type: review
handoff: docs/sessions/active/HANDOFF_20260914_projection_field_guard_rows.md
reviewer: agent
date: 2026-09-15
verdict: REQUEST CHANGES
blockers: 1
---

# REVIEW 2026-09-15 — projection_field_guard_rows

Branch `handoff/projection_field_guard_rows` (`0c433e0`, `0b16566`), merged into
`review/projection_field_guard_rows` for verification. **Not merged into
`integration`** — one blocker.

Containment checked before starting: `git merge-base --is-ancestor
handoff/projection_field_guard_rows integration` → NOT merged, so nothing
bypassed the gate and the merge-and-watch-it-go-green step was real.

The work is good, the lesson is unusually strong, and the audit the handoff
asked for is worth more than the three fixes exactly as predicted. The one
blocker is the same vacuity class the handoff exists to fix, one field over,
inside the guard this handoff added.

## What I verified first-hand

**The merge.** Clean, no conflicts, despite `apps/viewer/tests.js` moving on
both sides (`integration` gained `viewer_hygiene_pass`'s 33 lines elsewhere in
the file). Nothing to report under the conflict carve-out.

**Tiers, measured in this review worktree.**

| tier | pre-merge (`integration` d0f4763) | post-merge |
| --- | --- | --- |
| `pytest -q` | 879 passed / 1 skipped | **880 passed / 1 skipped** |
| `node apps/viewer/run_tests.cjs` | — | 298/298 |
| `... --repo C:/workspace/tolstack` | — | **360/360** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | — | **12/12 witnessed** |

The pytest numbers are the *review worktree's*; the one skip is
`tests/test_viewer_js_suite.py`'s node-fs tier, which has no projection here —
covered by the `--repo` run above. The lesson's "875 → 876" is the tactical
worktree's own baseline; `integration` moved to 879 under it via
`viewer_hygiene_pass`, and the delta (+1 test) is the same.

The mutation tier needed `node_modules/playwright-core`, which is gitignored
and so absent from a fresh review worktree — a first run reported a misleading
`4/12 witnessed` with all eight **browser**-tier entries "NOT WITNESSED". That
is an environment artifact, not a defect: copying `node_modules` from the
tactical worktree gives 12/12, including both new entries. Worth knowing before
a future reviewer files a bug against it (overlay entry added).

**Item 1 — the `parts[].mesh.installed` row bites, both arms.**

- Collector emptied → `FAIL [real] no live topology value is one the page
  cannot render … ["parts[].mesh.installed: no live value found — either the
  collector is wrong or the builder stopped writing it"]`, 359/360.
- The real defect, not a simulation: scratch `--repo` root with all 29 `mesh`
  blocks stripped → `parts[].mesh.installed = undefined is in the live
  projection and the page has no branch for it`, with the branch text naming
  the rebuild. This is the state that was previously reachable only as a bare
  `TypeError`.
- The row's `branch` text matches `apps/viewer/topology.js`'s own comment on
  `VA.partMeshFact` word for word in substance (absent and `installed: false`
  are deliberately the same on the page; only a rebuild tells them apart). It
  reads the field **raw**, not through `partMeshFact`, which is the whole point.
- The per-row blind-collector replay in the bite test is the right shape and
  covers all nine rows automatically. I accept §3 of the lesson's argument that
  this beats a `mutation_witnesses.json` entry for a data-falsified guard, and
  the handoff explicitly invited that answer.

**Item 2 — `description` is now scanned, and the defect was real.**

- Pre-merge, planting `9 edges` in `topology_pitch_link_to_pitch_plate.json`'s
  `description` (the graph has 8) left `test_a_topologys_own_notes_count_the_
  graph_they_describe` **green**. The gap was real.
- Post-merge, same plant → `AssertionError: topology_pitch_link_to_pitch_plate.
  json states [9] edge(s); the graph has 8. In: '4 parts, 7 interfaces, 9
  edges.'`
- Dropping `description` from `PROSE_FIELDS` → the new completeness arm reddens
  naming the file and the key.
- Both shipped counts left exactly as they were (4/7/8 and 4/7/7), as the
  handoff required.

**Item 3 — the mesh tests hold at any mesh count.** Scratch `--repo` root with
`hub` meshed and 15 more parts (the exact change the sibling rotorkit handoff
will make):

| tests.js | result on that root |
| --- | --- |
| pre-work (`d0f4763`) | **FAIL** `[real] an untraced edge whose part has NO mesh offers nothing at all`, 359/360 |
| post-merge | **360/360** |

So the defect was real and the fix is confirmed independently of the lesson.
Also measured: with **every** part meshed, the untouched third test fails on its
own non-vacuity witness (`every live part has a mesh, so the withholding half of
this pairing went unexercised`) — by design, and it reproduces the overlay
entry's own 2026-09-14 measurement. Nothing to fix there.

**Scope.** `scripts/run_viewer_browser_tests.mjs`, `topology_app.js` and the
projection builders are untouched, as instructed. `docs/topologies/` is
untouched.

**Hygiene.** No writes to `C:\workspace\tolstack\data\` from any run in this
review (`find data -newermt "-40 minutes"` empty); the four scratch `--repo`
roots are under the session scratchpad. The main checkout carries one unrelated
untracked issue file, pre-existing and left alone. The `tests/test_part_mesh_
aliases.py` pinning the rewritten test now leans on does exist and does pin the
table (5 tests) — the lesson's claim checks out.

**The lesson's leftovers all have issues**, which is the thing APPROVE would
have orphaned: the `TOPO_VALUE_GUARDS` audit, the `Study`/`StackDefinition`
`description` question (`audience: strategy`, correctly), and the stack-side
`VALUE_GUARDS` bite-test hole. Frontmatter is right on all three — `found_by`
not `handoff:`, `status: open`, closed-set `type`/`priority` values.

## Findings

### BLOCKER — `prose_candidates()` cannot see `notes`, so the completeness arm is blind to the tuple's most important member

`tests/test_topology.py`, `prose_candidates()` (~line 1085) and
`test_every_prose_field_the_count_pairing_claims_is_really_scanned`.

`prose_candidates()` recognises a top-level field as prose when it is a `str`,
or a flat `dict` of `str` "the way `provenance` is". **`notes` is a
`list[str]`**, so it is never yielded — and `notes` is the field that carries
the primary hand-copied inventory this whole guard exists for ("The graph: 4
parts, 7 interfaces, 8 edges, 3 branch points, 2 grounded loops …", on two
topologies).

Measured: **drop `notes` from `PROSE_FIELDS` and `tests/test_topology.py` is
120 passed, fully green.** The per-field loop just does one fewer iteration and
the completeness arm never sees the key — which is the exact vacuity the
lesson's §4 diagnoses one level up, and which its own docstring says this arm
fixes:

> The completeness arm: every top-level prose field of every committed topology
> that states an inventory must be one PROSE_FIELDS lists. **This is what
> reddens when a key is dropped** …

That sentence is true for `description` and false for `notes`, and the
difference is invisible to every tier. Under the repo's own bar — *a check whose
scope structurally excludes the defect is silent in exactly the case it was
written for* — that is a guard claiming coverage it does not have.

**Suggested fix**, which I verified but did not apply (it changes what the guard
reports and wants its own replay, so it fails prongs 1 and 2 of the inline-fix
boundary):

```python
        elif isinstance(value, (dict, list)) and value and all(
                isinstance(v, str) for v in
                (value.values() if isinstance(value, dict) else value)):
            prose[key] = json.dumps(value)
```

Measured with that change in place: `tests/test_topology.py` 120 passed with
the real tuple, and with `notes` dropped it reddens on
`assert 'notes' in ('title', 'description', 'provenance')` — naming the file and
the key, same as the `description` case. `notes` is the **only** top-level
`list[str]` in any committed topology (checked all five), so this widens the
scan by exactly one field and adds no new false-positive surface.

Please also add the replay the fix deserves: the drop-a-key demonstration
currently exists only as a sentence in the lesson, and it is the one arm that
cannot prove itself. Asserting it per member of `PROSE_FIELDS` — not just for
`description` — is what would have caught this.

### SHOULD-FIX — the `[real]` mesh block's header comment still states a count, three lines above the new claim that the block is count-free

`apps/viewer/tests.js`, the `--- 3D affordances against the REAL mesh set ---`
header (~line 7485). The retained sentence:

> (handoff annotate_affordances_flyout_and_mesh_gating.) **Two installed meshes
> and one alias entry at 2026-09-14, against 29 topology parts**: …

immediately above the new:

> ALL THREE are written COUNT-FREE and NAME-FREE, and that is the whole
> discipline of this block …

Measured against the tree today: `data/meshes/` holds **24** installed meshes,
and **1** of 29 topology parts has `mesh.installed` true, with 1 alias entry.
The sentence is dated, so it is not a false claim about today — but it is a
count in prose that no test reads, in the block whose comment now asserts
count-independence as its discipline, and it is the first thing a reader of that
block reads. This is a second sighting of the overlay's own
*"a guard written to hold 'at any count' that names today's live data … and a
comment claiming the whole block is count-free"* entry, inside the fix for it.

The line is pre-existing context in the diff, not added here — but the handoff
rewrote this comment, and the surrounding paragraph is now the wrong place for
it. Smallest fix: drop the digits and keep the reason (the sibling repo is
growing the mesh set), or point at `tests/test_part_mesh_aliases.py`, which owns
the alias count.

### Nits

- **`aliased` reads `part.mesh.installed` unguarded.** The new non-vacuity
  witness in the "HAS a mesh" test dereferences `part.mesh` directly. Measured
  on a scratch root with the 28 meshless parts' blocks removed: the test dies on
  `Cannot read properties of undefined (reading 'installed')`. This is the same
  pre-existing shape the lesson records for the untouched third test, and it is
  benign now — the new guard row prints the rebuild diagnosis in the **same
  run**, which is precisely what it was enrolled for. But while you are in the
  file, `(part.mesh || {}).installed` costs two characters and keeps the witness
  reporting instead of throwing.
- **`ISSUE_20260915_four_branched_topology_fields_…`'s "Fix shape"** folds in a
  real second finding — `test_no_persisted_field_vocabulary_is_an_inline_literal`
  reads only the `tolerance_stack/` package, so the inline `inList(["declared",
  "by_name", null])` in the stack-side row is uncaught by the scanner CLAUDE.md
  points at for this class. It is recorded with frontmatter and will be triaged,
  so no action needed — noting it so triage does not read it as a detail of #1.

## Verdict

**REQUEST CHANGES** — one blocker. Both asks are in files this handoff already
owns and neither touches a design decision:

1. Widen `prose_candidates()` to `list[str]` and replay the drop-a-key case per
   member of `PROSE_FIELDS`.
2. Retire the count from the `[real]` mesh block's header comment.

Everything else is verified green and I would approve on those two. The
`review/projection_field_guard_rows` branch holds the verification merge; it has
**not** been fetched into `integration`.

## For the next reviewer

Three things this review had to learn the hard way, now in the overlay:

- A fresh review worktree has no `node_modules`, so the mutation tier reports
  every **browser**-tier entry as NOT WITNESSED and looks like a wall of broken
  guards. Copy `node_modules` from the tactical worktree first.
- `run_mutation_witness_tests.mjs` builds its shadow tree at `tmp/mutation-
  witness` **inside the worktree**. A killed run leaves it undeletable from Bash
  (`Device or resource busy`); PowerShell `Remove-Item -Recurse -Force` clears
  it. Do not run two copies of the tier at once.
- The scratch-`--repo` harness the overlay recommends is as cheap as advertised
  and it answered every counterfactual in this review in about ten minutes. Four
  roots: mesh blocks stripped, all parts meshed, `hub` + 15 meshed, and the 28
  meshless blocks removed. Each needs `data/projections/viewer/` (the whole
  directory, crops included) **and** `docs/tolerance_stacks/`.
