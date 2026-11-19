---
type: review
handoff: docs/sessions/active/HANDOFF_20261118_the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page.md
reviewer: agent
date: 2026-11-19
verdict: APPROVE
blockers: 0
---

# Review — the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page

**APPROVE**, with one wrong causal attribution corrected inline (a dated
correction blockquote on Jeff's page and on the latency issue's addendum).

The work is a walk: one review page for Jeff, a lesson, 20 shots, two new
issues and five issue addenda. **No code.** `git diff --name-only
integration...handoff/<slug>` touches nothing outside `docs/`. The merge into
`review/<slug>` was a fast-forward (`a7a05123` → `515694d6`), so the merged
tree is the tactical agent's own tree. Every status letter is `A` except five
issue files, and those five are `M` with 0 deleted lines each (appends only).

This is not a tolerance stack, so the overlay's mandatory checks 1–7 do not
apply: no element, band or `source_ref` was added or changed. The walk's
"cited" and "gap" words for the end-stop model were checked against the
topology instead (below).

## What I verified, and how

| Claim on the page / lesson | How I checked it | Result |
|---|---|---|
| Real log 101 files before and after, sorted listing hashes to `f1e06978…` | `ls data/inbox/feature-identity \| wc -l` and `sort \| sha256sum` in the main checkout, now | 101, `f1e0697898e8…`. Holds |
| `master` is `448311a4`, 59 commits behind `a7a05123`, and is what the main checkout serves | `git rev-list --count master..a7a05123`, main checkout `HEAD` | 59, `448311a4`. Holds |
| 20 shots, 7 issue files | diff listing | 20 PNGs, 2 `A` + 5 `M`. Holds |
| End-stop table: 36 constraints, 72 ends, 21 → 29 bound, 43 unbound | summed the rows by hand | 36, 72, 21, 29, 43. Holds |
| v2 has 21 gap edges and 49 dimensions inside parts | counted `topology_vpa_end_stop_v2.json` edges by `kind` | 21 gap, 49 structural. Holds |
| Of the 49: 43 wait on a part drawing, 2 are cited bushing-bore position callouts, 4 are bushing walls waiting on NAS77 / 214820-002 | read every bushing edge's `note` | 6 bushing structural edges read as stated. The rest name 213668/214700/215175/214373/214958/216332/215071/214698/214699 and other drawings, none of which is in `data/inbox/drawings/` (6 PDFs there: 212966-006, 214588-002, 214589-002, 214955-004, 214959-002, 215735). Holds |
| Plate bore callouts Ø7.950 +0.015/0 and Ø8.520 ±0.008, 215735-A sh 2 SECTION A-A | v2 edge notes | Match the notes word for word. I did not re-open the PDF, since the walk adds no citation and only repeats the model's own |
| Contact engine has candidates for 20 of 21 v2 gap edges; blade boss ↔ arm bore holds 1060/1061 … and 253/254 | read the scratch root's `contact_suggestions.json` | 20 `ok` with candidates, 1 `no_contact`. Holds |
| Jeff's log holds five Keep events 0096–0100 | read the five files | Holds, but see finding 1 for what they show |
| Shots match their rows | read `02a`, `02d`, `03a`, `10c` with vision | `02a` shows "2 sets of faces disagree" with two Keeps, Pick a face and Unbind. `02d` shows "bound · 2 faces of 215177-001" with Correct, Add a face, Unbind and two Removes. `03a` shows the dotted assembly outline around 215177-001, the tangential link's flanged bushing and 215735-001, with the pitch link's flanged bushing as a small box under it. `10c` shows "5 of 5 holes Ø5.2" with five holes washed yellow. All match |
| No duplicate of the new contact-faces issue | `git grep -il contact integration -- docs/issues/`, read the titles | None covers the feature body in the tree. New |
| Shot folder size | `du -sh` | 16 MB, within the precedent of earlier walks (25–45 MB) |

## Findings

### Should-fix, fixed inline

1. **The page names the wrong cause for Jeff's "Keep seemed to do
   nothing".** `REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`,
   "What is still wrong", first bullet, says the 20–27 s Keep wait "is why
   Keep 'seemed to do nothing'". The latency issue's addendum says the same.
   Jeff's Keep events 0096–0100 (2026-11-18 06:38–06:40 Z) carry **no
   `supersedes`**. The walk's own Keep (scratch 0101) supersedes all eight of
   0093–0100. On 11-17 trunk's `cmdKeep` wrote a plain `bound`, which can
   never settle a disagreement between feature-keyed bindings. The Keep
   handoff traced exactly that
   (`docs/sessions/completed/HANDOFF_20261118_a_disagreement_is_settled_by_keep_or_let_go.md`,
   "What happened"), and its fix (`fcc72d39`, 2026-11-18 19:33 PST) came after
   his presses. The latency is real and correctly filed. It is not what
   happened to him, and on the page Jeff reacts to, a wrong "why" points the
   next batch at the wrong fix. **Fix:** a dated correction blockquote under
   that bullet and under the addendum. Original text left intact. This is
   docs only, a few lines, and needs no test, so it is within all three
   prongs. The W1 verdict ("partly") stands.

### Nits, not fixed (no issue needed)

- `ISSUE_20261119_small_findings_of_the_binding_flow_and_pitch_plate_walk`
  bundles six unlike findings at `priority: low`. **F4** is a write-path
  defect: a pattern Take bound 11 of 12 faces and left out a face it had just
  offered. That is a data error in a binding, not polish, and triage may want
  it split out at `med`. It is filed, and triage can split it, so I added no
  twin.
- The end-stop table counts seats and patterns as "constraints" (36), while
  v2 stores them as structural edges. So "36 constraints" and "49 dimensions
  inside parts" overlap rather than partition the model's 70 edges. The page
  never claims they partition, so this is wording only.
- `data/scratch/walk1118` (the walk's scratch root, with copies of
  `data/inbox` and `data/meshes`) is still in the main checkout. The lesson
  says it is safe to delete after review, but F4 and F5 cite its events
  0102–0111 as evidence, so I left it for whoever takes those issues.
  Gitignored. Nothing on a branch.

### Checked and clean

- **Real log untouched** (above), stated on the page as the DoD asks.
- **The served commit is stated in one plain sentence** at the top of the
  page, and so is the fact that 8000 has none of it.
- **The DoD's order:** what Jeff can do now, then what is still wrong, then
  the decisions, then tables. The walk's four rows each cite a shot.
- **Deliverable 3:** the handoff's suggested joint (gas-spring mount ↔
  piston cover) was 5 of 6 by Jeff's own hand. The walk said so and bound
  blade root ↔ pitch arm from 0 of 6 instead. That is a sound substitution,
  and the page states it.
- **Deliverable 4:** D1–D6 are present. The joint-play question is not
  re-asked. The play table names which edges the pitch plate handoff already
  authored as gap edges (the two lugs) and which diameters are cited (only
  the plate bores).
- **Issue frontmatter:** both new issues have `type`, `priority`,
  `status: open`, `area`, `reporter: agent` and `found_by:` (not
  `handoff:`). The addenda are appended under dated headings.
- **No design surface changed**, so there is nothing for the design check.
- **Lesson arithmetic:** 20 PNGs, 7 issue files, 101 → 112 in the scratch
  copy (11 events, 0101–0111), 83 → 100 real events since 11-17. All
  re-derived.

## Tests

- **Tactical record:** default tier at `976888e4`, `1 failed, 2372 passed,
  1 skipped, 4 deselected in 464.83 s`, single process. The one failure is the
  documented worktree red (`tests/test_viewer_js_suite.py`). Fast tiers:
  viewer 505/505 (node-fs skipped), viewer `--repo` on its scratch root
  605/605 with `[real]` armed, annotate 331/331. Recorded and consistent with
  a docs-only diff.
- **Pre-merge risky subset:** none needed beyond reading. The diff is
  `docs/sessions/` and `docs/issues/` only, and both are outside the claims
  corpus (`HISTORICAL_PREFIXES`), so no prose guard can see it.
- **Post-merge, in this worktree** (same tree as the tactical's, plus my two
  blockquotes and an overlay entry):
  - `node apps/annotate/run_tests.cjs`: 331/331.
  - `node apps/viewer/run_tests.cjs`: 505/505, node-fs tier skipped. That is
    the worktree's unarmed tier, and the tactical's armed 605/605 ran on the
    same tree.
  - Default pytest: see "Post-merge suite" below.
- **Browser tier and witness gate: not run.** Per `CLAUDE.md`'s table, a diff
  touching nothing outside `docs/` runs the two fast tiers only.

## Overlay

Added one line under the first "Recurring bugs" entry (the merged-page shot
entry). A walk's "that is why" about what Jeff saw describes trunk's code at
his event's timestamp, not the merged code. Diff his events against the
walk's.

## Post-merge suite

`C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -rs`,
single process (this venv has no xdist, so `-n 16` is refused), in this review
worktree on `515694d6`:

- **Result:** `1 failed, 2372 passed, 1 skipped, 4 deselected in 453.29s`.
  These are the tactical record's counts exactly.
- **The failure** is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the documented worktree red (no `data/projections/viewer/` here).
- **The skip** is `tests/test_fit_bound_features.py:433`.
- **Contention header:** this repo's conftest prints no contention header.
- **Recorded:** `suite-time record --tier default --seconds 454`, which
  printed `inside budget`.
- **Data pollution:** the main checkout's `data/` top level is unchanged
  after the run, and the real log still holds 101 files.
- **Prose guards:** after my overlay edit (`docs/prompts/` is in the claims
  corpus), `tests/test_tolerance_stack.py`, `tests/test_provenance.py`,
  `tests/test_thermal_exception_list.py` and `tests/test_claims_registry.py`
  gave 222 passed.
