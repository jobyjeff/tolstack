---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_viewer_nav_wedge_and_classic_retirement.md
reviewer: agent (review session, worktree viewer_nav_wedge_and_classic_retirement-review)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW — viewer_nav_wedge_and_classic_retirement

**APPROVE.** Four deliverables, all met; the wedge fix is declared and
WITNESSED in the mutation tier; the retirement is pinned document-by-document
rather than argued. Two should-fixes filed as issues, one inline fix, one merge
conflict resolved. Merged to `integration`.

## The mandatory stack checks (1–7): not applicable, and why

The work under review is viewer/JS plus tests. The handoff branch touches
**zero** files under `docs/tolerance_stacks/`, `docs/topologies/`,
`docs/spec_library/`, `data/`, `PROVENANCE.md` or `ARCHITECTURE.md`
(`git diff --name-only` over those paths is empty), so there is no element
value, `source_ref`, sign, LMC/MMC mapping, RSS column or `values_source` in the
diff to audit, and no new module owing an inventory row. For the record,
re-derived rather than copied: `tests/debug_report_tolerance_stacks.py --ratio`
reports **5 traced / 3 inferred / 18 untraced, out of 26 element instances**
across the three seeded stacks — unchanged by this branch.

`data/inbox/specs/` untouched; `docs/reference/` untouched; drawing-checker
neither read nor written by this branch or by this review.

## What I verified

### Deliverable 1 — no click may wedge the page

- All three handlers (`onNavTopology`, `onNavStudy`, `onNavStack`) route through
  one `navigate(paint)`; `navFailed` writes the banner and calls `render()`.
- **Declared and WITNESSED.** `mutation_witnesses.json`'s new
  `nav-click-never-wedges`; re-run *after* my `integration` merge, so the anchor
  is confirmed to still resolve: `}, navFailed);` → `});` reddens *"no click
  leaves the page wedged…"*. 1/1 witnessed.
- **Per-handler**, which the single declared entry does not cover: reverting
  `onNavStack` **alone** to `loadWorksheet().then(render)` in a scratch tree →
  browser suite **11/14 FAIL**, including the unhandled-rejection sub-check. So
  the containment is not held up by one shared line that happens to be reached
  through one door.
- **Recovery**: deleting `state.error = null;` → **11/14 FAIL** on three
  sub-checks including *"a read that works clears the banner a failed one
  wrote"*.
- The new suite is a real every-row sweep: **28 rows clicked, 26 of them
  reading** (the runner prints it). Both figures re-derived independently off
  the projections — 5 topologies + 21 studies + 2 leaves = 28, and 26 read once
  the worksheet fallback lands; the 2 that do not are
  `tan_link_to_pitch_plate_take2`'s topology and its one study, whose covered
  stack has `worksheet_file: null`.
- **The handoff's premise about the served origin is wrong, and the lesson says
  so with a measurement** (lesson §1): `storage/http.js`'s `readText` resolves
  `null` on a miss and never rejects, so the served origin is the *absence* path
  and was never the wedge. I confirmed the replacement rule is independently
  pinned (`apps/viewer/tests.js:775` asserts null-on-miss) and that the served
  suite still clicks a nav row and still surfaces a mid-session server stop on
  Reload (15/15). The DoD's "both transports" clause is therefore met for the
  served half by argument-plus-measurement rather than by a second every-row
  sweep — correct, and worth stating rather than a gap.

### Deliverable 2 — the "classic view" chip is gone, and nothing went with it

- `views/nav.js`'s `coveredStacks` block deleted; `VA.navTree` no longer emits
  the key. The fast tier asserts `coveredStacks === undefined` and that no
  rendered row carries `data-nav-id="demo_joint"`.
- The removal's **premise** is pinned, not argued:
  `tests/test_topology_conversions.py` section 4 builds both projections from
  the committed documents and pairs every covered stack against its topology on
  gaps (by `text`), checks (label / verdict / criterion / `excluded_terms`) and
  zero-width count. Non-vacuous by measurement, not only by its own asserts —
  **45 stack gap rows and 13 checks** are really compared across the four pairs
  (11/27/3/4 gaps; 2/9/1/1 checks).
- **The author found the one item the handoff's list missed and fixed it rather
  than filing it**: three of the four converted stacks carry an authored
  `WORKSHEET_*.md` and none of their topologies declares one, so the retired row
  was the only route to three authored documents. `VA.worksheetSubject` is the
  fallback, read in one place so the toggle and the fetch cannot disagree. The
  3-of-4 re-derived off the projections — `pitch_link`, `rotor_fastener`,
  `vpa_output` have sheets, `take2` has none.
- Mutating the fallback away (return `topology` unconditionally) → fast 307/308
  and `--repo` 380/382, naming both the unit rule and the `[real]` count. Not a
  green line.

### Deliverable 3 — take 1 off the rail, both thermal stacks on it

- `VA.SUPERSEDED_STACKS` is a **map**, so the hiding is checkable, and
  `test_every_superseded_stack_the_viewer_hides_is_real_and_so_is_its_successor`
  checks all four halves of the claim against the documents. The Python side
  **parses the JS literal** rather than restating it, with an anti-vacuity
  assert on an empty parse — the right shape for this repo.
- Dropping the filter from `VA.looseStacks` → **4 tests red** across both tiers
  (306/308 fast, 378/382 `--repo`), including the `[real]` live-rail count.
- Live rail measured: the leaves are exactly `hub_bearing_thermal_fit_m1`/`_m2`.
  `[real] every stack the rail offers renders its own page` proves each leaf
  actually paints an `.eltable`, which is the other half of "reachable".
- `?stack=<id>` still resolves a covered **and** a superseded stack — asserted
  directly — and lesson §4 records that `views/stack.js` is therefore not dead
  code.

### Deliverable 4 — the copy

`git grep -ni classic` over `apps/` and the tracked `.md` set: every survivor is
the JavaScript sense ("classic script"), a history/comment sentence about the
retirement, or a test assertion *name*. **No rendered string anywhere says
"classic"**, and three tests assert its absence — from the nav, from a leaf's
page, and from `document.body` in the browser tier.

### Tests, on the merged tree (handoff + `integration` at `dfa0431`)

| tier | result |
| --- | --- |
| `pytest -q` | **1098 passed, 1 failed, 1 skipped** |
| `node apps/viewer/run_tests.cjs` (no `--repo`) | **317/317** |
| `node apps/viewer/run_tests.cjs --repo <fresh scratch root>` | **395/395** |
| `node scripts/run_viewer_browser_tests.mjs --repo <same>` | **20/20 suites** |
| `run_mutation_witness_tests.mjs --only nav-click-never-wedges` | **1/1 WITNESSED** |

The one failure is pre-existing and not this branch's:
`test_every_byte_identity_claim_in_a_live_file_names_its_verification`, on a
sentence in `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`.
Confirmed red on `integration` itself, and **already filed five times** by five
sessions (`ISSUE_20260915_byte_for_byte_claim_in_a_strategy_brief_…`,
`…_byte_identity_claim_in_origin_posture_brief_names_no_verification`,
`…_byte_identity_guard_red_on_the_origin_posture_brief`,
`…_byte_identity_guard_reds_the_suite_on_a_triage_authored_brief`,
`…_strategy_brief_byte_identity_claim_fails_the_provenance_guard`). **This
handoff correctly filed no sixth** and named an existing one in its lesson.
Triage should close four of the five.

**The `[real]` tier needed a scratch root, and the reason is worth recording.**
The shared `data/projections/viewer/` is stamped
`branch: review/viewer_respine_whole_walk @ a1db07e`, which is **not** an
ancestor of my HEAD — a live sibling review worktree holds four commits I do not
have, so `--allow-older-tree` against the shared root would have clobbered a
newer tree. Against the shared (stale) projection the `[real]` tier reported
394/395, failing `[real] the pitch system's grouping…` on
`"propeller hub -- the ground every load path returns to" !== "propeller hub"`.
That is **not** this branch: `integration`'s own
`viewer_component_names_and_reference_copy` rewrote part names in
`docs/topologies/*.json`, and the on-disk projection predates it. Rebuilt
`results.json` and `topologies.json` into a private scratch root seeded from a
copy of the real `data/` — 395/395 and 20/20 there. Nothing shared was written;
the shared projection's mtimes and `built_at` are untouched, and
`git status` in the main checkout is clean.

## Findings

### Should-fix (both filed; neither blocks)

1. **Two of `navigate()`'s contracts are unwitnessed in every tier.**
   `ISSUE_20260915_navigates_stale_worksheet_clear_and_sync_throw_door_are_unwitnessed.md`.
   Measured by mutating each line in a `git archive` copy and running all three
   tiers: deleting `state.worksheetText = null;` from `navFailed` leaves
   **308/308, 382/382, 20/20** — and it is reachable and wrong on screen,
   because `paint()` decides the worksheet toggle from the projection's
   `worksheet_file` while `views/worksheet.js` prints the *new* subject's
   `.worksheet__path` over the *old* node's `.worksheet__body`, skipping the
   "could not be read from the connected folder" branch that line exists to
   reach. Removing the `try` around `loadWorksheet()` is likewise green
   everywhere; there the comment's stated door is also narrower than claimed —
   `FsaAdapter.readText` and `HttpAdapter.readText` are `async`, so a
   `requireReady` throw arrives as a *rejection*, and only `MemoryAdapter` (not
   `async`) or a null `adapter` can throw synchronously, the latter returning
   from `boot()` before any nav row exists. The shipped code is right; the
   coverage is not, and the fix is one dialog assertion plus a second
   `mutation_witnesses.json` entry on the suite that already exists.
2. **The 3D-reach strategy brief now argues from two retired facts.**
   `ISSUE_20260915_the_3d_reach_brief_still_argues_from_covered_stack_nesting_and_a_loose_majority.md`.
   `BRIEF_20260911_viewer_3d_and_card_content_reach.md` §1 and its `triaged`
   issue ask a decider to choose between "a stack-mode nav axis" and "reach 3D
   only via topology re-expression **(covered-stack nesting)**", sizing the call
   on "**Most real stacks are loose today**". The nesting no longer exists, and
   loose stacks are now **2 of 7**, both of them the thermal-fit archetype that
   has no topology *by design* — which inverts the sizing argument rather than
   narrowing it. Lesson §9 spotted the issue and called it "narrower than it
   reads"; it did not notice the brief carries the same two sentences. Filed,
   not edited: the correction changes what a pending decision is about, which is
   that track's call. Routed `audience: strategy`.

### Inline fix (one, on the branch, reported not silent)

- `scripts/mutation_witnesses.json`, `nav-click-never-wedges`.`note` said
  *"pitch_system and the two thermal stacks are the ten rows that can see a
  failed read at all"* — the **pre-fallback** count, written in the same commit
  that raised it to 26 of 28. Rewritten to give both figures with the
  before/after and to point at the count the suite prints. A stale count in the
  one artifact a future agent reads to decide whether a witness still bites.

### Nits (no issue)

- Lesson §1's *"Before this session that was 10 of the 28 live nav rows"* is
  arithmetically right for the set it names (of the 28 rows that **survive**,
  10 read under the old rule) but reads as a claim about the pre-change rail,
  which had **33** rows of which **14** read (1 topology + 7 studies + 3 covered
  stack rows + 3 leaves). Both derivations check out; only the sentence is
  ambiguous. Left as written.
- `test_every_missing_tolerance_a_covered_stack_flags_is_a_gap_row` is `0 == 0`
  for three of the four pairs; only `rotor_fastener_length` (2) exercises a
  non-zero count. One real case is enough for the shape, and the assertion is
  count-derived rather than hard-coded, so a growing case stays covered.
- `apps/viewer/README.md:1268` calls the new `[real]` worksheet test "the fast
  tier's", where this repo's vocabulary reserves "fast tier" for the
  non-`--repo` half. It is a sub-tier of `run_tests.cjs`, so not wrong, just
  loose.
- `VA.SUPERSEDED_STACKS` has the pairing test but not the sibling guard the
  status tables carry (`test_no_key_is_attached_to_a_status_table_from_outside_its_literal`),
  so `VA.SUPERSEDED_STACKS.x = "y"` written elsewhere would be invisible to the
  regex that parses the literal. Nothing does it, and the anti-vacuity assert
  covers the emptied-table direction; not worth an overlay entry.

## Merge and conflict resolution

`git merge handoff/…` into the review branch was clean. Merging the **moved**
`integration` (`dfa0431`, which landed `viewer_component_names_and_reference_copy`
mid-review) conflicted in **`scripts/mutation_witnesses.json`** only.

- **Both sides append to the tail of the same array.** The handoff added
  `nav-click-never-wedges`; `integration` added
  `component-cell-prints-the-name-not-the-id`,
  `pdf-link-withheld-where-the-origin-cannot-follow-it`,
  `no-workstation-path-in-rendered-copy` and
  `preview-pane-widens-when-its-divider-is-dragged-left`.
- **Resolution: keep all five**, in branch-point order, as siblings. Purely
  additive — no entry on either side was edited, and no `find` anchor is shared
  between the two sets, so neither side's witness can shadow the other's. 23
  entries after the merge; `tests/test_mutation_witnesses.py` (the cheap anchor
  half) green, and the new entry re-witnessed on the merged tree.

## For the next reviewer

Three entries added to this repo's overlay (`docs/prompts/REVIEW_AGENT.md`):

1. A **third sighting** appended to the "count the contracts / mutate every
   half" entry, moving where you read the contracts from — the new function's
   own comment, one per paragraph, rather than the handoff's deliverable list.
   `navigate()` states four in four paragraphs; one is declared, one reddens
   anyway, two are green everywhere when deleted.
2. **New:** a scratch `--repo` root under the agent scratchpad blows Windows
   MAX_PATH, and the symptom is a projection with **zero installed meshes and
   exit 0** — `installed_meshes()` skips a sidecar that is not `is_file()` by
   design, so a >260-character path is indistinguishable from an unnamed mesh,
   and the two `[real]` failures then *name the wrong cause* ("rebuild the
   topology projection against the main checkout's data/meshes"). Cost me two
   rebuild cycles. Put the scratch root at `%TEMP%/tsrev` and check the mesh
   count before reading any `[real]` result.
3. **New:** retiring a route invalidates prose in **other tracks'** issues and
   briefs, which no doc-scan guard in this repo reads — `docs/issues/` and
   `docs/strategy/` are exempt as dated history, but a `status: triaged` issue
   carrying a `strategy:` pointer is a pending decision, not history. `git grep`
   the retired mechanism's own nouns there too, and file rather than fix.
