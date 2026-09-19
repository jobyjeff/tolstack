---
type: chore
priority: med
status: triaged
area: scripts/mutation-witnesses
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
found_by: docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md
---

# The three guards `js_guards_and_suite_isolation` added have no `mutation_witnesses.json` entry — all three are paste-ready

`HANDOFF_20260916_js_guards_and_suite_isolation.md` added three guards, each
demonstrated reddening on a planted mutation by hand. None of the three has a
standing entry in `scripts/mutation_witnesses.json`, because that handoff's
"Do NOT touch" list said **"Append to `mutations[]` only if a deliverable below
says so"** and no deliverable said so. So the hand check exists in that
session's lesson and nowhere a runner will ever repeat it — which is exactly
the gap the witness table was built to close (`mutations[]`'s own `about`
block: *"An entry here is how that hand check becomes a standing one"*).

**The blocker deliverable 2 named is already gone.** That handoff said not to
declare the annotate guard because *"the annotate fast tier cannot own a
`scripts/mutation_witnesses.json` entry today"*, citing
`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`. That
issue is now **`status: resolved`** — `mutation_witness_tier_reaches_its_checks`
added the `annotate` tier word on 2026-09-16 and declared two entries on it.
The `annotate` tier has 2 entries today (`fast` 18, `browser` 17). So the
premise for withholding is stale and the append is a copy-paste.

## Verified paste-ready

Each `expect_red` below was checked against the repo's own pairing helper —
`tests/test_mutation_witnesses.py`'s `joined_source()`, which closes the
adjacent-string-literal seam before searching — and each resolves to **exactly
one** place in its `CHECK_SOURCE` file, which is what
`test_every_expect_red_resolves_to_exactly_one_place` requires. Each `find`
string was likewise confirmed unique in its file (the requirement of
`test_mutation_witnesses.py`'s `find` scan). Every mutation below is the one
actually planted and watched redden in that session.

```json
{
  "id": "worst-verdict-ranks-worst-last",
  "contract": "A study's rollup verdict is its WORST check, and the ranking is the insertion order of VA.VERDICTS -- worst last. That object literal's key order is the whole of the severity rule.",
  "issue": "docs/issues/ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order.md",
  "note": "tests/test_js_python_vocabulary.py compares the JS and Python vocabularies as SETS, so every permutation of the three keys was green there. This mutation is the plausible one: `fail, marginal, pass` is both alphabetical and 'worst first', matching how the CSS block below it is written. With it, two live pitch-system studies (marginal + pass) roll up as PASS on the nav rail.",
  "file": "apps/viewer/viewer.js",
  "find": "  VA.VERDICTS = {\n    pass: {\n      says: \"every build clears it\",\n      title: \"The worst case still satisfies the criterion, so no build of \" +\n        \"this joint violates it.\",\n    },\n    marginal: {",
  "replace": "  VA.VERDICTS = {\n    fail: {\n      says: \"does not clear, even on average\",\n      title: \"Neither the worst case nor nominal satisfies the criterion.\",\n    },\n    marginal: {",
  "tier": "fast",
  "suite": null,
  "expect_red": "worstVerdict ranks fail over marginal over pass, whatever order the checks arrive in"
}
```

`find` above moves the whole `pass` block out of first position and puts
`fail` there — the first half of the reorder the session actually planted —
with `marginal: {` as a trailing anchor so the edit cannot land ambiguously.
A mutation here has to be a pure PERMUTATION of the three keys: anything that
drops or renames one reddens `tests/test_js_python_vocabulary.py` instead,
which is a different guard failing for a different reason.

One thing to confirm when landing these: `apps/viewer/viewer.js` is CRLF on
disk while `apps/annotate/app.js` and `apps/viewer/views/topology.js` are LF.
The pytest pairing normalises — `Path.read_text` uses universal newlines,
which is why the multi-line `find` above resolves to exactly 1 there — so
check that `scripts/run_mutation_witness_tests.mjs` does the same before
trusting a multi-line `find` on the CRLF file. A single-line `find` sidesteps
the question entirely if it does not.

```json
{
  "id": "no-projection-banner-read-at-its-call-site",
  "contract": "loadAll()'s no-projection branch renders AA.NO_PROJECTION_NOTICE itself. A guard on the constant certifies the constant; this one pairs it to the one surface that reads it.",
  "issue": "docs/issues/ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_not_the_call_site.md",
  "note": "The third of the trio, and the one the other two cannot cover: `annotate-banner-says-nothing-to-paste` asserts on the constant and `annotate-carries-no-command-to-render` on the AA.CONFIG supply route, so a bare string literal typed straight into setBanner() left both green. Measured: the annotate tier returned 65/65 with the command inlined at the call site.",
  "file": "apps/annotate/app.js",
  "find": "      setBanner(AA.NO_PROJECTION_NOTICE, \"warn\");",
  "replace": "      setBanner(\"No topology projection found. Build it: venv-win/Scripts/python.exe scripts/build_topology_projection.py\", \"warn\");",
  "tier": "annotate",
  "suite": null,
  "expect_red": "loadAll's no-projection branch renders that constant, not a sentence of its own"
}
```

```json
{
  "id": "annotate-flyout-waits-out-the-respine",
  "contract": "A suite that addresses this pane's rows waits for !lastTopoRender.tweening first. Mid-transition the document holds TWO .tv__hscroll panes -- the live one and VA.animateTopoPane's inert div.tv__ghost -- so every edge in both serialisations has two tr.tvrow with the same data-id.",
  "issue": "docs/issues/ISSUE_20260915_annotate_flyout_suite_is_red_alone_and_green_in_a_full_run.md",
  "note": "The cause inverted: a transition that never ends, so the ghost is permanent. Deterministic, unlike the original defect -- that one was a race against VA.RESPINE.duration (260 ms) and reproduced 5 times in 6. The suite can carry a browser entry at all only since this session: before it, `--only` on it was red with no mutation applied, which the runner reports as SKIPPED.",
  "file": "apps/viewer/views/topology.js",
  "find": "      var settling = !(t < 1);",
  "replace": "      var settling = false;",
  "tier": "browser",
  "suite": "annotate flyout (repo-root mount + file:// degradation)",
  "expect_red": "the study's respine transition settles before any of its rows are addressed -- no ghost of the walk still holds a second copy of them"
}
```

## Repro / verification for whoever lands this

```
venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py
node scripts/run_mutation_witness_tests.mjs
```

The pytest pairing is the cheap half and runs with no browser. The `settling`
entry is the one worth watching end to end, since it is the first entry naming
the `annotate flyout` suite.

## One caveat on the third entry

`var settling = false` makes the transition never end, so it reddens **every**
suite that waits on `!lastTopoRender.tweening` — 15 other call sites across the
viewer's browser suites. The mutation runner applies one mutation and runs one
named suite, so that is harmless as declared; it does mean the mutation is not
narrowly scoped to the guard it witnesses, and a tighter one (leaving the tween
to settle but re-appending the ghost on the settled frame) would be a better
entry if someone wants to write it.

> **Correction, 2026-09-16 (`review/js_guards_and_suite_isolation`).** It is
> **12** other call sites, not 15. Re-derived on `integration`'s copy of
> `scripts/run_viewer_browser_tests.mjs`: 12 lines hold the settle-wait
> predicate `!…lastTopoRender.tweening` — eleven direct `waitForFunction` calls
> (seven in `testTheTopologyPage`, four in `testHeightBudget`) plus
> `testRespine`'s `settled()` helper — and those are the ones a never-ending
> tween hangs. The file's other four `tweening` references are mid-flight
> catchers and assertions inside `testRespine`, which the mutation breaks
> differently (they wait *for* `tweening`, so they pass and the assertion after
> them fails). 16 references in total, on 16 lines. The caveat's conclusion is
> unchanged — the mutation is broad, touching 4 suite functions / 5 of the 20
> suite instances, and a narrower one would be a better entry.

## Reviewer note, 2026-09-16 — the CRLF question above is settled: yes

The caveat on entry 1 asks whoever lands these to confirm
`scripts/run_mutation_witness_tests.mjs` normalises line endings before
trusting a multi-line `find` on CRLF `apps/viewer/viewer.js`. **It does.**
`const lf = (text) => text.replace(/\r\n/g, "\n")` at
`scripts/run_mutation_witness_tests.mjs:249` is applied on both sides of the
question: line 255 writes `lf(before).replace(mutation.find, …)` into the
shadow tree, and line 263's anchor-rot counter reads `lf(readFileSync(…))`
before `split(mutation.find)`. So entry 1's `find` resolves in the runner for
the same reason it resolves under `Path.read_text` in pytest, and no
single-line rewrite is needed.

Verified in review by replaying the repo's own pairing helpers against all
three entries: keys match `REQUIRED_KEYS`, every `tier` is in `TIERS`, every
`find` resolves to exactly 1 place in its `file` under `source_of()`, every
`expect_red` to exactly 1 place in its `CHECK_SOURCE` file under
`joined_source()`, and entry 3's `suite` is a key
`suite_registry_keys()` dispatches on. (Two of the three `expect_red` strings
count 0 under plain `source_of` and 1 under `joined_source` — they are split
across a `" + "` seam in the check name, which is exactly what that helper
exists for, so this is correct, not a near miss.)
