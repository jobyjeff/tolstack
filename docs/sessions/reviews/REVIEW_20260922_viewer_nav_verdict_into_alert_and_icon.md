---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon.md
reviewer: agent (review/viewer_nav_verdict_into_alert_and_icon)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-22 — viewer_nav_verdict_into_alert_and_icon

Work reviewed: `handoff/viewer_nav_verdict_into_alert_and_icon` @ `3a6400e`,
four code commits plus the lesson, 15 files (+1392 / −298). Baseline
`integration` @ `e62dc39`. The merge into
`review/viewer_nav_verdict_into_alert_and_icon` was a clean **fast-forward** —
no conflict, so the canonical prompt's conflict carve-out does not apply and
nothing about the merged tree is a resolution choice of mine.

## Verdict

**APPROVE.** All three deliverables are met, and the one thing the handoff left
to the author's judgement (glyph vs SVG vs emoji; quiet variant vs nothing) is
decided with reasoning that survives being checked. Two should-fix findings,
one fixed inline and one filed; three nits. No blockers.

---

## The tactical agent's full-suite record

The lesson records both viewer tiers run through `--repo C:\workspace\tolstack`
from the worktree, the `node_modules` junction it needed and its removal, and
one named pre-existing flake (`[topology file://]` respine timing). It does
**not** state a `pytest -q` total. That is a gap in the record rather than in
the work — the tiers it does record are the ones this diff's shape actually
turns on — so I gave the record the benefit of the doubt for the *tiers*, ran
the risky subset pre-merge, and ran the full suite myself post-merge. Nothing I
ran contradicted anything the lesson claims.

## Risky subset, pre-merge (named, per the overlay's diff-shape mapping)

Rows matched: `apps/viewer/` · a CSS rule in either app · prose in a tracked
document · `scripts/run_viewer_browser_tests.mjs` (by
`grep -rl` → `test_app_type_scale.py`, `test_architecture_inventory.py`,
`test_mutation_witnesses.py`, `test_viewer_js_suite.py`).

| tier | result |
|---|---|
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **488/488** — `[real]` lines present, so the tier was armed, not silently skipped |
| `pytest -q test_js_python_vocabulary test_viewer_readme_doc_facts test_viewer_deep_link_contract test_app_type_scale` | **43 passed** |
| `pytest -q test_tolerance_stack test_provenance test_thermal_exception_list` | **185 passed** |
| `pytest -q test_mutation_witnesses test_architecture_inventory` | **24 passed** |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **25/25** browser checks, `[topology …] 212/212` both origins |

The CSS half of the diff makes the browser tier non-optional (the shim's
geometry is identical either way — that is precisely the bug this handoff
found), so it ran pre-merge as well as after.

## Full suite, post-merge, in the review worktree

`pytest -q` → **1 failed, 1208 passed in 118.72s**. The one red is
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, on the
documented worktree condition: `data/` is gitignored, the node-fs tier has no
projection, and since 2026-09-18 a skipped tier is a failure rather than a
skip. That tier I ran armed, through `--repo`, green (488/488 above). The count
matches the overlay's own measurement of a worktree run to the digit.

**No data pollution.** `find C:/workspace/tolstack/data -newermt "-3 hours"`
→ nothing. The worktree's own `data/` holds only its tracked `.gitkeep` /
`README` files. The `node_modules` junction into the main checkout was created
for the browser tier and removed with `cmd /c rmdir` (link only); the main
checkout's `node_modules` is intact.

## What I re-derived rather than took on trust

- **The live tally the lesson, the README and the code comments all state.**
  Forced the `[real]` study-row loop to print its accumulator:
  `{"warn":11,"fail":10,"silent":0}` over 21 rows. Exactly the lesson's table.
- **Which studies are red**, from `data/projections/viewer/topologies.json`
  directly: 10, being the nine `rotor_fastener_grip_u{2..10}h` variants plus
  `vpa_output_shank_out`. Exactly the lesson's attribution.
- **"16×16 px against a 13px label"** — `VA.WARNING_ICON_PX = 16`;
  `--t-dense: 13px` in `style.css`'s `:root`, which is what
  `.navtree__row--study` and `--stack` take. Consistent.
- **"211/212, and it names the offending rows"** — replanted. Muting
  `.navtree__row--study, .navtree__row--stack { flex-wrap: nowrap; }` gives
  `[topology file://] 211/212 sub-checks passed: FAIL`, one named sub-check,
  printing `Blade OML angular position, full-sweep-a | … worst-case s`. The
  lesson's claim is exact.
- **The screenshots against the rail they claim.** Read both: one mark per row
  at the right edge, the `rotor_fastener_length` block scannable as red against
  amber without reading a word, and the mark at the end of the row on the two
  two-line titles. The legibility claim holds at 16px beside 13px text.
- **No dangling references** to the three retired things
  (`VA.NAV_ALERT_VERDICT_STATES`, `.navtree__chips`, `studyBadges`) anywhere but
  in prose that is explicitly historicising them.

## New guards observed failing (never accept one on the strength of green)

| mutation | what fired |
|---|---|
| mute `.navtree__row--study, .navtree__row--stack { flex-wrap: nowrap; }` | browser `[topology file:// / http] 211/212`, one named sub-check, offending rows printed |
| `VA.stackVerdict`'s probe filter → `return true` | fast tier **486/488**: the `stackVerdict` test *and* the failing-stack-row test |
| `statusIcon()` → early return (no icon ever) | fast tier: 7 named reds across both nav blocks; browser tier: see finding 1 |

The third of those is what surfaced finding 1, and it is also the answer to the
"can this guard observe the thing it certifies" question: it can, and now it
says so.

---

## Findings

### 1. should-fix — **FIXED INLINE**: the browser tier aborted instead of failing when the rail has no mark

`scripts/run_viewer_browser_tests.mjs`, the `[real] the mark renders at a
legible size on every row` push. The label interpolated
`navAlerts.shapes[0].w` / `.h` while the *condition* beside it guarded
`navAlerts.shapes.length >= 1`. A template literal is evaluated as an argument,
so in exactly the case the check exists for — no `.navstatus` on the rail at
all — the label threw before `push()` ever saw the condition. Measured with the
`statusIcon` mutation above:

```
[topology file://] ABORTED after 174 sub-checks, 2 of them already FAILED
[topology file://] ERROR: Cannot read properties of undefined (reading 'w')
```

The legibility, border, two-colour and **placement** checks — the four this
handoff added — never reported, and the ERROR line names no file. That is the
overlay's own 1180-line-`try` entry (settled 2026-09-16) recurring in a new
shape.

Fixed: one `const shape = navAlerts.shapes[0] || { w: 0, h: 0 };` plus the
comment explaining why the default is there. Inside the boundary — no designed
behavior changes, no new test is needed to trust it, three lines. Re-ran the
same mutation after the fix: **5** sub-checks now report by name, including the
placement check, instead of 2. Then re-ran clean: **25/25**.

(The block still aborts *later*, on `navBadge.hover()` timing out against a
selector that cannot exist under that mutation. That is pre-existing structure
from the 2026-09-21 pass and it now happens after all four new checks have
reported, so it is out of scope here.)

### 2. should-fix — filed, not fixed: a measured live tally in the README that nothing asserts

`apps/viewer/README.md`: *"11 amber and 10 red across the 21 studies, both leaf
rows marked, measured 2026-09-22 and **pinned in `tests.js`**"*. Both digits are
right today — I re-derived them — but nothing pins them. The `[real]` tier
accumulates the split and then asserts `silent === 0`, `warn >= 1`,
`fail >= 1`; the browser tier prints it in a label and asserts `>= 1` of each.
One `rotor_fastener_grip` variant brought inside its criterion moves the split
with nothing going red.

Behavior change plus a judgement about which of two fixes is right, so it is
outside the inline boundary.
`ISSUE_20260922_the_viewer_readme_states_a_live_nav_tally_that_only_a_label_prints.md`
— `type: chore`, `priority: low`, with both candidate fixes written out.

Second sighting of the 2026-09-21 "printing is not asserting" entry, and it
sharpens it: that one turned on `apps/annotate/README.md` having no scanner at
all. This README *has* one and the sentence still isn't covered, because
`test_viewer_readme_doc_facts.py` is two claim regexes wide. Appended to the
overlay.

### 3. should-fix — filed, not fixed: ten new guards, no `mutation_witnesses.json` row

Same shape as `ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry`
and the `policy_free_residue` one filed this morning: the hand checks live in
this session's lesson and in this report, and nowhere a runner repeats them.
`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
carries **two paste-ready rows, both planted and measured against the merged
tree in this review** rather than transcribed — which is the precaution the
overlay's newest entry asks for (4 of 26 transcribed rows failed to reproduce
3 days later). It also records what is *not* paste-ready and why, and one trap:
the placement check's rendered label ends in a live row count, so `expect_red`
(a substring match) must stop before it.

### Nits

- **A vacuous sibling of finding 1.** `boxed.length === 0` and
  `unreadable.length === 0` are both `filter(...).length === 0` over
  `navAlerts.shapes`, and pass on the empty collection. The legibility push
  carries `shapes.length >= 1`; the border/radius/outline push does not, so
  with no icons on the rail it reads green. The class is covered by the
  `icons >= 1` assertion two pushes up, so it cannot hide a regression on its
  own — but the "on every row" wording promises more than it checks.
- **Two hand-written floors for one number.** `const SIZE = 14` in the browser
  tier and `ok(VA.WARNING_ICON_PX >= 14)` in the fast tier are independent
  copies of the same legibility floor, neither derived from the other and
  neither from `VA.WARNING_ICON_PX` (16). A floor is not a restatement of the
  value, so this is not the count-drift defect proper — but if the icon is ever
  resized down, two files disagree about what "legible" was.
- **`navAlerts.leaves === 2` pins a live count without saying so.** The study
  tier next to it uses `rows >= 20`, and the `silent` pin carries an explicit
  "update the count and say so" comment. The leaf count has neither, so a third
  loose stack reds the browser tier with no note telling its reader that is the
  intended signal.

### Design read (filed nowhere — nothing to file)

Read the changed surface against the visual-hierarchy rules. It moves *toward*
them on every axis the rules name: hierarchy from name and position rather than
decoration; one mark per row instead of up to five; red/amber for state only,
and red spent on exactly one state; no boxes inside boxes (the chip framing is
gone, and the one box left is a `:focus-visible` ring, which is the right
exception); a row with nothing to say shows nothing, which is the house rule
almost verbatim. `VA.WARNING_ICON_PX` is a pixel size outside the type scale,
and the author anticipated that reading and documented it as a picture rather
than a step — correctly, and `test_app_type_scale.py` still enforces the bare-px
font-size ban. Nothing to file.

### Handoff fences, checked

`apps/annotate/` untouched. The worksheet/summary pane untouched. The check
detail cards' own verdict rendering untouched — the new
`.hovercard__alert--verdict-*` rules only bite on a `kind` that
`VA.navVerdictAlert` alone produces, so the elements table's badge card is
unaffected. `data/inbox/specs/` and `docs/reference/` untouched. Nothing
written into drawing-checker.

## Note for the next reviewer

The quiet row is **unreachable on live data** and the author says so in three
places. That is honest and correctly pinned (`eq(seen.silent, 0)` with a
comment saying a red there means a stack got *better*), but it does mean the
`pass → no mark` branch is carried entirely by synthetic fixtures. If a future
pass makes a study clean, that line goes red and the right move is to read the
loop and move the number, not to delete the assertion.

Also: the lesson's warning about the `node_modules` junction is worth heeding
literally. Remove it with `cmd /c rmdir`, never `Remove-Item -Recurse`, which
would follow the link into the main checkout.
