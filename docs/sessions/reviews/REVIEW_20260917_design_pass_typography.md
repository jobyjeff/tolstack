---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_design_pass_typography.md
reviewer: agent
date: 2026-09-17
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-17 — design_pass_typography

Four commits on `handoff/design_pass_typography` (`608a1fc` … `3c0c810`),
merged into `review/design_pass_typography` as a **fast-forward**: `integration`
had not moved since the branch was cut at `b3b60e0` (`git log HEAD..integration`
empty; `merge-base` = `b3b60e0`), so there was no conflict to resolve and
nothing landed underneath the work. Containment checked before the merge with
`git merge-base --is-ancestor` — NOT merged, so the merge-and-watch-the-tiers
step was real. No worktree held `integration`. The tactical worktree was clean;
nothing had to be committed on the author's behalf.

**Stack checks 1–7 of this overlay do not apply.** The diff is CSS, one class
name in `apps/annotate/app.js`, four docs, two test/probe files and 26 PNGs — no
stack, topology, spec-library or `hardware_entries.json` data, no `source_ref`,
no fold, no `lmc`/`mmc`, no traced ratio. Verified rather than assumed:
`git diff --name-only integration...handoff` touches nothing under
`tolerance_stack/`, `scripts/`, `docs/tolerance_stacks/` or `docs/topologies/`,
so the author's "no vocabulary constant and no projection field changed" claim
holds. `data/inbox/specs/` and `docs/reference/` untouched. No citation was
created or re-read, so there was no drawing-checker read to snapshot; nothing in
the diff lies outside this repo.

## What I verified

**Four tiers, on the merged tree.**

| tier | result |
|---|---|
| `venv-win/Scripts/python.exe -m pytest -q` | 1 failed, **1198 passed**, 1 skipped |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **453/453** (tier ran) |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **22/22 suites** |
| `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` | **54/54 witnessed** |

pytest, the fast tier and the browser tier were **re-run after** my inline fixes
below and are the figures above. The mutation tier's 54/54 was measured on the
merged tree before them; instead of repeating a ~90-minute run I checked what
those fixes could reach. My only app-file change is comment text in
`apps/viewer/topology.css`; none of the registry's 11 CSS `find` strings falls in
or near it, `tests/test_mutation_witnesses.py` — the cheap half that reddens on a
`find` that no longer resolves — is green in the pytest run above, and I re-ran
the three `topology.css` entries nearest the edit individually
(`pane-default-width`, `pane-divider-visible-at-rest`,
`flyout-docks-left-of-the-dag`): all three WITNESSED.

**The one Python failure is pre-existing and not the branch's.**
`test_no_live_document_states_an_unguarded_hardware_entry_count`, naming
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`.
Stated as a diff fact, not from memory: I ran `pytest -q` at the merge-base
`b3b60e0` **before** merging and got `1 failed, 1192 passed, 1 skipped` with the
identical message, and the branch opens no file under `docs/strategy/`. The
lesson's "+6 from the new guard" reproduces exactly (1192 → 1198, and
`test_app_type_scale.py` has six tests). The author correctly did **not** file a
fifth issue about it —
`ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_count_guard`
was already in the merge-base tree.

**Projection stamps, read before trusting any `[real]` result**, per this
overlay: `results.json` and `crops.json` = `master @70241cec`,
`topologies.json` = `review/python_value_and_schema_pins @6da6bbbc`, all three
`dirty: false`. Two trees, neither of them this handoff's, both predating it —
the known concurrency shape, and harmless here because this pass changes no
projection input. Nothing needed rebuilding and I rebuilt nothing. The main
checkout's `data/` has no file written in the last three hours after all my runs,
and my worktree carries no stray `workspace…data` directory.

**The new guard was observed failing, four ways.** `tests/test_app_type_scale.py`
is the author's own volunteered addition, and it bites:

| mutation, in a scratch tree | result |
|---|---|
| one `var(--t-dense)` → `13px` | red on `test_no_stylesheet_declares_a_font_size_off_the_scale`, naming file:line |
| `--t-dense` moved in the annotator copy only | red on `test_the_annotator_copy_of_the_scale_matches_the_owner` |
| `--t-page` deleted from the owner's `:root` | red on 3 tests, incl. `…declares_exactly_the_named_steps` |
| `text-transform: uppercase` added to `.detail__head h3` (`--t-title`) | red on `test_no_rule_sets_all_caps_above_the_metadata_step` |

Each reddens on the test that owns the claim. Its docstring's honest
"what this does NOT do" section is accurate: it reads `:root` and the
`font-size` declarations, and nothing else.

**All 26 committed screenshots are byte-reproducible.** This is the strongest
evidence in the branch and it is worth recording as such. I re-took both phases
independently — the `after` phase from the merged tree, the `before` phase from
the baseline stylesheets (`git show integration:` for the three `.css` files and
`app.js`) — into a scratch tree, and compared sha256 against the committed PNGs:
**26 of 26 identical**, 13 per phase. So the probe is genuinely deterministic as
its header claims, the committed pairs are exactly what the two stylesheets
render, and nothing was hand-touched.

**The census table's every figure reproduces.** Running the committed probe and
diffing its output against the lesson's eight-row table, both columns:

* nav rail 13/12/11/**10** → 13/11, 61 → 17 filled, 61 → 17 bold — measured
  `10px x42` before and absent after; 61/61 → 17/17 ✔
* preview pane **15**/13/12/11 → 16/14/13/12/11, 4 → 1 bold ✔
* totals 14/13/12/11/**10** → 14/13/12/11, 3 → 1 filled, 5 → 1 bold ✔
* hover card unchanged sizes, 2 → 1 bold ✔
* stack view **17/15**/…/**10** → 16/14/13/12/11, 50 → 45 filled, 130 → 46 bold ✔
* worksheet dialog 18/**17**/**15**/13/12/11 → 18/16/14/12/11 ✔
* annotator rail **16**/**13.3**/12/11 → 13/12/11 ✔
* annotator detail pane **15.2**/**13.3**/13/11 → 16/13/11 ✔

**The nine-sizes premise the whole pass rests on reproduces.** The baseline
stylesheets declare exactly 10, 11, 12, 13, 14, 15, 16, 17, 18px — nine values —
and the two "arrived by accident" cases are real: `apps/annotate/style.css`
declared no base size (measured `16px x3` on the element rail in the `before`
census, the largest type on that page) and its detail-pane `h3` measured
`15.2px`, a size on no scale.

**The arithmetic in the `--measure` comment reproduces**, measured in a real
Chrome at both sizes: 1ch = **7.01px** at `--t-dense` and **7.55px** at
`--t-body` (comment says 7.0 / 7.5), and the rejected `84ch` is **589px** at
`--t-dense` (comment says 589). 72ch lands at ~83 rendered characters at both
sizes on the comment's own ~15% zero-to-average ratio, inside the 45–90 house
rule.

**The "no second theme" claim is true.** `grep -rn 'prefers-color-scheme|
data-theme|color-scheme' apps/` returns exactly one hit, and it is the
`color-scheme: dark` this pass added. So the definition of done's "both themes
for at least the topology page" had nothing to satisfy, and filing it rather
than faking a second set of shots is the right call.

**The worksheet-heading premise is exact.** `WORKSHEET_hub_bearing_thermal_fit.md`
renders 1 h1, 11 h2 and 26 h3 — precisely what the `.worksheet__body h3` comment
claims, which is what makes the "a 12px uppercase grey chip would leave a whole
document with no structure" argument land.

**Issue frontmatter.** All four filed issues carry `type` / `priority` /
`status: open` / `area` / `reporter: agent` and `found_by:` (never `handoff:`),
with values inside the closed sets; one carries `audience: strategy`, correctly.
None is a duplicate: the nearest sibling,
`ISSUE_20260915_annotate_banner_renders_a_terminal_command_for_the_user_to_copy`,
is `status: resolved` and about the *banner*, where the new filing is about the
console placeholder and the parts-panel label — different surfaces.

**Deliverables against the handoff.** (1) both apps swept, 13 surfaces shot;
(2) the doc note is `docs/DESIGN_TYPE_AND_COLOUR.md`, which does keep its promise
to state no scale values and points at the one home for them; (3) four issues
filed for what CSS could not fix, each with a measurement rather than an opinion.
The three "surfaces left alone" arguments (the accent on `.mat-row__applied`,
`.topbar .sub`'s path, `.an__scene-empty`'s centring) are each reasoned and each
names where the decision belongs.

## Findings

### should-fix

**S1 — every visual rule this pass settled reverts green in all three tiers,
including the headline fix.** Filed as
`ISSUE_20260917_the_typography_passs_visual_rules_are_unwitnessed_in_every_tier.md`
(`med`), with the two assertions that would close it. Measured one revert at a
time in a `git archive HEAD` scratch tree, then all seven together — pytest at
its baseline, fast tier **453/453**, browser tier **22/22**, every time:

* **`.chip.conf--*` → `.conf--*`** (drop the `.chip` scope on all four rules).
  This is the pass's own headline — the lesson calls it "the single biggest
  finding" and "most of what the before/after screenshots show" — and it is the
  one revert with a reader-visible cost rather than an aesthetic one: the two
  filled rules' `color: #fff` and `font-weight: 700`, written for an 11px pill,
  go back to arriving by **inheritance** on every cell of every untraced row.
  Confirmed browser-green on its own as well as in the group.
* the 12 `max-width: var(--measure)` caps; `.el-row__name { min-width: 190px }`;
  the `2.8em` note clamp; the crop trigger's quieting; the attention flags'
  un-filling; the annotator's base size.

The common cause is that `test_app_type_scale.py` reads `:root` and the
`font-size` declarations — so the *scale* is pinned and no *rule* below it is —
and that a declaration a rule hands down by inheritance is invisible to any
selector-based guard. That is now in the overlay, both as a second sighting of
the CSS-only entry and as its own entry about vocabulary-token selectors.

**Not a blocker**, and the reasoning is the one
`REVIEW_20260917_crop_lightbox_zoom_viewer` used on the same shape a day
earlier: the shipped CSS is correct, all 26 screenshots — the evidence the
definition of done actually asks for — are byte-reproducible, every deliverable
the handoff *named* is delivered, the pass volunteered a real guard that was
observed failing, and the fix is additive assertions. I considered the
2026-09-16 `viewer_hover_deslop_and_banner_purge` blocker precedent and it
distinguishes: there the deliverable was a stated numeric **default** already
asserted in the author's own probe, so a pin was one line away and skipped. Here
the un-pinned items are visual rules, and the available pin was written.
That issue and the crop-lightbox one are the same enrolment pass — **triage
should stage them together.**

**S2 — the probe aborts before 6 of its 13 surfaces, five runs in eight.**
Filed as
`ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_runs_of_eight.md`
(`low`). Paste-running the command the lesson gives for re-taking the shots
throws an uncaught `locator.scrollIntoViewIfNeeded: Element is not attached to
the DOM` inside `tableAround`; either of its two call sites can be the one that
goes (3 on `tr.el-row`, 2 on `tr.mat-row`). I eliminated the two obvious causes
by instrumenting the helper: there is **no** `.tv__ghost`, one `.tv__hscroll`,
one `#stackview`, 8/3 rows present and `lastTopoRender.tweening` already
`false` — so it is not the documented cross-fade race (adding that wait did not
fix it) — and `#stackview` holds **zero** `<img>`, so it is not late-loading
images restretching the row. I did not isolate it further.

A locator-free `tableAround` (one `page.evaluate`, which is what the function
already ends in) is stable — 4 runs, 0 aborts, all 13 surfaces — but it **moves
two of the committed shots** (9 and 13 differ; the other eleven stay
byte-identical), so what those two frame is the probe author's call and not a
reviewer's. Replayed fix and both measurements are in the issue. This matters
more than "a hand-run probe" suggests, because for a CSS-only pass the probe's
pairs and census *are* the evidence — see S1.

### fixed inline

**F1 — three rows of `apps/viewer/README.md` describe marks this pass
re-tuned.** That README documents the rendered treatment chip by chip and
nothing pairs it against the stylesheet
(`ISSUE_20260916_nothing_pairs_apps_viewer_readme_against_the_strings_it_documents`),
and the same commit added a *new* paragraph to it about the fill rule while
leaving three statements of the old rendering standing — the "fixed the one copy
and missed the others" shape:

* the chip-legend row `**filled magenta CTE NOT TRANSCRIBED**` —
  `.chip--values-not_transcribed` is outlined since this pass;
* the same chip's second copy in the materials-sourcing prose,
  "`not_transcribed`: **filled magenta**";
* the row `blue checks GENERATED` — `.chip--generated` is
  `color: var(--muted)` now, with no border colour.

All three corrected with the date and the reason. I swept the rest and these are
the only three: the `BUDGET` and `NOT A RESULT` rows say "amber" without
claiming a fill and stay true, and no live doc describes the `DERIVED` /
`BRANCH POINT` chips, the crop trigger or the flags' fill at all.
`.el-export--loud`'s "filled magenta on the panel's block" (line ~1344) is
loose, but it was loose before this branch — that rule is a spine and a wash and
this pass did not touch it, so it is out of scope here and left alone.

**F2 — the legend-dialog comment's conclusion does not follow from its own
arithmetic.** `topology.css` argued that moving the two dialogs from 13px to
body size fixes the measure "rather than by a second number". Measured: 640px is
91.3ch at `--t-dense` and 84.8ch at `--t-body`, i.e. ~105 and **~97** rendered
characters — so the step narrows the line and still leaves it past the 90 the
house rule allows, and the same commit *does* add the second number
(`#legend-dialog li` and `.worksheet__body > p` each take `--measure` below).
Corrected to say that, with the measured figures. Comment text only.

**F3 — the lesson's fast-tier count is the tier-skipped number, unlabelled.**
The test-tier table reads `node apps/viewer/run_tests.cjs | 368/368` with no
`--repo`, so `SKIP node-fs tier` fired and 85 `[real]` tests did not run — which
is exactly what the definition of done attached `--repo C:/workspace/tolstack`
to, and what this overlay's standing entry says a quoted JS count must disclose.
Confirmed both numbers myself on the merged tree: **368/368 skipped, 453/453 with
the tier running**, so nothing was hiding behind the skip. Flagged in the table
and given a correction blockquote with both figures, so the number is not quoted
forward as a full-suite green.

### nits

* **`align-self: flex-start` landed on a five-selector shared button rule, and
  two of the five immediately opt back out.** In `apps/annotate/style.css` only
  `.an__console button` needed it (the `Run` button stretched to the console's
  column); `.bind-form button` / `.owner-not-in-set-form button` now restate
  `align-self: stretch` to undo it, and `.part-row`'s `Isolate` button changes
  from the row's `align-items: center` to top-aligned. No visible effect today —
  in both `.part-row` and `.topbar` the button is the tallest flex item, so
  `center` and `flex-start` coincide — but it is latent, and the rule that
  wanted it was one of five.
* **`test_app_type_scale.py` scans raw CSS, so a comment quoting a retired
  declaration is a false positive.** Measured: inserting
  `/* was .muted { font-size: 13px; } until 2026-09-17 */` reddens
  `test_no_stylesheet_declares_a_font_size_off_the_scale` at that comment's
  line — and this repo writes exactly that kind of comment (the shipped ones
  already say "It was 15px ALL-CAPS until 2026-09-17", one word short of
  tripping it), so the natural repair is to delete the explanation. Stripping
  `/* … */` before both scans is three lines. Related, same cause: the
  all-caps check parses blocks with `([^{}]*)\{([^{}]*)\}` over raw CSS, and
  `topology.css` already carries one comment containing `{ width }` — benign
  because the braces balance, but an odd brace in a comment would swap selector
  and body for every rule after it and silence the check.
* **`docs/DESIGN_TYPE_AND_COLOUR.md` says it "states **no numbers**" and then
  states a few** — "at most two steps beyond body", "steps of 2px, in multiples
  of 4", "line height ~1.4–1.6". These are conventions rather than values with a
  home, which is the defensible reading, but the absolute claim in the blockquote
  is wider than the page.
* The console's log dropped from 11px to `--t-meta` (12px) while every other
  tiny label went to `--t-micro` (11px) — a choice the scale permits and the
  lesson does not mention either way.

## Note for the next reviewer

Two overlay entries were added from this review: the **CSS-only deliverable**
entry has a second sighting that moves its question from "is there a pin" to
"does the pin cover a rule or only the numbers", and there is a new entry on
**a CSS rule keyed on a vocabulary token alone**, which is the mechanism behind
this branch's headline fix and is still live on `.tvflag` and
`.chip--values-*`.

The thing worth copying from this handoff is the probe's `--phase before|after`
shape. A styling pass has no numbers unless someone produces them, and this one
is deterministic enough that 26 screenshots taken on a different machine three
days later came back byte-identical — which is what let this review check the
entire deliverable rather than take the pictures on trust. Any future
`design_pass_*` handoff in this repo should be handed
`tests/debug_typography_pass.mjs` as the template, with S2 fixed first.
