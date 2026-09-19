---
type: review
handoff: docs/sessions/active/HANDOFF_20260918_visual_rules_nothing_checks.md
reviewer: agent (review/visual_rules_nothing_checks)
date: 2026-09-18
verdict: APPROVE
blockers: 0
---

# Review — visual_rules_nothing_checks

**APPROVE.** All four deliverables land, and the central claim of the handoff —
that each new guard actually reddens on the revert it was written for — was
re-measured independently here rather than taken from the lesson. **All thirteen
mutations were planted and all thirteen reddened the named check.** Three
should-fixes are filed as issues; two factual errors were corrected inline.

## What I verified, and how

Merged `handoff/visual_rules_nothing_checks` into `review/visual_rules_nothing_checks`
(clean, no conflicts), junctioned the main checkout's `node_modules` in, and ran
all three tiers from the review worktree against `--repo C:/workspace/tolstack`:

| tier | result |
| --- | --- |
| `PYTHONIOENCODING=utf-8 … pytest -q` | **1 failed, 1208 passed** — the single failure is `test_viewer_js_suite.py`, red by design in a worktree |
| `node apps/viewer/run_tests.cjs --repo …` | **456/456** |
| `node scripts/run_viewer_browser_tests.mjs --repo …` | **23/23 suites** — `crop lightbox` 20, `real render path` 15, `typography pass's visual rules` 9 |

**The mutation-witness tier was re-run after the merge, per this overlay's
standing instruction, and came back `64/64 declared mutations witnessed`** —
plus `tests/test_mutation_witnesses.py` 14 passed. That matters here more than
usual: `integration` already carried `mutation_witness_enrollment_gaps` (the
`python` tier and 64 entries) when the handoff branch was cut without it, so
this merge is exactly the two-green-handoffs-on-one-line case the instruction
exists for. Three existing entries name the two suites this handoff edited
(`crop lightbox` ×1, `real render path` ×2); all three still witness, so the
inserted "back to fit" click and the non-empty `images` map broke nothing
downstream. No entry came back `NOT WITNESSED` or `SKIPPED`.

The per-suite sub-check counts match the lesson's §5 claims exactly, and the
`1203 → 1205` pytest delta is consistent (`tests/test_app_type_scale.py` now
collects 8, up from 6; my absolute 1208 is higher only because `integration` has
moved since the branch was cut).

**Nothing polluted `data/`.** The main checkout's `git status` is clean and
nothing under `C:\workspace\tolstack\data` has an mtime inside the session.

### Deliverable 1 — the probe. Verified with a replay, not with N greens.

- **Fixed probe: 5 consecutive runs, `13 of 13`, exit 0, every time.**
- **Pre-fix probe replayed: 3 of 3 crashed** (`element is not stable`), from the
  same scratch tree against the same data. So the fix is demonstrated against
  the failure, not merely correlated with its absence — the checklist's "N green
  runs is not evidence a flake is fixed" bar.
- **The partial-failure path was observed working**, which is the half a green
  run cannot show. I broke one surface's selector in a scratch tree
  (`.chip.cardtrig` → `.chip.NOPE`) and got exactly what the deliverable
  promises: `SKIP 6_hover_card: locator.scrollIntoViewIfNeeded: Timeout 30000ms
  exceeded`, `--- surfaces: 12 of 13 ---`, exit 1, **and the other twelve
  surfaces still taken.**
- The root-cause claim checks out against the source: `topology_app.js:247` is a
  `resize` listener behind a `setTimeout(…, 150)`.

### Deliverables 2–4 — the guards. All thirteen mutations planted.

`git archive HEAD` into a short scratch root (`%TEMP%\tsrevw`, `node_modules`
junctioned), one mutation at a time, each restored afterwards. Every `find`
string occurs exactly once in its file (13/13 confirmed). Every mutation
reddened, and **every one named the check the lesson said it would**:

| mutation | tier | reddened |
| --- | --- | --- |
| `conf-token-is-scoped-to-the-chip` | browser | "…and its own cells are the table's weight and the table's colour" |
| `stack-view-prose-keeps-its-measure` | browser | "a run of prose is capped well inside the box it sits in" |
| `element-name-column-keeps-its-floor` | browser | "…and the element-name column has a declared floor…" |
| `source-note-stays-a-preview` | browser | "…and it is clamped to a PREVIEW of at most three lines" |
| `crop-trigger-is-not-filled` | browser | the fill census |
| `attention-flag-is-not-filled` | browser | the fill census (same sub-check — as §4 says, correctly) |
| `lightbox-frame-is-sized-to-the-fit` | **fast** | "the frame is SIZED to the fitted box on every apply" |
| `lightbox-view-is-clamped-to-the-stage` | browser | the centring check **and** the over-long-drag check |
| `lightbox-highlight-edge-is-unscaled` | browser | "the highlight's edge is declared THINNER…" |
| `lightbox-opens-modal-on-file-origin` | browser | the modal check **and** the Escape check (as §4 says) |
| `lightbox-suppresses-the-pages-scroll` | browser | "the page behind it cannot scroll on this origin either" |
| `conf-token-rule-names-its-element` | python | `test_no_rule_keys_on_a_confidence_token_alone` |
| `annotator-declares-its-base-size` | python | `test_both_apps_set_their_base_size_from_the_scale` |

Two things worth saying about the quality of this set, since the handoff was
specifically about checks that cannot fail:

- **Every new claim carries a non-vacuity witness asserted before it** — the
  untraced row's chip really is filled/white/700 before its cells are asserted
  quiet; the table really is wider than its scrollport before the column floor is
  read; the note really has more content than its box; the fixture crop really is
  bigger than the declared stage; `launchable` really is true before the
  `file://` lightbox sub-checks run. That is the correct shape and it is applied
  consistently.
- **The deleted glow sub-check is the best judgement in the diff.** Writing a
  check, measuring that it passes with its own rule deleted, deleting it, and
  filing the reason
  (`ISSUE_20260918_the_lightboxs_glow_suppression_is_only_witnessable_on_a_solid_highlight`)
  is exactly right — shipping a green-for-the-wrong-reason check while closing
  three of them would have been a poor trade, and the author said so.

### Deliverable 4's judgement call

Building the `file://` coverage rather than documenting its absence is well
argued and, more importantly, **written into the suite** as the handoff required
— the reasoning sits at the `MemoryAdapter` swap, not only in the lesson. The
`resolvedCropImages` helper is derived from the real index rather than listed
(6 resolved in `by_topology`, 45 + 3 companions in `by_stack` on today's
projection), so a rebuild that retires a crop cannot leave a stale key. The
pre-existing `__CROP_FETCHES__` sub-checks are about which PNGs were *asked
for*, so supplying `images` does not make any of them vacuous.

### The screenshot-drift claim, re-measured

`ISSUE_20260918_the_committed_typography_screenshots_no_longer_match_…` claims
7 of 13 `after` shots differ. **Reproduced exactly, shot for shot** (6 identical,
9–13 identical) — but only on the second and third re-takes. **My first re-take
differed on 8**, the extra one being `6_hover_card`, which carries an
asynchronous `ensureThumbImages` thumbnail. Two further runs were byte-identical
to each other on all 13. So the author's number is right and the probe is
*nearly* deterministic; the issue already hedges about `ensureThumbImages` for
shot 3, and this extends the same hedge to shot 6. Recorded here rather than
edited into their issue. (Added to the overlay as a standing "re-take twice"
step.)

## Findings

### Inline fixes I made (stated, not silent)

Both are wrong statements of fact, no behaviour change, a few lines each — the
canonical checklist names a correction blockquote as the established fix for a
lesson's arithmetic.

1. **`LESSONS…§2`: "the ten reverts I planted … (listed in §4)".** §4 lists
   **thirteen** entries over **twelve** distinct edits (the `.chip.conf--untraced`
   drop is enrolled twice, once per tier, deliberately). The cost table's "all ten
   reverts" row carries the same stale count. Added a correction blockquote
   recording the true numbers and that I re-verified all thirteen independently.
   The measurement is unaffected; only the count restating it was wrong.
2. **`LESSONS…§1` and the new `RESIZE_DEBOUNCE_SETTLE` comment in
   `tests/debug_typography_pass.mjs`: "`run_viewer_browser_tests.mjs` … waits
   450ms after each of its three `setViewportSize` calls".** It has **seven**,
   every one on a booted topology page: two wait 450, two wait 400, and **three
   wait nothing** — one of which (line 2022) measures `cardLayout()` on the very
   next line. Corrected both, and filed the code half as an issue. This makes the
   lesson's point *stronger*: the browser suite did not already know, it holds the
   number in two places and races the same repaint in three others.

### Should-fix (filed, none blocking)

1. **`CONFIDENCE_TOKENS` is an unpaired hand-copy of `VA.CONFIDENCES`, and it
   fails SILENT.** `tests/test_app_type_scale.py:85`. The docstring documents the
   derivation (`"conf--" + confidence` over `VA.CONFIDENCES` plus the `unknown`
   fallback) and then does not perform it. A fifth confidence word — the repo has
   added one before — arrives with `.conf--<new> { color: #fff }` invisible to
   the guard written for exactly that rule. The extractor already exists
   (`tests/test_js_python_vocabulary.py`'s `js_array_strings`, which already
   reads `VA.CONFIDENCES`). Its sibling `MAY_FILL` in the browser census is the
   same shape but fails loudly, so it is the lesser half.
   → `ISSUE_20260918_the_type_scale_guards_confidence_token_list_is_an_unpaired_hand_copy_of_va_confidences`
2. **A skipped browser suite returns `ok: true` and is counted in
   `23/23 browser checks passed`.** Six suite bodies now do this, two of them
   added here — but the convention is the file's, not this handoff's, which is
   why it is filed against the runner. The 5483 skip ("the live nav offers no
   `hub_bearing_thermal_fit_m1` leaf") would silently retire nine real
   measurements. The repo fixed this exact shape on the pytest side a week ago.
   → `ISSUE_20260918_a_skipped_browser_suite_returns_ok_true_and_is_counted_in_the_runners_green_total`
3. **Three of the browser tier's seven resizes measure through the 150ms
   debounce.** Latent, not live — 23/23 green today. `low`.
   → `ISSUE_20260918_three_browser_tier_resizes_measure_through_the_apps_own_debounce`

### Nits

- `tests/debug_typography_pass.mjs`'s **file header** still says the stack shots
  are taken "on the two loose stacks … `rotor_fastener_length` for the elements
  table, `hub_bearing_thermal_fit_m1` for the materials table", while the body
  takes both tables from `hub_bearing_thermal_fit_m1` in one nav click and its
  own comment says so. **Pre-existing** (present at `integration`), untouched by
  this diff, so left alone under file-don't-fix; noted here so the next editor of
  that header knows.
- The probe's final census prints `all 13 taken` whenever `skipped` is empty,
  rather than when `reached.length === ALL_SURFACES.length`. A surface deleted
  without updating `ALL_SURFACES` would print `12 of 13` **and** `all 13 taken`.
  Cosmetic, in a hand-run probe.
- No design findings: the diff touches tests, a hand-run probe and docs only. No
  user-facing surface changed.

## For the next reviewer

Four entries added to `docs/prompts/REVIEW_AGENT.md`'s **Recurring bugs** list:
the `ok: true` skip, the drift-direction question for hand-copied token lists,
the "go count the call sites" check on a lesson citing a sibling file's habit,
and "re-take a screenshot pair twice, not once".

The lesson's §2 answer to `BRIEF_20260915_mutation_witness_enrollment` is the
most valuable thing in this handoff and I checked its argument rather than just
its prose: `design_pass_typography` really did add exactly one test file
(`608a1fc`/`2b82cfc`/`5d57307` touch only `test_app_type_scale.py` and the probe),
so the claim that mechanical enrollment would have had nothing to enroll holds.
The brief's "9 of the 16 review reports" figure is quoted correctly and
characterised correctly ("guards that survive their own mutation"). The thirteen
entries are staged as
`ISSUE_20260918_thirteen_new_guards_from_visual_rules_nothing_checks_have_no_mutation_witness_entry`,
whose per-tier counts (6+2+2+1+2) do add to thirteen.
