# LESSONS 2026-09-22 — mutation_witness_repair_and_enrollment

Three dead witnesses repaired, twelve guards enrolled, and the first written-down
full-tier baseline since the registry was 54 entries.

## The baseline nobody had

`node scripts/run_mutation_witness_tests.mjs` — **main checkout**
`C:\workspace\tolstack`, `master`+board @ `a6a71fb` (the 2026-09-22 batch merge,
`836f11e`, plus three board moves that touch no code), clean tree, no `--repo`
needed, 2026-09-22:

```
93/96 declared mutations witnessed
NOT WITNESSED:
  leader-style-survives-a-topology-switch — another check reddened, but not the declared one
  worst-verdict-ranks-worst-last — the tier never reached the witness
  arriving-at-an-element-shows-its-part-in-3d — the witness cannot see the difference
EXIT=1
```

Three things to carry forward from that block.

**93/96 is the number to compare against**, not 54/54
(`LESSONS_20260916_design_pass_typography.md`, when the registry was 54). The
93/96 that `LESSONS_20260921_mutation_witness_enrollment_backlog.md` measured on
a branch is the same state; so is the 70/73 of
`ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md`.
The misses have been exactly these three, by name, across three measurements and
one batch merge. Stable, not spreading.

**The full tier takes 17 minutes, not "over ten".** Wall clock 16.7 min for 96
entries — ≈10 s/entry, because the expensive part (a clean run per distinct
`(tier, suite)`) is cached across the whole invocation and 96 entries share ~20
suites. Every document that describes this tier calls it a >10-minute run and
implies per-entry cost; the real shape is a fixed ~2-minute floor plus ~10 s per
entry. **That changes the advice**: `--only` is NOT obviously the cheap way in
any more — one `--only` pays the same clean-run floor for one entry as the whole
table pays for 96. Below ~10 entries `--only` still wins; above that, run the
lot.

**The runner's exit code already means something, and has since `9c6c4a4`.** The
handoff and the source issue both say it "prints the NOT WITNESSED list and
still exits 0", and that is the one claim in either document that is false —
`EXIT=1` above, from the `process.exitCode = 1` at the end of the IIFE, present
at `1d31b69` (the commit the issue measured on) and at every commit since.
Nothing was changed here, because there is nothing to change. What is true is
the *consequence* the issue drew: this went unnoticed for a day across three
reviews — but the cause is that **nothing calls the tier**, not that the call
swallows its status. `npm run test:mutations` is the only caller in the repo,
and no pytest, hook or batch-merge step runs it. Wiring it in is a real
question (17 minutes is too long for a pytest run and about right for a
batch merge), and it is the question
`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md`
already owns. Do not file a third issue about the exit code.

## The three dead entries — three different defects, none of them the guard

All three were **repaired**, none retired. Per-entry output is at the end.

### 1. `leader-style-survives-a-topology-switch` — a mutation that hard-coded a moving default

`replace` planted the literal `state.leaderStyle = "jogged";`. That WAS the
default when the entry was written, so the mutation was a no-op at boot and bit
only on the topology switch the guard measures. On 2026-09-21
`viewer_nav_alert_badge_and_angled_default` moved `VA.DEFAULT_LEADER_STYLE` to
`"angled"` — correctly — and from that moment the mutation changed the **boot**
state instead, so five earlier checks about the default reddened first and the
declared one was never reached.

The fix is one word: plant `VA.DEFAULT_LEADER_STYLE` instead of a copy of its
current value. **A mutation that spells out a constant's value is coupled to
that value**, which is the same defect this whole tier exists to catch, one
level up — and it is invisible in review, because on the day it is written the
literal and the constant are the same string. Worth a habit: when `replace`
plants a value that lives in a named constant, plant the constant.

### 2. `worst-verdict-ranks-worst-last` — an anchor that deleted a key instead of reordering three

The contract is that `VA.VERDICTS`' key ORDER is the severity rule, and the
plausible defect is the permutation `fail, marginal, pass`. The `find` spanned
only the `pass` block plus the `marginal:` line after it, and `replace` put a
`fail` block in its place — so the patched object was `{fail, marginal, fail}`
with **no `pass` key at all**. `tests.js:9352` reads `VA.VERDICTS.pass.says`
while building a fixture, so the suite died on a `TypeError` before any check
ran: `NEVER_REACHED`, a real red wearing no check name.

Repaired by anchoring the WHOLE object and making `replace` a true permutation
of the same three entries. The general shape: **when the contract is about the
ORDER of a literal, the anchor has to span the whole literal.** A partial anchor
cannot express a reordering — the only thing it can express is a substitution,
which is a different (and usually fatal) mutation.

### 3. `arriving-at-an-element-shows-its-part-in-3d` — coverage lost by a merge, with both branches green

Declared on `...and shows that element's part alone, in the scene and in the
list`, and WITNESSED on its own branch on 2026-09-21. What landed beside it in
the same batch was `annotate_face_suggestions`, whose `cmdSuggest()` does:

```js
for (const sha of shas) {
  if (state.scene.listOpenParts().indexOf(sha) === -1) await state.scene.loadPart(sha);
  state.scene.setVisible(sha, true);
  state.scene.setGhost(sha, state.transparentParts);
}
```

Selecting the element now loads and shows its part, so deleting the arrival's
own `AA.exec(["ghost", ...shas])` changes nothing a reader — or the check — can
see. And "alone" cannot separate the two loaders either: the `?mock=1` fixture
has exactly **one** part, so every sensible reading of "alone" is trivially
true.

This is `ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run`
in its pure form: two correct branches, each green with the tier run on it, and
the coverage is gone the moment they meet. **Neither branch could have found
it** — which is the argument for running the tier at the merge rather than
harder on each branch.

Repaired on the guard's side, which is where the defect is: the suite now asks
the question with **Suggest likely faces** switched off, where only the arrival
can have put the part in the scene, and the entry is declared on that check.
`refreshSuggestions()` returns early when the setting is off, so nothing else
loads the part. One trap found while writing it — `uncheck()` waits for the
click and not for the async handler behind it, so the setting has to be read
back out of `localStorage` before the `goto` that is supposed to honour it.

## Enrollment: 12 entries, and two guards that had to be repaired first

96 → **108**. Every row was run before being declared; all 12 witnessed. What is
worth recording is the two guards that had to be edited before an entry for
them could exist at all — both blocked the same way, and neither block was
about the guard being wrong.

### A check name built by interpolation can never be declared

`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
called the nav-mark placement row paste-ready and predicted one trap: that
`expect_red` "is matched as a substring" and the label ends with a live count,
so the declared string must stop before the number. **Both halves of that are
wrong, and the row was not enrollable at all.**

- `expect_red` is matched with `Array.prototype.includes` against the list of
  failed check names — **exact element equality**, not a substring test. (The
  substring rule belongs to `--only <suite>`, one field over.) So a string that
  "stops before the number" is a guaranteed `NOT WITNESSED`, which is what
  `test_no_expect_red_is_a_truncated_check_name` has refused since 2026-09-18.
- The name was a template literal, ``…including on the ${wrapped.twoLine}
  rows…``. There is no string that satisfies both the runner (which sees `2
  rows`) and the pairing module (which reads the source, where `${…}` is
  written).

So the guard was rewritten to print the count on the diagnostic line beside it —
the same line that already names the offending rows — and its name is a plain
literal now. **45 of the browser tier's 51 template-literal check names
interpolate a value**, so this is a population, not an incident; filed as
`ISSUE_20260922_forty_five_browser_check_names_are_interpolated_so_no_guard_behind_them_can_be_enrolled.md`
with `audience: strategy`, because the three ways out are not equivalent and one
of them reopens a hole that was deliberately closed.

The same misreading is why that issue set three more nav checks aside as "not
paste-ready" — "one mutation reddens several and `expect_red` would need care
about which fires first". **The runner asks whether the declared name is AMONG
the failures**, so several reds are fine and no anchor has to win a race. Two of
the three really are unenrollable, but for the interpolation reason above; the
third (`…and with no border, no corner radius and no outline`) is a plain
literal and is enrolled here as `the-nav-mark-wears-no-box`, a twelfth entry.
What its anchor did need was care of a different kind — that it leave the other
two claims alone — and it does: `measure()` reads the SVG's own bounding box, so
a border on the host element moves neither the size check nor the colour one.

### A `skip(` arm is not a second declaration

`this app holds no terminal command for a surface to render` is written twice in
`apps/viewer/tests.js` — a `skip(...)` arm for the browser tier (no
`VIEWER_SRC`) and a `test(...)` one for the node-fs tier — deliberately with the
same words, so a reader of either output sees the same title.
`test_every_expect_red_resolves_to_exactly_one_place` counted both and refused
the entry. That is the same wall
`LESSONS_20260921_mutation_witness_enrollment_backlog.md` hit on the
markup-scan twin, where it was recorded as *"never enrollable, on any tree"*.

It is not a real ambiguity: the two arms are mutually exclusive by construction
and only the `test(` arm can print the `FAIL  <name>` line the runner attributes
a red to. `tests/test_mutation_witnesses.py` passes a `skip(`-introduced
occurrence over now, with `test_passing_over_the_skip_arm_is_load_bearing`
beside it so the discriminator cannot quietly die — the same argument as the
`" + "`-seam test next to it. That unblocked the command-table guard here and
the markup-scan twin, which is filed as a transcription job
(`ISSUE_20260922_the_markup_scan_twin_is_enrollable_now_that_a_skip_arm_no_longer_counts_as_a_declaration.md`)
rather than done, since it is none of this handoff's four issues.

### What the 12 rows are

| from | entries |
|---|---|
| `viewer_nav_verdict_into_alert_and_icon` | `nav-mark-stays-at-the-end-of-its-row`, `the-nav-mark-wears-no-box`, `stack-verdict-excludes-sensitivity-probes` |
| `policy_free_brief_residues` | `banner-renders-no-terminal-command`, `no-command-table-in-the-config`, `no-view-reads-the-command-table`, `loopback-pre-grant-banner-asks-for-the-folder`, `flyout-pre-grant-banner-asks-for-the-folder` |
| `viewer_summary_balance_sheet` | `totals-are-footer-rows-of-the-grid`, `totals-land-in-the-column-they-total`, `an-authored-finding-splits-at-its-own-separator`, `a-findings-rationale-stays-in-the-fold` |

Three of those deserve a note.

**The "environment mutation" question dissolves.** The policy-free issue asked
whether the table can express `page.addInitScript(() => { delete
window.showDirectoryPicker; })`, and said to record the answer if it cannot. It
cannot — the table patches files in a shadow tree, and nothing in it reaches the
browser. But the two guards do not need it: their subject is the **copy**, not
the capability. The defect the retired `/Connect folder|File System Access/`
disjunction used to accept is a pre-grant banner that names the API, and that is
a one-line source mutation in `apps/annotate/app.js`. Both twins declare it,
against their own suites. Generalisable: *when a guard is gated on an
environment read, the mutation usually belongs on the thing the guard asserts,
not on the gate.*

**One guard, two halves, two entries.** `this app holds no terminal command…`
asserts a live `VA.CONFIG.rebuild === undefined` AND a static `codeOnly(src)`
scan of seven view files. Either half alone reddens the check, so a single entry
would leave the other half permanently unexercised. Two entries sharing one
`expect_red` is the right shape — the three topology-preference siblings are the
precedent.

**The fifth, "cheaper" policy-free row was not transcribed**, per the dated
correction on that issue: once every live command site is gone, no walked
surface prints a script filename at all, so reverting
`reader_facing_bans.js`'s shape to the single literal reddens nothing. Nothing
to add — the correction is right and the row is absent.

## `integration` moved under this session, and the table survived it

`HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms` — the one this
handoff was told to watch for, because it is staged against
`VA.splitAuthoredFinding` — **merged while this session was running** (main
checkout `06991f1`, `6807fb2`, `integration` `42a38c0`). It moved
`apps/viewer/topology.js` (+70) and `apps/viewer/views/topology.js` (+5), which
between them hold four of this branch's anchors, and `apps/viewer/tests.js`
(+87), which holds six of its `expect_red` names.

It was **not** merged into this branch: that is the reviewer's step, and doing
it here would have meant re-running a 30-minute tier against a tree nobody has
reviewed. What was done instead is the cheap half — read the post-merge text of
each moved file out of `git show integration:<path>` and re-run the pairing by
hand over all 108 entries. **Zero would rot.** `var at =
whole.match(AUTHORED_REASON_SPLIT);` is untouched, and the change is about which
BUCKETS reach the splitter (`STUDY_FINDING_SOURCES[kind].reasonSplit`), not what
it does to a string — so `an-authored-finding-splits-at-its-own-separator`
still describes the same defect, and the caveat written into its `note` stands
rather than needing a rewrite.

That handoff also filed
`ISSUE_20260922_..._scoping_guard_has_no_mutation_witness_entry.md` for its own
new guard, so the row it wants has an owner already and is deliberately not
enrolled here.

The reusable part is the check, not the outcome: **before handing back a branch
whose whole content is anchors into other people's files, re-pair it against
`integration`'s current text.** It costs one script and a second, and it is the
difference between the reviewer's merge being routine and being a red pytest
run it has to diagnose.

## Cost, for `BRIEF_20260915_mutation_witness_enrollment`

The brief is ranked #4 partly on the freshness of the 2026-09-18 pass's
≈4 min/entry. Third data point, and it splits the figure in two:

- **Authoring: ≈8 min/entry** for these 11 (a session of roughly 90 minutes of
  authoring across 11 rows, plus the two guard repairs and the pairing-module
  change that made 3 of them possible). Slower than the 09-21 pass's "2-3× the
  09-18 rate" because 4 of the 11 were *candidate* rows nobody had run, and
  because two needed a code change before an entry could exist at all.
- **Running: ≈10 s/entry**, amortised. This is the number that has been
  overstated everywhere, and it is the one that decides whether the tier can be
  wired into a merge step.

**Reproduction rate: 11 of 15 candidate rows enrolled (73%).** Four did not: the
`reader_facing_bans.js` shape row (the issue's own dated correction, measured),
and the three legibility/border/two-colour nav checks the issue called "not
paste-ready" — all three are interpolated names, so the reason they are not
paste-ready is the 45-name population above, not the shared `.navstatus` rule
block the issue guessed at. Compare 4-of-26 (15%) decay on the 09-21 pass: the
difference is that those were *measured* rows three days old, and these were a
mix of measured and proposed.

**A cheap pre-flight that is worth reusing.** The seven fast-tier rows were
validated before the browser sweep by applying each mutation to the worktree
directly, running `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
and restoring from git — ~20 s each, no shadow, no browser, and it runs happily
alongside a browser sweep in another checkout. It found nothing wrong here, but
it would have found a wrong `expect_red` in seconds rather than at minute nine
of a sweep. The script is not kept: it is fifteen lines, and a kept copy would
be a second implementation of the runner to keep in step.

## Mechanics worth knowing

- **Run the tier from the worktree with `--repo`, or from the main checkout by
  absolute script path.** `REPO` is derived from the script's own location, so
  `node C:/workspace/tolstack/scripts/run_mutation_witness_tests.mjs` shadows and
  measures the MAIN checkout whatever the cwd is — which is what made a trunk
  baseline and branch work possible in the same session, with two separate
  shadow trees and no interference. (The 09-21 lesson's warning is about two
  runs against ONE tree; two trees are fine.)
- **`--repo C:\workspace\tolstack` through the Bash tool loses its backslashes**,
  which `docs/prompts/REVIEW_AGENT.md` already records for
  `apps/viewer/run_tests.cjs` — confirmed here on a second runner. The first
  baseline attempt ran as `--repo C:workspacetolstack`, and 30 entries in,
  every `[real]` and `python` witness was being reported as a miss. The
  difference worth recording: **this runner says so and `run_tests.cjs` does
  not.** Its first two lines were `note: no topology projection under
  C:workspacetolstack …` and `note: no interpreter at …` — the honest
  announcement the tier was built with, and it was scrolled past. Read the
  first line of a run; and use forward slashes, which normalise fine on
  Windows.
- The worktree still needs a `node_modules` junction to the main checkout
  (`New-Item -ItemType Junction`, PowerShell, not `mklink` through Bash — the
  09-21 lesson's finding, still true).

## Verified

- `venv-win/Scripts/python.exe -m pytest -q` — **worktree**: 1209 passed,
  1 failed (`test_viewer_js_suite.py::test_viewer_js_suite_is_green`, red in
  every worktree by design since 2026-09-18 — the `[real]` node-fs tier has no
  `data/` here).
- `venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py` —
  **worktree**: 15 passed (14 before, plus
  `test_passing_over_the_skip_arm_is_load_bearing`).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` — **worktree**,
  real data: 496/496.
- `node apps/annotate/run_tests.cjs` — **worktree**: 154/154.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` —
  **worktree**: FILL_BROWSER.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` —
  **worktree**, full table: FILL_BRANCH.
- `tmp/mutation-witness/` deleted from both checkouts; the `node_modules`
  junction removed from the worktree.

## The three repaired entries, as the tier reports them

FILL_ENTRIES
