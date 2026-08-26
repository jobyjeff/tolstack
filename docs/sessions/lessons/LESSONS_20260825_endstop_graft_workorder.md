# LESSONS — `endstop_graft_workorder` (worked 2026-08-25)

Handoff: `docs/sessions/active/HANDOFF_20260825_endstop_graft_workorder.md`.
Branch `handoff/endstop_graft_workorder`. Deliverables 1, 2 and 4 done;
deliverable 3 (the slice + graft proposal) is **blocked** — Chao's "Hardstop
tol" workbook (HITL item 1 in the handoff) never landed in
`data/inbox/tolerance_stacks/` during this session. I checked for it twice
(start and again right before writing this) and it was absent both times, so
I worked entirely on deliverable 1 per the handoff's own fallback
instruction. No progress was possible on deliverable 3 — there is nothing to
report there beyond "still blocked."

## Worktree/main-checkout mistake, caught and fixed mid-session

I wrote every tracked-file edit (`PROVENANCE.md`, `README.md`, the new
worksheet, this lessons file) to the **main checkout**
(`C:\workspace\tolstack\...`) instead of this worktree
(`C:\workspace\tolstack-worktrees\endstop_graft_workorder\...`) — exactly the
mistake the standing dispatch instructions call out as the highest-cost one
here, just the tracked-file direction of it rather than the more commonly
warned-about gitignored-data direction. Caught it because `git status` in the
worktree came back clean when it should not have. Fixed by `git checkout --`
on the two modified tracked files and `rm` on the two new untracked ones, all
in the main checkout, confirmed against `git diff` before reverting; left two
unrelated untracked entries there (`.dispatch.toml`,
`docs/sessions/HANDOFF_20260825_stack_viewer_layout_v2.md`) completely alone
since they belong to the parallel `stack_viewer_layout_v2` work and are not
mine to touch. Redid all four writes at the correct worktree paths
afterward. **Read every Write/Edit `file_path` back against `pwd` before
calling the tool, not after** — checking `git status` after the fact works
but costs a cleanup pass; the cheaper habit is confirming the absolute path
starts with the worktree segment before the tool call, every time, not just
for gitignored `data/`.

## What this workbook actually is — a third archetype

`260825_End_Stop_JC.xlsx` is not a linear grip stack (`260729_sample`) or a
diametral thermal fit (`260209_Hub Bearing Fits`). It is a **blade-pitch
angular-position-error rollup**: every row is a linear/diametral source
tolerance run through a motion-ratio sensitivity to produce an *equivalent
blade-pitch-angle error*, in two parallel columns (worst-case −5° pitch vs. a
"full sweep average" ratio). `docs/tolerance_stacks/README.md`'s "Two
archetypes, not one kind of stack" section is now wrong by omission — I
updated its contents table and source-workbook line but deliberately did
**not** rewrite that section's prose, since promoting this into a named
third archetype (an `ARCHETYPE_*.md` the way `thermal_fit` got one) is a
design decision for whoever eventually writes `stack_definition`-shaped JSON
for this workbook, not something this handoff's scope covers — it works from
the workbook only, explicitly not the from-drawings derivation.

## Shared-formula trap, and why it was easy this time

66 `t="shared"` cells, but only **two** distinct masters
(`D30:D45`/`F30:F45` → `$B{row}*D$10`/`F$10`, `D48:D64`/`F48:F64` →
`$B{row}*D$12`/`F$12`), both simple single-multiply patterns. Recomputed
every populated cell in both ranges from its own `B` value against the
master's pattern in a throwaway script (not committed — read the raw cells
via `debug_dump_tol_stack_xlsx.read_cells`, no new stdlib dependency) and
matched the cached value exactly (no float noise at all, because it's one
multiply, not a summation chain). Contrast with the hub-bearing workbook,
which had several different shared patterns and needed the pattern inferred
per-column-group — this one has exactly two, and both apply cleanly across
their whole declared range with no exceptions. Also spot-checked the two
irregular, hand-picked `SUM` cell lists in the deprecated "OLD STUFF" section
(rows 89, 95 — the ones most likely to carry a manual slip, per the
hub-bearing worksheet's F3 precedent): both matched their cached totals
exactly, including a deliberate double-reference to `D33` in both lists —
real, not a transcription error on my part.

## The untraced count: 0 of 43 — the worst so far, and that is the finding

(Corrected in review: the handoff's own worksheet miscounted §2c as 11 rows
when rows 30–45 are 16, making the true total 43 element instances, not 38 —
the "0 traced" conclusion is unaffected, only the denominator.)

Every contributor element in this sheet is `untraced`: no drawing zone, no
spec, no citation of any kind beyond a component name and a one-line hand
comment, several of which admit the number is provisional ("need to
correct," "does not exist yet," "estimate," "needs updating"). The previous
low mark in this repo was `pitch_link_to_pitch_plate` at 4/6, or the
hub-bearing M1 sheet's 4/8. This workbook is Jeff's own pre-SOP working
scratchpad and it reads like one — that is expected, not a defect in the
transcription, and the handoff said to expect it.

## Currency check: also close to zero, for a structural reason

Delegated to a fork to search `data/inbox/drawings/`, `data/inbox/specs/`,
and drawing-checker's structured extractions
(`C:\workspace\drawing-checker\data\`, read-only, absolute path — that repo's
copy of the End Stop workbook's actual parts, 213668-002 the gas-spring mount
and 217755 the propulsion assembly, do exist there). Every check came back
**couldn't-check**, for two different reasons worth distinguishing: (a)
`data/inbox/drawings/` in this repo only holds the five hub-bearing drawings
— nothing for this joint has been copied in at all; (b) drawing-checker's own
213668-002 extraction *exists* but its structured JSON stops at title
block/notes/parts-list — individual dimension values live only in rendered
page crops, which a text/JSON search cannot read. So "couldn't-check" here
does not mean "the source doesn't exist," it means "the source exists in
drawing-checker but at a coarser extraction granularity than this check
needs." Worth stating precisely because the two reasons call for different
follow-ups (copy a drawing in vs. re-run drawing-checker's extraction at
finer grain / read the crop by hand).

## My read on usable-as-rough-draft vs. redo-by-hand

**The row-level transcription (deliverable 1) is usable as-is; it does not
need to be redone by hand.** Every cell value, formula (explicit or
shared-inferred), and comment is transcribed and independently re-derivation
-checked against the cached values, with no arithmetic error found anywhere
in the sheet. Once Chao's sheet lands, deliverable 3 can build its slice
proposal directly off this worksheet's §2c table (rows 37–45) without
re-reading the xlsx.

**But three of the four findings (F1–F3) are the kind that change the
number, not just annotate it, and none of them can be resolved without
Jeff:** F1 (which pitch condition the D-column actually represents), F2 (two
rows carry self-admittedly provisional values, uncorrected, in every current
total), and F3 (the sheet's own "current" headline total, §2f, appears to
exclude its single largest contributor — row 68's gas-spring tipping
backlash — while a deprecated section included it). **Do not let the graft
proposal quote §2f's totals, or row 68's value, or rows 26/57's values, as
settled** until Jeff has answered those three. The shadow program's
calibration point, as I read it: this agent-draft attempt correctly
identifies what is wrong with the source and correctly reproduces what the
source says, but a hand-built pre-SOP workbook like this one has real
open questions baked into its own comments that no amount of careful
transcription resolves — that part is inherently a "ask Jeff" step, not a
"redo more carefully" step.

## Follow-ups (not fixed, not filed as issues — all repo-internal and named in the worksheet)

- Chao's sheet still hasn't landed — deliverable 3 has not started.
- §2g ("Blade to ring gear") is an empty section header with nothing under
  it — ask Jeff whether it's unfinished or stale.
- Not filed as a `docs/issues/` ticket: everything above is specific to this
  one workbook and lives in the worksheet's own discrepancy ledger (§6),
  which is exactly where a future agent picking up deliverable 3 will look
  first — a separate issue file would just be a second copy of the same list
  to keep in sync.

## Verification

- `venv-win\Scripts\python.exe -m pytest -q` from the worktree (main
  checkout's interpreter, per repo convention): **459 passed, 1 skipped**
  (the pre-existing node-fs viewer skip, unrelated to this handoff — this
  handoff touched no code, only `docs/` and `data/inbox/tolerance_stacks/PROVENANCE.md`).
- No new stack JSON, no new parsing helper, no code changes — this handoff's
  deliverables are documentation. The existing `tests/debug_dump_tol_stack_xlsx.py`
  (stdlib-only) was sufficient for the full read; nothing was added to
  `requirements.txt`.
