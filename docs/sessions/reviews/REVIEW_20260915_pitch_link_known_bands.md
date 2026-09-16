---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_pitch_link_known_bands.md
reviewer: review agent (dispatch)
date: 2026-09-15
verdict: APPROVE
blockers: 0 (round 1: 1, fixed in round 2)
---

# Review — `pitch_link_known_bands`

> **Round 2, 2026-09-15 — APPROVE.** Everything below is round 1's report,
> unedited, and its verdict was REQUEST CHANGES. The tactical agent returned
> `83f8e6e` ("review round 2"), which fixes the blocker and all six should-fixes
> and all three nits. Round 2's verification is the last section of this file;
> read it for what actually shipped. The work is merged to `integration`.

Merged `handoff/pitch_link_known_bands` into `review/pitch_link_known_bands` at
`30bf6c7` to review and verify (round 2's merge is `83f8e6e`).

This is careful, honest work. Every number I re-derived matched, the provenance
argument is made in the right places and at the right strength, and the two
elements arrive `untraced` with their gaps still open rather than quietly
promoted. The blocker is not about the stack: it is a test tier the author did
not run, which `pytest -q` structurally cannot see.

## What I verified

**Arithmetic, re-derived from the merged tree** (not read from the worksheet):

| | value | matches |
|---|---|---|
| `bushing_214820` | 4.63 / 4.76 / 4.76, `lmc` 4.63, `mmc` 4.76, `plus_minus` null | ✓ |
| `washer_nas1149v0332` | 0.7112 / 0.8128 / 0.9144, `plus_minus` 0.1016 | ✓ |
| `clamped_stack_sourced` | nom 9.6328, WC 9.3012 … 9.8344, half 0.2666, `rss_center` 9.5678 | ✓ |
| `shank_out__11_sourced_only` | nom −7.8424, WC −8.4280 … −7.3868, RSS −8.2058 … −7.6090, `fail` | ✓ |
| `cotter_hole_clear_of_sourced_stack` | nom 11.8810, WC 11.0444 … 12.8476, RSS 11.4620 … 12.4300, `pass` | ✓ |
| binding eye requirement | 8.4280 = grip max 17.7292 − column min 9.3012 | ✓ |
| favourable end | 7.3868 = grip min 17.2212 − column max 9.8344 | ✓ |
| marginal window | 7.8424 … 8.4280 = 0.5856 mm (0.354 before) | ✓ |
| RSS offset | −0.065 on the path and both checks = the bushing's half-band | ✓ |

The three deltas the worksheet, the lesson and the SOP all quote reconcile
term-by-term: column min fell by 0.2341 = 0.1325 (bushing) + 0.1016 (washer);
column max rose by 0.0991 = 0.1016 (washer) − 0.0025 (bushing nominal); the
cotter budget's worst case fell by exactly that 0.0991 because the column is
subtracted there. `complete: false` and `excluded_terms` are byte-identical on
both checks, as the handoff required.

**Provenance audit.** Re-hashed every `established` export in the file — all
four MATCH (`215197` fixture, three on `NAS6403-NAS6420 Rev 4.pdf`). Re-hashed
the `217755` sha256 quoted in the washer's prose note: `c6381f20…4294d8`,
correct. Re-read all three surviving `export.runs` timestamps against
drawing-checker's own `run_meta.json` — all three match to the microsecond and
all three predate the session's first commit.

**Traced ratio, computed by me** (`tests/debug_report_tolerance_stacks.py
--ratio`, not copied from the worksheet):

> `pitch_link_to_pitch_plate`: **4 traced / 0 inferred / 2 untraced, out of 6
> element instances.** Repo-wide: **30 / 7 / 22 out of 59.** Seeded slice-1:
> **5 / 3 / 18 out of 26** (unmoved).

Both `untraced` values are on the ranked gap list (gaps 3 and 4), each naming
the document that closes it — the SOP's one condition on the word. This stack
carries no non-element values (no materials, no temperatures), so there is no
second ratio to demand.

**Mandatory checks.** 1 (citation per value) — see should-fix 1. 2 (signs) —
no term list, path or sign changed; only `guidance` prose moved. 2b — no
workbook re-derivation in this stack, N/A. 3 (LMC/MMC) — both new elements are
additive external sizes, `mmc → max`, correct; I confirmed there is still no
chamfer/relief/counterbore in the joint and that the only negative signs are
whole-element/whole-path subtractions; `fold()` untouched. 4 (RSS) — nominal,
worst case and RSS all present; no verdict reads RSS; the worksheet's "what RSS
does not claim" section was rewritten honestly, including retracting its own
"the re-centering artefact does not occur here". 5 (nominal in min/max) — holds
for all six; the bushing's nominal == max is disclosed in three places and
`plus_minus` is correctly `null`. 6 (quantised grip) — unchanged and still next
to the numbers. 7 (ratio) — above.

**Guard mutation.** The new cross-stack guard bites on real divergence:
setting `tan_link_to_pitch_plate:straight_bushing` to `(4.60, 4.76)` fails with
the stack, the element, what it folds and what it should. Reverting the
pitch-link bushing to `4.7625` also fails it. (See should-fix 3 for the case it
does *not* catch.)

**Suites.**

| tier | command | result |
|---|---|---|
| Python | `venv-win/Scripts/python.exe -m pytest -q` | **885 passed, 1 skipped, 1 failed** |
| JS fast tier | `node apps/viewer/run_tests.cjs` (no `--repo`) | green, `[real]` tier **skipped** |
| JS incl. `[real]` | `node apps/viewer/run_tests.cjs --repo <rebuilt root>` | **358/360 — 2 FAIL** |
| browser tier | `scripts/run_viewer_browser_tests.mjs` | not run; its stack block is `?mock=1` on `demo_joint`, unaffected by this data |

The one pytest failure,
`test_every_byte_identity_claim_in_a_live_file_names_its_verification`, is
**pre-existing on `integration`** — I reproduced it at `f629942` in a detached
worktree with none of this work present. The author diagnosed it correctly and
filed `ISSUE_20260915_byte_identity_claim_in_origin_posture_brief_names_no_verification.md`.
Not this handoff's.

**Projection.** `scripts/build_viewer_projection.py --data-root
C:/workspace/tolstack/data` is refused (exit 3): `handoff/viewer_study_verdicts_and_gaps`
@ `13fbf3f` (dirty) owns the shared projection and is not an ancestor of this
tree. I did **not** pass `--allow-older-tree` against the shared root — a live
sibling session is in that worktree. I verified content by building all three
projections into a scratch `--data-root` seeded from a copy of the real one, and
the result is what the DoD asked for: `pitch_link_to_pitch_plate  6 elements
(4T/0I/2U)`, `zero_width_count: 0`, `zero_width_inputs: []` on both checks,
`worst_confidence: "untraced"`, both elements `zero_width: false` with
`kind` `drawing` / `workbook`. **Whoever merges this still owes the shared
projection a rebuild** — nothing does it automatically.

## Blocker

### B1 — the viewer's `[real]` JS tier goes red, and `pytest -q` cannot see it

`apps/viewer/tests.js`:5815 and :5820, both in the `[real]` node-fs tier:

```
FAIL  [real] the two zero-width bands are flagged
      not equal: 0 !== 2
FAIL  [real] the folded numbers reach the page verbatim
      missing: "-8.1939" not in "…"
```

Measured against a **complete** scratch rebuild of all three projections from
the merged tree (`results.json`, `topologies.json`, `crops.json` + PNGs), so
neither failure is an artifact of a partial scratch root: 358/360, and the two
are these. I separately confirmed the other four failures I saw along the way
were mine (a scratch root missing `docs/`, `meshes/`, `data/inbox/`) or the
sibling worktree's (`[real] the topology fixture's shapes still match the
builder's`, which goes green once `topologies.json` is rebuilt from this tree).

Why it was missed, and why it is not a nit: `tests/test_viewer_js_suite.py`
runs the JS runner **without** `--repo`, so from a worktree the `[real]` tier
reports itself skipped and pytest records a `skip`, not a failure — by design
("a red suite that means 'you are in a worktree' trains people to ignore red
suites"). A green `pytest -q` therefore cannot observe a stack-data change
breaking a viewer test. The review overlay already requires the reviewer to
re-run it with `--repo`; nothing requires the author to.

This is squarely deliverable 3 ("the pinning tests move with the data"). The
handoff's "do NOT touch the viewer (`apps/`)" fences the viewer's *behaviour*;
these two are data pins on this exact stack, and the same author correctly moved
their Python twins — including repointing `test_checks_carry_their_zero_width_inputs`
at `rotor_fastener_length` rather than deleting it.

**Fix shape**, mirroring what was already done on the Python side:

* `[real] the two zero-width bands are flagged` — repoint at
  `rotor_fastener_length` (still 2 zero-width elements: `washer_ms21299c3`,
  `washer_nas1149v0332_tt`) rather than asserting `0` on pitch_link, which would
  make the test vacuous under its own name. Consider adding the positive
  assertion the ruling actually cares about: the two pitch-link rows render as
  `conf--untraced`.
* `[real] the folded numbers reach the page verbatim` — `-8.1939` → `-8.4280`.

I did not fix either inline: choosing which stack a renamed guard should point
at is a decision about what the guard asserts, which is past the inline-fix
boundary.

## Should-fix

### S1 — both new notes assert a citation trail that no longer exists

`stack_pitch_link_to_pitch_plate.json`, `bushing_214820.source_ref.note`:

> *"…inferred from the same parts-list row cited by **the other 217755 elements
> in this file**…"*

and `washer_nas1149v0332.source_ref.note`:

> *"…on the [PRELIM 2026-AUG-3] export sha256 c6381f20…, **the same export the
> other 217755 citations in this file name**…"*

After this commit **no element in the file cites 217755.** These two were the
only ones; the remaining four cite `214820-002`, `215197` and
`NAS6403-NAS6420 Rev 4.pdf`. A reader following either note looks for a sibling
element that is not there. `joint.assembly_export` still names 217755, which is
the true referent — say that instead. (The sha256 itself is correct; I re-hashed
it.)

Same note, smaller: *"Presence and the **4.7625** nominal remain inferred"* sits
in an element whose stored nominal is 4.76. It is describing source (1), but it
reads as a claim about the element.

### S2 — the nominal disagreement is prose everywhere and a numbered finding nowhere

Three documents disagree about one length: the 217755 parts list says `.1875"
LONG` (4.7625), the 260729 workbook's E7 is the hand-typed literal 4.762, and
the drawing prints 4.76. The author reconciled it honestly and explained it in
the element note, the worksheet's *Nominal inside its own min/max* section, the
`hardware_entries.json` gap and the lesson — but did not add an `F9` to the
worksheet's **Findings** index.

That index is where this repo records exactly this shape: `F3` is nomenclature
drifting between two exports, `F7` is the as-drawn part disagreeing with the
model, and `tan_link`'s own 4.762 (0.002 mm above its own MMC) is a recorded
finding for the same reason. The overlay's rule is verbatim *"mismatches against
the drawings are recorded as findings, not reconciled away."* One `### F9 — …
**[drift]**` entry, quoting all three sources, and this is closed.

### S3 — the cross-stack guard's "not vacuous" assertions cannot fail

`tests/test_tolerance_stack.py`, end of
`test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it`:

```python
# Not vacuous: the pairing has to be seeing the stacks that matter.
assert ("pitch_link_to_pitch_plate", "bushing_214820") not in seen_divergences
assert ("tan_link_to_pitch_plate", "straight_bushing") not in seen_divergences
```

`seen_divergences` is only ever added to from `KNOWN_BAND_DIVERGENCES`, which
holds one row (`rotor_fastener_length`). So both assertions are true by
construction whether or not the loop ever visited those elements — they check
that a pair is absent from a set it could never be in.

Measured: renaming the `SHARED_BANDS` key `("214820-002", …)` to
`("214820-002-TYPO", …)` leaves the test **green**. The guard stops checking the
bushing entirely — the part this whole handoff exists for — and says nothing.
The `NAS1149V0332` half survives that mutation only by accident, because the
`dead`-divergence check happens to have a live row for it.

Fix: record what the loop actually matched and assert against `SHARED_BANDS`
itself — e.g. collect `matched[part].add(stack.id)` inside the `hardware_ref ==
part` branch and assert every key of `SHARED_BANDS` was matched in at least two
distinct stacks. That fails on the typo, on a part leaving every stack, and on a
stacks-dir glob that stopped seeing a file.

Second, smaller point on the same constant: the `_feature` half of the
`SHARED_BANDS` key is never used — matching is on `hardware_ref` alone. No stack
today has two elements sharing a `hardware_ref` for different features, but the
day one does (a bushing OD beside its length), the guard will demand the length
band of both. Either match on the feature or drop it from the key and say in the
comment that `hardware_ref` is currently one feature per part.

### S4 — `TOLSTACK_ROOT_COMMIT` was dropped while its claim still had a subject

`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit` lost
`assert cited["20260803_145243"] < TOLSTACK_ROOT_COMMIT` along with the constant.
Losing the *217755* subject is unavoidable and well documented, and the filed
chore is the right call. But the strongest form of the read-only invariant — *a
cited run predates this repo's existence, so this repo cannot have produced it*
— still holds for a surviving run: `20260730_133912` is
`2026-07-30T20:39:33.291499Z`, four days before root commit `e7bd996`
(`2026-08-03T23:05:08Z`). Keep the constant and repoint the assertion at that
run rather than deleting the claim.

### S5 — SOP Step 4's workbook-ban bullet is now wrong and was not amended

`docs/SOP_TOLERANCE_STACK.md`:716 (Step 4, *hardware entries*):

> *"Read the entry's `values_source` before you reuse a band: a `kind:
> "workbook"` one is **forbidden** in a from-scratch stack exactly as if you had
> read it out of the xlsx yourself (Step 5b)."*

The Step 5b amendment rescinds exactly this, and `washer_nas1149v0332` is now
the counter-example sitting in the repo. Step 4 is where an author reads *before*
choosing a band, and it is ~190 lines above the amendment with no pointer to it.
A one-line dated note ("amended 2026-09-15 — see Step 5b") closes it.

The from-scratch table at :892–893 is a lesser case of the same: its last clause
still says *"treat a workbook-derived one as forbidden here exactly as if you had
read the xlsx yourself"*, and the amendment directly below re-affirms
*"everything else in the table above still is"* the test of a from-scratch
stack. The laundering point in that row survives; the analogy no longer does.

### S6 — `PROVENANCE.md`'s test-file row undercounts what changed

The new `tests/test_tolerance_stack.py` row says **"one test added, none
removed; six existing tests' pinned numbers moved and three of those changed
what they assert."** Nine existing tests in that file were modified:
`test_pitch_link_clamped_stack_excludes_the_unsourced_link_eye`,
`…shank_out_deficit…`, `…the_binding_link_eye_requirement…`,
`test_pitch_link_cotter_hole_budget`,
`test_the_seeded_traced_ratio_is_the_number_every_document_quotes`,
`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`,
`test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`, plus
the two renamed. Under no reading does "six … and three of those" reconcile with
the three it then names, which are not in the numeric-pin group. The other
counts in that row are right, and the `hardware_entries.json` row is right.

## Nits

* `hardware_entries.json`, `NAS1149V0332` gap 3: *"All three stacks that use
  this part now fold the same band except `rotor_fastener_length`"* — three
  stacks use it and one of the three is the exception, so this reads as
  "all three except one". Two of the three.
* `docs/SOP_TOLERANCE_STACK.md`, Step 5b amendment: the test name is broken
  across a line inside a backtick span
  (`…in_every_stack_` / `that_uses_it`), so the rendered symbol carries a space
  and does not resolve by grep.
* Quick-reference trap 19 (*"Sourced nominal, unsourced band ⇒ a zero-width
  band"*) is still literally true under the amendment's definition of "sourced",
  but a reader of the traps list alone cannot tell which side of the new line a
  workbook cell falls on. Worth a four-word pointer.

## Note for the next reviewer

The `[real]` JS tier is a **data** tier, not only a rendering tier, and this is
the first time a stack-data handoff has broken it. I added a **Recurring bugs**
entry to `docs/prompts/REVIEW_AGENT.md` for it.

`review/pitch_link_known_bands` holds the merge of
`handoff/pitch_link_known_bands` at `30bf6c7` plus this report; `integration` is
untouched and the shared projection at `C:\workspace\tolstack\data` was not
rebuilt (the gate refused, correctly, to a live sibling worktree). On the
re-review, run **all three**: `pytest -q`, `node apps/viewer/run_tests.cjs
--repo C:/workspace/tolstack`, and the projection rebuild.

## Verdict

**REQUEST CHANGES** — B1. The six should-fixes are the handoff's while it is
open; none needs an issue unless the re-review approves without them.

---

# Round 2 — `83f8e6e`, verified 2026-09-15

Merged into `review/pitch_link_known_bands`. **APPROVE.**

## The blocker is closed, and closed the right way

| tier | result |
|---|---|
| Python, review merge | **885 passed, 1 skipped, 1 failed** (the pre-existing strategy-brief byte-identity claim) |
| Python, tactical worktree at `83f8e6e` | **885 passed, 1 skipped, 1 failed** — same |
| JS incl. `[real]`, full scratch rebuild of all three projections | **361/361 passed** |

361, not 360: the author did not simply move a pin. `[real] the two zero-width
bands are flagged` was **repointed** at `rotor_fastener_length` (which still has
two, `washer_ms21299c3` and `washer_nas1149v0332_tt`) rather than flipped to
assert `0` under a name promising 2 — the same move its Python twin made — and a
**new** test was added for what Jeff's ruling is actually about: `[real] the
pitch-link stack's two unverified bands render untraced, not zero-width`, which
asserts `zero_width` is empty here *and* that the two rows carry
`conf--untraced` *and* that they are the right two elements.

**I mutation-tested that new test rather than accepting it on green.** Breaking
the one production line that carries the signal — `VA.confidenceClass` in
`apps/viewer/viewer.js:80`, stubbed to return `"conf--unknown"` — turns it red
along with five siblings. It observes the thing it certifies, not a proxy.

The `-8.1939` → `-8.428` fix is right for a reason worth recording: `VA.fmt` is
`String(n)`, so the page shows `-8.428` and never the document's `-8.4280`. The
author found that by hitting it, and wrote it into the lesson.

## The six should-fixes and three nits

All closed. Re-verified individually:

* **S1** — both notes now name `joint.assembly_export` as the referent and state
  outright that no element cites 217755 any more; the bushing's note no longer
  attributes "the 4.7625 nominal" to an element storing 4.76.
* **S2** — worksheet **F9 `[drift]`**, a three-row table of what each source
  prints, what each one *is* (a parts-list nomenclature string vs. a workbook
  rounding vs. a part drawing dimensioning its own feature), and what stays
  unchanged and why. I confirmed its supporting claim: `tan_link`'s
  `straight_bushing` really is nominal 4.762 against max 4.76, i.e. 0.002 mm
  above its own MMC. The `[drift]` preamble was updated to say there are now two.
* **S3** — the guard now records `matched[part].add(stack.id)` inside the
  matching branch and asserts every `SHARED_BANDS` part was seen in ≥2 distinct
  stacks. **Re-ran my mutation:** the `"214820-002"` → `"214820-002-TYPO"` key
  typo that left round 1 **green** now fails with
  `0 = len(set())`. The `(part, feature)` key became a plain `part` key plus a
  read-only `FEATURE_HINT`, with the one-feature-per-entry assumption written
  down instead of implied — the better of the two fixes I suggested.
* **S4** — `TOLSTACK_ROOT_COMMIT` restored and repointed at `20260730_133912`.
  Not vacuous: the run set is pinned exactly one line above, so the claim cannot
  silently lose its subject again.
* **S5** — SOP Step 4's bullet and the from-scratch table's last clause each
  carry a dated pointer, and the Step 5b amendment gained a paragraph naming
  both places it reaches. Trap 19 rewritten as "nominal with **no band
  anywhere**", with "a workbook cell is a named source; *the standard probably
  says* is not" — which is the distinction the whole ruling turns on.
* **S6** — `PROVENANCE.md` now says "nine existing tests changed", grouped by
  what changed in each. Correct: four numeric-pin-only, one pin plus a new
  assertion, three changed what they assert, one lost part of its subject.
* **Nits** — "all three … except" → "three stacks use this part; TWO of them";
  the SOP test name is no longer broken across a backtick span; trap 19 covered
  under S5.

## Fixed inline (one sentence)

The same `PROVENANCE.md` row that S6 corrected then stated a suite result that
is wrong: *"884 passed / 1 skipped … plus 2 failed, both in
`tests/test_provenance.py` … one is this row."* I re-ran the suite twice —
in the tactical worktree at `83f8e6e` and at the review merge — and measured
**885 passed / 1 skipped / 1 failed** both times, with the single failure being
the strategy brief. There is no second `test_provenance.py` failure and this row
is not one. (The `**146 tests** in this file` half was right.) Rewritten with a
dated parenthetical saying what it used to read. This is the canonical
re-derive-every-count check and its blessed fix shape; no behaviour changed and
no test was needed.

Its own claim about `apps/viewer/tests.js` needing no `PROVENANCE.md` row also
checks out: the file has no row (it is not an imported file), and
`test_this_branch_amended_the_row_of_every_imported_file_it_changed` is green.

## Still owed by whoever comes next

**The shared projection at `C:\workspace\tolstack\data` is not rebuilt.**
`build_viewer_projection.py` still exits 3 — `handoff/viewer_study_verdicts_and_gaps`
@ `13fbf3f` (dirty) owns it and is not an ancestor of this tree. I did not pass
`--allow-older-tree` against the shared root in either round; a live sibling
session is in that worktree and the gate is doing exactly its job. All
verification here was done against a scratch `--data-root` seeded from a copy of
the real one, which is sound because the projections are a pure function of the
stacks and topologies dirs. The next session to own that directory should
rebuild all three.

## Verdict

**APPROVE.** Merged to `integration`.

---

# Round 3 — the integration merge, and the semantic conflict it produced

`integration` moved `f629942` → `9380a33` while this review was running: five
handoffs landed, including **`viewer_study_verdicts_and_gaps`** — the one whose
deliverable is the loud badging this handoff's data was meant to feed. Merged
`integration` into `review/pitch_link_known_bands` (`afcbbb4`). **Git reported
no conflict.** The suites did.

## Both sides, and why the resolution chose what it chose

`git merge` was clean because the two branches never touched the same lines.
The conflict is semantic, and it is the carve-out case exactly: `viewer_study_
verdicts_and_gaps` was cut from an `integration` that had `±0` on the pitch-link
bushing and washer, so it wrote two `[real]` tests against that state, and
`handoff/pitch_link_known_bands` was cut from an `integration` that did not
contain those tests. **Neither worktree can see the failure**, and the sibling
handoff is already in `completed/`. After the merge:

```
FAIL  [real] the pitch-link studies render their verdicts and their margins …
      missing: "margin -8.1939 mm at worst case"
FAIL  [real] the shank-out study warns that its spread is a lower bound, and
      names the rows that make it one          not equal: 0 !== 1
370/372 passed
```

Resolution, in both cases **the handoff-under-review's side for the data and
`integration`'s side for the surface it renders on** — the sibling's renderer,
badges, warning text and card structure are untouched; only its two pins moved:

1. **The margin pins were stale numbers, mechanically.** `apps/viewer/tests.js`
   pinned `margin -8.1939 mm` and `margin +11.0444`'s predecessor
   `margin +11.1435 mm`. The page now correctly renders `-8.428` and
   `+11.0444` — the same numbers already pinned by five Python tests and by
   `[real] the folded numbers reach the page verbatim`, all of which I verified
   independently. Updated both, with the `VA.fmt`-is-`String(n)` trap noted in
   place (the page prints `-8.428`, never the worksheet's aligned `-8.4280`).
2. **The lower-bound warning had lost its subject, not its point.** The
   sibling's `.tvwarn--lower-bound` fires off `edge.zero_width`; pitch_link has
   no zero-width row any more, so the warning correctly does not render and
   `eq(warn.length, 1)` could no longer pass on that stack. **Repointed at
   `rotor_fastener_length` / `rotor_fastener_grip_u2h`** — whose `selection`
   names both washers, and whose MS21299 and NAS1149 bands are absent from every
   document — rather than deleted, and rather than flipped to `eq(…, 0)` under a
   name that promises the warning appears. This is the third time in this one
   handoff that a zero-width pin needed this move, and it is the same
   destination the other two chose.

   I also **added its counterpart**: `[real] the pitch-link shank-out study no
   longer claims a lower bound, because nothing in its chain is zero-width now`,
   which asserts `.tvwarn--lower-bound` is absent there *and* that the row is
   still qualified — as `unverified`. Without it, a regression restoring `±0` on
   those two rows would be invisible to the repointed test, which is the hole
   that repointing a pin usually leaves.

## I watched all three edits fail

Not accepted on green:

| mutation | expected to fire | fired |
|---|---|---|
| `VA.zeroWidthWarning` returns `null` unconditionally | the repointed rotor test | ✓ `372/373`, that test alone |
| `attention.noTolerance` collects **every** edge | the new pitch-link counterpart | ✓ `372/373`, that test alone |
| the margin pins | already observed failing, pre-fix | ✓ (that is how they were found) |

Each mutation reverted; `apps/viewer/topology.js` is byte-identical to
`integration`'s.

## Post-merge results

| tier | result |
|---|---|
| Python | **887 passed, 1 skipped, 1 failed** — the same pre-existing strategy-brief byte-identity claim, which I re-confirmed red on `integration` @ `9380a33` in a detached worktree |
| JS incl. `[real]`, full scratch rebuild of all three projections | **373/373 passed** |

`887`, up from `885`: `integration`'s own additions. `373`, up from `361`: the
sibling's new `[real]` studies block plus my added counterpart.

## Scope of the carve-out, stated

The only files I touched in resolving this are `apps/viewer/tests.js` (two pins,
one repointed test, one added counterpart) and this report. I did **not** use
being in that file as cover for anything else — I read six other issues the
sibling's review filed against its own work and left every one of them alone.

## Verdict

**APPROVE**, merged to `integration`. The shared projection at
`C:\workspace\tolstack\data` is still owed a rebuild by whoever next owns that
directory — the gate still (correctly) refuses it from here.
