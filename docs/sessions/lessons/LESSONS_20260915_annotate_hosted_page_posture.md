# LESSONS 2026-09-15 — annotate_hosted_page_posture

Handoff: `docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md`.
Branch `handoff/annotate_hosted_page_posture`, cut from `integration`
(baseline: trunk after the 2026-09-15 batch merge plus
`mutation_witness_tier_repair`).

Two bugs out of `surfaces_that_state_something_false`, both the same root: that
handoff made the annotate **banner** honest and nothing else on the page moved
with it.

## 1. The per-element rule, and why it came out as one node

The handoff asked for a decision per element — removed from the DOM, or
reworded into the honest sentence's continuation. **Neither, for every element:
withheld together, as one container.** `index.html`'s `<main class="an">` gained
`id="workspace"` and the hosted branch of `main()` sets `display: none` on it,
beside the two lines that already hid `#connect-btn` and blanked
`#transport-sub`.

Element by element, the reasoning that converged there:

| element | what it is on a hosted origin | so |
|---|---|---|
| `#detail`'s hint | *"…click a face in the 3D view to bind it"* — names a 3D view that genuinely is not on this page | withheld. **Rewording was the tempting answer and it is wrong**: every true sentence it could carry is already the banner's sentence, so rewording produces the same fact printed twice, in two places that then drift |
| `#topology-select`, `#study-select` | pickers over data no transport can load | withheld |
| `#element-list`, `#parts-panel` | empty lists of things to bind | withheld |
| `#canvas-host` | a large empty panel; `AnnotateScene` is deliberately never constructed, so there is no `<canvas>` at all | withheld — see the fence below |
| `#console-input`, `#console-run` | visible **and live** | withheld **and never wired** — two separate defects, two separate fixes |

**One node rather than seven `display:none`s** because a per-element hide list
is a list a later column can be added to without being added to — which is the
shape of this bug, `surfaces_that_state_something_false` having hidden three
elements and not the eighth. An emptied three-column grid is also still three
columns of nothing, so hiding the columns individually buys nothing over hiding
their parent. And **hidden, not removed**: nothing here is latched (the
transport decision is recomputed on every load), so a reload on a loopback
origin is the ordinary page, with no "put it back" path to get wrong — the same
reason `#connect-btn` is hidden rather than deleted.

### The console was the interesting one

`main()` wired `el.consoleRun.onclick` and `el.consoleInput.onkeydown` (and
both selects' `onchange`) **before** the hosted early-return, so a hosted reader
had a live command line into an app with no storage behind it. Hiding it would
have fixed what they can see and left what it does. **The whole wiring block
moved below the early-return instead**, so a control that is about to be
withheld is never wired in the first place, and "is it hidden?" and "does it do
anything?" cannot drift apart. The browser guard asserts both halves
separately, for the same reason.

### What I deliberately left alone

The **3D pane** carries an `audience: strategy` argument the other elements do
not: read is not write, and a hosted *reader* may legitimately want the 3D trace
once `ISSUE_20260910_annotate_has_no_http_read_transport` lands
(`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`). I
withheld it anyway, and the distinction survives: **today it is an empty panel
with no canvas in it**, so withholding it removes nothing a reader could use,
and it forecloses nothing — when a read transport exists the pane comes back
*with content*, which is a different page and a different decision. What I did
not do is touch the viewer's side of that question, or `VA.isLocalPage`, or
`views/banner.js`'s `state.error` line. The viewer's asymmetry ships exactly as
it was.

## 2. `AA.CONFIG.rebuild` — removed, both strings

The banner read `"No topology projection found. Build it: " + AA.CONFIG.rebuild.topologies`,
which put `venv-win\Scripts\python.exe scripts\build_topology_projection.py` on
screen to copy. Now:

> No topology projection in the connected folder. It is built in the
> tolerance-stack repository, not from this page.

as `AA.NO_PROJECTION_NOTICE` in `apps/annotate/storage/adapter.js`, beside
`AA.HOSTED_NOTICE`. Both are sentences this app says *instead of* offering a way
forward, and — the practical reason — `app.js` cannot be loaded by the fast tier
(ES module, `document`, WebGL at import time), so a constant in a classic script
is the only way `run_tests.cjs` can assert on the copy at all.

**The handoff asked whether `AA.CONFIG.rebuild` should keep holding the command
strings once nothing renders them. No — both are gone.** Checked first:
`rebuild.topologies` had exactly one reader (that banner) and `rebuild.bindings`
had **none**, anywhere in the tree. Keeping them would have left this app
holding a loaded gun for the rule it had just been fixed for; the config now
carries a comment saying so and pointing at the replacement.

That decision is what the second new fast-tier check pins. The defect was never
really the sentence — it was the **concatenation**, and a check on the copy
alone passes again the moment somebody re-adds `"Build it: " + <a command>`. So
one check asserts the sentence is clean and the other asserts there is nothing
to concatenate: `AA.CONFIG.rebuild === undefined`, and `app.js`'s source
contains no `CONFIG.rebuild`. A shared `assertNoCommandOrPath` / `COMMANDISH`
pair now covers both notices, the shape `apps/viewer/tests.js` uses (assert on
the *text*, not the absence of one known string, so a new way of leaking one in
still fails).

## 3. The checks, and what proves the local origin is unchanged

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "annotate hosted posture"`
— **18/18, PASS**. The runner prints names only for failures, so these were
captured with `push` temporarily echoing every name (reverted):

```
    ok  the page really is on a non-loopback origin
    ok  the banner states that annotating is not available on this site
    ok  Connect folder is not offered at all
    ok  nor is the read/write transport line, which would be false here
    ok  no path, script or command leaks into the sentence
    ok  the honest notice is not an error thrown on the way to it
    ok  the bind instruction is gone -- it named a 3D view this origin does not have
    ok  no topology picker is offered for data this page cannot load
    ok  nor a study picker
    ok  no element list or parts panel either
    ok  there is no 3D pane standing empty where the hint pointed
    ok  the dev console is not shown
    ok  and it was never wired -- no live handler behind the withheld control
    ok  a loopback page still asks for the folder, or says this browser cannot
    ok  and it does NOT show the hosted notice
    ok  the same page on loopback still has the full bind workspace
    ok  and the 3D view the bind instruction names really is there
    ok  and its dev console is wired there
```

The last three are **the check that proves a local-origin run is unchanged**:
the same suite's second navigation goes to `http://127.0.0.1:<port>` and asserts
the whole workspace renders, that `#canvas-host canvas` is there (the 3D pane
really builds), and that the console is wired — before a folder has even been
granted. Without them, "hide everything, always" would pass every one of the
hosted checks. `annotate flyout (repo-root mount + file:// degradation)`
(18/18) is the other half: it boots this app under `?mock=1` in the viewer's
iframe and drives commands through it, which is what proves the wiring move did
not break the non-hosted paths.

### `locator.isVisible()` is the wrong question here — a real trap

The first version of the loopback assertion failed on `#parts-panel`, and it was
right to: Playwright's `isVisible()` means *has a non-empty bounding box*, and
an empty `<ul>` on a page with no folder connected is legitimately zero-height
while being perfectly present. The question these checks actually ask is *is
this element on the page at all*, which is `offsetParent !== null` — null inside
a `display: none` subtree, non-null for an empty element that still renders. The
suite now has a small `rendered(page, selector)` helper and uses it on both
halves. Anyone adding a check about a withheld surface to an app with
empty-until-connected lists wants that one, not `isVisible()`.

### The guard bites

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only hosted-annotate`:

```
--- hosted-annotate-withholds-the-bind-workspace
  clean run of browser / annotate hosted posture (no folder grant off-machine)... green
  mutated run... WITNESSED
  apps/annotate/app.js: el.workspace.style.display = "none";
  reddens: the bind instruction is gone -- it named a 3D view this origin does not have

1/1 declared mutations witnessed
```

Worth stating why that entry earns its place rather than being ceremony: every
sub-check that existed before this handoff reads the **banner**, and the banner
was *already honest* while the page under it contradicted it. A mutation that
puts the workspace back leaves all six of them green.

The two new **fast**-tier guards got no entry, and could not: the witness
table's `"fast"` tier is the *viewer's* fast tier specifically —
`tierCommand()` spawns `apps/viewer/run_tests.cjs`, and `CHECK_SOURCE` looks for
`expect_red` in `apps/viewer/tests.js`. An annotate-side guard has nowhere to be
declared. Filed as
`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`
(chore, med) with the fix shape.

## 4. Two reds that are not this branch's, both verified against untouched files

**`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
fails on trunk.** `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:62`
says the viewer's behaviour is "byte-for-byte what `viewer_transport_honest_hosted`
shipped" and names nothing that checks it. Not a file this handoff touches, and
the brief is precisely the artifact the viewer-side origin question was routed
*to*, so fixing its prose here would be editing another track's argument. Filed
as `ISSUE_20260915_byte_identity_guard_red_on_the_origin_posture_brief.md`
(bug, **high** — one clause, but it reddens every pytest run in every worktree).
With it excluded the suite is **884 passed, 1 skipped, 1 failed**.

**`apps/viewer/run_tests.cjs` is 358/360**, both failures `[real]` fixture-drift:
`fixtures.js` missing `stacks[].checks[].margin`, `topology_fixtures.js` missing
`topologies[].gaps`. Environmental, not a defect — this branch's builders emit
neither field, so the projection under `C:\workspace\tolstack\data\` was written
by a **newer** tree: another in-flight worktree rebuilt the shared `data/`. Any
worktree whose `[real]` tier reads that projection sees this until those
branches merge. Nothing filed; it is the shared-`data/` design working as
documented, and it resolves itself.

## 5. Two mechanical notes for the next agent here

- **`node_modules/` is gitignored, so the browser tier does not run in a
  worktree at all** — `ERR_MODULE_NOT_FOUND: playwright-core`, before any
  suite starts. A directory junction to the main checkout's copy is the cheap
  fix (`New-Item -ItemType Junction -Path <worktree>\node_modules -Target
  C:\workspace\tolstack\node_modules`). **Remove it before you finish**:
  worktree cleanup that recursed into a junction would be deleting the main
  checkout's `node_modules`.
- **Backslashes got halved somewhere between a heredoc and Python** in this
  session's shell, so a `find`/`replace` anchor containing `\\` silently matched
  nothing. Anchor on a line with no backslash in it, or build the character with
  `chr(92)`, and always assert the match count is exactly 1 before writing — a
  zero-match `str.replace` is a no-op that looks exactly like success.
