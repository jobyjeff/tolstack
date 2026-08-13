# Review checklist — tolstack

<!-- OVERLAY. dispatch composes this file onto the END of its canonical
     REVIEW_AGENT.md at launch, under "Repo-specific additions". Hold ONLY
     repo-specific knowledge here: the canonical process (severity vocabulary,
     the report file, integrate-on-APPROVE, file-don't-fix, universal checks)
     arrives above and must NOT be restated -- a restated copy drifts, which is
     why this file was split out of a full canonical copy on 2026-08-05
     (dispatch handoff prompt_composition_worktree). The review agent owns this
     file: edit it in your review WORKTREE and commit it on your review branch. -->

Everything under "The mandatory checks" is **additional and mandatory** when the
work under review is a tolerance stack.

The stack author was following `docs/SOP_TOLERANCE_STACK.md`. Read it first: it
is what they were told to do, and a gap between the SOP and what a competent
author produced is a finding **against the SOP**, which you should report as
such.

## Why this checklist exists

> **Every single tolerance must trace to an actual specification or drawing
> callout. Nothing invented.** — Jeff, verbatim, on founding this repo.

That is the reason to review a stack at all. An agent-built stack is fluent by
construction: correct JSON, plausible digits, confident prose, arithmetic that
re-derives perfectly — and a fastener tolerance that came out of the model's
training data rather than a document. Nothing downstream can detect that. **You
are the only check.**

So the review is not primarily an arithmetic review. The arithmetic is pinned by
tests. The review is a **provenance audit**, and its central question is: for each
number, *which document says so, and did the author actually open it?*

---

## The mandatory checks

Every one of these must be explicitly addressed in your review — including the
ones that pass. "Not mentioned" is not "checked".

### 1. Every tolerance traces to a specification or drawing callout

For **every** element value, verify:

- a `source_ref` exists, with `confidence` ∈ `traced | inferred | untraced`;
- the `document` named actually **exists** — a file in `data/inbox/specs/`, a
  drawing in a drawing-checker run, or the source workbook. Open it. A citation
  to a document that is not there is worse than no citation, because it reads as
  diligence;
- the `callout` text matches what the document says, and the `sheet`/`zone`/`view`
  address actually leads there — **on the export the citation names**. Since
  `citation_export_provenance` (2026-08-06) every `drawing`/`parts_list`
  `source_ref` carries `export` (`SourceExport`), and its identity is `sha256`,
  not the filename: Jeff re-exports over the same name and a printed zone is not
  stable between exports of one revision. **Re-hash every established export
  yourself** — a one-line walk over the stack files, and it is the only thing
  standing between a citation and a crop of the wrong revision that looks
  perfectly correct. Then check the *claims around* the hash, which no test
  reads: that `runs` lists exactly the drawing-checker runs whose recorded input
  sha equals it (`data/runs.jsonl`, not `run_meta.json` — runs before
  `20260730_161157` have no `inputs` key), that `runs: []` means no run consumed
  the file rather than nobody looked, and that the chain in `export.note`
  re-walks. An `unestablished` export is the honest answer and is enforced from
  both sides; a *plausible* run id is the failure this field exists to prevent;
- a `drawing`/`parts_list` export naming a PDF **outside this repo** is a
  should-fix, not a pass: SOP Step 3 says copy the file into
  `data/inbox/drawings/` and cite it repo-relative, with a `PROVENANCE.md` row.
  The three 215197 citations still point into drawing-checker's
  `tests/fixtures/drawings/` (the only copy in existence) — another repo's test
  fixture as production provenance. Check whether that is still true;
- `confidence` is **honest**. Downgrade aggressively:
  - a value from a parts-list part number, with the tolerance band coming from
    somewhere else, is **`inferred`** — not `traced`. `kind: "parts_list"` with
    `confidence: "traced"` has **no legitimate form**: a parts list carries a
    nominal and never a band. Three seeded elements sat that way for a month,
    each admitting it in its own `note`, so a test now enforces it
    (`test_no_traced_element_cites_a_parts_list`). **Read the `note` against the
    field** — where they disagree, the field is what downstream reads and the
    note is where the author told you the truth;
  - a value whose only support is "the source workbook says so" is
    **`untraced`** — no matter how reasonable it looks. Three seeded elements sat
    at `kind: "workbook"` / `inferred` for a month, one of them with a `note`
    that ended *"the +/-.004 is untraced"*, so this corner is now partly
    mechanised too:
    `test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered`.
    **Read what it does not cover.** It is an *allowlist*, not an implication —
    `kind` says which document the numbers were transcribed from, and real
    corroboration can arrive from a different document named only in the `note`
    (`hub_bearing_thermal_fit_m1`'s two hub bores are the registered case). So
    two questions stay yours: is a registered exception's argument still true,
    and does any `workbook` element's `note` claim support the field does not
    admit? The test sees the field. Only you can read the note against it;
  - `traced` requires the actual band to be in the cited document.

**Specifically hunt for invented numbers.** The failure mode is a `traced` or
`inferred` value whose band has no document behind it. Standard-part dimensions
(NAS/MS/SAE grip lengths, thread run-outs, washer thicknesses, cotter-hole
positions) are the highest-risk values in any stack, because they are exactly
what a model reproduces confidently and wrongly. For each such value ask: *is
this standard actually in `data/inbox/specs/`?* If not, the value must be
`untraced` and listed as a gap. If the author wrote a number with no cited
document, that is the most serious finding you can file — report it as blocking.

### 2. Signs on every path term

Check **every term** of **every** path and check, one at a time, against the
physical direction of the feature. A subtracted feature (chamfer, relief,
counterbore) needs `"sign": -1`.

A wrong sign produces a total that is off by twice a small number and is
otherwise completely plausible. There is no way to catch it except by reading each
term. The repo's design deliberately puts every sign in one place — signed term
lists folded by one `fold()` — precisely so this check is finite. Do it.

Also verify: a `path` term nested in a check has its sign multiplied through
correctly, and no element is double-counted across a path and a check that also
includes it directly. Slice 1's F3 is the live example — a blank source cell that
is *deliberate* de-duplication, where "fixing" it double-counts 1.575 mm.

**And check the direction of the prose, not just of the terms.** A sign can also
be wrong *outside* the term list, in the sentence that interprets the result —
where no test is looking. The specific case: a check written as a **budget** for a
missing element (an `INCOMPLETE`-labelled check, per the SOP's Step 5c) has a
deficit interval whose two ends look symmetric and mean opposite things, and the
worksheet converts one of them into "the width the joint requires". For
`column − grip ≥ 0` the **binding** requirement is grip at `max` against the
column at `min` — the **larger** magnitude. The smaller one is where the check
fails even at its most favourable, and quoting it as the worst-case requirement
understates the requirement. Sighted in `pitch_link_stack`, which quoted
7.4859 mm where 8.1939 mm binds — 0.708 mm, in the stack's headline number, with
every folded value correct and every test green. Read the requirement sentence
against the interval, and check a test pins which end binds.

**If the stack's `checks` array is empty, the signs are not in the file.** Since
`hub_bearing_thermal_stack` (2026-08-05) one archetype **generates** its checks
from a `thermal_fit` block, and `load_thermal_fit_stack()` *refuses* a
hand-written one — so this check cannot be done by reading the JSON, and reading
the JSON will tell you there are no terms at all. Run
`venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms --markdown`
and read that table row by row instead; the worksheet appendix is a paste of it,
so also diff the two rather than trusting the paste. What to check per row is
archetype-specific and stated in `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`;
for `thermal_fit` it is: sleeve bore and wall `+1`, hub bore `-1` at stage 1; the
wall's coefficient exactly twice the bore's (diametral) and `2k` times it at
stage 2; every coefficient exactly `1`/`2`/`k`/`2k`/`1-k` at the reference
temperature, where the soak factors drop out; and cold coefficients below their
room values with hot above, the fastest-CTE member always furthest from room.

### 2b. Coherent material corners are not a worst-case fold

New with the `thermal_fit` archetype and **general to any transcription**. A
hand-built spreadsheet evaluates *coherent corners* — every feature at LMC at
once, or every feature at MMC. `fold()` takes each feature to its own worst limit
independently. They coincide only when every term's weight sign agrees with the
direction its material condition moves it; if any term disagrees, the
spreadsheet's column is **narrower than the truth** and the gap is the disagreeing
features' tolerance widths. Two features of one part entering on the same sign is
the smell (a derived dimension built from two independently-toleranced ones — here
a sleeve OD as `bore + 2×wall`). Do not let a re-derivation delta of this kind be
written off as a transcription error: check whether it is methodological, and
whether it moves a verdict. It did here — 0.05003 mm at every stage-1 corner.

### 3. LMC/MMC direction, per element

For each element carrying `lmc`/`mmc`, confirm the mapping to `min`/`max` is
right **for that element's direction in the stack**:

- an element that **adds** to the stack: MMC (most material) → `max`;
- an element that is **subtracted**: the mapping **inverts** — LMC is the larger
  length;
- an **internal** feature (a bore, a counterbore): MMC → the *smaller* diameter.

The seeded reference cases: the tan-link bushing chamfer has **LMC 0.889 > MMC
0.635** and is subtracted; the take-2 nut minor diameter has **MMC 4.05 < LMC
4.25** and is internal. If a stack has `max == mmc` on every element without
exception, that is a smell — check whether an inverting element was folded the
naive way.

There is one legitimate exit, and it must be *earned*: a joint containing **no
subtracted material feature at all** — no chamfer, no relief, no counterbore —
has `max == mmc` everywhere correctly. `pitch_link_to_pitch_plate` is the live
example. Absence of the smell's cause is not absence of the check, so require
both: the author states the absence explicitly, and **you** confirm it by looking
for a chamfer/relief/counterbore in the view and by checking that the only
negative signs in the file are on whole-element or whole-path subtractions.

Confirm also that `fold()` was not modified to read `lmc`/`mmc`. It must read
`min`/`max` only.

### 4. RSS actually computed

Not labelled. **Computed**, present in the output, with a number in it.

Slice 1's F2 was a row labelled `rss` carrying no formula, and it shipped. It
mattered: `threads_in_bore__13` is −0.366 worst case but **−0.0295 at RSS**.

Verify:

- every check reports **nominal, worst case, and RSS** — all three, as one set.
  A stack reporting only worst case fails this check (F11: the VPA stack's
  worst-case columns straddle zero and look unremarkable, while the nominal it
  never computed is −0.0824, already failing);
- no **verdict** reads RSS. Verdicts are computed from nominal and worst-case
  minimum only;
- the worksheet **states what RSS does not claim** — that quadrature about the
  midpoint assumes independent, symmetric, equal-confidence bands, which
  `role: "allowance"` elements and one-sided bands are not, so RSS is a relative
  softening indicator and not a probability statement. If a stack contains an
  allowance element or a one-sided band and the worksheet presents RSS without
  that caveat, that is a finding.

### 5. Nominal inside its own min/max

For every element, check `min <= nominal <= max` (F1).

Where it does **not** hold, the correct outcome is a **recorded finding**, not a
corrected number — `nominal` is transcribed as-is, and the seeded stacks have two
genuine rounding cases plus a thread transition whose "nominal" *is* its maximum.
So verify both directions:

- the invariant holds, **or** the violation is explicitly recorded as a finding;
- the author did not silently "fix" a transcribed nominal to make it hold. A
  transcription changed to satisfy an invariant is a falsified source, and the
  re-derivation table will still show a clean match — so compare against the
  source cells, not just internal consistency.

Also confirm the author did not compute `nominal` as a midpoint.

### 6. Quantised constraints modelled where cotter/castellation hardware appears

Scan the joint's hardware for a **slotted or castellated nut** (MS9363 and
friends) or a **cotter pin** (MS24665). If either is present:

- the worksheet must state that the governing constraint is
  **castellation-slot vs cotter-hole alignment**, which *quantises* acceptable
  grip rather than bounding it, so a continuous-grip interval does **not** settle
  the joint (F8, F16);
- that statement must sit **next to the numbers**, not buried in a gaps section.
  The specific failure to prevent is a clean-looking interval implying a resolved
  joint;
- the documents that would close it must be named: the nut's slot count and
  depth, and the bolt's cotter-hole position;
- transcribed-but-unused nut geometry is *correct* and should stay, referenced by
  nothing.

A stack over cotter-retained hardware that presents a grip verdict as *the*
answer fails this check regardless of how right the arithmetic is.

### 7. Report the traced / inferred / untraced ratio

Your review must **state the count**, computed by you, not copied from the
worksheet:

> *N traced / M inferred / K untraced, out of T element instances.*

**The definition of that ratio lives in one place** —
`docs/SOP_TOLERANCE_STACK.md`, "The traced ratio" — and this checklist
deliberately does not restate it. Read it there, then compute with
`tests\debug_report_tolerance_stacks.py --ratio`. The short version: instances
(not distinct ids), a named set of stacks, and `traced` means *the band is in
the cited document*.

Then check that every `untraced` value appears in the stack's **explicitly listed
gaps**. An `untraced` value not listed as a gap is a violation of the SOP's one
rule — the stack is claiming completeness it does not have.

For calibration: the three seeded slice-1 stacks trace **5 of 26 element
instances** (3 inferred, 18 untraced), and reporting that plainly was the most
valuable thing slice 1 produced. A stack claiming a much better ratio deserves
proportionally more scrutiny per `traced` value, not less. **A high traced count
is a reason to audit harder, not a reason to relax** — it is what an invented
number looks like from the outside.

> **Correction, 2026-08-06.** This paragraph read *"slice 1 traced 1 of 17"*
> from 2026-07-29 until 2026-08-06, and every document in the repo quoted it.
> Neither half reproduced: the denominator dropped `take2` (11 + 6 = 17 of 26),
> and the numerator counted only the value traced to a *part drawing* while the
> JSON said four elements were `traced` — three of them on parts-list citations
> that check 1 forbids. Handoff `traced_labels_and_ratio` re-cited two of those
> three to the NAS6403 standard, downgraded the third, and pinned the result.
> **The lesson for a reviewer: the ratio is the one number in a review that a
> reader will re-use without re-deriving, so it is the one you must re-derive.**

**Count the values that are not elements, separately, and demand them.** An
element-only ratio flatters any archetype whose answer rests on numbers a
`StackElement` cannot hold — material properties, temperature scenarios,
dimensionless ratios. `hub_bearing_thermal_stack` traced **12 of 16 element
instances** (Jeff supplied five released part drawings) and **0 of 7** non-element
values: three CTEs, two operating temperatures, two stiffness ratios. Quoting the
first alone would have been true and misleading. So: enumerate every number any
check consumes, find where each one's `source_ref` lives (a `materials.json`
entry, a `temperature_source` key, a per-chain `stiffness_ratio.source_ref` — there
is no single home yet), and state both ratios. **Recalled material properties are
prohibited on the same footing as recalled fastener dimensions**, and they are
*more* dangerous: they are more widely tabulated, so a model reproduces them more
fluently. CINDAS is the source of record for this repo (Jeff, 2026-08-05);
Google-sourced or recalled CTE is an invented number and blocks the merge. Check
also that a gap-closing *instruction* cannot launder a guess — a CINDAS pull for
an unconfirmed alloy comes back wearing `confidence: "traced"`, so the material
must be confirmed before the property is looked up.

---

## Also verify

- **Tests.** `venv-win\Scripts\python.exe -m pytest -q` green, and re-run it
  yourself rather than trusting the report. New source-derived numbers carry the
  source cell reference in a comment (`# JEFF E18`), which is what makes the suite
  a transcription check rather than a self-consistency check. A new stack with no
  new tests pinning its numbers is incomplete.
- **The re-derivation table** covers every result cell the source computes, at
  full precision. Deltas ~1e-15 are float summation order. Anything larger is a
  real disagreement that must be a recorded finding, not a rounded-away one — but
  see check 2b: a delta can be a **method** difference rather than a transcription
  error, and hunting for the latter will waste your time. Recount the cell counts a
  re-derivation asserts; they are checkable in one pass over the sheet XML
  (`hub_bearing_thermal_stack`'s 427 formula / 480 numeric were both exact).
- **`materials.json` (`material_entry/v0`), if the work has one.** Same hygiene as
  `hardware_entry`: `values_status` ∈ `inline | library | not_transcribed`,
  `library_ref` null until a materials library exists, `values_source` mandatory
  when inline, `gaps` non-empty. Its own addition is **`designation_source`
  separate from `values_source`** — a material's *name* and its *numbers* have
  different provenance, and conflating them is how a drawing-traced alloy name
  lends credibility to a spreadsheet CTE. Check both fields separately, and check
  `cte_temperature_range_c` is `null` when the source states no range: writing one
  in invents a provenance detail, which is worse than an untraced number because it
  makes the citation look complete.
- **The archetype's own caveat, next to the numbers.** Check 6's castellated-nut
  rule generalises: every archetype has a question its arithmetic does not settle,
  and it must be stated where the results are, not in a gaps section. For
  `thermal_fit` it is that **a dimensional interference is not a torque capacity** —
  contact pressure, friction and hoop stress are all outside it, so a `pass` is
  necessary and not sufficient. If a stack's joint has no cotter/castellation
  hardware, check 6 exits — but require the *analogous* caveat rather than none.
- **Schema hygiene.** `element_id` / `run_id` null; every hardware entry's `gaps`
  non-empty; every `hardware_ref` resolves; `values_status` ∈
  `inline | library | not_transcribed`; the `schema` string present and `/v0`.
  `library_ref` is **no longer always null** — since 2026-08-05 (`spec_library_v0`)
  `NAS6403U11D` carries `spec_library:NAS6403U11D`. The invariant is now the
  *pairing*: a filled ref ⟺ `values_status == "library"`, and a `library` entry
  keeps its `values_source` because its inline numbers survive as a cross-check.
- **`values_source` on every inline hardware entry** (SOP Step 4, mandatory since
  2026-08-05), null when `values_status` is `not_transcribed`. Then use it: if a
  stack element takes a **band** from an entry whose `values_source` is
  `kind: "workbook"`, that is a laundered untraced value and Step 5b forbids it
  in a from-scratch stack, however clean the element's own `source_ref` looks.
  **Recount before you quote a share here**: this line said *"eight of the nine"*
  until 2026-08-11 and it was five of eleven by then
  (`fastener_citations_and_confidence` re-sourced three bolts on 2026-08-10) — so
  it is no longer even a majority, and the "common case" argument weakens with it.
  The one computing place is
  `test_hardware_entry_values_source_counts_match_the_description`, which pins
  `hardware_entries.json`'s own `description`; read the count there, and treat a
  workbook-sourced band as the failure to hunt regardless of how many there are.
  Since 2026-08-12 (`hardware_counts_doc_guard`) a second test,
  `test_no_live_document_states_an_unguarded_hardware_entry_count`, recounts these
  counts **wherever they live** — every live `.md` plus the `.json` under `docs/`.
  Know its blind spots before you treat its green as "the prose was checked":
  it matches the claim *shapes* the repo has already written (`_COUNT_CLAIMS`), so
  new phrasing is invisible; a number inside a blockquote or a `"…"` span is exempt
  by design; and `docs/sessions/`, `docs/issues/`, `docs/reference/`,
  `PROVENANCE.md` and `CLAUDE.md` are out of scope as dated history.
- **Checks the source does not contain** are marked `workbook_cells: null` and
  `[NOT IN WORKBOOK]` in the label, with a test asserting it.
- **Scope is stated**, including what was excluded and why.
- **Findings use the diagnosis codes** `[slip] [read] [model] [drift]`, and
  `[read]` findings — the author's own resolved misreadings — are present. Their
  absence is mildly suspicious: slice 1's two most reusable notes were of exactly
  that kind, and an author who hit none probably did not transcribe much.
- **Mismatches against the drawings are recorded as findings**, not reconciled
  away. If the author "corrected" the source to match a drawing, that is a
  finding against the author.
- **`data/inbox/specs/` was not reorganised.** It is append-only: no renames, no
  de-duplication, no tidying. Check the diff and the filesystem.
- **Nothing was written into drawing-checker.** The dependency is read-only and
  one-way — and it is checked with the session's snapshot diff and the cited
  runs' timestamps, **not** with `git status` over there. See the architectural
  entry below for what that check has to consist of.
- **`confidence` against `kind`, on every element, not just the `traced` ones.**
  Since 2026-08-06 a test forbids `traced` + `kind: "parts_list"`, so that corner
  is mechanised and you can skip it. The corner that is *not* mechanised is one
  notch down: `inferred` on a `kind: "workbook"` ref, which the SOP's own rule
  says should be `untraced` unless something outside the workbook corroborates it
  — and if something does, the `kind` is wrong. Three seeded instances sit that
  way (`ISSUE_20260806_inferred_on_a_workbook_only_citation_...`), including the
  same bolt labelled `parts_list`/`inferred` in one stack and
  `workbook`/`inferred` in the next. **Cross-check an element that appears in two
  stacks against its twin**; a joint's take-1 and take-2 must agree about where a
  number came from.

---

## When the work is a spec-library parse event (not a stack)

Added 2026-08-05 after `spec_library_v0`, the first work here that was neither a
stack nor plumbing. Everything above is written for stacks; a `spec-parse/v0`
event is the *same provenance audit one layer upstream*, and it is higher
leverage, because a bad library value launders itself into every stack that
later cites it wearing `confidence: "traced"`.

**Re-read the document yourself. There is no substitute and no shortcut.** The
pile is in the MAIN checkout (`C:\workspace\tolstack\data\inbox\specs\`); render
with drawing-checker's venv (`venv-win\Scripts\python.exe`, PyMuPDF is
deliberately absent here). Recipe and the resolution-ceiling trick are in
`docs/spec_library/README.md`. Then:

- [ ] **Every tabulated value against its own cell.** Not the event's note —
      the cell. Check the *row label* especially: MS9363's `-09` and `-10` have
      identical `G`/`H`/`S`, so a row mis-registration is invisible in exactly
      the three columns the document was acquired for. Merged cells are the
      other trap (NAS6403's `R Rad` and NAS6404's `P` are merged across two
      basic-number rows, and NAS6403's `R Rad` is *blank* — reading the merged
      value up into it invents a fillet radius).
- [ ] **Every `text` field word for word.** These are quotes, and the library's
      whole premise is that the words are the value. An unmarked elision is a
      defect even when the dropped clause is harmless — a consumer cannot tell
      an abridged quote from a complete one. Sighted first time out, in
      `NAS6403 thru NAS6420 / part_number_code`.
- [ ] **Figure-read meanings get the `inferred` label unless the extension
      lines settle it.** Zoom the figure and follow the lines yourself. The
      author closing a *prior* gap on a figure reading (`spec_library_v0` closed
      dimension `M`) is exactly where a second reader is the whole point.
- [ ] **A computed `nominal` inside a `traced` value.** `confidence` is
      per-value, but `SpecValue` lets a transcribed band sit beside a midpoint
      the author calculated (MS9363 `slot_width` .0805 from a limits-only cell).
      The SOP bans nominal-as-midpoint; the library records it in a prose `note`
      that no consumer reads. Check whether a derived nominal is disclosed, and
      whether the band actually corroborates it (`H` .178/.198 does, via the
      ±.010 default; `S` .073/.088 does not).
- [ ] **Absences are as load-bearing as values, and there are two kinds.** An
      absence with `closed_by: null` claims *no document will ever close this* —
      a much stronger claim than "not in the pile", and one you must verify by
      reading the whole document, not by trusting the note. Confirm the
      distinction from an `unreadable`, which is an acquisition gap and must
      carry the crop that was tried.
- [ ] **An illegible token stayed illegible.** Render it yourself at the scan's
      ceiling. A plausible standard number where the ink does not support one is
      the invented-value failure mode in its purest form.
- [ ] **The intake queue's prose, not just its shape.** `status()` is derived and
      tested; the `note` and `unblocks` fields are free text asserting
      engineering conclusions and nothing checks them. `spec_library_v0`'s rank-12
      note argued MS24665 was low value because "the slot is wider than the hole,
      so the bolt hole governs" — false at worst case on both joints, where the
      bands overlap. Recompute any comparison a note asserts.

## Recurring bugs to check (any work here, stack or not)

Seeded 2026-08-04 from the founding review, the founding lesson, and slice 1.

- [ ] **Editing the wrong `REVIEW_AGENT.md`.** The absolute path dispatch tells
      you to `Read` is the *generated* composed prompt in the main checkout's
      gitignored `.dispatch/prompts/` — edits there are discarded at the next
      launch. Always edit the worktree-relative `docs/prompts/REVIEW_AGENT.md`
      (this overlay). Sighted in this repo's founding review: the dispatch-seeded
      copy in `C:\workspace\tolstack` was untracked and blocked the merge.
- [ ] **`forge check` passes in the main checkout and fails in the worktree.**
      `docs/issues/` and friends are created by `dispatch init` in the main
      checkout only. A session that checks only `C:\workspace\tolstack` ships a
      non-conforming branch. Check the worktree.
- [ ] **…and the same thing in reverse: run the suite in BOTH checkouts.** The
      worktree is the *more permissive* environment for anything that reads
      `data/`, because `data/` is gitignored and therefore empty there. Sighted
      in `citation_export_provenance`: `export_pdf_path` tried a relative cited
      path against the process cwd before its explicit roots, so from the main
      checkout `data/inbox/drawings/212966-006-A.pdf` resolved to the *real* file
      instead of the test's, the sha check fired, and the suite went red — while
      the worktree, where that path does not exist, stayed green. A green
      worktree suite is not evidence the merged tree is green. Re-run in
      `C:\workspace\tolstack` after you merge, before you push.
      **Second sighting (`gitignore_data_precedence`, 2026-08-07), benign but
      it pins the rule with a number:** the same tree reports **290 passed,
      1 skipped** in a worktree and **291 passed, 0 skipped** in the main
      checkout. Same 291 tests; one is data-dependent and *skips* where `data/`
      is empty. Both green, so nothing broke — but it means **a pasted suite
      line is checkout-specific**, and a lesson quoting one without saying which
      checkout produced it is quoting a number the shipping tree does not
      report. When you re-derive a suite count, say where you ran it.
- [ ] **`data/inbox/*` silently drops per-stream tracked docs.** Git does not
      descend into an excluded directory, so `!data/inbox/<s>/README.md` alone does
      nothing — re-include the directory, exclude its contents, *then* negate the
      doc. Verify with `git check-ignore -v <path>` and `git ls-files data/`, never
      by eye. **Second sighting (`gitignore_data_precedence`, 2026-08-07), one
      level up:** a `data/*` blanket re-introduced exactly this, and `*` never
      crosses `/`, so it matched `data/inbox`, `data/runs` *and* `data/projections`
      — the issue and the handoff both claimed the latter two were "unaffected"
      and both were wrong. `.gitignore` now carries the descent rule as a comment;
      the shape is exclude → re-include the dir by name → exclude its contents →
      negate the docs, applied at **every** level. Two review-time traps: a
      **reorder does not fix a descent problem** (a `!` under an excluded
      *directory* is unreachable regardless of position — only re-inclusion
      works), and **`git check-ignore -v` prints a line for negation matches too**,
      so the verdict is the per-path exit code (`-q`), not the presence of output.
      Use `--no-index` or tracked paths are skipped, hiding exactly the rows that
      prove the regression. The author hit the exit-code trap and it inverted
      eight rows.
- [ ] **The defect is an uncommitted edit in the MAIN checkout — a branch cannot
      fix it.** First sighting `gitignore_data_precedence` (2026-08-07): the bad
      `data/*` hunk never lived in a commit, only in `C:\workspace\tolstack`'s
      dirty ` M .gitignore`, where it had sat shadowing the tracked file for two
      days. Merging the branch updates the tracked file and leaves the dirty copy
      on top of it — repo fixed, working tree still broken, and the branch looks
      like it worked. When a handoff's subject is a main-checkout dirty file, the
      merge is not done until you have discarded it (`git -C C:\workspace\tolstack
      checkout -- <file>`) **and re-run the verification there**, not just in your
      worktree. Generalise: verify the fix in the tree where the bug lives.
      **And know the standing one before it costs you a merge (2026-08-12, second
      sighting):** a **Ghostwriter** editor window is open on
      `C:\workspace\tolstack\apps\viewer\README.md` with a stale buffer, and it
      autosaves — `.backup` the on-disk file, then write its buffer over it —
      within ~20 s of any change. It aborts `git merge` and undoes
      `git checkout --`. Restore and merge in **one** command; verify the working
      copy carries no unique work first (`git hash-object` vs the blob at the
      pre-merge commit); never `git add -A` in the main checkout. Find the owner
      with `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like
      '*tolstack*' }` rather than guessing at an agent —
      `ISSUE_20260812_ghostwriter_holds_a_stale_apps_viewer_readme_...`.
      **Resolved same day by `restore_viewer_readme`** (window gone, file back at
      305 lines, verified twice ~97 s apart) — so stop expecting *that* process,
      and keep the two durable parts. First: a `.backup` / `.bak` / `.orig` / `~`
      file beside a modified tracked file is a **signature, not litter** — editors
      leave those, git and agents don't — which is why `*.backup` is deliberately
      **un**-ignored (comment in `.gitignore`, "IDE / OS"); a diff that adds it to
      `.gitignore` is deleting the tell and needs the argument reopened. Second:
      ask the OS who holds the file **early**, not as a last resort. The window had
      held a doomed buffer for ~28.5 h while matching disk exactly, so every check
      this repo has read clean — a stale buffer only becomes a defect
      retroactively, when someone else edits the file.
- [ ] **A doc-scan guard cannot fail on a *deleted* section — only on a wrong
      one.** New 2026-08-12 (`restore_viewer_readme`), and it is the stale-count
      family's blind spot. Both guards
      (`test_no_live_document_states_an_unguarded_hardware_entry_count`,
      `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`)
      walk live docs for claim *shapes* and recount them: **a document that states
      nothing states nothing false.** Replayed in review — cut the whole
      `## Which bytes the number was read off` chapter out of
      `apps/viewer/README.md` and the suite is still `350 passed, 1 skipped`. So
      when a handoff's evidence is "the doc guards are green", that is evidence
      about the numbers that are *present* and none at all about the ones that
      vanished: diff the doc's headings against its previous version yourself.
      Design question filed, deliberately not patched —
      `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`.
- [ ] **Surviving `{{REPO_NAME}}` from the template stamp.** forge's
      `conventions._substitute_names` walks only `.md`/`.txt`/`.toml`, so
      placeholders live on in `.ps1`/`.py` stubs. Grep the diff for `{{`.
- [ ] **Stale inventory numbers in lessons and provenance.** Line counts, file
      counts and dates written before the last commit go wrong silently (founding
      lesson claimed a 467-line SOP that shipped at 509, and 39 tracked files of
      40). Recompute any count a doc asserts; don't read it. **Third sighting
      (`stack_viewer_v0`), and the worst variant so far:** the counts were about a
      *derived projection the repo can recompute in one line*, and one of them
      conflated "how many resolved" with "how many were **sha256-verified**" — the
      issue file said `joint.assembly_export` was "why six crops resolve,
      sha256-verified", where `crops.json` says `joint_export_run: 2`,
      `spec_pile: 3`, `provenance.sources_used: 1` and `sha256_verified` on 2 of
      6. A count that inflates *how strong the provenance is* is not a typo in
      this repo. (Those figures are the 2026-08-06 *pre*-`citation_export_provenance`
      state, quoted to make the point — do not carry them forward; recompute.)
      When a doc asserts anything about the crop or results
      projection, recompute it from `data/projections/viewer/*.json` — never from
      the prose, and never from another doc's copy of the number.
      **A new variant, and the cheapest one to miss (`sop_library_ref_pairing`,
      2026-08-11): the count a *doc fix* introduces.** That handoff's lesson said in
      so many words that it had kept counts out of the new prose and replaced them
      with pointers to the test that owns the number — and the same commit wrote
      *"still the only one in this file in this state"* into the SOP and *"(one
      entry so far)"* into `docs/tolerance_stacks/README.md`, sixty lines from its
      own instruction to read that number off
      `test_only_the_one_entry_was_promoted`. Fixed inline in review. So do not let
      a lesson's claim that it avoided a class stand in for checking: **read the
      added prose for counts, not the prose it replaced**, and treat "N so far" /
      "the only one" / "still the first" as counts, because they age exactly like
      digits do.
      **Fourth sighting (`hardware_counts_doc_guard`, 2026-08-12), and it lands
      inside the guard itself:** the handoff correctly replaced the README's count
      with a doc-level scan, and its
      `test_the_hardware_entry_count_guard_can_fail` — the replay that proves the
      scan bites — asserted the *digits* the stale sentence disagreed on
      (`== [8, 3, 1]`) rather than which claims it flagged. Those digits are a
      function of `hardware_entries.json`'s size, and `PROVENANCE.md` says that
      file changes with every new stack: appending one drawing-sourced entry made
      the demonstration fail with a bare `[8, 11, 3, 1, 2] == [8, 3, 1]` and no
      hint of why. Same shape as `test_the_export_is_a_sibling_...`'s hard-coded
      total of 23. Narrowed inline in review. So when work under review adds a
      guard, **audit the guard's own demonstration for a cached live count**, and
      ask what ordinary next-handoff change breaks it — a demonstration that fails
      for an unrelated reason is how a guard gets deleted.
      **Fifth sighting (`js_python_vocabulary_pairing`, 2026-08-12), and it moves
      the count into the *anti-vacuity* assertion**, which is the last place you
      want a spurious red: `assert len(tables) == 3` over a dict built from a
      `PAIRINGS` constant in the same file. Not live data this time — but the
      handoff's **own** filed issue (`..._the_confidence_vocabulary_has_no_single_definition_...`)
      proposes the fourth pairing that turns it into a bare `4 == 3`. Narrowed to
      `len(PAIRINGS)` inline. So widen the question past "is this count live?": ask
      **which already-filed issue makes this digit wrong**, and prefer the
      expression the guard is actually about — the digit and the constant were two
      lines apart here.
- [ ] **A corroboration flag shown without the evidence that produced it.**
      `crops.json` records `callout_text_in_zone`, and the viewer rendered it as
      a bare "(callout text found there)". The needle that actually matched is
      whichever candidate hit *first*, and `callout_needles` splits on
      whitespace, so it can be a bare token: `pitch_plate_flange` corroborates on
      `±0.10` (5 hits on that sheet) while the discriminating `4.06 ±0.10`
      (1 hit) is never tried. Fixed in `review/stack_viewer_v0` by naming the
      needle in `cropProvenanceLine`. Generalise it: any derived "matched" /
      "verified" / "confirmed" flag this repo surfaces must show *what* matched,
      or it reads as stronger evidence than it is.
- [ ] **A new warning that is always on — evaluate it on a clean tree, in BOTH
      checkouts.** The mirror image of the entry above, and the same harm: an alarm
      that fires on every ordinary run gets skipped, so the one real firing is
      invisible. First sighting `viewer_projection_provenance` (2026-08-10):
      `projection_provenance.stamp()` derived `dirty` from `git status --porcelain`
      with untracked files counted, and **the main checkout permanently carries an
      untracked `.dispatch.toml`** (dispatch writes it there; it is not
      gitignored) — so every build from the *documented canonical invocation*
      stamped `dirty: true` and lit the viewer's red banner box twice on a tree
      where nothing was wrong. Green in every worktree, where that file does not
      exist. Fixed inline (`--untracked-files=no`, plus a test pinning both
      directions). So when work under review adds a warning, alarm or `*_status`
      derived from environment state, **run it on a clean tree in the main checkout
      *and* in a worktree and confirm the quiet case is actually quiet** — the
      false-positive direction feels safe and is not, and `.dispatch.toml` /
      `.dispatch/` are the named local footguns. Check the *wording* too: this
      review also softened a pair-mismatch alarm that asserted the two projections
      "do not describe the same stacks" when an ancestor build is the ordinary case
      — an alarm may only claim what its data proves.
- [ ] **A new file in `scripts/` or `tolerance_stack/` and an unchanged inventory
      in `ARCHITECTURE.md`.** That file's tree block (line ~23) names every script
      by hand, so it goes stale silently. `viewer_projection_provenance` added
      `projection_provenance.py` without a row, and `snapshot_drawing_checker.py`
      had been missing since `readonly_invariant_evidence` — two handoffs, same
      block, neither noticed. Both added inline. Same question for
      `apps/viewer/README.md`'s Layout block, and for any durable *operational*
      fact (here: a build can now exit 3 and `--allow-older-tree` overrides it) —
      a fact that lives only in a script docstring and a lesson dies with the
      session, per the `CLAUDE.md`-is-gitignored rule below.
      **Second sighting (`spec_library_projection_provenance`, 2026-08-12), and
      it widens the question**: no file was added, so the "new file?" trigger
      never fired — what changed was a *claim inside an existing row*.
      `projection_provenance.py`'s row said "stdlib only, **both builders** import
      it", and the handoff made it three importers; the handoff correctly updated
      that same count in the module's own docstring ("three callers, not two") and
      missed the copy sixty lines away in `ARCHITECTURE.md`. Fixed inline. So ask
      the question by *fact*, not by file: **for every count or "both"/"two"/"only"
      the work invalidates, grep the repo for the other copies of it** — a
      quantifier word ages exactly like a digit, and the author who fixes one copy
      is the least likely person to look for the second.
- [ ] **A documented command that does not run in this repo's shell.** New
      2026-08-12 (`spec_library_projection_provenance`). `docs/spec_library/README.md`
      shipped its new `--data-root` recipe split across two lines with a trailing
      `^` — cmd's continuation character, not PowerShell's, and PowerShell is what
      runs here, so the pasted command dies with `Missing expression after unary
      operator '--'`. Every other command in this repo's docs is on one line for
      exactly this reason. Fixed inline. **Paste-run any command a doc adds**, in
      PowerShell, before you approve it; it costs one call, and a rebuild recipe
      that fails on paste is worse than none, because the fallback is the
      no-`--data-root` invocation the doc was written to prevent.
- [ ] **An audit enumerated by flag rather than by behaviour.** When a handoff
      reports "I checked the whole tree and the class has N members", re-run the
      enumeration on the *behaviour* the class is named for.
      `viewer_projection_provenance` audited "writers to a shared gitignored
      `data/` dir" by grepping `scripts/` + `tests/` for a `--data-root`-style
      default, and so missed `tolerance_stack/spec_library.rebuild()` — a
      wipe-and-rebuild of `data/projections/spec_library/library.json` that had no
      such flag, could not be pointed at the main checkout at all, and carried no
      stamp of any kind (fixed 2026-08-12 by `spec_library_projection_provenance`,
      which also re-ran the enumeration by behaviour and got **three** members;
      the checklist item stands — it is about how the miss happened).
      Grepping for the shape of the members you already know
      finds only those (`ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`).
      Two greps that would have caught it: writers (`write_text`, `json.dump`,
      `open(..., "w")`) and `REPO_ROOT / "data"` across **every** package dir, not
      just `scripts/`.
- [ ] **Documented vocabularies drifting from the seeded data.** The SOP's `role`
      list omitted `nut_geometry`, which the seeded take-2 uses three times. When a
      doc says "one of X | Y | Z", enumerate the actual values in
      `docs/tolerance_stacks/*.json` and diff the two sets. **Second sighting
      (`pitch_link_stack`):** the same class, one layer worse — `kind: "spec"` was
      *mandated* by the SOP, omitted from `SourceRef.kind`'s comment, **and**
      omitted from the whitelist in
      `test_source_ref_leaves_the_feature_identity_slot_open_and_empty`, so the
      first compliant from-scratch stack made the suite fail. A vocabulary lives in
      **three** places (SOP prose, the dataclass comment, the enforcing test);
      check all three, not two. **Third sighting (`sop_library_ref_pairing`,
      2026-08-11)** — and it changes what you have to do here, twice over. It is
      the variant *no* vocabulary-vs-data test can catch: every value the SOP named
      (`inline | library | not_transcribed`) was documented and its example was
      internally valid; what was wrong was a **sentence about a rule** — the SOP
      still made `library_ref`'s nullness unconditional, and pinned it on a
      precondition (no fastener library yet) that had been met six days earlier
      when `spec_library_v0` filled one and generalised the test to the pairing.
      So:
      (a) when a handoff changes an invariant, ask which *sentence* states it and
      whether that sentence moved, not just which enum did; and (b) the mechanised
      half now lives in **`tests/test_sop_vocabulary.py`** — the SOP's Step 4 JSON
      examples are parsed and run through the same `hardware_entry_problems()` the
      seeded file is checked with, plus a phrase scan for the superseded rule,
      replayed against the drifted blob at `abfaf5a`. **Know what that scan does
      not see**: it is a literal phrase list near the `library_ref` token, so a
      *newly invented* wrong sentence passes; it skips blockquotes (the correction
      escape) and `docs/sessions/`, `docs/issues/`, `docs/reference/`. It is a
      tripwire, not a parser — do not let its green count as "the prose was
      checked".
- [ ] **Documents cited from a worktree that cannot see them.** `data/` is
      gitignored, so `data/inbox/specs/` in a worktree holds one tracked
      `README.md` and nothing else — the pile (several dozen files, and growing;
      count it rather than quoting a number) exists only in the main checkout at
      `C:\workspace\tolstack\data\inbox\specs\`. Check 1 tells you a
      citation to a missing document is worse than none; an `ls` in your own cwd
      will manufacture exactly that finding for every correctly-cited spec in the
      stack. **Read the pile in the main checkout.** Same for
      `data/inbox/tolerance_stacks/`.
- [ ] **PROVENANCE's byte-identical rows — a test now, not your job.**
      `tests/test_provenance.py` parses the Amended column, diffs every claimed
      path against the merge-base, against this repo's import commit `c157300`
      and against drawing-checker's blob at the recorded sha, and fails naming
      the row and what to write. It replaces the manual diff this checklist asked
      for through **five consecutive sightings, every one caught by the reviewer
      and none by the author** (`pitch_link_stack`, `spec_library_v0`,
      `hub_bearing_thermal_stack`, `citation_export_provenance`,
      `traced_labels_and_ratio` — the last two were parallel handoffs and each
      review independently wrote "fourth sighting" without knowing about the
      other, which is what proved a human-executed check does not compose across
      concurrent work). Sightings 3, 4 and 5 are replayed out of git as regression
      cases in that file. **Do not re-add the diff to this list.** Two things it
      cannot do are left for you:
      - **Is the amendment *true*?** The test asserts the cell moved, never that
        it describes what actually changed. "additive only" written over a diff
        that moved a value is the same false claim in a new place.
      - **Is a claim outside a table stronger than its evidence?** Sighting 3 had
        "byte-identical" in a stack note, a worksheet headline and two test
        comments while the test compared only the *numeric* cells — four cells
        differed and one was the hub part number the identity argument rested on
        (`O31`: 212966-004 on M1, 212966-005 on M2, which is why one stack calls
        that element `traced` and the other `inferred`). The test now requires
        every live byte-identity claim to name what checks it; **read what that
        verification actually compares.** A cached numeric table is not the sheet.
- [ ] **A check whose evidence pattern can match the thing under test.** New
      2026-08-10 (`provenance_byte_identical_test`), and it is the vacuous-check
      family's subtlest member: the new grep demanded that a byte-identity claim
      name its verification, searching the surrounding block for
      `test_[a-z0-9_]+` — which matches the enclosing `def test_...` line, so a
      claim in a test body cited **the very test whose comparison was in
      question** and passed. That is sighting 3 verbatim, and the check written
      to end sighting 3 did not catch it; replaying `46a450a` proved it in one
      command. Fixed in review (`_DEFINITION_RE`) and pinned by a replay. So
      whenever a test *greps for evidence* rather than computing it, ask what
      else the pattern matches, and **replay it against the historical commit the
      check was written for** — not a synthetic case, which is where this one
      looked fine. Related: `ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth`.
- [ ] **Prose asserting a field is `null` while the field is not.** Same class as
      stale counts, one level down. `hub_bearing_thermal_stack`'s
      `identification_note` said "find numbers, balloons and quantities are
      therefore null rather than guessed" with `qty: 1` on all five rows of the same
      JSON (a within-joint count, defensible — the sentence was not). When a note
      claims a field is empty, grep the field.
- [ ] **A text layer is a locator, not a reading.** New with
      `data/inbox/drawings/`: unlike the photocopied spec pile, these part-drawing
      PDFs *are* searchable, which invites grepping a dimension and folding it. A
      text layer gives a value and not what it measures. `1.190 ±0.025` and
      `1.110 ±0.035` sit side by side on 214955-004 sheet 1 — the first is the
      radial wall, the second the flange's *axial* thickness, and 1.110 is also
      nearly the upper sleeve's wall (`1.110 ±0.025`), so the wrong reading is
      doubly plausible and re-derives perfectly. The author caught this one and
      recorded it as a `[read]` finding; verify any dimension you are checking by
      crop (`debug_trace_stack_values.py --crop "<page>,<cx>,<cy>,<half>" --zoom 6`
      from drawing-checker's venv), and verify printed zones from the border ticks
      rather than by eye — all nine citations in this stack were exact when checked
      against the callout text's own centre.
- [ ] **A sibling handoff landed on `master` while you were reviewing.** The board
      runs handoffs in parallel, and two that are each internally correct can
      merge into a contradiction. `sop_edits_apply` and `spec_library_v0` both
      touched `hardware_entries.json` and `test_tolerance_stack.py` on 2026-08-05:
      the first asserted `values_status != "inline"` ⟹ `values_source is None`,
      the second promoted an entry to `library` while deliberately keeping its
      `values_source`. Neither branch's suite could see it; the merged tree failed.
      **Before you write the verdict: `git log --oneline HEAD..master`, merge
      master into your review branch, and re-run the suite there.** A review that
      only tests `handoff/<slug>` against its own merge-base is testing a tree
      that will never exist. **Second sighting (`stack_viewer_v0`):** same cause,
      a doc this time — `spec_library_v0` and `stack_viewer_v0` each rewrote
      `ARCHITECTURE.md`'s data-flow ASCII diagram from its founding shape, and
      git could not merge them. Nothing fails a test; the conflict is yours to
      resolve, and the resolution must keep *both* narratives (the merge is
      additive: two new branches on one diagram), not pick a side.
      **Third sighting (`viewer_generated_checks`, 2026-08-06)**, and it shows the
      check has to be the *reviewer's last act*, not the author's: that handoff's
      DoD asked for `git log --oneline HEAD..master` and the author ran it and got
      empty — then `traced_labels_and_ratio` (5 commits, +11 tests) landed. Nothing
      conflicted and nothing failed, so the only symptom was **two counts in the
      lesson that were true of the branch and false of the merged tree** (`279
      passed` vs 290; a `2T/1I/3U` build transcript where the merged tree says
      `1T/2I/3U`). So: an author's green `HEAD..master` is evidence about a moment,
      not about the tree that ships. Re-run it yourself, and **re-derive every
      count the lesson pastes** — a build transcript ages exactly like a hand-typed
      figure does. **Fourth sighting (`fastener_citations_and_confidence`,
      2026-08-10)**, identical shape and now predictable enough to expect: the
      lesson's `318 → 325 / 1` was measured against baseline `d08b1ea` while
      `viewer_projection_provenance` landed; the shipping tree reports **340 / 1**
      in a worktree and **341 / 0** in the main checkout. Nothing conflicted. If
      a lesson quotes a suite count and the board ran anything in parallel,
      assume the count is stale and re-derive it in both checkouts.
- [ ] **A prior review's PASS is a claim, not evidence — re-locate what it says
      it located.** New 2026-08-10 (`fastener_citations_and_confidence`), and it
      is how a *mandatory* check goes vacuous across a whole review chain. Check
      6 requires the castellation/cotter caveat **next to the numbers**; three
      consecutive reports recorded it PASS, one wording it as *"both worksheets
      keep their MS9363 caveat next to the numbers"* — and in
      `WORKSHEET_tan_link_to_pitch_plate.md` that caveat existed only at finding
      **F8, ~150 lines below the Checks table**, whose own conclusion paragraph
      presents a grip verdict and mentions castellation nowhere. The check was
      satisfied by the caveat *existing*, which is not what it asks. Grepping for
      `castellat` finds it every time and proves nothing about placement. So when
      a check has a **location** clause, open the file at the location and read
      what a reader standing there actually sees; a `Select-String` hit anywhere
      in the document is not that. Fixed inline in that review (a blockquote
      under the Checks table). Generalises to every "next to the numbers" /
      "must sit with the results" requirement in this overlay.
- [ ] **The projections are stale unless you rebuild them.** Nothing rebuilds
      `data/projections/viewer/` — no hook, no ops verb, no watcher. A stack
      changed on the branch under review will render as the previous build, and
      the viewer's banner reports the build time rather than refusing. Re-run
      both scripts against the MAIN checkout before you judge anything the viewer
      shows: `venv-win\Scripts\python.exe scripts\build_viewer_projection.py
      --data-root C:\workspace\tolstack\data`, then the same with
      `C:\workspace\drawing-checker\venv-win\...` and `build_viewer_crops.py`
      (PyMuPDF is deliberately absent from this repo's venv). Both are
      wipe-and-rebuild and each owns only its own files, so either can be re-run
      alone; a rebuild that changes anything but `built_at` means the committed
      claims were made against a different tree.
      **And under concurrency, YOU are still the one who rebuilds — but the
      tie-break is now the machine's, not yours** (`viewer_projection_provenance`,
      2026-08-10). `data/projections/viewer/` is one directory shared by every live
      worktree, and the old rule here was a sentence a reviewer had to remember:
      *the review worktree holds `master` + the handoff, the newest tree in
      existence, so its rebuild is never the older script losing to a newer.* That
      sentence is now `scripts/projection_provenance.py`: both builders stamp
      branch/HEAD-sha/resolved-stacks-dir into their output and **refuse (exit 3)**
      to overwrite a projection whose recorded commit is not an ancestor of theirs.
      So: **rebuild, and a refusal is the gate working, not a bug** — read the
      message, which names the other tree's branch, sha and path; rebuild from
      *that* tree, or merge it in here first, and reach for `--allow-older-tree`
      only when overwriting a newer projection is genuinely what you mean. What the
      gate does *not* do is oblige anyone to rebuild, so the stand-off is still
      reachable — it is merely safe now instead of lossy. Then diff old against new
      key by key: the diff is the evidence for "the other stacks did not regress",
      and after that handoff the only legitimate differences are `built_at` and the
      `provenance` block. Two things the gate cannot see, so you must: it compares
      commits and not **content** (two trees on one sha with different uncommitted
      edits both pass — `provenance.dirty` is the only tell), and it gates each
      script against **its own** file only, so `results.json` and `crops.json` can
      still name different commits. The banner flags that pair, and an *ancestor*
      crop build is the ordinary, harmless case — do not read that alarm as proof
      of divergence.
      **There is a THIRD projection since 2026-08-12
      (`spec_library_projection_provenance`), and it is the one you will forget**,
      because it is not the viewer's and has no banner to nag you:
      `data/projections/spec_library/library.json`, rebuilt by
      `venv-win\Scripts\python.exe -m tolerance_stack --data-root
      C:\workspace\tolstack\data`. Same stamp, same exit-3 gate, same rule — and
      the same "only trees that HAVE the gate are gated" hole, so a `master`
      checkout that predates the merge still clobbers it silently. Rebuild it too
      whenever `docs/spec_library/events/` moved, and diff old against new: the
      only legitimate difference is the `provenance` block (there is deliberately
      no top-level `built_at` on this one).
- [ ] **Completeness is a schema field — check the field, not the prose.**
      Until 2026-08-13 `INCOMPLETE` was a prose convention that
      `build_viewer_projection.is_incomplete` grepped for, so a stack writing
      "incomplete", "PARTIAL" or "budget only" rendered as an ordinary failing
      check. That function is gone. A check with a knowingly missing term now
      carries `"complete": false` plus `"excluded_terms": [...]`, and
      `CheckResult` enforces the pairing in **both** directions, so the thing
      this item used to ask a human to eyeball is now a test. What still needs a
      reviewer: that the `excluded_terms` **strings say what is missing and
      why** (they are free text by design — an unsourced term has no element to
      reference), that the label does *not* re-shout `INCOMPLETE`, and that the
      SOP Step 5c "read the magnitude as a budget" caveat is beside the number
      in the worksheet. A stack authored before the migration and never touched
      would carry the old label with no `complete` field and render as an
      ordinary check — grep the stack files for `INCOMPLETE` if one shows up.
- [ ] **A derived headline figure with no single computing command.** The
      strongest form of "recompute any count a doc asserts", learned the expensive
      way — the superseded traced ratio, quoted in eleven files for a month:

      > *"1 of 17"* — and **neither half reproduced.** The denominator silently
      > dropped `take2`; the numerator counted part-drawing-traced values while
      > the JSON said four elements were `traced`.

      It survived three reviews *because this checklist supplied the stale
      constant*: the `pitch_link_stack` reviewer computed 4 of 26 correctly, wrote
      it down, and then quoted the stale figure in the same document. **A
      checklist that hands you a constant will beat your own correct
      arithmetic.** So: when
      a doc quotes a derived figure, find the *one* place that computes it and run
      it (for the traced ratio:
      `tests\debug_report_tolerance_stacks.py --ratio`, defined in the SOP's "The
      traced ratio"). If there is no such place, that absence is the finding —
      a ratio with an unstated denominator is not a measurement. And when a
      handoff corrects such a figure, check that the fix is *structural*: one
      definition, one computing function, a test importing that function rather
      than re-implementing it, and a doc-level test that fails on a stale quote.
- [ ] **`docs/reference/` edited.** Settled 2026-08-10
      (`provenance_byte_identical_test`): the directory is **insert-only**, not
      verbatim — imported text is never edited, reworded or deleted, and a dated
      correction blockquote may be inserted after the passage it corrects. Rule and
      argument in `ARCHITECTURE.md`, "Imported material"; mechanised by
      `test_docs_reference_imports_are_insert_only`, which diffs against
      drawing-checker's blob and fails on any opcode that is not an insertion. So
      the mechanical half is covered; what you judge is whether the inserted note
      is *right* and whether `PROVENANCE.md`'s section records it.
- [ ] **A whole-file diff on a file the handoff only edited in places.** New
      2026-08-12 (`viewer_fixture_shape_guards`). `apps/viewer/tests.js` came back
      as `1032 -> 1370` lines changed, every line of it; `git diff -w` said 341
      insertions and 3 deletions. **Run `git diff -w --stat` against every diff
      whose line count looks disproportionate** — if `-w` collapses it, the file
      was re-emitted with different whitespace or line endings and the real change
      is hiding inside a reformat nobody can review.
      The cause here is worth knowing because it is invisible and recurs: the file
      carried **one raw NUL byte** (a sentinel written as a literal control
      character instead of a backslash-`u0000` escape, 56 kB in). Git's
      `convert.c` calls any buffer containing a NUL *binary*, so
      `core.autocrlf=true` — which is on here, and which is why every other blob in
      this repo is LF — skipped normalisation and committed 1370 CRLFs. Two tells,
      neither an error: `file <path>` says `data` instead of `JavaScript source`,
      and `grep`/`git grep` print **"Binary file … matches"** and no line, so the
      file silently drops out of exactly the greps this checklist is made of. Fixed
      inline. Check with
      `python -c "print(open(P,'rb').read().count(b'\x00'))"` on any source file
      whose diff or grep behaviour looks wrong, and compare blob line endings with
      `git ls-files --eol` rather than by eye.
- [ ] **The viewer's JS suite is green *without having read any real data*, and
      that is its default.** New 2026-08-11 (`viewer_source_ref_export_label`).
      `apps/viewer/run_tests.cjs` has two tiers, and the `[real]` one — every
      test that opens `data/projections/viewer/` — **skips unless you point it at
      the main checkout**, because `data/` is gitignored and absent from every
      worktree. On the shipping tree that is **75/75 passed (tier skipped)**
      versus **98/98 (tier ran)** as of `viewer_fixture_shape_guards`
      (2026-08-12; it was 95/95 the day before, so **recount rather than quoting
      this line** — the gap is the whole point, not the digits): 23 tests,
      including the guards that exist
      precisely to catch a live shape the fixtures cannot produce. Exit code 0
      both ways; the only tell is one `SKIP node-fs tier` line above the
      headline. So a report quoting a JS count **must say whether the tier ran**,
      and you re-run it yourself as
      `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`. **Forward
      slashes in that path**: under the Bash tool `C:\\workspace\\tolstack` has
      its backslashes eaten, the runner looks under
      `<cwd>/workspacetolstack/...`, finds nothing and — skips, green. Same trap,
      no error.
- [ ] **A `[real]` test that asks the view-model instead of the page.** New
      2026-08-12 (`viewer_export_and_material_provenance`). The `[real]` tier's
      value is that it reads live data, and that makes it easy to write a test
      whose subject is a `VA.*` function's return value rather than what a reader
      sees. `[real] every citation whose crop is unresolvable states its export`
      asserts `VA.exportProvenance(...).headline` is non-empty — so it stays green
      with the `cell.appendChild(exportBlock)` line deleted, which is the entire
      defect the handoff was written to fix. Its DOM siblings caught it. So for
      every new `[real]` test ask **which line of production code deleting would
      turn it red**, and require at least one per rendered surface to go through
      `render(...)` + `all(root, "…")` rather than through the view-model.
- [ ] **One number, two nouns, both in the same commit.** New 2026-08-12
      (`viewer_export_and_material_provenance`), and it is the stale-count entry's
      hardest variant to see because nothing is stale: 48 live citations split
      **22 established / 26 no-export**, and *"22 of the 48 live citations"* was
      written for the **no-export** state in five places while the same session's
      lesson carried the correct table. Same commit, same author, one digit
      borrowed from its sibling fact. Alongside it, *"15 of the 22 live established
      **exports** have no runs"* counts **citations**: 22 citations name **9**
      distinct exports, 6 unconsumed — the traced ratio's instances-vs-ids trap in
      a new place. Both fixed inline. So: when a diff quotes the same digit for two
      different sets, **re-derive each occurrence against its own sentence's noun**
      rather than checking the number once; and read a doc's tables against its own
      prose before you go near the data — the disagreement was internal here and
      cost nothing to find.
- [ ] **A hand-rolled parser's "what it cannot see" list is an argument, and you
      re-derive it like any other claim.** New 2026-08-12
      (`js_python_vocabulary_pairing`), where a Python test scans
      `apps/viewer/viewer.js` for the keys of a `VA.<NAME> = {` literal to pair
      against a Python enumeration. These tests are *correct* to enumerate their
      own blind spots — that list is the deliverable's honest half — which is
      exactly why it gets read as checked and is where a wrong sentence survives.
      Two ways it went wrong here, both fixed inline, both cheap to find:
      - **Scope: file-wide claim, span-wide scanner.** The docstring said
        "`viewer.js` contains no regex literal" (a `/}/` would end the scan early).
        It contains **four** — lines 240, 452, 462, 463, all
        `String(x).replace(/\\/g, "/")`-shaped. Harmless, because every one is
        outside the three scanned bodies (202–216, 352–379, 498–521) — but the true
        sentence and the written one differ in the part a future reader would rely
        on. **Grep the file for the construct the prose says is absent, then check
        the spans**, and require the claim be stated per-span.
      - **Constructs the list never considered.** Feed the extractor a synthetic
        case rather than reasoning about it: `a: cond ? yes : no` at depth 1 yields
        a spurious key `yes` (undocumented), and `js_table_mutations`' assignment
        regex does not match `Object.assign(VA.<NAME>, {...})` — so "the only other
        way a key can arrive … the two together are total" overclaimed. Sort each
        gap by **direction**: a spurious key is loud (red, badly worded) and a
        missed key is silent, and only the silent one is a hole in the guard.
      The extraction assertions themselves were the strong part and worth copying:
      a missing table **raises** rather than yielding `set()`, and the empty-table
      case is asserted. Replay both — point the extractor at a name that is not
      there, *and* empty a real table — before you accept a set-equality test.

## Architectural errors to check

- [ ] **`fold()` is the only arithmetic.** No second code path for checks — paths
      and checks are the same signed term list. And `fold()` reads `min`/`max`
      only: it must never read `lmc`/`mmc`. Since 2026-08-05 the precise invariant
      is **one place where element *values* get combined**: an archetype layer may
      compute per-term *weights* (`thermal.py` computes soak factors, `2k`, `1−k`)
      and may not combine two element values. Check that any new layer respects
      that line, and that `Term.coefficient` is still `> 0` — direction lives in
      `sign`, and a negative coefficient would give a sign error two places to
      hide. `workbook_corner()` is the one sanctioned reader of `lmc`/`mmc`; it
      reproduces a source spreadsheet's coherent corner for comparison and is
      deliberately not routed through `fold()`.
- [ ] **A generated check must not be hand-writable, and must be readable.**
      A `thermal_fit` stack file's own `checks` array is empty and
      `load_thermal_fit_stack()` refuses a hand-written entry — a check in the file
      would be a second, unverified source of coefficients. The cost is that the
      repo's central safety property (a reviewer reads every sign) has no JSON to
      read, so require the expanded-terms appendix in the worksheet and re-generate
      it yourself rather than trusting the paste.
      **Since `viewer_generated_checks` (2026-08-06) the viewer renders them too**,
      and the rule that makes that safe is a one-dict dispatch: `ARCHETYPE_LOADERS`
      in `scripts/build_viewer_projection.py` maps `archetype` → that archetype's
      own loader, so the checks are generated **once, in Python**. A new archetype
      whose loader is not in that dict projects zero checks and the viewer says so
      (`checks_generated_not_rendered`) — check the dict got its entry, and check
      nobody grew a *second* generator in JS or in the projection.
- [ ] **A term rendered without its coefficient is a wrong term list.**
      `element_terms` is `{element_id, sign, coefficient}` and every consumer must
      print a non-unity weight: a `2k`-weighted sleeve wall shown as
      `+ sleeve_wall` is wrong by a factor of two on the one surface built for
      reading signs, and it looks perfectly readable. Check `VA.termLabel` (or
      whatever renders a term) is used everywhere a term is drawn, and that
      `coefficient > 0` in the projection, with direction still in `sign` alone.
      As of 2026-08-06 only the check cards draw terms — `pathsSection` shows a
      path's folded interval and no term chips at all — so an archetype that ever
      generates weighted *paths* needs that section revisited, not just
      re-styled. The verification that actually settles it is
      mechanical: the projection's term rows must equal
      `tests\debug_report_thermal_fit.py --terms --markdown` row for row
      (104 rows across the two thermal stacks; pinned by
      `test_the_projected_terms_are_the_report_that_reviews_them_term_for_term`).
      Re-run both and diff them yourself.
- [ ] **The no-second-combiner rule extends to JavaScript** (`stack_viewer_v0`,
      2026-08-05). `apps/viewer/` renders `results.json` and combines nothing: no
      `+`, `-`, comparison-of-tolerances, `toFixed` or verdict logic anywhere
      under `apps/viewer/`. Rounding happens once, in
      `build_viewer_projection.py` (`INTERVAL_DECIMALS`, and `COEFFICIENT_DECIMALS`
      = 9 for term weights since 2026-08-06), and `VA.fmt` is
      `String(n)` on purpose. Grep any viewer diff for arithmetic operators on a
      projection field — a second combiner in JS is one nothing in `tests/`
      executes. Note the false positive: `app.js`'s popover clamp
      (`Math.max(8, Math.min(...))`) is CSS pixels, not a tolerance.
- [ ] **A branch over a value the *data* owns must be a total function, not an
      `else if` chain.** New 2026-08-11 (`viewer_source_ref_export_label`), and it
      is the display-layer twin of the invented-number problem: an `else if` chain
      has a silent default, and **a silent default is indistinguishable from a
      handled case by reading the code** — which is exactly how a reader concludes
      the case is handled. Sighted on `crops.json`'s `resolved_by`: the crop script
      changed its rule set on 2026-08-06, every resolved crop started carrying a
      value the viewer had never seen, and the hover printed *nothing at all*
      about provenance for four days while the JS suite stayed green. The
      shape that fixes it, and what to require of the next one: a **table**
      (`VA.CROP_RULES`) with one entry per value the producer can emit; a **loud**
      fallback that names the unknown value rather than falling through to
      silence; a rollup-reading banner line that surfaces the unknown to a reader
      who never hovers (`VA.unlabelledCropRules`); and the guard in the `[real]`
      tier — `eq(VA.unlabelledCropRules(realCrops), [])` — because the assertion
      that matters is *the live data contains no value this code has no branch
      for*, and no fixture can make that claim. Ask it of every enumerated field
      the viewer switches on. And note what this is *not*: a key-set/schema diff
      between fixture and live data would not have caught it, because the stale
      thing was a **value** in a field that was present and correctly named.
      **Generalised 2026-08-12 (`viewer_fixture_shape_guards`), so the check
      changes shape:** the per-field question is now a table, `VALUE_GUARDS` in
      `apps/viewer/tests.js`, driven by `[real] no live value is one the viewer has
      no branch for` — so *whether a field is covered* is no longer yours to
      enumerate; read the rows. What is yours is the **form** of each row, because
      the two forms have different half-lives:
      - `known: function (v) { ... }` **asks the viewer** (`VA.CROP_RULES`,
        `confidenceClass`, `verdictClass`). Self-syncing; teaching the viewer a
        value teaches the guard. Prefer it, and check a new row could not have been
        written this way.
      - `known: inList([...])` **copies a vocabulary** out of an `if` chain or a set
        of CSS rules. It still fails loudly on a new live value, but it is a copy —
        so when work under review touches `cropProvenanceLine`, `views/worksheet.js`
        or an `index.html` `.gap--*` / `.croppop--*` block, **re-read the matching
        `inList` by hand**; nothing pairs them.
      Also check the companion test `[real] each value guard bites when fed a value
      nothing can explain` still covers every row — a guard whose `known` accepts
      anything is documentation, which is precisely the state `VA.CROP_RULES` was in
      for the four days the original bug shipped. And know the tier's reach: it
      reads **live data only**, so a value that exists only in `fixtures.js`
      (`values_status: "not_transcribed"`, `export.status: "unestablished"`) is
      unguarded by it by construction.
- [ ] **`check_result` is produced, never stored.** A committed verdict goes stale
      the moment an element changes and nothing notices.
- [ ] **An imported file may change; its `PROVENANCE.md` row must change with
      it, in the same commit.** Otherwise the provenance record is now false,
      which in this repo is the worst class of defect. Do not count or list the
      rows here — the count went stale twice — and do not diff them by hand:
      `tests/test_provenance.py` does both, including the `sha256`-equivalent
      comparison against drawing-checker's blobs. See `ARCHITECTURE.md`,
      "Imported material".
- [ ] **drawing-checker is read-only and one-way.** Nothing here writes there.
      **Do not check this with `git status` over there** — `data/runs/*` and
      `data/inbox/*` are gitignored, so a session that ran the pipeline, added a
      run, or dropped in a PDF leaves that repo's status completely clean. The
      check does not fail; it passes **vacuously**, which is worse, and it did so
      for the two lessons that cite it
      (`ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth`, closed
      2026-08-07 by `readonly_invariant_evidence`). What to check instead, in
      order:
      1. **The session's snapshot diff.** SOP Step 0 and Step 8 require a
         before/after listing of drawing-checker's `data/runs/` and
         `data/inbox/drawings/`
         (`scripts/snapshot_drawing_checker.py`), and the lesson must report it.
         An **absent** diff is a finding — it is the one piece of evidence the
         author could produce and cannot reconstruct afterwards. A **non-empty**
         diff is not automatically a violation (Jeff runs the pipeline too), but
         it must be explained entry by entry, and an unexplained entry that
         postdates the session's first commit is blocking. Re-run the diff
         yourself from the author's `before.json`: it costs a second, and it
         also covers the window *since* they took theirs.
      2. **Every cited run's `ts`, against the session's own commit dates.**
         Since 2026-08-07 each `export.runs` entry is `{run_id, ts}` with the
         `ts` copied from that run's `run_meta.json`, so this is arithmetic on
         the stack file rather than a walk through another repo. A run that
         predates the session's first commit cannot be its output — that is the
         whole test.
         `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`
         is the worked example. Check the `ts` values are *real* — copied from
         the run, not from the run id, which is local time at run start and can
         differ (`20260730_133912` → `2026-07-30T20:39:33Z`). Re-read all of
         them from `run_meta.json` yourself; it is one loop over the stack files
         and it is the only thing between a citation and a plausible stamp.
         **And know which stamps are themselves derived:** a `ts` of whole
         seconds that spells its run id back was reconstructed from the id by
         drawing-checker's `reconcile_run_log.py` and reads as UTC when it was
         local — up to a timezone wrong, in the direction that matters for a
         same-day comparison. `backfilled: true` in `run_meta.json` flags some
         and not others (12 of the 25 seeded entries are derived; only 6 carry
         the flag), so judge by the shape, not the flag.
      3. `purpose` / `pipeline_commit` on any run that still needs attributing —
         a `"purpose": "test"` run with a `+dirty` commit during a
         drawing-checker session is theirs, not the stack author's. This is
         corroboration now, not the argument: it was the *only* evidence
         available to the `pitch_link_stack` review, which is why that review
         could get no further than "almost certainly".
      **And take your own snapshot at the start of the review.** You are a
      session too, and reading drawing-checker for check 1 is exactly the
      activity that could write there by accident.
- [ ] **`data/inbox/specs/` is append-only.** No renames, no de-duplication, no
      tidying — check the diff *and* the filesystem.
- [ ] **`docs/reference/` is insert-only imports** — see the item above and
      `ARCHITECTURE.md`, "Imported material". If imported reference and this repo's
      docs disagree, the repo's docs change and the divergence goes in a lesson;
      correcting the import itself means *inserting* a dated note after the
      passage, never rewriting it.
- [ ] **`CLAUDE.md` is gitignored**, so any durable fact written there must be
      mirrored into `README.md` or `ARCHITECTURE.md` or it dies with the session.

## Writing the review

Standard location: `docs/sessions/reviews/REVIEW_<date>_<handoff>.md`.

Structure it as the seven mandatory checks, each with a verdict and evidence —
including the passes, so a reader can tell a check was performed from a check
that was skipped. Then the additional items, then your findings ranked by
severity.

Rank an **unsourced or invented tolerance as blocking**, above any arithmetic
issue. Arithmetic is pinned by tests and recoverable. A number with no document
behind it, wearing a `traced` label, propagates silently into every downstream
decision — and this checklist is the only place it can be caught.
