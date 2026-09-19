# LESSONS 2026-09-18 — visual_rules_nothing_checks

Four deliverables: the crashing typography probe, and the three classes of rule
no tier could tell was broken. All four landed. What follows is only what the
next agent cannot get from the diff.

---

## 1. The probe's crash was not where two sessions looked, and the cause makes the fix smaller

`ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_runs_of_eight`
did careful work and eliminated the two obvious causes correctly — the
cross-fade `div.tv__ghost`, and late-loading images restretching the row. Its
instrumentation showed the row present, one `#stackview`, `tweening: false`,
zero `<img>`. All of that is true. The conclusion it drew from it —
"Playwright's actionability check still gives up on a settled row" — is not.

**The probe schedules the destruction of the row it then acts on.** Three lines
earlier it calls `page.setViewportSize({ width: 2200, height: 1000 })`, and
`apps/viewer/topology_app.js:247` re-paints on `resize` behind a **150ms
debounce**. Measured with a `MutationObserver` on `#stackview`:

```
t+10ms   >>> setViewportSize returned
t+46ms   >>> nav click returned
t+64ms   childList on stackview removed=0 added=1     (the nav's own render)
t+113ms  >>> waitForSelector tr.el-row satisfied
t+187ms  childList on stackview removed=8 added=0     (the resize's render)
```

`tableAround` runs between t+113 and t+187, so its locator resolves a `<tr>`
that the debounced repaint detaches mid-action. That is the whole of it, and it
explains the reported 5-in-8: it is a race against a fixed timer, so it depends
only on how long the click, the `waitForSelector` and the 900-element
`typeCensus` in between happen to take. In this worktree it reproduced **3 of
3**; after the fix, **10 of 10 clean, 13 of 13 surfaces, exit 0**.

**Why this matters beyond the probe:** the diagnosis the issue reached was
*"the row is settled and Playwright is wrong"*, which is a dead end — there is
nothing to fix there, and the candidate repair it proposed was to stop using
the locator action at all. That repair works, but it lands on a different scroll
offset and would have **re-framed two of the 26 committed screenshots to dodge a
race instead of removing it**. Waiting out the debounce keeps every shot: 9 and
13 come out byte-identical to the committed pair.

The generalisable form: **when a Playwright action fails on an element that is
demonstrably present and settled, look at what the test itself did in the last
200ms before assuming the tool is wrong.** `setViewportSize`, a nav click and a
programmatic scroll all arm work in this app. `scripts/run_viewer_browser_tests.mjs`
already knew this and waits `450ms` after each of its three `setViewportSize`
calls; the probe was written without that, and the reason is visible in the
diff — the browser suite's waits carry no comment saying what they are for, so
there was nothing to copy. There is now: `RESIZE_DEBOUNCE_SETTLE` names the
number and the reason in one place.

### The probe's committed screenshots have drifted, and it is not this work

Worth knowing before anyone trusts them. The crash issue recorded a strong
property — 26 of 26 byte-identical across machines, verified in review on
2026-09-17. **It no longer holds: 7 of the 13 `after` shots differ from a
re-take today.** Checked three ways before reporting it: the *pre-fix* probe
produces the same differences, the fixed probe is byte-identical across three
independent runs, and `apps/viewer/style.css` (+39), `topology.css` (+9) and
`views/stack.js` (+44) all changed between the shots' commit (`2b82cfc`) and
`integration`. So the app moved under the screenshots. Filed as
`ISSUE_20260918_the_committed_typography_screenshots_no_longer_match_what_the_probe_takes`
with `audience: strategy`, because re-taking the `after` phase alone would
present two unrelated handoffs as the typography pass, and the real question is
what the convention should be for the four such pairs in `lessons/`.

---

## 2. THE PATTERN — and the answer the brief asked for

The handoff's real question: *each of these three measurements was made by a
reviewer planting reverts in a scratch tree, and none by the tiers. Is
revert-planting cheap enough to become a standing step for design-pass
handoffs, or is the mutation-witness tier already that step and these guards
simply never joined it?*

**The mutation-witness tier already IS revert-planting.** That is not a
near-miss — the ten reverts I planted are *literally* its schema. Each one is a
`{file, find, replace, tier, suite, expect_red}` tuple, and I have since
rewritten all ten as single-line `find`/`replace` pairs and verified each has a
unique `find` and names a red (listed in §4). Nothing new needs inventing.

**But enrollment would not have caught any of the three issues, and this is
the finding worth carrying to the brief.** `BRIEF_20260915_mutation_witness_enrollment`
sketches the key as:

> for every test or guard a diff adds or modifies, either a
> `scripts/mutation_witnesses.json` entry names it, or the diff records why not.

Apply that key to the two handoffs these issues came from:

- **`design_pass_typography` added exactly one guard**, `tests/test_app_type_scale.py`.
  Review observed it failing four distinct ways. It was *already* the
  best-witnessed thing in the diff. Mechanical enrollment would have demanded
  entries for it — which would have been correct and cheap and would have
  changed nothing, because **the seven unguarded rules added no test to
  enroll.**
- **`crop_lightbox_zoom_viewer`**: of eleven reverts tried in review, eight
  already reddened a named check. The three that did not were rules with **no
  assertion at all**. Again: nothing to enroll.

So the two sets are disjoint. **Enrollment keys on the tests a diff adds. This
class is about the rules a diff settles and does not test.** A guard cannot be
enrolled before it exists, and the gap here was entirely upstream of
enrollment. Mechanical enrollment is worth doing on its own merits — the
brief's nine-of-sixteen measurement is about guards that survive their own
mutation, which is a real and different class — but it should not be sold as
the fix for *this* one, and the brief currently reads as though it might be.

**The key that would have caught these is the DELIVERABLE, not the diff.** For
a design pass: one planted revert per rule the pass settled, each required to
name a red. That has to be a line in the handoff's definition of done rather
than a tier, for one reason — **only the author has the list.**
`design_pass_typography`'s own lesson enumerates all seven rules it settled.
The list existed, in the right place, written by the right person. Nothing ever
asked whether any of them was witnessed. That is a one-line addition to a
design-pass handoff template, and it is the cheapest of the three options on
the table.

**On cost, measured rather than estimated.** The expensive part is not the
running:

| step | cost |
| --- | --- |
| scratch tree (`git archive` + `tar` + `node_modules` junction) | ~5 seconds |
| one revert, pytest module only | <1 second |
| one revert, fast tier | ~12 seconds |
| one revert, browser tier with `--only` | 25–40 seconds |
| **all ten reverts, once the plant script existed** | **~5 minutes** |

The real cost is *writing the reverts* — knowing which lines are load-bearing.
That is author knowledge, spent cheaply at authoring time and expensively by
anyone else. It is also why the `--only <suite>` seam matters so much: without
it each revert would cost a 6-minute full browser sweep, and ten reverts would
be an hour rather than five minutes.

### A prerequisite the brief does not name: pytest is not a tier

If enrollment does go mechanical, this blocks on day one. `tests/test_mutation_witnesses.py`:

```python
TIERS = frozenset({"fast", "annotate", "browser"})
```

and `scripts/run_mutation_witness_tests.mjs`'s `TIER_HARNESS` has three
entries, all `node` scripts. **There is no python harness, so a pytest guard
cannot hold a mutation witness at all.** Two of the four guards this session
added are pytest guards
(`test_no_rule_keys_on_a_confidence_token_alone`,
`test_both_apps_set_their_base_size_from_the_scale`) and neither can be
enrolled today. pytest is where most of this repo's guards live — 1205 tests
against the fast tier's 456 — so a rule of the form "every guard a diff adds
gets an entry" will demand a fourth harness immediately, on the largest tier.
That belongs in the brief's **Prerequisite** section beside the two plumbing
issues already there.

---

## 3. Decisions I made that were not in the handoff

**Which tier witnesses each lightbox geometry line** (the handoff asked for the
cheapest that can genuinely see it, and for the reasoning per line):

- **the fit sizing → FAST tier.** `stageBox()` is the only thing in
  `views/lightbox.js` that measures; everything downstream is arithmetic. So a
  stage box can simply be *declared* — `handle.stage.getBoundingClientRect =
  () => ({width: 846, ...}); handle.apply();` — and `figure.style.width` read
  back. That is not a fake layout standing in for a real one, it is handing the
  one measuring function its whole input, and it puts the check beside
  `lightboxFitSize`'s own value-by-value pins. **The handle exposes `stage`,
  `figure` and `panNode`, which is what makes this possible at all** — worth
  knowing, because it means most of this file is fast-tier-reachable.
- **the clamp → BROWSER tier.** The claim is "no blank stage beside the
  picture", which is two laid-out rects. In the fast tier I would have to
  re-derive the picture's position from the same numbers `apply()` used — the
  *asks-the-view-model-instead-of-the-page* shape that is the entire reason
  this went unnoticed (the existing sub-check whose **name** is the fit claim
  asserts `fit.scale === 1`, which is true of the unpositioned state too).
- **the hairline → BROWSER tier**, no judgement involved: it is a CSS `calc()`
  over a custom property and the fast tier has no stylesheet.

**A sub-check I wrote, measured, and then deleted.** `.lightbox .crophl` makes
two claims — the divided border width, and `box-shadow: none`. I wrote both.
The glow one passes **with the rule deleted**, because the suite's subject is
derived as a `declared_region` crop, `declared_region` is `solid: false`, and
`views/crop.js` therefore classes its box `.crophl--dashed` — whose own rule
carries `box-shadow: none`. A check green for a reason other than the one it is
named for is precisely the defect this handoff existed to close, so shipping
one while closing three would have been a poor trade. Removed, with the
measurement recorded in a comment at the site, and filed as
`ISSUE_20260918_the_lightboxs_glow_suppression_is_only_witnessable_on_a_solid_highlight`
— the claim is real on the 29 live `verified_match` highlights, which are solid
and do carry the glow; it needs a second subject and a second open.

**The `file://` judgement call (deliverable 4): built the coverage.** The
handoff framed it as "is there anyone who will ever open the viewer from a
`file://` URL with real crops — if the honest answer is no, write that down and
stop." The honest answer is **that is the primary way this app is used**:
`package.json` says the viewer "stays build-free classic scripts that run by
double-clicking index.html from file://", and a reader who double-clicks and
grants a folder reads real crops through FSA. So the configuration is not
marginal.

What made it cheap enough to just do: `testRealDataRenderPath` already swaps
`VA.FsaAdapter` for a `MemoryAdapter` over the three real JSONs and was passing
`images: {}`. **`MemoryAdapter.readCropImage` returns a `blob:` URL built from
the key, not bytes** — so the entire fixture cost is making that map non-empty,
and the frame still sizes correctly (from the crop index's own `width`/`height`)
and the highlight boxes still position (percentages of the frame). No geometry
waits on a decode. The `?mock=1`-fixture alternative the issue also offered was
declined and the reasoning is in the suite: it changes what the demo tour shows,
which is a design question, and it covers a dataset nobody reads real numbers
from.

**One thing to know about the `--measure` check's subject.** It reads
`#stackview .check__guidance`, and the suite runs at **1600×1000 deliberately**
— at 2200px auto table layout gives the name column 410px and the 190px floor
is slack, so a floor check there would pass with the rule deleted. Measured
across widths: 190px at 1280/1400/1600/1800, 410px at 2200. If anyone widens
this suite's viewport, the name-column check silently stops meaning anything.
The squeeze is asserted as its own sub-check for that reason.

---

## 4. The new guards, for `mutation_witness_enrollment_gaps`

Named here because the handoff asked, and `scripts/mutation_witnesses.json` was
explicitly out of scope for this session (the parallel handoff owns it). **All
eleven below are measured, not proposed**: each `find` occurs exactly once in
its file, and each was planted in a `git archive HEAD` scratch tree and
observed reddening the named sub-check. The `expect_red` values are the whole
printed name — note they are written in the source as adjacent string literals,
which `CONCATENATION_SEAM` in `tests/test_mutation_witnesses.py` already
handles.

**New browser suite** (also a new `SUITES` registry key, so `suite` values
below resolve): `typography pass's visual rules (live stack view)`.

| suggested id | file | find → replace | tier / suite |
| --- | --- | --- | --- |
| `conf-token-is-scoped-to-the-chip` | `apps/viewer/style.css` | `.chip.conf--untraced { color: #fff;` → `.conf--untraced { color: #fff;` | browser / typography pass's visual rules (live stack view) |
| `stack-view-prose-keeps-its-measure` | `apps/viewer/style.css` | `.check__warn, .check__note { max-width: var(--measure); }` → `.check__warn, .check__note { }` | browser / same |
| `element-name-column-keeps-its-floor` | `apps/viewer/style.css` | `.el-row__name { min-width: 190px; }` → `.el-row__name { }` | browser / same |
| `source-note-stays-a-preview` | `apps/viewer/style.css` | `  max-height: 2.8em; overflow: hidden;` → `  max-height: 4.6em; overflow: hidden;` | browser / same |
| `crop-trigger-is-not-filled` | `apps/viewer/style.css` | `  background: transparent; color: var(--ink);` → `  background: var(--on); color: #fff;` | browser / same |
| `attention-flag-is-not-filled` | `apps/viewer/topology.css` | `  background: none; padding: 1px 5px;` → `  background: var(--untraced); padding: 1px 5px;` | browser / same |
| `lightbox-frame-is-sized-to-the-fit` | `apps/viewer/views/lightbox.js` | `        figure.style.width = Math.round(fit.width) + "px";` → `        figure.style.width = figure.style.width;` | **fast** (no suite) |
| `lightbox-view-is-clamped-to-the-stage` | `apps/viewer/views/lightbox.js` | `        view = VA.lightboxClamp(view, fit, stageBox());` → `        view = view;` | browser / crop lightbox (launch, zoom, pan on the live crops) |
| `lightbox-highlight-edge-is-unscaled` | `apps/viewer/style.css` | `  border-width: calc(2px / var(--lightbox-scale, 1)); box-shadow: none;` → `  border-width: 2px; box-shadow: none;` | browser / crop lightbox (…) |
| `lightbox-opens-modal-on-file-origin` | `apps/viewer/views/lightbox.js` | `    if (!dialog.open) dialog.showModal();` → `    if (!dialog.open) dialog.show();` | browser / real render path (non-mock) |
| `lightbox-suppresses-the-pages-scroll` | `apps/viewer/views/lightbox.js` | `    document.body.classList.add(BODY_OPEN_CLASS);` → `    document.body.classList.add(BODY_OPEN_CLASS + '-nope');` | browser / real render path (non-mock) |

Two notes for whoever writes these up:

- `crop-trigger-is-not-filled` and `attention-flag-is-not-filled` redden the
  **same** sub-check (the fill census), so they are two entries with one
  `expect_red`. That is correct and is the census's whole point — it
  generalises to the next mark anybody fills — but it means the tier will
  report the same name twice and a reader should not take that for a duplicate.
- `lightbox-opens-modal-on-file-origin` reddens **two** sub-checks (the modal
  one and the Escape one, since `show()` leaves Escape without a dismiss). Pick
  the modal one for `expect_red`.

**And the two that cannot be enrolled**, per §2:
`test_no_rule_keys_on_a_confidence_token_alone` and
`test_both_apps_set_their_base_size_from_the_scale`, both in
`tests/test_app_type_scale.py`. Their reverts are measured and named in the
issues; they are waiting on a python harness in `TIER_HARNESS`.

---

## 5. Left to do

- The two issues filed above
  (`…_lightboxs_glow_suppression_…`, `…_committed_typography_screenshots_…`).
- The eleven entries in §4, which belong to `mutation_witness_enrollment_gaps`.
- A worktree cannot run `pytest -q` green — `tests/test_viewer_js_suite.py`
  fails on the skipping `[real]` tier, by design since 2026-09-18. Baseline
  before this work: 1 failed / 1203 passed. After: **1 failed / 1205 passed**,
  same single failure. Fast tier **456/456**; browser **23/23 suites**
  (`crop lightbox` 17 → 20 sub-checks, `real render path` 10 → 15, plus the new
  9-check typography suite).
