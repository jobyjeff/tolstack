---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_annotate_hosted_page_posture.md
reviewer: review agent (opus)
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-15 — annotate_hosted_page_posture

Branch `handoff/annotate_hosted_page_posture`, one commit (`2eef733`), merge-base
`f629942` = the `integration` tip at review time. Clean fast-forward-able merge,
**no conflict** — nothing landed on `integration` under this branch. Tactical
worktree was clean; nothing to commit on the author's behalf.

**Verdict: APPROVE, 0 blockers.** Both deliverables land, the browser guard was
independently observed failing, and the local-origin regression check
discriminates. One should-fix (a guard that pins the constant rather than the
call site, measured green with the original defect restored) and one out-of-scope
finding are filed as issues rather than fixed here.

## The seven mandatory checks — not applicable, and why

The work is `apps/annotate/` UI posture plus browser/fast-tier guards. It adds no
stack, no element, no `source_ref`, no check, no material and no spec-library
event; `git diff integration...HEAD -- docs/tolerance_stacks/ docs/topologies/
docs/spec_library/ tolerance_stack/` is empty. So checks **1** (every tolerance
traces), **2 / 2b** (signs, coherent corners), **3** (LMC/MMC direction), **4**
(RSS computed), **5** (nominal inside min/max), **6** (quantised cotter
constraints) and **7** (the traced ratio) have no subject in this diff — stated
explicitly so a reader can tell "no subject" from "not performed". The
spec-library parse-event checklist is likewise not in scope. No number in this
diff is a tolerance, a material property or a transcription.

## What I verified

**Suite, in this review worktree, on the merged tree**

- `pytest -q` → **884 passed, 1 skipped, 1 failed**. The single red is
  `test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
  on `BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62` — a standing
  red on `integration`, on a file this branch does not touch. Reproduces on the
  merge-base. Not this branch's.
- `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` → **65/65**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
  **19/19 browser checks**, `[annotate hosted posture]` **18/18**,
  `[annotate flyout]` **18/18**. (`node_modules` is gitignored and absent from a
  fresh review worktree; junction to the main checkout's copy, removed before
  finishing.)
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` →
  the new entry **WITNESSED**. Four viewer `fast`-tier entries report NOT
  WITNESSED because the viewer fast tier's *clean* run is already red — see the
  next block; not attributable to this branch, which touches no file under
  `apps/viewer/`.

**On "run the suite in BOTH checkouts".** Not literally possible here — the main
checkout holds `master`, and moving it is the operator's batch merge, not mine. The
worktree/main-checkout difference is one test, and I covered it directly instead:
the single skip is `test_viewer_js_suite.py`'s node-fs tier (*"no projection to
read — you are probably in a worktree"*), which I ran by hand against
`--repo C:/workspace/tolstack` (358/360, below). The diff contains **no `.py` and
no `data/`** file at all, so nothing else in it can behave differently there.

**The one pre-existing JS red, attributed rather than assumed.** `apps/viewer/run_tests.cjs`
is 358/360 (`fixtures.js` missing `stacks[].checks[].margin`, `topology_fixtures.js`
missing `topologies[].gaps`). The lesson calls this shared-`data/` drift; I
confirmed it from the stamps rather than taking it:

```
crops.json       master                                   ed394ec5  2026-09-15T18:55Z  dirty=False
results.json     handoff/viewer_study_verdicts_and_gaps   13fbf3f0  2026-09-16T04:34Z  dirty=True
topologies.json  handoff/viewer_study_verdicts_and_gaps   13fbf3f0  2026-09-16T04:34Z  dirty=True
```

Two of three projections were written by a concurrently-live handoff whose own
name is "study verdicts and **gaps**". `ISSUE_20260914_two_active_handoffs_each_
turn_the_others_real_tier_red.md`, working as documented.

**Deliverable 1 — the hosted page shows nothing about the bind workflow.** The
per-element decision came out as one node (`<main id="workspace">` hidden in
`main()`'s hosted branch) with the reasoning written out element by element in
the lesson, the README and the code — that satisfies the handoff's "say which
rule you applied where", and the argument against rewording (every true sentence
it could carry is already the banner's, printed twice and free to drift) is the
right call. The console — the item the handoff said was most worth arguing about
— was handled as **two** defects: withheld *and* the whole wiring block moved
below the early return, so it is never wired at all. Both halves are asserted
separately in the browser tier.

**The guard was observed failing, twice, by me.** Not accepted on the strength of
green:

| mutation (scratch, reverted) | result |
|---|---|
| `el.workspace.style.display = "none"` → `""` | `[annotate hosted posture]` **12/18** — red on exactly the six sub-checks this handoff added, and on none of the six that existed before it |
| the wiring block moved back above the hosted early-return | **17/18** — red on `and it was never wired -- no live handler behind the withheld control` |

The first measurement also settles the entry's own `note`: the lesson's *"a
mutation that puts the workspace back leaves all six of them green"* is exactly
right.

**`rendered()` is the right predicate.** `offsetParent !== null` rather than
`locator.isVisible()`, because an empty `<ul>`/`<select>` on the loopback page is
legitimately zero-height and the loopback half is the discriminating half. Checked
the failure mode that would make it vacuous: `offsetParent` is also null for
`position: fixed`, and `#canvas-host` is `position: absolute` inside a
`position: relative` parent (`style.css:78-79`), so it reports non-null when
rendered. The loopback half asserting all eight elements *are* rendered is what
stops "hide everything, always" passing — and it is a real assertion, not a
formality: it caught the `isVisible()` mistake during authoring.

**Deliverable 2 — no terminal command on the "no projection" banner.** The banner
is plain words (`AA.NO_PROJECTION_NOTICE`), and `AA.CONFIG.rebuild` is gone. The
lesson's supporting claim re-derived against the pre-work tree: `rebuild.topologies`
had exactly one reader (`app.js:738`) and `rebuild.bindings` had **none** anywhere
— confirmed with `git grep rebuild integration -- apps/annotate/` and a repo-wide
grep for `CONFIG.rebuild`, whose only surviving hits are the three viewer surfaces
already tracked by `ISSUE_20260910_other_viewer_surfaces_still_print_terminal_
commands.md` (status `triaged`, `audience: strategy`). **Note for triage:** this
handoff closes that issue's fourth bullet (`apps/annotate/app.js`) and leaves its
three viewer bullets open; the issue body still lists all four.

**Lesson audited, not read.** Every count in it re-derived: `884 passed, 1 skipped,
1 failed` ✔; `358/360` ✔; `18/18` on both annotate suites ✔; the 18 pasted
sub-check names match the shipped suite name-for-name ✔; "one reader / none" ✔;
"all six of them green" ✔ (measured above). The handoff's two explicit questions
are both answered in it. Its leftovers are all owned: the two un-witnessable fast-tier
guards → `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`
(read it — the diagnosis is exact: `tierCommand()` and `CHECK_SOURCE` both hard-wire
`"fast"` to the *viewer's* runner); the shared-`data/` drift → the existing issue
above; the byte-identity red → see the nits.

**Housekeeping.** `data/inbox/specs/` untouched; nothing written into
drawing-checker; `docs/reference/` untouched; no new module needing an
`ARCHITECTURE.md` inventory row (`config.js`'s row in `apps/annotate/README.md`'s
layout block *was* updated with it); no surviving `{{`; no harness fragment at the
tail of any created file; `git diff -w --stat` agrees with the plain stat on every
file. The main checkout's `data/` is byte-unchanged by this review's runs (every
tier reads it; nothing here rebuilds a projection).

## Findings

### Should-fix (1) — filed, not fixed

**The "no projection" banner's guard pins the constant, not the call site.**
`apps/annotate/run_tests.cjs:406-432`. Measured: restore the pre-handoff banner as
a bare literal at `app.js:741` —

```js
setBanner("No topology projection found. Build it: venv-win\\Scripts\\python.exe scripts\\build_topology_projection.py", "warn");
```

— and the annotate fast tier is **65/65 passed**. pytest cannot see it (the copy
is JS) and no browser suite reaches a connected-folder-with-no-projection state,
so the exact defect this handoff was written to remove returns with every tier
green. The check's own comment claims to have closed this (*"a check on the
sentence alone would pass again the moment somebody re-adds `"Build it: " + a
command`"*) — deleting `CONFIG.rebuild` closes the config half of that, and a
bare literal is the other half.

Not a blocker: the shipped page renders no command, and the route that actually
produced the bug is now guarded from both ends. Not inline-fixable either — it is
a new assertion, which fails prong 2 of the inline-fix boundary. The handoff's own
DoD asked for an assertion on the rendered banner text; three lines inside the
existing check (`appSource.includes("setBanner(AA.NO_PROJECTION_NOTICE")` — the
file is already being read for the `CONFIG.rebuild` scan) is the cheap equivalent.
`ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_not_the_call_site.md`.

### Out of scope — filed, per file-don't-fix

**A browser with no File System Access API gets the full bind workspace under a
dead-end sentence.** `main()` has a second terminal branch, `if (!picked.adapter)`,
that did not move with the hosted one. Measured in real Chrome on the loopback
server with `window.showDirectoryPicker` deleted in an init script — i.e. every
Firefox and Safari reader:

```
banner:  "This browser has no File System Access API -- the annotate surface needs Chrome or Edge…"
#detail: rendered, "Pick an element on the left, then click a face in the 3D view to bind it."
console: wired.   #canvas-host: 1 <canvas>.
```

Same contradicted hint, a live console, and — unlike the hosted case — a real
empty canvas that was paid a WebGL context for. Correctly outside this handoff's
fence (hosted origin only) and it is a *policy* question the origin-posture brief
frames and has not answered, so it is filed with `audience: strategy` pointing
there rather than fixed. One mechanical part of it is worth fixing whatever the
policy call: `testAnnotateHostedPosture`'s loopback half accepts either state
(`/Connect folder|File System Access/`) and then asserts the full workspace
renders — today's test browser has FSA so it measures the harmless pre-grant page,
but a test browser that lost FSA would have those sub-checks pinning the defect in
place. `ISSUE_20260915_a_browser_with_no_fsa_gets_the_full_bind_workspace_under_a_
dead_end_sentence.md`.

### Fixed inline (3) — all stated, none silent

1. **A second mutation-witness entry, for deliverable 1's other half.**
   `hosted-annotate-never-wires-the-control-it-withholds` added to
   `scripts/mutation_witnesses.json`: it wires the dev console back up *inside*
   the hosted branch (withheld and live — the shape the wiring move exists to make
   unreachable) and reddens `and it was never wired…`. Observed failing by hand
   first, then declared; `--only hosted-annotate` now reports **2/2 witnessed** and
   `tests/test_mutation_witnesses.py` 10 passed. The overlay's standing ask — "when
   a mutation you tried by hand belongs to a guard that should keep catching it,
   add the entry" — is what this is, and it is deliberately cheaper than an issue.
2. **The sibling entry's `note` overstated what the old sub-checks read.** It said
   *"Every sub-check that existed before this one reads the BANNER"*; three of the
   six read the origin, `#connect-btn` and `#transport-sub` instead. The point
   survives (none of them looks below the top bar) and the note now says that, with
   the 12/18 measurement in it.
3. **One word in the lesson.** "having hidden three elements and not the eighth" →
   "not the eight below them" — as written the sentence had no reading; as fixed it
   is the (correct) count of what `surfaces_that_state_something_false` left
   standing.

### Nits

- **A fourth spelling of Jeff's never-render-a-command rule.** `COMMANDISH` in
  `apps/annotate/run_tests.cjs` joins `noCommandsOrPaths` in `apps/viewer/tests.js`
  and two inline regexes in `scripts/run_viewer_browser_tests.mjs` (`:295`,
  `:2909`/`:3128`). The new one is the *strictest* (it adds `python` and
  `scripts/`), it is a module-level constant as CLAUDE.md requires, and nothing
  pairs any of the four — so a future strengthening of one leaves three behind. Not
  raised to an issue: the copies are in three harnesses with no shared module
  between them, and the divergence today is in the safe direction.
- **A third filing of the standing byte-identity red.** The handoff filed
  `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md` (`high`)
  for a condition that already had two open issues — and unlike the 2026-09-15 pair
  the overlay records as no-fault, **both siblings were already in `docs/issues/` at
  this branch's own merge-base** (`f629942`), so an `ls` in the tactical worktree
  would have shown them. Cross-reference blockquote added to the newest filing
  (kept, not deleted: it is the only one carrying the `high` argument). **Triage:
  fix the one clause, close all three.**

## `integration` moved mid-review — the conflict, and what re-running proved

`respine_tween_fidelity_round2` landed between the first merge and the verdict
(`f629942` → `fd27d4c`), touching **three** of the files this handoff touches:
`scripts/mutation_witnesses.json`, `scripts/run_viewer_browser_tests.mjs` and
`docs/prompts/REVIEW_AGENT.md`. Only the first conflicted.

- **Both sides of the conflict are appends to one array.** Ours: the two
  `hosted-annotate-*` entries. Theirs: `respine-unfolds-out-of-the-rail-it-
  interrupted`, `a-link-a-respine-adds-fades-in`,
  `the-view-puts-a-links-fade-on-the-path`, `sticky-rails-hold-a-scrolled-dag`.
  Neither side edits an entry the other wrote, so **the resolution keeps all
  six** — nothing to choose between. Verified structurally rather than by eye:
  18 entries, ids unique, `json.loads` clean. The other two files auto-merged
  into disjoint regions (new suite functions vs. new sub-checks inside
  `testAnnotateHostedPosture`; appended checklist entries at different
  headings).
- **Everything re-run on the merged tree**, per the "a textually clean merge can
  still kill a geometric witness" entry: `pytest` 884/1 skipped/1 failed (the
  same standing red), annotate fast tier 65/65, browser tier **19/19** —
  `[topology file:// respine]` now 39/39 and `[suite]` 288/288 with the sibling's
  work in, `[annotate hosted posture]` still 18/18 — and both annotate witness
  entries still **2/2 witnessed** against the merged app.

## For the next reviewer

Three overlay entries were extended from this review, all as second sightings
rather than new classes: *One sentence made honest…* now asks **which other early
returns of the same function reach the same page** (with the `showDirectoryPicker`-
deletion probe as the technique); *The deliverable is mutation-tested and the
guard the author added on their own initiative is not* now asks you to **count the
contracts against the declared entries**, because here the un-witnessed half was
named in the handoff rather than invented while building; and the duplicate-issue
entry now says to **check the merge-base before granting the no-fault reading**. One
new entry: *a guard on a named constant, where lifting the copy into that constant
is what moved the assertion away from the defect.*
