# LESSONS 2026-09-16 — js_guards_and_suite_isolation

Handoff: `docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md`.
Three deliverables: two guards that certified a named constant instead of the
behaviour that reads it, and one browser suite that was red alone and green in
a full run. All three done, all three witnessed.

## Baselines the handoff quotes are stale — use these

The handoff's numbers were measured on `master` after the 2026-09-16 batch
merge. This branch was cut from `integration`, which has moved since:

| tier | handoff says | actually measured here |
|---|---|---|
| viewer fast (`apps/viewer/run_tests.cjs`) | 407/407 | **411/411** at baseline, **412/412** after deliverable 1 |
| annotate fast (`apps/annotate/run_tests.cjs`) | 65/65 | **65/65** at baseline, **66/66** after deliverable 2 |
| browser (`scripts/run_viewer_browser_tests.mjs`) | 19 suites | **20** suites; `annotate flyout` 18 → **19** sub-checks |
| pytest | 1155 passed | **1175 passed, 1 skipped, 1 FAILED** — see below |

The handoff anticipated the viewer count moving (`viewer_unwitnessed_surface_guards`
merged) and said to say so if it differed. It did: 411, not 407.

### pytest is RED on `integration`, and it is not this session's doing

```
FAILED tests/test_tolerance_stack.py::test_no_live_document_states_an_unguarded_hardware_entry_count
E   docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152:
E     says 3 entries that do not defer to the spec library; hardware_entries.json has 28
```

A **false positive**, not a stale count. The named line reads *"for a reason
**the other three do not** have"* — about the brief's four origin-posture
cases, nothing to do with hardware. It is matched by `_COUNT_CLAIMS`'
`rf"other\s+({_NUM})\s+do\s+not"` (`tests/test_tolerance_stack.py:2830`),
which is four ordinary English words with no anchor to its own subject, and
`_NUM` accepts spelled-out numbers.

Provenance: the claim shape is old (`46e545e`); the brief was committed by the
**2026-09-16 triage sweep itself** (`78305fc`), i.e. after the `1155` baseline
was measured, and nothing has re-measured pytest on `integration` since. My
diff is three JS files and zero commits touching `docs/`, `tests/` or
`tolerance_stack/`, so nothing of mine crossed into the Python handoff's scope.

Filed as `ISSUE_20260916_hardware_count_guard_regex_matches_ordinary_prose.md`
(`high`, because every session cut from `integration` now starts from a red
baseline and has to re-derive that this one failure is not theirs — I spent
that time; the next agent will too).

**Do not fix it by rewording the brief.** The next document to write "the
other three do not" reopens it.

## 1. The three plants, verbatim

The handoff's binding requirement. Each plant is the exact edit it named.

### Plant 1 — `VA.VERDICTS` reordered to `fail, marginal, pass`

`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`:

```
FAIL  worstVerdict ranks fail over marginal over pass, whatever order the checks arrive in
      not equal: "pass" !== "marginal"
411/412 passed
```

**The new check is the only one of 412 that reddens** — which confirms the
issue's claim that nothing downstream catches it. Reverted; 412/412.

### Plant 2 — the command inlined at `apps/annotate/app.js:741`

`node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`:

```
PASS  this app holds no terminal command for a banner to render
FAIL  loadAll's no-projection branch renders that constant, not a sentence of its own
      Error: loadAll()'s no-projection banner no longer renders AA.NO_PROJECTION_NOTICE
65/66 passed
```

Keep those two lines together — that is the whole defect in two lines. The
check named *"this app holds no terminal command for a banner to render"*
**passes with a terminal command sitting right there** at the call site,
because it reads `AA.CONFIG.rebuild` and the string `"CONFIG.rebuild"` in
`app.js`, and an inlined literal is neither. Reverted; 66/66.

### Plant 3 — `var settling = false` in `VA.animateTopoPane`

`node scripts/run_viewer_browser_tests.mjs --only "annotate flyout" --repo C:/workspace/tolstack`:

```
[annotate flyout (repo-root mount + file:// degradation)] ABORTED after 7 sub-checks, 1 of them already FAILED
    FAIL sub-check: the study's respine transition settles before any of its rows are addressed -- no ghost of the walk still holds a second copy of them
[annotate flyout (repo-root mount + file:// degradation)] ERROR: locator.click: Error: strict mode violation: locator('tr.tvrow[data-id=\'arm_pin_to_tip\'] .tvcell--name') resolved to 2 elements:
    1) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td> aka getByRole('cell', { name: 'pin to tip' })
    2) <td title="arm pin to tip" class="tvcell tvcell--name">pin to tip</td> aka getByText('pin to tip').nth(1)

0/1 browser checks passed (--only "annotate flyout")
```

That is the cause inverted — a transition that never ends, so the ghost is
permanent — and it reproduces the original error message **byte for byte**,
now deterministically instead of 5-in-6. Reverted.

A first attempt at this guard was a bare `await settled()`, which produced
`ABORTED after 0 sub-checks` and an unnamed `page.waitForFunction: Timeout`.
That is a **MISS**, not a red, to the mutation tier
(`mutation_witnesses.json`, "ONE THING AN ENTRY CANNOT DECLARE"). Swallowing
the timeout and pushing a named check is what makes it declarable — this file
already establishes that idiom for the embedded annotator's banner wait, and
it is worth reaching for by default, not only when a witness is being written.

## 2. Deliverable 3's named cause: the respine ghost, and nothing else

**Not order dependence. Not shared state. Not a double render. Arithmetic.**

Selecting a study re-serialises the topology pane, and `VA.animateTopoPane`
cross-fades to it by **re-parenting the outgoing paint into an inert
`div.tv__ghost`** (`apps/viewer/views/topology.js`, `ghostOf`) for
`VA.RESPINE.duration` — **260 ms** (`apps/viewer/topology.js:1012`). For that
window the document holds **two** `.tv__hscroll` panes, so every edge present
in both serialisations has two `tr.tvrow` with the same `data-id`, and a bare
`tr.tvrow[data-id=...]` locator is a strict-mode violation.

The suite simply won the race, alone. Measured in page time with an rAF
counter and a per-stage dump:

| stage | page time | `.tv__hscroll` | ghosts | duplicated `tr.tvrow` ids |
|---|---|---|---|---|
| after boot (walk, 6 rows) | 182 ms | 1 | 0 | none |
| after study click (chain, 3 rows) | 264 ms | **2** | **1** | `base_thickness`, `post_height`, `arm_pin_to_tip` |
| after flyout open | 326 ms | 2 | 1 | same three |
| after iframe banner | 425 ms | 2 | 1 | same three |
| after flyout close | 459 ms | 2 | 1 | same three |
| +400 ms later | 834 ms | 1 | 0 | none |

The `arm_pin_to_tip` click lands at ~459 ms — about **200 ms into a 260 ms
transition**. Whether a given run is red is *only* whether the six Playwright
actions between the study click and the row click take more or less than
260 ms. That is the entire content of "green in a full run, red alone", and it
is why the issue measured 1 pass in 6.

Ruled out, on evidence rather than reasoning:

- **A second render.** One `.tv__hscroll` settled, two only mid-transition,
  and the ghost holds the very nodes the previous paint drew (`ghostOf` moves
  them, does not clone). The three duplicated ids are exactly the study
  chain's three rows — i.e. the subset present in *both* serialisations, which
  is what a cross-fade predicts and a double render does not.
- **Shared `browser` state.** Suites run **sequentially** in a `for await`
  loop (`scripts/run_viewer_browser_tests.mjs`, after `SUITES`), each on its
  own `newPage()`. The timing above is entirely internal to this one suite.
- **An unsettled first paint.** The failure is ~200 ms *after* a study click,
  not at boot; boot is settled with 1 pane and 0 ghosts.
- **rAF throttling.** 9 rAF ticks over that 195 ms window (~48 fps) and
  `document.visibilityState === "visible"` throughout. Nothing is paused.
- **`data/meshes/` presence** — already eliminated by the issue; not revisited.

### Correction to the issue's framing, worth carrying

The issue said *"two `tr.tvrow` with the same `data-id`, which the page's own
row identity says cannot happen"* and *"whatever produces the second row is
the defect."* Both are wrong, and the second one is the more expensive:

- The second row is **by design** — an inert, `aria-hidden="true"`,
  `pointer-events: none` overlay, which `ghostOf`'s comment block documents at
  length.
- **"Unique `data-id`" was never this page's invariant.** Measured in the
  settled state with zero ghosts present: **six** duplicated `data-id`s,
  because `line.rail__barhit` already shares an edge's `data-id` with its
  `tr.tvrow`. The invariant is one element *per kind* per id. (No duplicate
  `id` or `data-nav-id` attribute at any point, settled or mid-transition — I
  checked both while I was in there.)

So the defect was in the **test**, which addressed an overlay the page had
already marked as not-content. Chasing "what produces the second row" would
have led to deleting a deliberate feature.

### Why the fix is a settle wait and not a ghost-excluding locator

Both make the suite pass. Only one fails correctly:

- **Settle wait** (`!ViewerApp.lastTopoRender.tweening`) — a pane that never
  settles **fails**. That is what plant 3 demonstrates.
- **Scoped locator** (`.filter(n => !n.closest("div.tv__ghost"))`, the idiom
  this file already uses twice) — would have found its one live row on a
  permanently stuck pane and passed straight over it, hiding a real product
  bug.

And the wait was never novel: `!lastTopoRender.tweening` already had
**14 references** in this file before mine — eleven direct `waitForFunction`
calls in suite bodies, a `settled()` helper in the respine suite, and two more
in the grid checks — i.e. every other suite that addresses this pane.
`testAnnotateFlyout` was the one that skipped it. The fix is this file's own
established idiom, not a new mechanism.

The file:// half's `await page.waitForTimeout(300)` is kept — it is genuinely
for the annotate-mount probe's re-render, not the transition — but the respine
is now waited out explicitly beside it. **300 > 260 is the only reason that
half never failed**, which is exactly the kind of accidental margin this
handoff exists to remove.

## 3. Is `annotate flyout` the only order-dependent suite? No — it is the only one at all

`--only` over all **20** suites, one at a time, each with
`--repo C:/workspace/tolstack`. Every one passes alone at the same sub-check
count it reports in the full run:

```
suite file:// 316/316 · suite http 316/316 · index redirect file:// 2/2 ·
index redirect http 2/2 · app file:// 33/33 · app http 33/33 ·
topology file:// 183/183 · topology http 183/183 · deep links file:// 6/6 ·
deep links http 6/6 · topology height budget 21/21 ·
topology file:// respine 39/39 · render crash shows the banner 6/6 ·
real render path (non-mock) 10/10 · no nav click wedges the page 16/16 ·
served mode (repo-root static server) 15/15 ·
hosted origin with nothing published 7/7 ·
rebuild affordance (stub sibling mount) 10/10 ·
annotate flyout 19/19 · annotate hosted posture 18/18
```

**`--only` is a substring match, and one label is a prefix of another.**
`--only "topology file://"` runs **two** suites — `topology file://` *and*
`topology file:// respine` — and prints `2/2 browser checks passed`. Harmless
as a filter; worth knowing if a `mutation_witnesses.json` entry ever names
`topology file://` as its `suite`, because the tier would then spend a second
suite per mutation and could be reddened by the wrong one. Nothing in the
table does today.

## 4. The pending mutation-witness entries — and the handoff's premise is stale

The handoff said **not** to append an annotate entry because *"the annotate
fast tier cannot own a `scripts/mutation_witnesses.json` entry today"*. **That
is no longer true.** `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`
is now `status: resolved` — `mutation_witness_tier_reaches_its_checks` added
the `annotate` tier word on 2026-09-16 and declared two entries on it. Today's
table: `fast` 18, `browser` 17, **`annotate` 2**.

I still did not append, because the handoff's "Do NOT touch" list says to
append *only* if a deliverable says so and none did, and because the file
belonged to another handoff this sweep. But the reason given for withholding
is gone, so this is now a pure copy-paste.

**All three entries are written out, ready to paste, in
`ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md`** — one
per guard this session added (`fast`, `annotate`, `browser`). Each was
validated before filing: every `find` resolves to exactly **1** place in the
file it names, and every `expect_red` to exactly **1** place in its
`CHECK_SOURCE` file via the repo's own `joined_source()` helper — which is
what `test_every_expect_red_resolves_to_exactly_one_place` and the `find` scan
require. Deliverable 2's strings, since the handoff asked for them here
specifically:

```
file:       apps/annotate/app.js
find:       "      setBanner(AA.NO_PROJECTION_NOTICE, \"warn\");"
replace:    "      setBanner(\"No topology projection found. Build it: venv-win/Scripts/python.exe scripts/build_topology_projection.py\", \"warn\");"
tier:       "annotate"
suite:      null
expect_red: "loadAll's no-projection branch renders that constant, not a sentence of its own"
```

One trap for whoever lands them: **`apps/viewer/viewer.js` is CRLF on disk**
while `apps/annotate/app.js` and `apps/viewer/views/topology.js` are LF. The
pytest pairing normalises (`Path.read_text` uses universal newlines), so a
multi-line `find` resolves there; confirm `run_mutation_witness_tests.mjs`
does the same before trusting a multi-line `find` on the CRLF file.

## 5. The shape deliverables 1 and 2 share, and where it is left

**A guard on a named constant certifies the constant, never that the surface
still reads it** — and the moment a handoff's answer to "the copy must not say
X" is to lift the copy into a constant so a testable tier can see it, *the
lift is what moves the assertion away from the defect*. Deliverable 1 is the
same shape with a key order in place of a sentence: `VA.VERDICTS`' insertion
order **is** the severity rule, and the Python/JS pairing compares the two
vocabularies as `set(expected) == set(actual)`, so every permutation was
green.

Where it is likely to sit next, sharpened by what I found: the pattern appears
**exactly where the rendered state is unreachable by any tier**, and nowhere
else. The proof is the sibling constant. `apps/annotate/` has precisely two
banner constants:

- `AA.NO_PROJECTION_NOTICE` — needs a real File System Access grant to render.
  No tier can reach it. **This was the gap.**
- `AA.HOSTED_NOTICE` — the hosted state is one server on two hostnames, so
  `testAnnotateHostedPosture` boots it for real and asserts on the **rendered
  `#banner` text** (*"no path, script or command leaks into the sentence"*).
  Already paired. **Not a defect.**

So the question to ask of any constant-shaped guard is not "is there a call
site?" but **"can any tier reach the state that renders this?"** — if no, the
constant assertion is all there is and a static call-site pairing is the
cheap stand-in. The states worth auditing on that basis: anything behind a
real FSA grant, a real WebGL context, or an OS file picker. Both of this
app's constants are now paired, so that class is closed here.

## Environment notes

- **`node_modules/` is gitignored, so a worktree has none** and the browser
  and mutation tiers cannot start (`ERR_MODULE_NOT_FOUND: playwright-core`).
  Junction it rather than `npm install`-ing a second copy:
  `New-Item -ItemType Junction -Path <worktree>\node_modules -Target C:\workspace\tolstack\node_modules`.
  Same note is in the two 2026-09-16 lessons before this one; it keeps coming
  up because it is the first thing that fails in a fresh worktree.
- **A scratch `.mjs` probe must live inside the worktree** (`tmp/`, gitignored)
  — node resolves `playwright-core` from the *script's* directory, so a probe
  in the session scratchpad cannot import it even with the junction in place.
- **This shell's heredocs collapse `\\` to `\`.** A `python - <<'PY'` block
  containing `"\\n"` or `re.compile(r"[/\\]")` arrives with a single
  backslash and either mis-matches silently or raises. Quoting does not help.
  For backslash-heavy edits use the `Edit` tool, or write the script to a file
  first. This cost two failed edits and one bogus `SyntaxError`.
- **Check a file's line endings before a scripted edit.** This repo is mixed.
  `scripts/run_viewer_browser_tests.mjs` is all-CRLF; reading it with
  `newline=""` and writing back lines joined with `\n` produces a
  mixed-ending file that git then flags. Detect per file, and re-check with a
  CRLF/LF count afterwards.
- **`git commit -m` with backticks in the message silently loses text.** Bash
  command-substituted three fragments out of a commit message here (`browser`,
  `data-nav-id`, `var settling = false`) and the commit still succeeded, with
  gaps. Write the message to a file and use `-F`.
