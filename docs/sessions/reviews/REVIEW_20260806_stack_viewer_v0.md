---
type: review
handoff: HANDOFF_20260805_stack_viewer_v0
reviewer: review agent (review/stack_viewer_v0)
date: 2026-08-06
verdict: APPROVE
blockers: 0
---

# REVIEW — `stack_viewer_v0`

`apps/viewer/` (a static, read-only stack review surface), the two projection
scripts it renders, three test tiers, three filed issues and the session lesson.
**5,285 insertions across 35 files**, 3 commits.

This is **not a tolerance stack**, so the overlay's seven mandatory stack checks
do not apply as written — there are no new tolerances, no new `source_ref`s, and
no new arithmetic. What replaces them here is the question the overlay exists to
ask one layer out: *does this surface represent provenance honestly?* A viewer
that renders an untraced value as though it were sourced, or overstates how
firmly a crop is pinned to a document, does the same damage as an invented
number — with more reach, because it is the thing Jeff will actually look at.
That is where I concentrated.

## What I verified

**Merged before judging — twice.** `master` moved under me *during* the review,
not once but twice: `spec_library_v0` had landed when I started, and
`hub_bearing_thermal_stack` landed while I was writing the report. Both times I
merged into `review/stack_viewer_v0` and re-tested the tree that will actually
exist. Both merges **conflicted** (`ARCHITECTURE.md` both times, plus this
overlay the second time — findings 1 and 6), and the second merge surfaced a real
cross-handoff defect that neither branch's suite can see (finding 6).

**Three test tiers, all re-run by me on the final merged tree, all green:**

| tier | command | result |
|---|---|---|
| pytest | `venv-win\Scripts\python.exe -m pytest -q` | **241 passed, 1 skipped** |
| fast JS (node + DOM shim, incl. node-fs tier on the real projection) | `node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack` | **59/59** |
| truth tier (installed Chrome 150 over CDP, `file://` **and** `http`) | `npm ci && node scripts\run_viewer_browser_tests.mjs` | **4/4 checks; 49+49 suite, 16+16 live-DOM sub-checks** |

(Pre-merge, against `master` as it stood at the start: 179 / 58 / 4-of-4. The
growth is `hub_bearing_thermal_stack`'s tests plus the two I added.)

The one skip is honest and self-explaining: the node-fs tier reports itself
skipped from a worktree, where `data/` exists only in the main checkout, and
prints the `--repo` invocation that fixes it. Running it that way, it passes —
including `[real] the NAS6403 grip crop resolves and its PNG is on disk` and
`[real] the folded numbers reach the page verbatim`.

I did **not** take the lesson's "the browser tier caught two real bugs" on
trust: `node_modules/` is gitignored and was absent, so I ran `npm ci`
(1 package, no browser download) and drove the tier myself. It is real and it is
green.

**Test pollution (universal check).** Snapshotted `data/` in both the main
checkout (85 files) and the worktree (6) before and after the full suite:
**byte-for-byte unchanged**, both. Test I/O goes to `tmp_path`. `git status`
clean in both trees.

**The one-fold rule holds, in both languages.** `fold()` is untouched — no diff
to `tolerance_stack/`. The viewer contains no arithmetic: `VA.fmt` is
`String(n)` and nothing else, rounding happens once in Python
(`INTERVAL_DECIMALS = 6`), and every interval and verdict in `results.json` comes
out of `stack.path()`/`stack.check()`. `term_elements` even reuses
`StackDefinition._expand`, so the "what feeds this check" list the UI prints
cannot disagree with the arithmetic it labels. This was the deliverable most at
risk of being quietly violated and it was not.

**The projections are genuinely derived and idempotent.** I rebuilt both against
the main checkout. `crops.json` and all six PNGs came back **byte-identical**;
`results.json` differed only where `spec_library_v0`'s `hardware_entries.json`
edits legitimately flow through — which is the projection doing its job.
Resolution reproduced exactly: **6 resolved / 26 unresolvable of 32**.

**The crops are real, and I looked at them.** `bushing_214820` renders the
cited zone H3 of 217755 sheet 4 and lands squarely on DETAIL B with balloons 35
and 32 visible — the actual joint. `pitch_plate_flange` renders the `5X 4.06
±0.10` callout it cites. These are useful crops, not decorative ones.

**"Never guess" is enforced, not just claimed.** Every branch of `resolve_pdf`
is unit-tested under this repo's stdlib-only venv (`fitz` is imported lazily for
exactly that reason), including the ones that matter most: two candidate PDFs
for one document raises *ambiguous* rather than picking one, and a PDF whose
sha256 disagrees with the run's `run_meta.json` is **refused**. The unresolvable
reasons are specific enough to act on.

**drawing-checker stayed read-only.** The crop script only opens and hashes. The
cited run `20260804_114000` predates this handoff (dir mtime 2026-08-04 11:40,
`ts` 2026-08-04T18:40Z) and is cited by `stack_pitch_link_to_pitch_plate.json`,
which is `master` content. Five PDFs were dropped into drawing-checker's inbox on
2026-08-05 afternoon (`212966-006-A`, `214588-002-A`, `214589-002-A`,
`214955-004-A`, `214959-002-A`); the crop rebuild after the second merge
identified them for me — they are the drawings `hub_bearing_thermal_fit_m1`/`m2`
cite, so they are that handoff's, not this one's. Nothing here wrote them, and
its own review is closed; noted factually, not charged.

**Other overlay items.** `PROVENANCE.md`: no file it calls byte-identical was
touched — the diff is `apps/`, `scripts/`, `tests/`, `docs/`, `README.md`,
`ARCHITECTURE.md`, `.gitignore`, `package*.json`, nothing under
`tolerance_stack/` or `docs/tolerance_stacks/`. No `{{` placeholders survive.
`data/inbox/specs/` untouched and un-reorganised (64 files, append-only; nothing
new tracked under `data/`). `forge check` **OK in the worktree** as well as the
main checkout. `data/projections/*` and `node_modules/` both correctly ignored
(`git check-ignore -v` confirms). The `SourceRef.kind` vocabulary is fully
covered by the crop script — all six of `drawing | parts_list | workbook | spec |
pipeline_element | assumed` are handled, no drift.

**Vendoring claim checked, not assumed.** `apps/viewer/vendor/markdown.js` says
it is forge's `apps/notes/vendor/markdown.js` verbatim apart from the namespace
and a header note. `diff` against forge: exactly that, nothing else. The renderer
is escape-first (the whole source is HTML-escaped before any transform) and
`innerHTML` appears in app code only as `VA.clear`'s `= ""`; everything else goes
through `textContent`. FSA grant is `mode: "read"` throughout, with no write path
in the adapter contract at all.

**Provenance ratio across the projection** (computed by me, from
`results.json`): **8 traced / 8 inferred / 16 untraced, out of 32 element
instances**, over four stacks. Excluding `pitch_link` (i.e. the three slice-1
stacks the filed issue is about): **4 / 6 / 16 of 26** — which reproduces that
issue's table exactly.

## Findings

### Should-fix — all four fixed inline on the review branch

**1. `ARCHITECTURE.md` merge conflict with the sibling `spec_library_v0`.**
Both handoffs rewrote the same data-flow ASCII diagram and package-layout block
from their common founding shape, and git could not merge them. Neither branch is
wrong; the board just ran them in parallel. *Fixed:* resolved additively — the
package layout now lists `__main__.py`/`spec_library.py` **and**
`scripts/`/`apps/`, and the diagram carries the spec-library chain **and** the
two viewer branches off `docs/tolerance_stacks/*.json`. Both prose sections kept.
This is a second sighting of the overlay's "sibling handoff landed on master"
entry, in a new form (a doc, where no test can see it); appended there.

**2. `ISSUE_20260805_slice1_stacks_name_no_export...` overstates what
`joint.assembly_export` buys — and overstates sha256 coverage.**
It reads *"That one line is why six crops resolve, sha256-verified against the
run's `run_meta.json`."* Recomputing `resolved_by` from `crops.json`:
`joint_export_run` **2**, `spec_pile` **3**, `provenance.sources_used` **1**, and
`sha256_verified` true on **2 of 6**. So the sha-verified path accounts for two
crops, and the sentence credits it with all six — including the best demo crop,
which actually resolves through the *prose scan* the lesson itself calls
"should not become load-bearing", onto a copy of 215197 living under
drawing-checker's `tests/fixtures/drawings/`. Everything else in the issue is
correct and the argument is right; the number inflates the strength of the
provenance, which in this repo is the class of error that matters. *Fixed:*
corrected with the recomputed split and a dated note recording the correction
rather than silently editing it.

**3. Two off-by-one counts in the same issue.** "6 of their failures are the
same root cause" above a list of **7** rows; "the remaining 20 are `workbook` or
`assumed`" where it is **19** (18 + 1), and 7 + 19 = the 26 unresolvable. The
session lesson's table has the same split **right** (18 / 7 / 1), so this is the
issue file drifting from its own source. *Fixed.* Third sighting of "stale
inventory numbers"; the overlay entry now says to recompute anything asserted
about the projections from the projection.

**4. The lesson credits `assembly_export` with 3 crops; it is 2.** Same class,
same cause. *Fixed*, with the two element ids named so the claim is checkable.

### Should-fix — fixed inline, code

**5. A corroboration flag was presented without the evidence behind it.**
`cropProvenanceLine` rendered `callout_text_in_zone: true` as a bare
*"(callout text found there)"*. The needle that actually matched is whichever
candidate hit first, and `callout_needles` splits the callout on whitespace, so
it can be a bare token. In the live projection the best-looking case,
`pitch_plate_flange`, corroborates on **`±0.10` — which occurs 5 times on that
sheet** — while the discriminating `4.06 ±0.10` occurs exactly once and is never
tried. The crop is still correct (it is placed by the *zone*, not the needle),
but the line reads as much stronger corroboration than a generic token is, on a
surface whose whole job is not doing that. *Fixed:* the line now names the string
that matched — `(callout text "4.06" found there)` — and the fast-tier test
asserts it. All three tiers re-run green after the change.

### Should-fix — from the second merge; honesty guard fixed inline, feature filed

**6. The viewer renders *no checks at all* for the two `thermal_fit` stacks that
landed on `master` mid-review.** `build_viewer_projection.py` folds with
`load_stack()`; a `thermal_fit` stack's `checks` array is empty in the file by
design, because `thermal.load_thermal_fit_stack()` **generates** the checks and
refuses a hand-written one. So on the merged tree:

```
hub_bearing_thermal_fit_m1   8 elements (4T/2I/2U), 0 paths, 0 checks
hub_bearing_thermal_fit_m2   8 elements (8T/0I/0U), 0 paths, 0 checks
```

Two of six stacks reach the review surface as an elements table and nothing else
— every interference result, the whole point of the archetype, absent with no
error and no failing test. Neither handoff is at fault; both suites are green on
both branches *and* on the merge, because nothing tests the viewer against a
generated-check stack. Textbook instance of the overlay's own
"sibling handoff landed on master" entry.

*Fixed inline — the honesty guard only.* The projection now carries `archetype`
and `checks_generated_not_rendered`, and the viewer prints a loud notice naming
the archetype and the command that *does* show the terms
(`tests/debug_report_thermal_fit.py --terms --markdown`) instead of a quiet
"no checks". Pinned by a new pytest and a new fast-tier JS test.

*Not fixed — filed as
`docs/issues/ISSUE_20260806_viewer_does_not_render_generated_checks.md`
(priority high).* Actually rendering these checks is not a one-liner and I
deliberately did not attempt it: generated terms carry **coefficients**
(`2`, `k`, `2k`, `1−k`, soak factors) that `term_elements()` drops and
`stack.js` does not render, so dispatching to the thermal loader without first
plumbing coefficients through would display a `2k`-weighted sleeve wall as a bare
`+ sleeve_wall`. That is worse than showing nothing — a term list that looks
readable and is wrong, on the surface whose job is letting a reviewer read every
sign. The issue says to plumb coefficients first, for that reason.

**7. The no-export defect is not a slice-1 legacy problem — it is the default.**
Rebuilding crops on the merged tree, the two brand-new thermal stacks fail
*identically* to the three imported ones: `citation names no export, and
provenance.sources_used names no PDF for '212966-006'` and friends. The drawings
exist and the citations name sheet and number; nothing names which export. So
resolution across the repo is now **6 of 48**, all six still in the one stack
that fills `joint.assembly_export`. This makes the SOP-side fix considerably more
urgent than the original issue implied. *Fixed:* appended a dated update to
`ISSUE_20260805_slice1_stacks_name_no_export_so_no_citation_resolves.md` with
the evidence; the SOP change itself is out of scope here (and this handoff was
told not to touch the SOP).

### Nits

- **The browser tier dies with a raw `ERR_MODULE_NOT_FOUND` stack trace** when
  `playwright-core` is not installed, rather than skipping with a report. The
  prerequisite *is* documented (`apps/viewer/README.md` says `npm install`
  first), and `build_viewer_crops.py` sets the better precedent in this very
  handoff — a plain sentence naming the interpreter to use, exit 2. Making the
  `playwright-core` import dynamic and catching it would match. Not fixed: it is
  a restructure of the module's imports, not a one-liner.
- **`crops/` is 5.8 MB for 6 crops**, two of which are the same scanned NAS6403
  sheet rendered twice. The lesson already records this and judges it not worth
  deduping at this size; I agree, and it is gitignored.
- **`VA.parseJson` maps a corrupt projection to `null`**, i.e. to the same state
  as "not built". Deliberate (a read landing mid-rebuild must not crash the
  page), and the banner's advice — re-run the script — happens to be right for
  both. Worth knowing it cannot distinguish them.
- `vendor/markdown.js` carries a `summaryLine` that calls an undefined
  `firstLine`. It is dead here and **also dead upstream in forge**; the file's
  own rule is "re-copy rather than diverge", so leaving it is correct.
- **`WORKSHEET_hub_bearing_thermal_fit.md` serves both thermal stacks**, but the
  projection matches worksheets by name (`stack_X.json` → `WORKSHEET_X.md`), so
  both report `worksheet_file: null`. The viewer correctly says "no worksheet"
  rather than borrowing one — the right default, and tested — but one worksheet
  serving several stacks is now a real pattern and probably wants an explicit
  `worksheet` field. Recorded in the filed issue's "Related, smaller" section.

## Note for the next reviewer

Two things this handoff changes about reviewing *stacks* here:

1. **You now have a rendering surface — use it, but rebuild it first.** Nothing
   rebuilds `data/projections/viewer/` automatically. Run both scripts against
   the main checkout before trusting anything the viewer shows; a rebuild that
   changes more than `built_at` means the committed claims were made against a
   different tree. Added to the overlay.
2. **`INCOMPLETE` now has a consumer, and it is a case-sensitive string match.**
   A stack that writes "incomplete" or "PARTIAL" renders as an ordinary failing
   check and silently loses the budget-not-verdict warning. Added to the overlay,
   and the author filed the schema fix
   (`ISSUE_20260805_check_result_has_no_complete_flag.md`) with a test that
   asserts the lower-case miss on purpose.

The three filed issues are good, in-scope, and correctly *filed* rather than
fixed — the author declined to "fix" the no-export problem by loosening the crop
resolver, which would have rendered wrong-revision geometry that looks perfect on
screen. `ISSUE_20260805_architecture_traced_ratio_disagrees_with_the_stacks.md`
I recomputed independently and it is exactly right.

## Verdict

**APPROVE.** No blockers. Seven should-fix findings. Six are fixed inline on the
review branch: four were overstated or stale numbers in the issue and lesson
prose, one an honesty overstatement in the UI, one a two-way `ARCHITECTURE.md`
merge. The seventh — the viewer not rendering generated `thermal_fit` checks —
arises **only from the merge with a sibling handoff**, is not a defect of the
work as authored, and cannot be fixed safely without plumbing term coefficients
first; its silent half is guarded inline and its real half is filed at priority
high. The engineering underneath is
careful: the one-fold rule is preserved into a second language, resolution
refuses to guess and is tested branch by branch, the unresolvable *reasons* are
treated as the deliverable they are, and the handoff's headline ask — "which
`source_ref`s failed to resolve and why" — is answered with a real, verified
number and a filed issue rather than a hand-wave.
