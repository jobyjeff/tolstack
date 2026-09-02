---
type: review
handoff: endstop_vision_baseline
reviewer: agent (review/endstop_vision_baseline)
date: 2026-09-01
verdict: APPROVE
blockers: 0
---

# Review — `endstop_vision_baseline`

Handoff: `docs/sessions/active/HANDOFF_20260831_endstop_vision_baseline.md`
(task B of `dispatch/docs/strategy/drafts/DRAFT_3d_annotation_surface.md`).

**Verdict: APPROVE**, with **1 blocker, 4 should-fix and 4 nits, all fixed
inline on the review branch** (commit `e83cd8c`). No rework loop: every
correction was verified against the source PDFs during the review, so sending
it back would have meant a second agent re-deriving evidence I was already
holding.

The deliverable is three files and no code: a 794-line worksheet, a 299-line
lesson, and one row each in `docs/tolerance_stacks/README.md` and
`PROVENANCE.md`. The experiment was expected to fail and did. The work is
strong — the protocol was followed exactly, the provenance discipline on the
part-number and callout evidence is close to flawless, and the headline finding
(217755 is a dimensionless drawing) is real and important. What it got wrong,
it got wrong in one place: **the corpus it read was not enumerated**, and every
material error traces back to that.

---

## The mandatory checks

This work is **not a tolerance stack** — no `stack_*.json` was written, and
that was the correct call (P9). The seven checks are written for stacks; each
is addressed below with its exit reason or its analogue.

### 1. Every tolerance traces to a specification or drawing callout — **the whole review**

There are no `StackElement`s here, so there are no `source_ref` / `confidence`
fields. The analogue is the worksheet's §2f evidence base and §3 citation
column, and this is where a capability baseline can launder a guess exactly as
a stack can: an unverified callout quoted as read would make the score look
better than the attempt earned.

**Nothing is invented.** Every value I checked is on the document at the
address given. Verified by re-reading the PDFs in
`C:\workspace\drawing-checker\data\inbox\drawings\` with drawing-checker's venv:

| claim | verdict |
|---|---|
| 217755 sheets 2–9 carry **zero** decimal-bearing tokens; per-sheet word counts 1906 / 111 / 129 / 181 / 159 / 155 / 126 / 182 / 114 | **exact**, all nine |
| `SECTION E-E` on sheet 3, zone **A11** | **exact** (`debug_trace_stack_values.py --pattern`) |
| sheet 3's whole numeric content = zone grid, title block, two view scales, four balloons (43, 44, 77, 79 2X) | **confirmed** (the two `4`s beside 43/44 are flag-note triangles pointing at note 4, an O-ring install note — not dimensional) |
| 217755 parts list is **103 rows** | **exact** — find numbers 1..103, none missing |
| all ten find-no → part-no mappings in §2b (1, 3, 24, 31, 39, 40, 41, 88, 91, 93) | **exact, all ten** |
| `215735-A` note 5, `212966-006-A` note 8, `TOLERANCE PER ISO-2768-mK` | **verbatim** |
| the three decimal-place general-tolerance blocks (§2e) | **verbatim**, including the differing angular rows |
| every `215735-A` callout in §2f | **exact** (one nit: `⌖⌀0.03Ⓜ D` is `⌖⌀0.03Ⓜ D E`) |
| every `212966-006-A` sheet-4 callout in §2f | **exact**; row 18's `⌀ 106.310 0.000/-0.025` + `⌖⌀0.10Ⓛ A B C` + `5X INDIVIDUALLY` confirmed by 4× crop |
| `546791` sheet 3 callouts | **exact** |
| "the only 0.12 in the entire reachable document set" (F6) | **true, and stronger than claimed** — it is the only 0.12 in *every* PDF in the inbox |
| B66/B67 (34.7, 83.1) demonstrably absent | **true, and stronger than claimed** — absent from every PDF in the inbox |
| row 40's "no 0.01 band anywhere on the pitch plate" | **true** |
| all 43 ground-truth row names and values against `WORKSHEET_end_stop_graft.md` | **exact, all 43** |
| `213668-002`'s callout list | **incomplete and mis-addressed** — see finding B1 and S2 |

### 2 / 2b / 3 / 5 / 6 — no elements, no folds, no hardware: **exit**

No `path`, no `check`, no `fold()`, no `lmc`/`mmc`, no `nominal`, no
`hardware_ref`, no castellated or cotter hardware modelled. Nothing to sign,
invert, bound or quantise. Checks 2, 2b, 3, 5 and 6 have no subject.

Two things that *are* in scope and pass:

- **Check 3's spirit survives as finding F1**, and the author got it right:
  the workbook says "diameter MMC" and `212966-006` sheet 4 says
  `⌖⌀0.10Ⓛ A B C` — **LMC, on a hole**. I confirmed the `Ⓛ` by crop. This is
  the repo's design decision 2 appearing in live source data and it is
  correctly recorded as a finding against the comparison, not as a correction
  to Jeff's sheet.
- **Check 6's generalisation — "the archetype's own caveat, next to the
  numbers" — passes.** The caveat this artifact needs is *"a score against a
  known 43-row list supplies its own answer key"*, and it sits in §2h and §3's
  own outcome vocabulary, immediately around the counts, not in a gaps section.
  §2h names the specific row (18) whose identity was established *using* the
  ground truth. That is the right caveat in the right place.

### 4. RSS actually computed — **exit**

No checks, no verdicts, no folded results. Nothing claims a distribution.

### 7. Report the traced / inferred / untraced ratio — **computed, unmoved**

Re-derived with the one computing command,
`tests\debug_report_tolerance_stacks.py --ratio`, in this worktree:

> **5 of 26 element instances across the three seeded stacks are `traced`;
> 3 are `inferred` and 18 are `untraced`.** All stacks: 30 traced / 9 inferred
> / 20 untraced, out of 59 element instances.

This handoff adds no stack, so it moves neither figure. The worksheet quotes
"5 of 26" for orientation and it reproduces exactly.

**The baseline's own score I re-derived rather than copied**, which is where
finding B1 came from. Corrected figures, of 43 element instances:

> **4 `traced` / 3 `mismatch` / 8 `candidate` — 15 located — 28 gaps
> correctly recorded.** The 4 `traced` rest on 2 distinct callouts, and one of
> those two was identified using the ground truth itself.

---

## Also verify

- **Tests.** `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`,
  re-run by me, not trusted from the report: **559 passed, 1 skipped** in this
  worktree, three times — on the handoff tree, after merging `master`, and
  after my inline fixes. The 1 skip is the pre-existing node-fs viewer skip.
  No code changed, so no new tests were owed.
- **A sibling handoff landed on `master`.** `git log --oneline HEAD..master`
  was **not** empty — two board-move commits (`456e7b6`, `5208bad`). Merged
  into the review branch (`010d03b`); the only conflict was the handoff card's
  location, resolved to `active/`. Suite unchanged after.
- **Scope is stated**, including the variant arm that did not run and why
  (checked, not asked — the handoff's instruction was followed).
- **Findings are recorded, not reconciled away.** F1–F6 (now F7) are stated as
  findings *about the comparison*, and where Jeff's sheet is self-flagged the
  worksheet says so instead of re-litigating. F4 and F5 are correctly escalated
  to "needs Jeff" rather than guessed.
- **`data/inbox/specs/` was not reorganised** — the branch touches no path
  under `data/`, and the filesystem is unchanged.
- **Nothing was written into drawing-checker** — verified independently and
  more strongly than the attempt claimed. See finding S4.
- **PROVENANCE.md.** The `docs/tolerance_stacks/README.md` row was amended for
  the one-row contents-table addition, and the amendment's claim ("one
  Contents-table row and nothing else") is **true** — `git diff -w` over that
  path shows exactly one added line. `tests/test_provenance.py` green.
- **Counts restated by hand.** The README contents row restates "4 of 43", a
  figure the worksheet owns, with nothing pairing them. Left as-is: the
  adjacent `WORKSHEET_end_stop_graft.md` row does the same with "0 of 43", so
  this is house practice for that table, not a regression introduced here. Noted
  for whoever decides to guard it.
- **The prediction seal.** The protocol's central requirement, and it **holds
  byte-identically**. Section 1 hashes the same at `de99685` (prediction only),
  `4c1f0e1` (the attempt), `c249ba4` (the lesson) and at my `HEAD` — 9655 bytes,
  `fd0c8c78…`, four times. The attempt commit's only deletions from the
  worksheet are the five `*(to be filled)*` placeholders. I deliberately touched
  nothing in §1 so that stays checkable.

---

## Findings

All fixed inline in `e83cd8c` unless said otherwise. Every correction is
written into the artifacts as a **dated correction blockquote** beside the
passage it corrects, per this repo's insert-don't-overwrite idiom, so the
attempt's original claim stays readable next to what was wrong with it.

### Blocker

**B1 — a false absence: `213668-002` sheet 2 carries `⌖ ⌀0.2 A B`, and row 61
was scored a gap on the claim that it does not.**
`WORKSHEET_endstop_vision_baseline.md` §3 row 61, §3a, §4, §4b, §5a.

Row 61 (gas spring mount position, tan link mount feature, GT 0.20) was
recorded `gap — correctly identified` with the reason *"`213668-002` has no
0.20-width position callout (`10.60 ±0.20` is a 0.40-width linear)"*. The
drawing carries a boxed true-position frame `⌖ ⌀0.2 A B` on sheet 2's
`220.37 0.00/-0.08` feature — confirmed by a 10× crop. The row is a
**`candidate`**: the value is in reach and the feature identity is not
establishable, which is the category the experiment exists to measure.

This is ranked above the arithmetic because of *what kind* of claim it is. A
false match (F6) looks suspicious and invites a second look. A false **absence**
— "the document is in hand, it was read in full, the value is not there" — is
the strongest claim a provenance audit can make, reads as diligence, and is
never re-checked. This one was one row away from reaching the 3D-annotation
draft as evidence that a released 2D drawing was silent.

Filed in the worksheet as **F7**, next to F6 whose twin it is. Score table
corrected: `candidate` 7→8, located 14→15, `gap` 29→28. Taxonomy: row 61 moves
B→A. **Both affected predictions stay inside their stated ranges** (P1 15 of 43
in 6–16; P3 28 of 43 in 27–37), so the calibration verdict does not turn on it.

### Should-fix

**S1 — the root cause of B1: `213668-002` puts *zero* GD&T glyphs in its text
layer, and §2g / §7 requirement 9 tell the 3D draft the opposite.**
§2g, §5c P8, §7 req 9, and the lesson's "A standing repo assumption, corrected".

Glyph counts over each whole document's text layer:

| document | `⌀` | `⌖` | `⏥` | `⌓` | `⌭` | `↗` | `Ⓜ` | `Ⓛ` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `215735-A` | 19 | 12 | 1 | 2 | — | — | 8 | — |
| `212966-006-A` | 34 | 8 | 3 | 4 | 1 | 7 | 6 | 2 |
| `546791` | 3 | 2 | — | 5 | 1 | — | — | — |
| **`213668-002`** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

`213668-002` prints its frames as vector geometry. So the text layer returns
the **value** and drops the **geometric characteristic** — which is precisely
the identity information §2h and §4b identify as the bottleneck. §2g said
*"every callout extracts as characters, GD&T symbols included"* and *"could
not"* have been otherwise; §7's requirement 9 said **"Do not invest in
vision-for-reading … the correlation pass can read every callout losslessly
today."* Both rewritten. Requirement 9 now says: extract from the frame
geometry, not the text layer alone, and never claim an absence from a
text-layer read.

This is the most valuable thing the review found, because the attempt had it
backwards in the direction that would have shaped the MVP.

**S2 — the document set was chased into, not enumerated; "pitch arm" and "ring
gear" both resolve, and taxonomy class H does not exist.**
§2b, §3 rows 23/27/30, §4, §4a.2, §5b, §7 req 6–7, and the lesson twice.

§2b concluded that the "pitch arm" *"cannot be resolved to a part number at
all"* and the ring gear likewise. Both resolve, in files that were sitting in
`data/inbox/drawings/` throughout:

- `[PRELIM 2026-AUG-31] 555786-001 A.1 HUB AND BLADE ASSEMBLY, PROPELLER, BIRD
  STRIKE.pdf` sheet 1 parts list, **find no 11**:
  `215071-001 PITCH ARM, PROPELLER, CLOCKWISE`, qty 5 — and that drawing's
  **sheet 4 is titled `PITCH ARM AND LINK INSTALL`**. Its find no 1 is
  `555787-001`, so the descent 555786-001 → 555787-001 → `212966-006` is a
  complete two-level chain that was available all along.
- `[PRELIM] 215500-001 A.1.pdf` (RING GEAR ASSY) find no 1:
  `215072-001 RING GEAR, VARIABLE PITCH MECHANISM`.

Neither piece-part drawing is in the pipeline, so rows 23/27/30 stay gaps — but
as class **B** (owner named, drawing absent), not a class of their own.
**Class H is withdrawn** (was 3 of 43). §7's requirement 7 rested entirely on
this premise and has been rewritten around what the evidence does show (an
owner reachable only *off* the BOM path is a hypothesis about part identity,
and the tag must say so). The lesson's follow-up *"The 'pitch arm' needs a part
number from Jeff"* is withdrawn — the useful question left for Jeff is narrower:
whether the bird-strike configuration's pitch arm is this stack's part.

The method failure is the durable half: eight PDFs were opened out of ~30, "in
the order the chase forced", and 555786-001 — dated the day the handoff was
staged, and **named in the worksheet's own sealed prediction at §1c** — was
never opened. An experiment whose deliverable is *which owners are reachable*
has to enumerate the corpus before chasing through it.

**S3 — three count errors, two of them arithmetic on tables in the same
document.**

1. §2b: *"Four of fourteen owners are reachable. Nine are named-but-absent.
   One — the 'pitch arm' …"*. The table has 14 rows: 4 reachable, **8**
   named-but-absent, 2 called unresolvable. `4 + 9 + 1 = 14` only by dropping
   the ring-gear row. Corrected (post-S2) to **4 reachable / 10 named-but-absent
   / 0 unresolvable**; the same figure is restated in §7 req 6 and in the lesson
   and both were corrected with it.
2. §4b's four rows summed to **40**, not 43 — class H's three rows appeared in
   no line of that table. Corrected (post-B1/S2) to identity **15**, acquisition
   **23**, E 4, C 1 = 43.
3. §2a: `546791` is **5** sheets, not 3 (sheets 4–5 are AIRFOIL SECTIONS and
   FINISH DETAILS; I read them — nothing rows 19–21 need is there, so no score
   moves). This is the exact check the author's own lesson trap #3 was written
   about after catching it on the hub; it was not re-run across the other seven
   documents. All other seven page counts in §2a are correct.

**S4 — the read-only snapshot was taken with an ad-hoc `find`, and the
committed figure does not reproduce.** §6, and the lesson.

SOP Steps 0 and 8 name `scripts/snapshot_drawing_checker.py`; the attempt used
a bespoke `find | stat` and reported **5382** entries. The script reports
**5380**. I set-differenced the two enumerations: the entry sets are
**identical**, and the symmetric difference is the two root directories
`data/runs` and `data/inbox/drawings`, which `find` lists and the script does
not. So the invariant was never in doubt — but the number in two committed
documents did not reproduce with the repo's own command, and the artifact left
behind is a `.txt` in a doomed session scratchpad that the next reviewer cannot
`diff`. Corrected to 5380 and the method recorded.

**The invariant itself is verified, independently and across a wider window
than the attempt's own.** The previous review session
(`review/dag_viewer_poc`) left a script-format snapshot at
`2026-09-01T19:05:09Z`. Diffing it against a fresh one I took at
`2026-09-01T20:15:32Z` — 40 minutes before this session's first commit through
after my own re-reads and crops — returns **EMPTY**: no entry added, removed or
changed in size. That covers the tactical session *and* this review.

### Nits (all fixed inline)

- §2f: three callouts attributed to `213668-002` **sheet 2** (`76.86 ±0.10`,
  `5X 4.00 ±0.10`, `10X 5.00 ±0.10`) are on **sheet 1**. The whole 213668-002
  block was replaced with a per-sheet table read in full, which also restores
  eight dimensions and five feature control frames the text-only sweep missed
  (`50.77`, `51.99`, `214.78`, `220.37`, `4.95`, `2X 6.80`, `4.75 THRU`, `70 ±2`;
  `⌖⌀0.2 A B`, `0.03 B`, `0.05 B`, `0.40 A B` ×2).
- §2f: `⌖⌀0.03Ⓜ D` on `215735-A` sheet 1 is `⌖⌀0.03Ⓜ D E`.
- §3b's heading said "the 11 of graft-worksheet §1"; that table has **15** rows
  and 11 is its non-derived subset. Re-titled.
- §5b's bullet "two categories … cover 7 of 43" is now one category covering 4.

### Observations, not findings

- Row 18's citation calls the feature **CRITICAL PART**. What is printed beside
  `⌀ 106.310` is the `CC` octagon (critical characteristic) plus flag notes
  18/19/21; "CRITICAL PART" is the sheet's legend for it elsewhere. The
  attribution is substantively right, so it was left alone.
- §2h's "roughly 90 distinct dimensional callouts across five drawings" is
  understated after the 213668-002 re-read. It is hedged with "roughly" and
  nothing depends on it; left alone.

---

## What went right, and is worth saying

- **The protocol was followed exactly, and the seal is real.** This is the
  first prediction-first experiment in the repo and the mechanism worked: §1 is
  byte-identical across all four commits, and the worksheet's own §5d claim —
  that pre-committing the `convention-traced` distinction is what stopped 14
  rows of title-block default tolerance from inflating the traced count — is
  true and is the strongest argument for the protocol I have seen here.
- **The headline finding is real.** 217755 carries no dimension on any of its
  eight graphical sheets. I re-swept all nine and the per-sheet word counts
  match to the digit.
- **The find-number evidence is flawless.** Ten of ten BOM mappings exact, the
  103-row parts list exact, the printed zone exact, three drawing notes verbatim.
- **Two absence claims were *stronger* than stated** (the 0.12 uniqueness and
  B66/B67) — they hold repo-wide, not just over the documents the worksheet
  scoped them to.
- **The taxonomy is the right deliverable and it survives correction.** After
  B1 and S2 the shape is unchanged: measurement blocks **0 of 43**, identity
  **15**, acquisition **23**, never-a-drawing-quantity **4**, genuine 2D
  ceiling **1**. The MVP scoping conclusion (select+tag, not measure) is
  supported on the corrected numbers.

---

## Note for the next reviewer

Four entries were added to `docs/prompts/REVIEW_AGENT.md` from this review: a
second sighting on "a text layer is a locator" (the zero-glyph case), and three
new ones — claimed absences, un-enumerated document sets, and the snapshot-tool
spelling. The third of those carries a trick worth reusing: **a prior review
session's `dc_after.json` is usually still on disk in its scratchpad**, so one
`snapshot_drawing_checker.py diff` against a fresh snapshot brackets the whole
tactical session and your own review at once.

Two items go to Jeff, unchanged from the attempt except that a third was
withdrawn: **F4** (rows 32 and 37 both trace to the same `⌖⌀0.2 A B C` in the
same direction — deliberate second contributor, or one tolerance counted
twice?) and **F5** (the workbook's 0.15 on row 51 against the drawing's
`⌖⌀0.2 A B`). The withdrawn one was "the pitch arm needs a part number".

---

## Re-check pass (same day, after the merge)

Re-ran the review against its own output. Three load-bearing facts re-derived
from scratch and confirmed: `213668-002`'s text layer holds **0** of the nine
GD&T glyphs across both sheets while sheet 2's frame extracts as the bare tokens
`0 . 2 A B`; `555786-001` sheet 1 find no 11 is
`215071-001 PITCH ARM, PROPELLER, CLOCKWISE` and its sheet 4 is titled
`PITCH ARM AND LINK INSTALL`; `215500-001` find no 1 is `215072-001`; `546791`
is 5 pages.

The corrected worksheet was then re-derived from its own row lists by script:
43 score rows, exactly the graft worksheet's 43 contributor elements (the graft
ids outside that set are §2f's rollup totals and §2h's superseded "OLD STUFF");
outcomes 4 / 3 / 8 / 28 = 43 with every percentage rounding as printed
(9 / 7 / 19 / 35 / 65); taxonomy A 11 + B 12 + C 1 + D 0 + E 4 + F 11 + G 4 +
H 0 = 43 covering each row exactly once; and — the check worth having —
**class A is exactly the mismatch∪candidate set, class G exactly the traced
set, and the remainder exactly the gaps**, so the score table and the taxonomy
cannot now disagree. §4b's five rows sum to 43. Section 1 still hashes
`fd0c8c78…`, identical to `de99685`.

**Two residues of my own corrections, caught on this pass and fixed** — both
the same class as finding S3, and both instances of the overlay's *"the handoff
fixed the one guarded copy of a count and missed every unguarded one"*:

- the **lesson's** own read-only section still said **5382** twice. I corrected
  the worksheet's §6 and filed S4 about that exact figure, then left the second
  copy standing. Now corrected, with the same blockquote.
- §5b said *"someone exports **six** more PDFs"* where §4a.2 (which I had
  corrected) names **seven**. Now seven, pointing at §4a.2 rather than
  restating.

Each file now contains exactly one `5382`, inside the blockquote that quotes it
as superseded. Suite re-run: **559 passed, 1 skipped**. My own review session's
drawing-checker diff, `20:15:32Z -> 20:38:55Z`: **EMPTY**.

The lesson generalises past this handoff and is worth the next reviewer's
attention: **a correction is a change, so it has the same residue problem as the
change it corrects.** After fixing a figure, grep the repo for the other copies
of it — including the ones in the file you are not editing.
