# LESSONS 2026-09-15 — viewer_hygiene_pass

Four small, unrelated cleanups. Handoff:
`docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md`. Branch
`handoff/viewer_hygiene_pass`, cut from `integration` after
`guard_mutation_witness_tier` merged.

## 1. `dismissCard` — one copy, not four

Found the fourth definition the handoff warned about: `testTheApp`,
`testHeightBudget` and `testRenderCrash` each carried a dead, byte-identical
copy; only `testTheTopologyPage` called it (9 times now, not 7 — the count had
moved under `guard_mutation_witness_tier` as the handoff expected). Promoted
that one copy to module scope next to `hoverRailBar` (same file, same
`(page, ...)` calling convention, same "measured on this suite" comment style),
taking `page` as a parameter instead of closing over it, and deleted the three
unused closures outright.

**Gotcha, not in the diff:** a first pass edited the file through a Python
`open(...).read()/.write()` round trip and silently flattened every CRLF to LF
— `git diff --stat` went from ~30 lines to 2000+ before I noticed. Re-normalised
byte-for-byte (`data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")`) before
committing. This is the same trap `LESSONS_20260915_guard_mutation_witness_tier.md`
and `LESSONS_20260911_viewer_popover_clamp_and_rebuild_terminal_state.md` both
name from the mutation-witness and CRLF angles respectively — third sighting.
**Check `git diff --stat` immediately after any Python-mediated edit to a
CRLF file in this repo, before trusting the diff is what you meant to write.**

## 2. `REBUILD_DONE` pairing — landed, cross-repo, grep-based

New file: `tests/test_rebuild_terminal_state_pairing.py`, 4 tests. Reads
`apps/viewer/topology_app.js`'s `var REBUILD_DONE = "done";` and
drawing-checker's `webui/tolstack_rebuild.py`'s module-level `DONE = "done"` by
regex (not import — cross-repo imports are out of bounds here, and
`tests/test_provenance.py`'s own doc explains why: it reads drawing-checker by
`git cat-file`, never by import). Skips (not fails) when drawing-checker is
absent, same fixture shape as `test_provenance.py`'s `source_repo`.

**Comparison against the shape this asks to be compared to**
(`forge/docs/sessions/HANDOFF_20260914_markdown_vendor_self_contained.md`,
per the handoff): that one made the copy *unnecessary* — vendored the source
itself so there is nothing to drift. This one couldn't: `REBUILD_DONE` is a
value read across a process boundary the client has no other way to know
about ahead of time (the server's own vocabulary), so vendoring means copying
five words instead of one and the drift surface is exactly as wide. A pairing
test is the second-best fix when the value can't be made structurally
unnecessary — which is most cross-repo copies, `markdown_vendor` being the
lucky exception rather than the template.

One nice find: drawing-checker's own source comment above `STATES` already
said *"the viewer's copy table is pinned against it"* — true only as of this
handoff. Worth knowing if a drawing-checker session reads that comment before
this one had landed.

## 3. Rail-allocation README bullet — a pre-filed issue, matched exactly

`docs/issues/ISSUE_20260915_the_viewer_readmes_rail_allocation_measurement_is_stale_and_unguarded.md`
already existed (filed by `viewer_study_respine_animation`'s review, same day)
with `handoff:` already pointing at this one — so it resolves automatically at
Complete, no separate close-out needed. Its table matched what I re-measured
independently, byte for byte: all **five** live topologies still allocate
exactly one rail per column (3/3, 10/10, 10/10, 2/2, 2/2) — reuse still never
fires, `review/dag_viewer_poc`'s two-topology reading is just old.

Guarded the way the issue said to: extended the *existing* doc-pairing test in
`apps/viewer/tests.js` (`"[real] every number apps/viewer/README.md states ...
is re-derivable from the live projection"`, the same one that already pins the
`viewer_study_respine_animation` walk/chain column counts a few hundred lines
below in the README) rather than writing a second one. New regex:
`` /(\d+)\s+over\s+(\d+)\s+for\s+`([A-Za-z0-9_]+)`/g `` — generic over topology
count, so a sixth committed topology fails loudly (missing from the prose) 
instead of silently not being checked.

**Two whitespace misses on the way, both from Markdown's own line wrapping**:
the bullet's "N over N for `id`" phrases wrap across lines in the rendered
file, so a first regex with literal spaces (`for \``) missed a wrapped case,
and a second attempt still missed the reverse wrap (`2\n  over 2 for`). Fixed
by making every joining space in the pattern `\s+`. **Demonstrated the guard
biting**: mutated `pitch_system`'s claimed count from 10 to 9 in a scratch copy,
confirmed `[real] every number ...` reddens with `pitch_system's README column
count: 9 !== 10`, reverted, confirmed green again (360/360 with `--repo`).

## 4. Study-loop hang — not reproduced, now named and still bounded at 30s

`ISSUE_20260914_topology_file_url_real_study_loop_hung_once.md`'s hang was
already bounded (Playwright's own 30s actionability timeout on `.click()` —
it errored, not hung forever), just anonymous: the raw Playwright timeout
message names the *locator*, not which loop iteration produced it, in a suite
that clicks through several studies per topology across five topologies. Wrapped
just that one `.click()` in a try/catch that rethrows naming the study id, kept
the same 30s bound rather than shortening it (shortening risks a new flake on a
slower box for a defect observed exactly once and never reproduced — the
handoff's own "do not restructure the suite chasing it").

**Did not reproduce it.** Ran the browser tier clean multiple times this
session (167/167 `[topology file://]` every time). The cause named in the
issue — the file:// FSA adapter's image reads landing late during a stability
check, or concurrent machine load — is still just as unconfirmed as it was
when filed. If it recurs, the error will now read `nav click for study "<id>"
never went visible/enabled/stable -- <playwright's own message>` instead of a
bare locator dump, which is the whole of what this deliverable could add
without a live repro to work from.

## Counts at finish

| tier | count |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 298/298 (unchanged) |
| `... --repo C:/workspace/tolstack` | 360/360 |
| `node scripts/run_viewer_browser_tests.mjs --repo ...` | 19/19 suites, topology 167/167 both modes (unchanged) |
| `venv-win/Scripts/python.exe -m pytest -q` | 879 passed / 1 skipped (875 + this session's 4 new) |

No projection was rebuilt; `data/projections/viewer/topologies.json` was read
at `C:\workspace\tolstack\data\projections\viewer\` by absolute path only.

## Environment note

`node_modules/` is per-worktree and gitignored:
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund` in the
worktree root before the browser tier — this is now in enough lessons that it
should stop being a surprise, but it still bit the first run of this session
too.

## Bash tool gotcha, not repo-specific

`node ... --repo C:\workspace\tolstack` (backslashes) silently mis-joins the
path when run through this session's Bash tool on Windows — the runner printed
`...\viewer_hygiene_pass\workspacetolstack` and quietly fell back to
0 real-data tests instead of erroring. Forward slashes
(`--repo C:/workspace/tolstack`) work correctly. Cost one confused run where
298/298 looked like a legitimate baseline instead of "the real-data tests never
ran at all."
