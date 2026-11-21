# LESSONS 2026-11-19 — a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits

## How it was measured

`tests/debug_bind_latency_20261119.mjs` (new, hand-run): the keep-or-let-go
probe's server and fake folder grant on a **scratch copy** of Jeff's log
(`data/scratch/bind_latency_20261119/`, fresh per press, deleted at the end).
Each press prints the pane's own step clock (`window.__writeSteps`, added by
this handoff: every step of the write in ms, plus how long the command waited
in the pane's queue), the folder calls the grant was asked for, press → event
on disk, press → the body changes, and what the pressed control reads one
frame after the press. All on `pitch_plate_215177_001@pitch_plate_link_attach_bore`.

**The probe's grant is HTTP.** Each folder call is a `fetch` to the probe's
server, so its per-call cost is not the real grant's (in-browser calls).
Folder-call COUNTS are transport-independent; the seconds are this probe's.
The real `showDirectoryPicker` cannot be driven headless.

**Jeff's real log:** `C:\workspace\tolstack\data\inbox\feature-identity\` had
**101 files before and 101 after** every run (the probe prints both counts
each run; all eleven runs agreed).

## The per-step table, before any change

Keep on "faces 1380, 1381" (the first write of the page, so the grant is
asked for inside it), Unbind (same), and an armed click on face 680 after
the Unbind (grant held). ms; "before" is trunk + the clock only (the armed
row from a frozen copy of that pane, `--annotate`).

| step | Keep | Unbind | armed click |
|---|---:|---:|---:|
| waiting in the pane's queue (behind `isolate` opening the model) | 5 484 | 5 930 – 8 817 | 0 |
| the grant | 1 066 | 634 | — |
| **read the whole log at the grant** (`readIdentity`) | **16 135** | 8 986 – 9 485 | — |
| **list seqs** (`nextEventSeq`: opens every event file again) | **5 978** | 5 530 – 5 887 | 5 499 |
| face classes / surface siblings | — | — | 0 / 0 (warm from the arm) |
| write the event | 32 | 33 – 41 | 26 |
| repaint | 9 | 13 – 320 | 11 |
| **read the whole log again** (`publishIdentity`) | **10 034** | 8 948 – 9 347 | 9 296 |
| write the served log | 39 | 54 – 67 | 39 |
| fold | 3 | 3 | 2 |
| the shell takes the record (`buildModels` + `renderNav`) | 18 | 17 – 26 | 23 |
| **folder calls** | **2 025** | **2 025** | **1 283** |
| press → event on disk | 29 359 | 21 663 – 24 546 | 5 550 |
| press → the body changes | 40 359 | 32 103 – 34 970 | 15 495 |

The suspects the issue named were half right. `surfaceSiblingsOf` was free
(the arm had already classified the plate, and a Take's siblings took 6–13
ms). What cost the time was **reading the log three times per write**: once
at the grant, once to count the next seq (every file opened for its `seq`),
and once more to rewrite the served log, plus the mesh store's 50
`provenance.json` files each time for a list of checksums. The second cost
was the **queue**: a Keep posted while the pane was still opening its model
waited for all of it.

## What was cut, and why

1. **Event files are read once per page** (`apps/annotate/storage/fsa.js`).
   The inbox is append-only, one file per event, never rewritten, so a name
   read once is that event. The listing is still read every time (an agent
   may have proposed since); only a new name is opened. Directory handles are
   kept by path (each file read used to walk from the root). The installed
   meshes are the directory names, with no provenance opened. The first
   (cold) read runs 16 at a time instead of one after another.
2. **A write does not wait behind the queue** (`ExecQueue.runAfterLoad`,
   `AA.IDENTITY_WRITE_VERBS`): it waits for the load gate only. Writes stay
   one at a time by their own flag (`oneWriteAtATime`). Mirrored-row Takes
   already ran unqueued (`railExec`).
3. **The shell is told when the event is on disk.** The pane posts its merged
   record from the session fold before rewriting the served log. That rewrite
   is best-effort, so it no longer holds up the verb. It runs behind the
   press, one at a time and in write order (`publishTail`), so an older log
   never lands over a newer one. This is what took the armed click's body
   from 1.8 s to 0.6 s. The disarm, the toast and the tree all used to wait
   for that rewrite.

The append-only, one-file-per-event and never-two-writes rules are unchanged:
the writer, its bump rule, the seq reservation and the busy flag are
untouched. Only reads are cached.

## After

Same probe and scratch log, ms (`docs/sessions/lessons/shots/<slug>/`, the
three shots):

| press | press → disk | press → body | folder calls | queued |
|---|---:|---:|---:|---:|
| Keep, first write, page still opening its model | 9 684 – 10 708 | 11 156 – 11 319 | 221 | 0 – 1 |
| Keep, first write, page settled | 2 747 – 2 951 | 3 256 – 3 512 | 221 | 0 |
| Unbind, first write | 1 995 – 10 071 | 2 556 – 11 206 | 221 | 0 |
| armed click (grant held) | 582 – 720 | 632 | 10 | 0 |
| Take of face 1380 (grant held) | 129 – 172 | 354 | 10 | 0 |

Disk → body is 0.0–0.6 s on every press (target: within 1 s).

> **Correction (review, 2026-11-19).** The table above does not support "every
> press". For "Keep, first write, page still opening its model", every
> press → body (≥ 11 156) is later than every press → disk (≤ 10 708). So the
> run whose event reached disk at 9 684 ms changed the body at least 1 472 ms
> later, past the 1 s target. On a loading page the shell's repaint waits
> behind the pane's mesh work, because they share one thread (see "Gotchas").
> The ≤ 0.6 s figure holds for the settled-page, grant-held and Take rows. The
> Unbind row's ranges also include loading-page runs, up to 10 071 ms to disk.

**Where the 3 s target is missed:** the first write of a page while the
scene is still loading its meshes. Its one remaining large step is the cold
read at the grant, 4.8–9.5 s here against 1.9–2.6 s on a settled page. The
seq is only inside each file (filenames are not seqs), so every file must be
opened once. In this probe those opens are HTTP fetches sharing the
connection pool with the meshes, so the spread is mostly the probe. Filed with options:
`ISSUE_20261119_the_first_write_of_a_page_still_opens_every_event_file_to_find_the_next_seq.md`.
Every later write in the page is well under 1 s.

## Every write press says it took (deliverable 3)

The words: `writing…` while it writes, `not written` (the reason on hover)
when it did not, and `another write was still running` as the reason for a
press the pane dropped as busy. They are in `AA.ARMED_PICK_WORDS` beside
`reading face {face}…` and in `VA.FEATURE_BODY_WORDS`, paired by
`tests/test_bind_latency_vocabularies.py`.

- **The shell's feature body** (Keep, Unbind, Take, Flip, Remove, the
  suggestion's Take): the pressed control is marked in its own click
  (`markWriting`), and the page holds the write (`bodyWrite`) until the pane
  answers its `annotate:exec` by id. Meanwhile every other writing control in
  the body is disabled (the pane drops a second write). A failure stays on the
  control that failed. A pane that reloads clears it. Measured: one frame
  after the press the probe read `writing…`, disabled, on every run.
- **The pane's candidate rows** (Take on a joint end's list), through
  `pressWrite`: the pane's own button is marked; the mirror carries
  `writes`/`disabled`/`pending`, so the shell's copy marks itself at its own
  press and then follows the pane.
- **The group offer bar** (Take all, Just this one), through `pressWrite`.
  It also now goes through `AA.exec`, so it takes the one-write flag and the
  clock (it called `cmdGroup` directly).
- **The armed click** keeps its `reading face N…` line, which now lasts
  well under a second.

Deliberately left alone: the bind form's Bind button (`buildBindForm`). It is
the pane's un-embedded bar, not on the shell's page. Its write is the same
fast path now.

## Records

- **Served page.** The DoD's "served page" is the probe's server: drawing-checker's
  mount shape on a private port, with a scratch log and a fake folder grant.
  It is what the keep-or-let-go and walk handoffs measured on. The real grant
  cannot be driven headless.
- **Fast tiers, worktree:** `node apps/annotate/run_tests.cjs` 333/333;
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` 606/606.
- **Default tier, worktree:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs --durations=15`:
  `2 failed, 2374 passed, 1 skipped, 4 deselected` in 362 s (inside budget,
  recorded). The failures:
  - `test_viewer_js_suite` is the deliberate worktree red, covered by the
    `--repo` run above.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`
    fails because drawing-checker logged a sixth run of the 213668-002
    export today (13:26). The diff does not touch it. Filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
  - The skip: `test_fit_bound_features.py:433`, the 2026-10-01 pitch-link
    bearing re-extraction is not installed.
- **Browser, `--only`, worktree with `--repo C:/workspace/tolstack`:**
  - The new suite, "a press that writes says so at once": 2/2. It prints
    `press -> event 1201 ms, press -> body 1156 ms` on the in-memory store.
    Its first run was red: the watcher observed the slot, which `renderNav`
    replaces. Fixed to watch `#navtree`.
  - Five existing suites whose write path changed: armed pick 18/18, the
    suggestion's Take 5/5, pattern and Add a face 11/11, opposite pattern
    4/4, 3D pane 31/31.
  - The whole tier is the review's (this repo's table), so it was not run here.
- **Witness, one run:** `--only` for each of the five new specs, 5/5
  WITNESSED in 3m02s. The suite's `(skipped: ...)` push is `true` by
  construction, so it has no spec. Its pin was raised and the reason written
  in `scripts/guard_enumeration.mjs`.
- **Jeff's log:** 101 files before, 101 after.

## Gotchas

- **The probe serves the worktree live.** An edit mid-run changes what the
  next page loads. For a clean "before", freeze a copy of `apps/annotate` and
  pass `--annotate <copy>`.
- **A body "change" needs a definition.** The armed line changing to
  `reading face N…` counts as a change. For the armed click, watch the body's
  kind (`armed` → `bound`), not its words.
- **The pane and the shell share one thread** (same origin). A message the
  pane posts is handled only after the pane's current task ends, so work the
  pane does after posting delays the shell's repaint as surely as work before it.
