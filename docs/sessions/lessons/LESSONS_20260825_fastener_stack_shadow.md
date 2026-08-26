# Lesson — fastener_stack_shadow (2026-08-25)

Handoff: `docs/sessions/completed/HANDOFF_20260825_fastener_stack_shadow.md`.
Produced `stack_rotor_fastener_length.json` + `WORKSHEET_rotor_fastener_length.md`
+ 10 new `hardware_entries.json` rows (`NAS6403U2H`..`U10H`, `MS21299C3`).

## The joint turned out not to be one of the existing three

The handoff named the joint only by class ("rotor fastener grip/length
adequacy"), not by drawing location, and none of the three joints already in
this repo (pitch link, tangential link, VPA output — all on 217755 sheet 4/5)
matched: each of those is a single fixed as-drawn dash number, and none of
them is described anywhere as "the rotor". Finding the real joint took a
dedicated research pass (a forked sub-agent scanning 217755's balloons/parts
list across sheets, plus my own follow-up crop-reading) before any stack
authoring could start. It landed on **sheet 8, SECTION T-T**: the hub-and-blade
balance-mass retention bolt, which the drawing's own **general note 24**
describes as "SELECT ONE FASTENER FROM PROVIDED OPTIONS AS REQUIRED FOR
CORRECT GRIP LENGTH PER JPS00094 AND/OR AC43.13-1B" — the handoff's own framing,
verbatim, in the drawing. That phrase match, once found, was the strongest
single piece of evidence in the whole session; everything else (note 12's
"balance the rotor" language, the pre-existing `NAS1149V0332` hardware entry
already listing a `SECTION T-T` balloon from an earlier handoff) corroborated
it. **Lesson for future joint-identification-by-description handoffs: search
the drawing's own general notes for phrasing that echoes the handoff's words
before falling back to count-based identification (SOP Step 1)** — it is
faster when it works, and it worked here.

A second candidate (sheet 4 SECTION K-K, spindle bearing-preload shims) was
found and ruled out because it has a fixed single dash and a shim-selects-
*preload* problem, not a select-the-*grip* problem — no note analogous to 24.
Recorded in the stack's `identification_note` in case Jason's screenshot
(still pending) says otherwise.

## Missing documents — the gap list

This joint's clamped stack is **structurally emptier** than any of the other
three 217755 joints:

1. **216579-002 through -007** (balancing-mass part drawings) — not in this
   repo at all. The parts list gives weight in grams (4/11/25/66/66/66) and
   nothing else; no thickness is derivable from a mass alone without also
   knowing the material and planform, neither of which is on the assembly
   drawing. This is the single biggest gap in the stack.
2. **216231-002 HUB AND BLADE ASSEMBLY** (or whichever of the three
   reference-only assemblies balloted at SECTION T-T actually carries the
   tapped hole — the section also cuts through 208510-008 VPA and 215175-002
   TANGENTIAL LINK MOUNT at the same location, and none of the three balloons
   carries a dimension). Best-reading identification only.
3. **MS21299** (countersunk washer standard) and **NAS1149** (flat washer
   standard) — both already known-absent gaps from the other three joints,
   confirmed absent again here.
4. **MIL-S-8879** (thread run-out) — same NAS6403-wide gap as every other
   217755 joint in this repo.
5. **AC43.13-1B_w-chg1.pdf** — present in the pile (21 MB scan) but not
   opened; JPS00094 §5.5 already supplied the grip-length definition and the
   §5.5.5 incomplete-thread criterion this stack needed, so the AC was left
   for whoever wants the FAA-side citation too.

With gaps 1 and 2 open, none of the nine per-dash checks can be a real
verdict — each is a `complete: false` budget (SOP Step 5c), reporting how
much combined mass+structure thickness that dash can accommodate. The
worksheet's per-dash table (§ Checks) *is* the reverse-engineered output this
exercise was seeded to produce: once gaps 1–2 are sourced, whichever dash's
budget first exceeds the real combined thickness is the answer.

## Comparison verdict: pending

Jason Ryan's screenshot had **not landed** in
`data/inbox/tolerance_stacks/` as of this session (checked repeatedly,
last at authorship). Per the handoff's own instruction, the stack was built
independently first rather than blocking. The worksheet's comparison section
is explicitly marked pending with instructions for whoever picks it up next:
check which dash Jason's analysis selects against the per-dash budget table,
and use his assumed mass/structure thickness to help close gaps 1–2 (with the
same from-scratch discipline — his numbers may point at what to go source,
they do not themselves become a `traced` citation here, per SOP Step 5b).

## How far 2D-drawing-face data alone carried this stack (for the strategy layer)

**Far enough to fully trace the fastener half of the question, not far enough
to trace the clamped-stack half.** Concretely: 9 of 11 element instances
(the entire NAS6403 grip family) are `traced` straight off the spec-pile PDF's
printed table — a purely 2D read, no 3D model needed, because the standard
itself is a flat table. The other 2 elements (both washers) are `inferred`
from 2D parts-list nomenclature with no traceable band. But the two quantities
that actually decide the answer — balancing-mass thickness and
receiving-structure engagement depth — are **absent from every 2D document in
this repo entirely**: the assembly drawing balloons the mass by weight, not
dimension, and balloons the receiving structure only as a reference (no
dimension at all, because it's a different part's drawing that isn't in this
repo). No 2D face on the 217755 sheet gives either number — they would need
either the individual part drawings (which may or may not exist as 2D
drawings themselves) or a 3D model query ("what is the flange thickness at
this specific tapped-hole boss, on this specific part"). **This is a case
where 2D-drawing-face reading hits a hard ceiling not because the geometry is
ambiguous, but because the referenced part simply isn't drawn in 2D anywhere
this repo can see** — a different failure mode than the pitch-link joint's
gap (missing document, but a document that presumably exists) or the
hub-bearing joint's gap (sourced from part drawings, so no gap at all). If the
strategy layer is weighing a 3D-annotation-surface investment specifically to
close *this kind* of gap, the finding here is: it would need to reach not just
into geometry a 2D sheet omits, but into a **different part's file entirely**
that has no 2D representation in this pipeline at all — a bigger ask than
"read a dimension off a 3D model of the sheet already in hand."

## SOP edit proposals (not applied)

1. **Add a "grip-selection family" pattern to Step 5, alongside Step 5c's
   single-excluded-term budget check.** This joint's fastener is not one
   part number but a table of nine, selected at assembly (note 24). The SOP
   as written assumes one fixed dash per joint and says nothing about how to
   model a family. What worked: one `StackElement` per family member (all
   traced to the same spec table), a single shared `path` for the sourced
   clamped column, and one `complete: false` check per family member —
   producing a per-option budget table rather than a single verdict. Worth
   codifying as a named pattern so the next "select one from options" joint
   doesn't have to invent the shape from scratch.
2. **Step 5c's excluded-terms example shows one missing term; this joint
   needed two** (balancing mass **and** receiving-structure thickness). The
   schema already supports a list with more than one entry — nothing broke —
   but the SOP prose's only worked example (`pitch_link_to_pitch_plate`) has
   exactly one, which reads as though one is the expected count. A one-line
   note that `excluded_terms` may (and often will) hold more than one entry
   would save a future author a moment of "am I doing this right."
3. **Document the "AR" (as-required) quantity convention for hardware
   entries.** Two new entries this session (`MS21299C3`, and all nine
   `NAS6403U*H` bolts) carry `qty: null, qty_raw: "AR"` in `assembly_status`,
   following the shape already used informally by the fastener elements'
   parts-list rows, but the SOP's Step 4 worked examples all show a concrete
   integer `qty`. A one-line note that `qty` is `null`/`qty_raw` is the raw
   string for a part whose count is "as required" (selected at assembly, not
   fixed in the BOM) would remove the guesswork.
4. **Add "search the drawing's own general notes for language matching the
   handoff's" as an identification method, alongside Step 1's count-based
   one.** See the joint-identification lesson above — this is a second,
   faster path to bounding a joint when the handoff quotes or paraphrases
   what turns out to be the drawing's own wording, and the SOP currently only
   documents identification-by-counting.

## Friction hit in the SOP / repo mechanics

- **`hardware_entries.json`'s `description` field and the `library_ref_note`
  on `NAS6403U11D` both carry hand-written counts that a new stack's hardware
  entries silently invalidate**, and the mechanized guard
  (`test_no_live_document_states_an_unguarded_hardware_entry_count`) does
  catch it — but only after the fact, as a test failure, not as guidance
  while writing. Worth a one-line pointer in SOP Step 4 saying "adding
  entries here will very likely require updating this file's own
  `description` and the `library_ref_note` on `NAS6403U11D`; run the suite
  before you think you're done, not after."
- **PROVENANCE.md's byte-identical-row test requires an "Amended again" note
  on every imported file a branch touches**, including test files. This
  session touched two imported files (`hardware_entries.json`,
  `tests/test_tolerance_stack.py`) and the test caught both misses cleanly —
  no friction here, just confirming the guard works as designed on a fifth
  independent sighting.
- **This branch had no tracked `docs/sessions/active/` copy of its own
  handoff.** `git log --oneline HEAD..master` showed the board's
  `staged -> active` commit (`e54868a`) landed only on `master`, after this
  branch's fork point — so the handoff file that seeded this session exists
  in the main checkout's working tree but not in this branch's git history at
  all. Followed the precedent set by `pitch_link_stack`'s finishing commit
  (`b851e04`, which created `docs/sessions/completed/HANDOFF_...md` directly
  with no prior tracked `active/` copy either) and wrote the `completed/`
  copy fresh from the main-checkout handoff's text, in this same commit.

## Drawing-checker read-only invariant

Snapshot taken before touching anything: `5270` entries across
`data/inbox/drawings/` + `data/runs/` (main checkout), timestamp
`2026-08-26T04:12:59Z`. Snapshot taken again at the end:
`5270` entries, `2026-08-26T05:23:21Z`. **Diff: EMPTY — no entry added,
removed or modified.** This session read several drawing-checker runs and
rendered several crops via `debug_trace_stack_values.py --crop`, all of which
write only to this repo's own working directory (`crop.png`, cleaned up
before commit), never into drawing-checker's tree.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q`: **472 passed, 1 skipped**, run
  from this worktree.
- `python -m forge check` against the worktree: OK (1 expected warning about
  running from a linked worktree — re-run from the main checkout before
  trusting the data/code-separation half of that check).
- `scripts/build_viewer_projection.py --data-root C:\workspace\tolstack\data`:
  wrote `results.json` cleanly (worktree was committed and clean at build
  time); the new stack shows `11 elements (9T/2I/0U), 1 paths, 9 checks, 9
  BUDGET-SCOPE, 2 zero-width`.
- `scripts/build_viewer_crops.py` (drawing-checker's venv): 37 of 59
  citations resolved overall; none of this stack's 11 citations are among the
  22 unresolvable ones (those are all spreadsheet-sourced elements in the
  three seeded stacks, pre-existing).

## Left for the next session

- Re-check `data/inbox/tolerance_stacks/` for Jason Ryan's screenshot/xlsx and
  fill in the worksheet's comparison section once it lands.
- Source gaps 1 and 2 (balancing-mass part drawings; the receiving-structure
  drawing) if they become available — this is what would turn the nine
  budget checks into real verdicts.
