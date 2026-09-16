# Lessons — `pitch_link_known_bands` (2026-09-15)

Applied the recorded `214820-002` length band and `NAS1149V0332` thickness band
to `stack_pitch_link_to_pitch_plate.json`, ending the no-workbook experiment by
Jeff's verdict, and amended SOP Steps 5b and 5c with the placeholder policy.

## The numbers, before and after

| | before | after | Δ |
|---|---|---|---|
| `bushing_214820` (min/nom/max) | 4.7625 / 4.7625 / 4.7625 | **4.63 / 4.76 / 4.76** | band 0 → 0.13 |
| `washer_nas1149v0332` | 0.8128 / 0.8128 / 0.8128 | **0.7112 / 0.8128 / 0.9144** | band 0 → 0.2032 |
| `clamped_stack_sourced` WC | 9.5353 … 9.7353 | **9.3012 … 9.8344** | ±0.1000 → ±0.2666 |
| `shank_out__11_sourced_only` | −8.1939 … −7.4859, nom −7.8399 | **−8.4280 … −7.3868, nom −7.8424** | wider at both ends |
| **binding eye requirement** | 8.1939 mm | **8.4280 mm** | **+0.2341 mm** |
| `cotter_hole_clear_of_sourced_stack` | 11.1435 … 12.6135 | **11.0444 … 12.8476** | budget WC −0.0991 |
| confidences | 4T / 2I / 0U | **4T / 0I / 2U** | traced count unmoved |

Verdicts (`fail`, `pass`), `complete: false` and `excluded_terms` are all
unchanged — the pitch-link eye is still absent, and that is still the result.

**The row worth carrying forward is the binding eye requirement.** The
zero-width bands were understating the width this joint needs by 0.234 mm. The
worksheet did say so in prose ("a *lower* bound on the real requirement") and
the viewer rendered `±0` with no such caveat, which is precisely the asymmetry
Jeff's ruling is about: a reader who sourced an 8.2 mm eye off the old number
would have concluded the joint passed worst case. It does not.

## Decisions the handoff left open

**1. What `kind` each citation gets.** The handoff said the `source_ref` should
cite "the hardware entry AND Jeff's drawing reading", and an element has exactly
one `source_ref`. Keeping `kind: "parts_list"` and putting the band's real
provenance in the `note` would have been the smaller diff — and is the exact
laundering shape SOP Step 5b names at the `214820-002` row: honest note, wrong
machine field, and the field is what every consumer reads. So:

- bushing → `kind: "drawing"`, `document: "214820-002"`, `view: "SECTION A-A"`,
  `callout: "4.76 +0.00/-0.13"`, **`export: {status: "unestablished", why: …}`**.
  That branch is exactly right for this and I did not expect to find it already
  built: *"An unresolvable citation is honest; a wrong one is not."* The `why`
  names the forge note and its attachment.
- washer → `kind: "workbook"`, cells `E11/F11`. One `kind: "workbook"` now exists
  in this stack, which is the thing it was founded not to have.

**Cost of that choice, flagged for the reviewer:** both elements dropped the
217755 parts-list citation, so both lost their **viewer crop** — the projection
can no longer show a reader the balloon. I think that is right (the parts-list
row does not contain the band, so the crop was showing a page the number is not
on), but it is a visible viewer regression and it was not asked for.

**2. `lmc`/`mmc` on the two elements.** They were `null` while zero-width, on the
worksheet's reasoning that "there is no transcribed material condition to
record". Both now carry the pair, matching `pitch_plate_flange`, which derives
its `3.96/4.16` from a `4.06 ±0.10` drawing callout that never says "LMC" either.
`fold()` still never reads them, and the test that reads `fold()`'s own source to
assert it contains no `.lmc`/`.mmc` is untouched.

**3. The bushing's nominal: 4.7625 → 4.76.** The handoff said to pick the
drawing's form, and I did — but note what it costs: `hardware_entries.json` still
records `dimensions_mm.length: 4.7625` and `tan_link` still folds `4.762`. Three
transcriptions of three sources disagreeing in the fourth decimal is
information, so the new cross-stack test pairs **bands only** and says in a
comment why nominals are deliberately not paired.

## Two things the change broke that were not obvious

**The RSS centre came off the nominal, for the first time in this stack.** The
bushing's band is one-sided (`4.76 +0.00/−0.13`, so nominal *is* max), `fold()`
centres RSS on the **midpoint**, and `rss_center` is now 0.065 mm below `nominal`
on `clamped_stack_sourced` and on both checks. The worksheet had a whole
paragraph asserting this artefact does **not** occur here, with the correct
reason at the time (every nominal was its own midpoint). It occurs now. Nothing
is wrong — verdicts cannot see RSS — but a reviewer comparing the RSS and
worst-case columns will notice the asymmetry, so it is stated in the stack's
`notes`, in the worksheet, and pinned by an assertion in
`test_pitch_link_clamped_stack_excludes_the_unsourced_link_eye`.

**`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`
lost half its subject.** The two 217755 drawing-checker runs were cited **only**
by the bushing and the washer, so re-citing those two elements removed the only
element-level `SourceExport` carrying them. They survive in
`joint.assembly_export`, which is a **prose string** with no `ts`, so the
timestamp comparison can no longer reach them. I did not fake it: the test now
asserts its run set is non-empty and is exactly the three 215197 runs (real
bite), plus that the unattributable run is still cited at joint level, and the
docstring records what was lost. Filed as
`ISSUE_20260915_the_joint_assembly_export_is_prose_so_its_runs_have_no_ts.md` —
the fix is to give `joint` a real `SourceExport`, a schema migration across all
seven stack files.

## The cross-stack test, and why it has a divergence list

`test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it` is the
value-level guard the new SOP rule needs. Two design notes:

- `SHARED_BANDS` states the expected band **outside** the files being checked, so
  an edit to one stack cannot quietly redefine what "consistent" means.
- `rotor_fastener_length`'s `washer_nas1149v0332_tt` is still zero-width and the
  handoff put that file out of scope in as many words. It is listed in
  `KNOWN_BAND_DIVERGENCES`, which fails **both ways** — on a listed pair that has
  come into line (delete the row) and on one that has stopped existing. Filed as
  `ISSUE_20260915_rotor_fastener_washer_band_diverges_from_its_siblings.md`.
  An exemption that cannot go stale is the only kind worth writing.

I verified the guard bites by flipping the pitch-link bushing back to 4.7625 in a
temp copy of the stacks dir and re-running it: it names the stack, the element,
what it folds and what it should.

## The projection rebuild — refused, and correctly

`scripts/build_viewer_projection.py --data-root C:/workspace/tolstack/data` exits
**3**: `handoff/viewer_study_verdicts_and_gaps` had built the shared projection
from a dirty tree three minutes earlier, and its commit is not an ancestor of
mine. That is the gate doing its job
(`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`), and
`--allow-older-tree` here would have stomped a live sibling session's artifact
for no gain. **I did not use it.**

Verified the projection content instead by building to a scratch `--data-root`,
which is sound because the projection is a pure function of the stacks dir:

```
pitch_link_to_pitch_plate  6 elements (4T/0I/2U), 3 paths, 2 checks, 2 BUDGET-SCOPE
  bushing_214820       min=4.63   nom=4.76   max=4.76   conf=untraced kind=drawing  zero_width=False
  washer_nas1149v0332  min=0.7112 nom=0.8128 max=0.9144 conf=untraced kind=workbook zero_width=False
  shank_out__11_sourced_only          -8.4280 .. -7.3868 fail scope=budget worst_conf=untraced zw_inputs=[]
  cotter_hole_clear_of_sourced_stack  11.0444 .. 12.8476 pass scope=budget worst_conf=untraced zw_inputs=[]
```

**For `viewer_study_verdicts_and_gaps`, which owns the loud badging: the signal
moved fields.** This stack used to distinguish "we have no idea" from "we read
this off a drawing" with **`zero_width`** — and `zero_width_count` is now `0`
here, with `zero_width_inputs` `[]` on both checks. What carries it instead is
`element.confidence == "untraced"` and `check.worst_confidence == "untraced"`,
both present in the projection and both pinned by
`test_the_unverified_bands_reach_the_viewer_as_untraced_not_as_zero_width`. A
badge keyed on `zero_width` alone will show **nothing** on this stack, which is
the silent failure the whole ruling was about.

## Round 2 — what `review/pitch_link_known_bands` sent back

REQUEST CHANGES on one blocker plus six should-fixes. All addressed on this
branch; the review report is at
`docs/sessions/reviews/REVIEW_20260915_pitch_link_known_bands.md` on the review
branch.

### B1 — the JS `[real]` tier is a DATA tier, and `pytest -q` structurally cannot see it

**This is the one to carry forward.** Two tests in `apps/viewer/tests.js` pinned
this stack's numbers and its zero-width flags:

```
FAIL  [real] the two zero-width bands are flagged        not equal: 0 !== 2
FAIL  [real] the folded numbers reach the page verbatim  missing: "-8.1939"
```

I never saw them, and a green `pytest -q` is not evidence they were fine:
`tests/test_viewer_js_suite.py` runs the JS runner **without** `--repo`, so from
a worktree the `[real]` tier reports itself skipped and pytest records a *skip*.
That is deliberate ("a red suite that means 'you are in a worktree' trains people
to ignore red suites") and it means **any stack-data change can break a viewer
test invisibly to the Python suite.** The handoff's *"do NOT touch the viewer
(`apps/`)"* fences the viewer's behaviour; these two are data pins on this exact
stack, and they belong to deliverable 3 the same way their Python twins did.

**If you change stack data, run the `[real]` tier yourself.** To do it from a
worktree without clobbering the shared projection:

```
mkdir <scratch>/data
mklink /J <scratch>\docs           <worktree>\docs
mklink /J <scratch>\data\inbox     C:\workspace\tolstack\data\inbox
mklink /J <scratch>\data\meshes    C:\workspace\tolstack\data\meshes
mklink /J <scratch>\data\runs      C:\workspace\tolstack\data\runs
mklink /J <scratch>\data\sessions  C:\workspace\tolstack\data\sessions
cp -r C:/workspace/tolstack/data/projections <scratch>/data/projections
```

then rebuild **all three** projections into `<scratch>/data` with
`--allow-older-tree` (safe — it is your own scratch root, not the shared one) and
run `node apps/viewer/run_tests.cjs --repo <scratch>`. Junctions for the
read-only dirs keep it cheap; a scratch root missing `docs/`, `meshes/` or
`data/inbox/` produces four unrelated failures that look like yours and are not.
**`build_viewer_crops.py` needs drawing-checker's interpreter**
(`C:/workspace/drawing-checker/venv-win/Scripts/python.exe`) — PyMuPDF is
deliberately absent from this repo's requirements.

Two traps inside the fix itself:

- **The DOM shim's selector matcher handles `tag`, `.class` and `tag.class` and
  nothing compound.** My first fix asserted
  `all(root, "tr.el-row.conf--untraced")`, which matched **zero** nodes and
  failed loudly — but the same shape in a *positive* assertion (`length === 0`)
  would have passed while checking nothing. Use one class per selector and
  filter with the suite's own `hasClass()`.
- **`VA.fmt` is `String(n)` — verbatim, no rounding, by design.** The page shows
  `-8.428`, not `-8.4280`. Documents write the trailing zero for column
  alignment; the viewer never does. The old pin happened to be `-8.1939`, which
  has no trailing zero, so the distinction had never come up here.

I repointed `[real] the zero-width flag reaches the page` at
`rotor_fastener_length` rather than asserting `0` on pitch_link under its own
name — the same move the Python twin made — and added
`[real] the pitch-link stack's two unverified bands render untraced, not
zero-width`, which is the assertion the ruling actually wants.

### The six should-fixes

| | what it was | what it is now |
|---|---|---|
| **S1** | both new notes pointed at *"the other 217755 elements in this file"*; after this change there are none | both name `joint.assembly_export` as the true referent, and say outright that no element cites 217755 any more |
| **S2** | the 4.7625 / 4.762 / 4.76 disagreement was explained in four places and indexed as a finding in none | worksheet **F9 `[drift]`**, with the three sources in a table and what each one *is* |
| **S3** | the guard's "not vacuous" lines asserted a pair was absent from a set it could never be in — renaming a `SHARED_BANDS` key to a typo left it green | asserts what the loop **matched**: every part in at least two distinct stacks. Verified both mutations the reviewer named now fail |
| **S4** | `TOLSTACK_ROOT_COMMIT` deleted with the run it was written against | restored, repointed at `20260730_133912`, which also predates root commit `e7bd996` |
| **S5** | SOP Step 4's bullet and the from-scratch table row still stated the rescinded ban, ~190 lines from the amendment | both carry a dated pointer; the amendment now names what it reaches |
| **S6** | `PROVENANCE.md` said "six … and three of those" for nine changed tests | nine, grouped by *what* changed in each |

**S3 is the one worth remembering.** "Assert the guard is not vacuous" is only
worth writing if the assertion can fail, and mine could not: `seen_divergences`
is fed exclusively from `KNOWN_BAND_DIVERGENCES`, so asking whether a
*non-divergent* pair is absent from it is asking whether a thing is missing from
a set it was never eligible for. The shape that works is to record what the loop
**actually matched** and assert against the curated constant — that fails on a
misspelled key, on a part leaving every stack, and on a file list that stopped
seeing a file. Same family as the `dead`-entry check I did get right on the
divergence list; I just did not apply it to the other side.

**S1 is the cheapest to have avoided**: I wrote *"the same export the other
217755 citations in this file name"* while editing away the last two such
citations, in the same commit. A cross-reference written from memory of the file
you are halfway through changing.

### One thing I did not do

`apps/viewer/tests.js` has **no `PROVENANCE.md` row** — it is not an imported
file — so changing it needed no amendment there, and
`test_this_branch_amended_the_row_of_every_imported_file_it_changed` agrees.

## Watch out for

- **The suite was already red at the branch point.**
  `test_every_byte_identity_claim_in_a_live_file_names_its_verification` fails on
  a strategy brief added by the 2026-09-15 triage commit, not on anything here.
  Filed as
  `ISSUE_20260915_byte_identity_claim_in_origin_posture_brief_names_no_verification.md`
  so the next session does not re-diagnose it. Everything else: **885 passed,
  1 skipped**.
- **Four documents outside the handoff's named scope stated the old numbers**,
  and all four are live claims rather than dated history, so I refreshed them:
  `docs/SOP_TOLERANCE_STACK.md` Step 5c's worked example (−8.1939 … −7.4859),
  both `docs/topologies/study_pitch_link_*.json` `guidance` strings (hand-kept
  copies of the stack's own — nothing pairs them, which is its own small hazard),
  and two `unblocks` rows in `docs/spec_library/intake_queue.json`. I did **not**
  touch `docs/prompts/REVIEW_AGENT.md`'s "7.4859 mm where 8.1939 mm binds": that
  is a dated account of the 2026-08-04 sighting, and those were the right numbers
  then. Same reasoning left the SOP's "understating by 0.708 mm" as written.
- **Do not pass a `C:\...` argument to a bash command.** `--data-root
  C:\workspace\tolstack\data` had its backslashes eaten by the shell and the
  builder created `workspacetolstackdata/` inside the worktree. Removed; use
  forward slashes.

## Friction with the SOP amendment wording

The handoff asked for amendments at Step 5b **and** Step 5c, and the split was
not obvious until I wrote them. What settled it: **5b is about the citation, 5c
is about the shape of the model.** 5b now says a value with a named source may be
applied, must carry its true confidence, must name the artifact it came from, and
must match every other stack using that part+feature. 5c rescinds "never create a
placeholder element" *only* where such a value exists, and reduces to a two-row
table — a number with a named source means **include the member**; no number
anywhere means **omit + `complete: false` + `excluded_terms`**.

`pitch_link_to_pitch_plate` is now the worked example of both rows at once, which
is the one genuinely nice thing about it: two members moved to the first shape on
the same day its checks kept `complete: false` for the link eye alone.

The wording I kept rewriting was the line about what is *not* rescinded. "Never
invent a value" is too blunt — it reads as forbidding the placeholder the
amendment just authorised. What it needed was a distinction the worksheet's
*Refused* table already made and nobody had named: a refused value with a
**named source** is a placeholder; a refused value with **no source at all** (a
"typical" nut height, a rule-of-thumb allowance, a number lifted from a different
link) stays out. Four of that table's six refusals still stand for exactly that
reason, and only two were overturned.
