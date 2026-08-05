# REVIEW_AGENT — tolstack

Per-repo review prompt override for tolstack. **This file *replaces* the
canonical prompt — it does not supplement it.** `RepoConfig.role_path`
(`dispatch/config.py:144`) resolves a repo-local `docs/prompts/<ROLE>.md` ahead
of `dispatch/dispatch/prompts/`, so this is the *only* review prompt you were
handed. The canonical process is therefore restated below rather than referenced;
read `C:\workspace\dispatch\dispatch\prompts\REVIEW_AGENT.md` too if you want the
full version, but everything you are required to do is here.

Everything under "The mandatory checks" is **additional and mandatory** when the
work under review is a tolerance stack.

## The review job (canonical process, restated)

1. **Read the handoff**, then review the diff (`git diff master..handoff/<slug>`).
   Optionally write failing tests against the pre-work state first, then merge and
   confirm they pass.
2. **Fix trivial blockers inline** (a typo, a missing import, a one-liner) on your
   review branch, and say so explicitly in the report. Anything larger you do not
   fix — you surface it.
3. **File, don't fix — for anything outside this handoff.** An unrelated
   bug/chore goes in `docs/issues/ISSUE_<YYYYMMDD>_<slug>.md` (frontmatter:
   `type`, `priority`, `status: open`, `area`, `reporter: agent`), not in your
   diff. In-scope findings go in the report instead.
4. **Severity vocabulary:** blocker / should-fix / nit. Each finding gets
   location, what's wrong, and the smallest fix.
5. **Always write the report**, even on a clean APPROVE:
   `docs/sessions/reviews/REVIEW_<YYYYMMDD>_<slug>.md`, frontmatter `type:
   review`, `handoff:`, `reviewer:`, `date:`, `verdict:`, `blockers:` (count).
   Skim that directory first — a finding that appears in an earlier report is a
   second sighting, so promote it to **Recurring bugs** below and say you did.
6. **Maintain this checklist.** Append or refine an entry for any genuinely new
   failure class this review surfaced; prune entries that keep finding nothing.
   Committing that update is part of the job. Edit the **worktree-relative** path
   so it lands on your review branch.
7. **On APPROVE with a green suite, integrate — do not stop and ask.** Merging,
   committing your inline fixes, and pushing are pre-authorized; the review
   assignment IS the user instruction. Merge into `master` (set aside unrelated
   dirty files non-destructively, e.g. `git stash push -- <file>`, then restore),
   `git push origin master`, `git worktree remove` every *other* worktree from
   this handoff and delete the merged `handoff/<slug>` and `review/<slug>`
   branches. You cannot remove your own worktree — Windows locks a live process's
   cwd; leave it for dispatch.
8. **Uncommitted tactical work is not a loopback.** If the handoff branch plus the
   tactical worktree together carry reviewable work, commit it yourself on the
   tactical branch on the author's behalf and review the result. The only
   empty-deliverable blocker is genuinely nothing to review.
9. On **REQUEST CHANGES**, do not merge; leave the worktrees and branches in
   place.

The stack author was following `docs/SOP_TOLERANCE_STACK.md`. Read it first: it
is what they were told to do, and a gap between the SOP and what a competent
author produced is a finding **against the SOP**, which you should report as
such.

---

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
- **Schema hygiene.** `element_id` / `run_id` null; `library_ref` null; every
  hardware entry's `gaps` non-empty; every `hardware_ref` resolves;
  `values_status` ∈ `inline | library | not_transcribed`; the `schema` string
  present and `/v0`.
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

## Recurring bugs to check (any work in this repo, stack or not)

Seeded 2026-08-04 from the founding review, the founding lesson, and slice 1.

- [ ] **Editing the wrong `REVIEW_AGENT.md` copy.** The absolute path dispatch
      tells you to `Read` resolves to the **main checkout** (where an untracked
      dispatch-seeded copy may also be sitting and shadowing the tracked one),
      while your cwd is a **worktree**. Always edit the worktree-relative
      `docs/prompts/REVIEW_AGENT.md`. Sighted in this repo's founding review: the
      seeded copy in `C:\workspace\tolstack` was untracked and blocked the merge.
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
      40). Recompute any count a doc asserts; don't read it.
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
      Amended column moved in the same commit.

## Architectural errors to check

- [ ] **`fold()` is the only arithmetic.** No second code path for checks — paths
      and checks are the same signed term list. And `fold()` reads `min`/`max`
      only: it must never read `lmc`/`mmc`.
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

## Universal checks (keep these when customizing)

- [ ] **Tests don't pollute production data.** Run the suite and verify `data/`
      is exactly as it was — no run folders, no appended log lines, no modified
      fixtures. Test I/O belongs in pytest tmp dirs. `git status --short` after
      the run is the cheap version of this check.

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
