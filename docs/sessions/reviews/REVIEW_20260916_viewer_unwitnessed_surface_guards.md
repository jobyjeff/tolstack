---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
reviewer: agent (review/viewer_unwitnessed_surface_guards)
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — viewer_unwitnessed_surface_guards

**APPROVE.** All seven deliverables landed with their witnesses, deliverable 8's
derivability answer is a real answer rather than a restatement of the question,
and the one thing this handoff could not be allowed to do — add a guard nobody
has watched fail — did not happen: **I re-ran the mutation tier myself and got
37/37 WITNESSED, with all eight new entries named individually in the output.**
Two arithmetic slips in the lesson, corrected inline. No blockers.

## The merge

Clean fast-forward, `82d3a95` → `80d503f`. No conflict, so nothing about the
green suite is owed to a resolution of mine. The tactical worktree was clean —
nothing to commit on the author's behalf.

## What I verified, and how

Measured in this review worktree with `node_modules` junctioned to the main
checkout and `--repo C:/workspace/tolstack` (forward slashes — the checklist's
own first entry).

| | handoff baseline | measured after merge |
| --- | --- | --- |
| `pytest -q` | 1155 | **1165 passed, 1 failed, 1 skipped** |
| `run_tests.cjs --repo` | 407/407 | **411/411** |
| `run_viewer_browser_tests.mjs --repo` | 20/20 | **20/20** (315+315) |
| `pytest -q tests/test_viewer_crops.py` | 73/73 | **80/80** |
| `run_mutation_witness_tests.mjs --repo` | — | **37/37 witnessed** |

**The pytest red is not this session's.** It is
`test_no_live_document_states_an_unguarded_hardware_entry_count` false-positiving
on prose in `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`,
and neither that brief nor `tests/test_tolerance_stack.py` is in the diff at
all (9 files changed, both absent). Already filed **twice** — `..._matches_other_
three_do_not_in_unrelated_prose.md` and `..._matches_the_other_three_in_unrelated_
prose.md`, both `high`, both `open`, `area:` spelled two different ways. The
session correctly did **not** file a third; per the overlay's "Seven issues, one
red" entry, triage should collapse those two into one.

**Independently re-witnessed by hand, beyond the declared tier** (each planted
in a `git archive` scratch copy, run, reverted):

- **1b**, `companion = None` in `_crop_from_citation` → reddens exactly
  `test_the_builder_emits_the_parts_list_companion_beside_a_balloon_crop`
  (1 failed, 79 passed).
- **1c**, `"drawing_no": None` → reddens exactly
  `test_the_builder_carries_the_drawings_own_number_and_revision`.
- **Deliverable 2's field-goes-absent arm**, which is the one the declared
  witnesses structurally cannot reach: `cropHighlightsIn` made to return `[]`
  (the collector seeing what a builder that stopped writing `highlights` would
  give it) reddens `[real] no live value is one the viewer has no branch for`
  with *"crop entry highlights[].kind, crop and companion alike: no live value
  found — either the collector in tests.js is wrong or the builder stopped
  writing it"*. The row is genuinely wired into the empty-collector arm.
- **Deliverable 2's malformed-`frac` arm**: `box.frac.length === 4` → `=== 5`
  reddens the new `[real] a live crop really draws the boxes its own index says
  are worth looking at` **plus** the four fixture-tier checks the lesson §4
  credits — 406/411, exactly as claimed.
- **Deliverable 6**: renaming `VA.GAP_KINDS`' `no_tolerance_recorded` key
  reddens `[real] no live topology value is one the page cannot render` (the new
  row's sweep) and the older `[real] every live gap row…` — 409/411.

**The inline repair (`1874696`) was necessary and is not the session's own
mess.** I reproduced it: `git show 82d3a95:apps/viewer/tests.js` over a scratch
copy, `--repo C:/workspace/tolstack` → **406/407**, `[real] a study fed by a
zero-width row warns…` failing on the hard-pinned `NAS1149V0332H`. `5ce16f3` is
on `integration` and its message says it removed that band. Since one red
`fast`-tier check makes `run_mutation_witness_tests.mjs` report **all 18**
`fast` entries as NOT WITNESSED, this was on the critical path for four of the
handoff's own DoD items, not adjacent to it — repairing it rather than only
filing it was the right call, and the repair is the durable form (rows derived
from `study.result.chain` through `index.edges`, with an `ok(zeroWidth.length
>= 1, …)` precondition). It survived the projection being rebuilt **again**
under this review, by a third session
(`review/python_value_and_schema_pins`, `2026-09-16T21:59:03Z`), which is the
proof the derivation was worth taking.

**Every live number the lesson quotes, re-derived off the projection as it
stands now** — all correct: `by_stack` 28 `verified_match` + 16
`declared_region` + 4 companion `verified_match`; `by_topology` 2 and 1;
4 companions in `by_stack`, 0 in `by_topology`; 7 entries with a `drawing_no`;
`by_topology` 24 entries, 6 resolved, and its `resolved_by`/`located_by`/`status`
values are every one already in `by_stack`'s sets (so §3's "broadening
`cropEntriesIn` would widen by zero values today" holds); gaps 18/38/29/11/8
with all four kinds live and `no_tolerance_recorded` down to 1;
`rotor_fastener_length` 1 zero-width edge of 12 and every other topology 0.
`VALUE_GUARDS` is 16 rows and `TOPO_VALUE_GUARDS` 16 (15 before), and §2a's
"5 of the 16 stack rows have no `VA.*` table" is exactly the five `inList(…)`
rows it names.

**Scope and fences held.** `scripts/run_mutation_witness_tests.mjs` untouched;
`mutation_witnesses.json` is purely additive at the tail with no existing entry
edited (including `card-layout-out-of-flow`); `apps/annotate/`,
`docs/reference/`, `data/inbox/specs/` untouched; `scripts/build_viewer_crops.py`
unchanged (1b/1c are tests only) and `data/projections/viewer/` not rebuilt by
this session. The only product-code edit is deliverable 5b's comment, and its
four factual claims about the adapters check out line by line (`fsa.js:98` and
`http.js:212` are `async`; `memory.js:46` is not and calls `requireReady` first;
`node_fs.js:60` is not and wraps a synchronous `_io.readText`). The browser-tier
work reaches past the handoff's literal scope sentence ("the `SUITES` run loop
and the `testNavNeverWedges` suite") into `testTheTopologyPage` and
`testRealDataRenderPath` — but deliverables 1a and 1d ask for exactly those
observations in as many words, and 1a points at `CARD_LAYOUT_VIEWPORT` in that
file, so the deliverables authorise it. No `data/` pollution: `crops.json` and
`results.json` in the main checkout are untouched by any run of mine.

**Deliverable 8 is a real answer.** "A row's `values()` is a path, and a path
exists only in the Python that writes it and the JS that reads it — in neither
case as data" is the concrete *no, because X* the brief asked for; the
keyed-coverage middle option is argued with a hit rate rather than asserted;
and §2d's discriminator — *does this registry claim to cover something else, or
is it the source?* — answers the brief's "may legitimately resolve differently"
warning with a rule. Leaving it unfiled as an issue, on the grounds that filing
one would pre-empt the brief, is the right call and is stated as a choice.

## Findings

### Should-fix — both fixed inline (correction blockquote, per the canonical prompt)

1. **`LESSONS_…md:4` and `:29` — "six new entries", and the lesson lists
   eight.** `mutations[]` went **29 → 37**; §1 itself names eight ids
   (`card-crop-overlay-frame`, `pane-` / `card-fetches-the-parts-list-companion`,
   `stack-pane-` / `topology-pane-crop-block-keeps-its-prefix`,
   `grid-marks-a-row-with-no-tolerance`, `nav-failure-clears-the-stale-worksheet`,
   `suite-prints-the-registry-key-it-was-handed`). The 37/37 total is right, so
   this is a count of the session's own output that its own section contradicts
   — the exact shape the canonical prompt's "audit the lesson's arithmetic"
   check was promoted for. **Fixed:** dated correction blockquote at the head,
   with the one-line derivation, plus a pointer at §1's head.

2. **`LESSONS_…md` §2c — "Eight had a `TOPO_VALUE_GUARDS` row before this
   session" makes the paragraph total ten tables for nine.** `JS_PAIRINGS`'
   nine are `TOPO_ROW_KINDS`, `TOPO_LINK_KINDS`, `STUDY_STATUSES`,
   `VALUE_SOURCES`, `NODE_KINDS`, `EDGE_KINDS`, `TRANSFORM_KINDS`,
   `MESH_FACT_FIELDS`, `GAP_KINDS`; exactly the first **seven** were already a
   row's `known` table. `VERDICTS`/`VERDICT_SCOPES` are the easy miscount — they
   have rows but are `viewer.js` tables outside `JS_PAIRINGS`. The conclusion
   (one hit, one exclusion, hit rate 1-for-1) is unaffected, which is why this
   is a correction and not a blocker. **Fixed:** correction blockquote in place.

Neither needs an issue: both are fixed on the branch.

### Nits

3. **`run_viewer_browser_tests.mjs` — `260` is now restated by hand in three
   places against `style.css`'s `max-width: calc(260px * var(--crop-ratio, 1))`,
   with nothing pairing them**: `overlay.blockWidth / overlay.ratio > 260`,
   `Math.abs(overlay.img.height - 260) <= 1.5`, and the sub-check *name*
   ("the card's 260px crop cap really bites here"). Not silent — a correct
   change to the cap reddens loudly rather than passing vacuously, which is the
   better failure direction — but it reddens for the wrong reason, and the
   check name would then be a lie. Cheapest fix if anyone touches the cap: read
   the cap out of `getComputedStyle` in the same `page.evaluate` that already
   reads `--crop-ratio`, and compare against that. Left as-is; the geometric
   witness is worth more than the coupling costs today.

4. **`LESSONS_…md:16` — "19/37 (see §6)" points at the 5b section**; the 19/37
   story is §7. Fixed inline (one character).

5. Deliverable 3's fast-tier check substitutes an origin-free class *sweep*
   (`unseparatedPrefixes`) for the handoff's literal "require
   `div.detail__crop-links` to exist". The deviation is right — `VA.localFileUrl`
   withholds the links row over `http` and `tests.js` runs at both origins — and
   per the overlay's "measured deviation" entry I checked what reddens if
   someone puts the handoff's literal version back: the browser tier's
   `[suite http]` pass does, so the deviation is itself pinned by the harness
   rather than only by the lesson. No action.

## Dispositions I made as the merge gate

- `ISSUE_20260916_a_real_check_still_pins_the_zero_width_washer_the_rotor_citation_
  fix_removed.md` → **`status: resolved`**, with a dated section recording the
  independent 406/407 repro. The issue's own last line asks for exactly this
  ("close it when that branch reaches `integration`") and nothing else would
  ever have read it: it carries `found_by:` (correct for a filing), and only
  `handoff:` gets dispatch's auto-resolution. Left `open` it would have sat on
  the board describing a defect that no longer exists.
- The other two filings — `showcrops_own_companion_fetch_…` (`chore`/`low`) and
  `the_mutation_witness_table_has_no_tier_for_a_pytest_guard` (`feature`/`med`)
  — describe work genuinely not done here and stay `open`. Frontmatter on all
  three is exactly to contract: closed-set `type`/`priority`/`status`,
  `reporter: agent`, `found_by:` and no `handoff:`.

## Overlay

Added one **Recurring bugs** entry, which is the genuinely new class this
review found: *an issue filed AND fixed on the same branch, left `status: open`
with "close it when this reaches `integration`" in its prose — that instruction
is addressed to the reviewer and nothing else will ever read it.* It is the
mirror of the existing "file it before you write APPROVE" rule, and it names
why `found_by:` cannot be swapped for `handoff:` to get the automation.

Nothing pruned. Two existing entries fired usefully and needed no edit (second
sightings): **"Single-sourcing a RENDERER hands the class prefix to the
callee"** (deliverable 3) and **"Single-sourcing replaced N hand copies with
ONE argument — now mutate it"** (deliverable 7) — both predicted this handoff's
subject matter, which is the checklist working as designed. **"A 'per row'
replay that substitutes a STUB for the row's own collector"** is what made me
test deliverable 2's row with its *real* collector rather than trusting
`replayBlindCollectors`; it held.

## For the next reviewer

- `run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` takes several
  minutes and is the only thing that distinguishes 19/37 from 37/37. A green
  `run_tests.cjs` does not. Run it on any handoff that touches a guard.
- The shared projection moved **twice** during this handoff's life (20:50Z and
  21:59Z, two different sessions) and `rotor_fastener_length`'s zero-width count
  went 2 → 1 in the middle of it. Re-derive any live number before quoting it;
  the four numbers the lesson corrects are all this cause.
- `node_modules` is gitignored, so a fresh review worktree needs
  `New-Item -ItemType Junction -Path <wt>\node_modules -Target C:\workspace\tolstack\node_modules`
  before the browser tier will start. Still documented nowhere but two lessons.
