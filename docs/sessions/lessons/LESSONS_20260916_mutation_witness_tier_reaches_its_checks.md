# LESSONS 2026-09-16 — mutation_witness_tier_reaches_its_checks

Handoff: `docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`.
Four issues disposed of; `card-layout-out-of-flow` witnessed with the mutation
unchanged; a third tier word so the annotate runner can own a witness.

---

## 0. What was measured

All from this worktree, `--repo C:/workspace/tolstack` where the tier takes it:

| | |
|---|---|
| `run_mutation_witness_tests.mjs` | **29/29 declared mutations witnessed** (27 entries before, +2 added, none retired) |
| `run_viewer_browser_tests.mjs` | **20/20** browser checks, `topology file://` at 179/179 |
| `apps/viewer/run_tests.cjs` | **407/407** |
| `apps/annotate/run_tests.cjs` | **65/65** |
| `pytest -q` | **1154 passed, 1 failed, 1 skipped** |

I did not re-run the full 27-entry tier before fixing anything -- the one miss 
was reproduced directly with `--only card-layout` (0/1), which is the same 
evidence at a twentieth of the wall clock. The handoff's expected pre-fix 
26/27 is therefore quoted, not measured here.

The one pytest failure is **pre-existing at this branch's base** and unrelated
to anything here -- `test_no_live_document_states_an_unguarded_hardware_entry_count`
reads *"the other three do not have"* in a 2026-09-16 strategy brief as a
hardware-entry count. My diff touches four files, none of them the brief, the
test, or `hardware_entries.json`. Filed as
`ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`
(`high`). Against the handoff's stated 1155-passed baseline the arithmetic is
exact: 1154 + 1 = 1155, no test gained or lost.

---

## 1. Which hover timed out — and the answer is neither candidate

The handoff's lead (labelled a suggestion, correctly) was that the timing-out
hover might be the *"one edge, two triggers, ONE card"* hover **56 lines after**
the declared check, so the declared check would have been reached, failed, and
had its name discarded by the `catch`. Issues 1 and 2 instead read it as a hover
~150 lines *before* the check.

**Both are wrong.** The hover that times out is `CARD_TRIGGER`'s own hover, the
line **immediately above** the declared check. The declared check was never
reached.

And `CARD_TRIGGER` is defined as
`"tr.tvrow[data-id='base_thickness'] button.crop-trigger"` — the *same literal
selector* as the line-1414 hover. That is why three filings could read the
Playwright call log either way: the log prints the selector, and the two
call sites are indistinguishable in it. If you are ever again asked which of two
identical selectors timed out, do not read the log harder.

### How to actually answer it, in one run

Fix the reporting first, then read the count:

```
[topology file://] ABORTED after 22 sub-checks, 0 of them already FAILED
[topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
```

The declared check is sub-check **23**. One line, no bisecting, no
instrumentation. `0 of them already FAILED` settles it further: nothing at all
had gone red, so the "reached but unprinted" hypothesis was dead on the same
line.

**Generalise this.** The abort line is worth more than the specific fix: any
future "the suite died somewhere in a 1180-line `try`" question is now answered
by a number the run already prints. Reach for it before reaching for `git
archive` and scratch trees.

## 2. Why the hover could not complete, and why the fix is in the harness

Under `position: absolute` with the document scrolled, `position()` writes the
card's placement in **viewport** coordinates and the browser reads it against
the **document**, so the card renders `scrollY` px up-document from where it
belongs. The 148px the entry was measured at in 2026-09-15 is **signed**: the
card does not sit further from its trigger, it lands **on top of** it.
(`gapBelow = cardTop - triggerBottom` came out ≈ −142, and `|−142 − 8| ≈ 150`.)

`locator.hover()` will not act on an occluded element. So:

1. first attempt — trigger is clear, pointer moves, `mouseenter` fires;
2. the card opens **over the trigger**;
3. Playwright re-checks the hit target, sees
   `<div class="cropblock"> from <div id="croppop" class="croppop hovercard
   hovercard--edge"> subtree intercepts pointer events`, and retries;
4. …56 times, to the 30-second timeout.

Issue 1 argued against dismissing the card defensively in the harness, because
*a card intercepting pointer events is the defect*. That argument is right, and
the fix keeps it: nothing is dismissed. What changed is that the harness stopped
being the thing that declines to look at the defect —
`hoverIgnoringOcclusion` drives the pointer with `page.mouse.move`, which
performs no actionability check. That escape hatch already existed next door
(`hoverRailBar`, for a different Playwright limitation) with the same
one-round-trip discipline for reading the rect; this is the second caller, not a
new idea.

**The mutation is untouched** — still `position: fixed` → `position: absolute` —
and the entry still guarantees exactly the fixed-vs-absolute contract it is
named for. Nothing was narrowed and nothing was retired. Of the options the
issues listed (defensive dismissal, move the check earlier, declare a narrower
mutation, split the suite), none was needed.

### A latent hole found on the way

`locator.hover()` was **silently scrolling** the trigger into view: at
`CARD_SCROLL_VIEWPORT` with the document scrolled to its end, the trigger sits
*above* the window (measured: `scrollY 175`, trigger off the top — my first
version of the helper refused to scroll and turned the **clean** run red, which
is how this surfaced). So the tripwire
*"the document really scrolls at this viewport"* was certifying a scroll
position the measurement was never taken at. There is now a second tripwire,
`"the card was opened with the document still scrolled, and opening it moved the
page by nothing"`, asserted on `window.scrollY` read after the card opened and
compared against what the hover reported.

The helper scrolls with `block: "nearest"`, not `hoverRailBar`'s `"center"` —
minimum scroll, because centring gives away scroll the reading is measured
against.

## 3. Before and after, `--only card-layout`

**Before** (branch base, reproduced in this worktree):

```
--- card-layout-out-of-flow
  clean run of browser / topology file://... green
  mutated run... NOT WITNESSED — the tier went red, but not on the declared check.
  declared: an open card is placed in the WINDOW's frame, not the document's — it still sits against its trigger with the page scrolled
  actually failed: nothing named — the suite ABORTED rather than failing a check.
  (a mutation that breaks the page itself, rather than one behaviour, aborts its suite; this tier can only attribute a NAMED failure, so declare a narrower mutation.)
    | [topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
    | Call log:
    |   - waiting for locator('tr.tvrow[data-id=\'base_thickness\'] button.crop-trigger')
    |     - locator resolved to <button class="crop-trigger crop-trigger--resolved crop-trigger--thumb" ...>
    |   - attempting hover action
    |     - performing hover action
    |     - <div class="cropblock">…</div> from <div id="croppop" class="croppop hovercard hovercard--edge">…</div> subtree intercepts pointer events
    |   - retrying hover action
    |     ...56 ×
    | 1/2 browser checks passed (--only "topology file://")
    | FAILED: topology file://

0/1 declared mutations witnessed
NOT WITNESSED: card-layout-out-of-flow
```

Note the runner's own advice in that output — *"declare a narrower mutation"* —
which was the wrong move, and is the third round of witness-moving this contract
has nearly cost (`ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover`,
`ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again`). The
advice is still right for the case it was written for; it just does not
distinguish *the mutation is too broad* from *the harness will not look*.

**After** (mutation unchanged):

```
--- card-layout-out-of-flow
  clean run of browser / topology file://... green
  mutated run... WITNESSED
  apps/viewer/style.css: display: none; position: fixed; z-index: 20; width: 540px;
  reddens: an open card is placed in the WINDOW's frame, not the document's -- it still sits against its trigger with the page scrolled
    | --only "topology file://": running 2 of 20 suites -- THIS IS NOT A FULL RUN
    |
    | [topology file://] 178/179 sub-checks passed: FAIL
    |     FAIL sub-check: an open card is placed in the WINDOW's frame, not the document's -- it still sits against its trigger with the page scrolled
    | [topology file:// respine] 39/39 sub-checks passed: PASS
    |
    | 1/2 browser checks passed (--only "topology file://")
    | FAILED: topology file://

1/1 declared mutations witnessed
```

(`--verbose`, so the tier's own output is shown.) **178 of 179, one named red,
and it is the declared one.** No `ERROR` line, no second sub-check, no aborted
suite -- the mutation now fails an assertion rather than the harness, which is
the state the entry always claimed and could not reach.

## 4. The two NOT-WITNESSED reasons, at the summary line

**Yes, it was cheap, and it is done.** The handoff was right that this line is
worth more than the card fix.

The runner already distinguished the reasons internally, per entry, several
screens up, in a sentence. The summary printed only
`NOT WITNESSED: card-layout-out-of-flow` — the entry, never the reason. On
2026-09-14 one session read that as *the witness cannot see the difference* and
repaired the witness; on 2026-09-15 three sessions read the same line, found a
different reason underneath it, and each filed it as a new bug.

`MISS` is now a module-level vocabulary in
`scripts/run_mutation_witness_tests.mjs` (five reasons, not two — anchor rot and
an already-red tier are misses too), each miss carries its reason, and the
summary reads:

```
NOT WITNESSED:
  annotate-banner-says-nothing-to-paste — the tier was red before the mutation, so nothing was proved
  annotate-carries-no-command-to-render — the tier was red before the mutation, so nothing was proved
```

That output is real: it is what the annotate entries printed before
`docs/topologies/` joined the shadow tree (§5). The reason told me where to look
in one read — and *"the tier was red before the mutation"* is a sixth reason
nobody had named, which would previously have appeared as a bare entry id
indistinguishable from a blind witness.

## 5. The annotate tier word, and the three corrections

`annotate`, a third word rather than a second meaning for `"fast"` — which names
the **viewer's** harness specifically. On the runner side the vocabulary is now
one `TIER_HARNESS` object (script, failure regex, whether it takes
`--only <suite>`), replacing the `if`-chain and the `FAST_FAIL`/`BROWSER_FAIL`
ternary; `tests/test_mutation_witnesses.py` reads its keys out of the source and
pairs them against `TIERS`, so a word on one side and not the other is red in
0.2s instead of `unknown tier` several minutes into a browser sweep.

Two witnesses declared and both witnessed, standing behind both guards issue 4
named — the copy (`annotate-banner-says-nothing-to-paste`) and the supply
(`annotate-carries-no-command-to-render`). Two rather than the required one
because they are a deliberate pair: a check on the sentence alone passes again
the moment somebody re-adds `"Build it: " + a command`.

### `--repo` is forwarded to the annotate tier, and why

**Forwarded.** The annotate runner never reads `process.argv`, so it ignores the
flag. `tierCommand` builds every tier's argv from one code path
(`[script, "--repo", DATA_REPO, ...(suites ? ["--only", suite] : [])]`), and a
per-tier exception buys nothing: the flag is inert today, and a harness that
learns it later works with no change on the runner side. The alternative —
suppressing it for one tier — is a second code path maintained to hide a
harmless argument.

### Issue 4 and the handoff were both wrong about `[real]`, in the expensive direction

The handoff states the annotate runner *"has no `[real]` checks"*. It has **two**.
They resolve `data/` through a two-candidate fallback (this tree, then a
hard-coded main-checkout path), which is why they run from a worktree with no
`--repo` at all — that fallback is also why nobody noticed the runner ignores the
flag.

What they do **not** resolve that way is the **tracked**
`docs/topologies/part_mesh_aliases.json`, read repo-relatively — correctly, since
a tracked file is in every worktree. It is *not* in the mutation runner's shadow
tree, which held only `apps/` and `scripts/`. So both `[real]` checks threw
`ENOENT`, the clean annotate run went red, and every annotate entry reported
*the tier was red before the mutation* — the tier word worked perfectly and
witnessed nothing.

Fixed by shadowing `docs/topologies/` too. `SHADOWED` is now a list of path
*segment arrays* rather than directory names, so a nested path can be named.
**194 KB, narrow on purpose** — all of `docs/` is 5.2 MB and 584 files, copied
fresh on every run, and the next tier that starts reading a tracked input should
have to name its directory here where the reason can be written down.

**The transferable lesson:** the shadow tree is *"everything a tier reads"*, and
a tier can legitimately read a tracked file outside `apps/` and `scripts/`.
"Gitignored → main checkout, tracked → your worktree" is the rule everywhere
else in this workspace; inside the shadow, **tracked is not enough either** —
it has to be shadowed.

## 6. Fourteen copies of one discarded result

The reporting defect was not in one suite. Fourteen suites each carried a copy
of the same four-line reporting block -- ten byte-identical, three without the
`errors` lines, one using `suite` rather than `label` as its parameter name --
each beside a `catch` that printed `err.message` and dropped every
already-collected failure name on the floor. Those names are the *only* machine-readable surface of that runner
(`BROWSER_FAIL = /^ {4}FAIL sub-check: (.+)$/`), so on the error path the
mutation tier was structurally unable to attribute anything.

One `reportSuite` / `reportAbortedSuite` pair now serves all fourteen: 121 lines
deleted for 84 added, helper and its comment block included. `runSuite` -- which reads
`window.__TEST_RESULTS__` and prints `FAIL <name>` rather than
`FAIL sub-check: <name>` — is deliberately left alone; it is a different output
contract.

**What was NOT done, and the fence held:** nothing teaches anything to treat a
bare abort as a named red. A suite that dies before its first `push` still
prints no names, and the tier still reports it as unattributable. The `MISS`
vocabulary gives that case its own words (*"the tier never reached the
witness"*) instead of leaving it looking like a blind witness.

## 7. Things that will bite the next session here

- **`node_modules/` is gitignored, so a worktree has none**, and the browser
  tier needs `playwright-core`. Node resolves it by walking up from the shadow's
  own directory, so a junction at the worktree root is enough:
  `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`.
  Nothing in `CLAUDE.md` or the handoff says this, and without it the whole
  browser half of the tier is unreachable from a worktree.
- **`\n` inside a heredoc passed to the Bash tool loses a backslash.** Writing
  Python patch scripts inline, `"\\n"` arrives as a literal newline — which
  silently produced an invalid JSON string in `mutation_witnesses.json` and an
  unterminated string literal in a test module. Use a placeholder
  (`'@N@'.replace('@N@', chr(92)+'n')`) or write the script to a file first.
- **`applyToShadow` uses `String.replace(find, replace)` with a string
  replacement**, so a `replace` containing `$&`, `$'` or `$1` would be read as a
  substitution pattern. Still true, still speculative (the 2026-09-15 review
  flagged it); none of today's 29 entries contains `$`. Both entries added today
  were checked against it deliberately.
- **`integration` is red for an unrelated reason** —
  `test_no_live_document_states_an_unguarded_hardware_entry_count` reads *"the
  other three do not have"* in a strategy brief as a hardware-entry count. Filed
  as `ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`
  (`high`: it makes every session's "full suite green" need a paragraph). Not
  touched here — the handoff fences off `docs/` prose and the tolerance-stack
  tests.

## 8. Filed, not fixed

- `ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`
  — the pre-existing pytest failure above.
- `ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md`
  — issue 3's closing suggestion, which the handoff correctly scoped out. Filed
  because issue 3 is now `resolved` and `resolved` is terminal: the suggestion
  would have had no owner after Complete. `audience: strategy`, because it is a
  cost/placement decision about a multi-minute tier, not a patch.
