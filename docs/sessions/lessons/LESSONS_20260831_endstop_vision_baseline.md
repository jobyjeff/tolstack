# Lesson — endstop_vision_baseline (worked 2026-09-01)

Handoff: `HANDOFF_20260831_endstop_vision_baseline.md` (task B of
`dispatch/docs/strategy/drafts/DRAFT_3d_annotation_surface.md`). Branch
`handoff/endstop_vision_baseline`, cut from `integration`.

Deliverable: `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`. No
code, no `stack_*.json`. The experiment was expected to fail and did; the
worksheet is the failure record.

Two commits, in the order the protocol requires: `de99685` seals the prediction,
`4c1f0e1` is the attempt. Nothing in the prediction section was edited after the
seal — verifiable by diffing section 1 across those two commits.

---

## Prediction vs. outcome — the calibration, in one table

> **Corrected 2026-09-01 in `review/endstop_vision_baseline`.** Four numbers and
> one whole taxonomy class in this lesson were wrong; every correction is marked
> in place below and argued in the worksheet, which is the authority. Nothing
> the lesson concludes changes direction — the corrections move counts, sharpen
> one recommendation, and delete one follow-up ask.

| | predicted | range | **actual** |
|---|---:|---|---:|
| locatable | 11 of 43 | 6–16 | **15** |
| SOP-`traced` | 3 of 43 | 1–6 | **4** |
| gaps correctly recorded | 32 of 43 | 27–37 | **28** |
| geometry inputs derivable | 2 of 11 | 0–4 | **0 fully, 1 half** |

All four inside range. But the *magnitude* being well-predicted is the less
interesting half. **The taxonomy was structurally wrong**, and that is the part
worth carrying forward:

- I predicted "nominal absent from 2D" would be 15 of 43. It is **1**.
- I did not predict **identity cardinality** (the callout↔row map is not 1:1),
  which covers 4 of 43. *(As written this bullet claimed two missed categories
  covering 7 of 43; the second — "feature owner unidentifiable" — was withdrawn
  in review, see below.)*
- I under-predicted "view/semantics interpretation" 2× (5 → 11). That is the
  real blocker and it is an *identity* problem, not a reading problem.

The direction of the error is the signal: I over-predicted the failure that
would justify a **measurement** tool ("the number isn't drawn anywhere") and
under-predicted the one that actually blocks the work ("the number is drawn and
I can't tell which feature it belongs to"), which wants a **tagging** tool. The
draft had already narrowed to select+tag on Jeff's lean; this baseline supports
that on evidence.

## The thing nobody predicted: 217755 has no dimensions

This is the finding, and it is not a subtle one. A full-text sweep of all nine
sheets of the newest export for any token containing a decimal number:

sheet 1 → 19 tokens, every one of them in a general note, a parts-list
nomenclature or a torque range. **Sheets 2 through 9 → zero.**

Sheet 3's entire numeric content is the zone grid, the title block, two view
scales and four balloons. SECTION E-E — the handoff's "behemoth: dozens of
contributors, tightly packed" — is a full-assembly cross-section carrying
section/detail cut markers and balloons and **nothing else**: no dimension
lines, no feature control frames, no datum symbols. It is a behemoth of *parts*.

So the premise of the experiment ("derive the stack from 217755 sheet 3")
collapses at step zero, for a reason that has nothing to do with vision. The
cited view cannot be misread — there is nothing on it to read. Crop strategy,
resolution and OCR are all irrelevant at that sheet. What the sheet supplies is
an **identity substrate**: which parts touch, and their find numbers.

**For the next agent:** do not plan work around "read the dimension off the
assembly drawing." 217755 is a balloon-and-BOM document. Every dimensional value
in this program lives on a piece-part drawing reached by descending the BOM, and
the descent is 2–3 levels deep and partly missing from the pipeline.

## The drawings say, in their own notes, that they are not the complete definition

Three sightings in the reachable set, all on released sheets:

- `215735-A` (PITCH PLATE) sheet 1 note 5: "ALL VIEWS CONTAINING UNSPECIFIED
  FEATURES SHALL BE CONTROLLED BY ASSOCIATED 3D DEFINITION 215735-001 AND
  (MIRROR COMPONENT) 215735-002."
- `212966-006-A` (PROPELLER HUB) sheet 1 note 8: "FOR COMPLETE DEFINITION THIS
  DRAWING SHALL BE USED WITH THE MODEL 212966-006."
- `215735-A` title block: `TOLERANCE PER ISO-2768-mK` — general tolerance by
  reference to a standard, not by an enumerated block.

The 3D-annotation draft's precedence rule was written as a design decision
mirroring TC practice. It turns out to be **quotable from the drawing face**.
That is a much stronger footing than the draft currently claims for itself.

## Traps I walked into, or nearly did

**1. The general-tolerance block is a trap dressed as a win.** 14 of 43 rows sit
on exactly 0.20 or 0.10 mm, and two of the workbook's own comments say why ("2
decimals => +/-0.1", "tol +/-0.05"). Three of the four reachable drawings print a
decimal-place block matching that letter for letter (`X.XX = ±0.10`,
`X.XXX = ±0.050`). It is tempting to call 14 rows traced.

It is wrong twice over: it traces the *default*, saying nothing about which
feature or direction; and it is **not universal** — `215735-A` is an ISO-2768-mK
drawing with no such block, so applying "2 decimals ⇒ ±0.1" to a pitch-plate
feature is simply incorrect. I only avoided this because the sealed prediction
had committed, in advance, to scoring it as a separate `convention-traced`
category. **Predicting the trap before seeing the data is what stopped it**, and
that is the strongest argument for this handoff's prediction-first protocol I
can offer.

**2. Value-only matching produces confident garbage, with a worked example.** The
only `0.12` in the entire reachable document set is the lower tier of a composite
profile frame (`⌓ 0.25 A B` over `⌓ 0.12`) on the pitch plate's `2X SR 29.92`
spherical seat. Two workbook rows carry 0.12 (rows 17 and 64) and **neither is
that feature, on that part, in that direction**. Any correlator matching on value
alone takes it every time.

**3a. …and I did make exactly that mistake on the blade.** *(Added in review.)*
`546791` is **5** sheets, not the 3 recorded in the worksheet's document table.
Sheets 4–5 are AIRFOIL SECTIONS and FINISH DETAILS and carry nothing rows 19–21
need, so no score moves — but the check below was written after catching the hub
and was then not re-run across the other seven documents. **Run a page-count
pass over the whole document set at once, before scoring anything.**

**3. I nearly scored the hub on two sheets when it has seven.** My first sweep
script reported `212966-006-A.pdf` as 2 pages; it is 7, and sheets 3–4 are the
blade-root bearing seats — the exact features rows 17–21 need. I caught it only
because I separately printed `page_count` for a crop. Had I not, the score would
have been 2 of 43 with a confidently wrong taxonomy. **Print the page count and
check it against what your sweep iterated**, especially when a part looks
under-dimensioned for its complexity.

**4. Establishing identity used the answer key, and I nearly missed saying so.**
Of the 4 traced rows, row 18 was identifiable *only* because the workbook's own
geometry input (`B15 = 106-85`) supplied the number `106` that named the feature
(`⌀ 106.310` on hub sheet 4). Remove the ground truth and that trace disappears.
The other three rest on a single callout identified by **counting** (5X bores ↔ 5
blades; 3X bores ↔ the qty-3 anti-rotation links) — the SOP's Step 1 method, and
the only identification method that worked without the key. A scored-against-
ground-truth experiment leaks the answer in exactly this way; say where it
leaked, or the number is inflated.

## A standing repo assumption, corrected

The graft worksheet's currency check recorded rows 66/67 as **couldn't-check**,
reasoning that drawing-checker's structured JSON stops at title block / notes /
parts list and that "individual linear dimensions exist only as rendered page
images/crops, not as extracted values a text search can read."

The first half is true. **The second half is false of the PDFs themselves** —
for dimension *values*. These are native vector exports with exact text layers;
reading the PDF text directly returns every dimension value losslessly. Not one
value in this attempt was resolution-limited.

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** This paragraph
> ended *"...losslessly, GD&T glyphs included (`⌖ ⌀ ⏥ ⌓ ⊥ ⌭ ↗ Ⓜ Ⓛ`)"*, and it
> does not hold across the document set. `213668-002` puts **zero** GD&T glyphs
> in its text layer — counted over both sheets, none of `⌀ ⌖ ⏥ ⌓ ⌭ ↗ Ⓜ Ⓛ` —
> while a 10x crop of sheet 2 shows a boxed `⌖ ⌀0.2 A B`. The frames are drawn
> as vector geometry on that drawing. So the text layer returns the *value* and
> drops the *geometric characteristic*, which is exactly the identity
> information this lesson says is the bottleneck — and that gap is what made the
> attempt record row 61's position callout as absent. **A false absence is the
> most expensive error a provenance audit can make**, because it reads as
> diligence and is never re-checked.

Consequences:

- rows 66/67 (34.7 mm, 83.1 mm) move from *couldn't-check* to **demonstrable
  absence** — reconfirmed in review by grepping both values across *every* PDF
  in `data/inbox/drawings/`, not just `213668-002`; neither appears anywhere.
  That is this repo's spec-library third outcome (read for, not there), not an
  acquisition gap.
- **drawing-checker growing finer extraction is a cheap, separable win** and is
  not blocked on any 3D work. The dimension values are sitting in the text
  layer — but the feature control frames are not, on every drawing, so the
  extractor has to read the frames' geometry, not the words.
- do not plan an **OCR** investment for these documents; do not conclude from
  that that a text-layer read is sufficient.

## Method notes for whoever runs the next drawing-reading session

- `tests/debug_trace_stack_values.py` (drawing-checker's venv, for `fitz`) is
  the right entry point: `--toc` for the page/zone grid, `--pattern` for a
  zone-tagged text search, `--crop "page,cx,cy,half" --zoom N` to render. Cite
  the **printed** border zone it reports, not a pixel box.
- Two throwaway helpers were worth writing and are *not* committed (they are
  three lines each over `page.get_text("words")`): one grouping words into lines
  by rounded `y` — which is how the general-tolerance blocks and multi-line notes
  become readable — and one bucketing dimension-bearing words by border zone,
  reusing `border_grid`/`zone_for` from the debug tool. If a third session needs
  them, promote the second one into `tests/debug_*` rather than rewriting it.
- Pass `-X utf8` to the interpreter when printing extracted drawing text.
  Windows' cp1252 stdout dies on `⌀` (`\u2300`) and on `µ`. Do **not** try to fix
  this with an env-var prefix or a separate `$env:` assignment — both are refused
  by the permission matcher; the flag on the granted interpreter is the spelling
  that works (standing instructions, "Command spellings").
- **The Bash tool's heredoc silently fails on long bodies.** Two attempts to
  write ~150-line markdown via `cat > f <<'EOF'` died with "unexpected EOF while
  looking for matching `''" at a line near the end of the content. Short
  heredocs (a commit message, a 10-line script) are fine. For a long document,
  use the `Write` tool to a scratchpad file and `cat` it into place — that is
  what produced this worksheet.

## Findings against the ground truth (all in the worksheet's §3c; the two that need Jeff)

- **F1/F2 — material condition inverted, and a row that is a sum.** Row 17's
  comment says "diameter MMC"; `212966-006` sheet 4 says `⌖⌀0.10Ⓛ A B C` —
  **LMC**, on a hole. And row 17's 0.12 reconstructs as position `0.10` plus the
  mating seat's size band `0.022` = 0.122. This is this repo's load-bearing
  design decision 2 ("LMC/MMC are material conditions, not extremes; for a
  subtracted feature the mapping inverts") appearing in live source data.
- **F4 — one callout, three stack rows, two of them in the same direction.**
  Rows 32, 37 and 48 all trace to the single `⌖⌀0.2 A B C` on 215735 sheet 2.
  32 (vertical) and 48 (tangential) resolving one diametral zone into two
  components is legitimate. **32 and 37 are both vertical and both 0.20**, and
  37's name cites that same frame's primary datum. Deliberate second contributor,
  or one tolerance counted twice? **Needs Jeff.**
- **F5 — row 51 disagrees with a released drawing.** The workbook says 0.15 mm
  for the tangential link position on the pitch plate; `215735-A` sheet 2 says
  `⌖⌀0.2 A B` on the 3X bores. If the count-based identification holds, the
  workbook is 0.05 mm optimistic. **Needs Jeff.**

## To the 3D-annotation brief: what the surface must do that 2D provably cannot

The 2D ceiling here is **not** "the dimension is missing." Of 43 rows,
**document acquisition** blocked 23 (go export seven more PDFs and eleven
standards — no tool required), and only **1** was a case where the owning drawing
was in hand, read completely, and still silent. The case for a 3D surface does
not rest on missing numbers.

It rests on **identity**. Measurement blocked **0 of 43** rows; identity blocked
**15**. In fourteen of those fifteen the callout extracted perfectly as text
and the question that could not be answered was *which physical feature does this
workbook row mean*; in the fifteenth (row 61) the *value* extracted and the
geometric characteristic did not. The drawings answer that question for nobody: they carry
~90 dimensional callouts across five sheets and **not one statement of the
kinematic chain**. Nothing says the pitch plate's 5X bore position feeds blade
pitch through a 1.67 deg/mm ratio, or which of the hub's four `5X INDIVIDUALLY`
diametral seats is "the blade root seat." That chain exists only in Jeff's
workbook and in CAD — which is why the honest answer to "what would you
enumerate from the drawings alone" is *callouts, not contributors*: the forward
direction cannot even produce an object of the same kind as the stack, let alone
bound it at 43 rows. **2D cannot bound the problem**, and no improvement to 2D
extraction changes that, because the missing thing was never on the sheet.

So the surface must do four things a drawing provably cannot, and the worksheet's
§7 lists them with citations:

1. **Bind a stack line item to a specific face on a specific part**, where the
   drawings offer only a value and a datum letter. That is the whole product;
   measurement is phase 2 and the evidence says it can wait.
2. **Carry a many-to-many identity map with direction and a composition rule** —
   one callout feeding three rows in different directions, one row summing two
   callouts. A 1:1 tag model cannot express either, and both occur in the four
   rows that *succeeded*. This confirms the draft's binding interlock with
   `DAG_TOPOLOGY.md`'s edge model as necessary rather than tidy.
3. **Treat the GD&T modifier and the owner part's general-tolerance regime as
   part of the identity**, not as annotation. The drawing says `Ⓛ` where the
   workbook says MMC; and `215735-A` is ISO-2768-mK while three sibling parts in
   the same stack print a decimal-place block, so the same "2 decimals ⇒ ±0.1"
   inference is right on three parts and wrong on the fourth.
4. **Open a set of STEPs keyed by BOM position, be able to say "owner not in the
   set", and record *which path* found an owner.** The successful descent was
   two levels; the hub was reached only by a **lateral hop through a different
   configuration's assembly drawing** (`555787-001`, a bird-strike variant),
   because the assembly 217755 actually balloons (`216231-001`) is not in the
   pipeline. **Ten of fourteen** owners have no piece-part drawing here. And the
   pitch arm and ring gear resolve *only* through that same off-path
   configuration — a part number obtained off the BOM path is a hypothesis about
   identity, not a fact, and the surface must carry that distinction rather than
   flattening it.

   > **Corrected 2026-09-01 in review.** This item read *"Nine of fourteen
   > owners are absent. And the 'pitch arm' ... resolves to no part number in
   > any parts list in the pipeline — a state worse than the vocabulary drift
   > the draft anticipated"*. It does resolve:
   > `215071-001 PITCH ARM, PROPELLER, CLOCKWISE` is find no 11 of
   > `[PRELIM 2026-AUG-31] 555786-001 ... BIRD STRIKE.pdf`, whose sheet 4 is
   > titled `PITCH ARM AND LINK INSTALL`; the ring gear is `215072-001` via
   > `[PRELIM] 215500-001 A.1.pdf`. Both documents were in
   > `data/inbox/drawings/` throughout and neither was opened — 555786-001 is
   > even named in this session's own sealed prediction. **Taxonomy class H is
   > withdrawn**, and the real lesson is the method one: the attempt *chased
   > into* its document set (8 of ~30 PDFs) instead of *enumerating* it, and an
   > experiment whose deliverable is "which owners are reachable" cannot do
   > that.

## Variant arm: did not run

The optional arm (CAD section-view screenshots with per-component colours) was
checked at session start per the handoff's "check, don't ask":
`data/inbox/tolerance_stacks/` (main checkout) holds `.gitkeep`, three `.xlsx`
and `PROVENANCE.md`, no image of any kind. Its tradeoff — no balloons on a
coloured view, forcing cross-referencing — is **unmeasured**. Worth noting that
this baseline's result changes what that arm would test: with 217755 carrying no
dimensions at all, a coloured section view loses nothing dimensional by dropping
balloons, and would be compared against an identity substrate rather than a
dimensional one.

## Drawing-checker read-only invariant

Snapshot = every entry under `data/inbox/drawings/` and `data/runs/` in the main
checkout, with size.

- before, taken before any file was opened: **5380** entries,
  `2026-09-01T19:45:46Z`
- after, taken after all reading and rendering: **5380** entries,
  `2026-09-01T20:04:51Z`
- **diff: EMPTY** — no entry added, removed or changed in size.

Eight PDFs were opened read-only. Every rendered crop and every scratch script
went to the session scratchpad, never into drawing-checker's tree and never into
this repo's working directory (so no `crop.png` cleanup was needed before commit,
unlike the `fastener_stack_shadow` session).

> **Corrected 2026-09-01 in `review/endstop_vision_baseline`.** Both figures
> read **5382**. That number came from an ad-hoc `find | stat`, not from
> `scripts/snapshot_drawing_checker.py`, which SOP Steps 0 and 8 name and which
> reports **5380** for the *identical* entry set — set-differenced in review,
> the only difference is the two root directories, which `find` lists and the
> script does not. **Use the script**: it leaves a JSON the next reviewer can
> `diff`, which a `.txt` in a doomed scratchpad cannot be. The invariant itself
> was re-verified independently and over a wider window than this session's own:
> diffing `review/dag_viewer_poc`'s snapshot at `2026-09-01T19:05:09Z` against a
> fresh one at `2026-09-01T20:15:32Z` — opening 40 minutes before this session's
> first commit and closing after the review's own re-reads and crops — returns
> **EMPTY**. Worksheet §6 carries the same correction. And the reviewer's trick
> is worth keeping: a prior review session's `dc_after.json` is usually still on
> disk, so one `diff` brackets a whole tactical session and your review at once.

## Verification

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` from this
  worktree: **559 passed, 1 skipped** — identical to the baseline run taken
  before any edit. The 1 skip is the pre-existing node-fs viewer skip.
- `test_this_branch_amended_the_row_of_every_imported_file_it_changed` fired on
  the `docs/tolerance_stacks/README.md` contents-table row and was fixed by
  amending `PROVENANCE.md`'s row 77 — a **sixth** independent sighting of that
  guard working as designed. It is worth expecting: a one-row addition to that
  README turns the suite red until the provenance row is amended.
- No code changed, so `ARCHITECTURE.md`'s module inventory needed no row.
- **Re-run in review after merging `master`** (board moves) into
  `review/endstop_vision_baseline`: **559 passed, 1 skipped**, unchanged.

## Left for the next session

- **F4 and F5 need Jeff** (see above) — one is a possible double-count in the
  vertical direction, one is a 0.05 mm disagreement with a released drawing.
- **Seven drawings and eleven standards would move 23 of 43 rows out of the
  "blocked" column** with no new tooling: `215071-001` (pitch arm — rows 23, 27,
  30), `215175-001` (tangential link mount),
  `215176-002` (lower gas spring body), `214700-002` (piston body — this is the
  owner of row 39, *the row that names the end stop itself*), `212956-005`
  (pitch/anti-rotation link), `216231-001` (hub and blade assembly — restores
  the severed balloon chain), `217262-001` (nutplate carrier); plus `NAS1154`
  and whatever the workbook's "TB" bushing catalog is. That is the cheapest
  available improvement to this stack and it is an acquisition task, not an
  engineering one.
- ~~**The "pitch arm" needs a part number from Jeff.**~~ **Withdrawn
  2026-09-01 in review** — it is `215071-001`, already in the pipeline (see the
  correction under requirement 4). What is still worth asking Jeff is whether
  the bird-strike configuration's pitch arm is the same part as the one this
  stack means; the chain that would prove it is not in evidence.
- **drawing-checker: extract dimension values *and their feature control
  frames*, not just title block / notes / parts list.** The values are in the
  PDF text layer and come out losslessly; the GD&T glyphs are **not** on every
  drawing (`213668-002`: zero), so the extractor has to read the frames as
  geometry. This is what the agent-correlation pass in the 3D draft assumes it
  cannot have — and reading only the words is what produced this session's one
  false absence.
