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
  address actually leads there;
- `confidence` is **honest**. Downgrade aggressively:
  - a value from a parts-list part number, with the tolerance band coming from
    somewhere else, is **`inferred`** — not `traced`;
  - a value whose only support is "the source workbook says so" is
    **`untraced`** — no matter how reasonable it looks;
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

Then check that every `untraced` value appears in the stack's **explicitly listed
gaps**. An `untraced` value not listed as a gap is a violation of the SOP's one
rule — the stack is claiming completeness it does not have.

For calibration: slice 1 traced **1 of 17**, and reporting that plainly was the
most valuable thing it produced. A stack claiming a much better ratio deserves
proportionally more scrutiny per `traced` value, not less. **A high traced count
is a reason to audit harder, not a reason to relax** — it is what an invented
number looks like from the outside.

---

## Also verify

- **Tests.** `venv-win\Scripts\python.exe -m pytest -q` green, and re-run it
  yourself rather than trusting the report. New source-derived numbers carry the
  source cell reference in a comment (`# JEFF E18`), which is what makes the suite
  a transcription check rather than a self-consistency check. A new stack with no
  new tests pinning its numbers is incomplete.
- **The re-derivation table** covers every result cell the source computes, at
  full precision. Deltas ~1e-15 are float summation order. Anything larger is a
  real disagreement that must be a recorded finding, not a rounded-away one.
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
  Eight of the nine inline entries are workbook transcriptions, so this is the
  common case, not the exotic one.
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
  one-way.

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
- [ ] **`data/inbox/*` silently drops per-stream tracked docs.** Git does not
      descend into an excluded directory, so `!data/inbox/<s>/README.md` alone does
      nothing — re-include the directory, exclude its contents, *then* negate the
      doc. Verify with `git check-ignore -v <path>` and `git ls-files data/`, never
      by eye.
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
      this repo. When a doc asserts anything about the crop or results
      projection, recompute it from `data/projections/viewer/*.json` — never from
      the prose, and never from another doc's copy of the number.
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
      check all three, not two.
- [ ] **Documents cited from a worktree that cannot see them.** `data/` is
      gitignored, so `data/inbox/specs/` in a worktree holds one tracked
      `README.md` and nothing else — the pile (several dozen files, and growing;
      count it rather than quoting a number) exists only in the main checkout at
      `C:\workspace\tolstack\data\inbox\specs\`. Check 1 tells you a
      citation to a missing document is worse than none; an `ls` in your own cwd
      will manufacture exactly that finding for every correctly-cited spec in the
      stack. **Read the pile in the main checkout.** Same for
      `data/inbox/tolerance_stacks/`.
- [ ] **A "byte-identical" PROVENANCE row read as a freeze.** `PROVENANCE.md`
      declares ten imported files byte-identical, but the SOP *requires* changing
      three of them for every new stack (`hardware_entries.json` Step 4,
      `tests/test_tolerance_stack.py` Step 7, `docs/tolerance_stacks/README.md`).
      Sighted in `pitch_link_stack`, which changed all three plus a comment in
      `tolerance_stack/stack.py` and amended nothing, leaving PROVENANCE making
      three false claims. Diff every path PROVENANCE calls byte-identical against
      the branch (`git diff master..handoff/<slug> --name-only`) and check the
      Amended column moved in the same commit. **Second sighting
      (`spec_library_v0`)**, and it moved to a row nobody watches: adding
      `spec_library.py` to the package meant re-exporting it from
      `tolerance_stack/__init__.py`, whose row still read "no — byte-identical".
      The three SOP-mandated files get remembered; the *package* files do not.
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
- [ ] **`INCOMPLETE` is a prose convention, not a schema field.**
      `build_viewer_projection.is_incomplete` greps the check's
      `label`/`guidance`/`check_id` for the literal upper-case string. A stack
      that writes "incomplete", "PARTIAL" or "budget only" renders as an ordinary
      failing check — losing exactly the "this is a budget, not a verdict on the
      joint" warning the SOP's Step 5c exists to carry. When reviewing a stack
      with an excluded term, check the authored string, and check that
      `configuration.excluded` and the INCOMPLETE label agree (nothing validates
      the pairing —
      `docs/issues/ISSUE_20260805_check_result_has_no_complete_flag.md`).

## Architectural errors to check

- [ ] **`fold()` is the only arithmetic.** No second code path for checks — paths
      and checks are the same signed term list. And `fold()` reads `min`/`max`
      only: it must never read `lmc`/`mmc`. **Since `stack_viewer_v0` this
      extends to JavaScript.** `apps/viewer/` renders `results.json` and computes
      nothing: no `+`, `-`, comparison-of-tolerances, `toFixed` or verdict logic
      anywhere under `apps/viewer/`. Rounding happens once, in
      `build_viewer_projection.py` (`INTERVAL_DECIMALS`), and `VA.fmt` is
      `String(n)` on purpose. Grep any viewer diff for arithmetic operators on a
      projection field — a second fold in JS is a second line where a sign can be
      wrong, and it would be in the language nothing in `tests/` executes.
- [ ] **`check_result` is produced, never stored.** A committed verdict goes stale
      the moment an element changes and nothing notices.
- [ ] **Do not edit a file `PROVENANCE.md` claims is byte-identical.** Ten
      imported files carry that claim (verify with `sha256sum` against
      drawing-checker). If one genuinely must change, the amendment goes in
      PROVENANCE's Amended column in the same commit — otherwise the provenance
      record is now false, which in this repo is the worst class of defect.
- [ ] **drawing-checker is read-only and one-way.** Nothing here writes there.
      **`git status` there does not prove it** — `data/runs/*` and
      `data/inbox/*` are gitignored, so a session that ran the pipeline, added a
      run, or dropped in a PDF leaves that repo's status completely clean and the
      check passes vacuously (`docs/issues/ISSUE_20260804_drawing_checker_readonly_check_has_no_teeth.md`).
      Until that issue is closed: if the work **cites** a run, check the run
      directory's mtime and its `run_meta.json` `ts` against the session's own
      commit dates, and check `purpose` / `pipeline_commit` — a `"purpose": "test"`
      run with a `+dirty` commit during a drawing-checker session is theirs, not
      the stack author's.
- [ ] **`data/inbox/specs/` is append-only.** No renames, no de-duplication, no
      tidying — check the diff *and* the filesystem.
- [ ] **`docs/reference/` is verbatim imports.** No edits beyond the import
      header. If imported reference and this repo's docs disagree, the repo's docs
      change and the divergence goes in a lesson.
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
