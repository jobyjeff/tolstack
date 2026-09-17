# LESSONS 2026-09-16 — viewer_unwitnessed_surface_guards

All seven deliverables done, plus deliverable 8's derivability answer. Every
guard was planted, watched reddening and reverted; six new entries went into
`scripts/mutation_witnesses.json` and the tier reports **37/37 declared
mutations witnessed**.

> **Correction, 2026-09-16 review (`review/viewer_unwitnessed_surface_guards`):
> eight entries, not six.** `mutations[]` went 29 → 37 (`git show
> integration:scripts/mutation_witnesses.json` vs. the branch), and §1 below
> lists all eight by id — the two prose counts here and at §1's head are the
> only places the number is wrong. The 37/37 total is right.

## 0. The numbers, and every one of them moved from what the handoff measured

| | handoff said | measured at my base `82d3a95` | after |
| --- | --- | --- | --- |
| `pytest -q` | 1155 passed | **1162 passed, 1 failed, 1 skipped** | **1165 passed, 1 failed, 1 skipped** |
| `apps/viewer/run_tests.cjs --repo` | 407/407 | 407/407 | **411/411** |
| `run_viewer_browser_tests.mjs --repo` | 20/20 | 20/20 | **20/20** (315+315 in the two `suite` passes, was 313+313) |
| `tests/test_viewer_crops.py` | 73/73 | **77/77** | **80/80** |
| mutation tier | — | 19/37 (see §7) | **37/37** |

The pytest red is **not mine and not new**:
`test_no_live_document_states_an_unguarded_hardware_entry_count` false-positives
on the phrase "the other three do not have" in
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`. Filed
twice already —
`ISSUE_20260916_hardware_count_guard_matches_other_three_do_not_in_unrelated_prose.md`
and `..._matches_the_other_three_in_unrelated_prose.md`, both `priority: high`,
both open. Reproduced at `82d3a95` before I touched anything.

## 1. The verbatim `expect_red` line for every witness

Six new entries, in the order they were earned. *(Eight — see the correction
at the head of this file.)*

**`card-crop-overlay-frame`** (browser, `topology file://`) — style.css's
`.hovercard .cropblock .cropfig` width cap reverted to the
`max-height: 260px; object-fit: contain` rule it replaced:

> `the crop's element IS the picture — its box still carries the crop's own aspect ratio, so a percentage lands where it reads`

**`pane-fetches-the-parts-list-companion`** (browser, `real render path (non-mock)`):

> `selecting a balloon crop's row fetches its parts-list companion too, so the PANE's second image is there with the first rather than a paint later`

**`card-fetches-the-parts-list-companion`** (browser, same suite):

> `opening a balloon crop's hover CARD fetches its parts-list companion too — the card's list is built separately and carries the same second image`

**`stack-pane-crop-block-keeps-its-prefix`** (fast):

> `the stack pane's crop block carries THIS pane's class prefix, separator and all`

**`topology-pane-crop-block-keeps-its-prefix`** (fast):

> `the topology preview pane's crop block carries THIS pane's class prefix, separator and all`

**`grid-marks-a-row-with-no-tolerance`** (fast):

> `[real] a row whose number has no plus/minus behind it says so in the grid too`

**`nav-failure-clears-the-stale-worksheet`** (browser, `no nav click wedges the page`):

> `a node whose worksheet read FAILED shows the sentence saying so, never the previous node's prose under this node's title`

**`suite-prints-the-registry-key-it-was-handed`** (browser, `index redirect file://`):

> `every suite prints the registry key it was dispatched under — a --only filter is copied straight off that line, and every `suite` in scripts/mutation_witnesses.json is a whole copy of one`

Two more mutations were planted and reverted with **no** entry declared,
because the table has no tier for them (§5): `companion = None` reddening
`test_the_builder_emits_the_parts_list_companion_beside_a_balloon_crop`, and
`"drawing_no": None,` reddening
`test_the_builder_carries_the_drawings_own_number_and_revision`.

And two demonstrated for deliverable 2, neither declared (the deliverable did
not ask, and §4 says why one of them would have been misleading): renaming a
`VA.CROP_HIGHLIGHT_KINDS` key reddens `[real] no live value is one the viewer
has no branch for`; `box.frac.length === 4` → `=== 5` reddens `[real] a live
crop really draws the boxes its own index says are worth looking at`.
Deliverable 6's `VA.GAP_KINDS` rename reddens `[real] no live topology value
is one the page cannot render`.

### Where the obvious mutation had to be narrowed

Only once, and not for the reason the handoff's "ONE THING AN ENTRY CANNOT
DECLARE" warns about. Deliverable 1d names **three** sites of one line
(`loadDetailImage`, `showCrop`, `cardPngs`). They share `imageCache`, so
whichever fetcher reaches a PNG first is the only one that touches the adapter
— which means one mutation cannot be attributed and **two witnesses need two
different live balloon crops**. Split into `pane-…` and `card-…`, each on its
own row, each reddening exactly one check. `showCrop` is left unwitnessed and
filed as
`ISSUE_20260916_showcrops_own_companion_fetch_is_the_third_copy_and_still_unwitnessed.md`
— the obstacle there is not the mutation, it is that the live route to
`showCrop` is stack mode, which the real-data suite does not drive.

## 2. Deliverable 8 — the derivability answer

Asked of three registries. Short version: **`VALUE_GUARDS` and
`TOPO_VALUE_GUARDS` cannot be generated, can be partially checked, and the
check worth building is keyed coverage rather than size. `SUITES` is a
different question with a different answer, and that difference generalises.**

### 2a. Could the enumeration be derived? No — and the blocker is the collector, not the predicate

A row is four parts: a `field` label, a `branch` sentence, a `known(v)`
predicate, and a `values(projection)` **collector**. Three mechanical sources
were offered: the builder's module-level vocabulary tuples, the `VA.*_KINDS`
tables, and `tests/test_topology_projection.py`'s `JS_PAIRINGS`.

All three give the same thing — a **vocabulary**, and its pairing across the
language boundary. `JS_PAIRINGS` already derives that pairing for nine tables, and is the
*earlier* signal; `topologies.json` even ships four of its vocabularies at top
level (`row_kinds`, `link_kinds`, `value_sources`, `study_statuses`). None of
them gives the **path**: *which field, of which object, of which array* carries
that vocabulary. `gaps[].kind`, the field I added, is not among the four
shipped vocabularies and nothing in the tree declares where it lives.

You could recover paths by walking the live projection and matching values
against known vocabularies. That is deriving the guard from the data it
guards, and it fails three ways: a field whose live values are momentarily a
subset of another vocabulary gets the wrong table; two vocabularies that
overlap produce phantom rows; and a field going **absent** — the exact arm the
empty-collector check exists for — makes the derived row vanish along with the
thing it was watching. This is the same circularity the repo refuses in
`fold()` and in "never derive `max` from `mmc`".

There is one honest route to real generation: the builder writes a **schema
block** into the projection — field path plus vocabulary name, emitted from the
same module-level constants the values come from. Then the row set *is*
derivable. Even then it is partial: **5 of the 16 stack rows have no `VA.*`
table at all** (`crop entry status`, `stacks[].worksheet_source`,
`stacks[].checks_source`, the stack-side `gaps[].kind`, `source_ref.kind`).
Those are `inList([...])` by design, because the branch is a chain of `if`s or
a set of CSS rules, and their `known` has no mechanical source anywhere. So the
schema block buys generated *collectors* and still needs hand-written
*predicates* for a quarter of the table.

**The concrete "no, because X": a row's `values()` is a path, and a path exists
only in the Python that writes it and the JS that reads it — in neither case as
data.**

### 2b. Is "deliberately excluded, for this reason" expressible? Yes, trivially — and that is the good news

This was flagged as the crux, and it turns out to be the easy half.
`TOPO_VALUE_GUARDS`' `--- Deliberately NOT rows, and why ---` block is two
entries, each one paragraph, each keyed by a field name. It converts to a
`{field: reason}` map with no loss: the reasons are already written as prose
attached to a key. The block's value is that it is *read*, not that it is
comments, and a map read by a test is read more reliably than a comment.

### 2c. The cheaper middle option — build this one

Not a size assertion. **Keyed coverage:**

> Every `VA.*` branch table that `JS_PAIRINGS` pairs to a Python vocabulary
> must be the `known` table of at least one `TOPO_VALUE_GUARDS` row, or a key
> of a `NOT_GUARDED` map whose value says why.

Cost: one test, one map, and the prose block above becomes that map. It is
strictly better than the brief's proposed size assertion, because "this
collection has N members" fails on the *count* changing and says nothing about
*which* member left — and a coverage set that gains one row and loses another
keeps its size.

**And it is not hypothetical: run it against yesterday's tree and it flags
exactly the row deliverable 6 added by hand.** `JS_PAIRINGS` names nine tables.
Eight had a `TOPO_VALUE_GUARDS` row before this session; the ninth,
`GAP_KINDS`, did not — and the one remaining non-row, `MESH_FACT_FIELDS`,
is field names rather than a value vocabulary, i.e. a named exclusion.

> **Correction, 2026-09-16 review: seven had a row, not eight — the paragraph
> as written totals ten tables for nine.** Counted off the two lists in the
> merged tree: `JS_PAIRINGS`
> (`tests/test_topology_projection.py`) names `TOPO_ROW_KINDS`,
> `TOPO_LINK_KINDS`, `STUDY_STATUSES`, `VALUE_SOURCES`, `NODE_KINDS`,
> `EDGE_KINDS`, `TRANSFORM_KINDS`, `MESH_FACT_FIELDS`, `GAP_KINDS`; exactly
> the first **seven** are the `known` table of a pre-existing
> `TOPO_VALUE_GUARDS` row. `GAP_KINDS` is the eighth, added here;
> `MESH_FACT_FIELDS` is the ninth and the one non-row. (`VERDICTS` and
> `VERDICT_SCOPES` do have rows and are the easy miscount — they are
> `viewer.js` tables and are not in `JS_PAIRINGS`.) Seven + one + one = nine,
> and the conclusion below is unchanged: one hit, one exclusion.

So the detector's hit rate on the one case there is evidence for is 1 for 1, and its
false-positive rate is 0 given one exclusion entry. That is the strongest
argument in this lesson for building something rather than writing a
convention.

While measuring it: the brief's 2026-09-15 table calls `TOPO_VALUE_GUARDS`
"nine rows against a projection that branches on four more fields". It is
**sixteen** rows now (fifteen before this session). Instance 3's numbers are
stale; the shape it names is not.

Its honest limit, and this is why I would call it a partial answer rather than
a solution: it catches *a vocabulary with no row at all*. It does not catch *a
vocabulary with a row, live at a SECOND path nobody guarded*. On the stack side
`confidence` is live at four paths and has three rows; a fifth path is
invisible to any table-keyed detector, and to a size assertion as well. That
residue needs 2a's schema block or nothing.

**Would I build it?** Yes for `TOPO_VALUE_GUARDS`, where `JS_PAIRINGS` already
exists and the exclusion block is already written. For `VALUE_GUARDS` the same
shape works but there is no `JS_PAIRINGS` equivalent on the stack side, so it
costs that list first — worth doing, but it is two changes, not one.

### 2d. Deliverable 7's `SUITES` is a DIFFERENT question, and the difference generalises

The brief lists `SUITES` as instance 2 of "the guard's coverage set is a
hand-kept literal". After `mutation_witness_tier_repair` single-sourced the
labels, that is no longer what it is. **`SUITES` is a dispatch table, not a
coverage set**: its rows do not stand for members of some other set, they *are*
the set. There is nothing for a size assertion to compare against, and adding
one would assert a number against itself — which is what that handoff's lesson
correctly objected to.

What was actually broken was not the set's size but the **pass-through**: the
registry key and the label a suite prints were equal only by convention, and
dropping one argument left every tier green while printing `[undefined]`. The
fix is four lines of runtime comparison, no second source, no maintenance, and
it fires on the exact one-word revert.

The sentence worth keeping:

> For a registry of the shape `[key, fn(key)]`, the answer is a **pass-through
> check**, not a coverage-set check. Coverage-set assertions belong to
> registries whose rows *stand for* members of some other set. The
> discriminator is one question — **does this registry claim to cover something
> else, or is it the source?** If it is the source, check that its consumers
> still honour the key.

By that test, `mutation_witnesses.json`'s `expect_red` (the brief's instance 1)
is the *first* kind — it stands for check names in another file — and
`tests/test_mutation_witnesses.py` already pairs it there. `SUITES` is the
second kind. The brief's two tolstack instances really do resolve differently,
and now there is a rule saying which is which rather than a case-by-case call.

## 3. `cropEntriesIn` was NOT broadened — the trap was real

Deliverable 2's measured trap holds: `cropEntriesIn` walks `by_stack` only, and
three existing rows (`crop entry resolved_by`, `located_by`, `status`) read
their live value sets through it. I added `everyCropEntryIn` (both key spaces)
and `cropHighlightsIn` (crop boxes plus companion boxes) beside it and left
`cropEntriesIn` alone, so **the three existing rows saw nothing new**.

For whoever picks up broadening it deliberately: on today's data it would be
cheap. `by_topology` holds 24 entries, 6 of them resolved, and their `resolved_by`,
`located_by` and `status` values are every one already in `by_stack`'s sets —
so the three rows would widen by zero values today. That is exactly why doing
it as a *side effect* is the wrong move: it would look free, and the day a
topology-only crop resolves by a new rule, three guards would quietly have
started answering a question nobody asked them.

## 4. Two of the seven were already witnessed by something nobody had noticed

Worth saying plainly, since the handoff asked for it — it is the cheapest
possible outcome and it happened twice.

- **Deliverable 2's malformed-`frac` arm.** Breaking
  `VA.cropHighlights`' `box.frac.length === 4` filter reddens **four
  fixture-tier checks** that were already there (`a datasheet crop draws its
  used cell as a box…`, `a declared region is DASHED and a found match is
  SOLID…`, `a highlight kind this build has no branch for is still drawn…`,
  `a balloon crop shows the balloon boxed AND the parts-list row beside it…`).
  So the *renderer* was covered. What was genuinely uncovered is the live-data
  half — a builder that stops writing `highlights` into `crops.json` — and no
  code mutation can simulate that, because the mutation tier shadows code and
  points `--repo` at real data. The guard for it is the value-guard row's
  empty-collector arm, which `replayBlindCollectors` exercises per row.
  **This is why the new `[real]` render check has no declared entry: its unique
  contribution is not reachable by any declarable mutation.**
- **Deliverable 6, exactly as the issue predicted.** Renaming a `VA.GAP_KINDS`
  key reddens `[real] every live gap row is one this page has words for…`
  (already present) as well as the new row's sweep. The row does not close an
  open hole; it puts `kind` in the same sweep as its siblings so the answer to
  "is this field covered?" stops depending on knowing about two other tests.
  Declared nothing for it — the deliverable did not ask, and an entry would
  have been attributed to a mutation an older check already catches.

## 5. Three things the handoff asked for that are not available in this tree

None of these is a judgement call; each is a fact about the harnesses.

1. **"Declare all four" (deliverable 1) cannot include 1b and 1c.**
   `mutation_witnesses.json`'s `tier` vocabulary is `fast` | `annotate` |
   `browser` — three node harnesses. There is no word for pytest, so a guard
   whose only tier is Python can be demonstrated and not written down. Filed:
   `ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard.md`.
   Same shape as the `annotate` tier issue closed the same day, so the
   precedent for the fix is recent.
2. **"A fast-tier assertion that the pane's fetch list names the companion PNG"
   (1d) is not writable.** `apps/viewer/topology_app.js` is **not in
   `run_tests.cjs`'s file list**, and the DOM shim cannot boot the page — that
   is why the browser tier exists. The fetch list is read in the browser tier
   instead, off the adapter the app actually called (a `readCropImage` wrapper
   recording into `window.__CROP_FETCHES__`), which is strictly better evidence
   anyway.
3. **5b's "add a fast-tier test that drives `navigate()`" is the same wall.**
   So the comment branch was the only branch, and it is the one I took.

## 6. 5b: which branch, and what reading the adapters actually showed

**Narrowed the comment.** Forced by §5.3, but it would have been the right call
anyway, because the comment was wrong in both halves:

- `FsaAdapter.readText` (`storage/fsa.js:98`) and `HttpAdapter.readText`
  (`storage/http.js:212`) are both `async`, so a `VA.requireReady` throw in
  either arrives as a **rejection** and is caught by `navigate`'s `.then(…,
  navFailed)`, never by its `try`.
- The null-adapter door is unreachable: `boot()` returns before any nav row
  renders without one.

What survives is narrower and real: **`MemoryAdapter.readText`** (not `async`,
calls `requireReady` first) and **`NodeFsAdapter.readText`** (not `async`, and
`this._io.readText` is a synchronous filesystem read). The comment now names
those two, says the guard is defence in depth, and says in as many words that
no tier reaches it — so the next reader is not left believing it is covered.

## 7. The stale pin that disabled the whole fast half of the mutation tier

The session's one genuinely surprising find, and it is worth the next agent's
attention because the failure mode is structural.

`[real] a study fed by a zero-width row warns…` hard-pinned **two** row names.
`5ce16f3` (on `integration`, this morning) deliberately made that false and
said so in its own message — "the stack has one zero-width element now, not
two". The check stayed green because `data/projections/viewer/topologies.json`
is gitignored, shared by every worktree, and was still the pre-`5ce16f3` build.
**Another session rebuilt it mid-run** (provenance stamps
`branch=handoff/python_value_and_schema_pins`, `2026-09-16T20:50Z`) and the
pin became visible — between two of my own test runs, which is how I found it.

The structural part: `run_mutation_witness_tests.mjs` requires a **clean green
tier before each mutation**, so one red fast-tier check reported **all 18
fast-tier entries** as `NOT WITNESSED — the tier was red before the mutation,
so nothing was proved`. One stale literal disabled the entire fast half of the
mutation tier, including four entries this handoff's definition of done
requires. That is why I repaired it inline rather than only filing it: it was
on my critical path, not adjacent to it. Filed anyway, with the reasoning:
`ISSUE_20260916_a_real_check_still_pins_the_zero_width_washer_the_rotor_citation_fix_removed.md`
(left `status: open` — the fix is on this branch, not on `integration` yet).

**The repair is the durable form, not a re-spelling.** The named rows are now
derived from the study's own chain, with a fixture precondition, so the next
band that is found moves a number instead of reddening a literal.

Three things to carry forward:

- **A `[real]` check that spells a live value out by hand is a time bomb with a
  fuse of unknown length**, because the fuse is a gitignored file another
  worktree owns. Write them count-for-count against the projection.
- **The shared projection can change under you mid-session.** Re-measure any
  live number you intend to quote, immediately before you quote it.
- **Run `node scripts/run_mutation_witness_tests.mjs` before you believe a
  green tier.** 19/37 and 37/37 look identical from `run_tests.cjs`.

## 8. Further corrections to the issues' stated evidence

In the shape deliverable 4's correction was given.

- **`ISSUE_20260915_the_grids_no_tolerance_badge_is_unguarded_in_every_tier`**
  says `pitch_link_to_pitch_plate` has 2 zero-width edges. It has **0** — the
  handoff already corrected this to "`rotor_fastener_length`, 2 of 12".
  **That correction is itself now stale**: after `5ce16f3` and the 20:50Z
  rebuild it is **1 of 12**, and every other topology is 0. The test I added
  survived the change unedited, because it counts rather than names.
- **`tests/test_viewer_crops.py` is 77 tests, not 73** (the handoff's number
  predates the citation-identity merge). 80 after this session.
- **Deliverable 2's measured highlight counts held.** `by_stack` 28
  `verified_match` + 16 `declared_region` + 4 companion `verified_match`;
  `by_topology` 2 and 1. Both members of `VA.CROP_HIGHLIGHT_KINDS` are live,
  and the new `[real]` render check pairs the live kind set against the table
  so that stops being a sentence in a lesson.
- **Deliverable 6's measured gap distribution held** (18 / 38 / 29 / 11 / 8,
  all four kinds present) — but `no_tolerance_recorded` is down to **1** row
  from 2, same cause. The row still does not trip the empty-collector arm.
- **Deliverable 1b/1c's measured live counts held**: 4 companions in `by_stack`
  (0 in `by_topology`), each with one `verified_match` highlight; 7 entries
  carrying a `drawing_no`.

## 9. Mechanics the next session here will hit

- **`node_modules/` is gitignored, so a worktree has none** and the browser
  tier cannot start. The junction from
  `LESSONS_20260916_mutation_witness_tier_reaches_its_checks.md` §7 is still
  the answer and still undocumented anywhere a first-time reader would look:
  `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`.
- **`--repo C:\workspace\tolstack` loses its backslashes through the Bash
  tool** and silently becomes `workspacetolstack`, at which point the node-fs
  tier reports itself **skipped** and every `[real]` check quietly does not
  run — a 327/327 pass that looks fine. Use forward slashes:
  `--repo C:/workspace/tolstack`. This is the exact trap the handoff's
  definition of done warns about, reached by a different door.
- **An `expect_red` must appear VERBATIM in the tier's source**, seam-closed
  for `" + "` between **double-quoted** literals only
  (`tests/test_mutation_witnesses.py`'s `CONCATENATION_SEAM`), and the runner
  matches it against the **whole** printed check name
  (`result.failures.includes`). So a sub-check name built with template
  literals or containing an interpolated value can never be declared. That
  killed the first draft of deliverable 7 — the check name is now a constant
  and the specifics print on their own line above it, which is the shape the
  suites already use for a failure with details.
- **A browser-tier check that reads `.detail__crop-links` is origin-dependent.**
  `VA.cropReference` appends its links row only when there is a link to put in
  it, and `VA.localFileUrl` withholds a `file://` link from a served page — so
  the div is legitimately absent over http, and `apps/viewer/tests.js` runs at
  both origins. My first draft passed in node and over `file://` and failed
  over `http` only. Rewritten as a sweep for any class joining the prefix to
  its suffix with nothing between them, which is origin-free and bites harder.
- **The working tree is CRLF.** Anchors in `mutation_witnesses.json` are
  authored LF; a plant/revert script that does not translate matches nothing.
- Writing multi-line JSON payloads through a Bash heredoc eats a backslash from
  `\n` (recorded last session, still true). I wrote each witness entry to a
  file in the scratchpad and appended with a small Python script that preserves
  the table's CRLF endings, so `git diff` on the table is +N lines and nothing
  else.

## 10. Left undone

- `showCrop`'s companion fetch — filed (§1).
- A pytest tier for the witness table — filed (§5.1).
- 2c's keyed-coverage test — **not** filed as an issue, deliberately: it is
  deliverable 8's answer to an open strategy brief
  (`dispatch/docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md`),
  and filing a tactical issue for it would pre-empt the decision that brief
  exists to make. It is written up in §2c with its cost and its limit so a
  strategy session can take it or refuse it.
