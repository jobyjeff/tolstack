# LESSONS 2026-09-16 — citation_identity_correctness

Three deliverables: a dedup key narrower than the thing it identified, a
citation pointing at a superseded part, and a band that diverged from its
siblings. What follows is only what the diff does not already say.

---

## 1. The dedup diagnostic, in the workspace-wide form

dispatch is tracking this class across three repos (four sightings). Stated in
those terms:

| | |
|---|---|
| **The key** | `str(row["part_number"])`, in a dict comprehension over a drawing-checker run's `parts_list` |
| **The thing identified** | a parts-list **row**, which is a `(part_number, find_no)` pair |
| **How much narrower** | by exactly `find_no` |
| **The two distinct real inputs that collided** | in `20260819_110144_.../217755_A_balloons.json`, array index 12 = find **13**, `NAS1149V0332H`, qty 15; array index 31 = find **32**, same part number, qty 9. The only duplicated part number in a 103-row file. |
| **Which one the writer deleted** | **find 13.** The comprehension inserts 12 first and 31 second, so the second insertion wins and `by_number["NAS1149V0332H"]` was find 32. |

**The part worth carrying to the other three sightings: the surviving answer
was correct.** All four live citations resolved right, every test was green,
every crop framed the right balloon. The defect was invisible because the
export happened to write the rows in the order that made the last-writer-wins
rule agree with the citation. Nothing in the code, the data or the suite
depended on that order, and nothing recorded that it mattered.

What made it *worse* than "a different row" is worth stating too, because it is
what turns a silent collision into a confident lie. Find 13's only page-8
balloon is in `SECTION R-R`; the citation names `SECTION T-T`. Under the losing
order, `balloon_answer` finds no balloon in the cited view, falls back to
`chosen = in_view or on_sheet`, and the crop is framed on **another view of the
cited sheet** while the companion image boxes the find-13 row's part number and
the highlight reads *"found on the page: balloon 13"* — a `verified_match`
claim, in the viewer, under the cited element's own name.

### Demonstrating it red

The assertion that reddens is *not* "the right row wins" — that passed on the
old code by luck. It is **"reversing the array does not change the answer"**:

```
FAILED test_the_parts_list_row_answer_does_not_depend_on_the_export_row_order
E       assert forward == reversed_
E         {'qty_raw': '9'} != {'qty_raw': '15'}
E         {'nomenclature': '... .032"'} != {'nomenclature': '... .032" 1.000" LONG'}
```
(4 failed on the pre-fix `build_viewer_crops.py`, 77 passed after — the module
was 73/73 before the four new guards.)

If you are writing the guard for one of the other three sightings: **assert the
invariance, not the answer.** An order-dependent key passes an answer assertion
whenever the order is lucky, which is most of the time, which is why these
survive.

### What I used as the citation-side find number, and why

**The callout prose**, via a module-level `CALLOUT_FIND_NO_RE =
re.compile(r"\bfind\s+(\d+)\b", re.IGNORECASE)`. All four live parts-list
citations state it: `"… (find 34)"`, `"… (find 32, qty 9 across the assembly;
balloon at SECTION T-T)"`, `"… (find 60, qty AR; …)"`, `"… (find 29, qty 1)"`.

The handoff suggested `hardware_entries.json`'s `assembly_status.find_no` as a
cleaner input, and it would be — but **it is not reachable from this call site
without widening the fence.** `build_viewer_crops.py` never reads
`hardware_entries.json`; getting it to `parts_list_row_for` means a new
parameter on that function, on `balloon_answer`, and on the caller at line
~1571. The handoff scoped me to `parts_list_row_for` *and only that function*
because `viewer_unwitnessed_surface_guards` owns the rest of the file, so
plumbing a parameter through two more functions would have collided. The regex
is the version that fits inside the fence. If the hardware register later
becomes reachable, it is the better input and this constant is the seam.

### One design choice not in the handoff

I narrow by find number **only when the part number matches more than one row**
(`if len(matched) > 1 and cited_find_no is not None`), which is exactly what
`parts_list_row_rect` already does with the printed `FIND` column. Narrowing
unconditionally would mean a callout whose stated find number disagreed with
the single row present loses its crop — a regression in the no-collision case,
which is every case but one. Measured: all four live citations resolve to 60,
32, 34, 29 on **both** 217755 exports and under **both** row orders.

---

## 2. What the released pitch plate actually says

### The handoff's table row 3 did not survive measurement

The handoff said the third callout "has moved sheet — it prints on **sheet 1**"
and mapped it to `vpa_output_to_pitch_plate::pitch_flange_thickness`. Measured
on both PDFs, that is not what happened:

| | 215197 A.1 | 215735-A |
|---|---|---|
| `3X 4.06 ±0.08` | sh2 B4/B5, SECTION A-A | **same** |
| `5X 4.06 ±0.10` | sh2 D10, SECTION A-A | **same** |
| `4.06 ±0.10` | sh1 D5 | sh1 D5 |
| `4.06 ±0.10` | — (215197 prints `8.80 ±0.10` here) | sh1 **D6** — new |

The VPA element does not cite the sheet-1 callout. Its `source_ref` says
`sheet: 2, zone: "D10", callout: "5X 4.06 ±0.10"` — the same address the
pitch-link element cites, which is why its note argues at length about which
feature it *means*. The handoff's own step 3 says the same thing ("the
ambiguity is between sheet 2's 5X group and sheet 1's single one"), so the
table row and the prose disagree and the prose is right.

**I left the VPA citation on sheet 2 zone D10.** Re-pointing a citation at a
different printed callout is a feature-identity decision, not a currency one,
and nothing on the released drawing decides it. What I did instead: record that
the field got **wider**, not narrower — three candidates now, not two, because
a feature that was `8.80 ±0.10` on the PRELIM is `4.06 ±0.10` on the released
plate, printed immediately beside the sheet-1 callout the joint's qty-1 already
argued for. That element is `inferred` and stays `inferred`; it is now inferred
against a worse field.

### Two other measured differences nobody had written down

- **Both position frames lost their diameter symbol.** 215197 A.1 prints
  `⌖⌀0.2 A B C` on the 3X and 5X groups; 215735-A prints `⌖0.2 A B C`.
  Verified on the **rendered frames** of both exports, not only the text layer —
  which matters, because the text layer was the only reason I looked (the
  tabular-export test asserts `⌖⌀0.2` survives a CSV round trip, and that
  character vanished from the pitch-link stack when I rewrote the note). A
  test asserting a *character* turned out to be a tripwire on a GD&T change.
- **Zone B4 vs B5.** The `3X 4.06 ±0.08` callout **straddles the B4/B5
  boundary** on both exports: `4.06` prints in B5, `±0.08` in B4. The citation
  says B4 and `callout_text_in_zone` comes back true because the builder
  matches the `±0.08` needle. Both cells are defensible; I re-read it on
  215735-A rather than assuming, confirmed B4 still corroborates, and kept it.
  If you re-read this address later and get B5, you have not found a defect.

### How I resolved the export-run invariant, and what it claims now

Re-citing emptied the pitch-link stack's element-level run set. Its three
215197 runs left; the two 215735-A runs that replaced them are 2026-08-14 and
2026-08-19, which **postdate** `d6829f2` (2026-08-04) and `e7bd996`
(2026-08-03). Three assertions of
`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit` went
red at once.

**What it claims now:** every cited run is cleared, and by a *named* argument —
by timestamp where the timestamp settles it, otherwise by an entry in
`_RUNS_CLEARED_WITHOUT_A_TIMESTAMP` with the reason written out. It still fails
on (a) an unlisted postdating run, (b) a listed run nobody cites, (c) any
change to the cited set. The reason the two exempt runs carry is
drawing-checker's own `"purpose": "eager"` in their `run_meta.json` plus
tolstack having no write path into that repo — **and the test says, in as many
words, that this is weaker than arithmetic on a commit date and has no
enforcement behind it** (`ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`).

**What it lost, and where the loss went.** The strongest form — *a cited run
existed before this repo did, so this repo cannot have produced it* — is gone
from this stack for good. It is **not** gone from the repo: the tan-link and
VPA stacks each cite four 2026-JUL runs that predate `e7bd996`. So I added
`test_the_strongest_read_only_claim_still_has_a_subject`, which checks it
across every stack and fails when the last pre-root citation goes. Had I not
looked, that form would have died with the one test that happened to hold it —
which is the general lesson: **before narrowing a guard, check whether its
subject exists elsewhere.** It usually does, and moving it costs one test.

**Why I did not rename the test.** Its name now states something false, which
is normally this repo's cue to rename. I did not, because six live documents
name it and one of them is
`docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md` — **a staged
handoff that has not been worked yet** and that also edits
`tests/test_tolerance_stack.py`. Renaming a test out from under a staged
handoff's instructions is the more expensive mistake. Filed as
`ISSUE_20260916_the_readonly_invariant_test_name_outlived_its_claim.md`, with
the sequencing note that it should be done *after* that handoff lands.

---

## 3. The washer band, and the crop it cost

The band itself was mechanical (copy the pitch-link sibling's element; every
downstream number recomputed with `tests/debug_report_tolerance_stacks.py`,
never by hand). Two things are worth the next agent's time.

### Applying the band deletes the element's viewer crop, and the handoff did not say so

`kind: "workbook"` is in `NO_DOCUMENT_KINDS`, so
`crops/rotor_fastener_length__washer_nas1149v0332_tt.png` is no longer emitted.
That crop was one of only **four** live balloon crops in the repo — and the one
deliverable 1 spent its whole budget making frame-correct. Deliverable 5 said
"the four live balloon crops keep their find numbers"; after deliverable 3 there
are three (60, 34, 29), and 32 is gone. Not a contradiction anyone got wrong —
the two deliverables were scoped separately — but if you are reconciling the
handoff against the result, that is why the counts differ.

The underlying shape is general and will recur: **an element whose nominal and
band come from two different artifacts can cite only one of them, and the loser
becomes prose.** `pitch_link_to_pitch_plate::washer_nas1149v0332` made the same
trade on 2026-09-15. Filed as
`ISSUE_20260916_an_element_whose_band_and_nominal_come_from_two_artifacts_can_cite_only_one.md`
(`audience: strategy`) rather than solved here.

### The anti-laundering guard: extended, not left at one stack

`test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry` was
hard-coded to `pitch_link`. `rotor_fastener_length` is now the second
from-scratch stack folding a workbook-derived band, so I parametrized it over
`WORKBOOK_BACKED_BANDS` (curated, outside the files being checked, the way
`SHARED_BANDS` is) with a per-stack `WORKBOOK_BACKED_CITATIONS` pinning that
each such element names an artifact that actually prints its band. The
non-vacuity half is kept and is now per-stack. A rule with one instance that
grows a second and is checked on neither is how this class survives.

`KNOWN_BAND_DIVERGENCES` is now **empty**, and the comment in it says that is
the statement rather than a leftover. Every part in `SHARED_BANDS` folds one
band in every stack that uses it, with no exception recorded anywhere — first
time that has been true.

---

## 4. The actuator ran, and it could not build my tree

```
powershell -ExecutionPolicy Bypass -File C:\workspace\tolstack\scripts\rebuild_projections.ps1
```

Ran once, from the main checkout, no `--allow-older-tree`. All three stamps
agree:

| projection | branch | sha12 | dirty | behind_trunk |
|---|---|---|---|---|
| `topologies.json` | master | `70241cece1ce` | False | 0 |
| `results.json` | master | `70241cece1ce` | False | 0 |
| `crops.json` | master | `70241cece1ce` | False | 0 |

(Was `master @ 9c25aff9fe55`, built 08:55:25Z; the gate allowed the overwrite
because that commit is an ancestor of `70241ce`.)

**But read those stamps.** `70241ce` is `master`. It does **not** contain this
handoff's three commits. Deliverable 4's premise — *"deliverables 2 and 3 both
change projected values, so this repo's actuator has to run"* — cannot be
satisfied by this actuator from a worktree, and this is by design, not by
accident:

- `rebuild_projections.ps1`'s `-RepoRoot` sets the interpreter path **and** the
  scripts directory together, so pointing it at the main checkout necessarily
  builds the main checkout's `docs/`.
- Its preflight deliberately fails from a worktree ("venv-win and data/ exist
  only in the main checkout"), and its own docstring says that is correct.

So the shared projection now holds master's values, not mine. My values reach
it when the operator batch-merges and someone rebuilds. **Do not read this as a
refused rebuild** — nothing was refused; the gate printed "overwriting it with
a newer build" three times.

Note the tension with `scripts/projection_provenance.py`'s own model, which
reasons about worktree builds explicitly ("*a review worktree holds master +
the handoff, which is the newest tree in existence, so its build can never be
an older one clobbering a newer*"). The gate is built for worktree rebuilds;
the actuator has no seam for one. Not filed as an issue because it is a
deliberate choice in a script written 2026-09-08 with its reasoning in
`LESSONS_20260908_projections_rebuild_script.md` — but a handoff that asks for
"run the actuator so your values land" is asking for something the actuator
does not do, and the next such handoff should say "after the merge" instead.

**Verification I did instead**, since the definition of done asks for the
rebuilt crop entries: built crops from *this* worktree into the worktree's own
throwaway `data/` (gitignored, deleted at cleanup — **not** the shared
projection, so no parallel handoff was clobbered). Stamp:
`handoff/citation_identity_correctness @ 5ce16f3a1ed2`. All three re-cited
elements:

| entry | drawing_no | rev | located_by | callout_text_in_zone | sha256_verified |
|---|---|---|---|---|---|
| `tan_link_to_pitch_plate::pitch_plate_flange` | 215735 | A | `zone_cell` (B4, needle `±0.08`) | true | true |
| `pitch_link_to_pitch_plate::pitch_plate_flange` | 215735 | A | `zone_cell` (D10, needle `±0.10`) | true | true |
| `vpa_output_to_pitch_plate::pitch_flange_thickness` | 215735 | A | `zone_cell` (D10, needle `±0.10`) | true | true |

**None degraded to `sheet_full`.** The rendered
`tan_link_to_pitch_plate__pitch_plate_flange.png` was opened and shows
`3X 4.06 ±0.08` with both its frames.

If you repeat that: create `data/projections/viewer/crops/` first — PyMuPDF's
`pix.save()` does not create the directory and fails with a bare
`FzErrorSystem: code=2` that reads like a permissions problem. And do **not**
point `--data-root` deep inside the session scratchpad; that path plus a crop
filename exceeds `MAX_PATH` and produces the same error for a different reason.

`[real]`-tier JS: `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
→ **407/407 passed** after the actuator run. Nothing to report for the operator
to sequence. (`tests/test_viewer_js_suite.py` still skips in a worktree, by
design — its node-fs tier has no projection to read.)

---

## 5. Suite arithmetic, and a pre-existing red

`venv-win/Scripts/python.exe -m pytest -q` from the worktree:
**1159 passed, 1 failed, 1 skipped**.

Reconciling against the handoff's baseline of 1155 passed / 0 failed / 0
skipped (measured on `master`, in the main checkout):

| | |
|---|---|
| baseline collected | 1155 |
| + 4 | the parts-list-row-identity guards in `tests/test_viewer_crops.py` (73 → 77) |
| + 1 | `test_the_strongest_read_only_claim_still_has_a_subject` |
| + 1 | the anti-laundering guard, parametrized 1 → 2 |
| **= 1161** | = 1159 passed + 1 failed + 1 skipped |

(One test was **renamed**, not added:
`test_rotor_fastener_has_no_workbook_source_and_declares_its_zero_width_bands`
→ `test_rotor_fastener_carries_its_one_unverified_band_loudly_and_not_as_traced`.)

The **skip** is worktree-only and expected (`test_viewer_js_suite.py`, above).

The **failure is pre-existing on `integration` and is not mine**:

```
tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
  docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
    says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

The brief's sentence is *"for a reason **the other three do not have**"*, about
items 1–3 of the brief. The `_COUNT_CLAIMS` pattern `other\s+({_NUM})\s+do\s+not`
carries no anchor to entries or to the library, unlike every neighbouring claim
in that list. Filed as
`ISSUE_20260916_hardware_count_guard_matches_other_three_do_not_in_unrelated_prose.md`
(`priority: high` — it is red on the branch every worktree is cut from). It
touches no file this handoff owns, so "file, don't fix" applied.

The handoff's baseline was measured on `master` at the 2026-09-16 batch merge;
this failure arrived on `integration` afterwards, which is why the handoff did
not warn about it.

---

## 6. Small things that cost time

- **`data/inbox/drawings/PROVENANCE.md` is TRACKED**, even though everything
  around it in `data/` is gitignored — the file says so itself ("this file and
  `.gitkeep` are the tracked skeleton"). The handoff told me to edit it at the
  main checkout by absolute path; dispatch's `main_checkout_edit_guard` blocked
  that, correctly. Edit it in the worktree. Same trap for
  `data/inbox/specs/README.md` and `data/projections/.gitkeep`, which I deleted
  by accident while cleaning up a throwaway `data/` copy and had to
  `git checkout --` back. **Before `rm -rf` anything under `data/`, run
  `git ls-files <path>`.**
- **Backticks inside a double-quoted bash `-c` string are command
  substitution.** Two note strings were written with `pitch_plate_215197`
  silently replaced by empty output. Write multi-line edit scripts to a
  scratch `.py` file and run that; do not fight the shell.
- **Line endings are mixed in this repo.** `tests/test_tolerance_stack.py` is
  LF, `tests/test_viewer_projection.py` and the stack JSON are CRLF. A
  find-and-replace script must read with `newline=""` and translate its
  patterns, or it silently matches nothing.
- **Do not reformat a stack JSON with `json.dumps(indent=2)`** to change one
  string. These files carry hand-authored layout (`{"run_id": …, "ts": …}` on
  one line) and a round trip turns a one-line change into a 400-line diff.
  Targeted string replacement of the `json.dumps(old_value)` literal works and
  keeps the diff honest.
