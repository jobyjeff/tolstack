# Lessons — pitch_link_stack (worked 2026-08-04)

Handoff: `docs/sessions/completed/HANDOFF_20260803_pitch_link_stack.md`.
Branch: `handoff/pitch_link_stack`, cut from `main`.

Build the **pitch link → pitch plate** grip stack from scratch following
`docs/SOP_TOLERANCE_STACK.md`, sourcing every value or naming the gap. First
consumer of the SOP; the friction report below is deliverable 3.

## What landed

| commit | |
|---|---|
| `d6829f2` | `stack_pitch_link_to_pitch_plate.json`, its worksheet, the `NAS6403U11D` hardware entry + cross-references, 16 new tests, one `kind` comment fix |
| *(this one)* | README, this lesson, handoff → `completed/` |

**The headline: 4 traced / 2 inferred / 0 untraced out of 6 element instances.**
Slice 1 scored 1 of 17. That comparison flatters this session and should be read
with the three caveats in the worksheet's ratio section — chiefly that three of
the four traced values are the NAS6403 bolt, which was sitting in
`data/inbox/specs/` the whole time and which slice 1 (working inside
drawing-checker, before the pile moved) never opened. **Founding this repo around
that pile is what closed the gap; the SOP is what made opening it step one
instead of an afterthought.** The workflow works, but this run is not evidence
that an agent can source values that are not there.

Full results, findings F1–F8, ranked gaps and the traced/inferred count are in
`docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md`. Not repeated here.

## Refused — every value I was tempted to fill and did not

This is the record the handoff asked for explicitly, and the thing Jeff suspected
of the slice-1 agent (`20260803T153839_cwzuzq`: *"I suspect the agent 'cheated' a
bit … the agent lifted/blindly trusted these specs from my excel tolerance stack,
or recalled them from their training data"*).

| value | the number that was right there | why refused |
|---|---|---|
| **spherical bearing / pitch-link eye width** | 11.05–11.10 mm, in `stack_tan_link_to_pitch_plate.json` in the same directory | untraced **workbook** value for a **different link**. Copying it completes the stack and produces a clean verdict. It is now gap 1, and both checks are written as budgets so the hole is visible in the output. |
| **thread run-out / transition allowance** | 1.5875 mm (1/16 in), slice 1's `thread_transition` element | its own `source_ref` says `kind: "assumed"`, *"rule-of-thumb allowance, no cited standard"*. I opened NAS6403 specifically to close it — **it is not in the standard** (see below). No allowance element exists in this stack. |
| **214820-002 bushing length band** | 4.63/4.76 mm, in `hardware_entries.json` | workbook-sourced. See the laundering trap in F7 below. |
| **NAS1149V0332 washer thickness band** | ±.004 in, in `hardware_entries.json` | same. |
| **MS9363-09 nut height + slot geometry** | a "typical" .190-32 hex nut height | not in the pile. It is the one value that would let the *governing* check be written, which is exactly why guessing it would have been the worst place to guess. Gap 2. |
| **NAS6403 grip tolerance ±.010** | I would have recalled it correctly | **not refused, but not recalled either.** It is `traced` because sheet 3's printed column header says `Grip ±.010`. Had the standard been absent it would have been a gap. That distinction is the whole SOP. |

I could not tell, from the inside, that my recollection of ±.010 was right until
I read the header. That is the entire argument for the rule: the confident-recall
and the correct-recall feel identical.

### What NAS6403 does and does not contain

Worth recording precisely, because slice 1 ranked all three of these as one gap:

- **grip ±.010** — sheet 3, printed column header. Definition at sheet 2 note (a):
  *"Grip-length of bolts shall be measured from the underside of head to the end
  of the full cylindrical portion of the shank."* **Closed.**
- **cotter-hole position** — sheet 1 table, `M = .174/.154` in from the point;
  drill `P = .080/.070`; sheet 2 note (j) *"Cotter pin hole centerline: Within
  .010 and normal within 2° of bolt centerline."* **Closed** (with the F1 caveat:
  M's *meaning* is read off the figure, never defined in words).
- **thread run-out length** — **not in the standard.** It dimensions grip (to the
  end of the full cylinder) and length (to the point), and prints `T (Ref) = .323`
  between them, but never dimensions the transition. The document that would
  close it is **MIL-S-8879** (the thread spec sheet 1 invokes for UNJF-3A), which
  is not in the pile. Still open.

Also free from the standard: the part-number decode (sheet 2 CODE block —
`U` = unplated, `D` after the dash = **drilled shank**, dash = grip in .0625
increments), which settles *from the part number alone* that this joint is
cotter-retained through the shank.

And a bonus that cost nothing: **JPS00094 Rev C** turns the castellated-nut
caveat from an assertion into a citation. §5.9.7 *Castle Nuts* says in as many
words that if the cotter hole and the castellation do not align you *"change/add
a washer or a different nut, and try again"*, with a footnote that nuts vary in
manufactured thread-start-to-castellation spacing; §5.5.3.a caps the remedy at
three washers; §5.5.5 supplies the shank-out criterion (*"The nut … shall not
engage any incomplete threads of the bolt shank"*). Slice 1's F8/F16 had to argue
this from first principles.

## SOP friction report — 13 proposed edits

The handoff says **propose, do not edit**. Nothing below has been applied to
`docs/SOP_TOLERANCE_STACK.md`. Ordered by how much time each cost.

### 1. Step 3: the spec pile is **not in the worktree** — highest-cost error

Step 3 item 1 says *"A spec or datasheet in `data/inbox/specs/`. Check here first
— 42 files"* and gives a repo-relative path. **From a worktree that path holds
one tracked `README.md` and nothing else.** `data/` is gitignored by the forge
convention, so the 42 PDFs exist only in the main checkout. A dispatch-launched
agent's cwd is always a worktree.

> **Proposed edit** — Step 3 item 1, first sentence:
> *"The spec pile is untracked data and therefore lives only in the **main
> checkout**: read it at `C:\workspace\tolstack\data\inbox\specs\`, not at
> `data/inbox/specs/` — from your worktree that directory holds only its tracked
> `README.md`. Cite it as `data/inbox/specs/<filename>` regardless of where you
> read it. Same for `data/inbox/tolerance_stacks/`."*

Related but distinct from the already-filed
`docs/issues/ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md`
(that one is about tracked per-stream docs being dropped); not re-filed.

### 2. Step 1: resolve the joint's **identity** before any number

The handoff named the joint "pitch link → pitch plate". **No part in the 217755
parts list is named "pitch link."** Bounding the joint took the largest single
share of this session, and the SOP's Step 1 assumes you already know which
features you are stacking.

The method that worked, and that the SOP should state, is **counting**:
the balloon prefix (`5X 38`), the parts-list qty (5), the place count in the
view, the blade count (five, from sheet 2's front view), and the matching `nX`
callout group on the part drawing (`5X 4.06 ±0.10`). Four independent counts
agreeing is what makes the identification defensible; matching on the *value*
4.06 alone gets you to "one of three" (the SOP's own trap 11).

> **Proposed edit** — new paragraph at the top of Step 1:
> *"If the handoff names the joint in words that do not appear in the parts list,
> resolve the identity **first** and write the argument into the worksheet as an
> explicitly `inferred` claim. Resolve it by **count**, not by value: the balloon
> `nX` prefix, the parts-list qty, the number of places in the view, the
> feature count on the part drawing (`3X` / `5X` / `1X` groups), and any physical
> count that constrains it (blades, links, lugs). Agreeing counts are evidence; a
> matching dimension is not. Do not start on numbers until the joint is bounded —
> a stack of correct values for the wrong joint re-derives perfectly."*

### 3. Step 2: `nominal` when the source states **limits only**

Trap 2 and Step 2 are emphatic: *"`nominal` is not the midpoint. Do not compute
it. Transcribe it."* A NAS dimension table prints `M = .174 / .154` and has **no
nominal column**. The rule as written has no legal move; the schema requires the
field.

> **Proposed edit** — Step 2, "`nominal` is not the midpoint", add:
> *"That rule is about sources that **have** a nominal column — a hand-built
> workbook's nominal carries information, and computing over the top of one
> destroys a finding. A standard's dimension table usually does not: it prints
> limits (`.174 / .154`) and nothing else. There, `nominal` **is** the midpoint,
> and the element's `note` must say the value was computed and why. Note also
> that a basic size with a symmetric tolerance in a column header (`Grip ±.010`,
> `LENGTH ±.015`) or on a drawing (`4.06 ±0.10`) **is** a transcribed nominal —
> the symmetry is the source's, not yours."*

### 4. New Step 5c: what to do when an element cannot be sourced **at all**

The SOP says *"a gap with no number is a perfectly good result"* and stops there.
It never says how to **shape the stack** around a missing element, and the two
available shapes are not equivalent: omit the element and let the checks be
quietly wrong, or omit it and write the checks so the missing value appears as an
explicit budget. This session did the second and it is the more useful artifact —
`shank_out__11_sourced_only` reports −7.4859 … −8.1939 mm, and that deficit **is**
the required pitch-link eye width. One document flips the check.

> **Proposed edit** — new "Step 5c — when an element cannot be sourced at all":
> *"Never create a placeholder element. Omit it, and then write the check anyway
> over the members you do have, so the shortfall is the missing value:*
> - *put `INCOMPLETE — <what is missing>` in the check `label`;*
> - *in `guidance`, say what the magnitude means and which document closes it;*
> - *expect a verdict that is `fail` or `pass` **by construction**. That verdict
>   is not a design conclusion and the worksheet must say so **next to the
>   number**, in the same place and for the same reason as the castellated-nut
>   caveat;*
> - *add the omitted element to `gaps` as item 1.*
>
> *A check with a hole in it, labelled, beats a check with a guess in it."*

### 5. Step 2: **zero-width bands** — nominal sourced, band not

Not covered anywhere. Slice 1 never hit it because the workbook always supplied
*some* band. Two of six elements here have a sourced nominal (parts-list
nomenclature) and no band in any document.

> **Proposed edit** — Step 2, after "Every element gets a `source_ref`":
> *"**If the nominal is sourced and the band is not**, set
> `min == max == nominal`, put `ZERO-WIDTH BAND` in the element's `note`, list the
> band as a gap, and state in the worksheet that **every worst-case interval is
> therefore a lower bound on the true spread** (and every RSS half-range likewise
> understates it). Do not substitute a plausible band. A zero-width band is a
> visible lie the reader can price; a plausible band is an invisible one."*

### 6. Step 5b: the **transitive** workbook ban — `hardware_entries.json` launders

The sharpest trap of the session, and it is invisible. Step 5b says a
from-scratch stack must show `kind: "workbook"` **zero** times. But
`hardware_entries.json` is an in-repo design artifact that *looks* like a
legitimate source — and most of its inline numbers are slice 1's transcriptions
of the 260729 workbook. Citing the hardware entry for the 214820-002 length band
would have shown `kind: "parts_list"`, `confidence: "inferred"`, zero workbook
references, and **laundered an untraced workbook value into the stack**. It would
have passed every test and every mechanical checklist item in the repo.

> **Proposed edit** — Step 5b table, new row, plus a bold sentence in Step 4:
> *"`hardware_entries.json` inline values are **not** a source. Most of them are
> slice-1 workbook transcriptions; an entry's `values_status: \"inline\"` says
> where the numbers live, not where they came from. Check each one's origin before
> reusing it, and treat a workbook-derived band as forbidden here exactly as if
> you had read it out of the xlsx yourself."*

### 7. `hardware_entry/v0` cannot cite its own source

Which is what makes edit 6 necessary. Elements carry a mandatory `source_ref`;
hardware entries carry nothing. Now that entries can hold *traced* standard
values (the new `NAS6403U11D`) beside *untraced* workbook ones (`214820-002`),
`values_status: "inline"` no longer distinguishes them — in a repo whose entire
purpose is provenance.

> **Proposed schema change** (additive, breaks nothing): add **`values_source`**,
> a `source_ref`-shaped dict, to `hardware_entry/v0`, and require it whenever
> `values_status == "inline"`. Provisionally added to the `NAS6403U11D` entry with
> a test (`test_the_nas6403_entry_cites_the_standard_its_inline_values_came_from`);
> the other twelve entries do not have it yet, so the requirement is **not** yet
> enforced repo-wide. Backfilling them is a small, mechanical follow-up: every
> one is either the 260729 workbook or the 217755 parts list.

### 8. `kind: "spec"` was mandated by the SOP and rejected by the code

The SOP says *"Use `spec` for a file in `data/inbox/specs/`"*. `SourceRef`'s
inline comment listed five kinds without it, and
`test_source_ref_leaves_the_feature_identity_slot_open_and_empty`'s whitelist
omitted it too — so the moment a compliant from-scratch stack was added to that
test's parametrize list, it failed. **A vocabulary the SOP requires must exist in
the test that enforces the vocabulary.** Fixed both in `d6829f2` (comment +
whitelist); the SOP needs a pointer so the next new kind lands in all three
places.

> **Proposed edit** — Step 2, after the `kind` list: *"The enforcing list is
> `tests/test_tolerance_stack.py::test_source_ref_leaves_the_feature_identity_slot_open_and_empty`
> and the comment on `SourceRef.kind`. A new kind must be added to all three or
> the SOP is describing something the suite rejects."*

Same class of drift as the `role` list omitting `nut_geometry`, which the review
checklist already tracks as a recurring bug. Not fixed here (out of scope,
already filed).

### 9. Step 5: the RSS caveat list is missing a third kind

Step 5 names two element kinds that quadrature-about-the-midpoint misrepresents:
`role: "allowance"` and one-sided bands. **A zero-width band is a third, and the
worst** — RSS treats an unknown band as a *certainty*, so the RSS columns are
understated by an unknown amount rather than merely non-probabilistic.

> **Proposed edit** — Step 5, "state what RSS does not claim", third bullet:
> *"a zero-width band (Step 2) is not a tight band, it is an **unknown** one. RSS
> reads it as zero variance, so the RSS half-range is understated, not just
> uninterpretable."*

A fourth, narrower one from this stack (worksheet F5): `bolt_length_11` and
`bolt_grip_11` are **not independent** — `T = length − grip` is a *reference*
dimension per NAS6403 sheet 2 note (b), so `fold()` stacks two tolerances that
the real part cannot both carry. Fixing that would require correlation in
`fold()`, i.e. a second arithmetic path, which the architecture forbids. Recorded
as a limitation, not worked around.

### 10. REVIEW_AGENT §3: `max == mmc` everywhere has no legitimate exit

The checklist says *"If a stack has `max == mmc` on every element without
exception, that is a smell."* A joint with **no subtracted material feature** —
no chamfer, no relief, no counterbore — has exactly that, legitimately. This one
does.

> **Proposed edit** — `docs/prompts/REVIEW_AGENT.md` §3, end: *"…unless the joint
> contains no subtracted material feature at all, in which case the author must
> state that explicitly and the reviewer should confirm it by looking for a
> chamfer/relief/counterbore in the view. Absence of the smell's cause is not
> absence of the check."* Stated in this stack's `notes` and pinned by
> `test_pitch_link_no_stack_element_is_folded_from_lmc_or_mmc`.

### 11. Step 2/3: a printed-zone citation **expires between exports**

Trap 10 says cite the printed border zone, not the synthetic grid. Correct, and
incomplete: the printed zone of the *same view* on the *same revision* moves
between exports. DETAIL B is at printed **I6** on the 2026-JUL-23 POST export
(slice 1's citation) and printed **H3** on the 2026-AUG-3 export (this one). Both
are right for their own file.

> **Proposed edit** — Step 2, `source_ref` section: *"A zone is only re-findable
> against the **export** you read it on. Name the export (PDF filename or
> drawing-checker run id) alongside the zone. `source_ref` has no field for it
> yet — put it in the stack's `joint` block and in the worksheet until it does.
> This is the cleanest argument in the repo for why `element_id` exists: a stable
> extracted-element address survives a re-export; a zone label demonstrably does
> not."*

### 12. Step 3 traps: balloon `nX` prefixes are not in the extraction

The traps list `item_no` vs `find_no` (trap 9) but not this one: the `8X` / `5X` /
`3X` multipliers printed beside a balloon are **separate text runs**, absent from
`*_balloons.json`'s balloon records, which all read `qty: 1, view_places: 1`.
`check_quantities.quantity_rollup` therefore reports `qty_match: False` for every
multi-place part in a detail — six of them in DETAIL B — which reads exactly like
a real balloon-quantity finding. It is not. And the `3 + 5 = 8` arithmetic that
identifies this joint *depends* on those prefixes, so they have to be read off
the PDF by hand.

> **Proposed edit** — Step 3, new trap: *"**A balloon's `nX` prefix is not in the
> extraction.** Every balloon record reads `qty: 1`; the multiplier is a separate
> text run beside it, so `quantity_rollup` will report `qty_match: False` for
> every multi-place part in a detail. Read the prefixes off the PDF
> (`debug_trace_stack_values.py --pattern \"^\\d+X\"` — some runs read as `8X 14`,
> a multiplier and a flag-note number in one text run, so do not anchor the end).
> You will need them: the
> place count is how a joint is identified (Step 1)."*

### 13. Small ones

- **Step 0 pins a test count** (*"expect 34 passed"*). It is 50 now, and the
  review checklist already lists stale inventory numbers as a recurring bug.
  Proposed: *"expect a green suite"* and no number.
- **Step 3 item 2 does not say where the part drawings are.** 215197 — the only
  part drawing either slice has traced anything to — is **not** in
  `drawing-checker/data/inbox/drawings/`. It is at
  `C:\workspace\drawing-checker\tests\fixtures\drawings\[PRELIM 2025-MAY-22] 215197 A.1.pdf`.
  Proposed: name that path in Step 3, and note that the run directories hold
  *page images and extracted JSON*, not always the PDF.
- **Step 3 does not mention `--crop`.** `debug_trace_stack_values.py --crop
  "<page>,<cx>,<cy>,<half>" --zoom 8` renders a high-resolution crop of an
  assembly view, which is the only way to read what a joint physically consists
  of. It is the single most useful tool in the repo for Step 1 and the usage
  block does not mention it.

## Notes for the next agent

- **Reading a photocopied standard.** No text layer, so `page.get_text()` returns
  empty and grep is useless. What worked: `fitz` → `get_pixmap(Matrix(2.2, 2.2))`
  for a whole page (legible for prose and for spotting where the tables are),
  then `Matrix(6..8)` with a `clip=fitz.Rect(...)` on the specific table row or
  figure region. A 4-page standard cost about six renders. Read the **notes sheet
  before the dimension table** — sheet 2's lettered notes are what tell you that
  `X` and `Y` are locking-element regions and not the cotter hole.
- **`JPS00094` has a text layer** (37 pages, greppable) — unusual in this pile,
  and it is the process spec that supplies *criteria* rather than dimensions.
  Worth grepping early for `grip|cotter|castellat|protrus|shank`; §5.5 and §5.9.7
  are the sections a grip stack needs. `JPS00078` (bearings/bushings) and
  `JPS00176` (interference fits) are the next candidates and were not read.
- **`MS9363` is the single next document.** It now blocks two joints, and the
  bolt half of the alignment problem is closed, so it is the only thing between
  the repo and *answering* a cotter-retained joint the way it is actually built.
  Needed: nut height, slot count, slot depth. It is **not** in
  `data/inbox/specs/`. Same for **NAS1149** and **MIL-S-8879**.
- **Five blades.** 217755's propeller has five blades (sheet 2 front view), three
  anti-rotation links, one VPA. Nearly every `nX` on the drawing resolves to one
  of `1 / 3 / 5 / 8 (=3+5) / 15 (=5×3)`. That table is a fast sanity check on any
  place-count claim.
- **Don't trust `parts_list` qty as a place count** — find 32's qty is 9 while
  DETAIL B prints `8X`, find 33/36 are 11 against `8X`. The extra ones are
  elsewhere on the assembly.
- **`docs/reference/` is a verbatim import** and was not touched. `data/inbox/specs/`
  is append-only and was not touched — nothing renamed, nothing deduplicated.
  Nothing was written into drawing-checker; `git status` there is unchanged.

## Decisions the handoff left open

- **Which joint.** The 5-place one in DETAIL B (`NAS6403U11D`), identified by four
  agreeing counts. The full argument is in the worksheet and in the stack's
  `joint.identification_note`, flagged `inferred`. If it is wrong, it is wrong
  loudly and in one place.
- **The unsourced bearing width becomes a budget, not an element.** Two checks
  written so the missing value is the visible shortfall. Proposed as SOP Step 5c
  (edit 4).
- **Zero-width bands** for the bushing and washer rather than borrowing
  `hardware_entries.json`'s workbook-derived bands (edit 6). Pinned by a test so
  a later tidy-up cannot quietly fill them.
- **`values_source`** added to one hardware entry as a proposal (edit 7), not
  backfilled across the other twelve.
- **Code touched, minimally and once**: the `kind` comment on `SourceRef` and the
  test whitelist, both to admit `spec`, which the SOP already mandated (edit 8).
  `fold()` is untouched and still reads `min`/`max` only.
- **The SOP itself was not edited** — the handoff says propose. All 13 edits above
  are proposals. Applying them is somebody's next handoff, and it should be a
  cheap one.
- **`test_the_only_traced_part_drawing_value_is_the_pitch_plate_flange`** (slice 1's)
  is left as-is. It is scoped to `tan_link` so it still passes, but its docstring's
  claim that *"everything else is a fastener-library gap"* is now false repo-wide.
  Left alone rather than rewritten, because it is a slice-1 provenance assertion.
