---
type: review
handoff: HANDOFF_20260803_tolstack_founding
reviewer: review agent (claude, review/tolstack_founding)
date: 2026-08-04
verdict: APPROVE
blockers: 0
---

# REVIEW — tolstack_founding

First review in this repo, and the first entry in `docs/sessions/reviews/`. The
repo-local checklist did not exist when I started (it is itself deliverable 5 of
the work under review), so I applied the canonical checklist plus the handoff's
own definition of done, and **seeded** this repo's `Recurring bugs` /
`Architectural errors` / `Universal checks` sections before finishing — see
"Checklist maintenance" below. The review was not shallow: every factual claim in
the deliverables was independently recomputed or re-verified against the source
repo.

Reviewed `master..handoff/tolstack_founding` — 6 commits, 30 files, +4392/−21.

## What I verified

**Pre-work state.** On `master` the review worktree has no `tolerance_stack/`
package, no `docs/SOP_TOLERANCE_STACK.md`, no `docs/prompts/REVIEW_AGENT.md`, and
no venv — i.e. the suite cannot pass before the merge. Merged
`handoff/tolstack_founding` (fast-forward to `bbd794d`) and re-verified below.

**Tests (re-run, not trusted).** Cold `setup.ps1` in a fresh review worktree, then
`venv-win\Scripts\python.exe -m pytest -q` → **34 passed**, first run, no edits to
the test file. Also 34 passed in the tactical worktree. `git status --short` clean
after both runs — **no data pollution** (universal check).

**Re-derivation.** `debug_report_tolerance_stacks.py --compare` → **27 cells
compared, largest delta 6.439e-15** (float summation order, as documented). The
import preserved the numbers, not just the files.

**`forge check` OK** on the main checkout *and* on the worktree — I checked both,
because the founding lesson documents that the main checkout can pass while the
branch does not.

**Provenance, independently checked against drawing-checker.** All 10
byte-identical claims verified by `sha256sum` against
`C:\workspace\drawing-checker` (three `stack_*.json`, `hardware_entries.json`,
both `WORKSHEET_*.md`, `tolerance_stack/{__init__,stack}.py`,
`tests/test_tolerance_stack.py`, `tests/__init__.py`) — all **SAME**. Workbook
sha256 `51b6c536…cd6fd1` matches `PROVENANCE.md` exactly.
**drawing-checker has no committed changes** and its working tree carries only
pre-existing untracked entries — the read-only, one-way dependency held.

**The specs move.** `C:\workspace\tolstack\data\inbox\specs\` holds **42 files,
111,575,456 bytes** — matching the recorded count and byte total on both sides.
`MOVED_TO_TOLSTACK.txt` breadcrumb present in the old location, one line, with
count and destination. `NAS6403-NAS6420 Rev 4.pdf` really is in there, as the
lesson claims (slice 1's #1 blocking gap).

**`.gitignore` per-stream exceptions work as intended.** `git check-ignore`
confirms `data/inbox/specs/README.md` is *not* ignored, and `git ls-files data/`
tracks exactly the four intended skeleton/doc files while the 42-file pile stays
out.

**Every number the docs quote as calibration, recomputed from the JSON:**

| doc claim | computed | |
|---|---|---|
| `threads_in_bore__13` −0.366 WC vs −0.0295 RSS | wc_min −0.3660, rss_min −0.0295 | ✓ |
| `shank_out__14_thick` nominal −0.7153, RSS center −0.077 | −0.7153, −0.0773 | ✓ |
| VPA nominal −0.0824 while WC straddles zero | −0.0824, wc [−0.6366, +0.6532] | ✓ |
| bushing chamfer LMC 0.889 > MMC 0.635, subtracted | lmc 0.889, mmc 0.635, `role: relief`, `sign: -1` | ✓ |
| take-2 nut minor dia MMC 4.05 < LMC 4.25, internal | mmc 4.05, lmc 4.25 | ✓ |

**Every invariant the SOP and the checklist promise is actually pinned by a
test** — `source_ref` + valid `confidence`, `element_id`/`run_id` null,
`library_ref` null + non-empty `gaps`, every `hardware_ref` resolves, nut geometry
transcribed-but-unused, `[NOT IN WORKBOOK]` on the added checks, chamfer
subtracted not added.

**Code invariants read directly:** `fold()` (`tolerance_stack/stack.py:184`) reads
`nominal`/`min`/`max` only and never `lmc`/`mmc`; `CheckResult.verdict`
(`:221`) reads `interval.min` and `interval.nominal` only and cannot see RSS.
Both match what the SOP, ARCHITECTURE.md, and the checklist claim.

**SOP API claims, checked against the code** (a cold-read SOP that names a wrong
API breaks its first consumer): `load_stack` is exported from the package,
`all_checks()` exists (`stack.py:313`), `debug_report_tolerance_stacks.py
--compare` and `debug_trace_stack_values.py --pattern` both exist. All correct.

**Deliverables against the handoff.** All five present. Deliverable 4's six named
must-cover items and deliverable 5's seven named checks are all present and, in
several cases, sharpened beyond the handoff's wording (the review framed as a
provenance audit; passes must be reported; a high traced ratio means audit
harder). `docs/issues/.gitkeep` added; handoff moved to `completed/`; lesson
written with file inventory, what did *not* make the SOP and why, and the
template-stamp gaps. Durable CLAUDE.md facts are mirrored into README.md and
ARCHITECTURE.md as instructed.

## Findings

### should-fix — fixed inline by me (3)

All three are one-to-few-line documentation fixes on `review/tolstack_founding`;
none touch code.

1. **`docs/prompts/REVIEW_AGENT.md` silently dropped the canonical review
   process.** The file opened by telling the reader to "follow the canonical
   prompt's process" — but `RepoConfig.role_path` (`dispatch/config.py:144-157`)
   resolves a repo-local `docs/prompts/<ROLE>.md` **ahead of** the canonical one,
   so a repo-local copy *replaces* it and the next tolstack reviewer would never
   be handed the process it defers to. Lost with it: **integrate-on-APPROVE
   (merge/push/worktree cleanup)**, the report frontmatter spec, the
   file-don't-fix issue policy, the blocker/should-fix/nit vocabulary, the
   uncommitted-work-is-not-a-loopback rule, and the checklist-maintenance duty.
   The practical symptom would be a future review stopping at "APPROVE" and
   leaving Jeff to merge by hand. **Fixed:** added a "The review job (canonical
   process, restated)" section carrying all of it, and corrected the intro to say
   plainly that this file replaces rather than supplements. Not a blocker against
   the author — the handoff named that exact path, and the collision is a dispatch
   mechanism the author had no mandate to change.

2. **SOP's `role` vocabulary omitted `nut_geometry`** (`docs/SOP_TOLERANCE_STACK.md`,
   Step 2). The SOP tells a cold author "`role` is one of" seven values; the seeded
   take-2 — which the SOP itself points at as the worked example for the
   castellated-nut caveat — uses `nut_geometry` three times. An author following
   the list would either invent a role or wrongly force a nut dimension into
   `fastener`. **Fixed** in the SOP only: `stack.py:101`'s comment carries the same
   stale list, but that file is one of the ten `PROVENANCE.md` declares
   byte-identical, so editing it would falsify the provenance record for a comment.
   Noted in the SOP instead ("the seeded data is authoritative").

3. **SOP Step 7 told the author to `forge check` the main checkout** —
   `C:\workspace\tolstack` — which is exactly the false pass the founding lesson
   documents two sections later (`docs/issues/` is created by `dispatch init` in
   the main checkout only, so it can conform while the branch does not).
   **Fixed:** points at the worktree now, with the `cd C:\workspace\forge` the
   lesson found necessary and one line on why.

### nits (3, not fixed)

4. **Stale inventory numbers in the lesson.** `LESSONS_20260803_tolstack_founding.md`
   claims the SOP is 467 lines (it shipped at 509) and "39 tracked files" (40).
   Commit `bbd794d` landed after the lesson was written. Harmless, but this repo's
   ethos is that asserted numbers are checkable, and these two are not.

5. **Provenance date vs sha date.** `PROVENANCE.md` records the move as
   2026-08-03 and drawing-checker's `master` "at time of copy" as `0743640`, dated
   2026-08-04; the lesson header says the session was worked 2026-08-04. The sha is
   master-at-time-of-writing, not strictly at-time-of-copy. The substance is fine —
   I verified the imported bytes against that tree — but in a provenance record the
   two dates should agree or say why they don't.

6. **`data/inbox/specs/` was untracked in drawing-checker, not gitignored.** The
   author caught this and recorded it in both `PROVENANCE.md` and the lesson,
   correcting the handoff's own wording. Noted here only so the correction isn't
   lost: no drawing-checker commit was involved either way, so the move stayed in
   scope.

### Not a finding, worth flagging to strategy

The **worktree / `data/` tension** the lesson raises is real and outside this
handoff: a stack author works in a worktree whose `data/` is empty of the very
specs they must cite, while `ops.toml` says data lives only in the main checkout.
Every future tolstack session hits it. The lesson already routes this to strategy;
I did not file an issue because it is a convention question, not a defect.

Also: **`C:\workspace\tolstack` still needs `setup.ps1` run once** — its `venv-win`
does not exist. The lesson says so; repeating it here because it is the first
thing that will bite.

## Checklist maintenance

Seeded this repo's `docs/prompts/REVIEW_AGENT.md` with three new sections beyond
the author's seven stack checks: **Recurring bugs** (6 entries — wrong
`REVIEW_AGENT.md` copy, `forge check` main-vs-worktree, `data/inbox/*` dropping
tracked docs, surviving `{{REPO_NAME}}`, stale asserted counts, documented
vocabularies drifting from seeded data), **Architectural errors** (7 — one
`fold()`, `check_result` never stored, don't edit a byte-identical file without
amending PROVENANCE, drawing-checker read-only, specs append-only,
`docs/reference/` verbatim, CLAUDE.md mirroring), and the **Universal checks**
data-pollution entry. Every entry came from something this review or the founding
lesson actually hit — no placeholders.

The canonical checklist's one existing entry (editing the wrong `REVIEW_AGENT.md`
copy) got a **second sighting** here and is carried over with the new evidence: the
dispatch-seeded untracked copy in `C:\workspace\tolstack\docs\prompts\` is the file
the absolute path in my launch seed resolved to, and it physically blocked the
merge into `master` until set aside.

## Integration notes

Merged `review/tolstack_founding` into `master` fast-forward (`4db9f7d`). Two
things in the main checkout blocked it and were set aside **non-destructively**,
not discarded:

- an **unrelated uncommitted `.gitignore` edit** (`.dispatch/` + a `data/*`
  blanket) — `git stash push -- .gitignore`, merged, then `git stash pop`, which
  auto-merged cleanly. It is back in the working tree exactly as found.
- the **untracked dispatch-seeded `docs/prompts/REVIEW_AGENT.md`**, which occupied
  the path the branch adds as a tracked file. Moved aside (a copy is preserved in
  this session's scratchpad) so the repo's own checklist — the deliverable — is
  what now lives there. It should not be restored: that is the whole point of the
  per-repo override.

**The push failed: tolstack has no git remote at all** (`git remote -v` is empty),
so the merge exists on this machine only. Not blocking the rest of the cleanup, per
the review process, but filed as
`docs/issues/ISSUE_20260804_tolstack_has_no_git_remote.md` — the repo was founded
after the "every repo has a GitHub remote" convention took effect and `forge check`
does not look for one.

That restored `.gitignore` edit interacts badly with `c951a82` and is filed as
`docs/issues/ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md` —
its `data/*` sits after the per-stream inbox negations and overrides them, so any
*future* `data/inbox/<stream>/README.md` or `PROVENANCE.md` is silently ignored.
Already-tracked docs are unaffected and the specs pile is still correctly ignored,
so nothing is broken today; it is a trap for the next session that adds an inbox
stream. Out of scope for this handoff, hence an issue rather than a fix.

## Verdict

**APPROVE** — 0 blockers.

This is unusually strong founding work. The thing I most expected to find in a
repo whose founding document is "nothing invented" — a confident claim that
doesn't survive checking — is not here: every sha, count, byte total, quoted
figure and named API in the deliverables verified. The SOP's Step 5b (written
after the author read the *next* handoff against the draft and found three
workbook assumptions the from-scratch consumer would trip on) is the kind of thing
that only comes from actually testing a document against its reader.

Note for the next reviewer: the seven stack checks in this repo's checklist have
never been exercised — `pitch_link_stack` is their first real subject, and it is
also the SOP's first consumer. Read its friction report as evidence about the two
documents, not just about that session.
