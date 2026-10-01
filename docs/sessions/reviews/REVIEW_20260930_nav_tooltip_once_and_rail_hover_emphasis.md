---
type: review
handoff: docs/sessions/active/HANDOFF_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
reviewer: agent
date: 2026-09-30
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-30 — nav_tooltip_once_and_rail_hover_emphasis

Branch under review: `handoff/nav_tooltip_once_and_rail_hover_emphasis`
(6 commits, `519851f`), merged into `review/nav_tooltip_once_and_rail_hover_emphasis`
at `9d49f5c`'s base. **Merged clean, no conflicts** — which is worth saying,
because the sibling `columns_ordered_to_minimise_crossings` landed on
`integration` after this branch was cut and touches two of the same files
(`apps/viewer/tests.js`, `apps/viewer/README.md`). `git log --oneline HEAD..master`
is empty, so nothing else moved underneath it.

**Verdict: APPROVE, 0 blockers.** Three items delivered, all three demonstrated
in the browser tier and in the three DoD screenshots, every new guard I
re-planted fires, and all six mutation specs (five new, one re-pointed) are
independently `WITNESSED` on the merged tree. Four findings, none blocking, all
filed as issues; nothing fixed inline in the work under review.

## The mandatory checks (1–7) do not apply, and that is checked, not assumed

This is a viewer-rendering change. The diff adds no stack, topology or study
document, no `source_ref`, no element, no band, no `confidence`, no
`hardware_entry` and no citation; `docs/tolerance_stacks/` and
`docs/topologies/` are untouched, as is every Python module and every
projection builder. So checks 1–7 (citation tracing, term signs, LMC/MMC
direction, RSS, nominal-in-band, quantised cotter constraints, the traced
ratio) have no subject here. Confirmed by `git diff --name-status`: the only
non-`apps/viewer/` sources changed are `scripts/guard_enumeration.mjs` (the
census pin), `scripts/run_viewer_browser_tests.mjs`, five new mutation specs,
one re-pointed one, `docs/DESIGN_TYPE_AND_COLOUR.md` and
`tests/debug_nav_tooltip_and_rail_hover.mjs`. `data/inbox/specs/` is untouched
and nothing was written into drawing-checker.

## Deliverables, against the handoff

**Item 1 — one hover surface on a nav row.** Done, and done wider than asked.
The authored `description` moved from the `.navtree__row` onto a new
`label()`-built `.navtree__label` on all three row kinds, with the topology
row's click hint travelling with it. The author then found the half the handoff
had not: `VA.alertBadge` (`views/dom.js`) was writing a native `title` on the
badge itself on **both** arms, so the element actually under the pointer was a
second plain tooltip under the card. It is now written only on the no-card arm,
which keeps the already-tested "the information is never only in a hover"
property, and `aria-label` stays on both. `views/dom.js` is outside the
handoff's declared file scope; the widening is correct (the badge is shared with
both of `views/stack.js`'s tables, so the rule now holds on all three surfaces),
is disclosed in the lesson's §1 and §9 and in `apps/viewer/README.md`, and the
browser spec deliberately plants the mutation **there** rather than in
`views/nav.js`. Verified: `[typography pass's visual rules (live stack view)]`
is still 11/11, so the stack page's badges took the change without a regression.

**Item 2 — a hovered rail is emphasised along its whole length.** Done. Rails
and links gained the transparent wide twin the bars already had
(`.rail__hit` 14px, `.rail__linkhit` 10px, `pointer-events: stroke`), drawn
immediately after their own line and therefore **under** every bar, dot and
leader, so a mark with a card keeps its hover. The glow is that twin stroked at
`--rail-halo`; the `drop-shadow` alternative was rejected on a measured reason
(a vertical `<line>` has a zero-width object bounding box) rather than taste.
Membership of "the whole connected line" is resolved from `layout.rails` by
**array position**, with the column used only as an equality between two numbers
out of the same layout — which is what makes it survive the sibling handoff's
`order_columns` renumbering, and is pinned by a fast guard that mirrors every
column by hand and requires the same set to light.

The one deviation: the rail and link hit paths were deliberately **not** given a
`tabindex`, so "or keyboard focus" reaches everything already focusable (bars,
dots, leaders) and not the new hit paths. Argued in lesson §9 — ten more tab
stops of focusable decoration on `pitch_system` against a target that selects
nothing and opens nothing. I agree with the call. See finding 4 for what it
costs.

**Item 3 — the DAG and the grid share one hover state.** Done, at the two levels
the handoff set as floor and ceiling (`--lead` for the thing under the pointer
and its counterpart, `--hot` for the whole leg), set from one `setHot` and read
by both panes. `.tvrow:hover` is gone. The tint is painted on the **cells**, not
the row, for a reason I verified from the stylesheet: a `.tvrow` already carries
the alternating band as a background *colour* and an untraced row's provenance
tint as a background *image*, and the retired rule's opaque `#20242c` replaced
the first of them. Hovering selects nothing (`picked` is asserted empty in the
fast tier and `tr.tvrow--selected` is 0 in the browser tier), and the bars',
dots' and crop triggers' own cards keep their existing triggers — which works
only because `hotHover` composes through `chain()` rather than assigning
`onmouseenter`; see "Mutations I planted myself".

**Definition of done.** All three screenshots are present under
`docs/sessions/lessons/shots_20260930_nav_tooltip_and_rail_hover/` and show what
they claim (I opened all three). The lesson answers both questions the handoff
asked it to: which glow technique and why (§3), and the mark's accessible name
after item 1 (§2, measured, with the premise of
`BRIEF_20260914_hover_card_occlusion_and_a11y.md` corrected and an issue filed).
The third question — "any rail/link that could not be given a hit path and why"
— is answered only by implication (every rail and link got one; the fast tier
pins `hits.length === 2` for the demo fixture). A sentence saying "none" would
have closed it; a nit, recorded here rather than filed.

The DoD also asked for the four runs **in the main checkout, projections rebuilt
first.** That did not happen, deliberately, and the decision is right — see
"Where the test numbers came from".

## Where the test numbers came from, and why they are not the main checkout's

`data/projections/viewer/` is currently owned by
`handoff/vpa_pitch_linkage_topology_and_feature_fits` — all three files stamped
`1d6384472887`, a commit on that in-flight branch and on no other, with its own
handoff still in `docs/sessions/active/`. Since the freshness gate that is not a
red fixture, it is a **refusal**: in this worktree
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` reports
`428/429` with `FAIL [real] the projection this tier reads was built from this
tree` and the whole `[real]` tier skipped, naming five input files this branch
has never heard of. Rebuilding the shared directory to clear that would do to
the other live worktree exactly what was done to this one, so neither the author
nor I did it.

So every `[real]` number below was taken against a **private scratch root** —
junctions to the main checkout's `data/inbox`, `data/meshes` and `venv-win`,
`docs` junctioned to this worktree's own, a real `data/projections/`, all three
builders run with `--data-root <scratch>/data`, and every tier with
`--repo <scratch>`. Nothing shared was written. The builders reported
`3/6 parts with an installed mesh` and similar (not `0/N`), so the MAX_PATH trap
did not fire. The route is now in this repo's review overlay; the sibling
issue `ISSUE_20260930_a_worktree_has_no_supported_way_to_run_the_real_tiers_against_its_own_projection.md`
already had it, and I cross-referenced the two.

| run | where | result |
|---|---|---|
| `pytest -q` (risky subset, 11 modules) | review worktree, merged | **291 passed** |
| `pytest -q` (full) | review worktree, merged | **1 failed, 1274 passed** — the failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red `CLAUDE.md` names |
| `node apps/viewer/run_tests.cjs` | worktree, no `--repo` | **428/428, 1 TIER SKIPPED** |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | main checkout's projection | **428/429, tier REFUSED** (not this branch's doing — see above) |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | merged tree, fresh projection | **522/522, no tier skipped** |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | merged tree, real Chrome 154 | **25/25 suites**; `[topology]` 228/228 both modes, `[suite]` 414/414 both modes |
| `node apps/annotate/run_tests.cjs` | worktree | **150/151** — pre-existing and already filed (see below) |
| `node scripts/guard_enumeration.mjs` | merged tree | fast 522/522 declared/enrollable (53 enrolled), annotate 151/151 (9), browser 521 declared / 490 enrollable (51) — **exactly the pin the diff raises** |

**The risky subset, named:** the diff matches four rows of the overlay's
"Choosing the risky subset" — `apps/viewer/` (`test_viewer_js_suite.py`,
`test_js_python_vocabulary.py`, `test_viewer_readme_doc_facts.py`,
`test_viewer_deep_link_contract.py`), a CSS rule (`test_app_type_scale.py`),
a guard/witness change (`test_mutation_witnesses.py`, plus the runner),
test tooling under `scripts/*.mjs` (`test_projection_freshness.py`), and prose
in a tracked document (`test_tolerance_stack.py`, `test_provenance.py`,
`test_thermal_exception_list.py`, `test_claims_registry.py`), plus
`test_architecture_inventory.py` for the new `tests/debug_*.mjs` file. That is
the 291.

**The tactical report records a full-suite run** (lesson §10: `1267 passed, 1
failed`, the one failure the worktree red) and I gave it the benefit of the
doubt rather than repeating it pre-merge. The shipping number is 1274 passed,
the +7 being the sibling handoff's pytest tests arriving via `integration` — not
a defect in the lesson, but the count a future reader should quote is this one.

**The annotate tier's 150/151 is not this branch's.**
`[real] every installed mesh classifies, and the rate over the whole store stays
above the floor` is red on `integration` already, from meshes installed into the
shared store mid-session, and is filed as
`ISSUE_20260930_meshes_installed_into_the_shared_store_mid_session_took_the_annotate_classification_floor_red.md`.
I did **not** file an eighth copy. Its consequence here is that the `annotate`
half of the full mutation run reports `TIER_ALREADY_RED`.

## Mutation witnesses

All six specs the diff touches, re-planted individually on the merged tree
against the fresh scratch projection — **six of six `WITNESSED`**:

| spec | tier |
|---|---|
| `fast__a-nav-row-that-has-both-a-description-and-an-alert-mark` | fast |
| `fast__hovering-any-part-of-a-rail-lights-that-whole-connected` | fast |
| `fast__the-dag-and-the-grid-share-one-hover-state-a-grid-row-li` | fast |
| `fast__the-rendered-frame-carries-a-link-s-fade-on-the-drawn-pa` (re-pointed) | fast |
| `browser__real-a-hot-rail-is-drawn-thicker-and-brighter-than-the-r` | browser |
| `browser__real-a-nav-mark-under-the-pointer-offers-the-card-and-no` | browser |

The five new ones are well chosen and the lesson's §7 table is an honest account
of why: one per deliverable, one on the *shared* badge rather than on the nav
row so the whole-class half is covered, one on the **stylesheet** because the
DOM shim has no CSS and every fast guard here can only assert class names, and
the rail one planted on the plausible wrong answer (resolving a branch curve by
its `from_column`) rather than on something obviously broken. 21 guards arrived
(6 fast, 15 browser — re-derived from the census, 522−516 and 521−506); 5 carry
specs and 16 raised the pin, which is a disclosed claim and a reasonable one for
a change that is mostly paint.

**The standing post-merge full-tier run** is recorded at the end of this report.

## Mutations I planted myself

Two contracts the author's spec list does not name, both measured on the merged
tree:

1. **`chain()` → plain assignment** (`node[name] = fn`). Reddens the fast tier
   at `the DAG's bars and dots open the SAME cards the grid opens…` and
   `a caller with no card handler keeps the plain hover titles…` — **520/522**.
   So the one line the whole "hovering opens no card, and the card still opens"
   property rests on is pinned. Good.
2. **`hotHover`'s leave-race guard removed** (`if (hot.on === key)` dropped from
   both the `onmouseleave` and `onblur` arms). **522/522 fast, 228/228 browser,
   4/4 suites** — green everywhere. Finding 3.

## Findings

None blocking. All four are filed, because APPROVE ends the handoff's ownership
of everything I did not fix.

**1. should-fix — the new browser block dereferences the very things its own
`push`es guard, so its own failure case aborts the suite instead of naming
itself.** `scripts/run_viewer_browser_tests.mjs`: `const firstPoint = await
railPoint(0); await page.mouse.move(firstPoint.x, firstPoint.y);` —
`railPoint()` returns `null` by design, and the loop ten lines above collects
`unreachable` and pushes a sub-check on exactly that. Three siblings in the same
block (`badge.closest(...)` on a page with no marked study row,
`fire(hitFor(id), …)` on an edge with no bar hit path, `state(rows[0])` with no
rows). `testTheTopologyPage` is one ~1400-line `try` whose `catch` prints a
single unnamed `ERROR` line and discards every sub-check name collected — the
class this repo has already paid three duplicate filings for — and the mutation
tier dispatches this suite alone for ~20 entries, where an abort is a MISS
rather than a red. Not fixed inline: changing what a harness reports on an unmet
precondition is a behaviour change, and
`ISSUE_20260918_a_skipped_browser_suite_returns_ok_true_…` means "report it as a
skip" is not obviously right either.
Filed: `ISSUE_20260930_the_hover_blocks_browser_checks_dereference_the_very_things_their_own_pushes_guard.md`.

**2. should-fix (design) — a `rowspan`ned component cell wears the hovered row's
tint across the whole group.** `.tvrow--hot > .tvcell` /
`.tvrow--lead > .tvcell` is the right shape for the band-and-provenance reason
given, and `componentCell`'s merged `<td rowspan="N">` is a `.tvcell` of the
group's **first** row. Measured on live `pitch_system`: hovering the first row
of the four-row `thread_region` group paints that cell
`rgba(255,255,255,0.125)` over **104px** while the row itself is 26px and its
three siblings sit at `0.055`. Nothing is wrong and nothing is lost — the DAG
beside it is unambiguous — but it is the emphasis budget reading one notch
louder than intended, and no tier reads a `.tvcell--component` background, so
any repair would ship silently too. Per the canonical rule a design finding
never blocks an APPROVE, however many are filed.
Filed: `ISSUE_20260930_a_rowspanned_component_cell_takes_the_hovered_rows_tint_across_the_whole_group.md`.

**3. should-fix — `hotHover`'s leave-race guard is inert, and the comment
justifying it states the event order backwards.** The comment says moving from a
bar onto the rail "fires the new element's `mouseenter` and the old one's
`mouseleave`". Measured (two sibling divs, Chrome 154, one `page.mouse.move`
into each): `["mouseenter a", "mouseleave a", "mouseenter b"]` — leave precedes
enter, on a teleport as well as a travelled move, which is what the spec
requires, and every `hotHover` target on this page is a sibling or a `<tr>`
rather than an ancestor of another. So the unguarded clear could not race the
set, and removing both conditions is green in every tier. Either keep it as
belt-and-braces and fix the sentence, or drop it; if it is load-bearing it owes
the one witness under which it bites (fire `mouseenter(B)` before
`mouseleave(A)` by hand). Left to the author: it is a predicate the mutation
list does not name, which is file-don't-fix.
Filed: `ISSUE_20260930_hothovers_leave_race_guard_is_inert_and_its_stated_event_order_is_backwards.md`.

**4. nits, grouped — not filed.**
- The deliberate decision that the rail and link hit paths get **no**
  `tabindex` is argued in the lesson and in no test. Putting a `tabindex="0"`
  on them back is invisible to every tier. It is a one-line reversal of a
  measured call, which is the shape this repo's overlay warns about — but the
  consequence is ten tab stops, not a wrong number, so it does not earn an
  issue.
- `tests/debug_nav_tooltip_and_rail_hover.mjs` re-calls `VA.bootTopology()`
  after the page has already booted at `?mock=1`, which registers the app's
  `document` listeners twice — the shape
  `ISSUE_20260916_…` (the hand-run probe entry in this repo's overlay) records,
  whose documented fix is to serve a patched `topology_fixtures.js` instead. It
  is inert for what this probe measures (class names, not "where was the
  pointer one move ago"), and the probe's own nav-card hover resolved, so
  nothing here is wrong — it is a second sighting of a known pattern in a
  hand-run tool.
- Lesson §3's "Every rail, link and bar **already** carries a transparent
  10–14px twin" reads as pre-existing; the rails' and links' twins arrived in
  this pass. The README's paragraph on the same point has it right.
- Lesson §5's "`#20242c` … is white at ≈.055 alpha — **the same value** as
  `--tv-band-b`" is approximate rather than exact: over `--bg: #16181d`, white
  at .055 composites to `(35, 37, 41)` against `#20242c`'s `(32, 36, 44)`.
  Visually indistinguishable, so the conclusion ("hovering a b-band row changed
  nothing at all") stands; the identity does not. The `≈` carries it.
- `docs/DESIGN_TYPE_AND_COLOUR.md` is outside the handoff's declared scope and
  is the right place for the new corollary (CLAUDE.md sends every CSS author
  there). Worth noting it is not among the files the lesson's §9 accounts for.
  Its "Two corollaries" → "Corollaries worth stating. The first two … the
  third …" rewrite correctly moved the count out of the way.

## What I checked that passed, so a reader can tell it from a skip

- **Placeholder sweep** first thing:
  `git diff integration...HEAD | grep -nE "FILL_|TODO|TBD|XXX|<placeholder|</invoke>|</content>|<parameter"` — nothing.
- **Status letters**: every lesson, issue and screenshot arrives as `A`. No
  record is being overwritten, and this handoff has not run before.
- **The overlay (`docs/prompts/REVIEW_AGENT.md`) is untouched by the tactical
  agent.** It is mine, and four entries are added on this review branch.
- **Issue frontmatter** on both of the author's filings: `type`, `priority`,
  `status: open`, `area`, `reporter: agent`, `audience: strategy`, and
  `found_by:` (never `handoff:`), spelled from the closed sets. Both ask design
  questions and both carry `audience: strategy`, correctly.
- **The lesson's leftovers have owners.** §2's a11y gap → its own issue; §11's
  projection collision → its own issue; §9's "what this change does not reach"
  names no fenced-away successor needing one.
- **The lesson's arithmetic**: 21 = 6 + 15 re-derived from the census against
  the merge-base pin; 5 specs + 16 pin-raises = 21; the fast/browser/worktree
  counts all reproduced (522, 25/25, 428); `baseRow` really is called once and
  only with `"edge"`, so `.tvrow` really is exactly the edge rows;
  `VA.alertBadge` really has three call sites (nav rail + both `views/stack.js`
  tables); the dot really is the one mark with no hit-path twin.
- **No stale survivors of the retired constructs.** `grep -rn setTooltip` over
  live code: nothing (only the handoff and a 2026-09-14 review, both dated
  history). `.tvrow:hover`: gone from `topology.css` except in the two comments
  that explain its retirement. `apps/viewer/README.md`'s cross-reference
  ("the `locator.hover()` note in 'Whole-edge hover' above applies verbatim")
  resolves and says what the new paragraph claims it says.
- **No reader-facing string regression.** The diff adds no user-visible copy;
  the `[real] no rendered surface of any live topology prints an internal id, a
  field name, a checksum or a workstation path` check is green, and the removed
  `title`s took no information away (the card already renders every alert's text
  *and* its `why`, and `aria-label` is untouched).
- **Hover does not fight selection.** `.rail__bar--on` (7) sits under
  `--hot` (8) and `--lead` (10) by source order, `.rail__leader--hot` declines
  the brightening on a selected leader (`:not(.rail__leader--selected)`), and
  `--on`/`--selected` keep the accent. The new `:root` entries are neutral
  greys and low-alpha whites — no hue is spent on a pointer, which is the rule
  the same diff writes into `docs/DESIGN_TYPE_AND_COLOUR.md`.
- **Ordering of the two passes in `setHot`** is rail-then-lead, so an element
  that is both keeps the stronger class, and the `[entry.hot, entry.lead]
  .filter(Boolean).join(" ")` join is what stops a missing half arriving in the
  class string as the literal word `null`.
- **The hit paths cannot steal a card's hover.** Each rail's twin is appended
  immediately after its own rail, i.e. before every link, leader, bar and dot,
  so it paints underneath them; the browser tier independently confirms every
  rail still has a reachable mid-rail point.
- **Nothing writes to shared state.** No `data/` write outside my own scratch
  root; `git status` in the main checkout untouched by this review;
  `node_modules` reached by a junction, removed before finishing.

## Note for the next reviewer

Read "Where the test numbers came from" before you run anything. While
`handoff/vpa_pitch_linkage_topology_and_feature_fits` is live, every
`--repo C:/workspace/tolstack` run in any worktree refuses the `[real]` tier and
takes the mutation tier's `fast` half with it; the scratch-root recipe is now
the third entry of this repo's overlay's "Recurring bugs to check" and it costs
about four minutes to set up. Do not rebuild the shared projection to clear the
red.
