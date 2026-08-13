# LESSONS 2026-08-12 — restore_viewer_readme

Restored `apps/viewer/README.md` in the **main checkout** after a Ghostwriter
editor window wrote a stale buffer over it, deleted the `.backup` artefact, and
re-derived the citation counts the restored text asserts. No tracked file
changed content; this branch carries an issue and this lesson.

---

## How long the stale buffer had been overwriting merged work — the durable part

This is the question the handoff asked for, and the answer is more interesting
than "an hour", because **two clocks run at different speeds**: how long the
window had been holding a stale buffer, and how long that buffer had been doing
visible damage. Almost all of the risk lives in the gap between them.

Reconstructed from `git log` and the two reviews that saw it:

| when (local) | what |
|---|---|
| 2026-08-11 11:31:57 | `56e1380` lands. README is **228 lines**. This is the content the Ghostwriter buffer holds. |
| *(gap of ~28.5 h)* | **Nothing commits `apps/viewer/README.md`.** The buffer autosaves over a file it matches. Zero diff, zero `git status` line, zero symptom. |
| 2026-08-12 14:44:37 | `f395d30` — README still byte-identical to `56e1380`. |
| 2026-08-12 15:58:52 | `4e36cc8` takes the README to 242 lines. **The buffer is now wrong**, and its next autosave is destructive. |
| 2026-08-12 ~16:07 | `viewer_fixture_shape_guards` review merges, sees ` M apps/viewer/README.md` + an untracked `.backup` it did not create, restores it, and **watches a process re-revert it ~17 s later**. Correctly refuses to fight a live writer. Guesses the owner is the *next handoff's tactical agent*. Wrong — no agent was involved. |
| 2026-08-12 16:29 → 16:44 | `7ffe318` + `358569f` take the README to **305 lines** (the export/material provenance chapter). The buffer keeps writing 228 back. It also **aborts a `git merge` outright**. |
| 2026-08-12 16:54:13 | `ac0f75c` — the writer is finally named as `ghostwriter.exe` (PID 3132), by `Get-CimInstance Win32_Process` on the command line. |
| 2026-08-12 17:29:08 | this session restores it. Held. |

Two numbers, and the second one is the lesson:

* **~55 minutes** from the buffer becoming destructive (15:58) to being correctly
  attributed (16:54). That part went fine — the repo noticed fast.
* **~28.5 hours** the window sat there holding a doomed buffer while every check
  the repo has said everything was fine. It was invisible not because anyone
  missed it but because **there was nothing to miss**: a stale buffer that
  matches disk is indistinguishable from no buffer at all. It became a bug the
  instant somebody else edited the file, retroactively, with no warning.

**A GUI process silently reverting a repo is not in anyone's mental model of
"what could be wrong."** The fixture-shape-guards review had every fact right —
byte-identical to the pre-review version, an unexplained `.backup`, a revert 17
seconds after a restore — and still reached for "a sibling agent is working from
a stale snapshot", because *an agent* is the kind of thing that writes files
here. The failure was not observation, it was the hypothesis space. Note what
finally cracked it: not more `git` archaeology, but **asking the operating system
who has the repo open**:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*tolstack*' } |
  Select-Object ProcessId, Name, CommandLine
```

That should be an early move, not a last resort, whenever the working tree
changes without an author. Corollary for whoever hits this next: **a `.backup`,
`.bak`, `.orig` or `~` file appearing next to a modified tracked file is a
signature, not litter.** Editors leave those; git and agents don't. It is the
cheapest available tell that a non-git writer has the file.

---

## The `.gitignore` decision — `*.backup` stays **un**ignored, deliberately

Deliverable 4 asked for a judgement, so: **I did not add `*.backup` to
`.gitignore`.** The file is deleted; the pattern is not ignored.

The case for ignoring it is real — it is editor junk, it is never going to be
committed, and it is noise in `git status`. I rejected it anyway, because in this
incident **the `.backup` file was the diagnosis.** The truncation itself was
plausible-looking (a doc got shorter; docs get edited). What made it obviously
non-human was an untracked `README.md.backup` sitting beside it that no author
and no agent had created, appearing and re-appearing on each restore. That is the
artefact that says *a program with an autosave loop owns this file*.

Ignoring the pattern buys silence in `git status` and pays for it by deleting the
only signal that a non-git writer is live in the tree — the exact signal that
made this diagnosable, in a repo whose worst named defect class is documents
going quietly stale. `git status` noise costs a line of output; an invisible
process rewriting merged work costs a review cycle and nearly cost a section of a
README. Wrong trade.

If the noise ever does become a problem, the right fix is narrower than a
pattern: delete the artefact when you see it (as this session did) and treat its
*re-appearance* as the alarm. An ignore rule cannot distinguish "junk I already
handled" from "it is happening again".

---

## The guard gap (deliverable 5) — filed, not fixed

`docs/issues/ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`.

Short version: `test_no_live_document_states_an_unguarded_hardware_entry_count`
and `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
recount *stated* numbers and fail on disagreement. **A deleted section states
nothing, so it disagrees with nothing.** Demonstrated rather than argued: with
the whole `## Which bytes the number was read off` section and the two magenta
legend rows removed, the suite is `350 passed, 1 skipped`. Green on a README with
its provenance chapter amputated.

The issue lays out four candidate designs and argues (2) "derive the required
mentions from the enumerated states the viewer branches on" and (3) "assert the
corpus never loses a guarded claim" are the two that don't need a human to
remember anything. Out of scope here by explicit instruction — it is a design
question ("which sections are load-bearing?"), not a patch.

---

## Deliverable 3: the restored numbers are correct, no correction needed

The handoff flagged the risk that restoring re-asserts a stale count. It does
not. Recounted from `data/projections/viewer/results.json` (main-checkout
absolute path — gitignored, **absent from the worktree**, which is exactly the
trap the tactical prompt warns about):

```
live citations: 48
by export state: {'<no export key>': 26, 'established': 22}   # 0 unestablished
no-export by source_ref kind: {'workbook': 21, 'assumed': 1, 'spec': 4}
established with empty runs: 15
distinct exports by sha256: 9   |   distinct exports with no runs: 6
```

Every figure in the restored text reproduces exactly: `26 of the 48` (21/1/4) at
`README.md:141`, and `15 of the 22` / `6 of the 9` at `:139`.

Worth recording *why* it was safe, since "the number matches" alone is a weak
check on a projection that could itself be stale: the projection was built at
`0f494a1`, and `git diff 0f494a1 HEAD -- docs/tolerance_stacks
scripts/build_viewer_projection.py` is **empty**. Neither the stack sources nor
the builder has moved since, so the projection on disk *is* current — the numbers
are not merely self-consistent with a stale artefact. Check both when you
re-derive a count from `data/projections/`; the file's own `provenance.built_at`
tells you when, not whether the inputs have moved since.

Note the projection's `provenance.repo_root` points at the (now-gone)
`viewer_export_and_material_provenance-review` worktree. That is expected and
harmless — `data/` lives only in the main checkout — but it means `repo_root` is
a record of *who built it*, not of where it is.

---

## Practical notes for the next agent here

* **A worktree has no `venv-win`** (gitignored). `./venv-win/Scripts/python.exe`
  from a worktree is `No such file or directory`. Run the main checkout's
  interpreter against the worktree cwd:
  `/c/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`.
* **Suite counts differ by location, and that is normal.** Main checkout:
  **351 passed**. A worktree: **350 passed, 1 skipped** — the skip is a
  `data/`-dependent test with nothing to read. Say which checkout produced a
  suite line (the `hardware_counts_doc_guard` review's N1 finding was exactly
  this); a bare "350 passed" is ambiguous evidence.
* **Verify a restore twice, a minute apart.** Done here: clean at 17:29:08 and
  again at 17:30:45. An immediate green proves nothing against a writer whose
  loop is ~17–20 s. Ghostwriter was already gone by the time this session ran
  (`Get-CimInstance … '*ghostwriter*'` returned nothing), so the HITL ask was
  moot — but the two-checks discipline is what established that, not the process
  listing alone.
* `?? .dispatch.toml` in the main checkout is dispatch's own untracked file.
  Not dirt, not yours, leave it.
