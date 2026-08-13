---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_restore_viewer_readme.md
reviewer: review agent (review/restore_viewer_readme)
date: 2026-08-12
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-12 — restore_viewer_readme

The work under review is **not a tolerance stack**: no stack JSON, no projection,
no tolerance value and no worksheet changed. Mandatory checks 1–7 are therefore
recorded N/A below with the reason, rather than skipped silently. What this
handoff actually delivered is a working-tree restore in the **main checkout** plus
three documents, so the review is a verification of the restore, an independent
re-derivation of every number the restored text and the lesson assert, and a
replay of the deliverable-5 guard-gap demonstration.

Everything the branch and the main checkout claim reproduces. Three inline fixes,
all trivial and all inside the handoff's stated scope (`apps/viewer/README.md`,
`.gitignore`, plus the branch's own new issue).

---

## The seven mandatory checks

| # | check | verdict |
|---|---|---|
| 1 | every tolerance traces to a spec/drawing | **N/A** — no element, `source_ref` or tolerance value was added or edited. The branch's whole content diff is three `.md` files under `docs/`. |
| 2 | signs on every path term | **N/A** — no `path`, `check` or term list touched. |
| 2b | coherent material corners | **N/A** — no fold, no transcription. |
| 3 | LMC/MMC direction | **N/A** — no element carries `lmc`/`mmc` in this diff. |
| 4 | RSS actually computed | **N/A** — no check reported. |
| 5 | nominal inside its own min/max | **N/A** — no `nominal` transcribed. |
| 6 | quantised cotter/castellation constraints | **N/A** — no joint under review. |
| 7 | traced / inferred / untraced ratio | **N/A as a stack figure**, and confirmed not otherwise at risk: the restored `apps/viewer/README.md` quotes no traced ratio (`grep -n -i traced` returns only legend prose and the four `spec` citations), so the restore cannot re-assert a stale one. The *export* counts it does quote are re-derived in full below. |

## What I verified

**The restore held, and it is git's content, not the `.backup`'s.**
`git hash-object apps/viewer/README.md` in the main checkout is
`d311c2fdeb02975d7d76b2c394a2794f54a90665`, identical to
`git rev-parse HEAD:apps/viewer/README.md`. 305 lines (305 LF bytes, 18 920
bytes, trailing newline present). `git status --porcelain` in
`C:\workspace\tolstack` reports `?? .dispatch.toml` and nothing else, checked
three times across ~20 minutes of this review — well outside the ~20 s autosave
loop. `apps/viewer/README.md.backup` is gone. No Ghostwriter process exists:
`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*tolstack*'
-or $_.Name -like '*ghostwriter*' }` returns only `claude.exe` and
`powershell.exe`.

**Deliverable 3 — every restored figure re-derived from the live projection.**
Recounted from `C:\workspace\tolstack\data\projections\viewer\results.json`
(main-checkout absolute path), using the viewer's own definition of a live
citation (`liveCitations()` in `apps/viewer/tests.js:1629` — elements carrying a
`source_ref`):

```
live citations: 48
no export:      26  {'workbook': 21, 'spec': 4, 'assumed': 1}
with export:    22  {'established': 22}   (0 unestablished)
established with empty runs: 15
distinct exports by sha256:  9  |  with no runs: 6
```

`README.md:141` (`26 of the 48 … 21 workbook, 1 assumed, and 4 spec`) and
`:139` (`15 of the 22` … `6 of the 9`) are exact. All four no-export `spec`
citations are indeed `confidence: traced`, as the same sentence claims.

I also confirmed the *projection itself* is current rather than merely
self-consistent: it was built at `0f494a1`, and
`git diff 0f494a1 HEAD -- docs/tolerance_stacks scripts/build_viewer_projection.py`
is empty. The lesson makes this argument and it holds.

**Deliverable 5 — the guard gap, replayed independently.** I did not take the
demonstration on report. In this review worktree I removed the entire
`## Which bytes the number was read off` section plus the `EXPORT UNESTABLISHED`
and `CTE NOT TRANSCRIBED` legend rows (306 → 271 lines) and ran the full suite:
**350 passed, 1 skipped**, zero failures. The claim is true as stated — the
doc-scan guards are blind to deletion — and the file was restored with
`git checkout --` afterwards. Promoted to the overlay as a new **Recurring bugs**
entry.

**The lesson's timeline, commit by commit.** Every row reproduces:

| claim | measured |
|---|---|
| `56e1380` README 228 lines, 2026-08-11 11:31:57 | 228, `11:31:57 -0700` ✓ |
| `f395d30` still byte-identical | same blob `1ddefab6` ✓ |
| `4e36cc8` → 242 lines, 15:58:52 | 242, author date `15:58:52` ✓ (commit date 15:59:11) |
| `7ffe318` / `358569f` → 305 lines | 305 / 305 ✓ |
| `ac0f75c` names the writer, 16:54:13 | ✓ |
| ~28.5 h stale-but-harmless | 11:31:57 → 15:58:52 next day = 28.45 h ✓ |
| ~55 min destructive-to-attributed | 15:58 → 16:54 ✓ |

**Suites.** Main checkout `C:\workspace\tolstack`: **351 passed** (and `git
status` there is unchanged afterwards — the suite deposits nothing in `data/`,
universal check 1). This review worktree, with the handoff merged in: **350
passed, 1 skipped** — the known `data/`-dependent skip. Viewer JS with the real
tier pointed at the main checkout (`node apps\viewer\run_tests.cjs --repo
C:/workspace/tolstack`): **118/118 passed, `[real]` tier RAN** (the `[real]`
export/material/crop tests all report PASS; no `SKIP node-fs tier` line).

**Universal check 2 (a new guard observed failing).** No new guard was added, so
the check applies in its inverted form: the deliverable *is* a claim that two
existing guards cannot fail, and I broke the thing they cover and confirmed the
silence myself (above). The suite is green on an amputated README.

**Scope.** The branch touches `docs/issues/` (one closed, one new) and
`docs/sessions/lessons/` only. Nothing in `data/inbox/specs/`, nothing written
into drawing-checker, no tracked file written into the main checkout by absolute
path, no `{{` template leftovers. The four sibling handoffs staged in parallel own
different files; `git log HEAD..master` was re-run immediately before the merge.

## Findings

### Should-fix — fixed inline

**S1 — the `.gitignore` judgement lived only in a lesson and a commit message.**
Deliverable 4 asked for a decision *and an argument*, and the author's argument is
right (the `.backup` artefact is the tell that a non-git writer owns a file;
ignoring the pattern deletes the signal that made this diagnosable). But the
decision was recorded nowhere a future author would meet it: the next person who
sees `?? something.backup` in `git status` adds `*.backup` in ten seconds and
never reads `docs/sessions/lessons/`. This repo's own rule — a durable fact that
lives only in a session artefact dies with the session — and `.gitignore`'s
existing habit of carrying its reasoning inline (the DIRECTORY-DESCENT RULE block)
both point the same way. Added a seven-line `DELIBERATELY NOT IGNORED` comment in
`.gitignore`'s "IDE / OS" section, pointing at the lesson. **Fixed inline**; the
decision itself is unchanged and I agree with it.

### Nits — both fixed inline

**N1 — `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`
had no `audience: strategy`.** The issue's own "Why this is a design question,
not a patch" section sketches four candidate designs and declines to pick, which
is exactly the case the review prompt reserves that key for. Without it the issue
routes to a fix agent that has to re-derive the same "which sections are
load-bearing?" question. Added.

**N2 — same file, "caught by a human reading `git status`".** It was caught by
the 2026-08-12 **triage sweep**, an agent, checking that its own edits were the
only ones in `git status` (see
`ISSUE_20260812_viewer_readme_truncated_in_main_checkout.md`, `reporter: agent
(triage sweep 2026-08-12)`). The sentence's point — caught by someone looking, not
by the suite — survives; the attribution was wrong and this repo's issues get read
as provenance. Reworded.

## Notes for the next reviewer

* **`Measure-Object -Line` is not `wc -l`.** It reports **247** for the restored
  305-line README, because an empty string counts zero lines and the file has 58
  blank ones. A DoD that says "the file is 305 lines" fails on the obvious
  PowerShell one-liner and looks like the truncation is back. Count LF bytes, or
  use `git show <ref>:<path> | wc -l` under the Bash tool.
* **"48 live citations" has a definition, and a naive walk gets a different
  number.** Recursing every `source_ref` in `results.json` yields **52** (and 30
  no-export), because it also picks up `values_source` and per-check refs. The
  figure in the README counts *element* `source_ref`s only, which is what
  `liveCitations()` in `apps/viewer/tests.js` does. Quote the definition with the
  number — it is the instances-vs-ids trap in a third place.
* The projection's `provenance.repo_root` still names the now-removed
  `viewer_export_and_material_provenance-review` worktree. Harmless and correctly
  flagged in the lesson: `repo_root` records who built it, not where it lives.

## Verdict

**APPROVE** — 0 blockers. Three inline fixes committed on the review branch (S1,
N1, N2). Overlay updated: the Ghostwriter entry is marked resolved with its two
durable halves kept, and a new **Recurring bugs** entry records the
deletion-blind doc-scan guard class. Merged to `master`, worktrees and branches
cleaned up, board moved to `completed/`.
