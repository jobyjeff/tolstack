---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
reviewer: agent
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# Review — mutation_witness_tier_reaches_its_checks

Branch `handoff/mutation_witness_tier_reaches_its_checks` (3 commits,
`3d7fd32..25faae6`), merged into `review/…` as a clean fast-forward from
`70241ce`. All three deliverables are met, the proof bar is met in full, and
nothing was weakened to buy the witness.

## The proof bar, re-measured here rather than taken on the report's word

| claim | measured in this review |
|---|---|
| tier goes to N/N with no entry retired | **29/29 declared mutations witnessed** (`--repo C:/workspace/tolstack`, exit 0) |
| `card-layout-out-of-flow` reddens the check it NAMES | `178/179 sub-checks passed: FAIL` → **one** `FAIL sub-check:` line, and it is the declared `expect_red` verbatim. No `ERROR` line, no second sub-check, no aborted suite |
| the mutation still flips a `position`-class property | `find`/`replace` unchanged on the branch: `position: fixed` → `position: absolute` in `apps/viewer/style.css`. 27 entries before, +2, 0 retired (`15 fast / 12 browser / 2 annotate`) |
| pre-work state actually broken | reproduced at `70241ce` before merging: `0/1`, `NOT WITNESSED`, `actually failed: nothing named — the suite ABORTED` |
| behaviour tiers still green on their own | `run_viewer_browser_tests.mjs` **20/20** (`topology file://` 179/179), `apps/viewer/run_tests.cjs` **407/407**, `apps/annotate/run_tests.cjs` **65/65** |
| full suite | `1 failed, 1154 passed, 1 skipped` — the one failure pre-existing, see below |

**The pre-existing red is confirmed pre-existing, twice.** At `70241ce` in this
worktree: `1 failed, 1153 passed, 1 skipped`. At `70241ce` in the main checkout:
`1 failed, 1154 passed`. `test_no_live_document_states_an_unguarded_hardware_entry_count`
is red on `integration` for the reason the author filed
(`ISSUE_20260916_hardware_count_guard_matches_the_other_three_in_unrelated_prose.md`,
`high`) — a `_COUNT_CLAIMS` pattern matching *"the other three do not have"* in a
strategy brief. The work's diff touches none of the three files involved.

**Guards observed failing, not accepted on green** (universal checklist):

- `test_the_runner_and_this_module_hold_the_same_tier_vocabulary` — renamed one
  `TIER_HARNESS` key to `annotate_typo`: `1 failed, 10 passed`, and the message
  named both sides of the set difference.
- the new browser tripwire *"the card was opened with the document still
  scrolled, and opening it moved the page by nothing"* — scrolled the window
  12px up after the card opened: `177/179`, that check and the declared check
  both red by name.
- **the reporting fix and the hover fix are both load-bearing, separately.**
  Reverting only the hover to `page.locator(CARD_TRIGGER).hover()` while keeping
  the new reporting still gives `NOT WITNESSED … nothing named`. The reporting
  alone does not buy the witness.

**No data pollution.** Nothing under `C:\workspace\tolstack\data\` has an mtime
after this session started (three mutation-tier runs, two browser-tier runs, both
fast tiers, four `pytest -q` runs). `tmp/mutation-witness/` and `node_modules/`
are gitignored.

## The handoff's own open question, settled independently

The handoff asked which hover times out, and offered a lead (the literal hover at
1414, *after* the declared check, so the check would have been reached and its
name discarded). **The lead was wrong and the lesson is right.** Reproduced the
pre-fix hover against the new reporting:

```
[topology file://] ABORTED after 22 sub-checks, 0 of them already FAILED
[topology file://] ERROR: locator.hover: Timeout 30000ms exceeded.
```

The declared check is sub-check 23. Nothing had gone red, so "reached but
unprinted" is dead. It is `CARD_TRIGGER`'s own hover, on the line immediately
above the check — neither candidate the four filings named. The existing overlay
entry asserted the 1414 mechanism as fact; it has been corrected on this branch.

## Findings

No blockers. Four should-fixes, all documentation-accuracy defects in artifacts
this diff wrote, all **fixed inline on the review branch** (each clears the three
prongs: no designed behaviour changed, no new test needed to trust it, a few
lines). Nothing was fixed silently.

### should-fix 1 — `hoverIgnoringOcclusion`'s justifying measurement names the wrong axis
`scripts/run_viewer_browser_tests.mjs`, the helper's note and
`LESSONS…md` §2 *"A latent hole found on the way"*.

The note says the trigger *"is ABOVE the window (measured 2026-09-16: scrollY
175, trigger off the top), so the reading the out-of-flow contract takes has
always been at the scroll `scrollIntoView` left behind and never at the one the
tripwire above it asserted."* Instrumented inside the helper:

```
firstBox: null
rectBefore: {top: 243.5, bottom: 269.5, left: 1502, right: 1604}
innerW: 1600   innerH: 560
yBefore: 175   yAfter: 175
rectAfter:  {top: 243.5, bottom: 269.5, left: 1066, right: 1168}
```

The trigger is **4px off the right edge**, vertically well inside. The pane
scrolls horizontally, so `scrollIntoView` moves the **pane** and `window.scrollY`
is 175 before and after — and `scrollHeight - innerHeight` is *also* 175, so the
document is pinned at its maximum and cannot give vertical scroll away. **The
described hole did not exist**: the tripwire above was certifying the scroll the
measurement is taken at. What survives: the helper genuinely does take the scroll
branch, and the second tripwire is a real guard (observed failing above). Only the
rationale was wrong. Fixed: the note and the `block: "nearest"` comment re-state
the measured axis; a correction blockquote added to the lesson.

*Second-order consequence worth naming:* a document pinned at max scroll makes
`openedAt === aimed.scrollY` **half vacuous** — my first attempt to break it
(`scrollBy(0, +10)`) was a silent no-op and the check passed. It only bites
upward. Recorded in the overlay rather than changed; the guard is still worth its
line.

### should-fix 2 — the same commit changed `SHADOWED` and left two live docs restating the old set
`scripts/mutation_witnesses.json` `about` block (*"the runner copies apps/ and
scripts/ into tmp/mutation-witness/"* — in a block this diff otherwise rewrote)
and `apps/viewer/README.md:1530` (*"copies `apps/` and `scripts/` to a shadow
tree"*). Both understate `SHADOWED`, which this diff widened to include
`docs/topologies/`. Fixed by pointing at `SHADOWED` instead of copying it.
(Occurrences in issues, lessons and completed handoffs are dated history and were
left alone.)

While in that README paragraph: *"three of the declared witnesses are `[real]`
checks"* is **seven** (`grep -c '"expect_red": "\[real\]'`), and was already
seven before this branch — the two new entries are not `[real]`. Rewritten to
carry the command rather than a fourth stale number.

### should-fix 3 — `about` asserts a count that a fourth tier word falsifies
Same block: *"Those three words are written in exactly two places."* The
enumeration itself is legitimate documentation and was kept; the count sentence
now reads *"The tier words themselves are written in exactly two places"*, so
widening the vocabulary tomorrow cannot leave a false sentence with nothing red.
The pairing test cannot see this block — that is the point of the new overlay
entry.

### should-fix 4 — lesson arithmetic: one test WAS gained
`LESSONS…md` §0: *"Against the handoff's stated 1155-passed baseline the
arithmetic is exact: 1154 + 1 = 1155, no test gained or lost."* The work adds
`test_the_runner_and_this_module_hold_the_same_tier_vocabulary` —
`tests/test_mutation_witnesses.py` goes 10 → 11, and it is deliverable 2's
pairing guard, so the gain is a *feature* being denied. Measured: worktree base
1155 collected → 1156 after; the 1155 match was coincidence, because the
handoff's baseline was taken in the main checkout where nothing skips. The same
post-merge number was quoted as a `70241ce` repro inside
`ISSUE_20260916_hardware_count_guard_…`. Correction blockquotes added to both.

### nits
- `MISS.NEVER_REACHED` (*"the tier never reached the witness"*) claims more than
  the runner can know: a suite that aborts having collected **zero** failures may
  have reached the declared check and *passed* it (blind) before a later throw.
  The `ABORTED after N sub-checks, M of them already FAILED` line this same diff
  adds is exactly what disambiguates, and the runner does not parse it. Low harm
  — the word is right in every case seen so far, and the output a reader gets now
  contains the answer.
- *"121 lines deleted for 84 added"* (§6) — 85 added. `git diff --numstat` gives
  164/122 on the file; less the 65-line helper and the declared-check hunk's
  14 added / 1 deleted, the reporting change is 85/121.

## What I checked and found clean

- **Nothing in the mutation was narrowed, moved, or retired**, and none of the
  four options the issues proposed (defensive dismissal, moving the check,
  a narrower mutation, splitting the suite) was taken. The fence issue 3 laid
  down held: nothing teaches the runner to accept a bare `ERROR` as red — a
  suite that dies before its first `push` still prints no names and is still
  reported unattributable, and `MISS.NEVER_REACHED` is the word for it.
- **The 14-copy reporting collapse is complete, with no residue.** `FAIL
  sub-check` now appears at exactly one place in the file, `checks.filter` at
  two (both inside the helper pair), and `ERROR: ${err` at one. All 14 suites
  return through `reportSuite`/`reportAbortedSuite`; each one's `ok` is
  unchanged (the three suites that never collected page errors pass `[]`, and
  `testRespine`'s `suite`-vs-`label` parameter name is preserved by position);
  `checks` is declared before the `try` in every one, so the abort path can
  always read it. `runSuite` is correctly left alone — it reports
  `window.__TEST_RESULTS__` as `FAIL <name>` at four-space indent, which neither
  `FAST_FAIL` nor `BROWSER_FAIL` parses, and no entry declares either of its two
  suites.
- **The new tier word is real, not merely available.** Both `annotate` entries
  witness by name, against the two guards issue 4 named, and both mutations
  restore the *original* defect shape (`"Build it: " + <interpreter> + <script>`
  in the banner; `AA.CONFIG.rebuild` back in `config.js`) rather than a synthetic
  one. Declaring two rather than the required one is right: a check on the
  sentence alone passes again the moment the supply returns.
- **The runner↔pytest vocabulary pairing cannot rot silently.** The reader
  `source.index("const TIER_HARNESS = {")` raises on a rename, and
  `assert keys` fires if the indentation regex stops matching — both louder than
  a false pass. This is the fix shape CLAUDE.md asks for.
- **`--repo` forwarded to the annotate tier**: one `tierCommand` code path, the
  flag inert today, reasoned in the lesson. Correct call.
- **Issue 4's and the handoff's `[real]` claim was wrong in the expensive
  direction, and the author caught it.** `apps/annotate/run_tests.cjs` has two
  `[real]` checks; confirmed here by running it from this worktree with **no
  `--repo`** and watching both run (its two-candidate `data/` fallback reaches
  the main checkout). That is what made shadowing `docs/topologies/` necessary,
  and `194 KB` vs `5.2 MB / 584 files` for all of `docs/` are both exact
  (measured 198,903 B and 5,396,021 B / 587 files, less this branch's 3 new
  files).
- **No `$` in any entry's `find`/`replace`** across all 29, so
  `String.replace`'s substitution-pattern hazard is still latent, as the lesson
  says.
- **Issue hygiene.** All four handoff issues moved to `status: resolved` with a
  `resolution:` line; the three card-layout filings carry one shared
  disposition and close together. Both new issues have well-formed frontmatter
  (`type`/`priority`/`status`/`area`/`reporter`/`found_by`, `audience: strategy`
  where the finding needs design), and neither misuses `handoff:` at filing
  time. The review-merge suggestion was correctly filed rather than dropped —
  `resolved` is terminal, so it would have had no owner.
- Every other lesson figure re-derived and exact: 29/29, 20/20, 179/179,
  407/407, 65/65, 14 suites (10 byte-identical + 3 without `errors` +
  1 using `suite`), 27→29 entries with none retired, `ABORTED after 22`.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` on this branch:

- **Corrected** the *"reports THAT something failed without reporting WHICH"*
  entry, which asserted the 1414-hover mechanism as settled fact. It was wrong;
  so were the three filings, in the other direction. Replaced with the method
  that actually answers it (make the abort print a count, read the count).
- **Added** *"A harness escape hatch's justifying MEASUREMENT names the wrong
  axis"* — including the half-vacuous-at-max-scroll corollary, which cost this
  review one wasted mutation.
- **Added** *"A tier-vocabulary word added to code and paired, then restated a
  third time in the table's own prose"* — the declaring data file's header is
  the one copy a pairing test cannot see.

## Merge

Fast-forward `70241ce → 25faae6`, no conflicts. Inline fixes committed on the
review branch; `review/…` merged into `integration`.

## For the next reviewer

The `card-layout-out-of-flow` contract has now survived four rounds of witness
repair (2026-09-11, 09-14, 09-15, 09-16) and this is the **first** one that did
not move the witness or narrow the mutation. The entry is, finally, standing
where it claims to stand. If it goes `NOT WITNESSED` a fifth time, the summary
line now tells you which of five reasons before you open anything — use it, and
re-read the corrected overlay entry before theorising from a call log.
