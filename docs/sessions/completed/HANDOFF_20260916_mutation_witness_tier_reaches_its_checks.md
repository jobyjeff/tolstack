---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-16 — mutation_witness_tier_reaches_its_checks: make `card-layout-out-of-flow` redden its own declared check, and let the annotate fast runner own a witness

Source: the 2026-09-16 dispatch triage sweep, disposing of four open issues in
`docs/issues/` that all land on the mutation-witness tier:

- `ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_it_declares.md`
  (found by `HANDOFF_20260915_viewer_respine_whole_walk.md`)
- `ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.md`
  (found by `HANDOFF_20260915_viewer_value_guard_rows_and_replays.md`)
- `ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_witnessing_on_integration.md`
  (found by `HANDOFF_20260915_viewer_component_names_and_reference_copy.md`)
- `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`
  (found by `HANDOFF_20260915_annotate_hosted_page_posture.md`)

**The first three are ONE defect**, filed independently by three sessions on the
same day: `card-layout-out-of-flow` is `NOT WITNESSED`. Triage has already
established that; do not re-derive it, and do not file a fourth. Issue 2 is the
filing that names the mechanism and says "Dispose of both together"; issue 3
reports the same thing against the larger tier and bisects when it entered;
issue 1 confirms it is pre-existing on the branch base, not introduced by the
session that found it. Deliverable 1 disposes of all three.

Baseline: `master` after the 2026-09-16 batch merge (**1155 passed** measured in
the main checkout). `scripts/mutation_witnesses.json` currently holds **27**
entries — 15 `fast`, 12 `browser` — so the expected pre-fix report is one miss
out of 27 (the issues were filed against smaller tiers, hence their 17/18 and
21/22).

Scope: you own `scripts/run_mutation_witness_tests.mjs`,
`scripts/mutation_witnesses.json`, `tests/test_mutation_witnesses.py`,
`scripts/run_viewer_browser_tests.mjs`, `apps/viewer/`, and
`apps/annotate/run_tests.cjs`. Do **NOT** edit `docs/` prose (the SOP,
`ARCHITECTURE.md`, `DAG_TOPOLOGY.md`, `ANNOTATION_SURFACE.md`,
`docs/reference/`) beyond the four issue files' own dispositions, do **NOT**
touch `data/inbox/` or `docs/reference/` at all (both append-/insert-only), and
do **NOT** touch any other repo in `C:\workspace`.

## Running the tier at all (inline, so you need nothing else)

The mutated tier is spawned inside a shadow tree that holds no `data/`, so the
runner always forwards `--repo` to the tier it spawns. `data/` is gitignored and
exists **only in the main checkout** — from your worktree, name it absolutely:

```
node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only card-layout
```

The gate the runner actually checks is whether
`C:\workspace\tolstack\data\projections\viewer\topologies.json` resolves (it
does; 694,095 bytes as of 2026-09-16, beside `crops.json`, `results.json` and
`crops/`). Without it every `[real]` witness is skipped and the run is
meaningless.

## Deliverables

1. **`card-layout-out-of-flow` witnesses the check it declares — without
   weakening the mutation.** The entry (`scripts/mutation_witnesses.json`,
   first entry) flips `apps/viewer/style.css`'s `.croppop` rule from
   `position: fixed` to `position: absolute` and declares
   `tier: "browser"`, `suite: "topology file://"`, and

   > `expect_red`: *"an open card is placed in the WINDOW's frame, not the
   > document's — it still sits against its trigger with the page scrolled"*

   The tier goes red, but on nothing the runner can name, so it prints

   ```
     clean run of browser / topology file://... green
     mutated run... NOT WITNESSED — the tier went red, but not on the declared check.
       | FAILED: topology file://

   0/1 declared mutations witnessed
   ```

   The exact trace, from issue 1 (same trace in issues 2 and 3):

   ```
   [topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
   Call log:
     - waiting for locator('tr.tvrow[data-id=\'base_thickness\'] button.crop-trigger')
       - locator resolved to <button class="crop-trigger crop-trigger--resolved ...">
       - <img class="croppop__img" ...> from <div id="croppop" class="croppop hovercard hovercard--edge"> subtree intercepts pointer events
       - retrying hover action
       ...56 ×
   ```

   Measured evidence already in hand, so you do not have to re-measure it:

   - **The declared check's own numbers** (`scripts/run_viewer_browser_tests.mjs`
     comment at the check, measured 2026-09-15, at `CARD_SCROLL_VIEWPORT =
     { width: 1600, height: 560 }` with the document scrolled to the bottom):
     the card sits **8px** off its trigger as shipped and **148px** off it with
     `.croppop` on `absolute`. The declared check asserts
     `Math.abs(gapBelow - 8) < 1.5 || Math.abs(gapAbove - 8) < 1.5`, so 148px
     is a genuine red — the mutation is *not* toothless.
   - **Pre-existing, not branch-local** (issue 1): reproduced at `9517ce0~2`
     (= `integration` @ `2dbd3d7`) by `git archive`-ing `apps/` and `scripts/`
     into a scratch tree and running the runner from there — identical trace.
     Issue 2 reproduced the same at its branch base `9349f6d`.
   - **When it entered** (issue 3, bisected by replaying `git archive <rev>`
     into scratch trees with `node_modules` and a built projection copied in):
     WITNESSED at `473106e`, `0b898da`, `f629942`, `0573826`; **NOT WITNESSED**
     from `afcbbb4` (`Merge branch 'integration' into
     review/pitch_link_known_bands`) onward through `2559539` and the
     `integration` tip. That merge brought `viewer_study_verdicts_and_gaps`,
     `respine_tween_fidelity_round2` and `annotate_hosted_page_posture`
     together; none of the three could see it, because each was green alone and
     the tier only fails with both sides present. It rode in through a *review*
     merge, the one place nobody re-runs this tier.

   **A lead worth checking FIRST, labelled as a suggestion, not a requirement.**
   Triage read `scripts/run_viewer_browser_tests.mjs` and found something that
   may not match how issues 1 and 2 describe the mechanism. Inside
   `testTheTopologyPage` (the `topology file://` suite, one ~1180-line `try`):

   - the **declared** check is pushed at **line 1358**
     (`push("an open card is placed in the WINDOW's frame, not the document's — …")`),
     right after `await page.locator(CARD_TRIGGER).hover()` at line 1352;
   - the literal `tr.tvrow[data-id='base_thickness'] button.crop-trigger`
     hover in the "one edge, two triggers, ONE card" block is at **line 1414**
     — i.e. **56 lines AFTER** the declared check, not ~150 lines before it;
   - and the suite prints its failure NAMES only at the very end of the `try`,
     around **line 2231**:

     ```js
     const failed = checks.filter((c) => !c.cond);
     …
     for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
     return { label, ok };
     } catch (err) {
       console.log(`[${label}] ERROR: ${err.message}`);
     ```

   So if the timeout is the line-1414 hover, the declared check **was** reached
   and **did** go red — and its name was simply never printed, because an
   exception anywhere later in the suite jumps to `catch` and discards every
   already-collected `FAIL sub-check:` line. The runner parses names with
   `BROWSER_FAIL = /^ {4}FAIL sub-check: (.+)$/`
   (`scripts/run_mutation_witness_tests.mjs` line 120), sees zero, and
   correctly reports "red, but not on the declared check". If that is what is
   happening, the honest fix is in the **reporting** — emit the accumulated
   failure names on the error path too (or flush each `push` as it happens) —
   not in the mutation and not in the check order. **Confirm which hover
   actually times out before you choose a fix**; the two candidate hovers
   resolve to the same selector text in the Playwright call log, which is
   exactly why three filings could read it either way. Record what you find in
   the lesson.

   The options the issues themselves list, for completeness (issue 1 and issue
   2 disagree on which is right, which is why this is a decision and not a
   patch): dismiss defensively in the harness (issue 1 argues against — a card
   intercepting pointer events *is* the defect); move the declared check
   earlier; declare a narrower mutation (e.g. mutate the `top`/`left` the card
   is placed at rather than `position`); split the suite. Issue 3 adds a hard
   fence that is **binding on you**: do NOT "fix" this by teaching the runner to
   accept a bare `ERROR` as red. The distinction between *red on the declared
   check* and *red somewhere* is the entire value of the tier.

   Retiring the entry is permitted only as a last resort and only with the
   reason written into the lesson — it is the only thing standing behind the
   out-of-flow contract, and this contract has already cost three rounds of
   witness repair (`ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`,
   `ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`,
   and now this one), each of which moved the witness rather than asking
   whether `position` is the right thing to mutate.

2. **The annotate fast runner can own a mutation witness.** Two fast-tier
   guards added by `annotate_hosted_page_posture` (2026-09-15) live in
   `apps/annotate/run_tests.cjs` — *"the no-projection banner is plain words,
   with nothing to paste"* (line 406) and *"this app holds no terminal command
   for a banner to render"* (line 416), both standing on Jeff's
   never-render-a-terminal-command rule — and **neither can be declared at
   all**, because the tier word `"fast"` means the *viewer's* fast tier
   specifically:

   - `scripts/run_mutation_witness_tests.mjs::tierCommand()` — `tier: "fast"`
     spawns `apps/viewer/run_tests.cjs` and nothing else;
   - `tests/test_mutation_witnesses.py::CHECK_SOURCE` — `{"fast":
     "apps/viewer/tests.js", "browser": "scripts/run_viewer_browser_tests.mjs"}`,
     paired against `TIERS = frozenset({"fast", "browser"})` by
     `assert set(CHECK_SOURCE) == set(TIERS)`.

   So a guard in the annotate runner would get the wrong suite spawned and
   would have its `expect_red` reported as rotted. Issue 4's recommended shape,
   which triage endorses: **add a third tier word rather than overloading
   `"fast"`** — the two runners are separate harnesses with separate
   check-name sources. Concretely: a new word in `TIERS`; its `CHECK_SOURCE`
   row pointing at `apps/annotate/run_tests.cjs`, which is both the harness
   *and* where the check names live (unlike the viewer's split between
   `run_tests.cjs` and `tests.js`); and a `tierCommand()` branch spawning it.

   Two corrections to issue 4, verified by triage — issue 4 is wrong on both,
   and in the easy direction:

   - Issue 4 says *"the annotate runner takes `--repo` already (its `[real]`
     checks read the main checkout)"*. **It does not.** `apps/annotate/run_tests.cjs`
     never reads `process.argv` and has no `[real]` checks — it `vm`-loads
     `config.js`, `storage/adapter.js`, `storage/memory.js`, `binding_state.js`,
     `commands.js`, `exec_queue.js`, `fixtures.js` plus the sibling
     `apps/viewer/storage/adapter.js`, all pure logic, no DOM and no fetch.
     `tierCommand()` appends `--repo <DATA_REPO>` unconditionally; the annotate
     runner will ignore it harmlessly. Decide whether you want it forwarded
     anyway for symmetry, and say why in the lesson.
   - Issue 4 says the `FAST_FAIL` regex *"may be reusable as-is — check before
     assuming"*. It is: the annotate runner prints
     ``console.log(`FAIL  ${name}\n      ${err.stack || err}`)`` — two spaces,
     matching `FAST_FAIL = /^FAIL {2}(.+)$/` on the first line.

   Then **declare at least one witness on the new tier** and prove it, so the
   tier word is exercised and not merely available. `fast` entries carry
   `suite: null` (all 15 current ones do; `suite` is a required key, so the
   `null` is deliberate). The browser half of that handoff's coverage already
   worked — `hosted-annotate-withholds-the-bind-workspace` has been witnessed
   since 2026-09-15, because browser entries name a `suite` and the annotate
   hosted-posture suite is in the viewer browser runner's own `SUITES`
   registry.

3. **Note for the lesson: why three sessions filed one defect.** Three separate
   sessions on 2026-09-15 filed the same `card-layout-out-of-flow` failure
   because the runner's summary line —

   ```
   NOT WITNESSED: card-layout-out-of-flow
   ```

   — names the **entry** but not the **reason**, and the two reasons are
   different defects with different fixes. `run_mutation_witness_tests.mjs`
   already distinguishes them internally (line 265: *"the tier stayed GREEN with
   the mutation applied"*; line 267: *"the tier went red, but not on the
   declared check"*), and the 2026-09-14 predecessor issue was the *first* kind
   while this one is the second — issue 1 says so explicitly and still needed a
   paragraph to establish it. The lesson **must record** whether the runner
   could print the distinction at the summary level, in words a reader gets at a
   glance: *"the tier never reached the witness"* versus *"the witness cannot
   see the difference"*. If you can implement it cheaply inside the scope above,
   do; if not, say why not. That line is the thing that would have stopped the
   re-filing, and it is worth more than the card fix.

   Related but **out of scope**, noted so you do not chase it: issue 3 suggests
   a review agent's own integration merge should re-run
   `run_mutation_witness_tests.mjs` and not only the three behaviour tiers —
   that is a dispatch/review-prompt change, not a tolstack code change, and it
   belongs to whoever owns `docs/prompts/REVIEW_AGENT.md`. Issue 2 also points
   at `ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md`
   as a natural pairing; read it if it helps, but do not take it on.

## The proof bar — binding, read this twice

**A witness that passes because the mutation was weakened is not a fix.** The
fix is proved only by all of the following, together:

- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
  goes from one miss (the 17/18 and 21/22 of the issues, **26/27** against
  today's 27-entry tier) to **N/N — every declared mutation witnessed**, with
  no entry retired to get there;
- and `--only card-layout` shows the mutated run reddening
  **`FAIL sub-check: an open card is placed in the WINDOW's frame, not the
  document's — it still sits against its trigger with the page scrolled`** —
  the check the entry *names*, printed by name, not an `ERROR` line and not a
  different sub-check;
- and the mutation still flips a `position`-class property that genuinely
  breaks the fixed-vs-absolute contract the entry is named for. Paste the
  before/after `--only card-layout` output into the lesson so the next reader
  can see the named red rather than take your word for it.

If you conclude that the only honest fix narrows the mutation so it no longer
witnesses the fixed-vs-absolute claim, that is a **reportable decision**, not a
silent one: say in the lesson exactly what the entry guarantees afterwards and
what it stopped guaranteeing. A green tier bought by a smaller claim is the
failure mode this bar exists to catch.

## Definition of done

- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
  reports **N/N declared mutations witnessed** (N ≥ 27, more if deliverable 2
  adds entries), with `card-layout-out-of-flow` witnessed by name against the
  `expect_red` string quoted above, and the proof bar above met in full.
- At least one mutation entry declared on the new annotate tier word and
  witnessed in the same run, standing behind one of the two
  `apps/annotate/run_tests.cjs` guards named in deliverable 2.
- `apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
  `apps/annotate/run_tests.cjs` and
  `scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` all green
  on their own, so the card fix did not buy the witness by breaking a
  behaviour tier.
- Full suite green: `venv-win/Scripts/python.exe -m pytest -q` (from a
  worktree, `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`).
  Baseline from the 2026-09-16 batch merge in the main checkout: **1155
  passed**. Report your count; a drop needs an explanation, and
  `tests/test_mutation_witnesses.py` must still pair `TIERS` against
  `CHECK_SOURCE` after the new tier word lands.
- The four issues in `docs/issues/` are dispositioned — each one's status moved
  and its resolution stated. All three card-layout filings are ONE defect and
  close together; do not leave two open because two `found_by` handoffs differ.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_mutation_witness_tier_reaches_its_checks.md`):
  which hover actually timed out and therefore whether the declared check was
  reached-but-unprinted or never reached (the line-1358-vs-1414 lead above);
  the before/after `--only card-layout` output; what the
  `card-layout-out-of-flow` entry guarantees after your fix versus before;
  whether the runner can print *"the tier never reached the witness"* versus
  *"the witness cannot see the difference"* at the summary line, and if not,
  why not; and whether `--repo` is forwarded to the annotate tier and why.
