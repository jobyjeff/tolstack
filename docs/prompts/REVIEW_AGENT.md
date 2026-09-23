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
missing element (a `complete: false` check, per the SOP's Step 5c — an
`INCOMPLETE`-labelled one before 2026-08-13) has a
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
`venv-win/Scripts/python.exe tests\debug_report_thermal_fit.py --terms --markdown`
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

- **The `title` is a short noun phrase.** The rule and its worked cuts are
  `docs/SOP_TOLERANCE_STACK.md`, "Titling an artifact" — read it there rather
  than from this line. Stacks, topologies and studies are all in scope, because
  the viewer's nav rail lists all three together and a title is the only field
  it renders. Reject a genre statement ("… as a topology"), a history or
  negation clause, a unit in parentheses, and endpoints `from`/`to` already
  state. What the title sheds is **demoted into `description`, not deleted** —
  an author who cut real information and wrote no description has lost it.
  Check the `id` did not move with the title: ids are deep links.
- **Tests — read the canonical "Test cadence" first; this bullet applies that
  cadence here and is not a second full-suite order.** Check that the tactical
  report **records** its full-suite run — command, checkout, result counts — and
  give that record the benefit of the doubt. Pre-merge you run the **risky
  subset** for the diff's shape; "Choosing the risky subset" below is the
  mapping, written down so you do not re-derive it. The one full suite this
  review owes comes **after** the merge, and the entry that owns it is *"…and the
  same thing in reverse: run the suite in BOTH checkouts"* under "Recurring bugs
  to check". Nothing in this overlay asks for a full suite before the merge.
- **Green is not the whole verdict here — and that, not distrust of the author,
  is the repo-specific reason this needs its own sentence.** This suite is a
  **transcription** check rather than a self-consistency check, and it is one
  *only because* new source-derived numbers carry their source cell reference in
  a comment (`# JEFF E18`). A number pinned by a test that cites nothing is
  pinned to itself: the green then tells you the author is internally
  consistent, not that the worksheet says so. So read the tests the diff adds
  rather than only its total — a new stack with no new tests pinning its numbers
  is incomplete, and newly pinned numbers carrying no source comment are a
  finding whatever the counts say.
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
  counts **wherever a document states this repo's facts** — every live `.md` plus
  the `.json` under `docs/`, less the exemptions below. Know its blind spots
  before you treat its green as "the prose was checked": it matches the claim
  *shapes* the repo has already written (`_COUNT_CLAIMS`), so new phrasing is
  invisible; a number inside a blockquote or a `"…"` span is exempt by design;
  `docs/sessions/`, `docs/issues/`, `docs/reference/` and `PROVENANCE.md` are out
  of scope as dated history; and since 2026-09-17
  (`prose_guards_scope_out_strategy_briefs`) so is `docs/strategy/BRIEF_*.md` —
  an inbox artifact about an undecided question, not a document that states this
  repo's facts. That last one is a *class* of exemption, not a file: it applies
  to every claim-shape scan (`claim_scanned_documents()`, and
  `is_claim_scanned()` for the byte-identity scan, which derives its corpus from
  `git ls-files` instead). `CLAUDE.md` was on the dated-history list until
  2026-09-01; now that it is tracked, the scan reads it.
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

## Choosing the risky subset (diff shape → what to run, pre-merge)

The canonical **"Test cadence"** above is the process: the tactical report's
recorded full-suite run gets the benefit of the doubt, you run a **risky subset
before** the merge, and **one full suite after** it. This section is the
*mapping* for this repo — written down so no reviewer re-derives it, and so two
reviews of the same diff shape run the same thing.

Start from `git diff --name-only integration...HEAD`, take **every** row the
change set matches (the rows union; none of them overrides another), and **name
the subset and its counts in your review**. An unnamed subset is the same
problem as an unrecorded full suite one step later.

- **Python under `tolerance_stack/` or `tests/`** → that module's own test file,
  plus `tests/test_architecture_inventory.py` (the module inventory is paired
  against the tree, so a new, moved or renamed module reds it).
- **Stack or topology data under `docs/tolerance_stacks/` or `docs/topologies/`**
  → `pytest -q tests/test_tolerance_stack.py tests/test_topology.py
  tests/test_topology_projection.py tests/test_viewer_projection.py`, **and** the
  viewer `[real]` tier (both traps below apply). A change to a value, a band, a
  `confidence` or a `zero_width` is a viewer-test change: the "A STACK-DATA
  change is a viewer-test change" entry under "Recurring bugs to check" is why,
  and it names the greps to run before the tier.
- **`apps/viewer/`** → `pytest -q tests/test_viewer_js_suite.py
  tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py`, plus the fast tier through the
  `--repo` seam. If the diff touches `style.css`, `topology.css` or anything
  positional, the fast tier's DOM shim **structurally cannot see the defect
  class** and the browser tier is not optional:
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`.
- **`apps/annotate/`** → `pytest -q tests/test_annotate_js_vocabulary.py
  tests/test_feature_identity.py tests/test_part_mesh_aliases.py`, plus
  `node apps/annotate/run_tests.cjs`. That runner takes **no `--repo` flag**: its
  `[real]` checks try the repo-relative projection path and then fall back to a
  hardcoded main-checkout path, so from a worktree they usually run anyway — but
  when neither path resolves they print a `SKIP  [real] ...` line and the total
  stays green, so read the SKIP lines rather than the total.
- **A CSS rule in either app** → `pytest -q tests/test_app_type_scale.py` (the
  two apps' `:root` scales are paired against each other there), plus the browser
  tier as above.
- **A guard, a witness, or `scripts/mutation_witnesses.json`** → `pytest -q
  tests/test_mutation_witnesses.py` plus `node
  scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`. This tier
  also owes a **post-merge** run, for a reason the merge itself creates — see the
  "After you merge `integration` into your review branch, re-run" entry, which is
  not covered by this pre-merge row.
- **A projection builder, or `scripts/rebuild_projections.ps1`** → `pytest -q
  tests/test_projection_provenance.py tests/test_rebuild_projections_script.py
  tests/test_rebuild_terminal_state_pairing.py`, then the rebuild itself and the
  viewer `[real]` tier.
- **Prose in a tracked document, including this file** → `pytest -q
  tests/test_tolerance_stack.py tests/test_provenance.py
  tests/test_thermal_exception_list.py`. The doc-scan, claim-shape and
  byte-identity guards read `docs/` as a live corpus, so a docs-only diff can
  legitimately go red — that is the design, not a nuisance (repo `CLAUDE.md`).
  **Three modules share that walk, not two** — `claim_scanned_documents()` is
  defined in `tests/test_tolerance_stack.py` and imported by the other two, so
  `grep -rl claim_scanned_documents tests/` is how you check this row is still
  complete. `docs/prompts/` is inside the corpus; `docs/sessions/`,
  `docs/issues/` and `docs/reference/` are not (`_HISTORICAL_DIRS`), so a diff
  of only lessons and issues cannot red these — measured 2026-09-21.
- **`ARCHITECTURE.md`, `README.md`, `PROVENANCE.md`, `ops.toml`** → `pytest -q
  tests/test_architecture_inventory.py tests/test_provenance.py
  tests/test_ops_toml_serve_verb.py`.
- **Nothing here matches the diff** → say so in the review, and derive the
  subset the same way these rows were: `grep -rl <changed path> tests/` and run
  what names it. Then **add the row**, so the next reviewer of that shape does
  not repeat the grep. A row you could not justify from the tree does not belong
  here; leave it out and say what you could not map.

### The two traps this mapping exists to carry

Both measured; both have cost real sessions.

- **The viewer's `[real]` tier reads gitignored `data/projections/viewer/`, which
  exists only in the main checkout, so from a worktree it must go through the
  runner's `--repo` seam:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`.** Without it
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` fails on
  **every** branch and tells you nothing about the diff in front of you — the
  2026-09-21 batch-merge agent measured `1 failed, 1208 passed` in the worktree
  against a fully green run through `--repo`. **Forward slashes** in that path
  under the Bash tool, and confirm the total *moved* rather than reading the last
  line: the two `--repo` entries under "Recurring bugs to check" hold the numbers
  and the silent-skip shape.
- **Re-run `scripts/rebuild_projections.ps1` from the main checkout after
  anything that changes a projection input** — a stack value, a topology edge, a
  crop region — or the `[real]` tier judges a **stale** projection and its green
  is a statement about the previous tree. A 2026-09-06/08 incident, not a
  hypothetical. The script refuses rather than guessing when the projection it
  would overwrite was built from a tree it does not contain, so a refusal is
  information: read it, do not reach for `--allow-older-tree`.

### Where the one full suite runs

The canonical cadence leaves the *where* to this file, so: run it **after the
merge, in your review worktree**, because that tree is the merged code while the
main checkout sits on trunk and a `pytest` typed there measures trunk until the
operator's batch merge moves it. Arm everything a worktree can be given --
`node_modules`, the viewer tier through `--repo` — and name in the review what
the worktree still could not exercise. The "run the suite in BOTH checkouts"
entry additionally asks for the main checkout, and it is right to: that is the
*more restrictive* environment for anything resolving a real `data/` path, and
it has caught a red no worktree could see. Run it there too when the diff
touches path resolution or reads `data/`, say which checkout produced each
count, and do not read the main-checkout run as a verdict on the merged tree.

## When the work is a spec-library parse event (not a stack)

Added 2026-08-05 after `spec_library_v0`, the first work here that was neither a
stack nor plumbing. Everything above is written for stacks; a `spec-parse/v0`
event is the *same provenance audit one layer upstream*, and it is higher
leverage, because a bad library value launders itself into every stack that
later cites it wearing `confidence: "traced"`.

**Re-read the document yourself. There is no substitute and no shortcut.** The
pile is in the MAIN checkout (`C:\workspace\tolstack\data\inbox\specs\`); render
with drawing-checker's venv (`venv-win/Scripts/python.exe`, PyMuPDF is
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

- [ ] **`--repo` with backslashes under the BASH tool skips the whole `[real]`
      tier, and the runner still prints a clean total.** New 2026-09-15
      (`review/viewer_study_verdicts_and_gaps`). Every doc here spells it
      `--repo C:` + a backslash path, which is correct under PowerShell; under
      the Bash tool the shell eats the backslashes, `run_tests.cjs` resolves
      `.../workspacetolstack/data/...`, and the run reports
      **`302/302 passed`** with all **69** `[real]` tests gone (302 without the
      tier, 371 with it, on 2026-09-15). It is not wholly
      silent -- there is one `SKIP node-fs tier` line naming the mangled path --
      but it is one line above the total, so a `| tail -4` read misses it
      entirely. Use `--repo C:/workspace/tolstack` from Bash, and **check the
      total moved** before you believe a green. Same seam in
      `scripts/run_viewer_browser_tests.mjs`.
      **Re-measured 2026-09-22 (`review/policy_free_brief_residues`): the pair
      is now 480 with the tier and 393 without** — 87 `[real]` checks, up from
      69 — so read the *gap*, not the remembered numerals, and expect both to
      keep climbing. The silent half of this entry has since been fixed: the
      runner's own total line now reads
      `393/393 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED`, so a `| tail -1`
      read can no longer mistake the skip for a pass.

- [ ] **A vocabulary pairing compares SETS, so a consumer that ranks by the
      order is unguarded.** New 2026-09-15 (`viewer_study_verdicts_and_gaps`).
      `tests/test_js_python_vocabulary.py` and
      `tests/test_topology_projection.py`'s `JS_PAIRINGS` both assert
      `set(python) == set(js)` -- exactly right for "does the page have a branch
      for every value", and blind to order. `VA.worstVerdict` ranks a study's
      checks by `Object.keys(VA.VERDICTS).indexOf(...)`, i.e. by the order of a
      table whose order nothing checks: reversing the three keys left
      **367/367 fast tier and 13/13 pairing green** while two live studies
      (`pitch_system_end_stop_minus7`/`_plus72`, `marginal` + `pass`) rolled up
      as **PASS**. Ask of every new "worst last" / "weakest wins" tuple: *is the
      ORDER asserted anywhere, or only the membership?*
      (`ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order`.)
- [ ] **A new derived field reaches a screen, and the test that "matches field
      for field" now imports the producer's own helper.** Same handoff.
      `CheckResult.margin` -- the "by how much" the whole handoff exists to
      publish -- has no Python value test: mutating it to `interval.max` left
      the suite at its baseline red-count. The field-for-field projection test
      had been re-pointed at `B.rounded_check()`, the builder's own display
      rule, which is the right single-owner fix for *rounding* and makes the
      test structurally unable to see a wrong rule. The only value pin was a
      rendered string in the JS `[real]` tier, which reads the **built file** and
      so fires only after a manual rebuild. Ask: *which assertion would go red
      if this property returned the other end of the interval?*
      (`ISSUE_20260915_check_result_margin_has_no_value_test_in_python`.)
- [ ] **A new badge that REPLACES an older marking inherits none of its
      guards -- read what the diff DELETED, not only what it added.** Same
      handoff: the grid's `chip--zero-width` chip was removed and a
      `tvflag--no_tolerance` badge put in its place, and deleting the new
      badge's one line left **367/367 green**. Its sibling
      (`tvflag--unverified`) is pinned count-for-count in the same test, which
      is what makes the omission look like coverage. When a deliverable says
      "every affected row carries X", mutate X away per kind, not once.
      (`ISSUE_20260915_the_grids_no_tolerance_badge_is_unguarded_in_every_tier`.)

- [ ] **One sentence made honest, with the chrome around it still instructing
      the reader to do the thing.** New 2026-09-15
      (`surfaces_that_state_something_false`). The banner now says the feature
      is unavailable on this origin and the control is correctly *removed* --
      and two inches below, the detail hint still reads "click a face in the 3D
      view to bind it", the selects and the dev console are still live, and the
      3D pane the hint names is now genuinely absent because the fix skips
      constructing the scene. The honest sentence makes the surrounding
      instructions *contradicted* rather than merely unreachable, so a fix of
      this shape can leave the page stating something falser than before.
      **Load the page and read the WHOLE viewport, not the element the test
      asserts on** -- a screenshot in the configuration under test settles it
      in one look, and the fast tier cannot (`app.js` boots nowhere but a
      browser). Ask: what else on this page claims a capability the branch just
      withdrew? (`ISSUE_20260915_the_hosted_annotate_page_still_instructs_the_
      reader_to_bind_a_face`.)
      **Second sighting 2026-09-15, in the fix for the first, and it moves the
      question from "what else on this page" to "what else reaches this
      page":** `annotate_hosted_page_posture` withheld the whole workspace on
      the hosted origin correctly -- and `main()` has a *second* dead-end
      branch, `if (!picked.adapter)` (a local page in a browser with no File
      System Access API, i.e. every Firefox and Safari reader), which still
      renders the full bind workspace, a live dev console and a real empty
      `<canvas>` under its own honest sentence. Measured by deleting
      `window.showDirectoryPicker` in a `page.addInitScript` against the
      loopback server -- 20 lines of playwright, and the only way to see a
      state the suite's own browser cannot enter. So: **enumerate every early
      return and every terminal branch of the function the fix lands in, and
      ask which of them leaves the same chrome standing.** A fix scoped to one
      state is right; a *rule* stated for the app is a claim about all of them.
      (`ISSUE_20260915_a_browser_with_no_fsa_gets_the_full_bind_workspace_
      under_a_dead_end_sentence.md`, routed to the origin-posture brief.)
- [ ] **A runner that reports THAT something failed without reporting WHICH
      check failed.** Promoted by the 2026-09-16 triage sweep. Distinct from the
      entry below: that one is a guard that has stopped biting, this one is a
      guard that bit and whose verdict was thrown away on the way out.
      `scripts/run_viewer_browser_tests.mjs` accumulates `FAIL sub-check:` names
      through a ~1180-line `try` and prints them only at the end; **any** throw
      inside jumps to a `catch` that prints one `[topology file://] ERROR:` line
      and silently discards every name already collected. So the tier's
      `NOT WITNESSED: <entry>` line names the entry but not the reason, and
      "the tier never reached the witness" is indistinguishable from "the
      witness cannot see the difference" — two defects with different fixes and
      one message.
      **Measured cost: three separate sessions filed the same
      `card-layout-out-of-flow` defect in one day**, each diagnosing it
      differently from the same output
      (`ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_
      it_declares.md`, `..._card_layout_out_of_flow_mutation_reddens_an_earlier_
      check_so_it_is_never_witnessed.md`, `..._the_card_layout_out_of_flow_
      mutation_witness_stopped_witnessing_on_integration.md`; all three routed
      to `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`). All
      three asserted a *mechanism* and **all three were wrong**, in both
      directions: two said "aborts ~150 lines before the check"; this entry then
      said the line numbers contradict them (declared check at 1358, the
      timing-out hover at 1414, 56 lines *after*) and **that was wrong too** —
      `CARD_TRIGGER` is the same literal selector as the 1414 hover, so the
      Playwright call log cannot tell them apart. Settled 2026-09-16 by fixing
      the reporting and reading the count: `ABORTED after 22 sub-checks, 0 of
      them already FAILED`, and the declared check is sub-check 23. It was the
      hover on the line immediately above the check, and nothing had gone red.
      **Do not diagnose "where did a 1180-line `try` die" from a call log — make
      the abort line print a count, then read it.**
      **The one-line question: if this stage failed right now, would anything be
      printed that NAMES what failed?** Not "would it go red" — whether the
      *name* survives the path out. Ask it of every `catch`, every `finally`,
      every early return that reports, and every exit code that stands in for
      more than one outcome. Same shape is live in drawing-checker
      (`ISSUE_20260915_deploy_runner_discards_the_gates_summary_on_a_pass.md`,
      `..._hover_runner_step_4b_vanishes_when_its_own_locator_misses.md`,
      `..._deploy_log_resolve_uses_one_exit_code_for_a_miss_and_a_crash.md`), so
      it is a cross-repo class, not a local nit.
- [ ] **A guard that no longer witnesses what it claims, and says nothing about
      it.** The witness is coupled to an incidental property of the app; the app
      then changes *correctly* and the guard silently stops biting. Nothing goes
      red, so nothing announces the coverage left. Do not trust a green tier as
      evidence that a behaviour is pinned -- **mutate the line and watch it go
      red.** Promoted by the 2026-09-14/15 triage sweep, which found five in one
      window, three of them only because a reviewer mutated by hand: the card
      layout guard (the room cap subsumed its witness), the unpublished banner's
      "and nothing else" half (one-word mutation ships fast tier 260/260 and
      browser tier 17/17), `chainable()`'s false branch (`layoutMode = "chain"`
      unconditionally -- every tier green; `chainable()` and `layoutMode` were
      both deleted by `viewer_respine_whole_walk` on 2026-09-15 and the
      contract now lives on `views/topology.js`'s `marking`, so do not go
      looking for either name), the compact-density correspondence
      check (passes at comfortable density too), and `state.leaderStyle`
      persistence (asserted in two shipped docs, observable by no tier). See
      `docs/sessions/HANDOFF_20260914_guard_mutation_witness_tier.md`, which
      exists to make the class structurally visible rather than fixing five
      guards.
      **What that handoff left behind (2026-09-15), and what it asks of you:**
      the mutation is now a **declared** thing, not a thing a reviewer happened
      to try. `scripts/mutation_witnesses.json` holds, per guard, the exact edit
      it must redden on and the name of the check that must fail;
      `scripts/run_mutation_witness_tests.mjs` patches a shadow tree and fails
      unless that check goes red (`apps/viewer/README.md`, "The mutation-witness
      tier"). So the standing ask is no longer "mutate the line and watch it go
      red" and stop there — **when a mutation you tried by hand belongs to a
      guard that should keep catching it, add the entry**. It is five strings
      copied off the nearest one, which is deliberately cheaper than filing an
      issue about it. Conversely: a guard added by a handoff, with no entry and
      no hand mutation recorded anywhere, is a guard nobody has watched fail.
- [ ] **A guard that couples to the tree by TWO strings, with only one of them
      paired.** New 2026-09-15, reviewing the tier above. A
      `mutation_witnesses.json` entry names both where the mutation lands
      (`find`, in the app) and the sub-check that must print (`expect_red`, in
      the test file); `tests/test_mutation_witnesses.py` pairs only the first,
      so rewording a check name leaves an entry that can never be witnessed and
      a green pytest run —
      `ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`.
      Generalise it: when you accept a new declaration-plus-runner pair, list
      every string in the declaration that points at real code and ask which of
      them goes red on a rename. The one nobody checked is the one that rots.
- [ ] **The anchor check fires at MERGE time, and you are the one holding it.**
      `tests/test_mutation_witnesses.py` is the cheap half of the tier above and
      it reddens on a `find` that no longer resolves — which is most likely to
      happen when a handoff cut from an older `integration` meets app code that
      moved underneath it. Measured on its very first outing (this review,
      2026-09-15): `afbed4e` on `integration` replaced
      `opts.protocol !== FILE_PROTOCOL` with
      `!VA.isLocalPage(opts.protocol, opts.hostname)` in
      `apps/viewer/storage/adapter.js`, and the merge went green everywhere
      except that one assertion. **This is the guard working, not a defect in
      the work under review** — the tactical worktree could not see it. Re-point
      the `find` under the conflict carve-out, record the before/after line and
      the commit that moved it in the entry's `note`, and re-run
      `pytest -q tests/test_mutation_witnesses.py` plus the one entry
      (`--only <id>`) before you believe it.
- [ ] **A finding the handoff named but did not fix, recorded only in a
      `LESSONS_*` file.** APPROVE ends the handoff's ownership, and no triage
      sweep reads lessons — a lesson schedules nobody. Every "named, not fixed
      here" item in a lesson, a DoD sweep, or a "considered and left" list must
      have a `docs/issues/ISSUE_*.md` with frontmatter before the review closes,
      or **you** file it. Check the lesson's own leftovers against
      `docs/issues/` before approving. Promoted by the 2026-09-11 triage sweep:
      this shape appeared in four 2026-09-10/11 reports across dispatch,
      drawing-checker, tolstack and atp-post in a single window, and that sweep
      had to file the strays itself.
- [ ] **A dedicated handoff's target fix already shipped inside another
      handoff's review-response commit.** Two sightings on 2026-09-06, same
      day, same commit: `annotation_surface_mvp` got REQUEST CHANGES, and its
      review-response commit (`d0c3565`) fixed *both* named should-fixes at
      once before the two separate handoffs dispatched against those
      should-fixes' issues (`feature_identity_events_dir_data_root`,
      `annotate_vocab_pairing_test`) were even cut — each arrived as a
      single lessons-file commit reporting "no code change needed." Don't
      take that on faith: `git merge-base --is-ancestor <the response commit>
      HEAD` plus `git diff <that commit> -- <the in-scope files>` (empty)
      is what actually proves it, and both sessions did this. When a
      handoff's own `Source:` line points at an issue filed from a review of
      an *earlier* handoff, check whether that earlier handoff's own
      review-response commit already closed it before assuming there is
      code to write.
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
      **Third sighting (`topology_projection_emits_study_checks`,
      2026-09-09), a new variant — a transient FALSE positive from a
      concurrently-running sibling session, not a real defect:** running
      `pytest -q` in the main checkout mid-review reported
      `test_viewer_js_suite_is_green` failing on a `topologies[].studies[]:
      the projection writes [checks]` fixture-drift, even though this
      handoff's code was not yet on the main checkout's own checked-out
      branch (`master`) and could not have written that key. Cause: a
      concurrently-running review session for a *different* handoff
      (`review/tolstack_viewer_js_suite_drift`, per the shared projection's
      own `projection_provenance` block naming that worktree and a
      `built_at` seconds old) was rebuilding the same shared
      `data/projections/viewer/topologies.json` at the same moment — the
      read landed mid-write. Re-running the same test immediately after
      showed it clean. **When a main-checkout-only failure names a field or
      shape your own diff does not produce, re-run it standalone before
      treating it as real** — the shared `data/` root is not just
      environment-different from a worktree, it is a live, mutable resource
      multiple concurrent agents write to, and a single failing run there is
      not yet evidence, the way a repeatable one is.
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
      **Closed 2026-08-19** (`enumerated_state_doc_guard`) for the slice of this
      that has code-derived ground truth: `test_every_enumerated_viewer_state_is_named_in_a_live_document`
      requires every state `VA.EXPORT_STATUSES` and the `values_status` check
      can produce to be named by its code spelling in `apps/viewer/README.md`,
      and `test_the_enumerated_state_doc_guard_catches_the_08_12_deletion`
      replays this exact section deletion to prove it goes red. That still
      does not cover prose documenting no enumerated state (an architecture
      note, a launch paragraph) — the issue's shape 1 (required-heading
      manifest) and shape 3 (claim-count baseline) were rejected as their own
      staleness surfaces, so **that class stays this checklist item's job**:
      still diff the doc's headings against its previous version yourself.
- [ ] **A guard's exemption comment states a fact about the repo, not just an
      intent — re-verify the fact, don't trust the comment.** New 2026-09-06
      (`drop_stale_gitignore_publisher_exemption`). `traced_ratio_publishers()`
      exempted `data/inbox/specs/README.md` on both existence-check paths with
      `# gitignored: present only in the main checkout` — the file is tracked
      (`git ls-files data/` lists it, `git check-ignore -v` returns nothing) and
      always present, so the exemption silently absorbed the file's deletion
      instead of catching it, for over a month, in the guard's own demonstration
      of "cannot fail on a deleted section." A stale comment like this is
      invisible to every check in this list above it — it doesn't restate a
      count, it restates a belief. When a guard carries a named exemption
      justified by "gitignored" / "generated" / "not tracked" / similar, verify
      the claim yourself (`git check-ignore -v`, `git ls-files`) rather than
      reading the comment as still true; if it should still be conditional,
      gate it by the actual check (e.g. `git check-ignore`) at test time, not
      a hardcoded belief.
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
      a fact that lives only in a script docstring and a lesson is one the next
      session will not find; it belongs where a reader looks, which is
      `ARCHITECTURE.md` or the orientation in `CLAUDE.md`.
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
      first compliant from-scratch stack made the suite fail (the whitelist it
      names was a hand-copy that only walked the elements on disk;
      `test_source_ref_leaves_the_feature_identity_slot_open_and_empty` now reads
      the constant instead — see the fourth sighting below for what replaced it).
      At the time, a vocabulary lived in **three** places (SOP prose, the
      dataclass comment, the enforcing test) — the fourth sighting below has what
      replaced two of those three and where the replacement's reach stops; don't
      check three places today. **Third
      sighting (`sop_library_ref_pairing`, 2026-08-11)** — and it changes what you
      have to do here, twice over. It is
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
      checked". **Fourth sighting (`three_field_vocabularies`, 2026-08-19),
      closing `kind` and `role` rather than adding a fourth copy:** the vocabulary
      now lives in **two** places, and neither is a comment —
      `SOURCE_REF_KINDS`/`ELEMENT_ROLES` (`tolerance_stack/stack.py`, enforced by
      `__post_init__`) and the SOP's pipe-list, paired word-for-word by
      `tests/test_sop_vocabulary.py::test_the_sop_spells_the_same_vocabularies_the_code_enforces`.
      Do not look for a dataclass comment; there isn't one, on purpose. What that
      pairing does not cover is `SpecEntry.subject_kind` (`SUBJECT_KINDS` in
      `tolerance_stack/spec_library.py`) — the SOP is the *stack* author's document
      and never mentions it, so it has no prose to pair and is pinned only by its
      constructor test. Check the pairing test's own can-fail replay
      (`test_the_vocabulary_pairing_can_fail`) rather than re-deriving the diff by
      hand — that is the one thing left for you: whether a *sentence about a rule*
      (not a word list) drifted, which no vocabulary-vs-constant pairing can see.
- [ ] **A web surface saying something only its author can read.** New
      2026-09-15 (`viewer_component_names_and_reference_copy`), off Jeff's own
      review of the live pitch-link topology — and it is the same class of
      defect as a drifted vocabulary, one layer out: the words were correct
      about the *schema* and useless to the *reader*. What he found, in one
      sitting, on one page:
      an internal id printed as a part's name in the main table
      (`bolt_nas6403u11d`); a merged cell's component description and part
      number repeated in every row's element cell beside it; "no drawing
      recorded for this part" on a COTS fastener, which is true of the field
      and false about the part; `source_ref`, `crop_key` and `sha256` in body
      copy; absolute workstation paths (`C:/workspace/tolstack/data/...`)
      rendered beside a link; a rebuild **command** rendered in a hover
      popover for the reader to copy into a terminal; and a link that did
      nothing at all when clicked. So, whenever a diff touches `apps/viewer/`,
      `apps/annotate/` or any other web surface, read the **rendered strings**
      and check each of these:
      (a) **No internal id, field name or artifact filename in anything a
      reader reads.** An id is a deep-link handle and a debugging aid; put it
      on a hover title if it must exist at all. The guards are
      `apps/viewer/tests.js`'s two banned-string walks (one over the fixture,
      one over every live topology) and
      `tests/test_topology_prose_for_a_reader.py` over the authored documents
      — extend them rather than writing a third.
      (b) **One fact once per row.** Two adjacent cells repeating the same
      phrase is not a copy nit: it is what pushes the meaningful half of a
      label off the end of a column (`VA.elementDisplayLabel`, display only —
      a document is never edited to fix a layout).
      (c) **Say what is true, not which field is empty.** "No drawing
      recorded" describes the schema; "standard part — dimensions from
      NAS6403-NAS6420 Rev 4 · sheet 3" describes the part. Where neither
      exists, render **nothing** — never a sentence about an absence.
      (d) **A control the current origin cannot service must not render.**
      The broken "open the PDF" link was not a bad URL: Chrome refuses *every*
      navigation from an http(s) page to a `file:` URL, so on the
      drawing-checker-served origin the click silently did nothing (measured
      both ways, `VA.originOpensLocalFiles`). Ask of any affordance: which
      transports can actually service this, and does it disappear on the
      others?
      (e) **Never a terminal command, and never a workstation path.** Wire the
      action to a button or degrade to plain words. The banner is this repo's
      one sanctioned exception and states it once for the whole page.
      (f) **Provenance a reader did not ask for goes behind a disclosure, not
      into the reading flow** (`VA.disclosure`) — and a disclosure is a fold,
      never a place to hide a gap.
- [ ] **A test that is ALREADY red names a list, and the diff added to it.**
      New 2026-09-15 (`viewer_component_names_and_reference_copy`, fixed in
      review). `tests/test_provenance.py::test_every_byte_identity_claim_…`
      was red on master for a strategy brief's sake, and the author filed that
      correctly -- but the test reports *every* unbacked claim, and the branch
      had quietly added two of its own (`apps/viewer/README.md`, the new
      "checked against the citation, byte for byte" wording quoted into prose
      with nothing naming the comparison in the same block). `1 failed` reads
      identically at one item and at three, so a known-red test is a mask
      exactly the width of its own assertion message. **Read the failure's
      item list against the diff, never the pass/fail tally** -- and prefer
      `pytest <nodeid>` on the known-red test to eyeballing the summary line.
      The same question applies to any aggregating guard this repo has (the
      doc scans, the vocabulary pairings, the module inventory): *which rows
      does it name today, and which of them are mine?*
- [ ] **Single-sourcing a RENDERER hands the class prefix to the callee, and
      no tier reads a class prefix.** New 2026-09-15 (same handoff; the bug
      the author found by eye and shipped a fix for without a guard --
      `ISSUE_20260915_the_shared_crop_renderers_class_prefix_argument_is_
      unguarded_in_every_tier.md`). `VA.cropReference(box, entry, config,
      classPrefix)` serves four surfaces and the prefix carries its own
      separator (`"croppop__"` vs `"detail__crop-"`), so passing
      `"detail__crop"` renders `detail__crophead` -- unstyled, and measured
      green at 386/386 fast and 33/33 browser in review. Every assertion on
      those blocks reads `textContent`, which is right for copy and blind to
      this. When a diff factors a renderer out across surfaces, ask **what
      does each caller pass that only CSS can see**, and require one selector
      assertion per call site. Sibling of "Single-sourcing replaced N hand
      copies with ONE argument -- now mutate the argument", one layer down.
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
        that moved a value is the same false claim in a new place. **Including
        its *size*** — an amendment that opens "four sentences inside the
        material entry paragraph" is a count about the diff you are holding, and
        `material_cte_optional` (2026-08-17) had added **two**. One command
        settles it: `git diff -w master...HEAD -- <the row's path>`. Cheapest
        member of the stale-count family, because the evidence is the diff.
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
- [ ] **A doc promising a rendering the producer cannot emit.** New 2026-08-17
      (`material_cte_optional`), and it is the fixture-shape-guard rule moved into
      prose. Making `MaterialEntry.cte_1e6_per_c` optional is a *schema* fact; the
      viewer never sees it, because `stack_materials` projects only chain-named
      materials and a chain naming a CTE-less one raises in
      `load_thermal_fit_stack`. The lesson worked that out and **deliberately
      declined an unreachable `cte === null` branch in the JS** — and the same
      commit wrote the unreachable state into `apps/viewer/README.md`'s legend as
      *"(a `—` in the CTE column)"*, promising a reader something no build can
      show. Fixed inline. So when a schema field goes optional, ask **which
      surfaces can actually observe the new state**, and hold the docs to the same
      reachability bar the code was held to — a doc has no test to make it fail.
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
      **Second sighting (`endstop_vision_baseline`, 2026-09-01), and it moves the
      entry from "a value without its meaning" to "a value without its GD&T
      glyph":** `213668-002` puts **zero** of `⌀ ⌖ ⏥ ⌓ ⌭ ↗ Ⓜ Ⓛ` in its text
      layer across both sheets while printing a boxed `⌖ ⌀0.2 A B` on sheet 2 —
      the frames are drawn as vector geometry there. `215735-A`, `212966-006-A`
      and `546791` all extract their glyphs fine, so a sweep that works on three
      drawings silently degrades on the fourth into loose tokens (`0.2 A B`).
      One command settles it per document: count those eight characters in
      `page.get_text()`. **A zero means every feature control frame on that
      drawing is invisible to a text sweep**, which is how this handoff recorded
      a position callout as absent (worksheet F7).
      **Third sighting (`endstop_retrace_acquired_docs`, 2026-09-04), and it is
      the reviewer's own tool this time, not the author's.** `215071-C.pdf`
      (and `213668-002`'s zone B12) render each digit of a dimension as its own
      text span, so `⌀64.030 +0.030/0.000` extracts as `'6 4 . 0 3 0 + 0 . 0 3 0'`
      — a literal `--pattern "64\.03"` search returns **zero hits** on a
      citation that is exactly correct, because the regex expects contiguous
      digits and the PDF gives one character per span with a space joining
      them. A reviewer trusting that zero would file a false "citation does not
      resolve" blocker. The fix is cheap and was used to verify every citation
      in this review: `--pattern "."` (or a single short digit run) dumped per
      zone, which shows the space-separated text plainly, or crop and read the
      render directly — never conclude a value is absent from a zero-hit
      multi-character regex without first dumping that zone's raw text.
- [ ] **A claimed *absence* — "the document is in hand, was read in full, the
      value is not there".** New 2026-09-01 (`endstop_vision_baseline`). It is
      the strongest claim a provenance audit makes and the one nobody re-checks,
      because it reads as diligence; a false *match* at least looks suspicious.
      Two questions, both cheap: **what did the read actually see** (text layer /
      vector geometry / raster — on this document set those see different
      drawings, per the entry above), and **grep the value across every PDF in
      `data/inbox/drawings/`, not just the document the claim is scoped to**.
      Two absence claims were checked that way in that review: the "only 0.12 in
      the reachable set" held (and held repo-wide, which is stronger than
      claimed), and row 61's "no 0.20-width position callout on 213668-002" was
      false.
- [ ] **A document set that was *chased into* rather than *enumerated*.** New
      2026-09-01 (`endstop_vision_baseline`), and it is the failure that produced
      a whole fictitious taxonomy class. The attempt opened eight PDFs "in the
      order the chase forced" out of the ~30 in `data/inbox/drawings/`, then
      concluded that two owners ("pitch arm", "ring gear") resolve to **no part
      number in any pipeline document**. Both resolve — `215071-001` and
      `215072-001` — in two unopened files in the same directory, one of which
      (`555786-001`, dated the day the handoff was staged) the attempt had
      **named in its own prediction**. So: whenever a finding is of the form
      *"absent from the pipeline"* or *"not resolvable"*, `ls` the inbox yourself
      and diff it against the author's opened-documents list. A negative claim
      over a corpus is a claim about the whole corpus.
      **Second sighting (`thermal_exception_declared`, 2026-09-02), and the
      corpus is the repo's own prose**, which has no `ls`. The handoff named
      three passages stating the one-fold rule; the author found two more by
      **following the pointers in the ones it named** and wrote *"there were
      five"* into the lesson and *"every passage that states the rule"* into
      ARCHITECTURE.md, this checklist and the new test's docstring. Searching for
      the rule's **own words** instead finds four more, all asserting the
      absolute the change existed to retire — including one *inside the section
      the new test reads*
      (`ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`).
      So when work under review claims to have found *every* passage/document
      stating a rule, do not audit the list — **re-run the search**, and run it
      as: (a) the words the passages share, not the passage names, and expect
      **more than one phrasing family** (here *"combines two element values"* vs
      *"the only place element values are combined"*); (b) **whitespace-
      flattened** over every tracked `.md`/`.py`, because prose wraps and one of
      the four was split between `place` and `where`, invisible to `grep`; (c)
      including the file the handoff was told not to touch, which is a finding to
      *file*, not to fix. Ten lines of Python over `git ls-files`, and it is the
      only thing that turns "every" from a claim into a measurement.
      **For this particular rule the ten lines are now a test**
      (`rule_statements()` in `tests/test_thermal_exception_list.py`, 2026-09-03),
      so the reviewer's job moved up a level: not "did they find every passage"
      but *is the scan's corpus, pattern and qualifier set still the right ones* —
      a derivation that quietly stops matching is the same silence one level up.
- [ ] **The drawing-checker snapshot taken with something other than
      `scripts/snapshot_drawing_checker.py`.** New 2026-09-01
      (`endstop_vision_baseline`). The attempt evidenced the read-only invariant
      with an ad-hoc `find | stat` and reported **5382** entries; the script says
      **5380** for the identical set (its listing omits the two root dirs). The
      invariant held, but the committed figure did not reproduce with the repo's
      one computing command and the artifact left behind was a `.txt` in a
      session scratchpad, which the next reviewer cannot `diff`. Require the
      script. And note the reviewer's cheap trick: **a prior review session's
      `dc_after.json` is usually still on disk**, so diffing it against a fresh
      snapshot brackets the whole tactical session *and* your own review in one
      command — that is how this invariant was verified independently.
- [ ] **Your own inline fix left a residue — grep for the other copies of the
      figure you just corrected, including in the file you are not editing.**
      New 2026-09-01 (`endstop_vision_baseline`), and it is the "guarded copy
      fixed, unguarded copies missed" entry turned on the reviewer. That review
      filed a finding about a snapshot count being **5382** where the tool says
      5380, corrected the worksheet's §6 — and left the *lesson's* copy of the
      same two figures standing; separately it corrected "six more PDFs" to
      seven in one section and not in another. Caught only by a re-check pass.
      **A correction is a change, so it has the same residue problem as the
      change it corrects.** Two habits that cost nothing: after every inline
      fix, `grep` the whole branch for the superseded literal and confirm the
      only survivors are inside correction blockquotes; and before you write the
      verdict, **re-derive the artifact's counts from its own row lists by
      script** rather than by eye — for a table-heavy worksheet that also proves
      the cross-table invariants (here: taxonomy class A had to equal the
      mismatch∪candidate set, G the traced set, the remainder the gaps), which
      is what makes a later disagreement between two tables impossible rather
      than merely unobserved.
- [ ] **A sibling handoff landed on `master` while you were reviewing.** The board
      runs handoffs in parallel, and two that are each internally correct can
      merge into a contradiction. `sop_edits_apply` and `spec_library_v0` both
      touched `hardware_entries.json` and `test_tolerance_stack.py` on 2026-08-05:
      the first asserted `values_status != "inline"` ⟹ `values_source is None`,
      the second promoted an entry to `library` while deliberately keeping its
      `values_source`. Neither branch's suite could see it; the merged tree failed.
      **Before you write the verdict: `git log --oneline HEAD..master`, and
      merge master into your review branch.** A review that only tests
      `handoff/<slug>` against its own merge-base is testing a tree that will
      never exist. **Keep the merge; what you run on it is the risky subset for
      the UNION of two diffs** — yours, plus whatever the incoming range touched.
      `git log --oneline --name-only HEAD..master` gives you that second file
      set: map both through "Choosing the risky subset" and run the union. This
      step is deliberately **not** a full-suite order, and the reason it can be a
      subset is that a semantic conflict is a collision between two file sets you
      can both *enumerate* — the union covers it — while the full suite on the
      merged tree is the post-merge run. **Second sighting (`stack_viewer_v0`):** same cause,
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
      assume the count is stale — but do **not** buy a fresh full suite here to
      settle it. A stale count in a lesson is a documentation finding, not a test
      failure; the shipping count comes from the post-merge run, and whatever you
      quote from it names the checkout that produced it.
- [ ] **After you merge `integration` into your review branch, re-run
      `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
      and report the count in your review.** This is an instruction, not a
      ritual, and the reason is that **your merge is the only point in the
      lifecycle where nothing re-runs this tier**. The other three tiers answer
      *does the app still behave?*; this one answers *would the guards notice if
      it didn't?*, and it is the only tier whose answer can change **as a result
      of a merge** while every branch involved is green on its own.
      Measured: `card-layout-out-of-flow` was WITNESSED at `473106e`, `0b898da`,
      `f629942` and `0573826`, and **NOT WITNESSED from `afcbbb4` onward** — a
      review merge (`Merge branch 'integration' into review/pitch_link_known_
      bands`) that brought `viewer_study_verdicts_and_gaps`,
      `respine_tween_fidelity_round2` and `annotate_hosted_page_posture`
      together. None of the three could have caught it alone. The coverage left
      `integration` silently
      (`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_
      never_re_run.md`). **Corrected in review 2026-09-18:** that issue's
      "stayed gone for four days and three duplicate filings" is the whole
      `card-layout` *guard* saga (first filed 2026-09-11), not this regression —
      `afcbbb4` landed 2026-09-15 22:28 and was bisected and filed at 23:14 the
      same night, **46 minutes**. Do not quote the four days forward. The
      argument does not need it: the cost of a merge-only regression is not how
      long it happened to hide, it is that no branch's green can see it.
      Two practical notes. The `--repo` is not a worktree escape hatch: without
      it every `[real]` witness is skipped and reported as a miss, and the run
      tells you so on its first line. And a **drop** in the witnessed count is
      the finding — a merge that takes the count down is a REQUEST CHANGES on
      the merge, not on either branch, because the coverage that left is not
      attributable to one of them. If the full tier is too long for your cycle,
      the trigger worth stating is mechanical: the tier can only see what the
      shadow tree holds, and `SHADOWED` in `scripts/run_mutation_witness_tests.mjs`
      is that list — read it there — so a merge touching nothing it names cannot
      change the answer.
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
- [ ] **A persistently-red test's explanation is copied forward across
      reviews without re-derivation — the same failure as the entry above,
      applied to a "known flaky/pre-existing" label instead of a check
      verdict.** New 2026-09-08 (`annotate_deep_link_and_part_filter`).
      `apps/viewer/tests.js`'s `[real] the pitch system's four forks are
      marked` has failed the same way (`expected 4, got 5`) since at least
      2026-09-06, and `LESSONS_20260908_viewer_v2_single_nav.md` §7 attributed
      it to a **rebuild race** (a concurrent handoff touching
      `docs/topologies/` mid-build). That diagnosis was never re-tested: a
      rebuild from a tree containing all of `integration` still produces 5,
      stably, and `docs/DAG_TOPOLOGY.md`'s own L2 section plus
      `REVIEW_20260906_mechanical_stroke_stack.md`'s independent Python
      re-derivation (`len(t.branch_nodes())`, not read from prose) both
      already said 5 was correct **before** the race theory was written down.
      Three reviews since (including this handoff's own lesson) repeated
      "pre-existing, unrelated" without checking whether the original
      explanation was ever right. Filed:
      `ISSUE_20260908_pitch_system_four_forks_test_is_stale_not_a_race.md`.
      So: when a report explains away a red test as a race/flake/pre-existing
      issue, don't just confirm the test *was already failing before this
      branch* (necessary, not sufficient) — check whether the **stated
      cause** was ever independently verified, the same way you'd re-locate
      what a prior PASS claims to have checked.
- [ ] **A second app now has its own command layer — expect a third.**
      New 2026-09-08 (`annotate_deep_link_and_part_filter`). `apps/annotate/`'s
      `commands.js` (a tokenizer + single-dispatch registry, DOM-free, with
      pure helpers like `resolveMeshIdentifier`/`planIsolate` tested by
      `run_tests.cjs`) is architecture, not a stack-authoring artifact, so
      none of the mandatory checks 1–7 apply to it — but it has its own
      failure mode worth a name: a UI control or the deep-link boot path
      mutating `state`/`scene` **directly** instead of through `AA.exec(...)`
      is a parallel code path the whole design exists to prevent. Grep for
      the pre-command-layer call shapes (direct `state.scene.*` calls outside
      a `cmd*` handler, a `<select>`'s `onchange` not routed through `exec`)
      whenever a future handoff touches `apps/annotate/app.js`.
- [ ] **A `new Promise((resolve) => {...})` gate with no reject path hangs
      forever on its unhappy path.** New 2026-09-14
      (`annotate_load_gate_settles_on_failure`). `apps/annotate/app.js`'s
      flyout-command gate (`whenLoaded`, now `exec_queue.js`'s `ExecQueue`)
      only ever called `resolve()`, from two of `loadAll()`'s call sites; every
      `await` in between them could reject and leave every queued command
      hung on `await whenLoaded`, inside its own `try` — never reaching the
      `catch`, the banner, or the reply the caller was waiting on. The fix
      pattern: capture **both** `resolve` and `reject`, settle with the
      reject path in a `catch`/`finally` around whatever can fail, and make
      the queue itself never reject (resolve to `{ok, result|error}`) so
      downstream `.then()`s don't need their own try/catch per item. The
      session's own lesson-mandated grep (`new Promise(` across
      `apps/annotate/`) found no second instance this time — but grep for
      this exact shape (`new Promise((resolve)` — one-arg, no `reject` in
      scope) whenever a future handoff adds or touches a promise gate in
      either app, since one sighting rarely stays the last.
- [ ] **The projections are stale unless you rebuild them.** Nothing rebuilds
      `data/projections/viewer/` — no hook, no ops verb, no watcher. A stack
      changed on the branch under review will render as the previous build, and
      the viewer's banner reports the build time rather than refusing. Re-run
      both scripts against the MAIN checkout before you judge anything the viewer
      shows: `venv-win/Scripts/python.exe scripts\build_viewer_projection.py
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
      `venv-win/Scripts/python.exe -m tolerance_stack --data-root
      C:\workspace\tolstack\data`. Same stamp, same exit-3 gate, same rule — and
      the same "only trees that HAVE the gate are gated" hole, so a `master`
      checkout that predates the merge still clobbers it silently. Rebuild it too
      whenever `docs/spec_library/events/` moved, and diff old against new: the
      only legitimate difference is the `provenance` block (there is deliberately
      no top-level `built_at` on this one).
      **The three viewer projections can be stamped by three DIFFERENT trees at
      once, and then nobody's `[real]` tier is green** (measured 2026-09-14,
      review of `annotate_affordances_flyout_and_mesh_gating`: `results.json` =
      `handoff/stack_title_style_pass`, `crops.json` =
      `handoff/spec_crop_region_registry`, `topologies.json` = the review
      branch — 291/294, and none of the three failures belonged to the branch
      under review). **Print all three provenance stamps before you read a
      `[real]` result**, and attribute each failure to the tree that wrote the
      field it names; the drift lands in the *value-guard* tier as well as the
      shape tier, where it is indistinguishable from a real untaught value.
      `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`
      (which the reviewer extended with this third instance).
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
      precisely to catch a live shape the fixtures cannot produce.
      **Updated 2026-09-18 (`real_tier_red_and_the_skipping_tier`):** the skip
      is no longer silent. The runner's own total line now reads
      `369/369 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED` (the skip leaves
      the numerator *and* the denominator, so the count is of checks that ran),
      and `tests/test_viewer_js_suite.py` **fails** rather than skips, so a
      worktree's `pytest -q` is `1 failed, …` by design. What did **not**
      change: the runner still **exits 0** on a skipped tier, deliberately, so
      the mutation-witness harness and the browser runner keep the exit code's
      existing meaning — a caller testing `$LASTEXITCODE` instead of reading the
      line still sees success. So a report quoting a JS count
      **must say whether the tier ran**, and you re-run it yourself as
      `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`. **Forward
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
      **Second sighting (`confidence_vocabulary_single_definition`, 2026-08-18),
      and it moves the hole into the rule's own exemption clause.** The new sibling
      `js_array_strings` announced "anything at depth 1 that is not a string, a
      separator **or a nested bracket** raises" — and that third exemption is the
      whole bug: an opening bracket bumped `depth`, elements are collected at depth
      1 only, so `["a", ["b"]]` returned `{"a"}`, dropping a word in silence in the
      one function written to make silent drops impossible. The sentence stayed
      literally true throughout. So **read a "this raises" rule for what it
      exempts, and feed the extractor each exempted construct** — the raising cases
      are the ones the author already thought about. Fixed inline (the bracket
      raises; both nested shapes pinned). Same review, the *first* bullet above
      recurred too: the regex-literal caveat still said "the three table bodies" at
      2026-08-12 line numbers with six tables present, in a docstring the handoff
      had just edited two paragraphs higher — re-derived and re-dated inline.
- [ ] **A normalising `__post_init__` that `tuple()`s a "list of strings" field.**
      New 2026-08-13 (`check_completeness_schema`). `CheckResult.excluded_terms`
      is `Sequence[str]`, coerced with `tuple(...)` and then validated
      element-by-element — and `tuple("abc")` is `('a','b','c')`, every member a
      non-empty string, so the validator waves it through. A stack file writing
      `"excluded_terms": "link-eye-width--no-document"` instead of `[...]` — the
      likeliest slip for a field the SOP calls "one free string per term" —
      became **27 excluded terms**, printed on the card and expanded into the gap
      list. Fixed inline by refusing a bare `str` by name. Note the near miss
      that hides it: a string *containing a space* happens to raise, on the
      `' '`, with a message about the wrong thing — so a five-second probe with
      the exemplar text says "validated". **Feed every `Sequence[str]` /
      `Iterable[str]` field a bare string**, hyphenated, and see what comes back.
- [ ] **A doc edit that turns an authoring instruction into an automatic
      consequence — check the two things share more than a name.** New 2026-08-13
      (`check_completeness_schema`). SOP Step 5c said *"add the omitted element to
      `gaps` as item 1"*; the handoff appended *"— the viewer's gap list is built
      from `excluded_terms`, so this happens by writing the field"*. Two different
      artifacts are called gaps: the **authored, ranked Source gaps** table (Step
      6, item 7), which carries the closing document and is the input to
      `docs/spec_library/intake_queue.json`, and the viewer's **derived** gap
      list, which carries neither. A future author following that bullet skips
      the ranked entry entirely — i.e. the edit deleted a step by describing it
      as automatic. Fixed inline. So when a diff rewrites an instruction as a
      consequence, ask **which artifact actually gets written**, and check the
      *other* one is still someone's job.
- [ ] **A harness artifact committed at the end of a written file.**
      `LESSONS_20260813_check_completeness_schema.md` shipped with a literal
      `</content>` / `</invoke>` as its last two lines — a tool-call fragment that
      leaked through a `Write`. Invisible in a rendered markdown preview and
      below the fold of every excerpt. Trimmed inline. `tail -c 100` (or
      `git show HEAD:<path> | tail -3`) every file a handoff *created*, and grep
      a diff for `</invoke>`, `</content>`, `<parameter`.
- [ ] **A guard credited with a rejection a *different* guard made.** New
      2026-08-13 (`spec_pile_gap_join`), and it is the cheapest vacuity check
      there is: **delete the guard and re-run the suite.** `_as_range` in
      `tests/debug_report_spec_pile_gaps.py` has three rules, and two tests
      named the same-digit-count rule as what rejects `MS9363-09` and
      `MIL-STD-889D-2021`. Neither is true — `MS9363-09` dies on `hi > lo`
      (9 is not above 9363) and `MIL-STD-889D-2021` never matches the regex at
      all, because the revision letter `D` sits between the number and the dash.
      Deleting the digit-count rule left **all 43 tests green**, so the rule was
      documentation and its own case (`MS9363-99999`, a *wider* low end) was
      untested. Fixed inline, with the missing case added. The general move: for
      every rule a comment or docstring says is load-bearing, remove it and see
      what turns red; a prose attribution is not a check, and a multi-rule
      validator is where the wrong one gets the credit. And while you are in
      there, ask what the surviving rules still let through — here
      `NAS1121-2025` (basic number + year, both four digits, ascending) parses
      as a 905-wide range and no guard sees it, now pinned as a known hole.
- [ ] **One page number quoted for two copies of "the same" document.** New
      2026-08-13 (`spec_pile_gap_join`). The pile holds the RBC plain-bearing
      catalogue **twice** — a 2016 reprint and the 2008 web edition — and the
      same NAS76/NAS77 tables sit at printed pages 91/92 in one and **97/98** in
      the other. The handoff wrote *"page 92 of both RBC plain-bearing
      catalogues"* into six places (the allowlist, `EXTRA_COVERAGE`, a stack
      note, a hardware gap, a worksheet blockquote, a gap row) after opening the
      2016 one. Corrected inline. Two durable parts. First: **when the pile holds
      more than one copy of a document, a page address is per-copy** — a citation
      naming a page must name which file, or name the *table* instead of a
      number. Second: the guard that looks like it covers this
      (`test_every_extra_coverage_row_says_which_page_it_was_read_on`) asserts
      the word "page" is present and that the row carries a date; it cannot see
      whether the page leads there. Open the second copy yourself.
- [ ] **…and the same handoff's sixth sighting of the stale-count entry above,
      logged only because of *where* the count was**: the lesson's
      *"created three new candidate rows"* described the tool's **own output**
      and was five keys / seven rows. A figure a one-line re-run can produce is
      the one most likely to be typed from memory, and it sat in the sentence the
      lesson calls "the single most important input to the enforcement
      decision". Corrected inline, with the reproducing command written beside
      it. When a handoff builds a reporter, **run the reporter and diff it
      against every number the lesson quotes about it.**
- [ ] **A second copy of a producer's condition, with its divergences written out
      as a list.** New 2026-08-13 (`spec_citation_identity_rendering`). Two
      scripts must stay independently re-runnable, so
      `build_viewer_projection.identity_rule_of_ref` deliberately re-derives the
      rule `build_viewer_crops.resolve_pdf` applies rather than reading the
      answer out of `crops.json` — the right call, and the handoff paired the two
      with a `[real]` test. What needs reviewing is the docstring's **"the one
      place it deliberately diverges"**: that sentence is a completeness claim
      about a hand-copy, and it is exactly as checkable, and as wrong, as a
      count. Here it named the on-disk check and missed the empty `document` —
      `resolve_pdf` refuses a citation naming no document before any kind branch,
      the marker did not, and `SourceRef.document` defaults to `None` with
      nothing requiring it for `spec`, so a `kind: "spec"` slip rendered *"the
      filename above IS the identity of the bytes"* above a blank. Fixed inline
      with the guard and two parametrized cases. **Read the producer top to
      bottom against the copy** — every early return, not just the branch the
      author was thinking about — and note the direction: the agreement test only
      speaks after the live data has already moved.
- [ ] **A doc-scan guard's *false positive* — feed it the shapes this repo
      actually writes.** New 2026-08-17 (`traced_ratio_guard_freshness`), and it
      is the mirror image of every entry above: those ask what a scanner cannot
      see, this asks what it sees that isn't there.
      `_retired_ratio_pattern` matched a retired figure as
      `\b<n>\b[^.\n]{0,40}?\bof\s+<m>\b` — a 40-character wildcard anchored on the
      first number alone — so it read the repo's own long form, *N traced /
      M inferred / K untraced, out of T element instances* (the shape check 7
      above asks **every review report** to state), and matched on the
      **inferred** column: the *current* figure written long,
      *5 traced / 3 inferred / 18 untraced, out of 26*, was flagged as the retired
      `"3 of 26"` — quoted here because this file is one of the eight the scan
      reads, which is how the paragraph you are reading was itself caught. The
      guard firing on the one number it exists to protect, and the
      natural repair for whoever hits it is to delete a correct figure. Narrowed
      inline (the wildcard is reachable only behind the literal word `traced`).
      Two durable moves, both cheap: **feed the scanner the live strings** —
      here the long form sat three lines above in the handoff's own lesson, and
      the lesson's character-count argument about the window was wrong in both
      directions (39 chars, so it *did* reach; and it never considered the
      inferred column at all) — and **write the negative case from the guard's own
      list** (`for figure in _RETIRED_TRACED_RATIOS: ...`) so it can neither go
      vacuous nor go stale as the list grows. Generalise: a matcher with a wide
      wildcard is a second matcher for shapes nobody enumerated; a green suite
      only proves no *live* doc trips it *today*.
- [ ] **A doc citing a symbol by name — resolve the name to the thing that
      actually changed, not to *a* thing that exists.** New 2026-08-18
      (`confidence_vocabulary_single_definition`), and it is the stale-count
      family's non-numeric member: the failure survives every check the repo owns
      because the name is **real**. That handoff's `PROVENANCE.md` row and its
      lesson both said the second assertion it rewrote was in
      `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status`;
      the edit was in `test_every_inline_hardware_entry_cites_where_its_values_came_from`,
      forty lines up. Both tests exist, both read `hardware_entries.json` as raw
      JSON, so the *argument* around the name was sound and a `grep -c` for it
      returns 1 — and the sentence was the one telling the next agent **not to
      delete that line**, so the pointer sends them to the wrong function to
      preserve. Corrected inline. The check costs one command: for every function,
      constant or file a diff's prose names, `git diff master...HEAD -- <file>`
      and confirm the hunk falls inside that symbol (`ast`, or just the nearest
      preceding `def`). Do it for **file:line** citations too, which age faster
      than names.
      **Second sighting (`architecture_inventory_quantifiers`, 2026-08-21), and
      the wrong name this time is not even real.** The new
      `tests/test_architecture_inventory.py` module docstring named
      `test_hardware_entry_count_claims` in `tests/test_tolerance_stack.py` as
      "the count-claim scanner" — no such test exists anywhere in the repo. The
      actual scanner is `test_no_live_document_states_an_unguarded_hardware_entry_count`.
      A one-command check would have caught it: `grep -rn <name> tests/`
      returning nothing is a stronger tell than a name that resolves to the
      wrong symbol, and it costs the same command. Fixed inline in review.
- [ ] **A workbook worksheet's own element-instance count needs
      re-derivation from its section tables, separately from its `traced`
      ratio.** New 2026-08-25 (`endstop_graft_workorder`). Every prior
      "recompute the ratio" sighting was about the `traced`/`inferred`
      distinction; this one was a plain arithmetic miscount of one section's
      row range (§2c claimed 11, rows 30–45 are 16), which moved the total
      from 38 to 43 and was copied into 3 files (the worksheet's own
      blockquote and prose, the README contents-table row, the LESSONS
      heading) before anyone re-added the rows. Worse, the blockquote line
      itself read "38 traced" against a "0 traced" conclusion stated
      everywhere else in the same document — an inverted assertion sitting
      right beside the miscount, not just a stale digit. **Count each
      section's row range yourself** (`tests/debug_dump_tol_stack_xlsx.py`
      against the source workbook, not the worksheet's table) whenever a
      non-JSON, workbook-only worksheet states an element-instance count —
      there is no `_counts()`-style function backing this kind of count the
      way there is for the JSON-stack traced ratio, so nothing mechanises it.
      Both fixed inline in review.
- [ ] **A `[+clamped_column path, -fastener]` budget check's "worst case" is not
      always the larger magnitude — verify against the check's own physical
      mechanism, not against check 2's pitch-link example by shape alone.**
      New 2026-08-25 (`fastener_stack_shadow`). `rotor_fastener_length`'s nine
      `grip_budget__*` checks share `pitch_link_to_pitch_plate`'s exact term
      shape (`{path: clamped_stack}, {element: grip, sign: -1}`, `complete:
      false`), and naive physical reasoning ("a longer grip clamps more, so
      it's the safer/best case") says the worksheet's quoted "worst case"
      (`|WC min|`, grip at max) is backwards — it looks like it's reporting the
      *most permissive* combination as if it were the binding one. That
      reasoning is wrong: per JPS00094 5.5.5 and the pitch-link check's own
      `guidance` comment ("negative means the shank sits proud of the bearing
      face, so the nut engages incomplete threads"), a grip *longer* than the
      clamped stack is the failure mode, not a longer stack being short of
      grip — so the binding (largest-required-missing-material) case really is
      grip-at-max, and `|WC min|` is correct, matching the pitch-link
      precedent exactly. **Do not resolve a check-2-shaped question from
      physical intuition about which end "sounds" conservative — reread the
      sibling check's own `guidance` string (`git grep` the phrase "incomplete
      threads" or similar for the archetype) and confirm the new check's
      criterion polarity and term list are identical before trusting or
      distrusting either one.** This one was correct as authored; almost
      flagged as a blocker by working the physics forward instead of checking
      the established precedent first.
- [ ] **Never run `git checkout <commit> -- .` (or any whole-tree path
      checkout) against the MAIN CHECKOUT to "just inspect" something.** New
      2026-08-25 (`fastener_stack_shadow`). Unlike a branch switch, `git
      checkout <tree-ish> -- <pathspec>` force-overwrites the working tree
      *and* the index for every matched path from that tree-ish, regardless of
      whether the working copy differs because of staged, unstaged, or no
      changes at all — an unstaged, never-`git add`ed edit is not protected
      and is not recoverable via `git fsck`/reflog afterward. This review
      command clobbered seven files' worth of another session's uncommitted
      `apps/viewer/*` work-in-progress sitting directly in
      `C:\workspace\tolstack` (recovered only because that session still held
      the content in its own context — see
      `ISSUE_20260825_stack_viewer_layout_v2_edited_the_main_checkout_directly.md`
      for the compounding cause). **Use `git show <commit>:<path>` (fully
      read-only) to inspect a file at a commit; never a working-tree
      `checkout` against the shared main checkout**, even to "just look."
      If you must compare trees in the main checkout, `git stash push -u` your
      own scratch first and confirm `git status` is clean before any command
      that touches the working tree there.
- [ ] **A Windows path with backslashes passed to a Python script's
      `--data-root`-style flag from the Bash tool silently writes to the wrong
      place — no error, just a stray directory in cwd.** New 2026-08-25
      (`fastener_stack_shadow`). `python scripts\build_viewer_projection.py
      --data-root C:\workspace\tolstack\data` under the Bash tool (POSIX sh)
      has its backslashes eaten before Python ever sees them, so the script
      received `C:workspacetolstackdata` and happily created and wrote into a
      new `workspacetolstackdata/projections/viewer/results.json` relative to
      cwd — printing a plausible-looking (if you don't read closely) "wrote
      C:workspacetolstackdata\..." line and exiting 0. **Always pass
      `--data-root` with forward slashes under the Bash tool**
      (`C:/workspace/tolstack/data`), and `ls` for a stray
      `workspace<repo>data`-shaped directory in cwd after running any of this
      repo's `--data-root` scripts if you ever did use backslashes.
- [ ] **A CSS/layout change is unverified by the fast tier — always run the
      browser truth tier for one.** New 2026-08-25/26 (`stack_viewer_layout_v2`).
      `apps/viewer/run_tests.cjs`'s DOM shim has no geometry: it cannot fail on
      "this element is visually behind another" or "this table is wider than the
      space beside it," so a layout defect ships 100% green on that tier alone.
      This handoff's own truth-tier run caught a real one:
      `scripts/run_viewer_browser_tests.mjs` timed out clicking a row because the
      new right pane intercepted pointer events, root-caused to (a) a flex item's
      default `min-width: auto` re-asserting itself the moment `.stackview` got
      wrapped in a new flex container (`.center`) — `min-width: 0` has to be
      re-applied to the item **at its new nesting level**, it does not inherit
      through a wrapper — and (b) the table having nowhere to put overflow
      (`overflow-x: auto` fixed it). A reviewer who trusts `node
      apps/viewer/run_tests.cjs` alone for a layout/CSS diff is trusting a tier
      that structurally cannot see the defect class; run
      `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
      (needs `npm install` — `playwright-core` only, no browser download) and
      confirm 4/4 yourself. Re-verified in this review, still 4/4 on the merged
      tree.
- [ ] **A doc fix that historicizes the noun clause but leaves the sentence's
      trailing imperative in the present.** New 2026-08-27
      (`review_checklist_vocabulary_wording`). This very checklist's
      "Documented vocabularies drifting" bullet had already been partly fixed,
      inline in `three_field_vocabularies`'s review, by prefixing "At the
      time" to the vocabulary-count claim to make it historical — but the same
      sentence still ended "check all three, not two," an imperative left in
      the present tense, which a reader hits three sentences before the fourth
      sighting states the real, current count (two). Scoping the *claim* to
      the past does not scope the *command* the same sentence still gives —
      check both halves of a corrected sentence separately, not just the
      clause that names the stale fact.

- [ ] **A structural count restated in prose about a graph, JSON or diagram the
      reader is not holding.** New 2026-09-01 (`dag_topology_format`), and it is
      the stale-inventory entry's newest surface: the first topology documents
      shipped introducing the pitch system as "three grounded loops" when its
      cycle rank is **4** (the hydraulic-brake path, modelled in the same file
      and counted in the same sentence's "four branch points", is the fourth),
      and the L1 topology as "six interfaces" when it has **7**. Everything else
      in both sentences was right, which is what makes this class survive
      review: five correct figures buy the sixth. **Recount every figure in an
      inventory sentence separately** — the arithmetic per figure is one line —
      and remember the counts are *derivable*, so the fix is a pairing rather
      than a correction. Mechanised for topologies by
      `tests/test_topology.py::test_the_doc_states_this_graphs_whole_shape_and_states_it_right`
      (which also requires the inventory to be **complete**, closing the
      deleted-number blind spot for that one sentence) and
      `..._a_topologys_own_notes_count_the_graph_they_describe`. Know that
      scanner's two holes before you trust its green: it only reads a sentence
      counting **two or more** different labels (a one-label sentence is treated
      as a subset claim — "modelled here as two parts" — because reading those
      produced a false positive on its first run), and a count *about a subset*
      is therefore entirely yours. The same review found one:
      `topology_pitch_system.json`'s `hub` note said "three of this topology's
      four branch points sit on it" and two do. All fixed inline.
- [ ] **A "which is exactly what the source does" claim, checked row by row
      against the source.** New 2026-09-01 (`dag_topology_format`).
      `study_pitch_system_blade_angle_worst.json` said its transform map applied
      the vertical sensitivity to every non-coupling edge, "which is exactly what
      the source sheet does column by column". True of the **six** of its nine
      edges the sheet has a linear row for; three are `assumed` placeholders,
      and one of those three (`blade_root_clocking_to_oml`) corresponds to a row
      the sheet states **directly in degrees and multiplies by nothing** — so
      applying the ratio there is the study's construction, not the sheet's. An
      equivalence claim over a set is a claim about every member; open the source
      and walk them. Narrowed inline.

- [ ] **A counterfactual stated as fact — "X is what keeps it N instead of M".**
      New 2026-09-01 (`dag_viewer_poc`), and it is the stale-count family's
      hardest member because **there is no source to recount against**: the
      figure is about a world that does not exist. The rail serialiser frees a
      column when a branch ends, and three places (the README, the lesson, and
      the invariant test's own docstring) said reuse "keeps the pitch system
      nine rails wide instead of twelve". Nine is right; twelve is nothing.
      Disabling reuse outright leaves the pitch system at **nine** columns and
      L1 at **two** — reuse never fires on either committed topology, so the
      mechanism's whole justification was a number no one had produced. The
      second half is worse than the first: the invariant it justifies
      (`test_a_column_never_holds_two_rails_at_the_same_row`) was being
      quantified over data where every column holds exactly one rail, i.e. it
      could not tell a correct serialiser from one that never reuses. **Run the
      counterfactual** — a counterfactual is one `monkeypatch` and one re-run —
      and when it comes back equal, ask what else the sentence was propping up.
      All three corrected inline and `test_reuse_is_what_this_invariant_guards`
      added (the smallest graph that does reuse).
      **Second sighting 2026-09-16 (review of `stack_fable_audit`), and this
      variant HAS a source to recount against — the diff's own completed
      model.** The wide-bearing counterfactual "~3.3 mm inside the column" was
      computed mid-investigation, before the flange member went in, and shipped
      in five places beside a test that pins the completed column's figure,
      **4.8324** — same commit, same author, argument direction unaffected. A
      "with X instead of Y" figure in an argument is a fold over the shipped
      model: recompute it against the term list as committed, not as it stood
      when the reasoning was first worked out, and expect the diff that ADDS a
      member to invalidate every counterfactual written before it.
- [ ] **The handoff fixed the one guarded copy of a count and missed every
      unguarded one.** Third sighting of the "grep the repo for the other copies"
      entry above (2026-09-01, `dag_viewer_poc`) and the direction is now
      *reversed*, which is why it is worth its own line.
      `test_architecture_inventory.py::test_the_projection_provenance_row_counts_and_names_its_importers`
      derives its answer from `modules_importing("projection_provenance")`, so
      adding the fourth writer **forced** the ARCHITECTURE.md row to "all four /
      the three above" — the guard worked. Nine unguarded copies of the same two
      facts did not move: ARCHITECTURE.md's own prose in three more places
      (including line ~49, which *quotes the row's phrase* to explain what the
      test pairs, and so quoted a string the file no longer contains),
      `projection_provenance.py`'s docstring twice ("both scripts", "three
      callers, not two" — the exact sentence the 2026-08-12 sighting fixed in
      the other direction), `spec_library.py`'s rebuild comment, the viewer
      README and `config.js`. **A guard that forces one edit is a signal that
      N other copies just went stale**, and the residue scanner does not help:
      `test_no_unpinned_quantifier_survives_in_the_block` walks the tree-block
      **rows** only, so ARCHITECTURE.md's surrounding prose is outside every
      quantifier guard the repo owns. All nine fixed inline.
- [ ] **An `inList([...])` value-guard row that copies a Python constant nobody
      pairs it to.** New 2026-09-01 (`dag_viewer_poc`), and it sharpens the
      `VALUE_GUARDS` "read the rows, judge the form" item below. The topology
      page's `TOPO_VALUE_GUARDS` had four rows pointing at `VA.*` tables that
      `tests/test_topology_projection.py` pairs to Python, and three
      (`nodes[].kind`, `edges[].kind`, `edges[].transform.kind`) spelling out
      `NODE_KINDS` / `EDGE_KINDS` / `TRANSFORM_KINDS` inline instead. Those
      three are the **documents'** vocabularies, validated by a dataclass
      `__post_init__`, so the `inList` copy only speaks once a document in the
      tree actually uses the new word — while the pairing would have spoken the
      moment the constant grew. Fixed inline (three `VA.*` arrays in
      `topology.js`, three rows added to `JS_PAIRINGS`). Ask of every `inList`
      row: **does a named Python constant exist for this?** If yes, the copy is
      the finding regardless of whether it agrees today.
- [ ] **A new JS vocabulary file that did not inherit the old one's guards.**
      Same handoff. `apps/viewer/topology.js` grew six enumerated tables and got
      the pairing test, but not
      `test_no_key_is_attached_to_a_status_table_from_outside_its_literal` —
      the guard that refuses `VA.TABLE.newkey = {}` outside the literal, which
      `viewer.js`'s six tables have had since 2026-08-12. Without it the pairing
      test reads as equal while the page branches on a word Python cannot write,
      because the extractor only sees the literal. Added inline, with its own
      can-fail replay. Generalise: **when a second file joins a class the repo
      already guards, list that class's guards and check the newcomer is in each
      one** — the pairing is the visible guard and the mutation scan is the one
      that gets forgotten.

- [ ] **N green runs is not evidence a flake is fixed — demand the replay, and
      do the arithmetic.** New 2026-09-03 (`dc_snapshot_mtime_flake`). The
      directory-mtime race in `tests/test_dc_snapshot.py` failed ~2.3% of trials
      unloaded (7/300, reviewer-measured), so **ten green full-suite runs would
      have happened ~79% of the time with the bug still in**. A "definition of
      done" that asks for N >= 5 green runs is therefore satisfiable by an
      unfixed flake. What settles it is a **stress replay**: the test body run
      against the real functions a few hundred times, old shape and new, with
      both counts reported. Ask for that table; if it is absent, compute
      `(1 - rate)^N` on the issue's own reported rate before you accept the runs.
- [ ] **A flake "fix" that guarantees the assertion by construction is worse
      than the flake.** Same handoff. The legitimate move stabilises the
      *precondition* and leaves the assertion still able to fail — here
      `os.utime` backdates the directory **before** the `before` snapshot, so
      both snapshots read the old stamp if the platform ever stops moving a
      parent's mtime on `unlink`. The illegitimate move stabilises the
      *observation*. One test: **name the tool regression this test still
      catches, then break the tool in a scratch copy and watch it go red.** A
      timing fix is a new guard, so the universal "observed failing" check
      applies to it in full.

- [ ] **A derived doc scan whose *unit* is bigger than the claim it judges.**
      New 2026-09-03 (`doc_coverage_sets_derived`). `rule_statements()` splits a
      file on **blank lines**, takes the first match per unit, and then asks
      whether *the unit* carries a qualifier — so one "exception" at the top of a
      block covers an absolute at the bottom. The handoff spotted this for
      markdown **tables** and split them row by row; it did not for `- [ ]`
      runs, and `docs/prompts/REVIEW_AGENT.md` has a **14 976-character** single
      unit (lines 1527-1747). Measured: the absolute form inserted there leaves
      the suite green
      (`ISSUE_20260903_a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement.md`).
      Whenever a scan classifies a *block* by a token found anywhere in it, ask
      **how big can this block get in this repo** and inject the defect at the
      far end of the biggest one — not next to the token.
- [ ] **An exemption that rests on "that file is gitignored" — check, don't
      remember.** New 2026-09-03 (same handoff). `data/inbox/specs/README.md` is
      carried in two guards behind `# gitignored: present only in the main
      checkout`; `git check-ignore -v` returns nothing and `git ls-files data/`
      lists it. The exemption therefore hides a *deleted* curated publisher,
      which is the one thing that half of the guard exists to catch
      (`ISSUE_20260903_curated_ratio_publisher_exempted_as_gitignored_is_actually_tracked.md`).
      CLAUDE.md's "`data/` is gitignored by design" is true of the *contents* and
      not of every path under it. Run `git check-ignore` on the actual path
      before accepting any exemption phrased this way.
- [ ] **A DoD's qualitative viewport claim ("most of the rows", "fits on one
      screen") needs its own measurement at the SAME viewport the floor test
      uses — don't let the floor test passing stand in for it.** New
      2026-09-04 (`dag_viewer_vertical_budget`). The handoff asked for both "a
      stated minimum of rows" at a worst-case ~700px viewport (alarm + legend +
      study) AND, separately, that compact density "shows most of the 43 rows
      at once" — and the lesson's own measurement at that same 700px viewport
      was 12 of 43 rows visible (28%), which it reported without noting that
      28% is not "most." Measuring it myself: the 28% figure is specific to the
      artificially short 700px reproduction case; at realistic browser heights
      (900px / 1000px) compact density shows 56% / 72%, which is genuinely
      "most." Not a defect here — the two DoD clauses read correctly as
      separate claims about separate viewport sizes once measured — but a
      future stack/viewer handoff that reports "N rows visible, floor test
      green" is not thereby evidence a *qualitative* DoD clause ("most",
      "fits", "comfortably") was met; compute the percentage against the
      actual row count and check it at the size the claim is actually about,
      not just the size the floor test forced.
- [ ] **`[CmdletBinding()]` on a `.ps1` breaks a `$PSScriptRoot`-derived
      parameter default, on this repo's Windows PowerShell 5.1.** New
      2026-09-08 (`projections_rebuild_script`). `param([string]$RepoRoot =
      (Split-Path -Parent $PSScriptRoot))` silently binds `$RepoRoot` to `""`
      the moment the script also declares `[CmdletBinding()]` — PS 5.1
      evaluates parameter defaults before `$PSScriptRoot` is populated once
      the attribute turns the param block into an advanced function. No
      public doc found for it; reproduced with a two-line throwaway script.
      Any future `.ps1` here that wants `$PSScriptRoot` in a default and
      reaches for `[CmdletBinding()]` out of habit (for `-Verbose`/
      `-WhatIf`/`ShouldProcess`) hits this silently — there is no error at the
      call site, just an empty path fed downstream. Check: does the script
      need advanced-function features at all, and if it does, is the
      script-root default computed in the body instead of the param block?
      `rebuild_projections.ps1` carries a regression pin
      (`test_the_script_itself_declares_no_cmdletbinding`) but that only
      catches a re-add on *this* file.

- [ ] **`--allow-older-tree`'s refusal message says "not an ancestor," which
      covers two different situations — check which one before overriding
      it.** New 2026-09-08 (`linear_stack_conversions`). The projection gate
      fired with the shared projection built from `master @ <sha>` while the
      review branch (cut from `integration`) was neither an ancestor nor a
      descendant of that sha — a genuine fork, not the ordinary "master is
      simply older" case the rest of this checklist's projection entries
      assume. Before reaching for `--allow-older-tree`, diff the two tips
      (`git diff HEAD <other-sha> --stat`) and confirm the divergence is
      bookkeeping-only (here: `master` had only `docs/sessions/` board
      commits tracking staged/active/completed transitions, zero code or
      schema changes not already present via `integration`) — trunk lags
      behind `integration` between batch merges by design, so this is the
      ordinary shape, but "not an ancestor" alone does not prove it; a real
      code fork would need the opposite response (merge or hold off, not
      override).

- [ ] **A `fetch` reference stored unbound on a JS object throws "Illegal
      invocation" the instant it's called through the object, and a node-tier
      test that always injects its own `fetchImpl` cannot see this.** New
      2026-09-09 (`viewer_http_transport`). `storage/http.js`'s first draft did
      `this._fetch = opts.fetchImpl || (typeof fetch === "function" ? fetch :
      null)`; every fast-tier test passed because the node runner always
      supplies an explicit `fetchImpl`, so the bare-`fetch` branch never ran
      there. Only the **browser truth tier** — a real Chrome booting the page
      with no mock and no injected fetch — caught it: native `fetch` brand-
      checks its receiver, so `this._fetch(url)` (receiver = the adapter
      instance) throws, and a `.catch(() => null)` written to mean "this
      candidate doesn't resolve" swallowed the throw too, so the symptom was
      silent (falls straight to the next candidate / FSA, no error anywhere).
      Fix is `fetch.bind(window)`, not `fetch` bare. Check any new adapter or
      transport wrapper that stores a global function (`fetch`, `WebSocket`,
      etc.) on `this` for **later invocation through the instance** — the
      node/DOM-shim tier proves nothing here by construction if it always
      substitutes its own implementation, so this class of bug needs the
      browser truth tier (or an explicit unbound-call test) to be caught at
      all; a green fast tier is not evidence for this one.

- [ ] **A worksheet's prose can misstate which datum letter a GD&T frame
      references, and even contradict itself about it two sentences later.**
      New 2026-09-10 (`endstop_piece_part_acquisition`, §11a). The first
      mention of `213863-004-A.pdf`'s left-hole FCF said its position
      tolerance was "referenced solely to datum C, which this same feature
      also carries" (i.e. self-referencing); a rendered crop shows the FCF's
      third compartment actually says **B** (the *other* hole), and the
      separate datum-feature flag beneath it — a different box — is what
      says C. Two sentences later, the same paragraph's own conclusion
      correctly says "the left hole's ⌀0.1 true-position callout to datum B
      (the right hole's own axis)", silently contradicting its own opening
      clause. The final numeric conclusion (0.10 mm worst-case band) was
      unaffected because it relied on the *second*, correct statement — but
      a reader citing the first sentence alone would carry a wrong datum
      letter forward. **Render the FCF stack yourself and read the third
      compartment against the datum-feature-flag box separately** — do not
      trust a worksheet's own restatement of which datum a position/
      perpendicularity frame calls out, even when it sounds confident and
      cites a specific render (`Matrix(14)`).

- [ ] **UI state that lives on a DOM element the renderer re-creates — a
      `<details>`' `open`, a scroll position, focus — resets on every render,
      and the DOM-shim tier structurally cannot see it.** New 2026-09-10
      (`viewer_rebuild_affordance`), third member of the "fast tier proves
      nothing here by construction" family (CSS geometry 2026-08-25, unbound
      `fetch` 2026-09-09). The viewer's `render()` is `VA.clear()` + rebuild,
      so a control placed inside the stale box's `<details>` vanishes the
      instant its own click re-renders the banner — which is why the Rebuild
      button is a *sibling* of the box, not a child. Replayed in review: moving
      it inside leaves the fast tier 185/185 green (the shim has no notion of
      `<details>` visibility) while the browser tier's `waitForSelector`
      (default state: visible) times out. When a handoff puts an interactive
      control near a collapsed/expandable element, check which element's
      transient state a re-render destroys, and demand the browser tier click
      it — a fast-tier `.count()`-style assertion cannot fail on this class.
      **Second sighting 2026-09-21 (`annotate_hint_bar_and_context_autofilter`),
      and the wider shape: it is not only `<details>`/scroll/focus — a text
      field's typed VALUE is UI state too.** The annotator's new Help toggle
      calls `renderDetail()`, which is `el.detail.innerHTML = ""` + rebuild, and
      the bind form's six controls are inside what it rebuilds, so the button a
      reader presses *while* filling the form discards it
      (`ISSUE_20260921_the_annotators_help_button_discards_a_half_filled_bind_
      form.md`; measured by typing into `#bind-note-input`, clicking
      `#detail .an__disclose`, re-reading the value). The check to run on any
      new control: **grep what its handler calls, and ask whether that renderer
      owns the subtree the control sits in.** The same diff's sibling toggles
      are the correct shape and make the contrast — `transparency` calls only
      `renderHintPanel()`, the auto-filter boxes only `renderAutoSetup()` plus
      the rail renderers, and neither touches `#detail`.

- [ ] **An example list explaining a numeric excess reads as exhaustive — do
      the residual arithmetic.** New 2026-09-10 (`viewer_leader_line_grid`).
      Lesson, issue and README all explained "12 parts but 18 contiguous runs"
      with "(hub as 2, pitch_plate as 3)" — every quoted figure individually
      correct, and the list still wrong: 12 + 1 + 2 accounts for 15 of the 17
      part-runs, because `gas_spring` and `blade_root` split too (2 each), and
      the understated split count sat in the very issue asking Jeff to decide
      whether split runs need a visual tie. The stale-count entries above ask
      whether each figure reproduces; this asks whether the *list* closes:
      when prose explains why total N exceeds base M by naming members, sum
      the named members against N − M and require the residual be zero or the
      prose to say "among others". All three fixed inline (plus two pins added
      to the existing `[real]` runs-per-part test).

- [ ] **Two hand-mirrored carriers of one command vocabulary, with a comment
      claiming tests pair them.** New 2026-09-10 (`study_3d_flyout`).
      `VA.annotateLink` (URL params, the flyout's first boot) and
      `VA.annotateExecCommands` (postMessage → `AA.exec`, later launches) each
      carry the same launch params, and the shipped comment said "paired by
      tests so they cannot drift" — but tests.js pins each side separately
      over today's param shapes, so a param added to one function alone fails
      nothing. Reworded inline. When a diff adds a second *carrier* of an
      existing vocabulary (boot params beside exec commands, a link beside a
      button), ask what structurally pairs the two, and read a
      "paired"/"cannot drift" claim the way you read a count: name the test,
      then check what that test would actually catch.

- [ ] **A browser-tier layout measurement taken at a configuration where the
      defect cannot occur.** New 2026-09-11 (`viewer_hover_cards_and_deep_links`),
      the "guard observed failing" check's geometric member. The new zero-pixel
      assertion ("an open card moves the DAG pane by nothing at all") passes
      **16/16 with the full pre-handoff popover reverted** (`position: absolute`
      + scroll-offset coords + no `max-height`): the measured card, on
      `base_thickness` at the default viewport, never crosses the fold, so the
      document never lengthens and the comparison has nothing to see — while
      the lesson credits this exact measurement with catching that exact state.
      A layout guard is only evidence at a viewport/scroll/trigger where the
      defect is geometrically reachable; replay the reverted state (one CSS
      word + one function) before crediting it, and note the tell from this
      replay: an incoherent half-revert fails as a click-timeout in an
      unrelated suite, not in the named assertion.
      `ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`.
      **Closed 2026-09-11 by `hover_card_layout_guard_can_fail`, and its fix
      shape is the reusable part: a guard that asserts its own stage.** The
      card block now drops to a named `CARD_LAYOUT_VIEWPORT` (`1600x700`,
      beside `TOPO_VIEWPORT`) and pushes a **non-vacuity witness** — "the open
      card hangs past the document's own bottom" — *before* the contract it
      certifies, so the suite goes red for being **unable to see** the defect
      rather than green for not finding it. Verified in review three ways:
      shipped -> 118/118 both modes; reverted popover -> 117/118 both modes on
      `an open card leaves the document's own height untouched`; reverted
      popover **plus** the viewport put back to 1000 -> 117/118 on the witness
      instead. When you review a strengthened geometric guard here, demand
      that third measurement — it is what proves the guard cannot be returned
      to a stage where the defect is invisible. Note also what is *not*
      measurable in this tier: headless Chrome's scrollbar is an overlay, so
      the pane-box assertion does not move even under the in-flow popover;
      document height is the only witness that bites.
- [ ] **A browser-tier wait whose predicate is weaker than the assertion that
      follows it — it resolves on a boot transient.** New 2026-09-11 (review of
      `hover_card_layout_guard_can_fail`), two independent instances observed
      in one run of `scripts/run_viewer_browser_tests.mjs`, both intermittent
      and neither a regression from the diff under review:
      `testServedModeBoot` waited on `tr.tvrow, .banner--disconnected` and
      could resolve on the `DISCONNECTED` paint that `topology_app.js`'s
      annotate-mount probe renders while the transport probe is still in
      flight, then asserted that banner absent
      (`ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md`);
      `testAnnotateFlyout` waited for `#banner` to be *visible*, but
      `apps/annotate/index.html` ships that div empty and `.banner` gives it
      `padding: 6px 16px`, so it is visible at first paint and `textContent`
      could sample `""`
      (`ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient.md`).
      Both fixed by `viewer_browser_tier_wait_predicates` (2026-09-14), which
      swept the rest of that file and found a third: `testRebuildAffordance`
      waited on `#banner` plus a 200 ms sleep to guard an absence check — the
      same trap pointed the other way, since it could only ever pass wrongly.
      **The rule that separates a sound wait from those three:** a selector is
      worth waiting on only if the render that satisfies the assertion is what
      puts it in the DOM. `tr.tvrow`, `details.banner__source`
      (`.banner__built` until 2026-09-16, when `viewer_hover_deslop_and_banner_
      purge` folded that node inside a **closed** `<details>` — a
      `{ state: "visible" }` wait on a node inside one waits forever, while
      `textContent` reads it fine, so only the visibility waits broke),
      `.hovercard--edge`,
      `.croppop--resolved` are render products — one synchronous renderer
      clears the node, sets the class and fills it, so the class cannot exist
      on an empty node — whereas `#banner` is *static markup* in both
      `topology.html` and `apps/annotate/index.html`, so waiting on it waits
      for nothing at all (and CSS padding means even an empty one is
      `visible`). Where the assertion is about text, make the wait and the
      sample the same read — a `waitForFunction` that returns the text — so no
      paint can slip between them, and keep the timeout bounded so a boot that
      never settles fails as a timeout rather than as wrong content.
      **Re-run a single browser-tier failure before treating it as real** —
      these two cost a first run 14/16 on a tree that then ran 16/16 twice.
      **Reviewing a wait-predicate fix: a green run is worth nothing, and the
      replay is cheap — do BOTH directions.** Throwaway harness, ~60 lines,
      same repo-root static server the runner already has: (a) *delay* the
      resource whose arrival the settled render waits on (`await sleep(ms)`
      on `/data/projections/viewer/*`) and confirm the OLD predicate resolves
      on the transient and the sub-check goes red on correct code; (b) *kill*
      it (404, or `page.route("**/apps/<app>/*.js", r => r.abort())` for a
      boot that never writes) and confirm the NEW predicate fails **as a
      timeout** and that the OLD one passed vacuously. Measured this way in
      review 2026-09-14 for all three of the fixes above — the served-mode
      one at 106 ms/FAIL vs 3473 ms/PASS, the `.banner__built` one passing
      vacuously at 286 ms on a boot with no connected banner at all. Two
      Windows traps in the harness itself: `normalize()` your repo roots
      before the `startsWith(root + sep)` guard or every request 403s
      silently, and put the harness **inside the worktree** or node cannot
      resolve `playwright-core`.
      **And re-derive the sweep, don't read its list.** The same review's
      behaviour-first enumeration (`grep -n "waitFor` over the runner)
      reproduced the handoff's own two shapes exactly, and found its
      volunteered third claim — "all nine `waitForTimeout` sleeps carry a
      positive anchor" — true of eight
      (`ISSUE_20260914_compact_density_correspondence_check_has_no_positive_anchor.md`):
      a sleep followed by an assertion that measures a **live-DOM invariant**
      (`correspondence()`) rather than the click's effect passes in the state
      the click was supposed to leave *and* in the one it started from. Ask of
      every sleep: *what does this assertion read that the click changed?*

- [ ] **A section-scoped doc scan's "not vacuous" replay written *inside* the
      section by mistake.** New 2026-09-11 (`viewer_deep_link_contract_pairing`),
      and it is the section-scoping family's own footgun. A heading-to-next-`## `
      extractor makes the whole span up to the next heading part of the section,
      so the natural way to write the negative case — insert the claim
      "just before the next `## `" — lands *inside* the scope and the replay
      fails for the right-looking wrong reason. The author hit it and fixed it
      (the insert has to be computed past the next heading's line end); the
      module that shipped, `tests/test_viewer_deep_link_contract.py::test_the_
      section_scoping_is_not_vacuous`, is the correct shape to copy. When a diff
      adds a section-scoped scan, read its not-vacuous replay's insertion point
      against the extractor's own boundary rule, not against the prose around
      it — and confirm the replay is red for the scoping and not for something
      else, by checking the asserted message names the scoped param.

- [ ] **A new optional prose field lands outside the key tuple an existing
      doc-scan guard reads.** New 2026-09-14 (`stack_title_style_pass`). The
      handoff added a top-level `description` to `Topology`/`Study`/
      `StackDefinition` and demoted shed title text into it — including, on two
      topologies, a structural inventory ("4 parts, 7 interfaces, 8 edges").
      `tests/test_topology.py::test_a_topologys_own_notes_count_the_graph_they_
      describe` scans `{"title", "notes", "provenance"}` and nothing else, so
      the guarded copy now lives in `notes` and the copy **the viewer actually
      renders** lives unguarded in `description`
      (`ISSUE_20260914_topology_description_sits_outside_the_structural_count_
      guard.md`). Generalise beyond counts: **whenever a diff adds a field that
      can hold prose, grep every doc-scan guard for a hard-coded key set and ask
      whether the new field belongs in it** — the guard cannot tell you, because
      a key set that lost a key is silent, not red. Ask the same of the fixture
      key-set guards, which *do* go red (`apps/viewer/fixtures.js`,
      `topology_fixtures.js`) and are therefore the cheap half of this check.
      **Sequel, 2026-09-15 (`projection_field_guard_rows`, the handoff that
      closed the entry above): the completeness arm written to fix it was blind
      to the tuple's most important member.** The repair shape is right and is
      the one to copy — a second source of truth the constant does not read,
      here `prose_candidates(raw)` measuring `PROSE_FIELDS` against the corpus,
      because *a test that iterates a constant cannot guard that constant's
      completeness*. But the discoverer only recognised prose as a `str` or a
      flat `dict` of `str`, and `notes` — the field carrying the very inventory
      the guard exists for — is a `list[str]`. Dropping `notes` from the tuple
      left `tests/test_topology.py` 120 passed. So when you accept a
      completeness arm, **replay the drop-a-key demonstration for EVERY member
      of the tuple, not just the one the handoff was about**: one command, and
      it is the only thing that distinguishes a discoverer that covers the
      corpus from one that covers the example. Ask specifically what JSON
      *shapes* the discoverer walks and which committed field shapes fall
      outside them.
      **The repair, from the same review's round 2, and it is the part to
      carry forward: a completeness arm needs a REACHABILITY arm beside it.**
      `assert set(PROSE_FIELDS) <= {every key prose_candidates returns}` — two
      lines. It separates the two silences that every assertion in rounds 1 and
      2 conflated: *"no committed document states an inventory in `title`"*
      (safe, expected) from *"`notes` is invisible to the scanner"* (the
      defect). Corpus-vs-constant is the right shape and is **not sufficient on
      its own**, because the discoverer standing between them is a third thing
      that can be wrong, and it fails silently in exactly the direction that
      looks like good news. So whenever you accept a guard of the form
      *constant measured against corpus*, ask **what proves the measuring
      instrument can see every member of the constant** — and check the replay
      lives in the test rather than as a sentence in the lesson, which is what
      let round 1 ship. Verified by restoring the defect: the reachability arm
      reddens with `PROSE_FIELDS lists ['notes'], which prose_candidates
      returns for no committed topology`.
      **One trap in the replay itself** (filed, not blocked:
      `ISSUE_20260915_the_prose_field_replay_pins_which_fields_the_corpus_
      states_an_inventory_in.md`): the per-member replay's anti-vacuity bound
      came out as `assert replayed == {"description", "notes"}` — a cached fact
      about authored data, so appending one *correct* guarded inventory sentence
      to a topology's `provenance` reddens the demonstration with a message
      about a field having gone *missing*. `>=` keeps the whole guarantee. This
      is the stale-count family's **sixth** sighting and its second inside an
      anti-vacuity assertion: when a new guard's replay enumerates which inputs
      it bites on, ask whether that enumeration is a property of the code or of
      today's corpus.

- [ ] **The mutation tier reports every browser entry NOT WITNESSED in a fresh
      review worktree, and it is not a wall of broken guards.** New 2026-09-15.
      `node_modules/playwright-core` is gitignored, so it exists in the main
      checkout and in a tactical worktree that ran `npm install` — never in a
      newly-cut review worktree. `run_mutation_witness_tests.mjs` then fails
      each `browser`-tier entry's clean run and prints `4/12 declared mutations
      witnessed` with the eight browser ids listed under `NOT WITNESSED`, which
      reads exactly like the failure mode the tier was built to announce. Copy
      `node_modules` from the tactical worktree and re-run before believing it
      (12/12 at this sighting). Two more things about that runner: its shadow
      tree is `tmp/mutation-witness` **inside your worktree**, a killed run
      leaves it undeletable from Bash (`Device or resource busy` — PowerShell
      `Remove-Item -Recurse -Force` clears it), and two concurrent runs of the
      tier corrupt each other's shadow tree with ENOENT mid-table.

- [ ] **A new scanner's pattern list with no replay of its own motivating
      instances.** Second sighting of the false-positive entry above, 2026-09-14
      (`stack_title_style_pass`). `tests/test_title_style.py`'s `BANNED_SHAPES`
      carries a third column naming the exact authored title that motivated each
      pattern, and nothing asserts the pattern still matches that string — a
      pattern that stopped biting would pass silently, since the parametrised
      scan only proves that no *live* title trips it. The same list's unit
      matcher alternates on the bare English word `in` (`(?:deg|mm|in|...)`
      inside a parenthetical), so `"(M1 as-built, in service)"` is rejected as
      "a unit in parentheses" — the right verdict for the wrong reason, which is
      what makes the message unfixable by the author who reads it. Two moves,
      both one-liners: loop the list and assert each pattern matches its own
      third column, and enumerate what a parenthetical may contain rather than
      wildcarding around one word.

- [ ] **A guard written to hold "at any count" that names today's live data in
      two of its three tests — and a comment claiming the whole block is
      count-free.** New 2026-09-14 (`annotate_affordances_flyout_and_mesh_gating`).
      The handoff's `[real]` mesh block heads three tests with *"written
      COUNT-FREE on purpose -- a sibling repo is growing the mesh set … without a
      test edit"*. The per-part pairing is exactly that, with non-vacuity
      witnesses on both sides (verified: flipping every live part to
      `installed: true` in a scratch projection reddens it on *"every live part
      has a mesh, so the withholding half of this pairing went unexercised"*).
      The other two name `gas_spring_mount_213668_002`, the alias target
      `machined_213668`, and assert `hub` has **no** mesh — so installing a `hub`
      mesh, which the sibling handoff will do, reddens
      `[real] an untraced edge whose part has NO mesh offers nothing at all` for
      a correct reason. Measured by copying the live projection to a scratch
      `--repo` root with one `mesh` block flipped, which is the cheap way to run
      this whole class of counterfactual (`apps/viewer/run_tests.cjs --repo
      <scratch>` only needs `data/projections/viewer/*.json` there — app source
      always comes from the worktree). So: when a block's comment claims
      count-independence, **check it per test, not per block**, and ask which
      already-scheduled sibling change reddens each one.
      `ISSUE_20260914_real_mesh_edge_tests_break_when_the_mesh_set_grows.md`.
      **Second sighting 2026-09-15, in the fix for the first:**
      `projection_field_guard_rows` made all three tests genuinely count-free
      and name-free (verified — `hub` plus 15 more parts meshed in a scratch
      root is 360/360 where the pre-work file was 359/360) and wrote *"ALL THREE
      are written COUNT-FREE and NAME-FREE, and that is the whole discipline of
      this block"* three lines **below** the block's retained header sentence
      *"Two installed meshes and one alias entry at 2026-09-14, against 29
      topology parts"* — `data/meshes/` held 24 by then. A dated count is not a
      false claim, but it is still a count no test reads, and it is the first
      thing a reader of the block reads. When a diff's own new comment declares
      a discipline, **read the whole comment block it lands in for the thing the
      discipline forbids**, not just the lines the diff touched.
- [ ] **A copy of the live projection under a scratch `--repo` root is the
      general counterfactual harness for this repo's `[real]` tier.** Same
      handoff, and it is worth its own line because it makes "run the
      counterfactual" cheap for any live-data guard: `run_tests.cjs` resolves
      `data/projections/viewer/*` through `--repo` and app source through its own
      directory (`NODE_FS` vs `VIEWER_SRC`, by design), so
      `cp data/projections/viewer/*` to a scratch dir, edit one field, and point
      `--repo` there. No shared-`data/` write, so it does not fight the other
      live agents, and it exercises both of a non-vacuity witness's directions.
- [ ] **The whole deliverable is one line from being silently reverted — mutate
      the wiring, not just the pure function.** New 2026-09-14
      (`viewer_dag_spine_layout`, two blockers, both of this shape). The
      handoff's headline was "the spine draws on the RIGHT"; `VA.spineRight`
      got nine value-level tests including a `[real]` one over every committed
      topology — and deleting the **call** to it in `renderTopoPane`
      (`apps/viewer/views/topology.js`, one line) leaves the fast tier, the
      `--repo` tier and all 16 browser suites 100% green, because a column
      mirror moves only x and every check in the tree measures y or measures
      the store against itself. Same run, same shape: forcing `VA.centreOffsets`
      onto its height-centring fallback (`if (plan.leaders.length)` ->
      `if (false)`) is also green everywhere. The habit that finds this in five
      minutes: for each deliverable, **write down the single edit that undoes
      it and make that edit in a scratch copy** (`git archive HEAD | tar -x -C
      <scratch>`, mutate, re-run all three tiers). A pure function tested
      purely proves the function, never that the page calls it — the overlay's
      "`[real]` test that asks the view-model instead of the page" entry above,
      one seam further out.
- [ ] **A measured deviation from the handoff, shipped with nothing pinning the
      rule that replaced it.** Same handoff, and the reason the `centreOffsets`
      mutation above is not just a coverage nit. Good tactical agents here
      deviate *with measurements* (this one: the fit scales DOWN only, because
      inflating a short DAG took `pitch_link_to_pitch_plate`'s max jog 132px ->
      274px; and centring across the LEADERS' span rather than the two block
      heights, because height-centring is worse on every real document). The
      measurement then lives only in a lesson and a README paragraph, so the
      "simplification" back to the handoff's literal reading is invisible to
      every tier — and the handoff's literal reading is exactly what the next
      reader will reach for. When a lesson says "I did not do what the handoff
      said, here is why", ask **which test goes red if someone puts the
      handoff's version back**, and mutate to find out rather than assuming.

- [ ] **A "nothing is remembered" claim needs TWO mutations, because each tier
      is blind to one kind of latch.** New 2026-09-15
      (`viewer_transport_honest_hosted`), and it is the "fast tier proves
      nothing here by construction" family's fourth member — except this time
      the *truth* tier is the blind one half the time. Deliverable 3 was "the
      banner state must not latch anything persistent, so a plain reload
      recovers", and both tiers carry a guard for it. Measured: an **in-memory**
      latch (a module-level `var` in `VA.chooseTransport`) reddens 3 fast-tier
      tests and leaves the browser tier **17/17 green**, because
      `page.reload()` tears down the JS context and wipes it; a **persistent**
      latch (`localStorage`) leaves the fast tier **260/260 green** — node has
      no `localStorage`, so the branch never runs — and reddens the browser
      case as a `waitForSelector` timeout. Neither mutation alone is evidence.
      So when a handoff claims a state is not remembered, write **both**, and
      check the pair of tiers covers both; one green run against one latch kind
      certifies nothing about the other.
- [ ] **A browser-tier sub-check that re-spells a fast-tier helper as an inline
      regex, and rots in the escaping.** Same handoff (fixed inline in review).
      `testHostedUnpublished`'s "no path, script or command leaks into the
      sentence" inlined `tests.js`'s `noCommandsOrPaths` as
      `!/\.py|venv-win|C:\|\//.test(banner)` — whose third alternative is not
      `C:\` or `/` but the literal four characters `C:|/`, since `\|` and `\/`
      are just escaped literals. The guard could see `.py` and `venv-win` and
      **nothing else**: a bare slash, a URL and `C:\workspace\tolstack` all
      tested false. Green forever, in the half of the check that matters most
      for a hosted visitor. Two moves: **run any new regex against the defect
      strings it names** (five lines of `node`, and it is the only thing that
      distinguishes a pattern from a comment), and when the fast tier already
      owns a helper for the same rule, ask why the browser tier is re-spelling
      it instead of asserting the same thing about the same text.
- [ ] **A fix that makes the app *more* correct can make the guards already in
      that block vacuous — audit the OLD sub-checks, not just the new ones.**
      New 2026-09-15 (`viewer_popover_clamp_and_rebuild_terminal_state`). The
      `CARD_LAYOUT_VIEWPORT` block's whole reason for existing was
      `hover_card_layout_guard_can_fail`'s witness, "the open card hangs past
      the document's own bottom" — the one configuration where an in-flow
      popover lengthens the document. This handoff capped an oversized card to
      the room beside its trigger, so the card is now **always inside the
      window**, therefore always inside the document, and the three
      `position: fixed`-vs-`absolute` sub-checks under that witness can no
      longer fail. Confirmed by replay in review: flip `.croppop` back to
      `position: absolute` and `[topology]` still reports 122/122 both modes.
      The tactical agent found this itself and filed
      `ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`,
      which is the behaviour to expect. Two things for the reviewer: **run the
      old block's own revert-replay, not just the new assertions'** — a
      strengthened block can gain a falsifiable check and lose one in the same
      diff; and note the tell this replay adds to the entry above — the
      `absolute` flip is not wholly invisible, it surfaces as `[app] ERROR:
      locator.click: Timeout` in an unrelated suite, which is a symptom with no
      name attached, not a guard.
- [ ] **A client constant hand-copied from ANOTHER repo's source, with nothing
      in this suite pairing the two.** New 2026-09-15
      (`viewer_popover_clamp_and_rebuild_terminal_state`), the cross-repo member
      of the restated-vocabulary family. `topology_app.js`'s
      `REBUILD_DONE = "done"` is drawing-checker's
      `webui/tolstack_rebuild.py: DONE`, and the browser stub carries a third
      copy of the same word — so the test and the client agree with each other
      whether or not either agrees with the server. The in-repo pairing tests
      (`test_js_python_vocabulary.py`) structurally cannot see it, because the
      definition is not in this repo. Ask the universal question anyway — *if
      the source changes tomorrow, what breaks loudly?* — and when the honest
      answer is "nothing here", say which way it fails: this one fails
      **closed** (every rebuild reports failure), which is the tolerable
      direction and why it was filed `low` rather than sent back
      (`ISSUE_20260915_rebuild_done_constant_is_unpaired_with_drawing_checkers_states.md`).
      A cross-repo copy that fails *open* is not the same finding.
- [ ] **A declared-rect registry is a provenance artifact -- open the document
      and look at every rect, not just the shape tests.** New 2026-09-14
      (`spec_crop_region_registry`, `docs/spec_library/crop_regions.json`). The
      entries are `{document, page, rect, label, match, shows}` and every test
      over them is necessarily *internal*: ordering, uniqueness, that the live
      citations resolve to the label they name. **Nothing in the suite can see
      whether the rect is over the right ink** -- a rect two bands low still
      loads, still resolves, still renders, and shows the neighbouring row's
      digits under the cited row's name. That is this repo's one rule at the
      placement layer, so re-render it: clip each entry's rect out of the pile
      PDF at ~8x and read the crop against the entry's own `shows` string *and*
      against the citing element's `callout`. Both sides are transcribed, so a
      wrong rect disagrees with one of them. (Done for all 13 shipped entries in
      `REVIEW_20260914_spec_crop_region_registry.md`; the printed values matched
      every citation, which is also a free corroboration of the numbers.)
- [ ] **A substring `match` rule needs the longest-match tie-break AND the
      unrecorded-neighbour case checked.** Same handoff. `"Grip Dash No. 1"` is a
      substring of every dash-1x citation's where-ref text, so a registry that is
      correct today silently breaks three crops the day somebody records the
      short row. `resolve()` has longest-match-wins and a loud ambiguous case --
      check any *new* declared string against the strings already in the file,
      in both directions, not just against the live citations that exist now.
- [ ] **A sole-region fallback is a weaker claim than a match and must read as
      one.** Same handoff: a pile sheet carrying exactly one declared region
      gives that region to **every** citation naming the sheet, whatever it is
      about. That is designed (the handoff asked for it) and the viewer says
      *"the only region declared for this sheet"* rather than *"matched on"* --
      but it means the second region recorded on a sheet silently changes what
      the first citation gets. When a handoff adds a region, check what the
      page's existing citations resolved to before and after.
- [ ] **A live-data guard that keys on a different field than production does.**
      Same handoff, and it passes today by coincidence worth knowing about:
      `tests/test_spec_crop_regions.py` scans `source_ref["document"]` while
      `build_viewer_crops.region_for` keys on the resolved `pdf.name`. They agree
      because every live export block points at the pile file under its own
      name. Ask of any `[real]`-ish guard: *is this reading the same key the
      producer writes?* -- a proxy that happens to agree is silent exactly when
      the two diverge.
- [ ] **A CLI whose refusals are all clean except one.** Same handoff:
      `record_spec_crop_region.py` reports `refused: <why>` for every bad input
      and tracebacks on a missing `--registry`, because `scr.load`'s
      `FileNotFoundError` is neither of the two exceptions its `try` catches
      (`ISSUE_20260914_record_spec_crop_region_tracebacks_on_a_missing_registry.md`).
      When a verb's whole selling point is "everything it refuses is something a
      hand-edit would have shipped," run it once with each *path* flag pointed at
      nothing.

- [ ] **A wiring test that asserts only the enum value is satisfied by the wrong
      crop -- make the fake's size say which rect rendered.** New 2026-09-14
      (`spec_crop_region_registry` round 2). The rework answered "does the
      builder consult the registry?" by driving `crop_element` with a `fitz`
      stand-in in `sys.modules` -- which works because `build_viewer_crops`
      imports `fitz` lazily at function scope, so the whole render path is
      testable under this repo's stdlib-only venv. The part worth copying: the
      `FakePixmap`'s width/height are derived from the clip, so a crop entry's
      pixel size reports *which rect was rendered*. I mutated the builder to
      keep `located_by: "declared_region"` while cropping `page.rect` -- the
      "right label, wrong crop" case -- and it failed on both `rect_pt` and the
      size. A version asserting only `located_by == "declared_region"` would
      have passed it. Ask of any placement/render seam: *would this test still
      pass if the rect were wrong?*
- [ ] **A new surface for a fact the app already renders somewhere else --
      measure the two against live data, because the existing carriers may
      already disagree with each other.** New 2026-09-14
      (`viewer_dag_hover_cards`). The node card derives a dot's sides from
      `VA.nodeAdjacentParts`; `nodeDetail`'s `detail__where` line still prints
      the authored `node.parts`, one function away in the same file, and the
      *same pane*'s leader paragraph already used the derived list. **10 of 46
      live nodes disagree** (a part against a derived clearance the declared
      list omits), so hovering a dot names two sides and clicking it names
      one. Both tiers green either way. The check is five lines of node over
      `data/projections/viewer/topologies.json`, not a read of the code:
      enumerate every live instance and diff the two carriers.
      `ISSUE_20260914_node_preview_pane_prints_declared_parts_where_the_dot_card_prints_derived.md`.
- [ ] **A `[real]` browser-tier block gated on a projection-derived subject,
      with no witness that the subject was found.** Same handoff. The
      served-mode node-card block was `if (boundary) { push(...); push(...); }`
      where `boundary` is computed from the live projection -- so a projection
      that stopped emitting a multi-part boundary drops two sub-checks and the
      suite still prints `PASS` at a smaller denominator (the runner reports
      `n/n`, never an expected count). The idiom eight lines above it is the
      fix: `push("[real] ... at all", !!keyedRow)` *before* the `if`. Fixed
      inline in this review; observed failing by starving the finder (12/13
      FAIL, was 12/12 PASS). Grep every `if (<derived>) {` in
      `scripts/run_viewer_browser_tests.mjs` for a bare gate.
- [ ] **Mutate the plumbing lines too, not just the deliverable's own
      functions.** Same handoff, the "one line from being silently reverted"
      entry's quieter member: five mutations of the card wiring and the node
      model each reddened the fast tier, and deleting the new
      `(card.sides || []).forEach(... add(side.thumb.entry))` prefetch in
      `topology_app.js`'s `cardPngs` left **all three tiers 100% green** --
      because `ensureThumbImages` already fetches every resolved crop of every
      edge in the open topology, a superset, on every paint. A green mutation
      is not automatically a coverage gap: ask whether the line is *load-bearing
      and untested* or *redundant*, and make the diff say which. Same session's
      sibling shape: a helper pasted into four suite functions with three of
      the copies never called
      (`ISSUE_20260914_three_dead_copies_of_dismisscard_in_the_browser_runner.md`).

- [ ] **A persistence guard that returns the toggle to its default BEFORE the
      only switch it could observe.** New 2026-09-15
      (`viewer_leader_grid_legibility`), the "one line from being silently
      reverted" entry's cheapest variant and the reason mutating each field
      separately is not optional. Two new display preferences claim, in a code
      comment and in README, that `selectTopology()` never resets them.
      Mutating BOTH resets in reddens the browser tier (`[real] switching
      topology keeps the SCALE…`); mutating **only `state.leaderStyle`**
      leaves fast 274/274, `--repo` 331/331 and browser 17/17. Cause: the
      suite toggles the style to angled, measures it, toggles it **back to
      jogged**, and only then clicks the other topology — so the switch
      happens at the default, where a reset and a non-reset are the same
      state. `ISSUE_20260915_leader_style_persistence_across_topology_switch_
      is_unpinned.md`. Two moves: never mutate a group of fields together
      when the claim is made of each one, and for any "switching X keeps Y"
      check, read the lines ABOVE it to confirm Y was still off its default
      when X changed.
- [ ] **An issue's repro prints a number; the sentence beside it is about a
      different population.** New 2026-09-15 (`viewer_leader_grid_legibility`,
      fixed inline), and the "one number, two nouns" entry's doc-side twin. A
      filed issue's repro printed **16** leader-crossing *pairs* on
      `pitch_system`; the sentence under it, and the `topology.js` comment
      quoting it, both read "every one of its 16 leaders is in at least one
      crossing pair". It is **eight** — exactly the leaders that descend; the
      seven that rise are in none. The repro's bounds are inclusive too, so a
      strict segment intersection over the same geometry gives 12 pairs across
      seven leaders. Running the repro reproduces the digit and certifies
      nothing about the claim. So: run it, then ask **what is this number
      counting, and what does the sentence say it counts** — and where the
      issue is `audience: strategy`, the answer changes the design options it
      is asking someone to choose between.
- [ ] **A textually clean merge can still kill a geometric witness — re-run the
      browser tier AFTER you merge a moved `integration`, not just after you
      merge the handoff.** New 2026-09-14 (`viewer_dag_hover_cards`). Its
      DAG-side card-layout block copied the grid-side non-vacuity witness
      ("the card hangs past the document's own bottom"); mid-review,
      `viewer_popover_clamp_and_rebuild_terminal_state` landed the room cap,
      which keeps every open card wholly inside the window, and its own review
      re-expressed the grid-side witness as "the cap bit" — deleting
      `cardDocBottom` from `cardLayout()`. Git merged both sides with no
      conflict (different blocks), the fast tiers and pytest stayed green, and
      the browser tier went 15/17 on the orphaned copy reading a field that no
      longer exists. Resolved in review by re-expressing it the same way
      against the bar's own box (`cardLayout` now takes the trigger selector);
      observed failing at `TOPO_VIEWPORT`. Two transferable points: when two
      viewer handoffs are in flight against one surface, **the second copy of
      a measurement idiom is the one nobody updates**, and a
      `page.evaluate(fn, CONST)` tail is easy to leave behind when the wrapper
      grows a parameter — the symptom is a witness reading *some other*
      trigger's box and passing or failing for the wrong reason (it reported
      the grid trigger's 418.5–444.5 for a rail bar until the tail was fixed).
      **Second sighting 2026-09-15 (`viewer_component_names_and_reference_copy`),
      and it names the tier the entry above leaves out: run
      `run_mutation_witness_tests.mjs` after the integration merge too.** The
      handoff branch witnessed 16/16 and the merged tree 21/22 --
      `card-layout-out-of-flow` no longer reddens on its declared sub-check.
      Bisected by `git archive <rev>` into scratch trees: witnessed at the
      merge-base, at the handoff tip, and at `0573826`; NOT witnessed from
      `afcbbb4` onward, the *review* merge that brought three sibling handoffs
      onto one line. Each of the three was green alone, so nobody could see it,
      and a review merge is the one place the mutation tier is not re-run.
      `ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_
      witnessing_on_integration.md`. **That is now a standing instruction** —
      re-run the tier after your own merge into the review branch and report the
      count; see the checklist item above on the sibling merge, which carries
      the bisect and what a dropped count means. The tell is the same one this block keeps
      producing: the tier goes red as `ERROR: locator.hover: Timeout`, a
      symptom with no name attached, rather than on the check that owns the
      claim.
- [ ] **The deliverable is mutation-tested and the guard the author added on
      their OWN initiative is not.** New 2026-09-15
      (`viewer_study_respine_animation`, should-fix). A model tactical sweep:
      21 one-line reverts, every one observed failing, the list written into
      the lesson. Five re-run independently in review also fired. The one that
      **survived all three tiers** was the only line the handoff never asked
      for -- `state.layoutMode = chainable(studyId) ? "chain" : "topology"`,
      the author's own answer to "what should a study that REFUSES to sum
      do?". Mutating it to `"chain"` leaves the fast tier 292/292, `--repo`
      353/353 and the browser tier 18/18, while the shipped page would caption
      itself "Showing: study chain" over the whole walk with the toggle
      disabled. The mechanism is that a mutation list is written from the
      **deliverables**, so a defensive branch invented while building is
      exactly what it does not enumerate. So: diff the author's mutation list
      against their own diff's new conditionals, and mutate every predicate
      the list does not name. `ISSUE_20260915_a_refusing_study_staying_on_the_
      walk_is_unwitnessed_in_every_tier.md`. (That line is gone --
      `viewer_respine_whole_walk` retired `layoutMode` and `chainable()` on
      2026-09-15; its mutation entry is re-pointed at
      `views/topology.js`'s `marking`. The example stands; the code does not.)
      **Second sighting 2026-09-15 (`annotate_hosted_page_posture`), and the
      un-witnessed half was in the handoff, not invented:** deliverable 1 had
      two halves -- the hosted page *shows* nothing about the bind workflow,
      and the controls it withholds are *never wired* -- and the author said so
      in the lesson ("two separate defects, two separate fixes"), asserted both
      in the browser tier, and declared a `mutation_witnesses.json` entry for
      the first only. So the rule is wider than "mutate the predicates the list
      does not name": **count the contracts the deliverable states and the
      entries declared for it, and mutate any half without one.** Confirmed by
      hand here (wiring moved back above the hosted early-return -> 17/18, the
      right sub-check), then declared as a second entry in review -- which is
      the cheap move the tier exists for, five strings, not an issue.
      **Third sighting 2026-09-15 (`viewer_nav_wedge_and_classic_retirement`),
      and it moves where you read the contracts from: the new function's own
      COMMENT, not the handoff.** `topology_app.js`'s `navigate()` states three
      in four paragraphs -- the rejection arm, retiring a stale banner on a read
      that works, and clearing `state.worksheetText` so the previous node's
      prose does not sit in the dialog under this node's title -- plus a fourth
      about calling the read from inside the `try`. The declared entry covers
      the first; the second reddens the browser tier anyway; the third and
      fourth are **100% green in all three tiers when deleted** (measured:
      308/308, 382/382, 20/20), and the third is reachable and wrong-on-screen,
      because `paint()` decides the toggle from the projection's
      `worksheet_file` and `views/worksheet.js` prints the new subject's path
      over the old subject's body. So: **enumerate the contracts out of the
      diff's own prose, one per paragraph, and mutate each** -- a handoff's
      deliverable list is the coarser of the two inventories and the comment is
      the one the author wrote while thinking.
      (`ISSUE_20260915_navigates_stale_worksheet_clear_and_sync_throw_door_are_unwitnessed.md`.)
- [ ] **An interpolator claimed to be the identity at its far end — check the
      KEY SETS, not the values at the shared keys.** Same handoff.
      `VA.tweenPositions(from, to, 1)` was tested by
      *"a respine at e = 1 is the target store exactly"*, which iterated
      `Object.keys(to.nodes)` / `to.edges` and compared values, and paired
      `byRow`'s key set -- so it could not see that the function unioned in
      every node and edge the OUTGOING store had (two dropped interfaces, at
      their outgoing y, measured). Inert at the time only because both
      geometry passes iterate the layout rather than the store; fixed
      2026-09-15 (`respine_tween_fidelity`), and the key sets are now pinned
      in both directions with the leaking direction named as the witness. The
      general form: when a test's name is "X equals Y exactly", the assertion
      has to be over `keys(X) ∪ keys(Y)`; iterating one side's keys tests
      containment and reads as equality.
      `ISSUE_20260915_a_settled_tween_store_is_not_the_target_store_it_keeps_
      the_outgoing_sides_keys.md`.
- [ ] **A continuity guard that pairs two SCALARS where the claim is about a
      PICTURE.** New 2026-09-15 (`respine_tween_fidelity`, should-fix). The
      respine records a *fractional* column count so an interrupted
      transition continues from the frame on screen, and the guard for it
      (`a respine interrupting a respine continues from the picture on
      screen`) compares `spineAndWidth` -- the max rail `x1` and the SVG
      width -- which are precisely the two numbers `VA.respineX` returns.
      Measured behind them: the interrupting frame draws **nine extra rails
      at x = 15..85 where the caught frame drew nothing**, because added
      columns collapse onto the *leftmost drawn* rail and from a fractional
      outgoing frame that is not the spine. The three sites justifying "a
      rail needs no fade" all state the coincidence unconditionally, and it
      holds from a **settled** frame only. General form: when a guard's
      subject is "the same picture", the assertion has to be over the drawn
      SET, and a summary statistic of it computed from the same function
      under test is not that. Ask **which frame is the outgoing one here --
      settled, or in flight?** for every interpolation claim; the two
      endpoints are the easy cases and the interrupt is a third state.
      Fixed 2026-09-15 (`respine_tween_fidelity_round2`): the outgoing frame
      records its **leftmost** drawn column index as well as the spine's, so
      the unfold holds from a transition frame, and that guard now pairs the
      whole drawn rail set beside the two scalars. Note what did *not* shrink
      — `VA.respineX` returns four numbers now instead of two, which makes it
      easier to pick two of them and call it a picture, not harder.
      `ISSUE_20260915_an_interrupted_respine_pops_nine_rails_in_from_
      nowhere.md`.
- [ ] **The handoff enumerated the sites of a prose claim -- so grep for the
      one it missed.** New 2026-09-15 (`respine_tween_fidelity_round2`,
      should-fix, fixed inline). The handoff listed the three places justifying
      "a rail needs no fade" and made "all three must end up true" the
      definition of done; all three were rewritten correctly, and a **fourth**
      -- `renderTopoPane`'s own `xTween` comment, in a file on the handoff's
      list -- still said the added column "unfolds out of the spine", which the
      fix had just made wrong rather than merely conditional. An enumeration in
      a handoff is the author's *starting* inventory, not a closed set: grep the
      branch for the superseded phrase (`unfold`, `collapsed onto`, `from
      nowhere` here) and confirm every survivor is one the fix rewrote. This is
      the "grep for the other copies of the figure you just corrected" entry
      applied to a *claim* rather than a number, and to the tactical agent
      rather than the reviewer.
- [ ] **A handoff's own "confirm the current count before X" instruction is
      itself a count that may have moved.** New 2026-09-15
      (`viewer_hygiene_pass`). The handoff staged a table of `dismissCard`
      definitions/call-counts from an earlier issue and explicitly flagged
      one cell as possibly stale ("the issue lists a fourth definition;
      confirm the current count before deleting") -- the author did confirm
      it (found 4, not the issue's stale 3) and a second number in the same
      handoff (7 calls) had *also* moved by review time (9, under an
      unrelated intervening handoff) without anyone flagging it. Neither was
      wrong in the deliverable; both were re-derived independently in review
      (`git show <handoff-branch>:<file> | grep`) rather than trusted from
      the handoff's own prose. General form: when a handoff hands you a
      table of numbers as its own scoping evidence, treat every cell as
      needing re-derivation, not just the one the author happened to flag --
      the flag tells you where the author already knew to look, not where
      the remaining risk is.
- [ ] **Single-sourcing replaced N hand copies with ONE argument -- now mutate
      the argument.** New 2026-09-15 (`mutation_witness_tier_repair`). The
      right fix for a registry that restates its own keys is to hand the key
      to the callee, and this repo has now done it: `SUITES` rows in
      `scripts/run_viewer_browser_tests.mjs` are `[label, (label) => fn(...,
      label)]`. But the whole deliverable then rests on one word in the run
      loop -- changing `runSuiteFn(label)` to `runSuiteFn()` leaves every
      tier green, exit 0, pytest included, with every suite printing
      `[undefined]` (measured). Ask, of any single-sourcing fix: *what fires
      if the hand-off of the single source is dropped?* The cheap answer is a
      returned-value pairing (`result.label !== key`), which is NOT "comparing
      a string to itself" once the copies are gone --
      `ISSUE_20260915_the_suites_label_pass_through_is_one_word_from_a_silent_revert.md`.
- [ ] **A lesson's claim about which files a `--repo` / `NODE_FS` seam reaches
      is checked by DELETING the directory, not by reading the prose.** New
      2026-09-15, same handoff: the lesson stated the fast tier's `[real]`
      mesh checks "read `data/meshes/` as well as `data/projections/`". They
      do not -- `run_tests.cjs`'s only `--repo`-seam read is
      `data/projections/viewer/*` (plus tracked paths like
      `docs/tolerance_stacks/WORKSHEET_*.md`), and mesh facts are baked into
      the projection as `part.mesh.installed` at build time. `mv data/meshes`
      aside and the fast tier is still 360/360; the directory is needed by the
      **browser** tier instead. One `mv` settles a seam claim, and the scratch
      `--repo` root entry below is the general harness for it.
- [ ] **A suite that is green in a full run is not green -- the mutation tier
      runs suites ALONE.** New 2026-09-15, same review:
      `--only "annotate flyout"` aborts on a strict-mode violation (two
      `tr.tvrow[data-id='arm_pin_to_tip']` in the mock page) in five runs of
      six, while the full nineteen-suite run passes it 18/18, on `integration`
      as well as on the branch --
      `ISSUE_20260915_annotate_flyout_suite_is_red_alone_and_green_in_a_full_run.md`.
      Because `mutation_witnesses.json` dispatches one suite per mutation, such
      a suite can carry no declared witness at all (the clean run comes back
      RED and the entry is reported `SKIPPED`). When a review's evidence is a
      full run, spot-check the one suite the work touched with `--only` too.
      **Cause found and fixed 2026-09-16** (`js_guards_and_suite_isolation`),
      and the general rule is worth more than the instance: it was not order
      dependence or shared state but `VA.animateTopoPane`'s cross-fade, which
      re-parents the outgoing paint into an inert `div.tv__ghost` for
      `VA.RESPINE.duration` (260 ms). Mid-transition the document holds **two**
      `.tv__hscroll` panes, so every edge in both serialisations has two
      `tr.tvrow` with the same `data-id`. Any browser-tier block that addresses
      `tr.tvrow[data-id=…]` after a nav click must first wait
      `!ViewerApp.lastTopoRender.tweening` — 12 other call sites in that file
      already did; this suite was the one that did not. Two traps when you see
      this shape again: a ghost-**excluding** locator also makes the suite pass
      and is the wrong fix (it finds its one live row on a permanently stuck
      pane and passes over a real bug), and "unique `data-id`" was never this
      page's invariant anyway — `line.rail__barhit` shares each edge's
      `data-id` with its `tr.tvrow` in the settled state.
- [ ] **A STACK-DATA change is a viewer-test change, and `pytest -q` is
      structurally blind to it.** New 2026-09-15 (`pitch_link_known_bands`) —
      the first time a pure data handoff broke the JS `[real]` tier, and the
      author's `pytest -q` could not have told them. `tests/test_viewer_js_suite.py`
      runs the JS runner **without** `--repo`, so from a worktree the node-fs
      tier reports itself skipped and pytest records a `skip`, deliberately
      ("a red suite that means 'you are in a worktree' trains people to ignore
      red suites"). Meanwhile `apps/viewer/tests.js`'s `[real]` block pins live
      stack numbers and live projection flags by hand — `has(root.textContent,
      "-8.1939")` and `eq(all(root, "tr.el-row--zero-width").length, 2)` both
      named `pitch_link_to_pitch_plate` and both went red the moment two of its
      elements gained a band. **So: whenever a diff changes a value, a band, a
      `confidence` or a `zero_width` in `docs/tolerance_stacks/`, grep
      `apps/viewer/tests.js` for the moved number and for the stack id before
      you judge the suite green**, then rebuild the projections and run
      `node apps/viewer/run_tests.cjs --repo <root>` yourself. Two traps in the
      fix: a `[real]` pin whose stack stopped exercising the field should be
      **repointed at a stack that still does** (the Python twin,
      `test_checks_carry_their_zero_width_inputs`, was correctly moved to
      `rotor_fastener_length`) rather than flipped to assert `0` under a name
      that promises 2; and if the shared projection is owned by a live sibling
      worktree, build all three into a scratch `--data-root` seeded from a copy
      of the real one instead of reaching for `--allow-older-tree` — a partial
      scratch root (no `docs/`, no `meshes/`, no `data/inbox/`) manufactures
      four extra failures that are yours, not the branch's.
      **Two traps inside the fix, both found in that handoff's round 2.** (a)
      The DOM shim's selector matcher handles `tag`, `.class` and `tag.class`
      and **nothing compound** — `all(root, "tr.el-row.conf--untraced")` matches
      zero nodes silently, so it fails loudly in a `=== 2` assertion and passes
      *vacuously* in a `=== 0` one. One class per selector, then filter with the
      suite's own `hasClass()`. (b) `VA.fmt` is `String(n)`, verbatim and by
      design, so the page shows `-8.428` where every document writes `-8.4280`
      for column alignment — a pin copied out of the worksheet will not match.
      The old pin happened to have no trailing zero, which is why this had never
      surfaced.
      **Second sighting 2026-09-16 (`stack_fable_audit`), and it widens the
      grep past `tests.js`: `apps/viewer/README.md`'s derived totals are now
      regex-paired against the live projection by `[real]` tests** (the spine
      leader-vs-rail crossings sentence, and "17 of the 46 live nodes"), so a
      diff that changes a topology's SHAPE — not just a value — moves them. The
      tactical author fixed the crossings total (92 → 96) and could not see the
      live-node pairing at all, because it landed on `integration` after the
      branch was cut: the review merge is where 46 vs 48 first failed. When a
      data handoff adds or removes nodes/edges, re-run the `[real]` tier
      **after** the integration merge and expect a README-digit pairing among
      the reds — it is the anchor-fires-at-merge-time entry, for doc pairings.
- [ ] **A "not vacuous" assertion that tests a set the value could never be
      in.** New 2026-09-15 (`pitch_link_known_bands`), and it is the
      guard-that-cannot-fail shape hiding inside the *replay* rather than the
      guard. `test_one_part_and_feature_folds_one_band_in_every_stack_that_uses_it`
      closes with `assert ("pitch_link_to_pitch_plate", "bushing_214820") not in
      seen_divergences` under the comment *"Not vacuous: the pairing has to be
      seeing the stacks that matter"* — but `seen_divergences` only ever
      receives members of the one-row `KNOWN_BAND_DIVERGENCES`, so the assertion
      is true by construction. Measured: typo the `SHARED_BANDS` part number and
      the test stays **green** while checking nothing about the part the handoff
      was written for. The test to apply: *what does this assertion read that
      the loop wrote?* A non-vacuity replay has to assert on something the
      **matching branch** populated (`matched[part].add(stack.id)`), never on
      absence from an allowlist. Watch for its sibling too: a curated key tuple
      whose second element is never used in the match (`(part, feature)` matched
      on `part` alone) is decoration that reads as precision.
- [ ] **A `\uXXXX` escape sequence typed into an Edit/Write tool call gets
      JSON-unescaped into the raw codepoint before it reaches the file.** New
      2026-09-15 (`vendor_markdown_recopy`). `apps/viewer/vendor/markdown.js`'s
      `CODE_MARK` sentinel is the literal 6-character source text `"\uE000"` in
      forge's file — writing it by re-typing the line (not a plain file copy)
      can silently swap that for the actual raw PUA character, which looks
      identical on screen and diffs clean under most viewers. Confirmed by
      piping the line through `cat -A` / comparing raw bytes against the
      upstream source, not by eye. Whenever a diff touches a line containing a
      `\u`-escape sentinel, byte-diff that line specifically rather than
      trusting a visual or line-based diff.
- [ ] **A helper whose parameter list a diff NARROWED, with its call sites
      still passing the old arity -- JavaScript drops the extra argument and
      the loop around it goes vacuous.** New 2026-09-15
      (`viewer_respine_whole_walk`, should-fix, fixed inline).
      `tests.js`'s `[real] a respine of every summing study of every topology
      settles on the fresh render's own geometry ... in every length mode`
      builds its contexts through a local `ctxFor`, which the diff correctly
      narrowed from `(topoProj, study, layoutMode, mode)` to
      `(topoProj, study, mode)` when `layoutMode` was retired -- and left both
      calls as `ctxFor(topoProj, null, "topology", mode)` /
      `ctxFor(topoProj, study, "chain", mode)`. So `edgeLengthMode` became the
      literal `"topology"` / `"chain"`, both of which fall back to uniform, and
      the `["uniform", "tolerance", "absolute"].forEach` ran the SAME mode three
      times. `378/378`, exit 0, and the `cycles >= 12` anti-vacuity assertion
      still passed because it counts iterations, not distinct modes. Restoring
      the two arguments keeps it green, so this was pure coverage loss. Two
      moves: whenever a diff removes a parameter, **grep every call of that
      function and count the arguments** (no linter here will), and treat a
      `forEach` over a mode/flag list as unexercised until one assertion reads
      something the mode changes.
- [ ] **A retired behaviour's justification prose is a claim about a tree you
      still have -- replay it, don't read it.** New 2026-09-15
      (`viewer_respine_whole_walk`), the counterfactual entry's historical
      member: the fix is right, and the README's new paragraph explains it with
      *"two of `pitch_link_to_pitch_plate`'s studies dropped rows while the
      third's chain covered nearly everything"*, restating the handoff's own
      item 3. Neither of the two states the pre-change page could be in
      produces that: `git archive`-ing the branch base and probing it through
      the fast `[real]` tier gives chain mode = all three studies dropped rows
      (8 -> 5 / 4 / 2) and nothing dimmed in any of them, and topology mode
      (the deep-link path) = no rows dropped and 3 / 4 / 6 dimmed, with
      `thread_region_t` the *most* reduced in both. When a diff retires a
      behaviour and writes down what was wrong with it, that sentence is
      checkable in one `git archive` plus one probe --
      `ISSUE_20260915_the_readmes_inconsistency_premise_for_the_whole_walk_
      change_does_not_reproduce.md`.
- [ ] **A "per row" replay that substitutes a STUB for the row's own collector
      is one assertion written N times.** New 2026-09-15
      (`viewer_value_guard_rows_and_replays`, nit — the shape was prescribed by
      the handoff, inherited from `projection_field_guard_rows`).
      `replayBlindCollectors` in `apps/viewer/tests.js` loops the 15 stack-side
      and 15 topology rows, and for each builds `{field, branch, known,
      values: function () { return []; }}` and asserts `unexplainedValues`
      reports it. `known` is never called on an empty collector, so the only
      thing that varies across the 30 iterations is the `field` string in the
      message: it proves `unexplainedValues`' empty arm fires (worth having —
      deleting the `push` reddens both bite tests, verified), but it does **not**
      prove anything per row. The per-row claim needs the row's **real**
      collector run against a projection with that field removed — the scratch
      `--repo` root harness this checklist already names. Ask of any "replayed
      per row" comment: *what does iteration 7 execute that iteration 1 did
      not?*
- [ ] **A green `run_tests.cjs --repo <main checkout>` can be red five minutes
      later for reasons that are nobody's.** New 2026-09-15 (same review). The
      first `--repo C:\workspace\tolstack` run here was **369/373**, four
      `[real]` pitch-link tests red; a re-run minutes later, same worktree, same
      commit, was **373/373**. `data/projections/viewer/*.json` is shared by
      every worktree and other live sessions rebuild it mid-run — the stamp in
      the file says which tree it came from
      (`provenance.branch` / `head_sha` / `built_at`; ours read
      `review/viewer_respine_whole_walk`, not `master`). Before you attribute a
      `[real]` red to the diff, **read the three stamps and re-run**, and check
      the same failure at the branch's merge-base with `git archive <base> apps |
      tar -x -C <scratch>` — app source comes from wherever the runner lives,
      data comes from `--repo`, so a base comparison costs one command and no
      worktree.

- [ ] **A scratch `--repo` / `--data-root` root under the session scratchpad
      blows Windows MAX_PATH, and the symptom is a projection with ZERO
      installed meshes and exit 0.** New 2026-09-15
      (`viewer_nav_wedge_and_classic_retirement`). The scratch-root harness two
      entries above is the right move when a live sibling owns the shared
      projection -- but the agent scratchpad path is ~150 characters before you
      add `data/meshes/<64-char sha>/provenance.json`, which lands past 260.
      `installed_meshes()` skips a mesh dir whose sidecar is not
      `is_file()` **by design** ("an unnamed mesh cannot be claimed as any
      part"), so the long path is indistinguishable from an unnamed mesh:
      `build_topology_projection.py` prints `0/N parts with an installed mesh`
      for every topology and exits 0, and the `[real]` tier then fails two mesh
      tests whose own message says *"rebuild the topology projection against
      the main checkout's data/meshes"* -- pointing at the one cause it is not.
      Put the scratch root somewhere short (`%TEMP%/tsrev`) and **check the
      mesh count before you read any `[real]` result**:
      `installed_meshes(Path(root)/"data"/"meshes")` should be 24+, and the
      builder's per-topology line should not say `0/`.
- [ ] **Retiring a route invalidates prose in OTHER tracks' issues and briefs,
      which no doc-scan guard reads.** New 2026-09-15
      (`viewer_nav_wedge_and_classic_retirement`). Removing the nested
      covered-stack nav row also removed the **mechanism a live strategy brief
      named as one of the two options it asks someone to choose between**:
      `BRIEF_20260911_viewer_3d_and_card_content_reach.md` §1 and its triaged
      issue both argue from "(covered-stack nesting)" and "Most real stacks are
      loose today" -- and loose stacks went from a majority to **2 of 7** in the
      same commit. `docs/issues/`, `docs/strategy/` and `docs/sessions/` are out
      of scope for every count and phrase scan this repo owns, deliberately, as
      dated history -- but a `status: triaged` issue with a `strategy:` pointer
      is not history, it is an input to a decision nobody has made yet. So when
      work retires a route or a rendering: `git grep` the retired mechanism's
      own nouns across `docs/issues/` and `docs/strategy/` as well as the live
      docs, and check every `status: open|triaged` hit. File rather than fix --
      the correction changes what a decision is about, which is the other
      track's call.
      (`ISSUE_20260915_the_3d_reach_brief_still_argues_from_covered_stack_nesting_and_a_loose_majority.md`.)

- [ ] **A deliverable whose whole point is GEOMETRIC, pinned only where it is a
      pure function or a hand-fed renderer.** New 2026-09-16
      (`viewer_reference_crops_in_context`, three should-fixes of one shape).
      The handoff's claim was "a box over the right part of the picture"; the
      tests build their own crop entry and assert the box's `style.left` in
      percent, which is right and is not the claim. Four one-line reverts stayed
      **1121 pytest / 407 fast / 20 browser** green: the hover card's
      `max-width: calc(260px * var(--crop-ratio))` put back to
      `max-height: 260px; object-fit: contain` (the overlay then points into the
      letterbox — the exact defect the lesson credits the browser tier with
      catching), `companion = None` and `"drawing_no": None` in
      `_crop_from_citation`, and the three companion-prefetch terms in
      `topology_app.js`. The tell each time: the assertion is fed the field
      rather than reading what a producer wrote. Ask, per deliverable, **which
      edit undoes it, and which tier is even capable of seeing that edit** —
      for a percentage overlay the answer is only a browser-tier client-rect
      comparison, and for a builder field only a wiring test through the `fitz`
      stand-in (`test_crop_element_crops_a_pile_citation_to_its_declared_region`
      is the shape to copy; `fitz` is imported lazily on purpose).
      `ISSUE_20260916_the_crop_overlays_wiring_is_unwitnessed_in_every_tier.md`.
      **Second sighting 2026-09-17 (`crop_lightbox_zoom_viewer`), and it names
      the mechanism: the INVARIANCE that makes the design right is what blinds
      every check over it.** A `.crophl` is a percentage of `.cropfig`, so the
      box's rect *as a fraction of the picture's own box* is correct whatever
      size, position or border the frame ends up with -- which is the feature's
      central claim and is why the browser suite's three `frac` comparisons
      (fit, zoomed, panned) cannot see the frame at all. Three of the four
      geometric wiring lines therefore delete green in every tier: the
      fit-to-stage sizing (`figure.style.width/height` in `apply()` -- the crop
      then renders at its natural 1374x1566 in an 846px stage and the drag is
      declined at fit, so the reader sees the top half and cannot pan),
      `VA.lightboxClamp`'s call (fit stops centring, a drag runs unbounded), and
      `.lightbox .crophl`'s hairline border (a 16px amber frame at 8x). Only
      `transform-origin: 0 0` reddens. The sub-check *named* for the first one
      asserts `handle.view().scale === 1` -- a view-store read under the name
      "the whole crop on screen". So: **when a percentage overlay's own
      correctness is scale-invariant, ask what pins the FRAME**, and demand one
      assertion comparing the picture's box to the stage's.
      `ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`.
- [ ] **A new crop/projection field that renders a CLAIM, with no
      `VALUE_GUARDS` row and a silent drop on the way in.** Same handoff.
      `crops.json`'s `highlights[]` carries the solid-vs-dashed
      found-vs-declared distinction — the whole visual language — and
      `VA.cropHighlights` filters out any box whose `frac` is not four numbers,
      returning `[]`, which renders identically to an honest "nothing here was
      marked". No `[real]` assertion reads a live crop's boxes at all (grep
      `crophl|companion|highlights|drawing_no` below `tests.js:7036`: nothing).
      The *vocabulary* was covered from the other side and well —
      `HIGHLIGHT_KINDS` is importable, `highlight()` refuses a word outside it,
      and `test_js_python_vocabulary.py` pairs it (verified: renaming the JS key
      reddens that row) — which is exactly what makes the **absent/malformed**
      direction easy to call covered. Two different questions; ask both.
      `ISSUE_20260916_crop_highlights_have_no_live_data_value_guard.md`.
- [ ] **A `{key: row for row in rows}` over another repo's list, where the key
      is narrower than the row.** New 2026-09-16, and the cheapest instance of
      the canonical identity-key check this repo has produced.
      `parts_list_row_for` keys drawing-checker's `parts_list` by
      `part_number`; the 2026-AUG-19 217755 export carries `NAS1149V0332H` at
      **find 13 and find 32** (two different parts), so a dict comprehension
      keeps whichever is last and the crop's balloon, its companion row and its
      solid *"found on the page: balloon N"* highlight are all decided by JSON
      row order. Right today by luck; `list(reversed(rows))` flips it to the
      wrong item with nothing red. The disambiguator was in the data the whole
      time — every live citation's callout ends `"(find 34)"` / `"(find 32, …)"`
      — and the sibling function one screen down already breaks the same tie by
      find number. **Demand the collision test that plants two rows and then
      reverses their order**; a round-trip over today's data passes either way.
      `ISSUE_20260916_a_parts_list_row_is_keyed_by_part_number_alone_and_one_row_is_overwritten.md`.
- [ ] **A `shows` / evidence string is an inventory sentence — recount every
      figure in it against the render.** New 2026-09-16, the stale-count family
      landing in `docs/spec_library/crop_regions.json`. The two new page
      contexts are correct rects (checked by rendering both), and the sheet-3
      entry's `shows` — the field this repo treats the way it treats a
      `source_ref` — said *"the fourteen basic-number columns"* (there are
      **13**; the NAS series skips odd numbers above 6410) and *"all 96
      grip-dash rows"* (there are **64**; 96 is the highest dash NUMBER). Every
      other clause in the same sentence was exact, which is what makes this
      class survive. Render the rect and count; both fixed inline.
- [ ] **Seven issues, one red.** New 2026-09-16 and the duplicate-filing entry's
      terminal form: `docs/issues/` now holds **seven** filings of the single
      `test_every_byte_identity_claim_…` failure, one per handoff that ran the
      suite between 2026-09-15 and 2026-09-16, all `area: docs/strategy`, all
      saying the same thing. **Six of them were already in this handoff's own
      merge-base tree.** So the branch-point excuse is spent: before accepting an
      issue about a condition that is not specific to the diff,
      `ls docs/issues/ | grep <the noun>` in the MERGED tree, and where siblings
      exist, cross-reference the newest into them and say in the report that
      triage should close them as one. Filing an eighth costs a triage sweep more
      than the red costs a session.
- [ ] **A harness escape hatch's justifying MEASUREMENT names the wrong axis —
      re-take it inside the helper, not from the call log.** New 2026-09-16
      (`mutation_witness_tier_reaches_its_checks`). `hoverIgnoringOcclusion`'s
      note explained its `scrollIntoView` branch with *"at CARD_SCROLL_VIEWPORT
      … this trigger is ABOVE the window (scrollY 175, trigger off the top), so
      the reading … has always been at the scroll `scrollIntoView` left
      behind"*, and the lesson built a "latent hole" on it. Instrumenting the
      helper: the rect is `{top: 243.5, bottom: 269.5, left: 1502, right: 1604}`
      at `innerWidth/Height` 1600/560 — **4px off the RIGHT edge**, vertically
      inside; the pane scrolls horizontally, so `scrollIntoView` moves the pane
      (left 1502 → 1066) and `window.scrollY` is 175 before *and* after
      (`scrollHeight - innerHeight` is also 175, so the document is pinned at
      max and cannot give vertical scroll away). The hole did not exist. Two
      transferable moves: **(a)** when a comment says "element X was outside the
      window", ask *which edge*, and get it from
      `getBoundingClientRect()` + `innerWidth/innerHeight` printed together in
      one page task — a `didScroll` flag alone tells you the branch ran, not
      why; **(b)** a document pinned at `scrollY == scrollHeight - innerHeight`
      makes any "the page did not move" assertion **half vacuous** — mutate it
      in the direction it *can* move (scroll UP) or it passes for free. Both
      corrections were written back as blockquotes; the guard itself is real and
      was observed failing.
- [ ] **A tier-vocabulary word added to code and paired, then restated a third
      time in the table's own prose.** Same handoff, and the near-miss worth
      carrying: `tier` went from two words to three, `TIER_HARNESS` (runner) and
      `TIERS`/`CHECK_SOURCE` (pytest) were correctly paired by a new test — and
      `mutation_witnesses.json`'s `about` block then enumerated all three words
      with per-word descriptions *and* asserted *"written in exactly two
      places"*. Nothing pairs that block. Whenever a diff widens a vocabulary,
      grep the declaring data file's own header for the words it just added:
      the header is the one copy the pairing test cannot see. (The enumeration
      is legitimate documentation and was kept; *"Those three words"* was fixed
      inline to *"The tier words themselves"*, because a fourth word tomorrow
      makes the count false with nothing red. And the same block's shadow-tree
      sentence **had** gone stale in that very commit, which is what this class
      predicts.)

- [ ] **A re-cite's prose claim about the SUPERSEDED document, which nothing
      checks and nobody re-reads.** New 2026-09-16
      (`citation_identity_correctness`, blocker). The three *new* citations were
      exact — sha256, sheet, zone, callout, frames, all re-read on 215735-A and
      all independently reproducible. What was wrong was the sentence comparing
      the released sheet against the PRELIM: *"215197 printed `8.80 ±0.10`
      here"*, in five live artifacts including `data/inbox/drawings/PROVENANCE.md`
      and two `source_ref` notes. Measured: 215197 A.1 sheet 1 zone **D6 is
      empty**; the token is **`18.80`** and it sits in zone **D7**, beside the
      `10.68 ±0.10` that survives on the released sheet. So the succession claim
      ("a feature that was 8.80 is now 4.06, printed beside the callout this
      joint's qty already argued for") had no support, and it landed in the one
      open feature-identity question the element hangs on. **Re-read the old
      export too, and zone-resolve the comparison rather than eyeballing the
      neighbourhood** — `build_viewer_crops.page_native_grid` +
      `zone_cell(cols, rows, "D6")` answers it in three lines, over both PDFs,
      and is how this one was caught.
      **The root cause is worth more than the finding** (author's own
      diagnosis, reproduced in review): the claim came off
      `page.get_text("text", clip=Rect(...))`, and **a clip truncates a word
      whose box straddles the clip edge** -- cutting 4 pt into `18.80` returns
      `8.80`, while the neighbouring `10.68` comes back whole, so nothing in the
      output looks wrong. The same clip swept in the adjacent zone's contents
      and they were attributed to the cited one. So: a clipped text extract is
      for *looking*; **`get_text("words")` plus the zone reader is for anything
      you are going to write down.** Suspect a clip behind any quoted callout
      whose leading digit or sign looks one character short.
- [ ] **A re-cite moved `document` and `name` and left `revision` behind.** Same
      handoff, should-fix. `topology_{pitch_link,vpa_output}_to_pitch_plate.json`
      each have exactly one `parts[]` entry carrying a `revision`, and both kept
      `"A.1"` (215197's) while `drawing` became `215735` — whose revision is
      **A**, as the same object's own `note` says two clauses later. The handoff's
      restating inventory named `name`, `drawing`, `note` and `part_identity`
      and not `revision`: the "grep for the one the handoff missed" entry,
      applied to a re-cite. After any citation move, diff the **whole** carrier
      object, not the fields the handoff enumerated.
- [ ] **A curated registry that parametrizes a guard, with nothing pairing it
      against the set it is supposed to cover.** Same handoff, should-fix.
      Extending `test_a_from_scratch_stack_takes_no_band_from_a_workbook_sourced_entry`
      from one hard-coded stack to a `WORKBOOK_BACKED_BANDS` dict was the right
      move and its per-stack non-vacuity half was kept — but a **third**
      from-scratch stack that folds a workbook-derived band is simply not
      parametrized, so it is unguarded silently. (Verified complete today: of
      the four `transcribed_from: null` stacks, only `pitch_link_to_pitch_plate`
      and `rotor_fastener_length` reach a `values_source.kind == "workbook"`
      entry.) Ask of any curated expectation dict: **what fails when a new file
      belongs in it and is not?** Derive the candidate set and assert it equals
      the keys, keeping the curated values as the expectations.

- [ ] **An issue filed AND fixed on the same branch, left `status: open` with
      "close it when this reaches `integration`" in its prose — that
      instruction is addressed to YOU and nothing else will ever read it.**
      New 2026-09-16 (`viewer_unwitnessed_surface_guards`). A tactical agent
      repaired a stale `[real]` pin that was red at its own merge-base (it
      disabled all 18 `fast`-tier mutation entries, so it was on the critical
      path, not adjacent to it), filed
      `ISSUE_20260916_a_real_check_still_pins_the_zero_width_washer_the_rotor_citation_fix_removed.md`
      for the record — correctly — and closed it with *"Leave this issue open
      until that branch reaches `integration`; close it then."* Nothing
      schedules that: the file carries `found_by:` (right for a filing) and
      **`found_by` gets no dispatch auto-resolution** — only `handoff:`, written
      at triage, does, and adding `handoff:` here would be the anti-pattern the
      frontmatter contract spells out. So the issue would sit `open` on the
      board describing a defect that no longer exists, and a sweep would stage
      a handoff for it. **On APPROVE, grep the merged tree's `docs/issues/` for
      issues the branch itself fixes and set them `status: resolved` in your
      own integration commit** — it is a disposition, which is yours as the
      merge gate, and it is the mirror image of the "file it before you write
      APPROVE" rule for what you *didn't* fix.

- [ ] **A quantifier+noun doc-scan anchored at "same sentence" is still too
      loose — pin adjacency, not co-membership.** New 2026-09-16
      (`doc_facts_and_projection_stamps`, self-caught by the tactical agent,
      recorded here so the next scan starts tight). A guard meant to catch "N
      of the declared witnesses" first matched quantifier + noun anywhere in
      the same sentence, which also fired on the *corrected* sentence itself
      — "the other two do" (naming the other two test tiers) shares a
      sentence with "declared witnesses," and "two" is a listed number word.
      Fixed by anchoring the quantifier directly onto the noun phrase (`` `N
      of the declared witness` ``, a few-character window) instead of
      "anywhere in the same sentence." When reviewing a new phrase-plus-noun
      scan, don't just check it fires on the stale sentence (see the
      universal "guard observed failing" check) — also feed it the
      **corrected** sentence and any nearby sentence sharing the same noun or
      a number word, and confirm it stays quiet on both. A scan proven to
      fire is not yet proven to fire *only* on the defect.

- [ ] **A control's position moved from LAYOUT-DERIVED to hand-accumulated
      arithmetic — measure it against the real edge, because no tier does.**
      New 2026-09-16 (`topology_grid_scroll_and_grips`). The ELEMENT grip used
      to be `.tvgrip--col { right: 0 }` inside its own `<th>` — the browser put
      it on the column edge by construction. It is now an absolute `left`
      written from `railWidth + Σ COLUMNS[i].width` (`VA.columnGripLeft`), and
      every check on it is *behavioural* (`dragBy` + read the preference back),
      so a grip drawn 20px off its boundary still drags the column and still
      passes. Replay: print the grip's `getBoundingClientRect()` beside
      `th.tvcell--name`'s at several `scrollLeft`s. (Verified exact here —
      `colRight - thRight = 0.0` at `scrollLeft` 0/100/300/666, and the jog
      grip's hairline sits on `svg.tv__rails`'s right edge at all of them — but
      nothing in the repo would have told you.)

- [ ] **A fast-tier test that writes `scrollLeft` (or any layout/hit-test
      state) is vacuous in the BROWSER half of the same file.**
      New 2026-09-16 (`topology_grid_scroll_and_grips`), the fourth member of
      the "fast tier proves nothing here by construction" family. `tests.js`
      runs in the node DOM shim *and* in `test.html`: the shim keeps whatever is
      written to it, a real browser silently refuses to scroll the detached,
      unlaid-out `<div>` the suite renders into — so the same assertion is a
      real check in one tier and `0 === 0` in the other, and it reports PASS in
      both. The accepted shape here is a capability probe (`canHoldScroll`) that
      returns early plus a named browser-tier twin on a laid-out pane; demand
      both, and confirm the node half actually bites by breaking the behaviour
      (here: `carriedScroll` → 0 took the fast tier to 333/335).

- [ ] **…and the duplicate-filing entry above reached FOUR on a second noun.**
      2026-09-16: `docs/issues/` now holds four filings of the
      `test_no_live_document_states_an_unguarded_hardware_entry_count` false
      positive as well — two of them already in this handoff's own merge-base
      tree. Same instruction, and it is cheap: before accepting an issue about
      a red the diff did not cause, `ls docs/issues/ | grep <noun>` in the
      MERGED tree, cross-reference, and tell triage to close them as one.

- [ ] **A copy change spelled as a SUFFIX on a shared helper, with the suffix
      itself pinned nowhere.** New 2026-09-16
      (`reader_facing_copy_and_vocabulary`, and the one blocker in an otherwise
      exemplary branch). The rest of that handoff's strings were pinned at the
      value level; item 2's was not, because it landed as
      `return bits.join(" · ") + (reference.unverified ? " (" + ... + ")" : "")`
      on `VA.referenceText` -- the helper already had value-level tests, they
      all pass an object with no `unverified` flag, and every one of them stayed
      green when the whole clause was deleted (419/419 fast, 20/20 browser,
      1192 pytest). The tell is a boolean the *producer* sets
      (`VA.partReferences`) that no fixture happens to set: the conditional arm
      is dead in every test and live on every real page. Mutate the rendered
      string, never the constant it reads -- a constant's tests are usually
      tautologies against the constant. The fix shape, from the rework that
      closed it: pin all three limbs separately -- the string, the **producer**
      that sets the flag, and any hover/`title` wiring -- because deleting the
      producer and deleting the string are different mutations and a test can
      catch one without the other.

- [ ] **A viewer copy change that leaves `apps/viewer/README.md` describing the
      old string.** New 2026-09-16, same handoff, three rows at once: the chip
      legend table (`dashed blue zero-width band | min == max; ...`), the
      export-block state table (*"the drawing-checker runs that consumed it, or
      no run has consumed this export"*), and the run-id bullet (*"Every other
      id prints as plain text with a hover saying why"* -- now false end to
      end). That README documents the rendered wording chip by chip and panel
      by panel, and **no test pairs it against the strings**, so a copy fix goes
      green with the documentation of it left wrong. After any `VA.*_TEXT` /
      `VA.ATTENTION` / chip-label edit, grep the retired string across
      `apps/viewer/README.md` before you read the diff. All three were fixed on
      the rework; the **pairing still does not exist**
      (`ISSUE_20260916_nothing_pairs_apps_viewer_readme_against_the_strings_it_documents.md`),
      so this stays a grep until it does.

- [ ] **A new `VERBATIM_PROSE_CLASSES` (or any exemption-selector) entry that
      matches nothing.** New 2026-09-16: `div.worksheet__body` was enrolled in
      the widened stack walk and matched **0 nodes** across all 165 surfaces,
      because `stackSurfaces()` calls `VA.renderWorksheet(r, stackProj, null)`
      and a null markdown renders no body -- so the class is neither scanned nor
      actually exempted, and the enrollment reads as coverage that is not there.
      An exemption list is a guard's scope statement: instrument it
      (`__VP[selector] += all(root, selector).length`) and demand a non-zero
      count per entry, the same way the walk itself is required to be
      non-vacuous. There IS such a guard now, inside `[real] no rendered stack
      surface ...` -- so check a new selector is in its scope, and know its
      stated limit: it asserts the selector **resolves**, not that the node's
      text was excluded. `div.worksheet__body` is written with `innerHTML`, and
      the node shim keeps innerHTML out of `textContent`, so dropping that one
      selector still takes 422/422 and only the browser tier reddens. Read the
      *largest* counts while you are there -- `dd.kv__value` exempts 433 nodes,
      the value half of every free-form authored block, which is exactly where
      a workstation path gets authored
      (`ISSUE_20260916_the_free_form_block_value_exemption_hides_the_values_from_every_scan.md`).
- [ ] **A CSS-ONLY deliverable, pinned by a hand-run probe.** New 2026-09-16
      (`viewer_hover_deslop_and_banner_purge`, blocker) — the "one line from
      being silently reverted" entry above, in the one file no tier reads for
      values. Deliverable 5 was a 430→560px pane default plus a divider made
      visible at rest with a grip mark; reverting **all three** edits in a
      scratch tree (`width: 430px`, `background: transparent`, delete
      `.tv__divider::after`) left **430/430 fast and 20/20 browser** green, and
      `pytest` never opens a `.css`. The only thing that noticed was
      `tests/debug_hover_deslop.mjs`'s `pane.width >= 560`, and a hand-run
      probe is not a pin. The tell in the diff: the deliverable's whole
      footprint is `apps/viewer/*.css` and the new tests are all about JS. A
      *default* also needs its own check even where a *drag* is tested —
      the existing loop drags **to** 560 and says nothing about arriving there.
      **Second sighting 2026-09-17 (`design_pass_typography`), a whole-handoff
      instance, and it moves the question from "is there a pin" to "does the
      pin cover a RULE or only the NUMBERS".** That pass shipped a real guard —
      `tests/test_app_type_scale.py`, observed failing four ways (bare `px`,
      drifted annotator copy, dropped step name, all-caps above `--t-meta`) —
      which pins the six-step scale and refuses a literal `font-size`
      anywhere in either app. It pins nothing else: seven reverts, measured
      one at a time and then together, all leave pytest at baseline, the fast
      tier **453/453** and the browser tier **22/22** — the `--measure` caps,
      the name-column floor, the note clamp, the crop trigger's quieting, the
      attention flags' fill, the annotator's base size, and the headline fix
      itself (scoping `.conf--*` to `.chip`). So when a styling handoff hands
      you a guard, ask **which of its deliverables the guard's assertions are
      about** — a scale guard reads `:root` and is blind to every selector
      below it — and reach for the *inheritance* question rather than a
      selector string, because that is the one assertion that generalises:
      here, `getComputedStyle` on an untraced row's own `<td>`s, with the
      row's chip as the non-vacuity witness.
      `ISSUE_20260917_the_typography_passs_visual_rules_are_unwitnessed_in_every_tier.md`.
- [ ] **A deferred/held action that re-reads the SAME input on expiry, so it
      re-arms instead of firing.** New 2026-09-16
      (`viewer_hover_deslop_and_banner_purge`, blocker). `topology_app.js`'s
      hover-intent `defer()` holds a competing trigger while the pointer is
      travelling toward the open card, and its timer calls `held.run()` — which
      re-enters `showCard` → `defer()`. `pointerWas`/`pointerAt` are written
      **only by `mousemove`**, so a pointer that has *stopped* still carries
      the vector it crossed on, the corridor test says "still approaching", and
      the trigger is deferred again with no bound. Measured with a real mouse:
      the held card had not appeared after **4.4 s** (`HOVER_INTENT_MS` is 260)
      and arrived only on a 3px nudge that changed the vector — the exact
      failure the design comment says the design was chosen to avoid. **The
      question to ask of any grace period: what does the expiry path read, and
      can that input still be stale when it fires?** And check the tier covers
      the expiry, not just the two sides of it: a check that moves the pointer
      *into* the card before the timer is testing the drop path, not the fire
      path.
- [ ] **A hand-run probe that re-calls the app's boot function registers the
      app's `document` listeners TWICE, and module state that remembers a
      previous value dies.** New 2026-09-16, found while reproducing the entry
      above. `tests/debug_*.mjs` install fixtures and then call
      `VA.bootTopology()` again; each boot adds another `document`
      `mousemove` listener, both write the same module variables, and the
      second one sets `pointerWas = pointerAt` — so `pointerWas === pointerAt`
      after every move and every "where was the pointer one move ago" feature
      is silently off. A probe's reading of such a feature is a reading of the
      probe. The fix shape when you need real data under one boot: serve a
      patched `topology_fixtures.js` (append an override of
      `VA.demoTopologyFixture`) from the probe's own static server instead of
      re-booting. (Closed in the rework by dropping a same-coordinates move in
      the tracker, which makes the duplicate listener harmless *for that
      listener*; the double boot itself is still there.)
- [ ] **Two true checks either side of an untested middle read as coverage.**
      New 2026-09-16 (`viewer_hover_deslop_and_banner_purge`, blocker 1, and
      the author's own best line about it). A three-state behaviour --
      *hold* / *drop* / *fire after the grace period* -- shipped with pins on
      the first two and nothing on the third, which was the one that was
      broken. Worse, a check *named* for the third ("...and it still does not,
      once the grace period has run out") measured the **drop** case, because
      the pointer had been moved into the card before it ran. Nothing in a
      green run distinguishes two checks from three. So: for any timer, retry,
      debounce or grace period, **write down its states and point at the check
      for each one** -- and read what each check actually sets up, not what its
      name claims. A check whose *name* is the missing case is worse than no
      check, because it retires the question.
- [ ] **A browser-tier gesture that TELEPORTS the pointer computes off a stale
      position.** Same handoff, and why the check above could not reach the case
      it was named for. Chrome dispatches `mouseenter` on the element being
      entered **before** the `mousemove` at the new coordinates, so a
      single-jump `page.mouse.move(x, y)` fires the enter while the page still
      holds the position it jumped *from* -- and any handler that asks "where
      was the pointer one move ago" reads a vector from somewhere else
      entirely. **And `{ steps: N }` does not fix it**, which is the part that
      nearly shipped twice: Chrome **coalesces** mousemove under load, so an
      interpolated move can leave the page holding only the position it started
      from. That version was green five runs out of five in isolation and red
      inside a full mutation-witness run -- green on an idle machine, red on a
      loaded one, which is the worst shape a guard can have. What is
      deterministic: **separately awaited** moves down the approach line, a
      short drain so the page has processed them, and only then the step that
      crosses into the target (`approachFrom()` in the topology suite). Cheaper
      tell, same family: a synthetic `dispatchEvent("mouseenter")` fired while
      the real pointer sits elsewhere cannot reach any code that asks where the
      pointer IS. Corollary for a reviewer: **run the browser tier concurrently
      with something heavy** before believing a new pointer-path check.
- [ ] **A probe that perturbs state to observe a guard can destroy the guard's
      own precondition.** Same handoff. Observing "did `position()` run" by
      nudging the card and seeing whether it snaps back is the right idea --
      but the first draft shoved `style.left` to 1px, which slid the box out
      from under the pointer, so the guard ("never move a card the pointer is
      on") correctly declined to hold and the probe reported a defect that was
      not there. The nudge has to be smaller than the margin the precondition
      has. Ask of any mutate-and-observe check: *does my perturbation still
      satisfy the `if` I am testing?*

- [ ] **An "X is still visible beside it" claim measured against the CONTAINER
      instead of the thing drawn inside it.** New 2026-09-16
      (`flyout_resize_annotator_filter_and_deselect`). The left-docked
      annotator flyout's whole point was adjacency -- "the DAG must remain
      visible beside it" -- and both the clamp (`VA.clampFlyoutWidth`'s
      `reserve`) and the browser check named for it (`uncoveredDag()`) measure
      `#topopane`'s right edge. `#topopane` is a horizontal scrollport that
      also holds the grid table; the DAG itself is one `svg.tv__rails` pinned
      at the pane's LEFT edge, x=300..562 at worst across all 21 live studies,
      while the panel's floor (`FLYOUT_WIDTH.min`) is 560. Measured: 300px of
      pane "uncovered" and **0px of diagram**, check green, on every live
      study. The lesson had already caught the shallower version of this
      ("a covered diagram and an adjacent one are indistinguishable from the
      layout tree; you have to compute the overlap") and then computed the
      overlap against the wrong box. Ask of any coverage/adjacency check:
      *which node did I measure, and is the pixel the reader cares about
      inside it?* -- and check the fixture can discriminate (at `?mock=1` the
      DAG is 78px wide and can never survive a 560px panel). Two further
      halves from the rework: **measure FULLY CLEAR, not partial overlap** (a
      container is always wider than its contents, so partial clearance of the
      container is compatible with total coverage of the content -- the shipped
      formula was `dag.right - max(dag.left, panel.right) >= reserve`), and
      expect the answer to be a **reversed invariant** rather than a bigger
      number: "position: fixed cannot reflow the pane" and "adjacent to the
      pane's contents" could not both hold on one edge of one window.

- [ ] **A superlative about the page's own tree, written from the surface you
      just added -- and the COUNT beside it is exact, which is what carries
      it.** New 2026-09-17 (`crop_lightbox_zoom_viewer`, fixed inline).
      `#crop-lightbox`'s comment said *"the fourth `<dialog>` on this page and
      the only MODAL one"* in three places (`topology.html`, `style.css`,
      `views/lightbox.js`). Fourth is right; `topology_app.js` `showModal()`s
      `#legend-dialog` and `#worksheet-dialog` too, so it is the **third**
      modal one -- only `#annotate-flyout` is not. One command settles it
      (`grep -n "showModal" apps/viewer/*.js apps/viewer/views/*.js`), and the
      author's own lesson in the same commit is about having believed an
      unmeasured comment on these same two dialogs. So grep for the
      **mechanism** (`showModal`, `addEventListener`, the call), never for the
      noun the superlative is about, and read "the only / the first / the one"
      as a claim about every sibling.
- [ ] **An issue that names "the mutation each guard should redden on" is a
      PREDICTION -- replay each one before triage inherits it.** Same handoff.
      The author filed three paste-ready witness entries with an
      `expect_red` sub-check named for each. Two reproduce exactly; the third
      (drop the frame's pixel sizing, expect the `frac` check to fail) leaves
      **453/453 fast and 17/17 browser** green, so the entry would have been
      declared against a check that cannot fail on it -- and the real
      consequence was worse than the predicted one. The issue itself said each
      had to be watched reddening first, which is the right instinct and is
      not the same as having done it. A named-but-unreplayed `expect_red` is
      the "guard that has never been seen red" one step earlier in the
      pipeline; cost of checking is one `git archive` plus one `--only` run.
- [ ] **A ~300-line function appended to a file, landing between the header
      comment and the function it belongs to.** Same handoff, fixed inline:
      the new browser suite went in directly under
      *"--- the inbound deep-link contract ..."*, leaving that six-line header
      orphaned above the lightbox block and `testDeepLinks` with none. Nothing
      fails; the next reader attributes the paragraph to the wrong suite.
      Whenever a diff adds a whole function to an existing file, read the
      three lines immediately above the insertion point and the three
      immediately below the addition.

- [ ] **A CSS rule keyed on a VOCABULARY TOKEN alone, whose scope nobody
      decided.** New 2026-09-17 (`design_pass_typography`, which found it
      already shipped). `VA.confidenceClass()` returns `conf--traced` /
      `conf--inferred` / `conf--untraced` / `conf--no_source_ref`, and a token
      out of a constant gets put on **whatever element needs that vocabulary**
      — here a `span.chip`, three kinds of `<tr>` (`el-row`, `mat-row`,
      `tvrow--edge`) and an SVG `line.rail__bar`. `.conf--untraced`'s
      `color: #fff` and `font-weight: 700`, written for an 11px pill, therefore
      arrived by **inheritance** on every cell of every untraced row: 8 of the
      live `pitch_system` grid's first 10 rows and both materials rows rendered
      entirely in 700-weight white, and the two outlined siblings tinted all
      eleven columns of a row, numbers included. Nothing was red — the browser
      tier measures a row's *background* layers, deliberately, and never its
      text. The fix is `.chip.conf--X`, not `.conf--X`. Two review moves:
      **grep every bare `^\.<token>--` selector in `apps/*/*.css` against the
      producer's call sites** (`VA.confidenceClass`, `VA.ATTENTION`,
      `AA.*` states) and ask which element kinds wear it; and remember the
      declaration a rule *inherits* is invisible to a selector-based guard, so
      the assertion has to be `getComputedStyle` on a descendant. Sibling
      tokens with live bare rules today: `.tvflag`, `.chip--values-*`.

- [ ] **A doc-scan corpus size measured in the main checkout is measuring the
      dirt.** New 2026-09-17 (`review/prose_guards_scope_out_strategy_briefs`).
      `live_documents()` is a bare `os.walk` with a hand-kept
      `_SKIP_DIR_NAMES`/`_SKIP_REL_DIRS`; it **never consults git**, and `tmp/`
      is on neither list. Two `tmp/mutation-witness/apps/*/README.md` files a
      2026-09-16 session left behind made the main checkout report 94 live / 70
      claim-scanned where the tracked tree is 92 / 68 — and the handoff, the
      lesson and a new floor's justifying comment all quoted the dirty numbers,
      with the delta misattributed to "the `data/` documents are gitignored"
      (every `data/` document here is tracked, so no worktree is missing one).
      **Re-derive any corpus count yourself in both checkouts and diff the two
      sets, not just the two integers** — the set difference names the dirt in
      one line. Tracked as
      `ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`;
      until it closes, a mutation-witness copy left in `C:\workspace\tolstack`
      is inside every claim-shape scan the operator's batch merge runs.
- [ ] **A floor "set *at* the count" has drifted, so `old_floor − removed` is
      not the new floor.** Same review. `RULE_STATEMENT_FLOOR` was documented
      as 15 → 14 with "two of the fifteen were in the brief" — which reaches 13.
      The missing step: the count was 15 when the floor was set (`c95ef61`,
      2026-09-03) but ARCHITECTURE.md gained a passage afterwards, so the live
      count was **16** when the two brief passages left. This repo has several
      floors deliberately set at the day's count (`assert_coverage_set`'s
      argument), and each one silently loosens the moment the corpus grows.
      **Measure the pre-state at the merge-base, not from the constant** — a
      floor is the last re-measurement, not the current count, and a lesson's
      subtraction that reconciles only against the constant is arithmetic
      nobody checked.

- [ ] **The tactical agent edited this overlay — `docs/prompts/REVIEW_AGENT.md`
      is the *reviewer's* artifact.** Promoted 2026-09-18 by the triage sweep;
      **four sightings in three days**, every one flagged by the reviewer and
      every one kept, so nothing accumulated until now. Seen in
      `REVIEW_20260915_respine_tween_fidelity` and its `_round2`
      (*"the author amending the checklist entry that indicts their own file"*),
      `REVIEW_20260915_viewer_value_guard_rows_and_replays`, and
      `REVIEW_20260917_prose_guards_scope_out_strategy_briefs` (three passages).
      The rule is not "always revert" — the resolutions legitimately differed:
      **keep it when the author is repairing a pointer their own work broke**
      (the `value_guard_rows` case, correctly disclosed); **reject it when the
      author is grading the entry written about them**, which is the
      `respine_round2` case and the one that must not become a habit. Either
      way: it is out of any handoff's declared file scope, so check that it was
      **disclosed**, and check **every** changed passage against the code — an
      author's edit here is the one diff no reviewer's checklist is watching.

- [ ] **An issue that asks a *design* question filed without
      `audience: strategy`.** Promoted 2026-09-18 (two sightings). The
      frontmatter routes it as a `bug`/`chore`, so triage stages a tactical
      handoff that then has to make the design call anyway — or, worse, the
      question is answered five times and never decided.
      `REVIEW_20260915_viewer_popover_clamp_and_rebuild_terminal_state`: the
      issue *"ends by asking the reader to decide whether the contract is worth
      a configuration of its own at all — a design call, not a fix — but carries
      no `audience: strategy`."*
      `REVIEW_20260916_viewer_hover_deslop_and_banner_purge`: a `type: chore`
      whose *"closing paragraph asks a schema question… That half wants
      `audience: strategy` or a second issue, or it will be fixed five times and
      never answered once."* One-line check at the merge gate: read the issue's
      **last** paragraph, not its title, and ask whether it names a fix or a
      decision.

- [ ] **A new `VA.NAME = "literal"` scalar constant — the one vocabulary shape
      `test_js_python_vocabulary.py` structurally cannot extract.** New
      2026-09-18 (`real_tier_red_and_the_skipping_tier`). `views/stack.js`
      gained `VA.JOINT_EXPORT_KEY = "assembly_export_ref"`, correctly a
      module-level constant per `CLAUDE.md`'s field-vocabulary rule — and a
      second hand-copy of `tolerance_stack/stack.py`'s `JOINT_EXPORT_KEY`,
      paired by nothing. The pairing module's two extractors are
      `js_object_keys` (object literals) and `js_array_strings` (arrays), so a
      **bare string assignment** slips between them and the author gets the
      "it's a named constant now" feeling without the guard. Check: for any new
      `VA.<SCREAMING_NAME> =`, `grep` the same word in `tolerance_stack/` and
      `scripts/`; if Python defines it, ask what reddens on a rename. Fails
      closed here (the `[real]` surface scan reddens on the leaked label) but
      only in the main checkout and only on the symptom, never the cause.
      `ISSUE_20260918_va_joint_export_key_is_a_twelfth_hand_copy_of_a_python_
      constant_that_the_pairing_module_cannot_see.md`.

- [ ] **The guard the diff satisfies is the guard you must re-aim at the tier
      the author could not run.** Same handoff, and it is the cheap half of
      "a new guard has been observed failing". `run_viewer_browser_tests.mjs`
      needs `node_modules/playwright-core`, which is gitignored — so a tactical
      agent in a worktree genuinely cannot run the truth tier, and will
      (rightly) design around it rather than risk it; this one declined to add
      a fixture because `.el-export--established` is located page-wide and
      `textContent()` is strict. **You can run it**: `node_modules` is 14 MB,
      `cp -r C:/workspace/tolstack/node_modules .` into your review worktree
      makes it resolve, and
      `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
      then drives THIS branch's `apps/viewer` against the live projections
      (`REPO` comes from `__dirname`, only `DATA_REPO` follows `--repo`).
      22/22 in ~3 minutes, and it is the only evidence anyone will ever get
      that a rendering change did not break the tier nobody ran. Delete the
      copy before you finish. **Cheaper, 2026-09-18:** a directory junction is
      instant and costs no disk —
      `New-Item -ItemType Junction -Path <worktree>\node_modules -Target
      C:\workspace\tolstack\node_modules`. **Remove it before you finish**, and
      that is not tidiness: a junction is a reparse point outside git's view,
      and a recursive delete that follows one takes the MAIN checkout's
      `node_modules` with it — dispatch removes your worktree at Complete.
      **After your LAST tier run, not when you write the report** — the
      review-merge item above sends you back for one more, and a mutation tier
      run without `node_modules` reports every browser entry as
      `the tier is already red with NO mutation applied`, which looks exactly
      like the regression you were re-running to find (2026-09-18, done by the
      reviewer who wrote this line).

- [ ] **A diff that widens a tree the repo COPIES has to be re-tested with the
      copy on disk, and a fresh clone cannot reproduce the failure.** New
      2026-09-18 (`mutation_witness_enrollment_gaps`). `SHADOWED` in
      `scripts/run_mutation_witness_tests.mjs` grew from `apps/ scripts/
      docs/topologies/` to seven directories including `tests/` — and every
      walker that scans the repo by directory then saw each copied file twice,
      because the shadow lives at `tmp/` **inside** the repo. Two live guards
      broke: `pytest -q` died with **35 collection errors** on duplicate module
      basenames, and `live_documents()` — the corpus walker every claim scan in
      `tests/test_tolerance_stack.py` shares — went from 92 documents to 105,
      quietly doubling counts. Both fixed here (`pytest.ini`'s `norecursedirs`,
      and `tmp` in `_SKIP_DIR_NAMES`), and **both were measured load-bearing in
      this review** by removing each fix with the shadow present. The reason
      this is a review checklist item and not just a lesson: `tmp/` is
      gitignored, so **a green suite in a tree that has never run the tier
      proves nothing** — the order that finds it is *run the tier, then run
      pytest*, and the author's green almost certainly came the other way
      round. Anything that widens a copied tree (this one, or a future one)
      inherits the whole trap.

- [ ] **A declaration two consumers read, where the cheap one compares it
      loosely and the expensive one compares it exactly.** New 2026-09-18, same
      handoff, and it is the shape behind "verified, paste-ready, and wrong".
      `mutation_witnesses.json`'s `expect_red` is counted as a **substring** by
      `tests/test_mutation_witnesses.py` (0.6s) and matched for **equality** by
      the runner (minutes, behind a browser). Two entries were filed with the
      name deliberately truncated *so that the cheap checker would resolve
      them*, were called paste-ready, and were a guaranteed `NOT WITNESSED`.
      The question to ask of any new declared-string field: *what does the
      slow half compare, and does the fast half compare it the same way?* If
      not, the fast half needs the extra assertion — which is what
      `test_no_expect_red_is_a_truncated_check_name` now is.

- [ ] **A per-suite SKIP that returns `ok: true` is counted in the runner's own
      green total.** New 2026-09-18 (`visual_rules_nothing_checks`).
      `scripts/run_viewer_browser_tests.mjs` now has **six** suite bodies that
      print a `SKIP:` line and `return { label, ok: true }` on an unmet
      precondition — an unbuilt projection, a live nav leaf that moved — and the
      last line still reads `23/23 browser checks passed`. Since
      `data/projections/` is gitignored and main-checkout-only, "skipped" is the
      *default* in a worktree. The repo already paid for this exact shape a week
      earlier on the pytest side
      (`real_tier_red_and_the_skipping_tier`: *"A TIER THAT CANNOT RUN IS NOT A
      TIER THAT PASSED"*), so a new suite that inherits the convention is worth a
      filed issue even though it matches its neighbours. **The check to run: make
      the precondition unmeetable** (point `--repo` at a tree with no
      projections) **and read the LAST line, not the SKIP line.**
      (`ISSUE_20260918_a_skipped_browser_suite_returns_ok_true_and_is_counted_in_the_runners_green_total`.)

- [ ] **A guard's token list restated by hand where the DRIFT DIRECTION is
      silence.** New 2026-09-18 (`visual_rules_nothing_checks`), and the reason
      it earns a line of its own next to the generic hand-copy entry: ask not
      just *is this copy paired?* but **which way does it fail when it goes
      stale?** `tests/test_app_type_scale.py`'s `CONFIDENCE_TOKENS` is
      `["conf--" + c for c in VA.CONFIDENCES] + ["conf--unknown"]` written out,
      and a guard parametrized by a *too-short* list is silent on exactly the
      new word — a fifth confidence would arrive with the unscoped
      `.conf--<new> { color: #fff }` rule invisible to the guard written for it.
      Its sibling in the same diff, the browser fill census's `MAY_FILL`, is the
      same shape and fails **loudly** (a new unlisted token reads as an
      overspend and reddens). Same defect class, different urgency; say which
      one you found. The extractor to point at is already here —
      `tests/test_js_python_vocabulary.py`'s `js_array_strings`, which already
      reads `VA.CONFIDENCES`.
      (`ISSUE_20260918_the_type_scale_guards_confidence_token_list_is_an_unpaired_hand_copy_of_va_confidences`.)

- [ ] **A lesson citing a sibling file's habit as already-established — go
      count the call sites.** New 2026-09-18 (`visual_rules_nothing_checks`), and
      a second sighting of the canonical "audit the lesson's arithmetic" entry in
      its *causal* half. The lesson explained a fixed race by saying
      `scripts/run_viewer_browser_tests.mjs` "already knew this and waits 450ms
      after each of its **three** `setViewportSize` calls". It has **seven**, all
      on a booted topology page: two wait 450, two wait 400, three wait nothing,
      and one of the three measures a layout on the very next line. The claim's
      form is the tell — *"the neighbouring file already does X"* is an appeal to
      a convention, and a convention with silent opt-outs is not one. `grep -c`
      the call sites before you believe it; here it turned one corrected sentence
      into a filed latent flake.
      (`ISSUE_20260918_three_browser_tier_resizes_measure_through_the_apps_own_debounce`.)

- [ ] **A probe/screenshot pair claimed identical to the byte — re-take it
      TWICE, not once.** New 2026-09-18 (`visual_rules_nothing_checks`). The
      handoff's own issue reported "7 of the 13 `after` shots differ from a
      re-take", from three runs. Verifying it with `cmp -s` over every shot, the
      reviewer's **first** re-take differed on **8** — the extra one being
      `6_hover_card`, which carries an asynchronous `ensureThumbImages` thumbnail
      no shot waits for. Two further runs matched each other under the same
      `cmp -s` on all 13 and reproduced 7 of 13 exactly, shot for shot. So the
      author's number was right and the probe is *nearly* deterministic — but
      "nearly" is the finding, and one re-take cannot tell the two apart. Take it
      into two scratch dirs, `cmp` the runs against **each other** first, and only
      then against the committed set.
- [ ] **A fix that SUPPRESSES a node takes every guard that was standing on
      that node with it — and an anti-vacuity anchor has to be derived from the
      argument under test.** New 2026-09-18
      (`reader_facing_surfaces_second_pass`), and it is the first time this repo
      has seen a witness die from a *correct* change to the app rather than from
      a merge. `VA.PANE_CROP = { omitHead: true }` stops both preview panes
      rendering `div.detail__crop-head` — which was the only node in the block
      whose class came from `VA.cropReference`'s `classPrefix` argument at every
      origin (`-links` renders only where the origin can follow a link;
      `detail__crop-img` is a separate literal passed to `VA.cropFigure`). The
      `unseparatedPrefixes()` sweep that guards the separator then had nothing
      to sweep, and `stack-pane-crop-block-keeps-its-prefix` /
      `topology-pane-crop-block-keeps-its-prefix` went **WITNESSED at
      `08855d2` → NOT WITNESSED** on the branch: 64/64 → 62/64, with the
      author's re-pointed `find` anchors resolving perfectly and the fast tier
      green **with the mutation applied** (measured, 466/466). Two questions,
      and the first is the cheap one:
      - **Before you accept a suppression** (`omitX`, an early return, a node
        moved to another surface), `grep` the suppressed class/selector across
        `apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` and
        `scripts/mutation_witnesses.json`. A guard that only ever saw the app
        through that node is now vacuous, and it will not say so.
      - **An anti-vacuity anchor must be a node the mutated argument actually
        produces**, not merely a node that is present. Re-anchoring on
        `img.detail__crop-img` proved the test was looking at *something*; it
        could not prove it was looking at the thing `classPrefix` controls. The
        origin-independence question the author did ask (does this node exist on
        all three tiers?) is the second question, not the first.
      **Second sighting, same branch, round 2 — and it widens the entry twice
      over.** The same commit that suppressed the crop head also deleted
      `.el-row__srcnote` with the composite source cell, and
      `visual_rules_nothing_checks` had — *that same day, on a branch this one
      could not see* — written a browser sub-check reading
      `#stackview .el-row__srcnote:not(.el-row__srcnote--open)`. Each branch is
      green alone; the merge is **9/9 → 7/9** on
      `typography pass's visual rules (live stack view)`, measured both ways.
      So: (a) the grep is not optional and it is **three files, not one** — the
      author swept `tests.js` for the classes it had deleted, took them out of
      `VERBATIM_PROSE_CLASSES` and `style.css`, and never opened
      `scripts/run_viewer_browser_tests.mjs`; and (b) a *correctly failing*
      guard is the good case — that check fails rather than passing when its
      subject is absent, which is the only reason anyone found out. The
      resolution is a judgement the author owes an argument for: retire the
      assertion with its reason written where it lived, or re-point it at a
      node that still carries the same claim — and a clamp check re-pointed at
      a node in a *pane* is no longer a claim about a *row's height*, so
      "re-point it at the nearest surviving selector" is usually the wrong one.
- [ ] **A handoff closes HALF of an open issue and the issue's own closing note
      then declares what is left — check that list against the issue's own
      "Where the pieces are".** New 2026-09-21
      (`viewer_nav_alert_badge_and_angled_default`). The handoff quietened the
      nav rail's **study** rows, appended an honest "what shipped" section to
      `ISSUE_20260916_..._jeff_called_loud`, and ended it "Still open, and the
      whole of what is left: the materials table" — while the rail's
      **loose-stack leaf rows** (`views/nav.js`'s `stackItem` over
      `VA.summaryChips`, five chips and three on the live projection, one of
      them the filled `UNTRACED`) are named in that same issue's own
      "Where the pieces are" list and in its screenshot. Nothing was
      mis-scoped — the deliverable said "study rows" — but a wrong
      "whole of what is left" is how the remainder stops being scheduled, and
      an issue left `status: open` with an understated remainder reads to the
      next triage sweep as nearly done. **Diff the closing note against the
      issue's own inventory, name by name**, and re-measure anything it calls a
      remainder. Corollary worth holding: half-fixing a rail leaves it
      *inconsistent*, which is a new complaint the issue did not previously
      carry — say so where it will be read.
- [ ] **A quoted design measurement whose ADJECTIVE went stale, not its digit.**
      Second cousin of the restated-count family above; new 2026-09-21.
      `apps/viewer/README.md` described the pre-fold nav rail as
      "61 filled marks … against 20 study names", quoting `topology.css`'s
      `.tvflag` note — whose very next sentence is **NOT FILLED**, because
      `design_pass_typography` (2026-09-17) outlined those flags, and whose
      figures are a measurement of the state *before that* pass, not before
      this one. Live count at review: 21 study rows, 21 verdict chips + 42
      outlined flags. So when a doc quotes a number out of a CSS/design
      comment, check **what the comment says happened to it since** — a design
      note is a dated record of a change, and its numbers describe the side of
      the change they were measured on.
- [ ] **A measured number landing in the ONE app README nothing scans.** New
      2026-09-21 (`annotate_face_suggestions`). `tests/test_viewer_readme_
      doc_facts.py` scans `apps/viewer/README.md`; **nothing scans
      `apps/annotate/README.md`**, which is now the longer of the two and the
      document `ARCHITECTURE.md`, `docs/ANNOTATION_SURFACE.md` and `CLAUDE.md`
      all point a reader at. The handoff put four measured geometry numbers in
      it (`2.4065`, `2.4130`, `0.27%`, `eight → four`) of which exactly one is
      pinned — the `[real]` tier deliberately asserts only that the narrowing
      is *strict*, because the counts belong to the mesh store and the tier
      does not own it. Right call in the tier, unguarded prose beside it. So:
      **before accepting a number in a doc, name the test that reads it** —
      "the `[real]` tier prints it" is not pairing, printing is not asserting.
      `ISSUE_20260921_annotate_readme_measured_numbers_are_paired_by_nothing.md`.
- [ ] **A de-dup key widened by a ROLE, where two roles can land on one
      target.** New 2026-09-21, same handoff. `scene.markFace` de-duplicated on
      `(sha256, faceId)` and now de-duplicates on `(sha256, faceId, role)` — so
      the `suggested` layer can be cleared without taking the `bound` marks
      down, which is right, and so two opaque overlays at identical
      `polygonOffset` can now sit on ONE face, which nobody asked for. The
      filter that would have prevented it (`planEnd`'s `alreadyBound`) drops
      only the faces bound to **this** element. Ask it as one line: *when a
      key gains a dimension, which two rows can now collide on everything
      except the new dimension, and does the consumer care?* The browser tier
      checked the coexistence on two DIFFERENT faces, which is the fixture's
      shape, not the contract's.
      `ISSUE_20260921_a_face_bound_to_another_element_gets_two_opaque_overlays.md`.
- [ ] **A hand-enumerated list of test modules is a vocabulary, and it drifts
      like every other one here.** New 2026-09-21 (`review_overlay_test_cadence`),
      found in the *same commit* that introduced the list. "Choosing the risky
      subset" above maps a diff shape to the modules to run; its prose row named
      `test_tolerance_stack.py` and `test_provenance.py`, and the corpus walk is
      shared by **three** modules — `test_thermal_exception_list.py` imports
      `claim_scanned_documents()` too, and `docs/prompts/` is inside its rule-scan
      corpus, so this very file can red it. A module list cannot be pinned by a
      test the way a field vocabulary is (no constructor refuses a missing row),
      so the only thing standing between it and drift is **the grep that
      regenerates it, written into the row beside the list**. When a review adds
      or edits a mapping row, ask for that grep; a row that names modules and
      not the query that found them is already stale-shaped.
- [ ] **A ban-list literal widened to a SHAPE, in the same diff that removes
      every live instance — so nothing can witness the widening.** New
      2026-09-22 (`policy_free_brief_residues`).
      `apps/viewer/reader_facing_bans.js` traded the literal
      `build_viewer_crops.py` for `/\b[\w.-]+\.(?:py|exe|ps1|bat|cmd|sh)\b/`,
      which is the right change — and **measured**: reverting the shape back to
      that one literal leaves `480/480` (viewer, through `--repo`) and
      `154/154` (annotate) green, because with every command site gone no
      walked surface prints a script filename at all. The widening's value is
      *prospective*, so the only mutation that witnesses it is one that
      **plants** a filename no literal spells onto a walked surface — never one
      that edits the list. The handoff's own witness issue proposed the
      un-witnessing mutation
      (`ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_entry`,
      corrected in place). Ask of every literal→shape widening: *which single
      mutation passes under the literal and fails under the shape?* If you
      cannot name one, the row belongs on the call site, not on the list.
- [ ] **Copy lifted from `apps/annotate/` into `apps/viewer/`, carrying a
      justification only annotate has.** New 2026-09-22, same handoff.
      `AA.NO_PROJECTION_NOTICE` ("It is built in the tolerance-stack
      repository, not from this page") is honest *there* for a stated reason —
      annotate "has no transport that could ask anything to rebuild anything"
      (`ISSUE_20260910_annotate_has_no_http_read_transport`). The viewer has
      one: `storage/http.js` probes the sibling mount and reports
      `capabilities().rebuild`, and drawing-checker's endpoint reruns the whole
      `rebuild_projections.ps1` recipe, so it services a **missing** projection
      as readily as a stale one. The sentence arrived in `viewer.js` ungated,
      with a comment asserting the opposite
      (`ISSUE_20260922_the_missing_projection_box_says_not_from_this_page_while_the_rebuild_endpoint_is_live`).
      The two apps are deliberately near-twins, so expect borrowed copy — and
      check the borrowed *reason* against the receiving app's capabilities, not
      just the words.

- [ ] **A lesson's "measured, not proposed" mutation claim still decays —
      re-run the tier, don't transcribe on faith.** New 2026-09-22
      (`mutation_witness_enrollment_backlog`), transcribing 26 rows two
      lessons had each verified by hand-planting the mutation before writing
      the row down. **4 of 26 (15%) did not reproduce** 3-4 days later, on
      four different causes: a check that scans `Object.keys()` on a flat
      string map and has never scanned anything but single characters
      (never worked, the plant just happened to look right the first time);
      a census scoped to a page the marked element has never rendered on
      (coverage assumption that stopped holding, or never held); a CSS clamp
      already superseded by an outcome check the same day it was measured;
      and an `expect_red` that resolves to two identical-string branches in
      one file, which pytest's own pairing test structurally cannot accept.
      Three of the four surfaced only by actually running
      `node scripts/run_mutation_witness_tests.mjs` with the row staged, not
      by re-reading the lesson's prose. Independently reproduced in review:
      70/73 pre-merge, 93/96 post-merge, exactly the counts the lesson
      claimed. Ask of any handoff transcribing a lesson's mutation table:
      *was this row re-planted against today's tree, or copied off a table
      written against one three days old?*
- [ ] **`[annotate rail filter + face deselect]`'s "a real click on the face
      tints it" sub-check is flaky, not red.** Confirmed 2026-09-22
      (`mutation_witness_enrollment_backlog` review): a full browser-tier run
      landed 24/25 with this sub-check failing; `--only "annotate rail
      filter"` immediately after passed 30/30. Root cause is pre-existing and
      already filed —
      `ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`:
      the `?mock=1` demo triangle is edge-on to its framing camera, so a ray
      at its centroid lands a hit or a miss depending on whether the
      projected coordinate rounds to `0` or `1.3e-16`. If this sub-check is
      the only red in an otherwise-clean browser tier, re-run it with
      `--only` before treating it as a regression.
- [ ] **A `push()` LABEL that dereferences the very thing its condition
      guards.** New 2026-09-22 (`viewer_nav_verdict_into_alert_and_icon`), and
      a fresh instance of the 1180-line-`try` entry above rather than a new
      class. `push(\`… (${shapes[0].w}x${shapes[0].h}px)\`, shapes.length >= 1
      && …)` — the author knew `shapes` could be empty, guarded the
      *condition*, and left the **label** to throw first: template literals are
      evaluated as arguments, so in exactly the case the check exists for (no
      mark on the rail at all) the block died on
      `Cannot read properties of undefined` and took the three sub-checks below
      it with it. Measured by planting it: 2 sub-checks reported and the tier
      `ABORTED`, versus 5 reported after a one-line default. **Read every
      interpolation in a check's own label as if the check had just failed** —
      a `[0]`, a `.length` on a maybe-null, a `JSON.parse` — because that is
      the only run where the label matters. Fixed inline in review; the sibling
      shape to watch for in the same diffs is a
      `filter(...).length === 0` assertion that passes **vacuously** on the
      empty collection (the border/radius check beside this one still does).
- [ ] **…and the "printing is not asserting" entry reached its SECOND sighting,
      inside a README that IS scanned.** Same handoff: `apps/viewer/README.md`
      gained "11 amber and 10 red across the 21 studies … pinned in
      `tests.js`", where both tiers assert only `>= 1` of each and *print* the
      split in a label
      (`ISSUE_20260922_the_viewer_readme_states_a_live_nav_tally_that_only_a_
      label_prints`). The refinement over the 2026-09-21 entry: that one turned
      on `apps/annotate/README.md` having **no** scanner. This one has one —
      `tests/test_viewer_readme_doc_facts.py` — and it is two regexes wide, so
      "the README is guarded" is not "this sentence is guarded". Resolve the
      claim to the specific `_*_CLAIM` pattern that would read it, or say it is
      unpaired.

## Architectural errors to check

- [ ] **Two readers of one input file, one strict and one tolerant.** New
      2026-09-15 (`viewer_study_verdicts_and_gaps`). Both projection builders
      read `hardware_entries.json`; `build_viewer_projection.build()` raises on
      a wrong `schema`, the new `build_topology_projection.load_hardware()`
      reads `entries` off whatever JSON is there. Tolerating an **absent**
      register is argued and documented; tolerating a **present but
      unreadable** one silently turns every `hardware_entry` gap row -- the
      largest single kind in that list -- into "nothing is missing" on the one
      page whose job is to say what is. When a diff adds a
      second reader for an existing file, diff the two loaders' refusals, not
      just their happy paths.
      (`ISSUE_20260915_topology_builder_drops_the_hardware_register_schema_check`.)
      **Closed 2026-09-16** by `python_value_and_schema_pins`, which gave
      `load_hardware` the same `SCHEMA_HARDWARE` gate and a test pinning it; the
      entry stays for the *shape*. Two notes from that review: the counts this
      entry and the issue both quoted (43 of 98) were already stale when the fix
      landed -- they are 53 of 104 today -- which is why neither this entry nor
      the code's docstring states them any more; and the register is
      `docs/tolerance_stacks/hardware_entries.json`, **tracked**, not the
      gitignored `data/` path the issue and the handoff both named.

- [ ] **`fold()` is the only arithmetic.** No second code path for checks — paths
      and checks are the same signed term list. And `fold()` reads `min`/`max`
      only: it must never read `lmc`/`mmc`. Since 2026-08-05 the precise invariant
      is **one place where element *values* get combined**: an archetype layer may
      compute per-term *weights* (`thermal.py` computes soak factors, `2k`, `1−k`)
      and may not combine two element values. Check that any new layer respects
      that line, and that `Term.coefficient` is still `> 0` — direction lives in
      `sign`, and a negative coefficient would give a sign error two places to
      hide. **Since `thermal_exception_declared` (2026-09-01) the invariant is
      stated conditionally and the exceptions are a list, not prose**: nothing
      outside `fold()` combines two element values *except* the sites on
      `DECLARED_COMBINING_EXCEPTIONS` (`tests/test_thermal_exception_list.py`),
      today `workbook_corner()` alone — the one sanctioned reader of `lmc`/`mmc`,
      which reproduces a source spreadsheet's coherent corner as a single-valued
      point a fold cannot express. That resolved
      `ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`,
      which sat open for a month because `ARCHITECTURE.md` asserted both the
      unqualified "never combines" and the exception, in two sections, and
      nothing was red. So do **not** review those three sentences by eye: the
      walker pairs the list against the sites it finds in `thermal.py` and
      against the passages **registered in `RULE_PASSAGES`** — ARCHITECTURE.md's
      rule section, the module docstring, `ARCHETYPE_thermal_fit.md` — and
      against each exception's docstring, with every extraction whitespace-
      flattened so a reflow cannot unguard it. Watch it fail before you trust
      it; the cheap replay is `git show 11367fc^:<a registered passage>` over the
      live file, which reddens that passage's parametrization by `LookupError`.
      Three things are left for you.
      - **Whether a *newly listed* exception really is a single-valued reading**
        rather than a second combiner someone found it easier to declare than to
        fold, and whether its docstring makes that argument. A test can check
        that an exception is declared, argued and consistently named; never that
        it is right.
      - **`RULE_PASSAGES` is a hand-kept dict of three**, so a passage outside it
        is not merely unpaired but invisible — and four more live passages stated
        the *absolute* form when the review searched for the rule's own words
        rather than following the passages the handoff named
        (`ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`).
        There are two phrasing families and no single phrase: the registered ones
        say *"combines two element values"*, the others *"the only place element
        values are combined"*. Search both, **whitespace-flattened**, over every
        tracked `.md`/`.py` — one of the four was line-wrapped between `place`
        and `where` and sat *inside* the section the test reads.
      - **The walker's blind spots, which are the silent direction.** Taint is
        per-function, so a module-level helper taking a `StackElement` and
        returning a combination is caught inside itself, not at its call site.
        Operator-free spellings are recognised **by call name** out of
        `AGGREGATING_CALLS` (widened in review 2026-09-02: `operator.sub` and
        `math.prod` were both silent misses until then; `functools.reduce` still
        is). Probe a new spelling with `combining_sites("<3 lines of source>",
        FIELDS_FOR_SYNTHETIC)` — it costs one call and the miss is quiet.
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
      (`Math.max(8, Math.min(...))`) is CSS pixels, not a tolerance. (`app.js`
      itself is deleted since `viewer_v2_single_nav`; the clamp class lives on
      in layout code.) **One declared exemption since 2026-09-10
      (`viewer_edge_length_scaling`):** `VA.edgeLengthValue` +
      `VA.rowPositions` (`topology.js`) read `dimension.max − min` /
      `2 × plus_minus` / `nominal` to scale a bar's LENGTH — the handoff
      mandated it, and it is screen-proportion arithmetic in the popover-clamp
      class, not a combiner. What keeps it in that class, and what you check
      if a diff touches it or adds a sibling: the value feeds pixel geometry
      only — it is **never printed, never rounded into a display string, and
      never compared to produce a verdict** — and a floored bar is visibly
      marked so the length cannot be read as a measurement. A new consumer of
      `edgeLengthValue` (or new arithmetic on a dimension field) that formats,
      prints or branches a verdict on the result is the second combiner this
      entry exists to refuse.
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
      nothing can explain, and on finding no value at all` still covers every row —
      a guard whose `known` accepts anything is documentation, which is precisely
      the state `VA.CROP_RULES` was in for the four days the original bug shipped.
      That test replays **both** arms of the shared `unexplainedValues` per row
      (2026-09-15, `viewer_value_guard_rows_and_replays`): the unknown value, and
      the **collector that comes back empty**, which is the arm a renamed builder
      key or a reshaped `crops.json` trips and the one a bite test forgets. The
      topology table's companion is the same shape and the same helper.
      And know the tier's reach: it
      reads **live data only**, so a value that exists only in `fixtures.js`
      (`values_status: "not_transcribed"`, `export.status: "unestablished"`) is
      unguarded by it by construction.
      **Second sighting (`check_completeness_schema`, 2026-08-13), on a table
      added in the same commit** — so the "did a producer drift?" trigger never
      fires, and the miss is the *fallback*, not the table.
      `VA.VERDICT_SCOPES` landed with the table, the `[real]` `VALUE_GUARDS` row
      and the `known:` self-syncing form all correct, and
      `VA.VERDICT_SCOPES[check.verdict_scope] || {}` — silence — where its three
      siblings (`CROP_RULES`, `EXPORT_STATUSES`, `VALUES_STATUSES`) each have a
      loud `VA.unlabelled*Text`. Fixed inline. Two things it teaches: **a new
      projection field's reachable unknown value is `undefined`, not a new
      vocabulary word**, because nothing rebuilds `data/projections/viewer/` and
      a projection built before the field existed simply has no key — the
      handoff's own lesson records hitting exactly that (`118/121` until it
      rebuilt); and the `[real]` guard is not a substitute for the fallback,
      because it only speaks when someone runs the JS suite against fresh data,
      whereas the reader opening a stale viewer gets the misreading in silence.
      **Count the `unlabelled*Text` functions against the tables** — they should
      pair one-to-one.
      **Third sighting (`annotate_affordances_flyout_and_mesh_gating`,
      2026-09-14), and this time the new field joined no guard at all.**
      `topologies[].parts[].mesh.installed` decides whether EVERY 3D affordance
      renders, and `TOPO_VALUE_GUARDS` (eight rows) got no row for it — so the
      builder silently ceasing to write the block is unobserved, which is the
      arm that row's `values()` collector exists for ("no live value found").
      Worse in the same place: `VA.partMeshFact` reads an **absent** `mesh` key
      and `{"installed": false}` as the same silent state, and the absent one is
      reachable today, because nothing rebuilds the projection and every
      pre-merge `topologies.json` has no such key. That is the
      `VA.VERDICT_SCOPES` fallback miss verbatim, one field later. Ask of any new
      projection field: **which `*_VALUE_GUARDS` table does it join, and what
      does the page say when the key is simply absent?**
      `ISSUE_20260914_mesh_fact_has_no_value_guard_row_and_an_absent_block_is_silent.md`.
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
- [ ] **`CLAUDE.md` is tracked** (since 2026-09-01, handoff `claude_md_tracked`;
      it was gitignored before, and this item asked you to check that durable
      facts had been mirrored out of it — that mirroring rule is retired). Read it
      in the diff like any other live document. What it is: orientation and
      pointers, and it may now hold a durable fact on its own. What it is not: a
      second copy of `README.md` or `ARCHITECTURE.md`, and not a home for a
      quantity that a test reads from somewhere else — a number restated here is
      a number nothing recounts.

- [ ] **A study/traversal error that escapes the module's own error base
      class.** New 2026-09-01 (`dag_topology_format`). `topology.py` documents
      `StudyError` and its four subclasses as what a consumer catches and renders
      — and the viewer handoff is told exactly that — but the three id lookups a
      study document drives (`selection`, `closes`, the `transforms` map) went
      through `Topology.edge()`/`transform()`, which raise a bare `KeyError`
      naming only the topology. So the **likeliest** authoring slip, a typo'd
      edge id, was the one error arriving unhandled and without the study's name.
      Fixed inline (`_edge_named_by`, pinned by
      `test_a_study_naming_an_id_its_topology_lacks_raises_a_study_error`). Ask
      it of any new module that defines an error hierarchy: **enumerate the ways
      a document can be wrong and check each one arrives as the documented
      class**, not just the ones the author wrote a test for.
- [ ] **A per-row display that re-implements `fold()`'s convention.** New
      2026-09-01 (`dag_topology_format`). `topology.Contribution.nominal/min/max`
      restate, for one term, the rule `fold()` applies to the list — positive
      weight takes `max` to the maximum, negative takes `min` — because a grid
      row has to show what an edge contributed. That is legitimate (it combines
      no two element values, so "Where computation may live" is satisfied), but
      it is a **hand-copy of a convention with nothing pairing it**: change
      `fold` and every row keeps rendering the old rule while the total beside it
      moves. Pinned inline by
      `test_a_contributions_own_numbers_sum_to_the_fold_it_lands_in`. Generalise:
      wherever a reader-facing row is computed outside `fold()`, require an
      assertion that the rows **sum to** the fold they are displayed with.
- [ ] **A citation guard that walks the values and skips the weights.** New
      2026-09-01 (`dag_topology_format`).
      `test_every_value_in_a_topology_carries_a_source_ref` walked edges, which
      is where a length lives — while a `Transform.ratio` multiplies every edge
      that carries it, so an uncited ratio launders further than an uncited band
      does. All four in the tree were correctly `untraced` with `PLACEHOLDER`
      notes; nothing held them there. Guard added inline
      (`test_every_declared_transform_cites_where_its_ratio_came_from`). Same
      question for `thermal.py`'s soak factors and for whatever the next
      archetype's weights are: **the one rule covers coefficients, not just
      values.**
- [ ] **Topologies and studies live in `docs/topologies/`** and are named
      `topology_*.json` / `study_*.json`. That is load-bearing:
      `tests/test_tolerance_stack.py` and `scripts/build_viewer_projection.py`
      both glob `stack_*.json` under `docs/tolerance_stacks/` and would apply
      grip-stack schema hygiene to a topology dropped in beside the stacks.
      `docs/DAG_TOPOLOGY.md` **is** in `live_documents()`, and since 2026-09-03
      (`doc_coverage_sets_derived`) the traced-ratio scanner's stale half walks
      the same corpus, so a retired ratio asserted there is caught now. (That
      half reads `claim_scanned_documents()` since 2026-09-17, which is
      `live_documents()` minus the triage briefs; `docs/DAG_TOPOLOGY.md` is in
      both.)
      This clause read *"the **traced-ratio** scanner does not walk
      `live_documents()` at all … so a stale ratio quoted there is not caught"*
      until then — correct when it was written on 2026-09-01, and the defect
      `ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md` filed. What
      is still scanner-specific is the *shapes* each one knows, not the corpus.

- [ ] **A projection field derived twice, once by the module and once inline.**
      New 2026-09-01 (`dag_viewer_poc`), the `Contribution`/`fold()` entry above
      one level up. `topologies.json` states "this interface is a fork" in two
      fields — `nodes[].branch` (from `Topology.branch_nodes()`) and
      `layout.rows[].branch` (from an inline `len(topology.incident(id)) > 2` in
      `serialize_topology`) — and the page reads a *different one* in each place
      it says so: the grid row's marker from the layout, the preview pane's
      BRANCH POINT chip from the node. Two rules for one claim, agreeing today.
      Routed through `branch_nodes()` inline and pinned over every topology by
      `test_every_fork_mark_is_one_of_the_topologys_own_branch_nodes`. Ask of
      any projection: **which two fields state the same fact, and does one
      compute it?**

- [ ] **Two doc-scan families, two different scopes — check which one you mean.**
      New 2026-09-01 (`claude_md_tracked`), **resolved 2026-09-03**
      (`doc_coverage_sets_derived`) and kept here for the check it teaches. "The
      doc guards read it" was not one claim in this repo: `live_documents()` was
      an `os.walk` (hardware-entry counts, enumerated-state surface lookup) while
      the traced-ratio scan built its own five-entry `live_docs` literal and
      therefore did **not** read `README.md`, `CLAUDE.md` or
      `docs/DAG_TOPOLOGY.md`
      (`ISSUE_20260901_traced_ratio_doc_scan_uses_a_hand_kept_list.md`). Two
      documents asserted the wrong coverage before anyone injected a figure to
      check. There are **two derived corpora and one curated set** as of
      2026-09-17, and telling them apart is the whole of this check:

      * `live_documents()` — the `os.walk`. Read by the coverage guard and by
        the enumerated-state surface lookup, which needs "this README stopped
        being live" to be *loud*.
      * `claim_scanned_documents()` — that walk minus `docs/strategy/BRIEF_*.md`.
        Read by every scan that recounts a claim *shape* against this repo's
        data: hardware-entry counts, the traced-ratio stale half, and the
        one-fold-rule scan in `tests/test_thermal_exception_list.py`. The
        byte-identity scan in `tests/test_provenance.py` makes the same scope
        call through `is_claim_scanned()`, from a `git ls-files` corpus of its
        own (it reads `.py`/`.json`/`.toml` too, not only live documents).
      * `traced_ratio_publishers()` — curated, and stays that way: the
        traced-ratio guard's *other* half is a presence check, and the evidence
        it needs is absent from exactly the file it must catch (the argument is
        written above that function).

      So when work claims a document is now covered by a scan, **inject the
      defect and watch the named test go red** — the hardware-count guard
      firing is not evidence that the traced-ratio guard would, and "it walks
      `live_documents()`" is not evidence that the half you care about does,
      because most of the claim scans no longer walk it.

- [ ] **A tool that summarizes "the" sign/coefficient for an element, where the
      element is referenced by more than one check/path.** New 2026-09-04
      (`stack_export_tabular`; caught in review, **fixed** by `0aa7d54`).
      Nothing stops a hand-authored stack from referencing one element from two
      term lists with different signs, and the `thermal_fit` archetype
      *routinely* does this by construction: `build_checks()` generates one
      check per chain x stage x temperature, and `stage_terms()` gives the same
      sleeve-bore element sign `+1` at stage `hub_to_sleeve` and `-1` at stage
      `sleeve_to_bearing` whenever `0 < k < 1` (true of both seeded chains in
      `hub_bearing_thermal_fit_m1`) — and a **plain, non-thermal** stack can hit
      this too: `pitch_link_to_pitch_plate`'s `clamped_stack_sourced` path is
      added in one check and subtracted in another. A "one row per element,
      first-check-wins" export collapsed both to a single, wrong-by-omission
      sign, and its own docstring/lesson claimed "no seeded stack does this" --
      falsifiable in one command:
      `venv-win/Scripts/python.exe tests/debug_report_thermal_fit.py --terms |
      grep <element_id>`, or just reading a two-check stack's own JSON.
      Generalise: any tool (export, summary view, report) that claims one value
      per element for a field that actually lives on `Term` (sign, coefficient,
      weight) must be checked against a generated-check archetype AND against a
      plain stack whose element is deliberately reused with an opposite sign --
      grepping the seeded thermal_fit stack's element ids through
      `debug_report_thermal_fit.py --terms` is the one-command test for the
      first; reading a path's own JSON against every check that references it
      is the check for the second. Fixed by replacing "first occurrence wins"
      with one row per **distinct** `(sign, coefficient)` an element actually
      enters with (`element_occurrences()` + `group_occurrences()`) -- an
      element every check agrees on still gets one row.
- [ ] **Converting a div-flex grid to a real `<table>` breaks row height, and
      not for one reason.** New 2026-09-04 (`viewer_consolidation`, the
      nominal/min/max column split). A `<tr>`'s inline `height` is a **floor**,
      not a cap — none of `align-items: stretch` / a flex item's forced
      cross-size / `overflow: hidden` on the row carry over to table cells, so
      four independent causes can each push a row past its own pitch: (1) a
      shared button/chip style sized for the old, taller cell; (2) an *empty*
      cell still reserving its font's default line-height "strut" unless the
      row's own `line-height` is set inline (not just `vertical-align:
      middle`, which centres content but does not cap the strut); (3)
      `flex-wrap: wrap` on a cell's inner wrapper, which a fixed-height row has
      nothing to stop; (4) `border-collapse: collapse` (not `separate`)
      double-applying a `td, th` border-bottom that every *other* table in the
      app already carries harmlessly, because none of them sets an inline row
      height for it to fight. The browser alignment tier (`alignmentDrift`,
      `run_viewer_browser_tests.mjs`) is the only thing that catches this — a
      fast-tier DOM-shim test has no real layout to measure. If a future handoff
      converts another div grid to a table, expect to chase more than one of
      these, and re-run the alignment tier after each individual fix, not just
      at the end.

- [ ] **Retiring a page: reflexively filtering the merged view to "only what's
      new" can make an old capability unreachable.** New 2026-09-04
      (`viewer_consolidation`). The tactical agent's first cut of the stack nav
      listed only stacks with no topology (`VA.looseStacks`) — the natural
      reading of "show what the topology page doesn't already cover" — which
      would have hidden the one stack a topology *does* re-express, and that
      stack carries its own authored `checks` verdict the topology projection
      has no field for at all, making it unreachable from anywhere on the
      consolidated page. Caught by the author, before review, by re-deriving
      "does this really drop nothing" from the handoff's own escape-valve
      wording rather than trusting a green test (there was no failing test —
      nothing asserted the covered stack's check was reachable). When a
      handoff merges two surfaces, ask *is there a capability of the retiring
      page whose only path to visibility this filter just removed?* — a green
      suite is not evidence the answer is no.

- [ ] **A new projection writer whose INPUT (not just its output) is a
      gitignored `data/` dir needs `--events-dir`/`--stacks-dir`-style default
      to follow `--data-root`, not `REPO_ROOT`.** New 2026-09-06
      (`annotation_surface_mvp`, blocker). Every earlier projection writer's
      input default is safe to leave `REPO_ROOT`-relative because the input
      lives under tracked `docs/` (identical between a worktree and the main
      checkout) — `build_viewer_projection.py --stacks-dir` is the precedent
      this one was modelled on, and the model doesn't transfer:
      `build_feature_identity_projection.py`'s events live in gitignored
      `data/inbox/feature-identity/`, not identical between the two, exactly
      like its output. So the standard recipe this repo trains every session
      to type (`--data-root <main-checkout-path>`, from a worktree) silently
      read the **worktree's own empty** input dir while writing the output
      into the **main checkout** via `--data-root` — reproduced: `0 stack
      key(s) from 0 event(s)` against a main checkout that had one real event
      sitting in it. Stamped, gated, plausible, wrong.
      `ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`. The
      one-command check: run the script's own documented "from a worktree"
      recipe verbatim, from a worktree, after seeding the main checkout's
      input dir with one real event and leaving the worktree's own copy of
      that dir empty (the ordinary state) — if the printed count is zero, the
      default is wrong. And check for a test that runs `main()`/`rebuild()`
      itself, not just the pure fold functions — this one had 28 tests and
      none of them called the CLI at all, which is how the miss shipped.

- [ ] **A new DAG-topology node/edge that is not wired into the rest of the
      graph breaks a test that asserts connectivity rather than deriving it.**
      New 2026-09-06 (`mechanical_stroke_stack`). `topology_pitch_system.json`
      is asserted `components == 1` by
      `tests/test_topology_projection.py::test_the_number_of_closing_edges_is_the_graphs_cycle_count`
      (the viewer's layout math assumes a single connected component), and
      `tests/test_topology.py` itself is glob-based/per-file and does **not**
      catch a disconnected addition — the assertion that does lives in the
      *other* module, named at the top of this entry. The author caught this by
      running the whole suite, which is how that per-file blindness was found in
      the first place, after a first design gave a new feature two brand-new,
      deliberately unconnected nodes. When a handoff adds a node/edge whose
      other end has no source to tie it to the existing graph, check that it
      reuses an **existing** node (with the approximation this implies named
      explicitly, e.g. in the edge's `properties`) rather than floating a new
      isolated subgraph — and whenever a topology's own connectivity could
      change, run **the named assertion's module**, not the archetype's own test
      module alone: `pytest -q tests/test_topology.py
      tests/test_topology_projection.py`. Now that the assertion has a name the
      whole suite is no longer the only way to reach it, so this costs seconds
      and owes no pre-merge full suite. Expect this
      to recur for the brake-family stack (staged next, same archetype, today
      only `kind: "assumed"` external edges — same shape of gap).

- [ ] **A schema field added specifically to make something renderable, where
      the projection that would render it never calls the function that
      computes it.** New 2026-09-08 (`topology_schema_v1`, should-fix, filed as
      `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`).
      `check_study()`'s no-`limit` branch was built precisely so a study's
      total could carry a verdict "equivalent in power to
      `StackDefinition.checks`" — but `scripts/build_topology_projection.py`
      never imports `check_study`, never calls `study.checks`, and
      `project_study()`'s row has no `"checks"` key at all, in either the
      pre- or post-handoff tree. Contrast `build_viewer_projection.py`'s
      `project_stack`, which calls `stack.check(spec["check_id"])` for every
      entry in `stack.checks` and merges the `CheckResult` into the row. So a
      capability can pass its own acid test (a direct call to the function in
      a test) and still be invisible to every consumer of the projection —
      check, for any handoff that adds a computed/checkable field, whether the
      **projection** actually calls the function that computes it, not just
      whether a test does.
      **Confirmed still open, wider, 2026-09-08 (`linear_stack_conversions`):**
      the 12 new authored `checks` this handoff added (2 on
      `pitch_link_to_pitch_plate`, 9 on `rotor_fastener_length`, 1 on
      `tan_link_to_pitch_plate_take2`) reproduced by re-running
      `scripts/build_topology_projection.py` after this review's merge — every
      study's projected `result` still has no `"checks"` key. Not a new
      finding (the filed issue already generalises to any study's checks), but
      worth knowing before trusting the projection's silence on a check's
      verdict as "there is no check" rather than "the projection cannot show
      one yet."
      **Closed 2026-09-09 (`topology_projection_emits_study_checks`).**
      `project_study()` now calls `check_study(topology, study,
      spec["check_id"])` for every entry in `study.checks` and merges the
      result in, in `project_stack`'s own check shape (confidence scoreboard
      counted off the chain's contributions rather than a term list, since a
      study check has none). Pinned field-for-field against a live
      `check_study()` call on the L1 acid-test study
      (`test_the_l1_studys_projected_check_matches_check_study_field_for_field`).
      Spot-checked against real committed documents (scratch data-root, not
      the shared one): all 12 checks named above now print their
      `check_id=verdict` in the rebuild's console summary. The general
      lesson stands for the *next* schema field this shape applies to — keep
      the checklist item, just don't keep re-checking this specific instance.
      **One side effect worth knowing, not a defect**: adding a projection
      field makes `apps/viewer/topology_fixtures.js`'s hand-maintained
      pairing test (`tests/test_viewer_js_suite.py`) go red the next time
      someone rebuilds the shared main-checkout projection with the new
      code and runs that suite there — exactly the same shape as
      `topology_schema_v1`'s `joint`/`worksheet_file`/`worksheet_source`/
      `configuration` fields, closed separately by
      `tolstack_viewer_js_suite_drift`. Route a `checks`-shaped fixture
      drift there (or its successor issue) rather than treating it as new.

- [ ] **A linear stack whose `checks` mix a named `path` term with
      individually-signed elements has no topology equivalent — verify the
      conversion left it classic-rendered rather than force-building one.**
      New 2026-09-08 (`topology_schema_v1` fenced it, `linear_stack_conversions`
      is the first handoff that had to honour the fence against a real
      candidate). `stack_tan_link_to_pitch_plate.json`'s six checks each
      combine `{"path": "..."}` with signed `{"element": ..., "sign": -1}`
      terms; nothing in `tolerance_stack/topology.py` resolves a named path
      across study documents (paths are a stack-local dict, studies are
      deliberately separate files with no cross-study index), and building
      one would reopen the branch/cycle guard's whole reason to exist —
      composing two independently-authored studies' totals with no check that
      the combination isn't double-counting a shared edge. Verify a candidate
      stack's checks for this shape (a `path` term sitting beside element
      terms) **before** accepting a topology conversion for it; the correct
      outcome is "stays classic-rendered," pinned by a test asserting the
      topology file does *not* exist
      (`test_tan_link_to_pitch_plate_take_1_has_no_topology`), not a
      hand-flattened check that inlines the named path's own terms (which
      would still be arithmetically correct but is no longer authored against
      a reusable path, and quietly drops the fence's own reasoning from view).

- [ ] **A decision rule restated by hand in a second script, where the two
      scripts could import one another but don't.** New 2026-09-08
      (`inline_edge_crops`, should-fix, filed as
      `ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`).
      `build_topology_projection.py::_croppable()` hand-copies
      `build_viewer_crops.py::resolve_pdf`'s rule 1/2 conditions
      (`source_ref.export` / `kind == "spec"`) rather than importing them,
      with nothing pairing the two. It looks unavoidable — one script needs
      PyMuPDF and runs in a different venv — but isn't: `fitz` is imported
      *lazily* specifically so the rule logic stays importable without it.
      Verified today's two copies agree (parametrized test plus a real
      rebuild), but check for this shape whenever a handoff adds a
      filesystem-free "would this resolve" predicate beside an existing
      resolver: **could the predictor import the real rule instead of
      restating it**, given how the resolver's own imports are structured?
      **Resolved 2026-09-09** (`croppable_rule_shared_predicate`):
      `build_viewer_crops.croppable()` is now the one function both
      `resolve_pdf`'s rule 1/2 and `build_topology_projection.py`'s call site
      use (imported there as `_croppable`); confirmed the cross-import still
      does not pull `fitz` into tolstack's stdlib-only venv. Keep this entry —
      the shape (a same-repo predicate restated instead of imported) is worth
      catching again in a different pair of scripts.

- [ ] **The projection DOES emit the field; the viewer just never reads it —
      and a doc still asserts the pre-field state.** New 2026-09-08
      (`viewer_v2_single_nav`, blocker), the mirror image of the entry just
      above. `topology_schema_v1` added `project_topology()`'s `joint` and
      `worksheet_file` (4 of 5 real topologies carry a non-empty `joint`,
      `pitch_system` carries a `worksheet_file`) specifically so the viewer
      handoff could render them — its own baseline note said so in as many
      words ("the projection then carries authored study checks, joint
      blocks, worksheet refs — this page renders them"), and its deliverable
      4 named all three. None of the three render anywhere in topology mode
      (`jointBlock()` exists in `views/stack.js`, stack-mode only; the
      worksheet toggle is explicitly hidden in topology mode), and
      `apps/viewer/README.md` still says *"a topology has no worksheet of
      its own"* — true before `topology_schema_v1`, false since, and this
      handoff's own diff edited that exact paragraph without correcting the
      sentence. Unlike the entry above, this one is **not** blocked by
      out-of-scope projection code for two of its three fields (`joint`,
      `worksheet_file` are already in the projection; only `study.checks`
      genuinely needs the projection-side fix from the entry above) — so
      check, for any handoff told "the projection now carries X, render it,"
      whether the render side actually reads the new field, and grep the
      diff's own doc changes for a sentence describing the field's absence
      that the same handoff's schema baseline just falsified.
- [ ] **A mechanism fact corrected in one doc and left standing in its
      near-verbatim mirror — the fact-rather-than-count variant of "the
      handoff fixed the one guarded copy."** New 2026-09-15
      (`extracted_mesh_alias_rows`). The handoff's own scope line named three
      files, and inside them the author correctly rewrote
      `data/meshes/README.md`'s opening sentence: meshes are no longer only
      `stepgeom.tessellate` output hand-copied from a per-part STEP (22 of the
      24 installed are `stepgeom.assembly` extractions written into this repo
      directly, and have no per-part STEP upstream at all). `ARCHITECTURE.md`'s
      rotorkit bullet carries that same sentence almost word for word and did
      not move; `docs/ANNOTATION_SURFACE.md`'s mesh-format paragraph carries the
      weaker form. No guard forces either — `ARCHITECTURE.md`'s guarded surface
      is its *module inventory*, and surrounding prose is outside every
      quantifier guard here. So when a diff rewrites a **definitional sentence**
      (not a number), grep the tree for its distinctive nouns — here
      `stepgeom.tessellate`, "copies the binary mesh output", "source STEP" —
      rather than only for the digits.
      `ISSUE_20260915_architecture_md_still_says_every_mesh_is_a_tessellated_per_part_step_copy.md`.
- [ ] **Two handoffs from one triage sweep file the same issue, because a
      branch point predates the other's merge.** New 2026-09-15. A repo-wide
      condition — most often *the suite is already red on `integration`* — is
      discovered by whichever handoff runs the full suite first, and every later
      worktree cut from an **older** `integration` sees an issues directory that
      does not contain it yet. Sighted exactly: this handoff filed
      `ISSUE_20260915_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief.md`
      at a branch point of `3141e51` (15:01) for the same brief line as
      `ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_reddens_pytest_on_integration.md`,
      which reached `integration` at 15:22. Not a finding against either author
      — neither could see the other. It lands on **you**, because the merge is
      where the duplicate first exists: before approving an issue about a
      condition that is not specific to this handoff's own diff,
      `git log integration -- docs/issues/` (or just `ls` the merged tree) for a
      sibling filing, and either cross-reference or say in the report which one
      triage should close.
      **Third filing of that same red, same day, and this one had no excuse:**
      `annotate_hosted_page_posture` was cut from `f629942`, an `integration`
      that already carried *both* siblings, so `ls docs/issues/` in its own
      worktree would have shown them -- and it filed a third at a different
      priority (`high` against their `med`). The no-fault reading above applies
      only when the branch point genuinely predates the sibling's merge:
      **check the branch point (`git merge-base`) against the sibling's first
      commit before you decide which it is**, because the two look identical in
      the merged tree and only one of them is a finding against the author.
      Cross-referenced in review rather than deleted -- the newest filing
      carried the priority argument the other two did not.

- [ ] **A guard on a named CONSTANT, where lifting the copy into that constant
      is what moved the assertion away from the defect.** New 2026-09-15
      (`annotate_hosted_page_posture`, should-fix). The fix for "this banner
      renders a terminal command" was the right one -- plain words, and the
      command strings deleted from `config.js` so there is nothing left to
      concatenate -- and the guard asserts (a) the constant's text is clean and
      (b) `AA.CONFIG.rebuild === undefined`. Nothing pairs the constant to the
      one call site that renders it, so restoring the pre-handoff banner as a
      bare string literal in `loadAll()` ships **65/65 green** on the annotate
      fast tier, invisible to pytest (the copy is JS) and to the browser tier
      (no suite reaches a connected folder with no projection). The lift into a
      constant is usually done *so that* a testable tier can read the copy at
      all -- which is exactly what takes the assertion off the surface. Ask of
      any "the copy must not say X" guard: **what fails if the surface stops
      reading the constant?** Where the rendered text is expensive to reach, a
      static scan of the caller for the constant's name is three lines and the
      file is already being read.
      `ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_not_the_
      call_site.md`.

- [ ] **A structured sibling added beside a prose field, paired on PRESENCE
      and not on CONTENT.** New 2026-09-16 (`python_value_and_schema_pins`).
      `joint.assembly_export_ref` (a real `SourceExport`, runs with their `ts`)
      was added beside the prose `joint.assembly_export` that
      `build_viewer_crops._RUN_ID_RE` still parses, deliberately additive and
      with neither derived from the other. The new pairing test asserts only
      that a joint carrying one key carries the other; nothing asserts the two
      **name the same runs**. Measured in review: editing one run id inside
      `stack_rotor_fastener_length.json`'s structured block so it disagrees with
      the sentence three lines above it leaves the suite fully green. Whenever a
      migration keeps the old carrier "for now", ask *what fails when the two
      copies disagree?* -- presence-pairing answers "nothing", and the pin the
      author does write tends to be a single hand-named id on the one stack they
      were thinking about (here, `20260804_114000` on the pitch link only).
      `ISSUE_20260916_the_joint_export_prose_and_structured_run_ids_are_paired_
      on_presence_only.md`.

- [ ] **A swallow-and-report wait helper, `push`ed at one call site and called
      for its side effect at another.** New 2026-09-16
      (`js_guards_and_suite_isolation`, low). The browser tier's idiom for a
      wait that must be *attributable* is to catch the timeout and return a
      boolean, because a thrown timeout takes the suite down as an unnamed
      `ERROR` — a MISS to the mutation tier, not a red
      (`scripts/mutation_witnesses.json`, "ONE THING AN ENTRY CANNOT DECLARE").
      The helper only delivers that if **every** caller pushes the result:
      `testAnnotateFlyout`'s `paneSettled()` is pushed in the mounted half and
      called bare in the `file://` half three lines before the same
      `tr.tvrow[data-id=…]` click, so that half fails in exactly the unnamed way
      the helper's own comment says must not happen. Grep every call of a
      helper that *returns* a verdict instead of throwing one, and check each
      one's result actually reaches a check name.
      `ISSUE_20260916_the_annotate_flyout_settle_wait_is_named_in_one_half_and_
      discarded_in_the_other.md`.

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
