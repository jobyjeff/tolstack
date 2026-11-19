# LESSONS 2026-11-18 — a_disagreement_is_settled_by_keep_or_let_go

Jeff's note `20261117T224550_onme22`: the pitch plate's link bore read "6 faces
disagree", Keep "seemed to do nothing", and nothing let the faces go.

## The one click Jeff makes

On his own page, open **215177-001 Pitch plate · pitch plate pitch-link
attachment bore** (under "pitch plate link bore to pitch link upper bearing
centre"). It now reads **2 sets of faces disagree**, a line each:
`faces 1380, 1381` and `faces 1380, 1381, 1509, 1510`. Press **Keep** under
the set that is the bore — `faces 1380, 1381`, the plate's own split
cylinder; 1509 and 1510 are the bushing (solid 4), the next handoff but one's
subject. One event is written, superseding all eight standing bindings
(0093–0100), and the feature reads `bound · 2 faces of 215177-001`. If neither
set is right, **Unbind** lets them all go (one event), and **Pick a face**
starts again.

## Where the settling lives: the event, not the fold

A v1 event's `supersedes` (and a `retracted` event's `retracts`) may now name a
**list** of ids. Keep, Add a face and Remove write the feature's whole set
superseding every feature-keyed binding it holds (`AA.buildFeatureSetEvent`);
Unbind writes one retraction naming every binding (`AA.buildLetGoEvent`).

The fold alternative — "a feature-keyed correction replaces every earlier
feature-keyed binding" — needed no schema change, but was rejected for two
reasons. (1) It hides bindings the event never names: the log would no longer
say what each event did, and history would have to be re-derived from a rule.
(2) It would have silently settled Jeff's existing log before he clicked
anything (0096–0100 are plain binds, but any future correction would sweep
unnamed bindings away), and the handoff's "6 faces disagree → Keep → settled"
is a statement about his click, not about a new reading of old events.
One id stays a string, so every earlier event and every reader reads exactly as
before; a list is allowed only on v1, never empty, never repeated, each id held
to the one-id rules (`_check_named`, `superseded_ids` / `retracted_ids`, and
`VA.namedIds` in the browser fold). `tests/test_identity_fold_is_paired.py`
folds Jeff's shape both ways.

## The cause of the double write (0093 and 0094)

**Reproduced.** Both events end in the bare edge slug (`-pitch_plate_attach_
radius`), the shape `writeAnswer` writes for an armed bind or a **Take**. The
shell's mirrored rows (a candidate or mate line's Take) reach the pane as a
`annotate:rail` button gesture → `railExec` → `AA.exec` **unqueued** (the
shell's own `annotate:exec` commands go through `ExecQueue`, which serialises
them). `cmdTake` reads the part's faces (`surfaceSiblingsOf`) before it writes,
which on the plate takes 8–40 s; a second press waited on the same reading,
both resumed together, both listed the folder, both took seq 93. On disk the
writer's filename bump turned the second into `0094_…` with `seq: 93`.

On an `integration` export of `apps/annotate`, two `take` commands started
together (`tests/debug_keep_or_let_go_20261118.mjs --only take --annotate
<export>`) both returned `bind` and both wrote faces 1380+1381 under seq 101.
On this branch the second returns `busy` and one event is written.

What I tried first and what it showed: a double click on face 680 in the
armed scene, and two `onPick`s started together, wrote **one** event on the
pre-fix pane too — the armed click disarms before the second resumes. So the
armed path was not Jeff's; the Take was. (Faces 1380/1381 are not visible
from the default framing, so the armed reproduction could not use the bore
itself.)

**The fix, two layers:** every identity-writing verb (`take`, `accept`,
`keep`, `unbind`, `drop-face`, `group`, `flip`) and an armed click hold one
flag (`oneWriteAtATime` / `identityWriteBusy`); one that arrives meanwhile is
dropped with `{action: "busy"}`. And `nextEventSeq(count)` reserves the seqs it
hands out, so even a write that got past the flag cannot share a seq with
another from this page. While a click is read, the armed line says
`reading face N…` (the click used to show nothing for 8–40 s, which is why
Jeff pressed again); that wait itself is filed
(`ISSUE_20261118_a_bind_on_the_pitch_plate_takes_ten_to_forty_seconds_to_write.md`).

## The three shots (read before this was written)

`docs/sessions/lessons/shots/a_disagreement_is_settled_by_keep_or_let_go/`,
the served page on drawing-checker's mount shape, a fresh scratch copy of
Jeff's log per run:

- `01_before_two_sets_disagree.png` — "2 sets of faces disagree", the two set
  lines each with Keep, then Pick a face and Unbind; the tree mark is
  `suggested`, no bore face lit.
- `02_after_keep_one_set_bound.png` — Keep on `faces 1380, 1381`: one event
  (`0101_…_kept`, `supersedes` the eight ids), body `bound · 2 faces of
  215177-001` with face 1380 / 1381 and Remove, tree mark bound (green), toast
  "kept face 1380".
- `03_after_unbind_not_bound.png` — Unbind on a fresh copy: one `retracted`
  event naming all eight, body "not bound" with Pick a face, toast "unbound:
  pitch plate pitch-link attachment bore".
- also `04_armed.png`, `04_reading_the_click.png` (the armed line while a click
  is read) and `05_after_double_click.png` (one event, face 680, body bound).

**The real log's file count was 101 before and 101 after every run** (the
probe prints it each time; every write went to `data/scratch/`).

## Every site the outcome reaches (deliverable 6)

Measured by the probe after Keep and after Unbind: the **tree row's mark**
(suggested → bound / none), the **feature body**, the **3D pane's lit faces**
(`listMarks("bound")` on the plate: 487 only → 1380, 1381, 487 → 487 only),
and the **end view the sweep rail's rows read** (`__endsBound`: none → the
four bore ends at 1380/1381 → none). All agree. **The map's feature marker**
(a pin) carries no binding state at all (`apps/viewer/views/map.js` draws
pins by body tint), so it neither changes nor disagrees — left alone, and the
map was fenced out anyway. The sweep rail itself was not opened in sweep mode;
its rows read the same end view checked above.

Hovering a set's line lights only its first face (`hover face` takes one) —
filed: `ISSUE_20261118_a_disagreeing_sets_line_lights_only_its_first_face.md`.

## Gotchas for the next session

- **Witness anchors on code you rewrite.** Four specs' `find` strings sat on
  lines this change rewrote (`identity_fold.js` ×2, `nav.js`, and a
  `binding_state.js` line now present twice). A quick script over
  `scripts/mutation_witnesses/*.json` counting each `find` in its file catches
  it before the suite does.
- **A guard's spec filename is derived from its name.** Changing an
  assertion is free; changing the guard's *text* orphans its spec. I changed
  the armed-body check's assertion (`Cancel,Unbind`) and kept its name.
- **The scratch root needs `docs/` too**: five `[real]` worksheet checks read
  `docs/`, and fail as "worksheet must be readable" without it.
- **pytest here has no xdist**; `-n 16 --dist loadfile` is a usage error.
  Run `pytest -q`.
- `tests/debug_keep_or_let_go_20261118.mjs` is the probe (`--only keep |
  unbind | dbl | take`, `--annotate <dir>` to serve another tree's pane).
