---
type: review
handoff: HANDOFF_20260810_fastener_citations_and_confidence
reviewer: review agent (Claude Opus 5)
date: 2026-08-10
verdict: APPROVE
blockers: 0
---

# Review — `fastener_citations_and_confidence`

Three commits on `handoff/fastener_citations_and_confidence` (`a6b400b`,
`e6bf298`, `97ab359`), merged into `review/fastener_citations_and_confidence`
at `b66515f`, plus two review commits of my own. Nothing was uncommitted in the
tactical worktree.

**Headline: this is a provenance-label change end to end, and I verified that
independently rather than taking the claim.** Four `source_ref` labels moved in
two directions; not one element value, path, check, verdict or RSS figure
changed anywhere in the repo.

## The one thing that mattered most — I re-read the document

Everything here rests on one claim: that `NAS6403-NAS6420 Rev 4.pdf` sheet 3
prints both the grip **and its band**, which is what makes `traced` legitimate
where a parts list never could be. The scan has no text layer, so I rendered my
own crops and read them by vision:

| claim | my reading | verdict |
|---|---|---|
| sheet 3 column header is `Grip ±.010`, shared across every basic number | confirmed — `Grip Dash No.` \| `Grip ±.010` \| `NAS6403 .1900-32` \| `NAS6404 .2500-28` …, the grip column sits **left of** the per-basic-number LENGTH columns and is one column for the whole family | **PASS** |
| row 13 → grip `.812`, NAS6403 length `1.135`, NAS6404 `1.182` | confirmed, all three | **PASS** |
| row 14 → grip `.875`, NAS6403 `1.198` | confirmed | **PASS** |
| `LENGTH ±.015` is a column-group header spanning every basic number | confirmed on the wide crop | **PASS** |
| sheet 1 `T (Ref)` = `.323` for NAS6403 | confirmed; and `1.135 − .812 = .323` exactly | **PASS** |
| sheet 1 `X (g)` = `.156`, `Y (h)` = `.094` | confirmed | **PASS** |
| sheet 2 note (a) grip definition, note (b) reference dimensions, notes (g)/(h) as 5 and 3 thread pitches | confirmed, quoted word for word in the author's notes | **PASS** |
| sheet 2 CODE block: dash = grip in `.0625` increments, `U` = unplated, `D` = drilled shank, `H` = drilled head | confirmed | **PASS** |
| sheet 1 invokes **MIL-S-8879** for the UNJF-3A threads | confirmed on the figure callout | **PASS** |
| `EXAMPLE OF PART NUMBER` block is written against NAS6404 | confirmed | **PASS** |

Crops I rendered (`page,cx,cy,halfwidth`, drawing-checker's venv):
`3,140,190,70 --zoom 8`; `3,300,120,180 --zoom 5`; **`3,130,125,60 --zoom 10`**
(the grip column header — the one crop that settles the whole handoff, and it is
not in the author's list; theirs shows the rows and the wide header band, mine
shows `Grip ±.010` sitting directly above `.812`); `1,305.5,421,421` and
`2,305.5,421,421 --zoom 2.2`.

**No invented number found.** Every value that moved to `traced` is printed, with
its band, on a page I opened.

## The seven mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — **PASS**

- The cited document exists in the main checkout's `data/inbox/specs/` and I read
  it (above). The `callout` text matches; sheet 3 is the right address.
- **Re-hashed all 22 established exports myself.** Every one matches its recorded
  `sha256`. Cross-checked each `export.runs` entry against `data/runs.jsonl`: all
  cited runs predate `20260730_161157` and so carry no `inputs` key, which is the
  documented state, not a gap in the record. No run was added by this handoff.
- **The dropped export block is correct.** `tan_link:fastener_grip_13` moved to
  `kind: "spec"`, which is exempt from the export requirement (append-only pile,
  filename identifies the bytes), so its block went — the same drop
  `fastener_grip_14` made on 08-06. The sha256 it carried is still live on this
  stack's `straight_bushing`; I confirmed that block re-hashes.
- **Confidence is honest, and downgrades happened.** Two elements went *down*.
  `washer_thin` → `untraced` is plainly right: the parts list says `.032" MIN`, a
  minimum and not a band, so it supports neither number folded.
- **`take2:straight_bushing` — the call the author flagged as reversible, and I
  am not reversing it.** Take 1 cites 217755 find 34 with a balloon and an export
  and says in its own note that the 4.63/4.76 limits are not on that drawing:
  the sanctioned `parts_list`/`inferred` shape. Take 2 cites a workbook cell and
  nothing else. Promoting it to match take 1 would mean *adding* a citation to a
  document that prints neither the band nor even this nominal (`.1875 × 25.4 =
  4.7625` against the hand-typed `4.762`). Manufacturing corroboration to improve
  a label is the failure this repo exists to catch. The two instances citing
  different documents at different confidences is the honest outcome.
- **The registered allowlist exception is still true.** I read
  `hub_bearing_thermal_fit_m1`'s two hub-bore notes against the fields: both name
  212966-006 rev A as a *second* document printing the identical value and band,
  both state the weakness ("the bore could have changed at -005 and changed
  back") and both pre-authorise the downgrade. That is what `inferred` is for,
  and the implication the source issue proposed really is false.
- **Note-vs-field, on every changed element:** each note now agrees with its
  field. The specific defect that opened this handoff — a note ending *"the
  +/-.004 is untraced"* over a field saying `inferred` — is gone.
- **Still true and still out of scope:** the three 215197 citations point into
  drawing-checker's `tests/fixtures/drawings/`, another repo's test fixture as
  production provenance. Pre-existing, untouched here, and already the subject of
  SOP Step 3. Not a finding against this handoff.

### 2. Signs on every path term — **PASS**

Printed every term of every path and check in both changed stacks and read them
one at a time. Every added feature is `+1` (implicit), and every subtracted one
is explicit: `bushing_chamfer` `−1` in `bore_min_grip` and in take 2's `total`;
`bore_min_grip` `−1` inside both `threads_in_bore` checks; `fastener_grip_*` and
`thread_transition` both `−1` inside all four `shank_out` checks; take 2's
`total` `−1`. All coefficients are `1`, all positive. No element is double-counted
between a path and a check that also names it — F3's deliberate de-duplication is
intact. The prose direction is right too: the Checks section's conclusion states
that no fastener passes both criteria, which is what the intervals say.

### 3. LMC/MMC direction, per element — **PASS, and the inverting case is present**

`tan_link:bushing_chamfer` carries **LMC 0.889 > MMC 0.635** and is the term with
the `−1`: the mapping inverts exactly as it must for a subtracted feature. So the
"`max == mmc` everywhere" smell is absent by having a real counter-example, not by
argument. Every other element maps `max == mmc`, `min == lmc`, correctly, for
added features. `fold()` still reads `min`/`max` only — pinned by the test that
reads `fold()`'s own source, which is green.

### 4. RSS actually computed — **PASS**

Every check row in the worksheet carries nominal, WC min/max **and** RSS min/max —
all three, with numbers in them. Verdicts are computed from nominal and worst-case
minimum; the worksheet says "Verdicts never read RSS" and the code agrees. The
"what the RSS columns do not claim" caveat is present and correct: this stack has
a `role: "allowance"` element (`thread_transition`) and a one-sided band
(spherical bearing), and the caveat names both and quantifies the re-centering
(0.638 of `shank_out__14_thick`'s gap is bookkeeping).

### 5. Nominal inside its own min/max — **PASS, violations recorded not fixed**

Two elements violate `min <= nominal <= max`: `straight_bushing`
(4.762 > max 4.76) and `flange_bushing_flange` (1.575 > max 1.5748). Both are
recorded as **finding F1** with the source cells named, and both are transcribed
as-is — nobody "fixed" a nominal to satisfy the invariant. `thread_transition`'s
nominal *is* its maximum (min 0), which is the third named case and is stated.
Nominal is not a midpoint anywhere.

### 6. Quantised constraints (cotter / castellation) — **PASS after a fix I made inline**

The joint is MS9363-09 slotted nut + MS24665-153 cotter pin, so this check
applies. The caveat itself is present, correct and well argued (F8), gap 2 is
still priority **1 — blocks F8**, and the transcribed-but-unused nut geometry in
take 2 is untouched, as it should be.

**But it was not next to the numbers.** The Checks table and its conclusion
paragraph present grip verdicts and mention castellation nowhere; F8 sits ~150
lines below. Three prior review reports recorded this check PASS, one of them
wording it as *"both worksheets keep their MS9363 caveat next to the numbers"* —
which was true of the joint header and of F8, and not of the results. I repeated
the caveat as a blockquote directly under the Checks table. This is a doc-only
fix; no number moved. See finding N1 and the new overlay entry.

### 7. The traced / inferred / untraced ratio — **PASS; computed by me**

Run in my review worktree on the merged tree with
`tests\debug_report_tolerance_stacks.py --ratio`:

> **5 of 26 element instances across the three seeded stacks are `traced`;
> 3 are `inferred` and 18 are `untraced`.**
> All six stacks: **21 traced / 7 inferred / 20 untraced, out of 48.**

Per stack: `tan_link` 3/1/7 of 11, `take2` 1/0/8 of 9, `vpa` 1/2/3 of 6. That
reproduces every figure the handoff quotes, and the freshly rebuilt viewer
projection independently prints the same per-stack triples.

**The ratio moved in both directions in one commit** — two elements up to
`traced`, two down to `untraced` — and the SOP now says to expect that. A ratio
that only ever climbs is being managed rather than counted; this one is being
counted.

**Non-element values, counted separately and unchanged:** the two thermal stacks
still carry 7 values no `StackElement` can hold (3 CTEs, 2 operating
temperatures, 2 stiffness ratios), **0 of them traced**. This handoff touched no
material property and no `materials.json`, so that half of the ratio is exactly
where `hub_bearing_thermal_stack` left it. Quoting `5 of 26` alone would flatter
the repo; both numbers belong together.

Every `untraced` value appears on a listed gap. `washer_thin` is now source gap 3,
`thread_transition` is gap 1 (correctly re-scoped: closed for grip, still open for
the run-out), `take2:straight_bushing` is gap 5.

## Also verified

- **Tests, re-run by me in both checkouts.** `340 passed / 1 skipped` in the
  review worktree; `341 passed / 0 skipped` in `C:\workspace\tolstack` after the
  merge — the documented data-dependent skip. Green both sides.
- **`HEAD..master` was empty, and that is not the whole story.** The author's
  `318 → 325 / 1` was measured against baseline `d08b1ea`, and
  `viewer_projection_provenance` merged to `master` mid-handoff. Nothing
  conflicted; the counts are simply true of a tree that no longer exists.
  Corrected in the lesson (finding N2).
- **No numeric change, verified independently.** I diffed the entire
  `debug_report_tolerance_stacks.py` output between `master` and the merged tree.
  The only differing lines are the four source/confidence cells that were meant
  to change. Every check row is byte-for-byte identical, so the "no check result
  moved" claim in the lesson, the worksheets and three `PROVENANCE.md` rows is
  **true**, not merely asserted.
- **`PROVENANCE.md` amendments are true, which is the half the test cannot do.**
  Six rows amended; the byte-identity test fired on the author's own machine and
  named them, which is that mechanism's first real branch working. `take2`'s row
  correctly moved `no` → `yes`, and the document now records that `tests/__init__.py`
  is the last remaining byte-identical claim. One count in the
  `test_tolerance_stack.py` row was one short — fixed inline (N3).
- **Nothing written into drawing-checker.** I took my own snapshot at step 0,
  before any access, and re-took it twice, including after running that repo's
  venv for PyMuPDF and after the crops rebuild: **1628 entries, diff EMPTY both
  times.** No run was added and no cited run's `ts` changed.
- **`data/inbox/specs/` is intact and append-only.** 62 spec files + `README.md`;
  every file's mtime is its original, `NAS6403-NAS6420 Rev 4.pdf` still
  2024-02-22. Only the tracked `README.md` was edited. No rename, no
  de-duplication.
- **Tests do not pollute `data/`.** Main checkout `git status` is clean after two
  full suite runs — only the permanent untracked `.dispatch.toml`.
- **Projections rebuilt by me**, both stamped `master @ 6aea6ec`, no gate refusal,
  `dirty: false` (the `.dispatch.toml` false positive fixed by the last review is
  staying fixed). The crops projection improved exactly as the lesson predicted:
  `spec_pile` resolutions **2 → 4**, unresolvable **24 → 22**, `source_ref_export`
  unchanged at 22. Nothing regressed.
- **Schema hygiene.** `element_id`/`run_id` null everywhere; `library_ref` pairing
  intact (`NAS6403U11D` alone is `library`, and re-sourcing correctly did **not**
  promote the other three — `values_status` says who owns the numbers,
  `values_source` says where they came from). All 15 hardware entries keep a
  non-empty `gaps`, and the closed gaps were rewritten as dated `CLOSED` lines with
  the true remaining gap beside them rather than deleted.
- **The `hardware_entries.json` prose had gone *false*, not stale** — three gaps
  claimed a standard was "absent from this repo" about a file sitting in
  `data/inbox/specs/`. Fixing that is the most valuable thing in the diff after
  the re-citations.
- **Both issues closed properly** (`status: closed`, `closed`, `closed_by`, plus a
  dated blockquote), and the new issue carries a correct frontmatter block.
- **Scope respected.** The SOP diff is confined to § "The traced ratio"; the
  `library_ref` sections `sop_library_ref_pairing` owns are untouched. No
  `{{PLACEHOLDER}}` in the diff. No new script, so no `ARCHITECTURE.md` inventory
  row was owed.
- **The overlay edit the author made is correct** — updating check 1 with the new
  test's name *and both of its blind spots*, and moving the calibration figure.
  That is the obligation the ratio move creates, not overreach.

## Findings

No blockers. Three nits, all fixed inline on the review branch.

**N1 — nit, fixed.** `docs/tolerance_stacks/WORKSHEET_tan_link_to_pitch_plate.md`,
Checks section. The castellation/cotter-alignment caveat lived only at F8, ~150
lines below the results. Checklist 6 requires it next to the numbers precisely
because the failure mode is a clean-looking interval read as a resolved joint.
Repeated as a blockquote under the Checks table, pointing at F8 and gap 2.
Pre-existing, not caused by this handoff; `PROVENANCE.md` row amended in the same
commit.

**N2 — nit, fixed.** `LESSONS_20260810_...md` line 5. `318 → 325 / 1` is
branch-only. Added a dated note giving the shipping tree's numbers (340/1
worktree, 341/0 main checkout), both re-derived.

**N3 — nit, fixed.** `PROVENANCE.md`, `tests/test_tolerance_stack.py` row: "two
tests added and **four** changed" — five test functions changed (the row groups
the two `hardware_entries` count tests as one item). Recounted from the diff
hunks; now says five.

## Note for the next reviewer

- **The check-6 gap is the one worth carrying forward**, and it is now an overlay
  entry: a prior review's PASS is a claim, not evidence. Three reports passed a
  *location* requirement that a `grep` satisfied and the actual location did not.
  When a check says "next to the numbers", open the file at the numbers.
- The `take2:straight_bushing` vs `tan_link:straight_bushing` split is deliberate
  and argued in the lesson. I agree with it. If a future reviewer disagrees, the
  author is right that the fix is to **downgrade take 1**, never to promote take 2.
- The allowlist `_WORKBOOK_INFERRED_ALLOWED` now needs a human to ask, each review,
  whether its two registered arguments are still true. They are today.
- `hardware_entries.json:MS9363-09`'s gap still says nut height, slot count and
  slot depth are "still missing" while `MS9363 Rev C.pdf` has been in the pile
  since 08-05. Named in the new sweep issue, left unfixed as out of scope — a live
  instance waiting for whoever builds that sweep.

## Verdict

**APPROVE.** Merged to `master` at `6aea6ec` (fast-forward), suite green in both
checkouts, projections rebuilt and consistent.
