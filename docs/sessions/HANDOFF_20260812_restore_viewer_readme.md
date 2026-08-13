---
priority: high
depends_on: []
---

# HANDOFF 2026-08-12 — restore_viewer_readme: stop the Ghostwriter window rewriting `apps/viewer/README.md`, then restore it

Source: triage sweep 2026-08-12, routing
`docs/issues/ISSUE_20260812_ghostwriter_holds_a_stale_apps_viewer_readme_over_the_main_checkout.md`
(`bug`, `high`) and its same-day duplicate
`ISSUE_20260812_viewer_readme_truncated_in_main_checkout.md` (`chore`, `med`,
closed). Baseline: trunk, 2026-08-12. Scope: `apps/viewer/README.md`,
`.gitignore`. Touch nothing else — four other tolstack handoffs are staged in
parallel and none owns this file.

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item.** Deliverable 1 **cannot be done by
> an agent**: a GUI editor window has to be closed or reloaded by a human at the
> machine. Ask Jeff for it as your first action, in one line — *"please close (or
> reload, do not save from) the Ghostwriter window holding
> `C:\workspace\tolstack\apps\viewer\README.md`, then tell me"*. **Do not block
> on it.** While waiting, do deliverables 3, 4 and 5, all of which are
> independent. Only deliverable 2 (the restore) needs the window gone — attempt
> it after confirmation, or attempt it anyway and *verify it held* 60 s later,
> which is itself a valid check.

> **⚠ WORKTREE REALITY.** The defect is in the **main checkout's working tree**
> (`C:\workspace\tolstack`), not in git history and not in any worktree. `git
> status` in your worktree will be clean and you will conclude there is nothing
> to do. There isn't — in your worktree. Look at the main checkout by absolute
> path.

## The cause, already diagnosed — do not re-diagnose it

`C:\Program Files\ghostwriter_2.1.6_win64_portable\ghostwriter.exe` (PID 3132 as
of 2026-08-12T23:52Z) has `apps/viewer/README.md` open with a buffer loaded
**before** the day's viewer work. On autosave it copies whatever is on disk to
`apps/viewer/README.md.backup`, then writes its stale buffer over the real file.

Observed twice during the `viewer_export_and_material_provenance` review: a
`git checkout -- apps/viewer/README.md` was undone within ~20 s, and the second
time it aborted a `git merge` outright (*"Your local changes to the following
files would be overwritten by merge"*). Identified with:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*tolstack*' } |
  Select-Object ProcessId, Name, CommandLine
```

The `viewer_fixture_shape_guards` review sighted the *behaviour* first and
guessed the owner was the next handoff's tactical agent. **It was not; no agent
was involved.** Do not repeat that guess.

State measured by the triage sweep:

```
 M apps/viewer/README.md          # 228 lines; HEAD has 305
?? apps/viewer/README.md.backup   # 305 lines, byte-identical to HEAD modulo CRLF
```

The 77 missing lines are the `EXPORT UNESTABLISHED` and `CTE NOT TRANSCRIBED`
legend rows and the whole **"Which bytes the number was read off"** section,
added by `viewer_export_and_material_provenance` and corrected by `358569f`, both
the same day. **Nothing is lost** — the content is in `HEAD` and in the `.backup`.

## Deliverables

1. **(HITL)** Get the Ghostwriter window closed, or reloaded. Its buffer is
   stale, so it must **not** be saved from. See the exception block above.

2. **Restore from git, not from the `.backup`.**
   `git -C C:\workspace\tolstack checkout -- apps/viewer/README.md`. Use git
   because `HEAD` is the reviewed content; the `.backup` is a Ghostwriter artefact
   of unknown vintage that merely happens to match today. **Then wait 60 seconds
   and check `git status --porcelain apps/viewer/README.md` again** — a restore
   that silently reverts is the whole signature of this bug, and a green check
   taken immediately proves nothing.

3. **Re-verify the restored numbers.** The restored text claims "26 of the 48
   live citations have no export block — 21 workbook, 1 assumed, and 4 `spec`".
   Recount against `C:\workspace\tolstack\data\projections\viewer\results.json`
   (**main-checkout absolute path**; gitignored, absent from your worktree). If
   the projection has moved since `358569f`, restoring re-asserts a stale number —
   this repo's named worst defect class. Correct it in the same change and say so.

4. **Delete `apps/viewer/README.md.backup`, and decide whether `*.backup` belongs
   in `.gitignore`.** It is a Ghostwriter artefact and untracked junk either way.
   The judgement: ignoring the pattern makes future ones invisible in
   `git status` — which is convenient, and is also exactly how this truncation
   nearly went unnoticed. Argue whichever you pick; the wrong move is choosing
   silently.

5. **Report the guard gap — do not build the fix here.** tolstack has two
   doc-scan guards built to stop this file lying
   (`test_no_live_document_states_an_unguarded_hardware_entry_count`,
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`).
   **Neither can fail on this defect.** They scan live documents for a *stated*
   number that disagrees with the computed one; a document whose section has been
   deleted states nothing, and therefore states nothing false. The suite is green
   on a README with its provenance chapter removed. Write that up clearly enough
   that someone can file it as its own issue. A deletion-detecting guard is a
   design question ("which sections are required?"), not a patch, and it is out of
   scope here.

## Definition of done

- `git status --porcelain` in the **main checkout** shows no
  `apps/viewer/README.md` and no `README.md.backup`, **verified twice at least a
  minute apart**.
- The restored file is 305 lines and its citation counts were re-derived from the
  live projection (or corrected).
- Full suite green in the main checkout — say that it was the main checkout; the
  `hardware_counts_doc_guard` review's N1 finding was a suite line that didn't
  say which produced it.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_restore_viewer_readme.md`):
  the `.gitignore` decision and why; the deletion-blind guard gap from
  deliverable 5; and — the durable part — **how long the stale buffer had been
  overwriting merged work before anyone noticed**, given the
  `viewer_fixture_shape_guards` review saw the behaviour and misattributed it.
  A GUI process silently reverting a repo is not in anyone's mental model of
  "what could be wrong", and that is the lesson worth leaving.
