# LESSONS 2026-09-15 — projection_field_guard_rows

Handoff: `docs/sessions/HANDOFF_20260914_projection_field_guard_rows.md`.
Branch `handoff/projection_field_guard_rows`, cut from `integration` (which
already carried `guard_mutation_witness_tier`, this handoff's `depends_on`).

Three guard gaps. The handoff said an **audit result is worth more here than
the three fixes**, so that is §1; the fixes and their non-obvious halves follow.

---

## 1. The audit: `TOPO_VALUE_GUARDS` is still short by three (and the method)

Filed as
`docs/issues/ISSUE_20260915_four_branched_topology_fields_have_no_value_guard_row.md`
with the numbers; the part worth reading here is **how to run it again**, since
the enumeration will go stale again:

1. Walk every field path of `topologies.json` and keep the paths whose live
   value set is small and non-numeric. That is the shape of an enumeration and
   it takes about ten lines of Python; it surfaces candidates without anyone
   having to remember what was added.
2. `git log --since=<a month ago> -p -- scripts/build_topology_projection.py`,
   grepping added `"key":` lines.
3. For each candidate, grep the **views** for a branch on it. This step is what
   keeps the audit honest in both directions, and it changed three of my
   answers:
   - `studies[].checks[].verdict` / `verdict_scope` / `worst_confidence`
     arrived 2026-09-09 and look like a glaring gap. The topology page renders
     **no** checks at all — `views/topology.js:1127` says so and grep agrees —
     so a row today would guard an unrendered field. Latent, not a defect.
   - `dimension.source_ref.kind` and `.export.status` are carried in
     `topologies.json` and are guarded stack-side. The topology detail pane
     renders neither a kind chip nor an export chip; `VA.citationWhere` only
     composes location fields. Not a gap.
   - `topologies[].worksheet_source` looks inert and **is the real find**: the
     topology page reaches the shared `VA.renderWorksheet` at
     `topology_app.js:1051`, and `views/worksheet.js:29` branches on
     `=== "declared"` with a silent else. Added 2026-09-08, no row.
4. Compare against the rows.

**The finding that matters beyond this repo:** the stack-side `VALUE_GUARDS`
table has a row for `stacks[].worksheet_source`, so the *vocabulary* is guarded
and the *second projection's copy of it* is not. `VALUE_GUARDS` runs against
`realResults` only. "Is this field covered?" cannot be answered by grepping for
the field name — you have to check which projection the table that mentions it
is pointed at.

Two more rows are missing for fields that predate the audit window
(`edges[].zero_width`, `nodes[].branch`/`layout.rows[].branch` — booleans with
silent falsy arms, branched three times each). They are in the issue because the
argument that put `mesh.installed` in row 9 applies to them unchanged, not
because anything drifted.

One field is **correctly** absent and I nearly filed it as a gap:
`studies[].error.type` has a real branch table (`VA.STUDY_ERRORS`) but a **loud**
fallback, and no live study carries an error — so a row would trip the
empty-collector arm on every run, forever. It is paired to Python by
`tests/test_topology_projection.py` instead.

## 2. `Study.description` / `StackDefinition.description` — measured, and extending the guard would be WRONG

The handoff's explicit question. Measured with the guard's own scanner: **no**
committed study's and **no** committed stack's `description` (or any other
top-level prose field) states an inventory today — 21 studies, 7 stacks, zero
hits.

The part that is not just "nothing to do": adding those fields to the topology
guard's scope would be a **defect**, not caution.

- `_COUNTABLES` derives from the **graph**. A study's own countable is the
  length of its `selection`, a *subset*. "This study walks 4 edges across 3
  parts" would be read as a false claim about a 7-edge graph — a false positive,
  and the loud kind `docs/prompts/REVIEW_AGENT.md` logs as how a guard gets
  deleted. A study-side pairing needs a study-side baseline.
- A stack has elements, not parts/interfaces/edges. No baseline exists at all.

Filed as
`ISSUE_20260915_a_study_or_stack_description_can_grow_a_derivable_count_with_nothing_pairing_it.md`
(`audience: strategy`) because the remaining question — write the prohibition
into the SOP's "Titling an artifact", or build a study-side pairing when someone
first needs one — is a judgement, and inventing an SOP rule was past this
handoff's line.

## 3. The mutation-witness tier fits one of the three items, and that is the right answer

The handoff said to declare each new/changed guard's mutation in
`guard_mutation_witness_tier`'s table and to **say so plainly** if the mechanism
does not fit. It fits exactly one item.

- **Item 3 (the two rewritten mesh tests): fits cleanly.** Two new fast-tier
  entries, both witnessed. Both mutate the detail pane's gate in
  `apps/viewer/views/topology.js`; `annotate-link-withheld-where-no-mesh` drops
  the mesh half of the gate, `annotate-link-offered-where-a-mesh-resolves`
  inverts it. The second deliberately inverts the **pane's** gate rather than
  blinding `VA.partHasMesh`, because the test uses `partHasMesh` to *classify*
  the live edges: blinding it would redden the test through its own classifier
  changing underneath it rather than through the pane misbehaving. Same red,
  much weaker claim. Worth knowing before writing an entry for any guard that
  reads app code to build its own fixture.

- **Item 1 (the `TOPO_VALUE_GUARDS` row): does not fit, by construction.** The
  tier patches `apps/` and `scripts/` and requires a tier to go red. A value
  guard is falsified by **data**, not by code: no app-side mutation can redden
  it, and `--repo` data is outside the shadow tree on purpose. Writing the
  collector *through* the page's reader to make it mutable would defeat the row
  — `VA.partMeshFact` maps an absent block to `false`, which is the exact thing
  the row exists to catch.

  So the equivalent is in-tier, and it is strictly better than an entry would
  have been: the reporting loop is lifted out as
  `unexplainedValues(guards, projection)` and the bite test now blinds **each
  real row's** collector in turn and requires the report. It runs in every fast
  tier run, covers all nine rows automatically, costs milliseconds, and cannot
  drift from the loop it replays. A mutation entry would have covered one row,
  more weakly, at browser-tier price.

- **Item 2 (the Python guard): does not fit.** The table's `tier` vocabulary is
  `{"fast", "browser"}` and the runner spawns one of the two JS runners. There is
  no pytest tier and adding one was not this handoff's job. The Python-side
  equivalent already exists as a pattern — `test_the_structural_count_pairing_
  can_fail` — and item 2's work was to make it replay the guard's **scope** as
  well as its parser.

## 4. The scope replay was vacuous **twice**, and the second one needed a reviewer

Read §4 as one lesson in two rounds, because the interesting part is that the
same mistake survived the fix for it.

### Round 1 — the shape I wrote first

```python
for field in PROSE_FIELDS:
    ... plant a wrong inventory in `field`, assert it is caught ...
```

**Measured: dropping `description` back out of `PROSE_FIELDS` left that test
green.** A loop over the tuple cannot notice a key *leaving* it — it just does
one fewer iteration. That is the same vacuity the whole handoff is about, one
level up, and I only found it because I ran the demonstration the handoff asked
for instead of trusting the shape.

The repair was a second arm that measures the tuple against the corpus and does
**not** read it: `prose_candidates(raw)` returns every top-level field of a
topology document that is prose rather than structure, and the test requires
every one whose text states an inventory to be in `PROSE_FIELDS`.

### Round 2 — and `prose_candidates` could not see `notes`

The review's blocker, and it was right. `prose_candidates` recognised a `str`
or a flat `dict[str]` "the way `provenance` is". **`notes` is a `list[str]`** —
the field carrying the *primary* hand-copied inventory this guard exists for,
in all five committed topologies. So:

**Measured: dropping `notes` from `PROSE_FIELDS` left the whole module green
(120 passed).** The new arm, whose own docstring said "this is what reddens when
a key is dropped", was true for `description` and false for `notes`, and no tier
could tell.

The guard *proper* was never affected — `own_prose` dumps the raw value, so a
`list[str]` is scanned, and planting `11 edges` in `notes` reddens today exactly
as it always has. What was wrong was the **falsifiability check's** claim about
itself. That is a worse failure than a narrow guard: a guard that admits its
reach gets widened, a guard that overstates it gets trusted.

### What the fix has to be, and the transferable rule

Widening `prose_candidates` to `list[str]` fixes today. It does not fix the
class — a fourth JSON shape would land the same way. So the arm that answers
the class is a **reachability** arm, which is the thing neither round had:

```python
assert set(PROSE_FIELDS) <= reachable   # reachable = every key prose_candidates returns
```

That separates two silences the first two rounds conflated:

- *"no committed document's `title` states an inventory"* — safe, expected, and
  why dropping `title` reddens nothing.
- *"`notes` is invisible to the scanner"* — the defect, and indistinguishable
  from the above by every assertion I had written.

**The rule: a completeness check needs a second source of truth, and then it
needs to prove it can SEE that source.** Corpus-vs-constant is the right shape
and it is not sufficient on its own; the scanner standing between them is a
third thing that can be wrong, and it fails silently in precisely the direction
that looks like good news.

The completeness arm is also now genuinely replayed rather than described:
`unlisted_inventory_fields(fields)` takes the tuple as an **argument**, and the
test runs it against `PROSE_FIELDS` minus each key in turn, requiring the
removal to be *named*. In round 1 that replay existed only as a sentence in this
lesson, which is exactly the "nothing schedules anyone to read it" failure the
tactical prompt warns about — and it is why the reviewer, not a tier, found
round 2.

### The four arms, and what each one bites on (all measured)

| arm | mutation | result |
| --- | --- | --- |
| 1 parser + per-field reach | — | passes; proves `own_prose` reads each listed field |
| 2 the filter filters | — | a key outside the tuple is not scanned |
| 3 reachability | `prose_candidates` re-narrowed to `str`+`dict` (the reviewed defect, restored) | **red**: `PROSE_FIELDS lists ['notes'], which prose_candidates returns for no committed topology` |
| 4 completeness + per-member replay | drop `notes` | **red**, naming all five files |
| 4 | drop `description` | **red**, naming both files |

## 5. Same defect shape as atp-post's `census_live_test_pins_a_growing_count`

The handoff asked for a line if the fix rhymed. It does, and the rhyme is
specific: **a count over a population someone else is still adding to.** The
repair in both cases is not "update the number" but "assert the rule and keep a
non-vacuity witness so it cannot pass on an empty set". Here that meant the
tests keep `ok(candidates.length > 0, …)` on **both** sides — which is also what
makes them fail honestly if the mesh set ever reaches *every* part, exactly as
the count-free pairing test already did.

One thing the rhyme does not cover: my replacement picks its subjects with
`VA.partHasMesh`, i.e. with app code. That is what made the mutation-entry
choice in §3 non-obvious.

## 6. Measurements, first-hand

Each demonstration the handoff asked for, and what it printed.

**The mesh row bites, both arms.**

- Collector emptied (`return [];`): `[real] no live topology value is one the
  page cannot render` → `FAIL … ["parts[].mesh.installed: no live value found —
  either the collector is wrong or the builder stopped writing it"]`, 359/360.
- The real defect, not a simulation: a scratch repo root holding a copy of the
  live projection with **every** `mesh` block stripped (29 parts) →
  `parts[].mesh.installed = undefined is in the live projection and the page has
  no branch for it`, with the branch text naming the rebuild.
  - Also learned there: the count-free pairing test does *not* stay silent on
    that projection — it throws `Cannot read properties of undefined (reading
    'installed')`. So the absent state was never quite invisible to the tier;
    what it lacked was a diagnosis. A `TypeError` naming `installed` does not
    tell a reader to rebuild the projection.

**The count guard bites on `description`.** Planting `9 edges` in
`topology_pitch_link_to_pitch_plate.json`'s description (the graph has 8):
`AssertionError: topology_pitch_link_to_pitch_plate.json states [9] edge(s);
the graph has 8. In: '4 parts, 7 interfaces, 9 edges.'` — and the scope arms
bite per §4's table. Both counts left exactly as shipped (4/7/8 and 4/7/7); the
defect was the pairing.

**And it still bites on `notes`, which is what round 2 had to confirm.** Planting
`11 edges` in the same file's `notes` → `states [11] edge(s); the graph has 8.
In: '4 parts, 7 interfaces, 11 edges, 3 branch points, 2 grounded loops …'`.
`own_prose` dumps the raw value, so a `list[str]` was always scanned — the
`prose_candidates` blind spot was in the *falsifiability check*, never in the
guard.

**Round-2 review fixes, verified.** The `aliased` non-vacuity witness now uses
`(part.mesh || {})`: on a scratch root with the 28 meshless parts' `mesh` blocks
**removed** and the one meshed part's kept, both rewritten tests pass and the
value-guard row prints the rebuild diagnosis in the same run. The only throw
left on that root is the untouched third test, which is the pre-existing shape
noted above. The `[real]` mesh block's header comment no longer states a count
(it named "two installed meshes … against 29 topology parts" — dated, and
`data/meshes/` holds 24 today, of which 1 resolves to a topology part; the
sentence now gives the reason and points at `tests/test_part_mesh_aliases.py`,
which owns the alias table).

**The mesh tests hold at any mesh count.** Three scratch projections:

| projection | old tests | new tests |
| --- | --- | --- |
| live (1 mesh of 29 parts) | green | green |
| `hub` meshed — the review's own measurement | **FAIL** `[real] an untraced edge whose part has NO mesh offers nothing at all` (`not equal: true !== false`), 359/360 | 360/360 |
| 28 of 29 parts meshed, `hub` left meshless | not run | 360/360 |

The old-tests row is first-hand, not quoted from the issue: `git show
HEAD:apps/viewer/tests.js` over a copy of `apps/`, run against the same scratch
root.

**Tiers.**

| tier | before | after |
| --- | --- | --- |
| `node apps/viewer/run_tests.cjs` | 298/298 | 298/298 |
| `... --repo C:\workspace\tolstack` | 360/360 | 360/360 |
| `node scripts/run_viewer_browser_tests.mjs --repo …` | not measured | 19/19 |
| `venv-win/Scripts/python.exe -m pytest -q` | 875 passed / 1 skipped | **876 passed / 1 skipped** |
| `node scripts/run_mutation_witness_tests.mjs --repo …` | 10/10 (prior lesson) | **12/12** |

The browser tier has no "before" because nothing in this change reaches it —
the edits are in the fast tier's `[real]` block, `tests/test_topology.py` and
the witness table, and `run_viewer_browser_tests.mjs` never loads `tests.js`.
Run after the fact to confirm that reasoning, and it was green.

The `[real]` tier count does not move: item 1 added a guard **row**, not a test,
and item 3 replaced two tests with two. (The handoff quoted 869/1 for pytest;
`guard_mutation_witness_tier` had since added 6.)

No projection was rebuilt. `data/projections/viewer/` was read at
`C:\workspace\tolstack\data\projections\viewer\` by absolute path throughout;
the three scratch roots are under the session scratchpad, never in `data/`.

## 7. Gotchas

- **`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` from the Bash
  tool silently runs against the wrong root.** Bash eats the backslashes and the
  runner resolved `.../projection_field_guard_rows/workspacetolstack/data/...`
  — then printed a perfectly ordinary `298/298 passed` with the `[real]` tier
  **skipped**, which reads exactly like a clean full run. Quote it
  (`--repo 'C:/workspace/tolstack'`) or use forward slashes. The `SKIP node-fs
  tier` line names the path it tried; that line is the tell.
- **A scratch `--repo` root needs more than the projection.** Beyond
  `data/projections/viewer/` (PNG crops included — copy the directory, not
  `*.json`), the `[real]` tier reads worksheets by their repo-relative
  `worksheet_file`, so `docs/tolerance_stacks/` has to be there too. Without it
  you get three unrelated worksheet failures that look like your change.
- **Unquoted Bash heredocs run backticks in Python comments.** `<<PY` with a
  comment containing `` `hub` `` produced `bash: line 1: hub: command not
  found`. Quote the delimiter (`<<'PY'`) — and note the other half of
  `guard_mutation_witness_tier`'s warning still applies: heredocs mangle
  backslashes, so anything containing `\n` goes through the Write tool. Both
  bitten this session.
- **`mutation_witnesses.json` is CRLF and hand-indented**, so a `json.dumps`
  round-trip would reformat the whole file including its `about` array. Appending
  entries as text (`json.dumps(entry, indent=2)` re-indented four spaces, `\n` →
  `\r\n`, spliced before the closing `]`) leaves the rest byte-identical.
- **Two entries may share one `find`.** `test_every_anchor_resolves_to_exactly_
  one_place` counts matches per entry, not across the table, so a gate with two
  distinct wrong versions is two entries on one anchor. That is how the pair in
  §3 is written.
